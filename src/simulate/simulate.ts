
import { Game } from '../game/game';
import { GameConfig } from '../game/gamestate';
import { AgentName } from '../game/agent/agent';
import { GameLog } from '../game/log';

export async function simulate(agents: AgentName[]): Promise<Game> {
    const config: GameConfig = {
        trickplay: 'standard',
    };
    let game = new Game(agents, config, true);
    let current = game.getGameStateForUI();

    // getout for infinite loop
    let counter = 0;
    const maxCounter = 15000;  // should be enough, i think?

    // console.log(current);

    while ((current.gameState !== 'game_complete') && counter < maxCounter) {
        // console.log("state...")
        await game.incrementState();
        current = game.getGameStateForUI();
        counter++;
    }

    // console.log(game.logs);
    // console.log(counter);
    return game;
}

export async function simulateHand(player: AgentName): Promise<[number[], GameLog]> {
    const config: GameConfig = {
        trickplay: 'standard',
    };
    let game = new Game([player, player, player, player], config, true);
    let current = game.getGameStateForUI();

    let counter = 0;
    const maxCounter = 15000;  // should be enough, i think?

    while ((current.gameState !== 'hand_complete') && counter < maxCounter) {
        // console.log("state...")
        await game.incrementState();
        current = game.getGameStateForUI();
        counter++;
    }

    return [game.state.scores, game.currentLog];
}

export async function simulateN(agents: AgentName[], n: number): Promise<Partial<Record<AgentName, number>>[]> {
    let game: Game;
    let scores: Partial<Record<string, any>>[] = [];
    let gameRecord: Partial<Record<string, any>>[];
    for (let index = 0; index < n; index++) {
        console.log(`Simulating: ${index}`)
        game = await simulate(agents);
        let finalScores = game.logs[game.logs.length - 1].finalScores;
        let winningScore = Math.max(...finalScores);
        let losingScore = Math.min(...finalScores);
        gameRecord = [];
        agents.forEach(
            (agent, i) => gameRecord.push(
                {
                    agent: agent,
                    score: finalScores[i],
                    position: i,
                    // TODO: some bonus points based on score differences
                    // TODO: deal with ties properly
                    leaguePoints: finalScores[i] === winningScore ? 10 : (finalScores[i] === losingScore ? -10 : 0)
                }
            )
        );
        scores.push(...gameRecord);
    }
    return scores;
}

function product<T>(...arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, curr) =>
      acc.flatMap(a => curr.map(b => [...a, b])),
    [[]]
  );
}

export async function roundRobin(agents: AgentName[], n: number) {
    let allScores: Partial<Record<string, any>>[] = [];
    let results: Partial<Record<AgentName, Record<string, number>>> = {};
    for (const [a1, a2, a3, a4] of product(agents, agents, agents, agents)) {
        console.log([a1, a2, a3, a4]);
        let scores = await simulateN([a1, a2, a3, a4], n);
        allScores.push(...scores);
    }
    console.log(allScores);
    agents.forEach(
        (agent) => {
            let onlyAgent = allScores.filter(
                scoreInfo => scoreInfo.agent === agent
            );
            let totalPoints = onlyAgent.map(
                scoreInfo => scoreInfo.leaguePoints
            ).reduce((a, b) => a + b);
            results[agent] = {
                played: onlyAgent.length,
                leaguePoints: totalPoints,
                totalScore: onlyAgent.map(scoreInfo => scoreInfo.score).reduce((a, b) => a + b),
            };
        }
    );
    console.log(results);
}
