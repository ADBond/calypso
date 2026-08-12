import { playUntilHuman } from './interface/api';
import { renderWithDelays } from './interface/render';
import { newGame } from './interface/game';
import { GameConfig, GameMode, TrickPlayOption } from './game/gamestate';

async function loadGame(config: GameConfig) {
  newGame(config);
  const futureStates = await playUntilHuman();
  // TODO: avoid this duplication
  await renderWithDelays(futureStates);
}

const DEFAULTS: GameConfig = {
  trickplay: 'standard',
  gamemode: 'classic',
};


const button = document.getElementById("new-game-button")!;
const menu = document.getElementById("new-game-menu")!;
const form = document.getElementById("new-game-form") as HTMLFormElement;

function resetValues() {
  (form.querySelector(
    `input[name="trickplay"][value="${DEFAULTS.trickplay}"]`
  ) as HTMLInputElement).checked = true;

  (form.querySelector(
    `input[name="gamemode"][value="${DEFAULTS.gamemode}"]`
  ) as HTMLInputElement).checked = true;

  // need defaults for embers mode so when we open it, it is preselected
  // TODO: a nicer way to do these?
  (form.querySelector(
    `input[name="numhands"][value="4"]`
  ) as HTMLInputElement).checked = true;
  (form.querySelector(
    `input[name="packs"][value="2"]`
  ) as HTMLInputElement).checked = true;
  (form.querySelector(
    `input[name="sitouts"][value="0"]`
  ) as HTMLInputElement).checked = true;


  updateVisibleOptions(DEFAULTS.gamemode);
}

document.addEventListener("DOMContentLoaded", async () => {
  resetValues();
  await loadGame(DEFAULTS);
});

button.addEventListener("click", () => {
  menu.hidden = !menu.hidden;
});

// TODO: repeat this for sitouts vs packs
const modeInputs = form.querySelectorAll<HTMLInputElement>('input[name="gamemode"]');
const modeGroups = form.querySelectorAll<HTMLFieldSetElement>('[data-mode-options]');

function updateVisibleOptions(mode: string) {
    for (const group of modeGroups) {
        const isActive = group.dataset.modeOptions === mode;
        group.hidden = !isActive;

        // disable fields in inactive groups so FormData doesn't include them
        for (const field of group.querySelectorAll<HTMLInputElement>('input, select, textarea')) {
            field.disabled = !isActive;
        }
    }
}

modeInputs.forEach(input => {
    input.addEventListener('change', () => {
        if (input.checked) updateVisibleOptions(input.value);
    });
});

const initialMode = form.querySelector<HTMLInputElement>('input[name="gamemode"]:checked')?.value;
if (initialMode) updateVisibleOptions(initialMode);

function getConfig(formData: FormData): GameConfig {
  const trickplay = formData.get("trickplay") as TrickPlayOption;
  const gamemode = formData.get("gamemode") as GameMode;

  switch (gamemode) {
    case 'classic':
      return {
        trickplay: trickplay,
        gamemode: gamemode,
      };
    case 'embers':
      return {
        trickplay: trickplay,
        gamemode: gamemode,
        numHands: parseInt(formData.get('numhands') as string),
        packs: parseInt(formData.get('packs') as string),
        sitout: parseInt(formData.get('sitouts') as string),
      };
    }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  const config: GameConfig = getConfig(formData);

  menu.hidden = true;
  // resetValues();

  await loadGame(config);
});

document.addEventListener("click", (e) => {
  if (!menu.contains(e.target as Node) && e.target !== button) {
    menu.hidden = true;
  }
});
