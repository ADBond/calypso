import { Card, Suit } from "./card";
import { Agent } from "./agent/agent";

export const playerNameArr = ['player', 'comp1', 'comp2', 'comp3'] as const;
export type PlayerName = typeof playerNameArr[number];

const trickpileCardScore = 10;
const inProgressCardScore = 20;
const calypsoValues = [
    0,  // no calypsoes
    500,  // 500
    1250,  // 500 + 750
    2250,  // 500 + 750 + 1000
    3250,  // 500 + 750 + 1000 + 1000
];

export class ScoreDetails {
    constructor(
        public calypsoes: number,
        public calypsoPart: number,
        public trickpiles: number,
    ) {}

    clone(): ScoreDetails {
        return new ScoreDetails(
            this.calypsoes,
            this.calypsoPart,
            this.trickpiles
        );
    }

    get score(): number {
        return calypsoValues[this.calypsoes] + this.calypsoPart* inProgressCardScore + this.trickpiles * trickpileCardScore;
    }

    toJSON() {
        return {
            completedCalypsoes: this.calypsoes,
            calypsoesInProgressCards: this.calypsoPart,
            trickpile: this.trickpiles,
        };
    }
}

class Calypso {

    constructor(public cards: Card[] = []) { }

    public clone() {
        return new Calypso(
            [...this.cards],
        )
    }

    get numCards(): number {
        return this.cards.length;
    }

    get cardStrings(): string[] {
        return this.cards.map(card => card.toStringShort())
    }

    public has(card: Card): boolean {
        return this.cardStrings.includes(card.toStringShort());
    }

    public add(card: Card) {
        this.cards.push(card);
    }
}

export class Player {
    constructor(
        public displayName: string,
        public name: PlayerName,
        public agent: Agent,
        public positionIndex: number,
        public trumpSuit: Suit,
        public hand: Card[] = [],
        public scores: number[] = [],
        public calypsoInProgress: Calypso = new Calypso(),
        public completedCalypsoes: number = 0,
        public trickpile: Card[] = [],
        public oldCalypso: Calypso = new Calypso(),
        // public scores: ScoreBreakdown[] = [],
    ) { }

    clone(): Player {
        return new Player(
            this.displayName,
            this.name,
            this.agent,  // TODO: fine to share?
            this.positionIndex,
            this.trumpSuit,
            [...this.hand],
            [...this.scores],
            this.calypsoInProgress.clone(),
            this.completedCalypsoes,
            [...this.trickpile],
            this.oldCalypso.clone(),
        );
    }

    get score(): number {
        const scores = this.scores;
        return scores.length === 0 ? 0 : scores.reduce(
            (total, value) => total + value
        );
    }

    get previousScore(): number {
        return this.scores.length === 0 ? 0 : this.scores[this.scores.length - 1];
    }

    get scoreDetails(): ScoreDetails {
        return new ScoreDetails(this.completedCalypsoes, this.numCardsInCalypso, this.trickpile.length);
    }

    get thisHandScore(): number {
        return this.scoreDetails.score;
    }

    get numCardsInCalypso(): number {
        return this.calypsoInProgress.numCards;
    }

    get calypsoIsComplete(): boolean {
        // TODO: more general?
        return this.numCardsInCalypso === 13;
    }

    resetCards() {
        this.calypsoInProgress = new Calypso();
        this.trickpile = [];
        this.completedCalypsoes = 0;
    }

    public resetOldCalypso() {
        this.oldCalypso = new Calypso();
    }

    private addCalypsoCards(cards: Card[]): Card[] {
        const leftovers: Card[] = [];
        for (const card of cards) {
            if (this.calypsoInProgress.has(card)) {
                leftovers.push(card);
            } else {
                this.calypsoInProgress.add(card);
            }
            if (this.calypsoIsComplete) {
                this.completedCalypsoes += 1;
                this.oldCalypso = this.calypsoInProgress.clone();
                this.calypsoInProgress = new Calypso();
            }
        }
        return leftovers;
    }

    processCalypsoCards(cards: Card[]): Card[] {
        // adds cards to calypso
        // must be of the correct suit, we won't check
        // returns cards that are not used (duplicates)
        // handle incrementing calpysoes, completing, checking, etc
        let leftovers = this.addCalypsoCards(cards);
        // in case we processed earlier cards that can fit in now that we completed a calypso
        leftovers = this.addCalypsoCards(leftovers);
        return leftovers;
    }
}
