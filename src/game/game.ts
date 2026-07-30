import { GameConfig, GameState, GameStateForUI } from "./gamestate";
import { GameLog, sendGameLog } from "./log";
import { AgentName } from "./agent/agent";

export const defaultConfig: GameConfig = {
  trickplay: 'standard',
}

function randomID(): string {
  const theDate = new Date();
  const dateString = [
    theDate.getFullYear(),
    String(theDate.getMonth() + 1).padStart(2, "0"),
    String(theDate.getDate()).padStart(2, "0"),
  ].join("_");
  const randomFromTime = (Date.now() % 100_000).toString(36);
  const randomNumber = Math.random().toString(36).slice(2, 8);
  return `${dateString}_${randomFromTime}_${randomNumber}`;
}

export class Game {
  public state: GameState;
  public logs: GameLog[] = [];
  public currentLog: GameLog;
  private gameID: string;
  private playerNames: AgentName[];

  constructor(
      playerNames: AgentName[],
      config: GameConfig = defaultConfig,
      private simulation: boolean = false,
    ) {
    this.gameID = randomID();
    this.state = new GameState(playerNames, config);
    this.currentLog = new GameLog(this.gameID, config, playerNames);
    this.playerNames = playerNames;
  }

  async incrementState() {
    await this.state.increment(this.currentLog);
    if (this.currentLog.complete) {
      this.logs.push(this.currentLog);
      if (!this.simulation) {
        sendGameLog(this.currentLog);
      }
      this.currentLog = new GameLog(this.gameID, this.state.config, this.playerNames);
    }
  }

  getGameStateForUI(): GameStateForUI {
    return this.state.getStateForUI();
  }

}
