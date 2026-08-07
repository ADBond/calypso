import { describe, it, expect } from "vitest";
import { ScoreDetails } from "../src/game/player";

describe("scoring", () => {
    it("checks the scenario has the correct score", () => {
        const details: [[number, number, number], number][] = [
            [[0, 0, 0], 0],
            [[1, 0, 0], 500],
            [[2, 0, 0], 500 + 750],
            [[3, 0, 0], 500 + 750 + 1000],
            [[4, 0, 0], 500 + 750 + 1000 + 1000],
            [[0, 0, 1], 10],
            [[0, 1, 0], 20],
            [[0, 12, 42], 660],
            [[1, 1, 34], 860],
        ]

        details.forEach(
            ([detailConfig, expectedScore]) => {
                const scoreDetails = new ScoreDetails(...detailConfig);
                expect(scoreDetails.score).toEqual(expectedScore);
            }
        )

    });


});
