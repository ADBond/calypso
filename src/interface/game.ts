import { Game } from "../game/game";
import { GameConfig } from "../game/gamestate";

let game: Game;
const opp = 'random';

export function newGame(config: GameConfig): void {
    const numPlayers = 4;  // TODO: variable, from config?
    const players = ['human', ...Array(numPlayers - 1).fill(opp)];
    game = new Game(
        players,
        config,
    );
}

export function getGame(): Game {
    if (!game) console.log("Error getting game! None found!");
    return game;
}
