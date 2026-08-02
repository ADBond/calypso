import { Card, Suit } from "./card";
import { Agent } from "./agent/agent";

export const playerNameArr = ['player', 'comp1', 'comp2', 'comp3'] as const;
export type PlayerName = typeof playerNameArr[number];

const trickpileCardScore = 10;
const inProgressCardScore = 20;
const calypsoValues = [
    500,  // 500
    1250,  // 500 + 750
    2250,  // 500 + 750 + 1000
    3250,  // 500 + 750 + 1000 + 1000
];

export class Player {
    constructor(
        public displayName: string,
        public name: PlayerName,
        public agent: Agent,
        public positionIndex: number,
        public trumpSuit: Suit,
        public hand: Card[] = [],
        public scores: number[] = [],
        public calypsoInProgress: Set<string> = new Set(),
        public completedCalypsoes: number = 0,
        public trickpile: Card[] = [],
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
            new Set(this.calypsoInProgress),
            this.completedCalypsoes,
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

    get thisHandScore(): number {
        return calypsoValues[this.completedCalypsoes] + this.numCardsInCalypso * inProgressCardScore + this.trickpile.length * trickpileCardScore;
    }

    get numCardsInCalypso(): number {
        return this.calypsoInProgress.size;
    }

    get calypsoIsComplete(): boolean {
        // TODO: more general?
        return this.numCardsInCalypso === 13;
    }

    resetCards() {
        this.calypsoInProgress = new Set();
        this.trickpile = [];
        this.completedCalypsoes = 0;
    }

    private addCalypsoCards(cards: Card[]): Card[] {
        const leftovers: Card[] = [];
        for (const card of cards) {
            const cardStr = card.toStringShort();
            if (!this.calypsoInProgress.has(cardStr)) {
                leftovers.push(card);
            } else {
                this.calypsoInProgress.add(cardStr);
            }
            if (this.calypsoIsComplete) {
                this.completedCalypsoes += 1;
                this.calypsoInProgress = new Set();
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
