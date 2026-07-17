// Game catalog for the Space Console launcher.
//
// Stands in for an API / CMS — a static module so the launcher runs with zero
// backend. Each entry mirrors a real, playable game in the `games` repo, which
// deploys to a sibling GitHub Pages path:
//
//   launcher : https://space-console.github.io/game-launcher-web/
//   games    : https://space-console.github.io/games/<id>/
//
// `GAMES_BASE` is therefore a sibling-relative path: from the launcher's Pages
// root, `../games/<id>/` resolves to the deployed game. (For local cross-repo
// testing, serve the workspace root so the sibling path resolves; `npm run dev`
// inside a single repo won't reach across to ../games/.)
//
// `art` uses CSS gradients so the launcher has no binary asset dependencies.
// The list mirrors the games hub (`games/index.html`) — its single source of
// truth for title, art, and category.

const GAMES_BASE = "../games/";

// Category order for the launcher rows — Tetris's row ("Puzzle") stays first so
// the default focus/hero is unchanged. Each game names its `category`; app.js
// groups the catalog into one horizontal rail per category, in this order.
export const CATEGORY_ORDER = ["Puzzle", "Arcade", "Board & Strategy", "Cards", "Casino", "Party"];

// `icon` is a single emoji preview glyph shown large on the card art (and hero),
// so a player recognizes the game at a glance without any binary image assets.
const catalog = [
  { id: "tetris", title: "Tetris", tagline: "Puzzle", category: "Puzzle", icon: "🟦", description: "Stack falling tetrominoes, clear lines, and chase the high score.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #4f8cff, #b14bff)" },
  { id: "snake", title: "Snake", tagline: "Arcade", category: "Arcade", icon: "🐍", description: "Eat, grow, and don't bite your tail. The classic, faster every bite.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #16a34a, #38e8a0)" },
  { id: "sudoku", title: "Sudoku", tagline: "Puzzle", category: "Puzzle", icon: "🔢", description: "Fill the grid so every row, column, and box holds 1 through 9.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #0f2027, #2c5364)" },
  { id: "tic-tac-toe", title: "Tic-Tac-Toe", tagline: "X & O", category: "Board & Strategy", icon: "⭕", description: "Three in a row wins. Quick duels for two.", minPlayers: 2, maxPlayers: 2, art: "linear-gradient(135deg, #f59e0b, #ef4444)" },
  { id: "chess", title: "Chess", tagline: "Strategy", category: "Board & Strategy", icon: "♟️", description: "Classic chess against a friend or the AI.", minPlayers: 1, maxPlayers: 2, art: "linear-gradient(135deg, #1f1c2c, #928dab)" },
  { id: "poker", title: "Texas Hold'em", tagline: "Poker", category: "Casino", icon: "🃏", description: "Texas Hold'em against the house. Read the table and bet smart.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #134e2a, #2e8b57)" },
  { id: "video-poker", title: "Video Poker", tagline: "Casino", category: "Casino", icon: "🎴", description: "Jacks or better. Hold your cards and chase the royal flush.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #d31027, #ea384d)" },
  { id: "uno", title: "Uno", tagline: "Cards", category: "Cards", icon: "🔴", description: "Match colors and numbers, and dump your hand first.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #f12711, #f5af19)" },
  { id: "bridge", title: "Bridge", tagline: "Cards", category: "Cards", icon: "🌉", description: "Contract bridge — bid and take tricks with a partner.", minPlayers: 4, maxPlayers: 4, art: "linear-gradient(135deg, #1a2980, #26d0ce)" },
  { id: "blackjack", title: "Blackjack", tagline: "Casino", category: "Casino", icon: "♠️", description: "Hit, stand, and beat the dealer to twenty-one.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #0a3d1f, #0f2027)" },
  { id: "solitaire", title: "Solitaire", tagline: "Klondike", category: "Cards", icon: "♦️", description: "Klondike solitaire. Build the foundations and clear the board.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #355c7d, #c06c84)" },
  { id: "checkers", title: "Checkers", tagline: "Strategy", category: "Board & Strategy", icon: "⚫", description: "Jump, capture, and crown your kings.", minPlayers: 1, maxPlayers: 2, art: "linear-gradient(135deg, #b21f1f, #1a1a1a)" },
  { id: "yahtzee", title: "Yahtzee", tagline: "Dice", category: "Board & Strategy", icon: "🎲", description: "Roll for full houses, straights, and the elusive Yahtzee.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #fc4a1a, #f7b733)" },
  { id: "minesweeper", title: "Minesweeper", tagline: "Puzzle", category: "Puzzle", icon: "💣", description: "Clear the field without tripping a mine.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #283048, #859398)" },
  { id: "slots", title: "Slots", tagline: "Casino", category: "Casino", icon: "🎰", description: "Spin the reels and chase the jackpot.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #7F00FF, #E100FF)" },
  { id: "pinball", title: "Pinball", tagline: "Arcade", category: "Arcade", icon: "🎯", description: "Flip, bump, and rack up the multipliers.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #0b486b, #f56217)" },
  { id: "block-blast", title: "Block Blast", tagline: "Puzzle", category: "Puzzle", icon: "🧱", description: "Drop blocks, clear lines, and keep the board breathing.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #fc466b, #3f5efb)" },
  { id: "scrabble", title: "Scrabble", tagline: "Words", category: "Board & Strategy", icon: "🔤", description: "Build words on the board for the highest score.", minPlayers: 1, maxPlayers: 2, art: "linear-gradient(135deg, #603813, #b29f94)" },
  { id: "fruit-ninja", title: "Fruit Ninja", tagline: "Action", category: "Arcade", icon: "🍉", description: "Slice the fruit and dodge the bombs.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #ff5f6d, #ffc371)" },
  { id: "flappy-bird", title: "Flappy Bird", tagline: "Arcade", category: "Arcade", icon: "🐤", description: "Tap to flap through the pipes. One wrong move ends it.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #56ccf2, #2f80ed)" },
  { id: "bubble-trouble", title: "Bubble Trouble", tagline: "Arcade", category: "Arcade", icon: "🫧", description: "Pop the bouncing bubbles before they catch you.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #2a6fb0, #ff5a5a)" },
  { id: "icy-tower", title: "Icy Tower", tagline: "Arcade", category: "Arcade", icon: "🧊", description: "Bounce up the tower without falling behind.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #bfeaff, #244a8c)" },
  { id: "space-tower", title: "Space Tower", tagline: "Arcade", category: "Arcade", icon: "🚀", description: "Stack the tower as high as nerve allows.", minPlayers: 1, maxPlayers: 2, art: "linear-gradient(135deg, #7b5bff, #1a1040)" },
  { id: "imposter", title: "Imposter", tagline: "Social Deduction", category: "Party", icon: "🕵️", description: "Find the imposter before the crew runs out of time.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #ff5a5a, #11162b)" },
  { id: "star-hopper", title: "Star Hopper", tagline: "Platformer", category: "Arcade", icon: "⭐", description: "Hop from star to star and climb the galaxy.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #56e0c8, #4caf50)" },
  { id: "candy-crush", title: "Candy Crush", tagline: "Match-3", category: "Puzzle", icon: "🍬", description: "Swap candies, trigger cascades, and hit the target.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #f857a6, #ff5858)" },
  { id: "tic-tac-boom", title: "Tic-Tac-Boom", tagline: "Party", category: "Party", icon: "💥", description: "Fast word bombs — don't be holding it when it blows.", minPlayers: 2, maxPlayers: 4, art: "linear-gradient(135deg, #ff512f, #dd2476)" },
  { id: "ludo", title: "Ludo", tagline: "Board", category: "Board & Strategy", icon: "🏁", description: "Race your tokens home before the AI beats you to it.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #fa709a, #fee140)" },
  { id: "dominoes", title: "Dominoes", tagline: "Tiles", category: "Board & Strategy", icon: "🀄", description: "Match the pips and empty your hand first.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #232526, #5b6e8c)" },
  { id: "freecell", title: "FreeCell", tagline: "Solitaire", category: "Cards", icon: "♥️", description: "FreeCell solitaire — every deal is winnable, if you plan.", minPlayers: 1, maxPlayers: 1, art: "linear-gradient(135deg, #134e5e, #71b280)" },
];

export const games = catalog.map((game) => ({
  ...game,
  url: `${GAMES_BASE}${game.id}/`,
  // Real captured screenshot of the game (assets/thumbs/<id>.jpg). Used as the
  // card art; `art` (a gradient) remains the fallback if the image is missing.
  thumb: `./assets/thumbs/${game.id}.jpg`,
}));
