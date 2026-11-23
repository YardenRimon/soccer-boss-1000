// 1,000 Levels across 10 Worlds (100 levels per world) + Difficulty presets + Upgrade Shop definitions

export const TOTAL_LEVELS = 1000;

export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    label: 'קל',
    emoji: '🟢',
    bossHits: 1,
    speedMult: 0.78,
    coneHitboxMult: 0.65,
    coinMult: 1,
    desc: 'פגיעה 1 בבוס • מלכה ובוס רגועים • ×1 מטבעות',
  },
  normal: {
    id: 'normal',
    label: 'רגיל',
    emoji: '🟡',
    bossHits: 2,
    speedMult: 1.0,
    coneHitboxMult: 0.72,
    coinMult: 1.5,
    desc: '2 פגיעות בבוס • קצב מאוזן • ×1.5 מטבעות',
  },
  hard: {
    id: 'hard',
    label: 'קשה',
    emoji: '🔴',
    bossHits: 3,
    speedMult: 1.25,
    coneHitboxMult: 0.78,
    coinMult: 2.5,
    desc: '3 פגיעות בבוס • מלכה מהירה ואגרסיבית • ×2.5 מטבעות',
  },
};

export const SHOP_UPGRADES = [
  {
    id: 'speed',
    name: 'נעלי ספרינט',
    emoji: '👟',
    maxLevel: 5,
    costs: [25, 55, 95, 145, 210],
    desc: 'מגדיל את מהירות הכדרור וההחלקה בין הקונוסים (+12% לכל רמה)',
  },
  {
    id: 'shot',
    name: 'בעיטת תותח',
    emoji: '⚽',
    maxLevel: 5,
    costs: [30, 65, 110, 165, 240],
    desc: 'כדור מהיר יותר שהבוס מתקשה להתחמק ממנו + טעינת כדור מהירה',
  },
  {
    id: 'shield',
    name: 'מגן קונוסים',
    emoji: '🛡️',
    maxLevel: 5,
    costs: [40, 85, 140, 210, 300],
    desc: 'מציל אותך מפסילה כשנתקעים בקונוס או במכשול! (+1 מגן בכל שלב)',
  },
  {
    id: 'magnet',
    name: 'מגנט מטבעות',
    emoji: '🧲',
    maxLevel: 5,
    costs: [25, 50, 90, 140, 200],
    desc: 'שואב מטבעות וכוחות מיוחדים מרחוק ומגדיל רווח מטבעות (+20% לרמה)',
  },
  {
    id: 'startFire',
    name: 'רובה כדורי אש',
    emoji: '🔥',
    maxLevel: 5,
    costs: [45, 90, 150, 220, 310],
    desc: 'פותח כל שלב עם יותר תחמושת לרובה האש (כדורים שעוברים דרך המלכה + 2x נזק!)',
  },
  {
    id: 'ghostGun',
    name: 'רובה רפאים',
    emoji: '👻',
    maxLevel: 5,
    costs: [40, 80, 135, 200, 280],
    desc: 'מגדיל תחמושת ומזרז טעינה של רובה הרפאים שעובר דרך המלכה והקונוסים!',
  },
  {
    id: 'confuse',
    name: 'משגר בלבול',
    emoji: '🌀',
    maxLevel: 5,
    costs: [35, 75, 125, 185, 260],
    desc: 'מאריך את בלבול המלכה והמלך, מוסיף כפילי הטעיה ומקצר טעינה!',
  },
  {
    id: 'goldenArmor',
    name: 'שריון זהב',
    emoji: '✨',
    maxLevel: 5,
    minLevel: 100,
    costs: [60, 120, 195, 290, 420],
    desc: 'נפתח משלב 100 ומעלה! שריון זהב נצחי להארי, רון והרמיוני שלא נעלם + בונוס מטבעות!',
  },
  {
    id: 'dragonMaster',
    name: 'מאלף דרקונים',
    emoji: '🐉',
    maxLevel: 5,
    costs: [70, 140, 220, 320, 450],
    desc: 'מקצר את זמן הטעינה של הדרקונים ומאיץ את מעופם לאכול את המלכה והמלך!',
  },
  {
    id: 'spearMaster',
    name: 'חנית קסם',
    emoji: '🔱',
    maxLevel: 5,
    costs: [45, 95, 155, 230, 320],
    desc: 'מקצר את טעינת החניתות של הארי ומאיץ את רון והרמיוני!',
  },
];

export const WORLDS = [
  { id: 1, name: 'אצטדיון הבית', emoji: '⚽', range: [1, 100], slippery: false },
  { id: 2, name: 'מגרש שכונתי', emoji: '🏙️', range: [101, 200], slippery: false },
  { id: 3, name: 'אצטדיון הקרח', emoji: '❄️', range: [201, 300], slippery: true },
  { id: 4, name: 'מדבר הלהט', emoji: '🏜️', range: [301, 400], slippery: false },
  { id: 5, name: "ג'ונגל האמזונס", emoji: '🌴', range: [401, 500], slippery: false },
  { id: 6, name: 'הר הגעש', emoji: '🌋', range: [501, 600], slippery: false },
  { id: 7, name: 'עיר הניאון', emoji: '⚡', range: [601, 700], slippery: false },
  { id: 8, name: 'חוף טרופי', emoji: '🏖️', range: [701, 800], slippery: false },
  { id: 9, name: 'ארמון המלכה', emoji: '👑', range: [801, 900], slippery: false },
  { id: 10, name: 'גלקסיית האלופים', emoji: '🌌', range: [901, 1000], slippery: false },
];

export const PITCH_PATTERNS = ['stripes', 'checkered', 'circles', 'diagonal', 'vertical'];

export const TIMES_OF_DAY = [
  {
    id: 'early_morning',
    clock: '06:30',
    label: 'בוקר מוקדם',
    emoji: '🌅🌧️',
    isNight: false,
    ambientOverlay: 'rgba(253, 186, 116, 0.12)',
    sunbeams: true,
    shadowScale: 1.2,
  },
  {
    id: 'morning_rain',
    clock: '08:15',
    label: 'בוקר גשום',
    emoji: '🌦️☀️',
    isNight: false,
    ambientOverlay: 'rgba(186, 230, 253, 0.10)',
    sunbeams: true,
    shadowScale: 1.0,
  },
  {
    id: 'bright_morning',
    clock: '09:45',
    label: 'בוקר בהיר',
    emoji: '☀️🌧️',
    isNight: false,
    ambientOverlay: 'rgba(254, 240, 138, 0.08)',
    sunbeams: true,
    shadowScale: 0.9,
  },
  {
    id: 'late_morning',
    clock: '11:20',
    label: 'בוקר מאוחר',
    emoji: '⛅⚡',
    isNight: false,
    ambientOverlay: 'rgba(224, 242, 254, 0.08)',
    sunbeams: true,
    shadowScale: 0.78,
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
  const idx = Math.floor((clamped - 1) / 100);
  return WORLDS[idx] || WORLDS[0];
}

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

function generateLevelVisualStyle(lvl, baseWorld) {
  const hue = Math.round((lvl * 137.508 + 110) % 360);
  const coneHue = (hue + 150) % 360;
  const bossHue = (hue + 210) % 360;
  const queenHue = (hue + 285) % 360;

  const timeOfDay = TIMES_OF_DAY[(lvl - 1) % TIMES_OF_DAY.length];
  const pitchPattern = PITCH_PATTERNS[(lvl - 1) % PITCH_PATTERNS.length];

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

  const rainCount = 65 + ((lvl * 19) % 55);
  const lightningIntervalMin = 2.8;
  const lightningIntervalMax = 5.4;

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
      lightningIntervalMin,
      lightningIntervalMax,
    },
  };
}

export function generateLevelConfig(level, difficultyId = 'easy') {
  const lvl = Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(level)));
  const diff = DIFFICULTIES[difficultyId] || DIFFICULTIES.easy;
  const baseWorld = getWorldForLevel(lvl);
  const rand = mulberry32(lvl * 7919 + 1337);
  const world = generateLevelVisualStyle(lvl, baseWorld);

  const p = (lvl - 1) / (TOTAL_LEVELS - 1);
  const easyRamp = Math.min(1, (lvl - 1) / 40);

  // Zigzag cones for the Queen's sliding corridor
  const queenConeCount = lvl < 8 ? 3 : lvl < 40 ? 4 : 5;
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

  // Zigzag cones for the Player's field
  const playerConeRows = lvl < 6 ? 3 : lvl < 30 ? 4 : lvl < 160 ? 5 : 6;
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

    if (lvl >= 25 && i % 2 === 1 && rand() < 0.35 + p * 0.45) {
      const oppositeX = Math.max(0.14, Math.min(0.86, 0.5 - side * (0.28 + rand() * 0.08)));
      if (Math.abs(oppositeX - x) > 0.24) {
        playerCones.push({ x: oppositeX, y: y + (rand() - 0.5) * 0.02, zone: 'player', r: 0.03 });
      }
    }
  }

  // Initial coins placed along the zigzag path so player can collect them while dribbling!
  const initialCoins = [];
  const coinCount = 3 + (lvl % 3);
  for (let i = 0; i < coinCount; i++) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const cx = 0.16 + rand() * 0.68;
      const cy = 0.46 + rand() * 0.36;
      const tooClose = playerCones.some((c) => Math.hypot(cx - c.x, (cy - c.y) * 1.6) < 0.085);
      if (!tooClose) {
        initialCoins.push({ x: cx, y: cy, r: 0.025, bob: rand() * Math.PI * 2 });
        break;
      }
    }
  }

  // Moving side defenders on higher levels
  const movingDefenders = [];
  const minDefenderLvl = diff.id === 'easy' ? 20 : diff.id === 'normal' ? 12 : 6;
  if (lvl >= minDefenderLvl) {
    const count = lvl < 140 ? 1 : lvl < 450 ? 2 : 3;
    for (let i = 0; i < count; i++) {
      const y = 0.54 + (i / Math.max(1, count)) * 0.18;
      movingDefenders.push({
        y,
        x: 0.2 + rand() * 0.6,
        speed: (0.15 + p * 0.22 + i * 0.03) * diff.speedMult,
        dir: rand() > 0.5 ? 1 : -1,
        r: 0.032,
      });
    }
  }

  // Pits for the King (Boss) in the top Boss zone!
  const kingPits = [];
  const pitCount = lvl < 20 ? 2 : 3;
  for (let i = 0; i < pitCount; i++) {
    const px = pitCount === 2 ? (i === 0 ? 0.28 : 0.72) : 0.22 + i * 0.28;
    kingPits.push({
      x: Math.max(0.16, Math.min(0.84, px + (rand() - 0.5) * 0.06)),
      y: 0.115,
      r: 0.038,
      cooldown: 0,
    });
  }

  // Fire Fences (גדרות אש) — exactly 2 impassable Fire Fences in the path!
  const fireFences = [];
  const fenceCount = 2;
  for (let i = 0; i < fenceCount; i++) {
    const fy = 0.51 + i * 0.16;
    const onLeft = (i + lvl) % 2 === 0;
    const width = 0.22 + Math.min(0.12, p * 0.12);
    const x1 = onLeft ? 0.08 : 0.92 - width;
    const x2 = x1 + width;
    fireFences.push({ x1, x2, y: fy, thickness: 0.017 });
  }

  // Guardian-of-Guards (שומרי שומרים) — friendly guards that NEVER hurt Harry!
  const guardianGuards = [];
  for (let i = 0; i < 2; i++) {
    guardianGuards.push({
      x: i === 0 ? 0.25 : 0.75,
      y: 0.56 + i * 0.12,
      vx: (i === 0 ? 1 : -1) * 0.16,
      r: 0.028,
    });
  }

  const minQueenShotLvl = diff.id === 'easy' ? 4 : diff.id === 'normal' ? 2 : 1;

  return {
    level: lvl,
    difficulty: diff,
    world,
    bossMaxHp: diff.bossHits,
    bossSpeed: (0.24 + easyRamp * 0.15 + p * 0.28) * diff.speedMult,
    bossDodgeReaction: (0.34 + easyRamp * 0.22 + p * 0.30) * diff.speedMult,
    queenSpeed: (0.26 + easyRamp * 0.16 + p * 0.28) * diff.speedMult,
    queenShotInterval:
      lvl < minQueenShotLvl ? 0 : Math.max(1.05, (3.2 - easyRamp * 0.85 - p * 1.25) / diff.speedMult),
    queenShotSpeed: (0.30 + p * 0.24) * diff.speedMult,
    coneHitboxMult: diff.coneHitboxMult,
    queenCones,
    playerCones,
    fireFences,
    guardianGuards,
    kingPits,
    initialCoins,
    movingDefenders,
    powerupInterval: Math.max(4.2, 6.8 - p * 1.8),
    isFinale: lvl === TOTAL_LEVELS,
    isMilestone: lvl % 100 === 0,
  };
}
