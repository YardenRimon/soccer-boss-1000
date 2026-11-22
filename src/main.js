import { sound } from './audio.js';
import { SoccerBossGame } from './game.js';
import { DIFFICULTIES, SHOP_UPGRADES, TOTAL_LEVELS, WORLDS } from './worlds.js';

const STORAGE_KEY = 'soccer_boss_100_save_v2';
const LEGACY_KEYS = ['soccer_boss_100_save_v1', 'soccer_boss_1000_save_v1'];

function loadProgress() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const k of LEGACY_KEYS) {
        raw = localStorage.getItem(k);
        if (raw) break;
      }
    }
    if (!raw) {
      return {
        currentLevel: 1,
        maxUnlocked: 1,
        coins: 0,
        difficulty: 'easy',
        upgrades: { speed: 0, shot: 0, shield: 0, magnet: 0, startFire: 0 },
        unlockAll: false,
        muted: false,
        bestTimes: {},
      };
    }
    const parsed = JSON.parse(raw);
    const maxUnlocked = Math.max(1, Math.min(TOTAL_LEVELS, Number(parsed.maxUnlocked) || 1));
    const currentLevel = Math.max(1, Math.min(TOTAL_LEVELS, Number(parsed.currentLevel) || maxUnlocked));
    const difficulty = DIFFICULTIES[parsed.difficulty] ? parsed.difficulty : 'easy';
    const up = parsed.upgrades && typeof parsed.upgrades === 'object' ? parsed.upgrades : {};

    return {
      currentLevel,
      maxUnlocked: Math.max(maxUnlocked, currentLevel),
      coins: Math.max(0, Math.floor(Number(parsed.coins) || 0)),
      difficulty,
      upgrades: {
        speed: Math.max(0, Math.min(5, Number(up.speed) || 0)),
        shot: Math.max(0, Math.min(5, Number(up.shot) || 0)),
        shield: Math.max(0, Math.min(5, Number(up.shield) || 0)),
        magnet: Math.max(0, Math.min(5, Number(up.magnet) || 0)),
        startFire: Math.max(0, Math.min(5, Number(up.startFire) || 0)),
      },
      unlockAll: Boolean(parsed.unlockAll),
      muted: Boolean(parsed.muted),
      bestTimes: parsed.bestTimes && typeof parsed.bestTimes === 'object' ? parsed.bestTimes : {},
    };
  } catch {
    return {
      currentLevel: 1,
      maxUnlocked: 1,
      coins: 0,
      difficulty: 'easy',
      upgrades: { speed: 0, shot: 0, shield: 0, magnet: 0, startFire: 0 },
      unlockAll: false,
      muted: false,
      bestTimes: {},
    };
  }
}

function saveProgress(data) {
  try {
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
      savedStatusBanner.textContent = '💾 ההתקדמות והמטבעות שלך נשמרים אוטומטית בדפדפן';
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
  }, 1500);
}

const game = new SoccerBossGame(canvas, {
  onHudUpdate: ({
    level,
    worldName,
    timeLabel,
    hue,
    bossHp,
    bossMaxHp,
    fireShots,
    shieldsLeft,
    freezeTime,
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
        bossMaxHp === 1 ? '👹 הבוס (פגיעה 1 לניצחון!)' : `👹 הבוס (${bossMaxHp} פגיעות לניצחון)`;
    }
    bossHpText.textContent = `${bossHp} / ${bossMaxHp} ❤️`;
    bossHpFill.style.width = `${(bossHp / bossMaxHp) * 100}%`;

    const chips = [];
    if (shieldsLeft > 0) chips.push(`<span class="powerup-chip shield-chip">🛡️ מגן ×${shieldsLeft}</span>`);
    if (fireShots > 0) chips.push(`<span class="powerup-chip">🔥 כדור אש ×${fireShots}</span>`);
    if (freezeTime > 0) chips.push(`<span class="powerup-chip">❄️ מלכה קפואה ${freezeTime.toFixed(1)}ש׳</span>`);
    if (turboTime > 0) chips.push(`<span class="powerup-chip">⚡ טורבו ${turboTime.toFixed(1)}ש׳</span>`);
    powerupBar.innerHTML = chips.join('');
  },
  onCoinsEarned: (amount) => {
    progress.coins += amount;
    saveProgress(progress);
    syncCoinsUi();
  },
  onToast: (msg, isGood) => showToast(msg, isGood),
  onFirstInput: () => {
    touchHint.classList.add('hidden');
  },
  onWin: ({ level, time, coinsEarned, isFinale }) => {
    const nextLvl = Math.min(TOTAL_LEVELS, level + 1);
    if (nextLvl > progress.maxUnlocked) {
      progress.maxUnlocked = nextLvl;
    }
    progress.currentLevel = isFinale ? 1 : nextLvl;
    const prevBest = progress.bestTimes[level];
    if (!prevBest || time < prevBest) {
      progress.bestTimes[level] = Number(time.toFixed(1));
    }
    saveProgress(progress);
    updateStartModalSavedText();

    winLevel.textContent = `${level} / ${TOTAL_LEVELS}`;
    winTime.textContent = `${time.toFixed(1)} שנ׳`;
    if (winCoins) winCoins.textContent = `+${coinsEarned} 🪙`;

    if (isFinale) {
      winIcon.textContent = '🏆🎆👑';
      winTitle.textContent = 'אלוף 100 השלבים!';
      winDesc.textContent = 'הבסת את הבוס והמלכה בגמר הגדול!';
      btnNextLevel.textContent = 'שחק שוב מהתחלה ⚽';
    } else {
      winIcon.textContent = level % 10 === 0 ? '🏆🌟' : '⚽🏆';
      winTitle.textContent = level % 10 === 0 ? `סיימת עולם שלם! (שלב ${level})` : `ניצחת את שלב ${level}!`;
      winDesc.textContent = `שלב ${nextLvl} נפתח ונשמר אוטומטית בדפדפן 💾`;
      btnNextLevel.textContent = `לשלב ${nextLvl} ⬅️`;
    }

    if (!modalWin.open) modalWin.showModal();
  },
});

game.setDifficulty(progress.difficulty);
game.setUpgrades(progress.upgrades);
game.loadLevel(progress.currentLevel, false);
game.startLoop();

// Show intro dialog on first load
modalStart.showModal();

// Difficulty selection handlers
function setGameDifficulty(diffId, reloadCurrent = false) {
  if (!DIFFICULTIES[diffId]) return;
  progress.difficulty = diffId;
  saveProgress(progress);
  game.setDifficulty(diffId);
  syncDifficultyUi();
  if (reloadCurrent) {
    game.loadLevel(game.config.level, game.state === 'playing');
    const d = DIFFICULTIES[diffId];
    showToast(`רמת קושי: ${d.emoji} ${d.label} (${d.bossHits} פגיעות בבוס)`, true);
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
  const target = game.config.isFinale ? 1 : Math.min(TOTAL_LEVELS, game.config.level + 1);
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

// Dedicated mobile Shoot button
const handleShootPress = (e) => {
  e.preventDefault();
  sound.unlock();
  btnShoot.classList.add('firing');
  game.shoot();
  setTimeout(() => btnShoot.classList.remove('firing'), 110);
};
btnShoot.addEventListener('pointerdown', handleShootPress);

// ===================== UPGRADE SHOP =====================
function renderShop() {
  syncCoinsUi();
  shopItemsList.innerHTML = '';

  for (const item of SHOP_UPGRADES) {
    const currentLvl = progress.upgrades[item.id] || 0;
    const isMax = currentLvl >= item.maxLevel;
    const cost = isMax ? 0 : item.costs[currentLvl];
    const canAfford = !isMax && progress.coins >= cost;

    let pipsHtml = '';
    for (let i = 0; i < item.maxLevel; i++) {
      pipsHtml += `<span class="shop-pip${i < currentLvl ? ' filled' : ''}"></span>`;
    }

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
        ${isMax ? 'מקסימום ✓' : `שדרג (${cost} 🪙)`}
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

        // Apply newly purchased shield or fire shot immediately to the active level too!
        if (item.id === 'shield') {
          game.shieldsLeft += 1;
          game._syncHud();
        } else if (item.id === 'startFire') {
          game.fireShotsLeft += 1;
          game._syncHud();
        }

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
  for (const w of WORLDS) {
    const unlocked = progress.unlockAll || progress.maxUnlocked >= w.range[0];
    const row = document.createElement('div');
    row.className = `world-item${unlocked ? '' : ' locked'}`;
    row.innerHTML = `
      <div class="world-meta">
        <strong>${w.emoji} ${w.name}</strong>
        <span>שלבים ${w.range[0]} – ${w.range[1]}</span>
      </div>
      <button class="secondary-btn" type="button" ${unlocked ? '' : 'disabled'}>
        ${unlocked ? `שחק (${w.range[0]})` : '🔒 נעול'}
      </button>
    `;
    const btn = row.querySelector('button');
    if (unlocked) {
      btn.addEventListener('click', () => selectLevel(w.range[0]));
    }
    worldsList.appendChild(row);
  }
}

function selectLevel(lvl) {
  const clamped = Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(lvl)));
  const maxAllowed = progress.unlockAll ? TOTAL_LEVELS : progress.maxUnlocked;
  if (clamped > maxAllowed) {
    showToast(`שלב ${clamped} עדיין נעול (הגעת עד ${progress.maxUnlocked})`, false);
    return;
  }
  progress.currentLevel = clamped;
  saveProgress(progress);
  updateStartModalSavedText();
  modalLevels.close();
  game.setUpgrades(progress.upgrades);
  game.loadLevel(clamped, true);
}

btnLevels.addEventListener('click', () => {
  game.setPlaying(false);
  inputLevelJump.value = String(game.config.level);
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
  inputLevelJump.max = String(progress.unlockAll ? TOTAL_LEVELS : progress.maxUnlocked);
  renderWorldsList();
});
