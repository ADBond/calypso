import { describe, it, expect } from "vitest";
import { makeCards, getSuit } from "../src/game/card";
import { TrickPlayOption, GameState } from "../src/game/gamestate";

describe("trick winning rules", () => {
    it("checks the trick winner in standard calypso", () => {
        const trumpSuits = ["D", "H", "C", "S"].map(getSuit);
        const trickplay: TrickPlayOption = 'standard';
        const trickSetupAndWinner: [string[], number][] = [
            // leading trumps, no one else trumps
            [["9D", "3D", "2D", "5D"], 0],
            [["9D", "TD", "2D", "5D"], 0],
            [["9D", "TD", "AD", "QD"], 0],
            [["9D", "AS", "AD", "QD"], 0],
            [["9D", "AS", "AH", "AC"], 0],
            // leading trumps, someone else trumps in
            [["9D", "3H", "2D", "5D"], 1],
            [["9D", "JH", "2D", "5D"], 1],
            [["9D", "3D", "2C", "5D"], 2],
            [["9D", "3D", "QC", "5D"], 2],
            [["9D", "3D", "2D", "5S"], 3],
            [["9D", "3D", "2D", "AS"], 3],
            // leading trumps, someone trumps, then an overtrump
            [["9D", "3H", "5C", "5D"], 2],
            [["9D", "3H", "5C", "6S"], 3],
            // undertrumping doesn't win
            [["9D", "5H", "3C", "5D"], 1],
            // ties to first played
            [["9D", "5H", "5C", "5D"], 1],
        ];
        trickSetupAndWinner.forEach(
            ([trickStrs, winnerIndex]) => {
                const trick = makeCards(trickStrs);
                const calculatedWinner = GameState.trickWinnerIndex(trick, trumpSuits, trickplay);
                expect(calculatedWinner).toEqual(winnerIndex);
            }
        )

    });

    it("checks the trick winner in all fours calypso", () => {
        const trumpSuits = ["D", "H", "C", "S"].map(getSuit);
        const trickplay: TrickPlayOption = 'allfours';
        const trickSetupAndWinner: [string[], number][] = [
            // leading trumps, no one else trumps
            [["9D", "3D", "2D", "5D"], 0],
            [["9D", "TD", "2D", "5D"], 0],
            [["9D", "TD", "AD", "QD"], 0],
            [["9D", "AS", "AD", "QD"], 0],
            [["9D", "AS", "AH", "AC"], 0],
            // leading trumps, someone else trumps in
            [["9D", "3H", "2D", "5D"], 0],
            [["9D", "JH", "2D", "5D"], 1],
            [["9D", "3D", "2C", "5D"], 0],
            [["9D", "3D", "QC", "5D"], 2],
            [["9D", "3D", "2D", "5S"], 0],
            [["9D", "3D", "2D", "AS"], 3],
            // undertrumping doesn't win
            [["9D", "3H", "5C", "5D"], 0],
            [["9D", "3H", "5C", "6S"], 0],
            [["9D", "JH", "5C", "5D"], 1],
            [["9D", "JH", "QC", "5D"], 2],
            [["9D", "JH", "TC", "5D"], 1],
        ];
        trickSetupAndWinner.forEach(
            ([trickStrs, winnerIndex]) => {
                const trick = makeCards(trickStrs);
                const calculatedWinner = GameState.trickWinnerIndex(trick, trumpSuits, trickplay);
                expect(calculatedWinner).toEqual(winnerIndex);
            }
        )

    });

});
