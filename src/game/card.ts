export class Rank {
    constructor(
        public name: string,
        public trickTakingRank: number,
        public ttRankAbove: number,
    ) { }

    toString(): string {
        return this.name;
    }

    toStringShort(): string {
        return this.name[0];
    }

    toJSON() {
        return this.toStringShort();
    }

    static rankEquals(r1: Rank, r2: Rank): boolean {
        return r1.name === r2.name;
    }
}
// No absolute trump preference but framework for the ranking
export class Suit {
    constructor(public name: string, public rankForTrumpPreference: number, public html: string) { }

    get rankForSorting(): number {
        if (this.rankForTrumpPreference === 0) { 
            return 10;
        }
        return this.rankForTrumpPreference;
    }

    toString(): string {
        return this.name;
    }

    toStringShort(): string {
        return this.name[0];
    }

    toJSON() {
        return this.toStringShort();
    }

    static suitEquals(s1: Suit, s2: Suit): boolean {
        return s1.name === s2.name;
    }
}

export class Card {
    constructor(public suit: Suit, public rank: Rank, public index: number) { }

    toString(): string {
        return `${this.rank.toString()} of ${this.suit.toString()}`;
    }

    toStringShort(): string {
        return `${this.rank.toStringShort()}${this.suit.toStringShort()}`;
    }

    toJSON() {
        return this.toStringShort();
    }

    get html(): string {
        return `${this.rank.toStringShort()}${this.suit.html}`;
    }

    public nextCardUp(pack: Card[]): Card {
        /*
        From a given pack, return the next card up from the current one (in suit)
        */
        const ttrRank = this.rank.ttRankAbove;
        const suit = this.suit;
        const matchingCards = pack.filter(
            card => Suit.suitEquals(card.suit, suit) && (card.rank.trickTakingRank === ttrRank)
        )
        if (matchingCards.length !== 1) {
            console.log(`Error in nextCardUp: ${matchingCards}`);
        }
        return matchingCards[0];
    }

    static cardEquals(c1: Card, c2: Card): boolean {
        return Rank.rankEquals(c1.rank, c2.rank) && Suit.suitEquals(c1.suit, c2.suit);
    }

    static cardFromIndex(index: number, pack: Card[]): Card {
        const cards = pack.filter(card => card.index === index);
        if (cards.length !== 1) {
            console.log(`Error in cardFromIndex: ${cards}`);
        }
        return cards[0];
    }

    static lowestCards(cards: Card[]): Card[] {
        const lowestRank = Math.min(...cards.map(card => card.rank.trickTakingRank));
        const lowestCards = cards.filter(
            card => card.rank.trickTakingRank === lowestRank
        )
        return lowestCards;
    }

    static highestCards(cards: Card[]): Card[] {
        const highestRank = Math.max(...cards.map(card => card.rank.trickTakingRank));
        const highestCards = cards.filter(
            card => card.rank.trickTakingRank === highestRank
        )
        return highestCards;
    }

    static singleHighestCard(cards: Card[]): Card {
        const highestCards = this.highestCards(cards);
        if (highestCards.length > 1) {
            // TODO: error
            console.log(`Too many highest cards: ${highestCards}`);
        }
        if (highestCards.length === 0) {
            // TODO: error
            console.log(`No highest cards: ${highestCards} from ${cards}`);
        }
        return highestCards[0];
    }
}

export const RANKS: Rank[] = [
    ...Array.from({ length: 8 }, (_, i) => {
        const val = i + 2;
        return new Rank(String(val), val, val + 1);
    }),
    new Rank("T", 10, 11),
    new Rank("J", 11, 12),
    new Rank("Q", 12, 13),
    new Rank("K", 13, 14),
    // Default rank above
    new Rank("A", 14, 2),
];

// TODO: named instead?
const suitsData = [
    { name: "Diamonds", html: "&diams;"},
    { name: "Hearts", html: "&hearts;"},
    { name: "Spades", html: "&spades;"},
    { name: "Clubs", html: "&clubs;"},
]

export function rotArr(arr: any[]): any[] {
    // [1, 2, 3] -> [2, 3, 1]
    arr.push(arr.shift());
    return arr;
}

export function getSuits(): Suit[] {
    let suits = suitsData;
    return suits.map(
        (suitData, idx) => new Suit(suitData.name, idx, suitData.html)
    );
}


export const arbitrarySuit = getSuits()[0];
export const N_SUITS = getSuits().length;

export function getSuit(shortName: string): Suit {
    return getSuits().filter(suitData => suitData.name[0] === shortName)[0];
}

export function getRank(shortName: string): Rank {
    return RANKS.filter(rank => rank.toStringShort() === shortName)[0];
}

export function makeRanks(shortNames: string[]): Rank[] {
    return shortNames.map(getRank);
}

export function getFullPack(copies: number = 4): Card[] {
    const cards = [];
    const SUITS = getSuits();
    let index = 0;
    for (const rank of RANKS) {
        if (rank.name === "A") {
            rank.ttRankAbove = 2;
        }
        for (const suit of SUITS) {
            for (let i = 0; i < copies; i++) {
                let card = new Card(suit, rank, index)
                cards.push(card);
                index++;
            }
        }
    }
    return cards;
}

// suit doesn't matter here
export const packSize = getFullPack().length;

export function shuffle(cards: Card[]) {
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
}