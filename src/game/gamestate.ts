import { Card, Suit, getFullPack, getSuits, rotArr, shuffle } from "./card";
import { Player, PlayerName, playerNameArr } from "./player";
import { Agent, AgentName, agentLookup } from "./agent/agent";
import { GameLog } from "./log";

export type TrickPlayOption = 'standard' | 'allfours';

export type GameConfig = {
    trickplay: TrickPlayOption,
}

function copyConfig(config: GameConfig): GameConfig {
    return {
        trickplay: config.trickplay,
    };
}

export type state = (
    'new_round' |
    'play_card' |
    'trick_complete' |
    'hand_complete' |
    'new_hand' |
    'game_complete'
);

export class GameState {
    public dealerIndex: number;
    public currentPlayerIndex: number;
    public leaderIndex: number | null = null;
    public pack: Card[];
    public fullPack: Card[];

    public players: Player[] = [];
    public trickIndex: number;
    public trickInProgress: [Card, Player][] = [];
    public playedCards: Card[] = [];

    public handNumber: number = 0;
    public currentState: state = 'new_round';

    public previousTrick: [Card, Player][] = [];

    constructor(public playerNames: AgentName[], public config: GameConfig) {
        const agents: Agent[] = playerNames.map((name) => agentLookup(name));
        // randomly rotate suit array for personal trump suits
        const toRotate = Math.floor(Math.random() * playerNames.length);
        let suits = getSuits();
        for (let i = 0; i < toRotate; i++) {
            suits = rotArr(suits);
        }
        this.players = playerNames.map(
            (name, i) => new Player(
                name,
                playerNameArr[i],
                agents[i],
                i,
                suits[i],
            )
        )
        // choose a random initial dealer
        this.dealerIndex = Math.floor(Math.random() * playerNames.length);
        // dummy values:
        this.currentPlayerIndex = 0;
        this.trickIndex = 0;
        this.pack = getFullPack();
        this.fullPack = getFullPack();  // only need if we have variable sizes
    }

    public clone(): GameState {
        // make a (deep) copy - at least of the things we care about
        const newConfig = copyConfig(this.config);
        const playerNames = [...this.playerNames];
        const newState = new GameState(playerNames, newConfig);

        // copy remaining state
        newState.dealerIndex = this.dealerIndex;
        newState.currentPlayerIndex = this.currentPlayerIndex;
        newState.leaderIndex = this.leaderIndex;
        newState.pack = [...this.pack];
        newState.fullPack = [...this.fullPack];

        newState.players = this.players.map(player => player.clone());
        newState.trickIndex = this.trickIndex;
        // TODO: does it matter that these players are different to the ones in player array?
        newState.trickInProgress = this.trickInProgress.map(
            ([card, player]) => [card, player.clone()]
        );
        newState.playedCards = [...this.playedCards];
    
        newState.handNumber = this.handNumber;
        newState.currentState = this.currentState;

        newState.previousTrick = this.previousTrick.map(
            ([card, player]) => [card, player.clone()]
        );

        return newState;
    }

    public async increment(log: GameLog | null = null) {
        const state = this.currentState;
        // console.log(`Incrementing state - currently: ${state}`);
        switch (state) {
            case 'new_round':
                this.shuffle();
                break;
            case 'new_hand':
                this.dealCards(log);
                break;
            case 'play_card':
                const _moveIndex = await this.computerMove();
                break;
            case 'trick_complete':
                this.resetTrick(log);
                break;
            case 'hand_complete':
                this.dealerIndex = this.getNextPlayerIndex(this.dealerIndex);

                if (log !== null) {
                    this.completeLog(log);
                }
                // initialise as separate state - keeps from doing too much at once
                this.currentState = 'new_hand';
                break;
            case 'game_complete':
                if (log !== null) {
                    this.completeLog(log);
                }
                break;
            default:
            // error!
        }
    }

    get cardsPerHand(): number {
        if (this.numPlayers === 4) {
            return 13;
        }
        // 6p
        return 8;
    }

    get trickNumber(): number {
        return this.trickIndex + 1;
    }

    get trickInProgressCards(): Card[] {
        return this.trickInProgress.map(
            ([card, _player]) => card
        );
    }

    get currentLedSuit(): Suit | null {
        const trickInProgressCards = this.trickInProgressCards;
        if (trickInProgressCards.length === 0) {
            return null;
        }
        return trickInProgressCards[0].suit;
    }

    get legalMoveIndices(): number[] {
        let legalCards: Card[];
        const hand = this.currentPlayerHand;
        const ledSuit = this.currentLedSuit;
        if (ledSuit === null) {
            // if there is no card led, anything is legal
            legalCards = hand;
        } else {
            // TODO: trickplay switching
            // must follow suit if we can
            legalCards = hand.filter(card => Suit.suitEquals(card.suit, ledSuit));
            if (legalCards.length === 0) {
                // if we have no cards of led suit, anything is legal
                legalCards = hand;
            }
        }
        return legalCards.map(card => card.index);
    }

    getPlayer(name: PlayerName): Player {
        return this.players.filter(
            (player) => player.name === name
        )[0];
    }

    get prevTrickScores(): number[] {
        return this.players.map(player => player.previousScore);
    }

    get scores(): number[] {
        return this.players.map(player => player.score);
    }

    private getPlayedCard(name: PlayerName, trick: [Card | null, Player][]): Card | null {
        const playerPlayedCards = trick.filter(
            ([_card, player]) => player.name === name
        );
        const numCards = playerPlayedCards.length;
        if (numCards === 1) {
            return playerPlayedCards[0][0];
        }
        if (numCards > 1) {
            console.log(`getPlayedCard error: ${playerPlayedCards}`);
        }
        return null;
    }

    get played(): Record<PlayerName, Card | null | 'back'> {
        let played;
        played = Object.fromEntries(
            playerNameArr.map((name): [PlayerName, Card | null | 'back'] => [
                name, this.getPlayedCard(name, this.trickInProgress)
            ])
        ) as Record<PlayerName, Card | 'back' | null>;

        return played;
    }

    get previous(): Record<PlayerName, Card | null> {
        let fromArr: [Card | null, Player][];
        fromArr = this.previousTrick;
        return Object.fromEntries(
            playerNameArr.map((name): [PlayerName, Card | 'back' | null] => [
                name,
                this.getPlayedCard(name, fromArr)
            ]
        )
        ) as Record<PlayerName, Card | null>;

    }

    get trumpSuits(): Suit[] {
        return this.players.map(player => player.trumpSuit);
    }

    get currentPlayer(): Player {
        return this.players[this.currentPlayerIndex];
    }

    get currentPlayerHand(): Card[] {
        return this.currentPlayer.hand;
    }

    get humanHand(): Card[] {
        // TODO: don't fix index of human player, maybe?
        return this.getPlayerHand(0);
    }

    get numPlayers(): number {
        return this.players.length;
    }

    getNextPlayerIndex(playerIndex: number): number {
        return ((playerIndex + 1) % this.numPlayers);
    }

    public trickWinnerPlayer(): Player {
        const winningCardPlay = this.trickInProgress.filter(
            ([card, player]) => Card.cardEquals(card, this.winningCard())
        );
        // TODO: length check?
        const trickWinner = winningCardPlay[0][1];
        return trickWinner;
    }


    public winningCard(): Card {
        // TODO: winning card logic, for each trickplay version
        let winningCard: Card = this.trickInProgressCards[0];
        return winningCard;
    }


    get handNotFinished(): boolean {
        return this.players.map(
            (player) => player.hand
        ).some(
            (hand) => hand.length > 0
        );
    }

    public moveFromIndex(cardToPlayIndex: number): number {
        const cardToPlay = Card.cardFromIndex(cardToPlayIndex, this.fullPack)

        if (!this.playCard(cardToPlay)) {
            console.log("Error playing card");
        }
        return cardToPlayIndex;
    }

    private async computerMove(): Promise<number> {
        const agent = this.currentPlayer.agent;
        if (agent === 'human') {
            // TODO: error
            console.log("Error: trying to move for a human")
            return -20;
        }
        if (this.currentState !== 'play_card') {
            // TODO: error
            console.log(`Error: can't play card in ${this.currentState}`)
            return -20;
        }

        const currentLegalMoves = this.legalMoveIndices;
        const cardToPlayIndex = await agent.chooseMove(this, currentLegalMoves);
        return this.moveFromIndex(cardToPlayIndex);
    }

    giveCardToPlayer(playerIndex: number, card: Card) {
        this.players[playerIndex].hand.push(card);
    }

    getPlayerHand(playerIndex: number): Card[] {
        return this.players[playerIndex].hand ?? [];
    }

    playCard(card: Card): boolean {
        if (!this.legalMoveIndices.includes(card.index)) {
            console.log(`Error: Cannot play illegal card ${card}`);
            return false;
        }
        const player = this.currentPlayer;
        const hand = player.hand;
        if (!hand) {
            console.log("Error: I couldn't find a hand!");
            return false;
        }

        const index = hand.findIndex(
            c =>  Card.cardEquals(c, card)
        );
        if (index < 0) {
            console.log("Couldn't find card in hand!");
            console.log(`Card: ${card} in hand ${hand}`);
            return false;
        }
        const [playedCard] = hand.splice(index, 1);
        this.trickInProgress.push([playedCard, player]);
        this.playedCards.push(playedCard);

        if (this.trickInProgress.length === this.numPlayers) {
            this.currentState = "trick_complete";
            return true;
        }
        const newCurrentPlayerIndex = this.getNextPlayerIndex(this.currentPlayerIndex);
        this.currentPlayerIndex = newCurrentPlayerIndex;
        return true;
    }

    shuffle(): void {
        const pack = getFullPack();
        shuffle(pack);
        this.pack = pack;
        this.playedCards = [];
        this.currentState = 'new_hand';
    }

    // TODO: seed?
    dealCards(log: GameLog | null): void {
        const pack = this.pack;
        for (let i = 0; i < this.cardsPerHand; i++) {
            for (let playerIndex = 0; playerIndex < this.numPlayers; playerIndex++) {
                const card = pack.pop();
                if (card) this.giveCardToPlayer(playerIndex, card);
            }
        }

        // TODO: check expected remainder size?
        this.currentState = 'play_card';
        this.currentPlayerIndex = this.getNextPlayerIndex(this.dealerIndex);
        this.handNumber++;
        this.trickIndex = 0;

        if (log !== null) {
            // and update the current log
            log.dealerIndex = this.dealerIndex;
            log.handNumber = this.handNumber;
            log.captureHands(this.players.map((player) => [...this.getPlayerHand(player.positionIndex)]));
            log.startingScores = this.players.map((player) => player.score);
        }
    }

    resetTrick(log: GameLog | null): void {
        const winnerPlayer = this.trickWinnerPlayer();
        const winnerPlayerIndex = winnerPlayer.positionIndex;
        this.currentPlayerIndex = winnerPlayerIndex;
        const trickValue = this.updateScores(winnerPlayerIndex);

        if (log !== null) {
            log.captureTrick(
                trickValue,
                this.trickInProgress,
                winnerPlayer.positionIndex,
            );
        }

        if (this.gameIsFinished) {
            this.currentState = "game_complete";
            return;
        }

        this.previousTrick = this.trickInProgress

        // empty the trick, and increment the counter!
        this.trickInProgress = [];
        this.trickIndex++;
        if (this.handNotFinished) {
            this.currentState = "play_card";
        } else {
            this.currentState = "new_hand";
        }
    }

    updateScores(winnerPlayerIndex: number, from: string = "trick"): number {
        // TODO: do we even need this?
        return 0;
    }

    get gameIsFinished(): boolean {
        // TODO: do we handle this here?
        return false;
    }

    completeLog(log: GameLog) {
        log.handScores = this.scores;
        log.complete = true;
    }

    getStateForUI(): GameStateForUI {
        return ({
            playerNameArr: this.players.map(player => player.name),
            trickplay: this.config.trickplay,
            hands: {
                player: this.currentState === "hand_complete" ? [] : this.humanHand.slice(),
                comp1: [],
                comp2: [],
                comp3: [],
            },
            played: this.played,
            previous: this.previous,

            scores: Object.fromEntries(
                this.players.map(
                    (player) => [player.name, player.score]
               )
            ) as Record<PlayerName, number>,
            prevScores: Object.fromEntries(
                this.players.map(
                    (player) => [player.name, player.previousScore]
               )
            ) as Record<PlayerName, number>,

            gameState: this.currentState,
            whoseTurn: this.currentPlayer.name,
            dealer: this.players[this.dealerIndex].name,
            handNumber: this.handNumber,
            trickNumber: this.trickNumber,
        })
    }
}

export interface GameStateForUI {
    playerNameArr: PlayerName[],

    hands: Record<PlayerName, Card[]>;
    played: Record<PlayerName, Card | null | 'back'>;
    previous: Record<PlayerName, Card | null>;

    scores: Record<PlayerName, number>,
    prevScores: Record<PlayerName, number>,

    handNumber: number;
    trickNumber: number;
    trickplay: TrickPlayOption,

    gameState: state;
    whoseTurn: PlayerName;
    dealer: PlayerName;

}
