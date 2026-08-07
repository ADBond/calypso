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
    const unknownCards = state.fullPack.filter(
        card => 
            (!state.currentPlayerHand.some(handCard => Card.cardIdentical(card, handCard))) &&
            (!state.playedCards.some(playedCard => Card.cardIdentical(card, playedCard)))
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
    c: number = 600,
): Promise<[number, ISMCTSNode]> {
    // console.log(`ISMCTS called ${Math.random()}`);
    const initialPlayerIndex = rootState.currentPlayerIndex;
    const initialScores = zeroSum(rootState.scores);
    const rootNode = new ISMCTSNode(initialPlayerIndex);
    const numPlayers = rootState.numPlayers;

    const terminalStates = ["hand_complete", "game_complete", "round_complete"];
    const dealingStates = ["new_hand", "new_round"];
    const nonDecisionStates = terminalStates.concat(dealingStates);

    let maxDepth = 0;
    let depth;

    for (let i = 0; i < iterations; i++) {
        let state = determinise(rootState, rolloutAgent);

        // if determinise() can hand back a state sitting on new_hand/new_round,
        // fast-forward it to the first real decision/terminal point up front
        while (dealingStates.includes(state.currentState)) {
            await state.increment();
        }

        let node = rootNode;

        // walk down tree until we hit a node to expand or a terminal state
        while (!terminalStates.includes(state.currentState)) {
            let legalMoves = state.legalMoveIndices;
            let currentPlayerIndex = state.currentPlayerIndex;
            node.ensureChildrenExist(currentPlayerIndex, legalMoves);

            legalMoves.forEach(
                move => node.children[move].availability += 1
            );

            let justExpanded = false;
            let untriedNodes = node.untriedNodes(legalMoves);
            if (untriedNodes.length > 0) {
                node = randomArrayElement(untriedNodes);
                justExpanded = true;
            } else {
                node = node.bestChildByUCB(legalMoves, c);
            }

            state.moveFromIndex(node.move);
            if (justExpanded) {
                break;
            }

            // roll forwards through dealing states to the next action state, or terminal state
            while (!nonDecisionStates.concat("play_card").includes(state.currentState)) {
                await state.increment();
            }
            // land cleanly on play_card if we're currently sat on a dealing state
            while (dealingStates.includes(state.currentState)) {
                await state.increment();
            }
        }

        // rollout: play until the end of round when we get score info
        while (!["round_complete"].includes(state.currentState)) {
            await state.increment();
        }

        // TODO: probably some partial scores hand-to-hand would be useful...
        if (state.currentState === "round_complete") {
            await state.increment();
        }

        const rolloutRewards = state.scores;
        const rolloutZeroSum = zeroSum(rolloutRewards);

        let result = Array(numPlayers).fill(0.0);
        for (let j = 0; j < result.length; j++) {
            result[j] = rolloutZeroSum[j] - initialScores[j];
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
        }
        maxDepth = Math.max(depth, maxDepth);
    }

    const highestVisits = Math.max(
        ...Object.values(rootNode.children).map(node => node.visits)
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
