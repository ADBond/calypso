import { createCardElement, createSuitElement } from './ui';
import { GameStateForUI, state } from '../game/gamestate';
import { PlayerName } from '../game/player';
import { onHumanPlay } from './api';
import { handSortOrder } from '../game/card';


export async function renderState(state: GameStateForUI) {
  console.log(state);
  const n_players = state.playerNameArr.length;
  const handEl = document.getElementById('player-hand')!;
  const playerHand = state.hands.player;
  const playerTrumps = state.trumps['player'];
  playerHand.sort(
    (c1, c2) => (
      // 100 big enough to ensure we always sort by suit first
      // TODO: align order with personal suit
      100 * (handSortOrder(playerTrumps, c1.suit) - handSortOrder(playerTrumps, c2.suit)) +
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
  const prevElContainer = document.getElementById("prev-area")!;
  prevElContainer.innerHTML = '';

  state.playerNameArr.forEach(p => {
    const areaEl = document.createElement("div");
    const playedEl = document.createElement("div");
    const trumpEl = document.createElement("div");
    // imaginary square to hold calypso holder, for easy rotaters
    const playerCalypsoSquareEl = document.createElement("div");
    const calypsoEl = document.createElement("div");
    const prevEl = document.createElement("div");
    prevEl.id = `prev-${p}-${n_players}`;
    prevEl.classList.add("prev-slot");
    prevElContainer.appendChild(prevEl);
    const prevCard = state.previous[p as PlayerName];
    const prevCardEl = createCardElement(prevCard!== null ? prevCard.toStringShort() : "");
    prevCardEl.classList.add('played-card');
    prevEl.appendChild(prevCardEl);
    areaEl.classList.add("player-area");
    areaEl.classList.add(`${p}-${n_players}`);
    playedEl.id = `played-${p}-${n_players}`;
    playedEl.classList.add("played");
    playerCalypsoSquareEl.id = `calypso-holder-square-${p}-${n_players}`;
    playerCalypsoSquareEl.classList.add("calypso-holder-square");
    calypsoEl.id = `calypso-${p}-${n_players}`;
    calypsoEl.classList.add("calypso-holder");
    trumpEl.classList.add("suit-indicator");
    playerCalypsoSquareEl.appendChild(playedEl);
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
  document.getElementById('config')!.innerText = `Calypso ruleset: ${state.trickplay}`;
  // and current status
  document.getElementById('hand-number')!.innerText = `(hand #${state.handNumber}, trick #${state.trickNumber})`;

  // scores on the doors
  const scoresTableEl = document.getElementById('scores-table') as HTMLTableElement;

  const myPartnershipDisplay = 'Player & N';
  const theirPartnershipDisplay = 'E & W';
  const nameLookup = {
    player: myPartnershipDisplay,
    comp1: theirPartnershipDisplay,
  } as const;
  const displayName = {
    player: 'Player',
    comp1: 'W',
    comp2: 'N',
    comp3: 'E',
  };

  type Partnership = keyof typeof nameLookup;

  scoresTableEl.replaceChildren();

  const headerRow = document.createElement('tr');
  for (const title of ['Partnership', 'Score', 'Details']) {
    const th = document.createElement('th');
    th.textContent = title;
    if (title === 'Details') {
      th.colSpan = 4;
    } else {
      th.rowSpan = 2;
    }
    headerRow.appendChild(th);
  }
  scoresTableEl.appendChild(headerRow);
  const subHeadRow = document.createElement('tr');
  for (const subTitle of ['Player', 'C', 'P', 'T']) {
    const th = document.createElement('th');
    th.textContent = subTitle;
    subHeadRow.appendChild(th);
  }
  scoresTableEl.appendChild(subHeadRow);

  // need a specific order
  const playerNames: PlayerName[] = ['player', 'comp2', 'comp1', 'comp3'];
  for (const player of playerNames) {
    const row = document.createElement('tr');

    const rowEls: Element[] = [];
    if (Object.keys(nameLookup).includes(player)) {

      const partnershipTd = document.createElement('td');
      partnershipTd.textContent = nameLookup[player as Partnership];
      partnershipTd.classList.add('player-name');
      partnershipTd.rowSpan = 2;

      const scoreTd = document.createElement('td');
      scoreTd.textContent = String(state.scores[player]);
      scoreTd.rowSpan = 2;

      rowEls.push(partnershipTd, scoreTd);
    }

    const nameTd = document.createElement('td');
    nameTd.textContent = displayName[player];
    const calTd = document.createElement('td');
    calTd.textContent = String(state.scoreDetails[player].calypsoes);
    const calPartTd = document.createElement('td');
    calPartTd.textContent = String(state.scoreDetails[player].calypsoPart);
    const trickpileTd = document.createElement('td');
    trickpileTd.textContent = String(state.scoreDetails[player].trickpiles);

    row.append(...rowEls, nameTd, calTd, calPartTd, trickpileTd);
    scoresTableEl.appendChild(row);
  }

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
