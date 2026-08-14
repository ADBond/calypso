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
  const defaultPacks = "2";
  (form.querySelector(
    `input[name="numhands"][value="4"]`
  ) as HTMLInputElement).checked = true;
  (form.querySelector(
    `input[name="packs"][value="${defaultPacks}"]`
  ) as HTMLInputElement).checked = true;
  (form.querySelector(
    `input[name="sitouts"][value="0"]`
  ) as HTMLInputElement).checked = true;


  updateVisibleOptions('gamemode', DEFAULTS.gamemode);
  updateVisibleOptions('packs', defaultPacks);
}

document.addEventListener("DOMContentLoaded", async () => {
  resetValues();
  await loadGame(DEFAULTS);
});

button.addEventListener("click", () => {
  menu.hidden = !menu.hidden;
});

const modeGroups = form.querySelectorAll<HTMLFieldSetElement>('[data-gamemode-options]');
const packGroups = form.querySelectorAll<HTMLFieldSetElement>('[data-packs-options]');

function updateVisibleOptions(choice: string, option: string) {
    // TODO: more general? 
    const dependents = choice === 'gamemode' ? modeGroups : packGroups;
    for (const group of dependents) {
        const options = group.dataset[`${choice}Options`]!.split(",");
        const isActive = options.includes(option);
        group.hidden = !isActive;

        // disable fields in inactive groups so FormData doesn't include them
        const fields = group.querySelectorAll<HTMLInputElement>('input, select, textarea, label')
        for (const field of fields) {
            field.disabled = !isActive;
        }
    }
}

const modeInputs = form.querySelectorAll<HTMLInputElement>('input[name="gamemode"]');
modeInputs.forEach(input => {
    input.addEventListener('change', () => {
        if (input.checked) updateVisibleOptions('gamemode', input.value);
    });
});

const packsInputs = form.querySelectorAll<HTMLInputElement>('input[name="packs"]');
packsInputs.forEach(input => {
    input.addEventListener('change', () => {
        if (input.checked) updateVisibleOptions('packs', input.value);
    });
});

const initialMode = form.querySelector<HTMLInputElement>('input[name="gamemode"]:checked')?.value;
if (initialMode) updateVisibleOptions('gamemode', initialMode);
const initialPacks = form.querySelector<HTMLInputElement>('input[name="packs"]:checked')?.value;
if (initialPacks) updateVisibleOptions('packs', initialPacks);

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
      const sitoutStr = formData.get('sitouts');
      if (sitoutStr === null) throw new Error(`Invalid sitouts selection`)
      return {
        trickplay: trickplay,
        gamemode: gamemode,
        numHands: parseInt(formData.get('numhands') as string),
        packs: parseInt(formData.get('packs') as string),
        sitout: parseInt(sitoutStr as string),
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
