// Game catalog. In a real deployment this would come from an API / CMS;
// kept as a static module so the launcher runs with zero backend.
//
// `art` uses CSS gradients so the launcher has no binary asset dependencies
// out of the box. Swap to image URLs (e.g. "./assets/img/asteroids.jpg") later.

export const games = [
  {
    id: "asteroid-rally",
    title: "Asteroid Rally",
    tagline: "Party Racing",
    description: "Up to 8 pilots weave through a collapsing asteroid field. Last ship flying wins the lap.",
    minPlayers: 2,
    maxPlayers: 8,
    url: "#/play/asteroid-rally",
    art: "linear-gradient(135deg, #3a1c71, #d76d77, #ffaf7b)",
  },
  {
    id: "quiz-nebula",
    title: "Quiz Nebula",
    tagline: "Trivia",
    description: "Phones become buzzers. Race to answer across the galaxy of categories.",
    minPlayers: 1,
    maxPlayers: 12,
    url: "#/play/quiz-nebula",
    art: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
  },
  {
    id: "drift-arena",
    title: "Drift Arena",
    tagline: "Sumo Battle",
    description: "Tilt your phone to shove rivals off the platform. Physics chaos for 2–6.",
    minPlayers: 2,
    maxPlayers: 6,
    url: "#/play/drift-arena",
    art: "linear-gradient(135deg, #16222a, #3a6073)",
  },
  {
    id: "word-warp",
    title: "Word Warp",
    tagline: "Words",
    description: "Spell light-speed words before the wormhole closes. Co-op or versus.",
    minPlayers: 1,
    maxPlayers: 8,
    url: "#/play/word-warp",
    art: "linear-gradient(135deg, #42275a, #734b6d)",
  },
  {
    id: "pixel-heist",
    title: "Pixel Heist",
    tagline: "Co-op Stealth",
    description: "Coordinate over phones to crack the vault. One alarm and it's over.",
    minPlayers: 2,
    maxPlayers: 4,
    url: "#/play/pixel-heist",
    art: "linear-gradient(135deg, #000428, #004e92)",
  },
  {
    id: "groove-galaxy",
    title: "Groove Galaxy",
    tagline: "Rhythm",
    description: "Tap the beat on your phone, light up the TV. The whole room's a dancefloor.",
    minPlayers: 1,
    maxPlayers: 10,
    url: "#/play/groove-galaxy",
    art: "linear-gradient(135deg, #ff0099, #493240)",
  },
];
