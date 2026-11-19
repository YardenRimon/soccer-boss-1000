import { sound } from './audio.js';
import { SoccerBossGame } from './game.js';
import { TOTAL_LEVELS, WORLDS } from './worlds.js';

const STORAGE_KEY = 'soccer_boss_100_save_v1';

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { currentLevel: 1, maxUnlocked: 1, unlockAll: false, muted: false };
    const parsed = JSON.parse(raw);
    return {
      currentLevel: Math.max(1, Math.min(TOTAL_LEVELS, Number(parsed.currentLevel) || 1)),
      maxUnlocked: Math.max(1, Math.min(TOTAL_LEVELS, Number(parsed.maxUnlocked) || 1)),
      unlockAll: Boolean(parsed.unlockAll),
      muted: Boolean(parsed.muted),
    };
  } catch {
    return { currentLevel: 1, maxUnlocked: 1, unlockAll: false, muted: false };
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
sound.setMuted(progress.muted);

// DOM references
const canvas = document.getElementById('game-canvas');
const hudLevel = document.getElementById('hud-level');
const hudWorld = document.getElementById('hud-world');
const bossHpText = document.getElementById('boss-hp-text');
const bossHpFill = document.getElementById('boss-hp-fill');
const powerupBar = document.getElementById('powerup-bar');
const toastEl = document.getElementById('toast');
const touchHint = document.getElementById('touch-hint');

const btnLevels = document.getElementById('btn-levels');
const btnRestart = document.getElementById('btn-restart');
const btnSound = document.getElementById('btn-sound');
const btnShoot = document.getElementById('btn-shoot');

const modalStart = document.getElementById('modal-start');
const btnPlay = document.getElementById('btn-play');

const modalWin = document.getElementById('modal-win');
const winIcon = document.getElementById('win-icon');
const winTitle = document.getElementById('win-title');
const winDesc = document.getElementById('win-desc');
const winLevel = document.getElementById('win-level');
const winTime = document.getElementById('win-time');
const btnNextLevel = document.getElementById('btn-next-level');

const modalLevels = document.getElementById('modal-levels');
const btnCloseLevels = document.getElementById('btn-close-levels');
const inputLevelJump = document.getElementById('input-level-jump');
const btnJumpGo = document.getElementById('btn-jump-go');
const chkUnlockAll = document.getElementById('chk-unlock-all');
const worldsList = document.getElementById('worlds-list');

btnSound.textContent = progress.muted ? '🔇' : '🔊';
chkUnlockAll.checked = progress.unlockAll;

let toastTimeout = null;
function showToast(msg, isGood = false) {
  toastEl.textContent = msg;
  toastEl.classList.toggle('good', isGood);
  toastEl.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 1450);
}

const game = new SoccerBossGame(canvas, {
  onHudUpdate: ({ level, worldName, bossHp, bossMaxHp, fireShots, freezeTime, turboTime }) => {
    hudLevel.textContent = String(level);
    hudWorld.textContent = worldName;
    bossHpText.textContent = `${bossHp} / ${bossMaxHp} ❤️`;
    bossHpFill.style.width = `${(bossHp / bossMaxHp) * 100}%`;

    const chips = [];
    if (fireShots > 0) chips.push(`<span class="powerup-chip">🔥 כדור אש ×${fireShots}</span>`);
    if (freezeTime > 0) chips.push(`<span class="powerup-chip">❄️ מלכה קפואה ${freezeTime.toFixed(1)}ש׳</span>`);
    if (turboTime > 0) chips.push(`<span class="powerup-chip">⚡ טורבו ${turboTime.toFixed(1)}ש׳</span>`);
    powerupBar.innerHTML = chips.join('');
  },
  onToast: (msg, isGood) => showToast(msg, isGood),
  onFirstInput: () => {
    touchHint.classList.add('hidden');
  },
  onWin: ({ level, time, isFinale }) => {
    const nextLvl = Math.min(TOTAL_LEVELS, level + 1);
    if (nextLvl > progress.maxUnlocked) {
      progress.maxUnlocked = nextLvl;
    }
    progress.currentLevel = nextLvl;
    saveProgress(progress);

    winLevel.textContent = `${level} / ${TOTAL_LEVELS}`;
    winTime.textContent = `${time.toFixed(1)} שנ׳`;

    if (isFinale) {
      winIcon.textContent = '🏆🎆👑';
      winTitle.textContent = 'אלוף 100 השלבים!';
      winDesc.textContent = 'הבסת את הבוס והמלכה בגמר הגדול!';
      btnNextLevel.textContent = 'שחק שוב מהתחלה ⚽';
    } else {
      winIcon.textContent = level % 10 === 0 ? '🏆🌟' : '⚽🏆';
      winTitle.textContent = level % 10 === 0 ? `סיימת עולם שלם! (שלב ${level})` : `ניצחת את שלב ${level}!`;
      winDesc.textContent = 'הבוס הובס ב-10 פגיעות! מוכן לאתגר הבא?';
      btnNextLevel.textContent = `לשלב ${nextLvl} ⬅️`;
    }

    if (!modalWin.open) modalWin.showModal();
  },
});

game.loadLevel(progress.currentLevel, false);
game.startLoop();

// Show intro dialog on first load
modalStart.showModal();

btnPlay.addEventListener('click', () => {
  sound.unlock();
  modalStart.close();
  game.loadLevel(progress.currentLevel, true);
});

btnNextLevel.addEventListener('click', () => {
  sound.unlock();
  modalWin.close();
  const target = game.config.isFinale ? 1 : Math.min(TOTAL_LEVELS, game.config.level + 1);
  progress.currentLevel = target;
  saveProgress(progress);
  game.loadLevel(target, true);
});

btnRestart.addEventListener('click', () => {
  sound.unlock();
  game.loadLevel(game.config.level, true);
  showToast('השלב התחיל מחדש! ⚽', true);
});

btnSound.addEventListener('click', () => {
  progress.muted = !progress.muted;
  sound.setMuted(progress.muted);
  btnSound.textContent = progress.muted ? '🔇' : '🔊';
  saveProgress(progress);
});

// Dedicated mobile Shoot button (supports rapid tap and multi-touch while dragging)
const handleShootPress = (e) => {
  e.preventDefault();
  sound.unlock();
  btnShoot.classList.add('firing');
  game.shoot();
  setTimeout(() => btnShoot.classList.remove('firing'), 110);
};
btnShoot.addEventListener('pointerdown', handleShootPress);

// Level Picker Modal
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
  modalLevels.close();
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
