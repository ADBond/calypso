import { Card, shuffle } from "../../card";
import { GameState } from "../../gamestate";
import { ComputerAgent } from "../agent";
import { randomArrayElement } from "../random";

export class ISMCTSNode {
    public children: {[key: string]: ISMCTSNode} = {};
    public visits: number = 0;
    public availability: number = 0;
    public score: number = 0;

    constructor(
        public playerIndex: number,
        public move: number = -1,
        public parent: ISMCTSNode | null = null,
    ) {}

    private legalChildren(legalMoves: number[]): ISMCTSNode[] {
        return legalMoves.filter(
            (move) => `${move}` in this.children
        ).map(
            (move) => this.children[`${move}`]
        );
    }

    public untriedNodes(legalMoves: number[]): ISMCTSNode[] {
        const untriedNodes = this.legalChildren(legalMoves).filter(
            node => node.visits === 0
        );
        return untriedNodes;
    }

    private ucb(c: number): number {
        if (this.visits === 0) {
            return Infinity;
        }
        const exploitation = this.score / this.visits;
        const exploration = c * Math.sqrt(Math.log(this.availability) / this.visits);
        return exploitation + exploration;
    }

    public bestChildByUCB(legalMoves: number[], c: number): ISMCTSNode {
        const legalChildren = this.legalChildren(legalMoves);
        const ucbs = legalChildren.map(
            childNode => childNode.ucb(c)
        );
        const topUCB = Math.max(
            ...ucbs
        );
        return legalChildren.filter(childNode => childNode.ucb(c) === topUCB)[0];
    }

    public ensureChildrenExist(playerIndex: number, legalMoves: number[]) {
        legalMoves.forEach(
            move => {
                if (!(`${move}` in this.children)) {
                    const newChild = new ISMCTSNode(playerIndex, move, this);
                    this.children[`${move}`] = newChild;
                }
            }
        );
    }

    public isFullyExpanded(legalMoves: number[]) {
        // all legal children have been visited at least once
        // TODO: do we need this as a separate thing? Seems inefficient
        return this.untriedNodes(legalMoves).length === 0;
    }
}

function determiniseNaive(state: GameState, agent: ComputerAgent): GameState {
    const newState = state.clone();
    const unknownCards = state.pack.filter(
        card => 
            (!state.currentPlayerHand.some(handCard => Card.cardEquals(card, handCard))) &&
            (!state.playedCards.some(playedCard => Card.cardEquals(card, playedCard)))
    )
    shuffle(unknownCards);
    for (let playerIndex = 0; playerIndex < state.numPlayers; playerIndex++) {
        const player = newState.players[playerIndex];
        player.agent = agent;
        if (player.name === state.currentPlayer.name) {
            continue;
        }
        const cardsLeft = player.hand.length;
        player.hand = [];
        for (let cardNum = 0; cardNum < cardsLeft; cardNum++) {
            const card = unknownCards.pop();
            if (card) newState.giveCardToPlayer(playerIndex, card);
        }
    }
    return newState;
}


function determinise(state: GameState, agent: ComputerAgent): GameState {
    return determiniseNaive(state, agent);
}

export async function ismcts(
    rootState: GameState,
    rolloutAgent: ComputerAgent,
    iterations: number = 10,
    c: number = 15,
    rolloutDiscount: number = 0.8,
    winningIncentive: boolean = false,
): Promise<[number, ISMCTSNode]> {
    // console.log(`ISMCTS called ${Math.random()}`);
    const initialPlayerIndex = rootState.currentPlayerIndex;
    const initialScores = zeroSum(rootState.scores);
    const rootNode = new ISMCTSNode(initialPlayerIndex);
    const nPlayers = rootState.numPlayers;
    let maxDepth = 0;
    let depth;
    for (let i = 0; i < iterations; i++) {
        // console.log(`ISMCTS iteration ${i}`);
        let state = determinise(rootState, rolloutAgent);
        let node = rootNode;
        let treeRewards = Array(nPlayers).fill(0.0);
        // walk down tree until we get a node to expand
        while (!["hand_complete", "game_complete"].includes(state.currentState)) {
            let legalMoves = state.legalMoveIndices;
            let currentPlayerIndex = state.currentPlayerIndex;
            node.ensureChildrenExist(currentPlayerIndex, legalMoves);

            legalMoves.forEach(
                move => node.children[move].availability += 1
            );

            let justExpanded = false;
            let untriedNodes = node.untriedNodes(legalMoves);
            if (untriedNodes.length > 0) {
                // console.log("Trying a new node");
                node = randomArrayElement(untriedNodes);
                justExpanded = true;
            } else {
                // console.log("Picking something good");
                // tried everything at least once - use UCB to decide where to go
                node = node.bestChildByUCB(legalMoves, c);
            }
            state.moveFromIndex(node.move);
            // check if we can finish a trick and allocate rewards
            while (!["play_card", "hand_complete", "game_complete"].includes(state.currentState)) {
                let initialState = state.currentState;
                await state.increment();
                if (["trick_complete", "process_cachette"].includes(initialState)) {
                    let trick = state.prevTrickScores;
                    for (let j = 0; j < trick.length; j++) {
                        if (winningIncentive) {
                            treeRewards[j] += trick[j];
                        } else {
                            treeRewards[j] += -trick.reduce((a, b) => a + b, 0);
                        }
                    }
                }
            }
            if (justExpanded) {
                break;
            }
        }
        let rolloutRewards = Array(nPlayers).fill(0.0);

        while (!["hand_complete", "game_complete"].includes(state.currentState)) {  // false positive
            // console.log(`Rollout for ${i}... (${state.currentState}, hand is ${state.handNumber})`);
            let initialState = state.currentState;
            await state.increment();
            if (initialState === "trick_complete") {
                let trick = state.prevTrickScores;
                for (let j = 0; j < trick.length; j++) {
                    if (winningIncentive) {
                        rolloutRewards[j] += trick[j];
                    } else {
                        rolloutRewards[j] += -trick.reduce((a, b) => a + b, 0);
                    }
                }
            }
        }
        let treeZeroSum: number[];
        let rolloutZeroSum: number[];
        if (winningIncentive) {
            treeZeroSum = zeroSum(treeRewards);
            rolloutZeroSum = zeroSum(rolloutRewards);
        } else {
            treeZeroSum = treeRewards;
            rolloutZeroSum = rolloutRewards;
        }

        let result = Array(nPlayers).fill(0.0);
        for (let j = 0; j < result.length; j++) {
            result[j] = treeZeroSum[j] + rolloutDiscount * rolloutZeroSum[j] - initialScores[j];
        }
        depth = 0;
        while (true) {
            depth += 1;
            node.visits += 1;
            if (node.move !== -1) {
                node.score += result[node.playerIndex];
            }
            if (node.parent === null) {
                break;
            }
            node = node.parent;
            // console.log(`Depth: ${depth}`);
        }
        maxDepth = Math.max(depth, maxDepth);
        // console.log(`Iteration ${i} complete`);
    }
    // console.log(`ISMCTS complete, ${iterations} iterations, maximum tree depth ${maxDepth}`);
    const highestVisits = Math.max(
        ...Object.values(rootNode.children).map(
            node => node.visits
        )
    );
    const bestChild = Object.values(rootNode.children).filter(
        node => node.visits === highestVisits
    )[0];
    return [bestChild.move, rootNode];
}

function zeroSum(arr: number[]): number[] {
    return arr.map(
        (val, idx) => val - arr[(idx + 1) % arr.length]
    );
}
