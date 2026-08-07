import { GameState } from "../gamestate";
import { randomAgent } from "./random";
import { ismctsAgent } from "./ismcts/agent";

export interface ComputerAgent {
    chooseMove: (gameState: GameState, legalMoveIndices: number[]) => Promise<number>
}

export type Agent = ComputerAgent | 'human';
export type AgentName = 'human' | 'random' | 'ismcts10' | 'ismcts100' | 'ismcts1000';

export function agentLookup(name: AgentName): Agent {
    if (name === 'human') {
        return name;
    } else if (name === 'random') {
        return randomAgent;
    } else if (name === 'ismcts10') {
        // TODO: better approach
        return ismctsAgent(10, randomAgent);
    } else if (name === 'ismcts100') {
        return ismctsAgent(100, randomAgent);
    } else if (name === 'ismcts1000') {
        return ismctsAgent(1000, randomAgent);
    }
    throw Error(`Unknown model ${name}`);
}
