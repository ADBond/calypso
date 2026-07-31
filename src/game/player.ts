import { Card, Suit } from "./card";
import { Agent } from "./agent/agent";

export const playerNameArr = ['player', 'comp1', 'comp2', 'comp3'] as const;
export type PlayerName = typeof playerNameArr[number];


export class Player {
    constructor(
        public displayName: string,
        public name: PlayerName,
        public agent: Agent,
        public positionIndex: number,
        public trumpSuit: Suit,
        public hand: Card[] = [],
        public scores: number[] = [],
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
}
