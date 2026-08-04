import { createCardElement, createSuitElement } from './ui';
import { GameStateForUI, state } from '../game/gamestate';
import { PlayerName } from '../game/player';
import { onHumanPlay } from './api';


export async function renderState(state: GameStateForUI) {
  console.log(state);
  const n_players = state.playerNameArr.length;
  const handEl = document.getElementById('player-hand')!;
  const playerHand = state.hands.player;
  playerHand.sort(
    (c1, c2) => (
      // 100 big enough to ensure we always sort by suit first
      // TODO: align order with personal suit
      100 * (c1.suit.rankForSorting - c2.suit.rankForSorting) +
      (c1.rank.trickTakingRank - c2.rank.trickTakingRank)
    )
  );
  handEl.innerHTML = '';
  playerHand.forEach(card => {
    handEl.appendChild(
      createCardElement(card.toStringShort(), state.whoseTurn === "player" ? (() => onHumanPlay(card)) : undefined)
    )
  });

  const gameBoard = document.getElementById("game-board")!;
  gameBoard.innerHTML = '';

  state.playerNameArr.forEach(p => {
    const areaEl = document.createElement("div");
    const playedEl = document.createElement("div");
    const trumpEl = document.createElement("div");
    // imaginary square to hold calypso holder, for easy rotaters
    const playerCalypsoSquareEl = document.createElement("div");
    const calypsoEl = document.createElement("div");
    areaEl.classList.add("player-area");
    areaEl.classList.add(`${p}-${n_players}`);
    playedEl.id = `played-${p}-${n_players}`;
    playedEl.classList.add("played");
    playerCalypsoSquareEl.id = `calypso-holder-square-${p}-${n_players}`;
    playerCalypsoSquareEl.classList.add("calypso-holder-square");
    calypsoEl.id = `calypso-${p}-${n_players}`;
    calypsoEl.classList.add("calypso-holder");
    trumpEl.classList.add("suit-indicator");
    areaEl.appendChild(playedEl);
    playerCalypsoSquareEl.appendChild(trumpEl);
    gameBoard.appendChild(playerCalypsoSquareEl);
    playerCalypsoSquareEl.appendChild(calypsoEl);
    gameBoard.appendChild(areaEl);
    if (p === state.dealer) {
      playedEl.classList.add('dealer');
    } else {
      playedEl.classList.remove('dealer');
    }
    const card = state.played[p as PlayerName];
    let el: HTMLElement;
    if (card === 'back') {
      el = createCardElement('back');
    } else {
      el = createCardElement(
        card !== null ? card.toStringShort() : ""
      );
      el.classList.add('played-card');
    }
    playedEl.appendChild(el);
    trumpEl.appendChild(createSuitElement(state.trumps[p].toStringShort()));
    const offset = 22;
    let offCounter = 0;
    for(const calypsoCardStr of state.calypsoes[p]) {
      const calypsoCardEl = createCardElement(calypsoCardStr);
      calypsoCardEl.style.left = `${offset * offCounter}px`;
      calypsoEl.appendChild(calypsoCardEl);
      offCounter++;
    }
  });


  // game status - config
  document.getElementById('config')!.innerText = `calypso ruleset: ${state.trickplay}`;
  // and current status
  document.getElementById('hand-number')!.innerText = `(hand #${state.handNumber}, trick #${state.trickNumber})`;


}

const delayMap: Record<state, number> = {
  new_round: 10,
  play_card: 700,
  trick_complete: 1700,
  hand_complete: 3000,
  round_complete: 500,
  new_hand: 10,
  game_complete: 10,
}

export async function renderWithDelays(states: GameStateForUI[]) {
  // console.log('rendering');
  for (const state of states) {
    // console.log('render')
    // console.log(state);
    await renderState(state);
    await wait(delayMap[state.gameState]);
  }
}


function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
