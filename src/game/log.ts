import { Card, Suit } from "./card";
import { Player } from "./player";
import { GameConfig } from "./gamestate";
import { AgentName } from "./agent/agent";
import { getCommitHash } from "../utils/commit";

declare const __COMMIT_HASH__: string;

export class GameLog {
    private hands: Card[][] = [];
    public cachette: Card[] = [];
    public cachetteValue: number = -1;

    private playerCount: number;

    public dealerIndex: number = -1;
    public handNumber: number = -1;
    
    // each trick is array of[card, playerIndex], along with winner index, and trickpile cards
    private tricks: [[Card, number][], number, Card[]][] = [];

    public startingScores: number[] = [];
    public handScores: number[] = [];

    public complete: boolean = false;
    private version: string = getCommitHash();
    private logVersion: number = 0;
    private game: string = 'calypso';

    constructor(
        private gameID: string,
        private config: GameConfig,
        private players: AgentName[],
        private trumpSuits: Suit[],
    ) {
        this.playerCount = players.length;
    }

    captureTrick(trick: [Card, Player][], winnerIndex: number, trickpileCards: Card[]) {
        this.tricks.push(
            [
                trick.map(([card, player]) => [card, player.positionIndex]),
                winnerIndex,
                trickpileCards,
            ]
        );
    }

    captureHands(hands: Card[][]) {
        this.hands = hands.map(
            (hand) => hand.sort(
                (c1, c2) => (
                    // 100 big enough to ensure we always sort by suit first
                    // TODO: farm this out
                    100 * (c1.suit.rankForTrumpPreference - c2.suit.rankForTrumpPreference) +
                    (c1.rank.trickTakingRank - c2.rank.trickTakingRank)
                )
            )
        );
    }

    get finalScores(): number[] {
        return Array.from(
            this.startingScores,
            (_, i) => this.startingScores[i] + this.handScores[i]
        );
    }

    get json(): string {
        return JSON.stringify(this);
    }
}

// send game log to storage
export async function sendGameLog(log: GameLog) {
    return;  // TODO: restore when we have a version
    // console.log("Game Log:");
    // console.log(log);
    try {
        const res = await fetch("https://qaw-games.netlify.app/.netlify/functions/saveGameLog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(log),
        });

        if (!res.ok) {
            console.warn("Game log upload failed:", res.status, await res.text());
            return;
        }
        3.
        const json = await res.json();
        console.log("Log saved:", json);
    } catch (err) {
        console.warn("Could not send game log (offline?):", err);
    }
}
