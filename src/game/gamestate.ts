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
    'round_complete' |
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
                for (const player of this.players) {
                    player.resetCards();
                }
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
                if (this.roundIsFinished) {
                    this.currentState = 'round_complete';
                } else {
                    // initialise as separate state - keeps from doing too much at once
                    this.currentState = 'new_hand';
                }
                break;
            case 'round_complete':
                // TODO: fill out once we have some options
                this.updateScores();
                this.currentState = 'game_complete';
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
            // following suit is always legal
            legalCards = hand.filter(card => Suit.suitEquals(card.suit, ledSuit));
            // in All Fours Calypso we may also always play a trump
            if (this.config.trickplay === 'allfours') {
                const trumpHandCards = hand.filter(card => Suit.suitEquals(card.suit, this.currentPlayerTrumpSuit));
                legalCards.push(...trumpHandCards);
            }
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

    getPlayerPartner(player: Player) {
        const partnersIndex = (player.positionIndex + 2) % this.numPlayers;
        return this.players[partnersIndex];
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

    get currentPlayerTrumpSuit(): Suit {
        return this.currentPlayer.trumpSuit;
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
        const winningCardPlay = this.winningCardPlay;
        // TODO: length check?
        const trickWinner = winningCardPlay[1];
        return trickWinner;
    }

    // logic separate so we can directly test
    static trickWinnerIndex(trickCards: Card[], trumpSuits: Suit[], trickplay: TrickPlayOption = 'standard'): number {
        // return winner index
        // makes it easy to extract data we need
        const ledSuit = trickCards[0].suit;
        const trumpsLed = Suit.suitEquals(ledSuit, trumpSuits[0]);
        // amount to shift ranks by depending on the suit status
        const trumpBonus = 100;
        const ledTrumpBonus = 50;
        const discardBonus = -100;
        let rankBonuses: number[];
        if (trumpsLed) {
            rankBonuses = trickCards.map(
                (card, i) => {
                    if (i === 0) {
                        // special case the led card, as depends on trick play
                        if (trickplay === 'standard') {
                            // a led trump counts higher than any normal card, but not higher than a true trump
                            return ledTrumpBonus;
                        } else {
                            // this counts as a true trump
                            return trumpBonus;
                        }
                    }
                    // played a trump - by necessity have not also followed
                    if (Suit.suitEquals(card.suit, trumpSuits[i])) {
                        return trumpBonus;
                    }
                    // if followed suit or not, effectively a discard, and cannot win trick
                    return discardBonus;
                }
            )
        } else {
            // plainsuit lead
            // works the same irrespective of trickplay rules
            rankBonuses = trickCards.map(
                (card, i) => {
                    // follow suit, no bonus (always!)
                    if (Suit.suitEquals(card.suit, ledSuit)) {
                        return 0;
                    }
                    // played a trump - only if we haven't followed
                    if (Suit.suitEquals(card.suit, trumpSuits[i])) {
                        return trumpBonus;
                    }
                    // if neither, must've discarded, cannot win trick
                    return discardBonus;
                }
            );
        }
        const cardValues = trickCards.map(
            (card, i) => card.rank.trickTakingRank + rankBonuses[i]
        );
        // (first) max value is the winner!
        return cardValues.reduce(
            (maxIdx, currentVal, currentIdx) => currentVal > cardValues[maxIdx] ? currentIdx : maxIdx, 0
        );
    }

    public get winningCardPlay(): [Card, Player] {
        // if non-trumps led, then highest trump wins (not counting followers as trumping)
        // if no trumps then highest of led suit
        // if trumps led, then highest trump wins (not counting leader if standard)
        // if no trumps then leader
        const winningIndex = GameState.trickWinnerIndex(
            this.trickInProgressCards,
            this.trumpSuits,
            this.config.trickplay,
        );
        return this.trickInProgress[winningIndex];
    }

    get handNotFinished(): boolean {
        return this.players.map(
            (player) => player.hand
        ).some(
            (hand) => hand.length > 0
        );
    }

    get roundIsFinished(): boolean {
        // TODO: generalise!
        return this.handNumber === 4;
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
        const winnersPartner = this.getPlayerPartner(winnerPlayer);

        const winnerCards = this.trickInProgressCards.filter(card => Suit.suitEquals(card.suit, winnerPlayer.trumpSuit));
        const partnerCards = this.trickInProgressCards.filter(card => Suit.suitEquals(card.suit, winnersPartner.trumpSuit));
        const leftovers = this.trickInProgressCards.filter(
            card => !Suit.suitEquals(card.suit, winnerPlayer.trumpSuit) && !Suit.suitEquals(card.suit, winnersPartner.trumpSuit)
        );
        leftovers.push(...winnerPlayer.processCalypsoCards(winnerCards));
        leftovers.push(...winnersPartner.processCalypsoCards(partnerCards));
        winnerPlayer.trickpile.push(...leftovers);

        if (log !== null) {
            log.captureTrick(
                this.trickInProgress,
                winnerPlayer.positionIndex,
                leftovers,
            );
            // TODO: calypso info?
        }

        this.previousTrick = this.trickInProgress

        // empty the trick, and increment the counter!
        this.trickInProgress = [];
        this.trickIndex++;
        if (this.handNotFinished) {
            this.currentState = "play_card";
        } else {
            this.currentState = "hand_complete";
        }
    }

    updateScores() {
        const scores = [0, 0];
        for (let i = 0; i < this.numPlayers; i++) {
            const player = this.players[i];
            scores[i % 2] += player.thisHandScore;
        }
        for (let i = 0; i < this.numPlayers; i++) {
            const player = this.players[i];
            player.scores.push(scores[i % 2]);
        }
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
