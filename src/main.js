import { sound } from './audio.js';
import { SoccerBossGame } from './game.js';
import { DIFFICULTIES, SHOP_UPGRADES, TOTAL_LEVELS, WORLDS } from './worlds.js';

const STORAGE_KEY = 'soccer_boss_1000_save_permanent';
const ALL_KEYS = [
  STORAGE_KEY,
  'soccer_boss_100_save_v3',
  'soccer_boss_100_save_v2',
  'soccer_boss_100_save_v1',
  'soccer_boss_1000_save_v1',
];

function loadProgress() {
  const defaults = {
    currentLevel: 1,
    maxUnlocked: 1,
    coins: 0,
    difficulty: 'easy',
    giantScale: 1.0,
    upgrades: {
      speed: 0,
      shot: 0,
      shield: 0,
      magnet: 0,
      startFire: 0,
      ghostGun: 0,
      confuse: 0,
      goldenArmor: 0,
      dragonMaster: 0,
      spearMaster: 0,
      lightningAura: 0,
      veggieLuck: 0,
    },
    unlockAll: false,
    muted: false,
    bestTimes: {},
  };

  try {
    // Merge across all saved keys taking the HIGHEST progress so nothing ever reverts!
    let bestMaxUnlocked = 1;
    let bestCurrentLevel = 1;
    let bestCoins = 0;
    let bestGiantScale = 1.0;
    let latest = null;
    const mergedUpgrades = { ...defaults.upgrades };
    const mergedBestTimes = {};

    for (const k of ALL_KEYS) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const p = JSON.parse(raw);
      if (!p || typeof p !== 'object') continue;
      if (!latest) latest = p;

      const mu = Math.max(1, Math.min(TOTAL_LEVELS, Number(p.maxUnlocked) || 1));
      const cl = Math.max(1, Math.min(TOTAL_LEVELS, Number(p.currentLevel) || mu));
      bestMaxUnlocked = Math.max(bestMaxUnlocked, mu, cl);
      bestCurrentLevel = Math.max(bestCurrentLevel, cl);
      bestCoins = Math.max(bestCoins, Math.floor(Number(p.coins) || 0));
      bestGiantScale = Math.max(bestGiantScale, Math.min(1.65, Number(p.giantScale) || 1.0));

      if (p.upgrades && typeof p.upgrades === 'object') {
        for (const upKey of Object.keys(mergedUpgrades)) {
          mergedUpgrades[upKey] = Math.max(mergedUpgrades[upKey], Math.min(5, Number(p.upgrades[upKey]) || 0));
        }
      }
      if (p.bestTimes && typeof p.bestTimes === 'object') {
        for (const [lvlKey, tVal] of Object.entries(p.bestTimes)) {
          if (!mergedBestTimes[lvlKey] || tVal < mergedBestTimes[lvlKey]) {
            mergedBestTimes[lvlKey] = tVal;
          }
        }
      }
    }

    if (!latest) return defaults;

    const currentWorldStart = Math.floor((bestMaxUnlocked - 1) / 100) * 100 + 1;
    const currentLevel = Math.max(currentWorldStart, bestCurrentLevel);

    return {
      currentLevel,
      maxUnlocked: Math.max(bestMaxUnlocked, currentLevel),
      coins: bestCoins,
      difficulty: DIFFICULTIES[latest.difficulty] ? latest.difficulty : 'easy',
      giantScale: bestGiantScale,
      upgrades: mergedUpgrades,
      unlockAll: Boolean(latest.unlockAll),
      muted: Boolean(latest.muted),
      bestTimes: mergedBestTimes,
    };
  } catch {
    return defaults;
  }
}

function saveProgress(data, allowExplicitReset = false) {
  try {
    // Monotonic forward-only guard: never allow saving a lower maxUnlocked or currentLevel unless explicitly reset!
    if (!allowExplicitReset) {
      const existingRaw = localStorage.getItem(STORAGE_KEY);
      if (existingRaw) {
        const prev = JSON.parse(existingRaw);
        const prevMax = Math.max(1, Math.min(TOTAL_LEVELS, Number(prev?.maxUnlocked) || 1));
        const prevCur = Math.max(1, Math.min(TOTAL_LEVELS, Number(prev?.currentLevel) || 1));
        data.maxUnlocked = Math.max(data.maxUnlocked, prevMax);
        data.currentLevel = Math.max(data.currentLevel, prevCur);
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

const progress = loadProgress();
saveProgress(progress);
sound.setMuted(progress.muted);

// DOM references
const hudEl = document.querySelector('.hud');
const canvas = document.getElementById('game-canvas');
const hudLevel = document.getElementById('hud-level');
const hudDiff = document.getElementById('hud-diff');
const hudWorld = document.getElementById('hud-world');
const hudTime = document.getElementById('hud-time');
const hudCoins = document.getElementById('hud-coins');
const bossTitleText = document.getElementById('boss-title-text');
const bossHpText = document.getElementById('boss-hp-text');
const bossHpFill = document.getElementById('boss-hp-fill');
const powerupBar = document.getElementById('powerup-bar');
const toastEl = document.getElementById('toast');
const touchHint = document.getElementById('touch-hint');
const savedStatusBanner = document.getElementById('saved-status-banner');

const btnLevels = document.getElementById('btn-levels');
const btnDiffHud = document.getElementById('btn-diff-hud');
const btnShopHud = document.getElementById('btn-shop-hud');
const btnRestart = document.getElementById('btn-restart');
const btnSound = document.getElementById('btn-sound');
const btnShoot = document.getElementById('btn-shoot');
const btnGunGhost = document.getElementById('btn-gun-ghost');
const btnGunFire = document.getElementById('btn-gun-fire');
const btnConfuse = document.getElementById('btn-confuse');
const btnSpear = document.getElementById('btn-spear');
const btnDragon = document.getElementById('btn-dragon');
const badgeGhost = document.getElementById('badge-ghost');
const badgeFire = document.getElementById('badge-fire');
const badgeConfuse = document.getElementById('badge-confuse');
const badgeSpear = document.getElementById('badge-spear');
const badgeDragon = document.getElementById('badge-dragon');

const modalStart = document.getElementById('modal-start');
const btnPlay = document.getElementById('btn-play');
const btnOpenShopStart = document.getElementById('btn-open-shop-start');
const startCoinsCount = document.getElementById('start-coins-count');
const startDiffButtons = document.getElementById('start-diff-buttons');
const startDiffDesc = document.getElementById('start-diff-desc');

const modalWin = document.getElementById('modal-win');
const winIcon = document.getElementById('win-icon');
const winTitle = document.getElementById('win-title');
const winDesc = document.getElementById('win-desc');
const winLevel = document.getElementById('win-level');
const winTime = document.getElementById('win-time');
const winCoins = document.getElementById('win-coins');
const winTotalCoins = document.getElementById('win-total-coins');
const btnNextLevel = document.getElementById('btn-next-level');
const btnOpenShopWin = document.getElementById('btn-open-shop-win');

const modalShop = document.getElementById('modal-shop');
const shopCoinsBalance = document.getElementById('shop-coins-balance');
const shopItemsList = document.getElementById('shop-items-list');
const btnCloseShop = document.getElementById('btn-close-shop');

const modalLevels = document.getElementById('modal-levels');
const btnCloseLevels = document.getElementById('btn-close-levels');
const inputLevelJump = document.getElementById('input-level-jump');
const btnJumpGo = document.getElementById('btn-jump-go');
const chkUnlockAll = document.getElementById('chk-unlock-all');
const worldsList = document.getElementById('worlds-list');

btnSound.textContent = progress.muted ? '🔇' : '🔊';
chkUnlockAll.checked = progress.unlockAll;

function syncCoinsUi() {
  hudCoins.textContent = String(progress.coins);
  if (startCoinsCount) startCoinsCount.textContent = String(progress.coins);
  if (winTotalCoins) winTotalCoins.textContent = String(progress.coins);
  if (shopCoinsBalance) shopCoinsBalance.textContent = String(progress.coins);
}

function syncDifficultyUi() {
  const diff = DIFFICULTIES[progress.difficulty] || DIFFICULTIES.easy;
  if (hudDiff) hudDiff.textContent = `${diff.emoji} ${diff.label}`;
  if (startDiffDesc) startDiffDesc.textContent = diff.desc;
  if (startDiffButtons) {
    startDiffButtons.querySelectorAll('.diff-choice-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.diff === diff.id);
    });
  }
}

function updateStartModalSavedText() {
  syncCoinsUi();
  syncDifficultyUi();
  if (progress.currentLevel > 1 || progress.maxUnlocked > 1 || progress.coins > 0) {
    btnPlay.textContent = `המשך משלב ${progress.currentLevel} ⚽`;
    if (savedStatusBanner) {
      savedStatusBanner.textContent = `💾 שמור בדפדפן: שלב ${progress.currentLevel} (שיא: ${progress.maxUnlocked}) • ${progress.coins} 🪙`;
    }
  } else {
    btnPlay.textContent = 'יאללה לשחק! (שלב 1) ⚽';
    if (savedStatusBanner) {
      savedStatusBanner.textContent = '💾 ההתקדמות, המטבעות והשריון נשמרים אוטומטית בדפדפן';
    }
  }
}

updateStartModalSavedText();

let toastTimeout = null;
function showToast(msg, isGood = false) {
  toastEl.textContent = msg;
  toastEl.classList.toggle('good', isGood);
  toastEl.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 1550);
}

let pendingNextLevel = progress.currentLevel;

const game = new SoccerBossGame(canvas, {
  onHudUpdate: ({
    level,
    worldName,
    timeLabel,
    hue,
    bossHp,
    bossMaxHp,
    fireShots,
    ghostShots,
    confuseCooldown,
    dragonCooldown,
    spearCooldown,
    shieldsLeft,
    goldenArmorLeft,
    giantScale,
    freezeTime,
    queenConfuseTime,
    bossConfuseTime,
    turboTime,
    difficulty,
  }) => {
    hudLevel.textContent = String(level);
    hudWorld.textContent = worldName;
    if (hudTime && timeLabel) hudTime.textContent = timeLabel;
    if (difficulty && hudDiff) hudDiff.textContent = `${difficulty.emoji} ${difficulty.label}`;
    if (hudEl && typeof hue === 'number') {
      hudEl.style.background = `linear-gradient(180deg, hsla(${hue}, 48%, 12%, 0.96) 0%, hsla(${hue}, 42%, 16%, 0.90) 100%)`;
    }
    if (bossTitleText) {
      bossTitleText.textContent =
        bossMaxHp === 1 ? '👹 המלך (פגיעה 1 לניצחון!)' : `👹 המלך (${bossMaxHp} פגיעות לניצחון)`;
    }
    bossHpText.textContent = `${bossHp} / ${bossMaxHp} ❤️`;
    bossHpFill.style.width = `${(bossHp / bossMaxHp) * 100}%`;

    // Update Gun & Confuse Action Buttons
    if (badgeGhost && btnGunGhost) {
      badgeGhost.textContent = String(ghostShots);
      btnGunGhost.classList.toggle('empty', ghostShots <= 0);
    }
    if (badgeFire && btnGunFire) {
      badgeFire.textContent = String(fireShots);
      btnGunFire.classList.toggle('empty', fireShots <= 0);
    }
    if (badgeConfuse && btnConfuse) {
      const ready = confuseCooldown <= 0;
      badgeConfuse.textContent = ready ? 'מוכן' : `${Math.ceil(confuseCooldown)}ש׳`;
      btnConfuse.classList.toggle('empty', !ready);
    }
    if (badgeSpear && btnSpear) {
      const ready = spearCooldown <= 0;
      badgeSpear.textContent = ready ? 'מוכן' : `${Math.ceil(spearCooldown)}ש׳`;
      btnSpear.classList.toggle('empty', !ready);
    }
    if (badgeDragon && btnDragon) {
      const ready = dragonCooldown <= 0;
      badgeDragon.textContent = ready ? 'מוכן' : `${Math.ceil(dragonCooldown)}ש׳`;
      btnDragon.classList.toggle('empty', !ready);
    }

    const chips = [];
    if (goldenArmorLeft > 0) chips.push('<span class="powerup-chip gold-chip">✨ שריון זהב נצחי</span>');
    if (shieldsLeft > 0) chips.push(`<span class="powerup-chip shield-chip">🛡️ מגן ×${shieldsLeft}</span>`);
    if (giantScale > 1.01) chips.push(`<span class="powerup-chip giant-chip">💪 גודל ×${giantScale.toFixed(2)}</span>`);
    if (queenConfuseTime > 0 || bossConfuseTime > 0) {
      chips.push(`<span class="powerup-chip">😵‍💫 בלבול ${Math.max(queenConfuseTime, bossConfuseTime).toFixed(1)}ש׳</span>`);
    }
    if (freezeTime > 0) chips.push(`<span class="powerup-chip">❄️ מלכה קפואה ${freezeTime.toFixed(1)}ש׳</span>`);
    if (turboTime > 0) chips.push(`<span class="powerup-chip">⚡ טורבו ${turboTime.toFixed(1)}ש׳</span>`);
    powerupBar.innerHTML = chips.join('');
  },
  onCoinsEarned: (amount) => {
    progress.coins += amount;
    saveProgress(progress);
    syncCoinsUi();
  },
  onGiantScaleChange: (scale) => {
    progress.giantScale = scale;
    saveProgress(progress);
  },
  onToast: (msg, isGood) => showToast(msg, isGood),
  onFirstInput: () => {
    touchHint.classList.add('hidden');
  },
  onWin: ({ level, time, coinsEarned, giantScale, skipWorlds, isFinale }) => {
    const worldAdvance = skipWorlds > 0 ? skipWorlds : 0;
    const nextWorldStart = Math.min(TOTAL_LEVELS, Math.floor((level - 1) / 100) * 100 + 1 + worldAdvance * 100);
    const nextLvl = worldAdvance > 0 ? nextWorldStart : Math.min(TOTAL_LEVELS, level + 1);
    const targetLevel = Math.max(progress.maxUnlocked, progress.currentLevel, nextLvl);

    if (targetLevel > progress.maxUnlocked) {
      progress.maxUnlocked = targetLevel;
    }
    progress.currentLevel = targetLevel;
    progress.giantScale = giantScale;
    pendingNextLevel = targetLevel;
    saveProgress(progress);
    updateStartModalSavedText();

    winLevel.textContent = `${level} / ${TOTAL_LEVELS}`;
    winTime.textContent = `${time.toFixed(1)} שנ׳`;
    if (winCoins) winCoins.textContent = `+${coinsEarned} 🪙`;

    if (isFinale) {
      winIcon.textContent = '🏆🎆👑';
      winTitle.textContent = 'אלוף 1,000 השלבים!';
      winDesc.textContent = 'הבסת את המלך והמלכה בגמר הגדול!';
      btnNextLevel.textContent = 'שחק שוב מהתחלה ⚽';
    } else if (worldAdvance >= 2) {
      winIcon.textContent = '💥🌟🏆';
      winTitle.textContent = 'שברת את המלכה! קפיצת 2 עולמות!';
      winDesc.textContent = `עוברים שני עולמות קדימה — שלב ${pendingNextLevel}! 🚀`;
      btnNextLevel.textContent = `לשלב ${pendingNextLevel} 🚀`;
    } else if (worldAdvance === 1) {
      winIcon.textContent = '🚀🌟🏆';
      winTitle.textContent = 'עוברים לעולם הבא!';
      winDesc.textContent = `קפצת ישר לשלב ${pendingNextLevel}! 🚀`;
      btnNextLevel.textContent = `לשלב ${pendingNextLevel} 🚀`;
    } else {
      winIcon.textContent = level % 100 === 0 ? '🏆🌟' : '⚽🏆';
      winTitle.textContent = level % 100 === 0 ? `סיימת עולם שלם! (שלב ${level})` : `ניצחת את שלב ${level}!`;
      winDesc.textContent = `שלב ${pendingNextLevel} נפתח ונשמר אוטומטית בדפדפן 💾`;
      btnNextLevel.textContent = `לשלב ${pendingNextLevel} ⬅️`;
    }

    if (!modalWin.open) modalWin.showModal();
  },
});

game.giantScale = progress.giantScale || 1.0;
game.setDifficulty(progress.difficulty);
game.setUpgrades(progress.upgrades);
game.loadLevel(progress.currentLevel, false);
game.startLoop();

// Show intro dialog on first load
modalStart.showModal();

function setGameDifficulty(diffId, reloadCurrent = false) {
  if (!DIFFICULTIES[diffId]) return;
  progress.difficulty = diffId;
  saveProgress(progress);
  game.setDifficulty(diffId);
  syncDifficultyUi();
  if (reloadCurrent) {
    game.loadLevel(game.config.level, game.state === 'playing');
    const d = DIFFICULTIES[diffId];
    showToast(`רמת קושי: ${d.emoji} ${d.label} (${d.bossHits} פגיעות במלך)`, true);
  }
}

if (startDiffButtons) {
  startDiffButtons.querySelectorAll('.diff-choice-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      sound.unlock();
      setGameDifficulty(btn.dataset.diff, false);
      game.loadLevel(progress.currentLevel, false);
    });
  });
}

if (btnDiffHud) {
  btnDiffHud.addEventListener('click', () => {
    sound.unlock();
    const order = ['easy', 'normal', 'hard'];
    const nextIdx = (order.indexOf(progress.difficulty) + 1) % order.length;
    setGameDifficulty(order[nextIdx], true);
  });
}

btnPlay.addEventListener('click', () => {
  sound.unlock();
  modalStart.close();
  game.setDifficulty(progress.difficulty);
  game.setUpgrades(progress.upgrades);
  game.loadLevel(progress.currentLevel, true);
});

btnNextLevel.addEventListener('click', () => {
  sound.unlock();
  modalWin.close();
  const target = game.config.isFinale ? 1 : pendingNextLevel;
  progress.currentLevel = target;
  if (target > progress.maxUnlocked) {
    progress.maxUnlocked = target;
  }
  saveProgress(progress);
  game.setUpgrades(progress.upgrades);
  game.loadLevel(target, true);
});

btnRestart.addEventListener('click', () => {
  sound.unlock();
  game.setUpgrades(progress.upgrades);
  game.loadLevel(game.config.level, true);
  showToast('השלב התחיל מחדש! ⚽', true);
});

if (hudTime) {
  hudTime.addEventListener('click', () => {
    sound.unlock();
    game.triggerLightning();
  });
}

btnSound.addEventListener('click', () => {
  progress.muted = !progress.muted;
  sound.setMuted(progress.muted);
  btnSound.textContent = progress.muted ? '🔇' : '🔊';
  saveProgress(progress);
});

window.addEventListener('pagehide', () => {
  saveProgress(progress);
});

// Mobile Action Buttons
btnShoot.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  sound.unlock();
  btnShoot.classList.add('firing');
  game.shoot();
  setTimeout(() => btnShoot.classList.remove('firing'), 110);
});

if (btnGunGhost) {
  btnGunGhost.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sound.unlock();
    game.shootGhostGun();
  });
}

if (btnGunFire) {
  btnGunFire.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sound.unlock();
    game.shootFireGun();
  });
}

if (btnConfuse) {
  btnConfuse.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sound.unlock();
    game.triggerConfuse(false);
  });
}

if (btnSpear) {
  btnSpear.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sound.unlock();
    game.throwSpear();
  });
}

if (btnDragon) {
  btnDragon.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sound.unlock();
    game.summonDragons(false);
  });
}

// ===================== UPGRADE SHOP =====================
function renderShop() {
  syncCoinsUi();
  shopItemsList.innerHTML = '';

  for (const item of SHOP_UPGRADES) {
    const currentLvl = progress.upgrades[item.id] || 0;
    const isMax = currentLvl >= item.maxLevel;
    const lockedByLevel = Boolean(item.minLevel && progress.maxUnlocked < item.minLevel && !progress.unlockAll);
    const cost = isMax ? 0 : item.costs[currentLvl];
    const canAfford = !isMax && !lockedByLevel && progress.coins >= cost;

    let pipsHtml = '';
    for (let i = 0; i < item.maxLevel; i++) {
      pipsHtml += `<span class="shop-pip${i < currentLvl ? ' filled' : ''}"></span>`;
    }

    const btnText = lockedByLevel
      ? `🔒 משלב ${item.minLevel}+`
      : isMax
        ? 'מקסימום ✓'
        : `שדרג (${cost} 🪙)`;

    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `
      <div class="shop-item-info">
        <div class="shop-item-header">
          <span>${item.emoji}</span>
          <span>${item.name}</span>
          <small style="color:#fde047;">(רמה ${currentLvl}/${item.maxLevel})</small>
        </div>
        <div class="shop-item-desc">${item.desc}</div>
        <div class="shop-level-pips">${pipsHtml}</div>
      </div>
      <button type="button" class="shop-buy-btn" ${canAfford ? '' : 'disabled'}>
        ${btnText}
      </button>
    `;

    const buyBtn = row.querySelector('.shop-buy-btn');
    if (canAfford) {
      buyBtn.addEventListener('click', () => {
        sound.unlock();
        if (progress.coins < cost) return;
        progress.coins -= cost;
        progress.upgrades[item.id] = currentLvl + 1;
        saveProgress(progress);
        game.setUpgrades(progress.upgrades);

        if (item.id === 'shield') {
          game.shieldsLeft += 1;
        } else if (item.id === 'goldenArmor') {
          game.goldenArmorLeft += 1;
        } else if (item.id === 'startFire') {
          game.fireShotsLeft += 1;
        } else if (item.id === 'ghostGun') {
          game.ghostMaxShots += 1;
          game.ghostShotsLeft += 1;
        }
        game._syncHud();

        sound.buy();
        updateStartModalSavedText();
        renderShop();
      });
    }

    shopItemsList.appendChild(row);
  }
}

let resumeAfterShop = false;
function openShop(fromPlaying = false) {
  sound.unlock();
  resumeAfterShop = fromPlaying && game.state === 'playing';
  if (resumeAfterShop) game.setPlaying(false);
  renderShop();
  if (!modalShop.open) modalShop.showModal();
}

function closeShop() {
  modalShop.close();
  if (resumeAfterShop) {
    game.setPlaying(true);
    resumeAfterShop = false;
  }
}

btnShopHud.addEventListener('click', () => openShop(true));
btnOpenShopStart.addEventListener('click', () => openShop(false));
btnOpenShopWin.addEventListener('click', () => openShop(false));
btnCloseShop.addEventListener('click', closeShop);
modalShop.addEventListener('cancel', () => {
  if (resumeAfterShop) {
    game.setPlaying(true);
    resumeAfterShop = false;
  }
});

// ===================== LEVEL PICKER =====================
function renderWorldsList() {
  worldsList.innerHTML = '';
  const currentWorldIdx = Math.floor((progress.maxUnlocked - 1) / 100);

  for (let idx = 0; idx < WORLDS.length; idx++) {
    const w = WORLDS[idx];
    const isBehind = idx < currentWorldIdx;
    const isFutureLocked = idx > currentWorldIdx;
    const unlocked = progress.unlockAll || (!isBehind && !isFutureLocked);

    let statusText = '';
    if (progress.unlockAll) {
      statusText = `שחק (${w.range[0]})`;
    } else if (isBehind) {
      statusText = '✓ הושלם';
    } else if (isFutureLocked) {
      statusText = '🔒 נעול';
    } else {
      statusText = `העולם שלך (${progress.currentLevel})`;
    }

    const row = document.createElement('div');
    row.className = `world-item${unlocked ? '' : ' locked'}`;
    row.innerHTML = `
      <div class="world-meta">
        <strong>${w.emoji} ${w.name}</strong>
        <span>שלבים ${w.range[0]} – ${w.range[1]}</span>
      </div>
      <button class="secondary-btn" type="button" ${unlocked ? '' : 'disabled'}>
        ${statusText}
      </button>
    `;
    const btn = row.querySelector('button');
    if (unlocked) {
      btn.addEventListener('click', () => {
        const target = progress.unlockAll
          ? Math.max(w.range[0], progress.currentLevel)
          : Math.max(w.range[0], progress.currentLevel);
        selectLevel(target);
      });
    }
    worldsList.appendChild(row);
  }
}

function selectLevel(lvl) {
  const clamped = Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(lvl)));
  const currentWorldStart = Math.floor((progress.maxUnlocked - 1) / 100) * 100 + 1;
  const minAllowed = Math.max(currentWorldStart, progress.currentLevel); // Only forward!
  const maxAllowed = progress.unlockAll ? TOTAL_LEVELS : progress.maxUnlocked;

  if (clamped < minAllowed) {
    showToast(`אי אפשר לחזור אחורה — ממשיכים קדימה משלב ${minAllowed}`, false);
    return;
  }
  if (clamped > maxAllowed) {
    showToast(`שלב ${clamped} עדיין נעול (הגעת עד ${progress.maxUnlocked})`, false);
    return;
  }
  progress.currentLevel = clamped;
  if (clamped > progress.maxUnlocked) {
    progress.maxUnlocked = clamped;
  }
  saveProgress(progress);
  updateStartModalSavedText();
  modalLevels.close();
  game.setUpgrades(progress.upgrades);
  game.loadLevel(clamped, true);
}

btnLevels.addEventListener('click', () => {
  game.setPlaying(false);
  const currentWorldStart = Math.floor((progress.maxUnlocked - 1) / 100) * 100 + 1;
  inputLevelJump.value = String(game.config.level);
  inputLevelJump.min = String(progress.unlockAll ? progress.currentLevel : currentWorldStart);
  inputLevelJump.max = String(progress.unlockAll ? TOTAL_LEVELS : progress.maxUnlocked);
  renderWorldsList();
  modalLevels.showModal();
});

btnCloseLevels.addEventListener('click', () => {
  modalLevels.close();
  game.setPlaying(true);
});

modalLevels.addEventListener('cancel', () => {
  game.setPlaying(true);
});

btnJumpGo.addEventListener('click', () => {
  selectLevel(Number(inputLevelJump.value) || 1);
});

chkUnlockAll.addEventListener('change', () => {
  progress.unlockAll = chkUnlockAll.checked;
  saveProgress(progress);
  const currentWorldStart = Math.floor((progress.maxUnlocked - 1) / 100) * 100 + 1;
  inputLevelJump.min = String(progress.unlockAll ? progress.currentLevel : currentWorldStart);
  inputLevelJump.max = String(progress.unlockAll ? TOTAL_LEVELS : progress.maxUnlocked);
  renderWorldsList();
});
