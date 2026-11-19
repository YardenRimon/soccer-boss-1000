// 10 Themed Worlds across 1,000 deterministic procedural levels

export const WORLDS = [
  {
    id: 1,
    name: 'אצטדיון הבית',
    emoji: '⚽',
    range: [1, 100],
    turfA: '#1d7a46',
    turfB: '#18693b',
    lineColor: 'rgba(255,255,255,0.45)',
    coneColor: '#f97316',
    bossColor: '#dc2626',
    queenColor: '#9333ea',
    slippery: false,
  },
  {
    id: 2,
    name: 'מגרש שכונתי',
    emoji: '🏙️',
    range: [101, 200],
    turfA: '#334155',
    turfB: '#283548',
    lineColor: 'rgba(250,204,21,0.55)',
    coneColor: '#fb923c',
    bossColor: '#e11d48',
    queenColor: '#c026d3',
    slippery: false,
  },
  {
    id: 3,
    name: 'אצטדיון הקרח',
    emoji: '❄️',
    range: [201, 300],
    turfA: '#0ea5e9',
    turfB: '#0284c7',
    lineColor: 'rgba(255,255,255,0.7)',
    coneColor: '#f43f5e',
    bossColor: '#1e3a8a',
    queenColor: '#6366f1',
    slippery: true,
  },
  {
    id: 4,
    name: 'מדבר הלהט',
    emoji: '🏜️',
    range: [301, 400],
    turfA: '#ca8a04',
    turfB: '#b47803',
    lineColor: 'rgba(255,248,220,0.55)',
    coneColor: '#ea580c',
    bossColor: '#991b1b',
    queenColor: '#7e22ce',
    slippery: false,
  },
  {
    id: 5,
    name: "ג'ונגל האמזונס",
    emoji: '🌴',
    range: [401, 500],
    turfA: '#15803d',
    turfB: '#14532d',
    lineColor: 'rgba(187,247,208,0.5)',
    coneColor: '#facc15',
    bossColor: '#b91c1c',
    queenColor: '#a21caf',
    slippery: false,
  },
  {
    id: 6,
    name: 'הר הגעש',
    emoji: '🌋',
    range: [501, 600],
    turfA: '#451a03',
    turfB: '#361302',
    lineColor: 'rgba(251,146,60,0.6)',
    coneColor: '#ef4444',
    bossColor: '#f97316',
    queenColor: '#ec4899',
    slippery: false,
  },
  {
    id: 7,
    name: 'עיר הניאון',
    emoji: '⚡',
    range: [601, 700],
    turfA: '#1e1b4b',
    turfB: '#17143b',
    lineColor: 'rgba(34,211,238,0.65)',
    coneColor: '#22d3ee',
    bossColor: '#f43f5e',
    queenColor: '#e879f9',
    slippery: false,
  },
  {
    id: 8,
    name: 'חוף טרופי',
    emoji: '🏖️',
    range: [701, 800],
    turfA: '#d97706',
    turfB: '#c26905',
    lineColor: 'rgba(255,255,255,0.6)',
    coneColor: '#06b6d4',
    bossColor: '#be123c',
    queenColor: '#7c3aed',
    slippery: false,
  },
  {
    id: 9,
    name: 'ארמון המלכה',
    emoji: '👑',
    range: [801, 900],
    turfA: '#4c1d95',
    turfB: '#3b0764',
    lineColor: 'rgba(250,204,21,0.65)',
    coneColor: '#facc15',
    bossColor: '#e11d48',
    queenColor: '#f472b6',
    slippery: false,
  },
  {
    id: 10,
    name: 'גלקסיית האלופים',
    emoji: '🌌',
    range: [901, 1000],
    turfA: '#0f172a',
    turfB: '#090e1c',
    lineColor: 'rgba(167,139,250,0.65)',
    coneColor: '#fb7185',
    bossColor: '#facc15',
    queenColor: '#c084fc',
    slippery: false,
  },
];

export function getWorldForLevel(level) {
  const clamped = Math.max(1, Math.min(1000, level));
  const idx = Math.floor((clamped - 1) / 100);
  return WORLDS[idx] || WORLDS[0];
}

// Mulberry32 deterministic PRNG so every level (1..1000) has a consistent layout
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates normalized level parameters (coordinates in 0..1 field space).
 * Field layout (top to bottom):
 *   0.00 - 0.16 : Boss zone (Boss dodges horizontally)
 *   0.22 - 0.42 : Queen Zigzag Zone (Queen slides in zigzag between cones!)
 *   0.46 - 0.78 : Player Zigzag Zone (Player weaves in zigzag between cones facing Queen!)
 *   0.82 - 0.94 : Player spawn area
 */
export function generateLevelConfig(level) {
  const lvl = Math.max(1, Math.min(1000, Math.floor(level)));
  const world = getWorldForLevel(lvl);
  const rand = mulberry32(lvl * 7919 + 1337);

  // Progress curve: quick ramp early, smooth mastery up to 1000
  const p = (lvl - 1) / 999; // 0..1
  const easyRamp = Math.min(1, (lvl - 1) / 40); // 0..1 over first 40 levels

  // Zigzag cones for the Queen's sliding corridor (she weaves between them!)
  const queenConeCount = lvl < 5 ? 3 : lvl < 30 ? 4 : 5;
  const queenCones = [];
  const qStartX = 0.16;
  const qEndX = 0.84;
  for (let i = 0; i < queenConeCount; i++) {
    const t = queenConeCount === 1 ? 0.5 : i / (queenConeCount - 1);
    const x = qStartX + t * (qEndX - qStartX);
    // Alternating high/low creates a crisp zigzag slalom for the Queen!
    const zigOffset = (i % 2 === 0 ? -1 : 1) * 0.042;
    const y = 0.31 + zigOffset;
    queenCones.push({ x, y, zone: 'queen', r: 0.032 });
  }

  // Zigzag cones for the Player's field (facing the Queen)
  const playerConeRows = lvl < 4 ? 3 : lvl < 25 ? 4 : lvl < 150 ? 5 : 6;
  const playerCones = [];
  const startY = 0.48;
  const endY = 0.77;
  const startSide = rand() > 0.5 ? 1 : -1;

  for (let i = 0; i < playerConeRows; i++) {
    const t = playerConeRows === 1 ? 0.5 : i / (playerConeRows - 1);
    const y = startY + t * (endY - startY);
    const side = i % 2 === 0 ? startSide : -startSide;
    // Zigzag alternating left/right with slight deterministic variation
    const spread = 0.18 + rand() * 0.11;
    const x = Math.max(0.16, Math.min(0.84, 0.5 + side * spread));
    playerCones.push({ x, y, zone: 'player', r: 0.034 });

    // On higher levels, add a secondary outer cone to tighten the zigzag slalom
    if (lvl >= 20 && i % 2 === 1 && rand() < 0.35 + p * 0.45) {
      const oppositeX = Math.max(0.14, Math.min(0.86, 0.5 - side * (0.28 + rand() * 0.08)));
      if (Math.abs(oppositeX - x) > 0.24) {
        playerCones.push({ x: oppositeX, y: y + (rand() - 0.5) * 0.02, zone: 'player', r: 0.03 });
      }
    }
  }

  // Moving side defenders on higher levels (level 15+)
  const movingDefenders = [];
  if (lvl >= 15) {
    const count = lvl < 120 ? 1 : lvl < 450 ? 2 : 3;
    for (let i = 0; i < count; i++) {
      const y = 0.54 + (i / Math.max(1, count)) * 0.18;
      movingDefenders.push({
        y,
        x: 0.2 + rand() * 0.6,
        speed: 0.16 + p * 0.24 + i * 0.03,
        dir: rand() > 0.5 ? 1 : -1,
        r: 0.032,
      });
    }
  }

  return {
    level: lvl,
    world,
    bossMaxHp: 10, // Always 10 hits per user requirement!
    bossSpeed: 0.22 + easyRamp * 0.16 + p * 0.32,
    bossDodgeReaction: 0.35 + easyRamp * 0.25 + p * 0.35,
    queenSpeed: 0.26 + easyRamp * 0.18 + p * 0.34,
    queenShotInterval: lvl < 3 ? 0 : Math.max(1.25, 3.6 - easyRamp * 0.9 - p * 1.45),
    queenShotSpeed: 0.30 + p * 0.28,
    queenCones,
    playerCones,
    movingDefenders,
    powerupInterval: Math.max(4.8, 7.5 - p * 1.8),
    isFinale: lvl === 1000,
    isMilestone: lvl % 100 === 0,
  };
}
