import { playUntilHuman } from './interface/api';
import { renderWithDelays } from './interface/render';
import { newGame } from './interface/game';
import { GameConfig, TrickPlayOption } from './game/gamestate';

async function loadGame(config: GameConfig) {
  newGame(config);
  const futureStates = await playUntilHuman();
  // TODO: avoid this duplication
  await renderWithDelays(futureStates);
}

const DEFAULTS: GameConfig = {
  trickplay: 'standard',
};


const button = document.getElementById("new-game-button")!;
const menu = document.getElementById("new-game-menu")!;
const form = document.getElementById("new-game-form") as HTMLFormElement;

function resetValues() {
  (form.querySelector(
    `input[name="trickplay"][value="${DEFAULTS.trickplay}"]`
  ) as HTMLInputElement).checked = true;

}

document.addEventListener("DOMContentLoaded", async () => {
  resetValues();
  await loadGame(DEFAULTS);
});

button.addEventListener("click", () => {
  menu.hidden = !menu.hidden;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const trickplay = formData.get("trickplay") as TrickPlayOption;
  const config: GameConfig = {
    trickplay: trickplay,
  }

  menu.hidden = true;
  resetValues();

  await loadGame(config);
});

document.addEventListener("click", (e) => {
  if (!menu.contains(e.target as Node) && e.target !== button) {
    menu.hidden = true;
  }
});
