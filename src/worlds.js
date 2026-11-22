// 100 Levels across 10 Worlds — EVERY single level has its own unique style, color palette, time of day, and rain/lightning weather!

export const TOTAL_LEVELS = 100;

export const WORLDS = [
  { id: 1, name: 'אצטדיון הבית', emoji: '⚽', range: [1, 10], slippery: false },
  { id: 2, name: 'מגרש שכונתי', emoji: '🏙️', range: [11, 20], slippery: false },
  { id: 3, name: 'אצטדיון הקרח', emoji: '❄️', range: [21, 30], slippery: true },
  { id: 4, name: 'מדבר הלהט', emoji: '🏜️', range: [31, 40], slippery: false },
  { id: 5, name: "ג'ונגל האמזונס", emoji: '🌴', range: [41, 50], slippery: false },
  { id: 6, name: 'הר הגעש', emoji: '🌋', range: [51, 60], slippery: false },
  { id: 7, name: 'עיר הניאון', emoji: '⚡', range: [61, 70], slippery: false },
  { id: 8, name: 'חוף טרופי', emoji: '🏖️', range: [71, 80], slippery: false },
  { id: 9, name: 'ארמון המלכה', emoji: '👑', range: [81, 90], slippery: false },
  { id: 10, name: 'גלקסיית האלופים', emoji: '🌌', range: [91, 100], slippery: false },
];

export const PITCH_PATTERNS = ['stripes', 'checkered', 'circles', 'diagonal', 'vertical'];

export const TIMES_OF_DAY = [
  {
    id: 'night_storm',
    clock: '22:30',
    label: 'ליל סערה',
    emoji: '⛈️🌙',
    isNight: true,
    ambientOverlay: 'rgba(6, 11, 28, 0.46)',
    sunbeams: false,
    shadowScale: 1.35,
  },
  {
    id: 'dawn',
    clock: '06:15',
    label: 'זריחה',
    emoji: '🌅🌧️',
    isNight: false,
    ambientOverlay: 'rgba(244, 114, 182, 0.16)',
    sunbeams: true,
    shadowScale: 1.25,
  },
  {
    id: 'morning',
    clock: '09:30',
    label: 'בוקר',
    emoji: '🌦️☀️',
    isNight: false,
    ambientOverlay: 'rgba(253, 224, 71, 0.08)',
    sunbeams: true,
    shadowScale: 0.9,
  },
  {
    id: 'noon',
    clock: '13:00',
    label: 'צהריים',
    emoji: '☀️⚡',
    isNight: false,
    ambientOverlay: 'rgba(255, 255, 255, 0.05)',
    sunbeams: true,
    shadowScale: 0.7,
  },
  {
    id: 'sunset',
    clock: '18:45',
    label: 'שקיעה',
    emoji: '🌇⛈️',
    isNight: false,
    ambientOverlay: 'rgba(249, 115, 22, 0.22)',
    sunbeams: false,
    shadowScale: 1.4,
  },
  {
    id: 'dusk',
    clock: '20:15',
    label: 'דמדומים',
    emoji: '🌆⚡',
    isNight: true,
    ambientOverlay: 'rgba(49, 46, 129, 0.36)',
    sunbeams: false,
    shadowScale: 1.3,
  },
];

const PATTERN_NAMES_HE = {
  stripes: 'פסי אצטדיון',
  checkered: 'משבצות',
  circles: 'טבעות מרכז',
  diagonal: 'אלכסונים',
  vertical: 'מסלולים',
};

export function getWorldForLevel(level) {
  const clamped = Math.max(1, Math.min(TOTAL_LEVELS, level));
  const idx = Math.floor((clamped - 1) / 10);
  return WORLDS[idx] || WORLDS[0];
}

// Mulberry32 deterministic PRNG
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
 * Generates a unique visual style, color palette, pattern, time of day, and weather for EVERY level (1..100).
 */
function generateLevelVisualStyle(lvl, baseWorld, rand) {
  // Golden-angle hue stepping ensures consecutive levels always look distinctly colored!
  const hue = Math.round((lvl * 137.508 + 110) % 360);
  const coneHue = (hue + 150) % 360;
  const bossHue = (hue + 210) % 360;
  const queenHue = (hue + 285) % 360;

  const timeOfDay = TIMES_OF_DAY[(lvl - 1) % TIMES_OF_DAY.length];
  const pitchPattern = PITCH_PATTERNS[(lvl - 1) % PITCH_PATTERNS.length];

  // Adjust turf lightness for day vs night while keeping rich saturation
  const sat = baseWorld.id === 2 ? 32 : baseWorld.id === 10 ? 55 : 58;
  const lightA = timeOfDay.isNight ? 21 : 32;
  const lightB = timeOfDay.isNight ? 16 : 26;

  const turfA = `hsl(${hue}, ${sat}%, ${lightA}%)`;
  const turfB = `hsl(${(hue + 8) % 360}, ${sat}%, ${lightB}%)`;
  const lineColor = timeOfDay.isNight
    ? `hsla(${(hue + 45) % 360}, 95%, 78%, 0.62)`
    : `hsla(${(hue + 30) % 360}, 90%, 92%, 0.55)`;
  const coneColor = `hsl(${coneHue}, 92%, 56%)`;
  const bossColor = `hsl(${bossHue}, 82%, 50%)`;
  const queenColor = `hsl(${queenHue}, 84%, 56%)`;

  // Rain & lightning settings per level (every level has dynamic rain & lightning!)
  const rainCount = 65 + ((lvl * 19) % 55); // 65..120 raindrops
  const rainWind = ((lvl % 5) - 2) * 0.07; // slanting angle
  const lightningIntervalMin = timeOfDay.isNight ? 2.4 : 3.2;
  const lightningIntervalMax = timeOfDay.isNight ? 4.8 : 6.2;

  return {
    ...baseWorld,
    hue,
    turfA,
    turfB,
    lineColor,
    coneColor,
    bossColor,
    queenColor,
    pitchPattern,
    patternNameHe: PATTERN_NAMES_HE[pitchPattern],
    timeOfDay,
    weather: {
      rainCount,
      rainWind,
      lightningIntervalMin,
      lightningIntervalMax,
    },
  };
}

export function generateLevelConfig(level) {
  const lvl = Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(level)));
  const baseWorld = getWorldForLevel(lvl);
  const rand = mulberry32(lvl * 7919 + 1337);
  const world = generateLevelVisualStyle(lvl, baseWorld, rand);

  // Smooth progression curve across 100 levels
  const p = (lvl - 1) / (TOTAL_LEVELS - 1); // 0..1
  const easyRamp = Math.min(1, (lvl - 1) / 15); // 0..1 over first 15 levels

  // Zigzag cones for the Queen's sliding corridor (she weaves between them!)
  const queenConeCount = lvl < 4 ? 3 : lvl < 20 ? 4 : 5;
  const queenCones = [];
  const qStartX = 0.16;
  const qEndX = 0.84;
  for (let i = 0; i < queenConeCount; i++) {
    const t = queenConeCount === 1 ? 0.5 : i / (queenConeCount - 1);
    const x = qStartX + t * (qEndX - qStartX);
    const zigOffset = (i % 2 === 0 ? -1 : 1) * 0.042;
    const y = 0.31 + zigOffset;
    queenCones.push({ x, y, zone: 'queen', r: 0.032 });
  }

  // Zigzag cones for the Player's field (facing the Queen)
  const playerConeRows = lvl < 4 ? 3 : lvl < 15 ? 4 : lvl < 45 ? 5 : 6;
  const playerCones = [];
  const startY = 0.48;
  const endY = 0.77;
  const startSide = rand() > 0.5 ? 1 : -1;

  for (let i = 0; i < playerConeRows; i++) {
    const t = playerConeRows === 1 ? 0.5 : i / (playerConeRows - 1);
    const y = startY + t * (endY - startY);
    const side = i % 2 === 0 ? startSide : -startSide;
    const spread = 0.18 + rand() * 0.11;
    const x = Math.max(0.16, Math.min(0.84, 0.5 + side * spread));
    playerCones.push({ x, y, zone: 'player', r: 0.034 });

    if (lvl >= 12 && i % 2 === 1 && rand() < 0.35 + p * 0.45) {
      const oppositeX = Math.max(0.14, Math.min(0.86, 0.5 - side * (0.28 + rand() * 0.08)));
      if (Math.abs(oppositeX - x) > 0.24) {
        playerCones.push({ x: oppositeX, y: y + (rand() - 0.5) * 0.02, zone: 'player', r: 0.03 });
      }
    }
  }

  // Moving side defenders on higher levels (level 11+)
  const movingDefenders = [];
  if (lvl >= 11) {
    const count = lvl < 35 ? 1 : lvl < 70 ? 2 : 3;
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
    bossMaxHp: 1, // 1 direct hit on the Boss wins the level!
    bossSpeed: 0.18 + easyRamp * 0.12 + p * 0.26,
    bossDodgeReaction: 0.25 + easyRamp * 0.18 + p * 0.30,
    queenSpeed: 0.20 + easyRamp * 0.14 + p * 0.28,
    queenShotInterval: lvl < 5 ? 0 : Math.max(1.5, 3.8 - easyRamp * 0.85 - p * 1.35),
    queenShotSpeed: 0.26 + p * 0.24,
    queenCones,
    playerCones,
    movingDefenders,
    powerupInterval: Math.max(4.2, 6.8 - p * 1.8),
    isFinale: lvl === TOTAL_LEVELS,
    isMilestone: lvl % 10 === 0,
  };
}
