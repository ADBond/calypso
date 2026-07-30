import { ComputerAgent } from "./agent"
import { GameState } from "../gamestate"

export function randomArrayElement<Type>(arr: Type[]): Type {
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}

export const randomAgent: ComputerAgent = {
    async chooseMove(gameState: GameState, legalMoveIndices: number[]) {
        return randomArrayElement(legalMoveIndices);
    }
};
