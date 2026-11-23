import { sound } from './audio.js';
import { generateLevelConfig } from './worlds.js';

const POWERUP_TYPES = [
  { id: 'fire', emoji: '🔥', label: 'תחמושת רובה אש (+2)', color: '#f97316' },
  { id: 'ghost', emoji: '👻', label: 'תחמושת רובה רפאים (+2)', color: '#38bdf8' },
  { id: 'confuse', emoji: '🌀', label: 'מבלבל מלך ומלכה!', color: '#a855f7' },
  { id: 'dragon', emoji: '🐉', label: 'זימון דרקונים!', color: '#10b981' },
  { id: 'freeze', emoji: '❄️', label: 'מלכה קפואה', color: '#67e8f9' },
  { id: 'turbo', emoji: '⚡', label: 'טורבו + ירי מהיר', color: '#facc15' },
];

export class SoccerBossGame {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks;

    this.width = 360;
    this.height = 640;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.difficultyId = 'easy';
    this.upgrades = {
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
    };

    this.state = 'paused'; // 'paused' | 'playing' | 'restarting' | 'won'
    this.config = generateLevelConfig(1, this.difficultyId);
    this.levelTime = 0;
    this.restartTimer = 0;
    this.shakeTime = 0;
    this.shakeMag = 0;

    // Player grows larger when hitting the King (Boss)!
    this.giantScale = 1.0;

    // Input state
    this.keys = new Set();
    this.pointer = {
      active: false,
      id: null,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      startTime: 0,
      movedDist: 0,
    };

    // Entities
    this.player = null;
    this.boss = null;
    this.queen = null;
    this.playerCones = [];
    this.queenCones = [];
    this.kingPits = [];
    this.guardianGuards = [];
    this.helpers = [];
    this.kingRockets = [];
    this.divingRockets = [];
    this.dragons = [];
    this.dragonRockets = [];
    this.tailWhipArcs = [];
    this.coins = [];
    this.balls = [];
    this.spears = [];
    this.hazards = [];
    this.powerups = [];
    this.decoys = [];
    this.muzzleBeams = [];
    this.particles = [];
    this.floatingTexts = [];
    this.confetti = [];

    // Weather (Vegetable Rain, Steam & Bubbles — NO wind!)
    this.rainDrops = [];
    this.rainSplashes = [];
    this.steamPuffs = [];
    this.bubbles = [];
    this.lightningTimer = 2.0;
    this.lightningFlash = 0;
    this.lightningBolts = [];

    this.queenShotTimer = 1.6;
    this.powerupTimer = 4.0;
    this.coinSpawnTimer = 3.2;
    this.rocketDiveTimer = 7.5;
    this.rainInterfereTimer = 4.2;
    this.ballCooldown = 0;
    this.queenFreezeTimer = 0;
    this.queenConfuseTimer = 0;
    this.bossConfuseTimer = 0;
    this.queenVenomTimer = 0;
    this.bossVenomTimer = 0;
    this.bossVenomTick = 0;
    this.bossPitTimer = 0;
    this.queenRainSlowTimer = 0;
    this.bossRainSlowTimer = 0;
    this.queenEaten = false;
    this.queenBroken = false;
    this.queenRespawnTimer = 0;
    this.turboTimer = 0;

    // Guns & Special Abilities
    this.fireShotsLeft = 1;
    this.ghostShotsLeft = 2;
    this.ghostMaxShots = 3;
    this.ghostRechargeTimer = 0;
    this.confuseCooldown = 0;
    this.dragonCooldown = 0;
    this.spearCooldown = 0;
    this.spearCooldown = 0;
    this.gunRecoilFire = 0;
    this.gunRecoilGhost = 0;

    this.shieldsLeft = 0;
    this.goldenArmorLeft = 0;
    this.invulnTimer = 0;
    this.levelCoinsEarned = 0;

    this._lastFrame = 0;
    this._rafId = null;

    this._bindEvents();
    this.resize();
    this.loadLevel(1, false);
  }

  setDifficulty(difficultyId) {
    this.difficultyId = difficultyId;
  }

  setUpgrades(upgrades) {
    this.upgrades = {
      speed: Number(upgrades?.speed) || 0,
      shot: Number(upgrades?.shot) || 0,
      shield: Number(upgrades?.shield) || 0,
      magnet: Number(upgrades?.magnet) || 0,
      startFire: Number(upgrades?.startFire) || 0,
      ghostGun: Number(upgrades?.ghostGun) || 0,
      confuse: Number(upgrades?.confuse) || 0,
      goldenArmor: Number(upgrades?.goldenArmor) || 0,
      dragonMaster: Number(upgrades?.dragonMaster) || 0,
      spearMaster: Number(upgrades?.spearMaster) || 0,
      lightningAura: Number(upgrades?.lightningAura) || 0,
      veggieLuck: Number(upgrades?.veggieLuck) || 0,
    };
  }

  startLoop() {
    if (this._rafId) return;
    this._lastFrame = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.033, Math.max(0.001, (now - this._lastFrame) / 1000));
      this._lastFrame = now;
      this.update(dt);
      this.render();
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = Math.max(280, Math.floor(rect.width));
    this.height = Math.max(380, Math.floor(rect.height));
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  loadLevel(levelNum, startPlaying = true) {
    this.config = generateLevelConfig(levelNum, this.difficultyId);
    this.levelTime = 0;
    this.restartTimer = 0;
    this.shakeTime = 0;
    this.levelCoinsEarned = 0;

    this.player = {
      x: 0.5,
      y: 0.81, // Positioned clearly above mobile controls bar
      vx: 0,
      vy: 0,
      r: 0.044, // Harry Potter is the tallest!
      ballSpin: 0,
      hasBall: true,
      kickTimer: 0,
      spearSwingTimer: 0,
    };

    this.boss = {
      x: 0.5,
      y: 0.105,
      vx: this.config.bossSpeed * 0.65,
      r: 0.056,
      hp: this.config.bossMaxHp,
      maxHp: this.config.bossMaxHp,
      hitFlash: 0,
      angryPhase: 0,
    };

    this.queen = {
      x: 0.5,
      y: 0.31,
      vx: 0,
      vy: 0,
      r: 0.044,
      blockFlash: 0,
      slidePhase: 0,
    };

    this.playerCones = this.config.playerCones.map((c) => ({ ...c }));
    this.queenCones = this.config.queenCones.map((c) => ({ ...c }));
    this.fireFences = this.config.fireFences.map((f) => ({ ...f }));
    this.guardianGuards = this.config.guardianGuards.map((g) => ({ ...g }));
    this.kingPits = this.config.kingPits.map((p) => ({ ...p }));
    this.coins = this.config.initialCoins.map((c) => ({ ...c }));
    this.defenders = this.config.movingDefenders.map((d) => ({ ...d }));

    // 2 Immortal Helpers guarding Harry on left & right: Ron (2nd tallest) & Hermione (shortest)
    this.helpers = [
      {
        id: 'ron',
        label: 'רון',
        x: 0.39,
        y: 0.78,
        offsetX: -0.11,
        offsetY: -0.025,
        r: 0.033, // 2nd tallest
        shootTimer: 5.2,
        spearTimer: 6.4,
        phase: 0,
        kickTimer: 0,
      },
      {
        id: 'hermione',
        label: 'הרמיוני',
        x: 0.61,
        y: 0.78,
        offsetX: 0.11,
        offsetY: -0.025,
        r: 0.025, // Shortest
        shootTimer: 7.4,
        spearTimer: 8.6,
        phase: Math.PI,
        kickTimer: 0,
      },
    ];

    // Patrol Rockets behind the King so he cannot turn/retreat back
    this.kingRockets = [
      { x: 0.25, y: 0.036, vx: 0.14 },
      { x: 0.50, y: 0.036, vx: -0.14 },
      { x: 0.75, y: 0.036, vx: 0.14 },
    ];
    this.divingRockets = [];
    this.dragons = [];
    this.dragonRockets = [];
    this.tailWhipArcs = [];

    this.balls = [];
    this.spears = [];
    this.hazards = [];
    this.powerups = [];
    this.decoys = [];
    this.muzzleBeams = [];
    this.particles = [];
    this.floatingTexts = [];
    this.confetti = [];

    this._initWeather();

    this.queenShotTimer = this.config.queenShotInterval > 0 ? Math.min(1.6, this.config.queenShotInterval) : 999;
    this.powerupTimer = 3.2;
    this.coinSpawnTimer = 3.8;
    this.rocketDiveTimer = 7.5;
    this.rainInterfereTimer = 3.8;
    this.ballCooldown = 0;
    this.queenFreezeTimer = 0;
    this.queenConfuseTimer = 0;
    this.bossConfuseTimer = 0;
    this.queenVenomTimer = 0;
    this.bossVenomTimer = 0;
    this.bossVenomTick = 0;
    this.bossPitTimer = 0;
    this.queenRainSlowTimer = 0;
    this.bossRainSlowTimer = 0;
    this.queenEaten = false;
    this.queenBroken = false;
    this.queenRespawnTimer = 0;
    this.turboTimer = 0;
    this.invulnTimer = 0;

    // Starting Gun ammo & armor from Shop Upgrades + free starter rounds
    this.fireShotsLeft = 1 + (this.upgrades.startFire || 0);
    this.ghostMaxShots = 3 + (this.upgrades.ghostGun || 0);
    this.ghostShotsLeft = 2 + (this.upgrades.ghostGun || 0);
    this.ghostRechargeTimer = 0;
    this.confuseCooldown = 0;
    this.dragonCooldown = 0;
    this.spearCooldown = 0;
    this.gunRecoilFire = 0;
    this.gunRecoilGhost = 0;

    this.shieldsLeft = this.upgrades.shield || 0;
    this.goldenArmorLeft = levelNum >= 100 ? this.upgrades.goldenArmor || 0 : 0;

    this.state = startPlaying ? 'playing' : 'paused';
    this._syncHud();
  }

  _initWeather() {
    const count = Math.min(34, Math.round(this.config.world.weather.rainCount * 0.38));
    const veggies = ['🥕', '🥦', '🍅', '🥒', '🌽', '🫑'];
    this.rainDrops = [];
    for (let i = 0; i < count; i++) {
      this.rainDrops.push({
        x: Math.random(),
        y: Math.random(),
        emoji: veggies[i % veggies.length],
        size: 13 + (i % 4) * 2,
        speed: 0.24 + Math.random() * 0.22,
        alpha: 0.72 + Math.random() * 0.25,
      });
    }
    this.rainSplashes = [];
    this.steamPuffs = [];
    for (let i = 0; i < 14; i++) {
      this.steamPuffs.push({
        x: Math.random(),
        y: 0.15 + Math.random() * 0.75,
        r: 14 + Math.random() * 18,
        vy: -0.03 - Math.random() * 0.03,
        alpha: 0.08 + Math.random() * 0.12,
      });
    }
    this.bubbles = [];
    for (let i = 0; i < 18; i++) {
      this.bubbles.push({
        x: Math.random(),
        y: Math.random(),
        r: 5 + Math.random() * 8,
        vy: -0.07 - Math.random() * 0.07,
        wobble: Math.random() * Math.PI * 2,
      });
    }
    this.lightningFlash = 0;
    this.lightningBolts = [];
    this.lightningTimer = 1.4 + Math.random() * 1.8;
  }

  triggerLightning() {
    this.lightningFlash = 0.34;
    this.shakeTime = Math.max(this.shakeTime, 0.14);
    this.shakeMag = Math.max(this.shakeMag, 4);
    sound.thunder();

    const startX = 0.15 + Math.random() * 0.7;
    const segments = [];
    const branches = [];
    let cx = startX;
    let cy = 0.0;
    const steps = 9;
    const endY = 0.45 + Math.random() * 0.35;
    const stepY = endY / steps;

    for (let i = 0; i < steps; i++) {
      const nx = Math.max(0.05, Math.min(0.95, cx + (Math.random() - 0.5) * 0.14));
      const ny = cy + stepY;
      segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });

      if (i > 1 && i < steps - 1 && Math.random() < 0.45) {
        let bx = nx;
        let by = ny;
        for (let b = 0; b < 3; b++) {
          const bnx = bx + (Math.random() - 0.5) * 0.12;
          const bny = by + stepY * 0.85;
          branches.push({ x1: bx, y1: by, x2: bnx, y2: bny });
          bx = bnx;
          by = bny;
        }
      }
      cx = nx;
      cy = ny;
    }

    this.lightningBolts = [{ segments, branches, life: 0.26, maxLife: 0.26, hitX: cx, hitY: cy }];
  }

  setPlaying(active) {
    if (active && this.state === 'paused') {
      this.state = 'playing';
    } else if (!active && this.state === 'playing') {
      this.state = 'paused';
    }
  }

  // Standard kick (normal soccer ball, blocked by Queen)
  shoot() {
    if (this.state !== 'playing') return;
    if (!this.player.hasBall) return;

    const shotLevel = this.upgrades.shot || 0;
    const shotSpeedMult = 1 + shotLevel * 0.14;
    const aimX = Math.max(-0.22, Math.min(0.22, this.player.vx * 0.32));
    const speed = 0.98 * shotSpeedMult;
    const sizeBoost = 1 + (this.giantScale - 1) * 0.35;

    this.balls.push({
      x: this.player.x,
      y: this.player.y - this.player.r * 1.15,
      vx: aimX,
      vy: -speed,
      r: 0.024 * sizeBoost,
      kind: 'normal',
      pierceQueen: false,
      damage: 1,
      spin: 0,
    });

    this.player.hasBall = false;
    this.player.kickTimer = 0.22;
    const baseCooldown = this.turboTimer > 0 ? 0.14 : 0.32;
    this.ballCooldown = Math.max(0.11, baseCooldown * (1 - shotLevel * 0.09));
    sound.kick(false);
    this._spawnParticles(this.player.x, this.player.y - 0.02, '#ffffff', 7);
    this._syncHud();
  }

  // Special Button + Gun #1: Fire Blaster Gun (passes through the Queen + 2x damage!)
  shootFireGun() {
    if (this.state !== 'playing') return;
    if (this.fireShotsLeft <= 0) {
      this.callbacks.onToast?.('אין תחמושת לרובה אש — אסוף 🔥 או שדרג בחנות!', false);
      return;
    }

    this.fireShotsLeft -= 1;
    this.gunRecoilFire = 0.22;
    const shotLevel = this.upgrades.shot || 0;
    const speed = 1.42 * (1 + shotLevel * 0.12);
    const muzzleX = this.player.x + this.player.r * this.giantScale * 0.95;
    const muzzleY = this.player.y - this.player.r * this.giantScale * 0.5;
    const aimX = Math.max(-0.18, Math.min(0.18, this.player.vx * 0.25));

    this.balls.push({
      x: muzzleX,
      y: muzzleY,
      vx: aimX,
      vy: -speed,
      r: 0.03 * (1 + (this.giantScale - 1) * 0.3),
      kind: 'fire',
      pierceQueen: true,
      damage: 2,
      spin: 0,
    });

    this.muzzleBeams.push({
      x1: muzzleX,
      y1: muzzleY,
      x2: muzzleX + aimX * 0.3,
      y2: Math.max(0.08, muzzleY - 0.32),
      color: '#fb923c',
      life: 0.16,
      maxLife: 0.16,
    });

    sound.fireBlaster();
    this._spawnParticles(muzzleX, muzzleY, '#f97316', 12);
    this._addFloatingText(muzzleX, muzzleY - 0.03, '🔥 רובה אש!', '#fb923c');
    this._syncHud();
  }

  // Special Button + Gun #2: Ghost Piercer Gun (passes straight through Queen AND cones!)
  shootGhostGun() {
    if (this.state !== 'playing') return;
    if (this.ghostShotsLeft <= 0) {
      this.callbacks.onToast?.('רובה הרפאים נטען... 👻', false);
      return;
    }

    this.ghostShotsLeft -= 1;
    this.gunRecoilGhost = 0.22;
    const shotLevel = this.upgrades.shot || 0;
    const speed = 1.32 * (1 + shotLevel * 0.12);
    const muzzleX = this.player.x - this.player.r * this.giantScale * 0.95;
    const muzzleY = this.player.y - this.player.r * this.giantScale * 0.5;
    const aimX = Math.max(-0.18, Math.min(0.18, this.player.vx * 0.25));

    this.balls.push({
      x: muzzleX,
      y: muzzleY,
      vx: aimX,
      vy: -speed,
      r: 0.027 * (1 + (this.giantScale - 1) * 0.3),
      kind: 'ghost',
      pierceQueen: true,
      damage: 1,
      spin: 0,
    });

    this.muzzleBeams.push({
      x1: muzzleX,
      y1: muzzleY,
      x2: muzzleX + aimX * 0.3,
      y2: Math.max(0.08, muzzleY - 0.32),
      color: '#38bdf8',
      life: 0.16,
      maxLife: 0.16,
    });

    sound.ghostShot();
    this._spawnParticles(muzzleX, muzzleY, '#38bdf8', 12);
    this._addFloatingText(muzzleX, muzzleY - 0.03, '👻 עובר מלכה!', '#7dd3fc');
    this._syncHud();
  }

  // Special Button #3: Confuse BOTH Queen & King + Spawn Decoys!
  triggerConfuse(freePickup = false) {
    if (this.state !== 'playing') return;
    if (!freePickup && this.confuseCooldown > 0) {
      this.callbacks.onToast?.(`משגר הבלבול נטען (${this.confuseCooldown.toFixed(1)}ש׳) 🌀`, false);
      return;
    }

    const lvl = this.upgrades.confuse || 0;
    const duration = 4.5 + lvl * 0.6;
    // Confusion works ALL the time with zero cooldown!
    this.confuseCooldown = 0;

    this.queenConfuseTimer = duration;
    this.bossConfuseTimer = duration;

    // Spawn decoy clones + fake balls to distract Queen & King!
    const decoyCount = lvl >= 2 ? 3 : 2;
    for (let i = 0; i < decoyCount; i++) {
      const targetSide = i % 2 === 0 ? 0.18 : 0.82;
      const startX = this.player.x;
      const vx = (targetSide - startX) * 0.85;
      this.decoys.push({
        x: startX,
        y: this.player.y - 0.02,
        vx,
        vy: -0.22 - i * 0.04,
        phase: Math.random() * Math.PI * 2,
        life: duration,
        maxLife: duration,
      });
    }

    sound.confuse();
    this._spawnParticles(this.queen.x, this.queen.y, '#c084fc', 16);
    this._spawnParticles(this.boss.x, this.boss.y, '#c084fc', 16);
    this._addFloatingText(this.queen.x, this.queen.y - 0.05, '😵‍💫 המלכה התבלבלה!', '#e879f9');
    this._addFloatingText(this.boss.x, this.boss.y + 0.05, '😵‍💫 המלך התבלבל!', '#f0abfc');
    this.callbacks.onToast?.('🌀 המלכה והמלך מבולבלים! נתיב פתוח לבעיטה!', true);
    this._syncHud();
  }

  // Special Button #4: Summon Dragons (immune to balls, fire rockets, Tail Whip, eat Queen & King -> skip to next world!)
  summonDragons(freePickup = false) {
    if (this.state !== 'playing') return;
    if (!freePickup && this.dragonCooldown > 0) {
      this.callbacks.onToast?.(`הדרקון נח (${this.dragonCooldown.toFixed(1)}ש׳) 🐉`, false);
      return;
    }

    if (!freePickup) {
      const dLvl = this.upgrades.dragonMaster || 0;
      this.dragonCooldown = Math.max(6.0, 14.0 - dLvl * 1.5);
    }

    // Spawn 2 fierce Dragons (immune to all balls!)
    this.dragons.push(
      {
        id: 1,
        x: 0.14,
        y: 0.72,
        r: 0.052,
        target: 'queen',
        rocketTimer: 0.35,
        whipTimer: 0.55,
        wingPhase: 0,
      },
      {
        id: 2,
        x: 0.86,
        y: 0.72,
        r: 0.052,
        target: 'boss',
        rocketTimer: 0.55,
        whipTimer: 0.75,
        wingPhase: Math.PI,
      }
    );

    sound.dragon();
    this.shakeTime = 0.25;
    this.shakeMag = 6;
    this._spawnParticles(0.14, 0.72, '#10b981', 16);
    this._spawnParticles(0.86, 0.72, '#f97316', 16);
    this._addFloatingText(0.5, 0.55, '🐉 דרקונים! טילים והצלפת זנב!', '#34d399');
    this.callbacks.onToast?.('🐉 הדרקונים טסים לאכול את המלכה והמלך!', true);
    this._syncHud();
  }

  // Throw Spear (Harry Potter, Ron, or Hermione swing & throw fast spears toward the Queen & King!)
  throwSpear(thrower = 'הארי', fromX = this.player.x, fromY = this.player.y - this.player.r, free = false) {
    if (this.state !== 'playing') return;
    if (!free && this.spearCooldown > 0) {
      this.callbacks.onToast?.(`החנית נטענת (${this.spearCooldown.toFixed(1)}ש׳) 🔱`, false);
      return;
    }
    if (!free) {
      const spearLvl = this.upgrades.spearMaster || 0;
      const auraLvl = this.upgrades.lightningAura || 0;
      this.spearCooldown = Math.max(0.9, 1.8 - spearLvl * 0.16 - auraLvl * 0.1);
      this.player.kickTimer = 0.2;
      this.player.spearSwingTimer = 0.3;
    }

    // Aim directly toward the Queen if she's on the field, otherwise straight at the King!
    const targetObj = !this.queenEaten ? this.queen : this.boss;
    const dx = targetObj.x - fromX;
    const dy = targetObj.y - fromY;
    const dist = Math.hypot(dx, dy) || 0.001;
    // Slower spear speed so you can see it clearly while throwing frequently!
    const spd = 0.72;
    this.spears.push({
      x: fromX,
      y: fromY,
      vx: (dx / dist) * spd,
      vy: (dy / dist) * spd,
      r: 0.022,
      thrower,
    });
    sound.kick(true);
    this._spawnParticles(fromX, fromY, '#fde047', 10);
    this._addFloatingText(fromX, fromY - 0.03, `🔱 ${thrower} הניף חנית!`, '#fde047');
    this._syncHud();
  }

  _consumeProtectionOrFail(reason, onSaved) {
    if (this.invulnTimer > 0) return false;

    // Permanent Golden Armor absorbs hits WITHOUT ever disappearing!
    if (this.goldenArmorLeft > 0) {
      this.invulnTimer = 0.95;
      this.shakeTime = 0.16;
      this.shakeMag = 6;
      sound.shieldBreak();
      this._spawnParticles(this.player.x, this.player.y, '#facc15', 22);
      this._addFloatingText(this.player.x, this.player.y - 0.05, '✨ שריון זהב הגן!', '#fde047');
      this.callbacks.onToast?.('✨ שריון הזהב הגן עליך ולא נעלם!', true);
      onSaved?.();
      this._syncHud();
      return true;
    }

    // Regular Cone Shield absorbs next
    if (this.shieldsLeft > 0) {
      this.shieldsLeft -= 1;
      this.invulnTimer = 0.75;
      this.shakeTime = 0.14;
      this.shakeMag = 5;
      sound.shieldBreak();
      this._spawnParticles(this.player.x, this.player.y, '#38bdf8', 16);
      this._addFloatingText(this.player.x, this.player.y - 0.04, '🛡️ המגן הציל אותך!', '#38bdf8');
      this.callbacks.onToast?.(`🛡️ מגן קונוסים הציל אותך! (נותרו ${this.shieldsLeft})`, true);
      onSaved?.();
      this._syncHud();
      return true;
    }

    this._triggerFail(reason);
    return false;
  }

  _triggerFail(reason) {
    if (this.state !== 'playing') return;
    this.state = 'restarting';
    this.restartTimer = 0.48;
    this.shakeTime = 0.25;
    this.shakeMag = 8;
    // Reset giant growth streak on fail
    this.giantScale = 1.0;
    this.callbacks.onGiantScaleChange?.(this.giantScale);
    sound.fail();
    this._spawnParticles(this.player.x, this.player.y, '#ef4444', 18);
    this.callbacks.onToast?.(reason, false);
  }

  _calcCoinAmount(baseAmount) {
    const diffMult = this.config.difficulty.coinMult;
    const magnetMult = 1 + (this.upgrades.magnet || 0) * 0.2;
    const armorMult = 1 + (this.upgrades.goldenArmor || 0) * 0.1;
    const auraMult = 1 + (this.upgrades.lightningAura || 0) * 0.15;
    return Math.max(1, Math.round(baseAmount * diffMult * magnetMult * armorMult * auraMult));
  }

  _triggerWin(skipWorlds = 0) {
    this.state = 'won';
    sound.win();
    this.shakeTime = 0.3;
    this.shakeMag = 6;
    this._spawnConfetti();
    // Bubble shower celebration on win ("ויש שם אדים ויש שם בועות ואז עוברים")!
    for (let i = 0; i < 24; i++) {
      this.bubbles.push({
        x: Math.random(),
        y: 0.65 + Math.random() * 0.35,
        r: 7 + Math.random() * 11,
        vy: -0.25 - Math.random() * 0.22,
        wobble: Math.random() * Math.PI * 2,
      });
    }

    const effectiveSkipWorlds = skipWorlds > 0 ? skipWorlds : this.queenBroken ? 2 : 0;
    const baseClear = (effectiveSkipWorlds > 0 ? 35 : 15) + Math.min(35, this.config.level * 2);
    const speedBonus = this.levelTime < 12 ? 10 : 0;
    const clearReward = this._calcCoinAmount(baseClear + speedBonus);
    this.levelCoinsEarned += clearReward;
    this.callbacks.onCoinsEarned?.(clearReward, 'win');

    this.callbacks.onWin?.({
      level: this.config.level,
      time: this.levelTime,
      coinsEarned: this.levelCoinsEarned,
      giantScale: this.giantScale,
      skipWorlds: effectiveSkipWorlds,
      isFinale: this.config.isFinale,
    });
  }

  _syncHud() {
    const w = this.config.world;
    const tod = w.timeOfDay;
    const ghostInterval = Math.max(3.2, 6.2 - (this.upgrades.ghostGun || 0) * 0.6);
    this.callbacks.onHudUpdate?.({
      level: this.config.level,
      worldName: `${w.emoji} ${w.name} • ${w.patternNameHe}`,
      timeLabel: `${tod.emoji} ${tod.clock} ${tod.label}`,
      hue: w.hue,
      bossHp: this.boss.hp,
      bossMaxHp: this.boss.maxHp,
      fireShots: this.fireShotsLeft,
      ghostShots: this.ghostShotsLeft,
      ghostMaxShots: this.ghostMaxShots,
      ghostProgress: this.ghostShotsLeft < this.ghostMaxShots ? this.ghostRechargeTimer / ghostInterval : 0,
      confuseCooldown: this.confuseCooldown,
      dragonCooldown: this.dragonCooldown,
      spearCooldown: this.spearCooldown,
      shieldsLeft: this.shieldsLeft,
      goldenArmorLeft: this.goldenArmorLeft,
      giantScale: this.giantScale,
      freezeTime: this.queenFreezeTimer,
      queenConfuseTime: this.queenConfuseTimer,
      bossConfuseTime: this.bossConfuseTimer,
      turboTime: this.turboTimer,
      difficulty: this.config.difficulty,
    });
  }

  update(dt) {
    this._updateWeather(dt);

    if (this.confetti.length > 0) {
      for (const c of this.confetti) {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vy += 0.45 * dt;
        c.rot += c.vrot * dt;
      }
      this.confetti = this.confetti.filter((c) => c.y < 1.2);
    }

    this._updateEffects(dt);

    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
    }

    if (this.state === 'restarting') {
      this.restartTimer -= dt;
      if (this.restartTimer <= 0) {
        this.loadLevel(this.config.level, true);
      }
      return;
    }

    if (this.state !== 'playing') return;

    this.levelTime += dt;

    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.player.kickTimer > 0) this.player.kickTimer = Math.max(0, this.player.kickTimer - dt);
    if (this.player.spearSwingTimer > 0) this.player.spearSwingTimer = Math.max(0, this.player.spearSwingTimer - dt);
    if (this.gunRecoilFire > 0) this.gunRecoilFire = Math.max(0, this.gunRecoilFire - dt);
    if (this.gunRecoilGhost > 0) this.gunRecoilGhost = Math.max(0, this.gunRecoilGhost - dt);

    let hudDirty = false;
    if (this.queenFreezeTimer > 0) {
      this.queenFreezeTimer = Math.max(0, this.queenFreezeTimer - dt);
      hudDirty = true;
    }
    if (this.queenConfuseTimer > 0) {
      this.queenConfuseTimer = Math.max(0, this.queenConfuseTimer - dt);
      hudDirty = true;
    }
    if (this.bossConfuseTimer > 0) {
      this.bossConfuseTimer = Math.max(0, this.bossConfuseTimer - dt);
      hudDirty = true;
    }
    if (this.queenRainSlowTimer > 0) {
      this.queenRainSlowTimer = Math.max(0, this.queenRainSlowTimer - dt);
    }
    if (this.queenVenomTimer > 0) {
      this.queenVenomTimer = Math.max(0, this.queenVenomTimer - dt);
      if (Math.random() < 0.35) this._spawnParticles(this.queen.x, this.queen.y, '#22c55e', 1);
    }
    if (this.bossVenomTimer > 0) {
      this.bossVenomTimer = Math.max(0, this.bossVenomTimer - dt);
      if (Math.random() < 0.35) this._spawnParticles(this.boss.x, this.boss.y, '#22c55e', 1);
      this.bossVenomTick -= dt;
      if (this.bossVenomTick <= 0 && this.boss.hp > 0) {
        this.bossVenomTick = 1.6;
        this.boss.hp = Math.max(0, this.boss.hp - 1);
        this.boss.hitFlash = 0.2;
        this._spawnParticles(this.boss.x, this.boss.y, '#22c55e', 18);
        this._addFloatingText(this.boss.x, this.boss.y + 0.05, '🧪 ארס! -1 ❤️', '#4ade80');
        this._syncHud();
        if (this.boss.hp <= 0) {
          this._triggerWin(0);
          return;
        }
      }
    }
    if (this.queenEaten && this.queenRespawnTimer > 0) {
      this.queenRespawnTimer = Math.max(0, this.queenRespawnTimer - dt);
      if (this.queenRespawnTimer <= 0) {
        this.queenEaten = false;
        this.queen.x = this.player.x;
        this._spawnParticles(this.queen.x, this.queen.y, '#c084fc', 14);
        this._addFloatingText(this.queen.x, this.queen.y - 0.04, '👑 המלכה חזרה!', '#e879f9');
      }
    }
    if (this.turboTimer > 0) {
      this.turboTimer = Math.max(0, this.turboTimer - dt);
      hudDirty = true;
    }
    if (this.confuseCooldown > 0) {
      this.confuseCooldown = Math.max(0, this.confuseCooldown - dt);
      hudDirty = true;
    }
    if (this.dragonCooldown > 0) {
      this.dragonCooldown = Math.max(0, this.dragonCooldown - dt);
      hudDirty = true;
    }
    if (this.spearCooldown > 0) {
      this.spearCooldown = Math.max(0, this.spearCooldown - dt);
      hudDirty = true;
    }

    // Morning rain actively interferes with Queen & King!
    this.rainInterfereTimer -= dt;
    if (this.rainInterfereTimer <= 0) {
      this.rainInterfereTimer = 4.2;
      this.queenRainSlowTimer = 2.1;
      this.bossRainSlowTimer = 2.1;
      this._spawnParticles(this.queen.x, this.queen.y, '#93c5fd', 10);
      this._spawnParticles(this.boss.x, this.boss.y, '#93c5fd', 10);
      this._addFloatingText(this.queen.x, this.queen.y - 0.04, '🌧️ הגשם מפריע למלכה!', '#bae6fd');
      this._addFloatingText(this.boss.x, this.boss.y + 0.04, '🌧️ הגשם מפריע למלך!', '#bae6fd');
    }

    // Ghost Gun auto-recharge
    const ghostInterval = Math.max(3.2, 6.2 - (this.upgrades.ghostGun || 0) * 0.6);
    if (this.ghostShotsLeft < this.ghostMaxShots) {
      this.ghostRechargeTimer += dt;
      if (this.ghostRechargeTimer >= ghostInterval) {
        this.ghostRechargeTimer = 0;
        this.ghostShotsLeft += 1;
      }
      hudDirty = true;
    }

    if (!this.player.hasBall) {
      this.ballCooldown -= dt;
      if (this.ballCooldown <= 0) {
        this.player.hasBall = true;
      }
    }

    this._updateDecoys(dt);
    this._updateHelpers(dt);
    this._updateGuardianGuards(dt);
    this._updatePlayer(dt);
    this._updateQueen(dt);
    this._updateBoss(dt);
    this._updateDragons(dt);
    this._updateRockets(dt);
    this._updateDefenders(dt);
    this._updateBalls(dt);
    this._updateSpears(dt);
    this._updateHazards(dt);
    this._updatePowerups(dt);
    this._updateCoins(dt);

    if (hudDirty) this._syncHud();
  }

  _updateHelpers(dt) {
    for (const h of this.helpers) {
      if (h.kickTimer > 0) h.kickTimer = Math.max(0, h.kickTimer - dt);
      if (h.stunTimer > 0) {
        h.stunTimer = Math.max(0, h.stunTimer - dt);
        continue;
      }
      h.phase += dt * 3.4;

      // Ron & Hermione stay beside Harry (left & right) AND actively try to dodge incoming stars!
      let dodgeOffset = 0;
      for (const hz of this.hazards) {
        if (hz.y < h.y && h.y - hz.y < 0.22 && Math.abs(hz.x - h.x) < 0.09) {
          dodgeOffset = hz.x >= h.x ? -0.09 : 0.09;
          break;
        }
      }
      const targetX = Math.max(
        0.07,
        Math.min(0.93, this.player.x + h.offsetX + Math.sin(h.phase) * 0.018 + dodgeOffset)
      );
      const targetY = Math.max(0.42, Math.min(0.86, this.player.y + h.offsetY + Math.cos(h.phase * 1.2) * 0.015));
      h.x += (targetX - h.x) * Math.min(1, 9.5 * dt);
      h.y += (targetY - h.y) * Math.min(1, 9.5 * dt);

      // Stars hit Ron/Hermione ONLY if they fail to dodge (and don't have Golden Armor), OR they guard Harry!
      for (let i = this.hazards.length - 1; i >= 0; i--) {
        const hz = this.hazards[i];
        const hitHelperDirectly = this._distAspect(h.x, h.y, hz.x, hz.y) < h.r + hz.r;
        const nearHarry = this._distAspect(this.player.x, this.player.y, hz.x, hz.y) < 0.16;

        if (hitHelperDirectly) {
          if (this.goldenArmorLeft > 0) {
            this._spawnParticles(hz.x, hz.y, '#facc15', 10);
            this._addFloatingText(h.x, h.y - 0.04, `✨ שריון ${h.label} חסם!`, '#fde047');
          } else {
            h.stunTimer = 2.2;
            this._spawnParticles(h.x, h.y, '#f87171', 12);
            this._addFloatingText(h.x, h.y - 0.04, `💫 ${h.label} נפגע מכוכב!`, '#fca5a5');
          }
          sound.shieldBreak();
          this.hazards.splice(i, 1);
        } else if (nearHarry) {
          this._spawnParticles(hz.x, hz.y, '#60a5fa', 12);
          this._addFloatingText(h.x, h.y - 0.04, `🛡️ ${h.label} שומר על הארי!`, '#93c5fd');
          sound.shieldBreak();
          this.hazards.splice(i, 1);
        }
      }

      // Guard Harry: push away/block moving defenders anywhere near Harry or his helpers (immortal!)
      for (let i = this.defenders.length - 1; i >= 0; i--) {
        const d = this.defenders[i];
        const nearHelper = this._distAspect(h.x, h.y, d.x, d.y) < (h.r + d.r) * 1.6;
        const nearHarry = this._distAspect(this.player.x, this.player.y, d.x, d.y) < 0.14;
        if (nearHelper || nearHarry) {
          d.dir = d.x >= this.player.x ? 1 : -1;
          d.x += d.dir * 0.06;
          this._spawnParticles(d.x, d.y, '#93c5fd', 10);
          this._addFloatingText(h.x, h.y - 0.04, `🛡️ ${h.label} הדף שומר!`, '#bae6fd');
        }
      }

      // Ron & Hermione kick assist balls toward the King!
      h.shootTimer -= dt;
      if (h.shootTimer <= 0) {
        h.shootTimer = 5.6;
        h.kickTimer = 0.24;
        const aimVx = (this.boss.x - h.x) * 0.55;
        this.balls.push({
          x: h.x,
          y: h.y - h.r,
          vx: Math.max(-0.32, Math.min(0.32, aimVx)),
          vy: -0.92,
          r: 0.02,
          kind: 'helper',
          pierceQueen: false,
          damage: 1,
          spin: 0,
        });
        sound.kick(false);
        this._spawnParticles(h.x, h.y - 0.02, '#60a5fa', 7);
        this._addFloatingText(h.x, h.y - 0.04, `${h.label} בעט! ⚽`, '#93c5fd');
      }

      // Ron & Hermione also throw spears frequently!
      h.spearTimer -= dt;
      if (h.spearTimer <= 0) {
        const spearLvl = this.upgrades.spearMaster || 0;
        h.spearTimer = Math.max(2.2, 3.8 - spearLvl * 0.35);
        h.kickTimer = 0.22;
        this.throwSpear(h.label, h.x, h.y - h.r, true);
      }
    }
  }

  _updateGuardianGuards(dt) {
    // Friendly Guardian-of-Guards patrol the pitch and NEVER hurt Harry!
    for (const g of this.guardianGuards) {
      g.x += g.vx * dt;
      if (g.x < 0.09) {
        g.x = 0.09;
        g.vx = Math.abs(g.vx);
      } else if (g.x > 0.91) {
        g.x = 0.91;
        g.vx = -Math.abs(g.vx);
      }

      // Block Queen's hazard stars and push away enemy defenders!
      for (let i = this.hazards.length - 1; i >= 0; i--) {
        const hz = this.hazards[i];
        if (this._distAspect(g.x, g.y, hz.x, hz.y) < (g.r + hz.r) * 1.5) {
          this._spawnParticles(hz.x, hz.y, '#34d399', 8);
          this.hazards.splice(i, 1);
        }
      }
      for (const d of this.defenders) {
        if (this._distAspect(g.x, g.y, d.x, d.y) < (g.r + d.r) * 1.4) {
          d.dir *= -1;
          d.x += d.dir * 0.05;
        }
      }
    }
  }

  _updateSpears(dt) {
    for (let i = this.spears.length - 1; i >= 0; i--) {
      const s = this.spears[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      this._spawnParticles(s.x, s.y, '#fef08a', 1);

      // Spears thrown by Harry, Ron, or Hermione knock away Queen's spinning stars mid-air!
      for (let hi = this.hazards.length - 1; hi >= 0; hi--) {
        const hz = this.hazards[hi];
        if (this._distAspect(s.x, s.y, hz.x, hz.y) < s.r + hz.r * 1.45) {
          this._spawnParticles(hz.x, hz.y, '#fde047', 12);
          this._addFloatingText(hz.x, hz.y, '🔱💥 כוכב הועף!', '#fde047');
          this.hazards.splice(hi, 1);
        }
      }

      // Spear applies Venom (ארס) & stuns Queen if it passes her
      if (!this.queenEaten && this._distAspect(s.x, s.y, this.queen.x, this.queen.y) < s.r + this.queen.r) {
        this.queenConfuseTimer = Math.max(this.queenConfuseTimer, 2.0);
        this.queenVenomTimer = 4.5;
        this._spawnParticles(this.queen.x, this.queen.y, '#22c55e', 14);
        this._addFloatingText(this.queen.x, this.queen.y - 0.04, '🔱🧪 חנית ארס!', '#4ade80');
      }

      // Spear hits the King -> applies Venom (ארס) + counts as a Boss hit & grows Harry!
      if (this._distAspect(s.x, s.y, this.boss.x, this.boss.y) < s.r + this.boss.r * 1.1) {
        this.boss.hp = Math.max(0, this.boss.hp - 1);
        this.boss.hitFlash = 0.22;
        this.bossVenomTimer = 4.5;
        this.bossVenomTick = 1.5;
        sound.bossHit(true);
        this._spawnParticles(this.boss.x, this.boss.y, '#22c55e', 22);
        this.giantScale = Math.min(1.65, Number((this.giantScale + 0.16).toFixed(2)));
        this.callbacks.onGiantScaleChange?.(this.giantScale);
        this.spears.splice(i, 1);
        this._syncHud();

        if (this.boss.hp <= 0) {
          this._triggerWin(0);
          return;
        }
        continue;
      }

      if (s.y < -0.05 || s.y > 1.05 || s.x < -0.05 || s.x > 1.05) {
        this.spears.splice(i, 1);
      }
    }
  }

  _updateDragons(dt) {
    // Update Dragon Rockets (fired by Dragons at Queen & King!)
    for (let i = this.dragonRockets.length - 1; i >= 0; i--) {
      const dr = this.dragonRockets[i];
      dr.x += dr.vx * dt;
      dr.y += dr.vy * dt;
      this._spawnParticles(dr.x, dr.y, '#f97316', 1);

      if (!this.queenEaten && this._distAspect(dr.x, dr.y, this.queen.x, this.queen.y) < dr.r + this.queen.r) {
        this.queenFreezeTimer = Math.max(this.queenFreezeTimer, 1.5);
        this._spawnParticles(this.queen.x, this.queen.y, '#f97316', 16);
        this._addFloatingText(this.queen.x, this.queen.y - 0.04, '🚀 טיל דרקון!', '#fb923c');
        this.dragonRockets.splice(i, 1);
        continue;
      }

      if (this._distAspect(dr.x, dr.y, this.boss.x, this.boss.y) < dr.r + this.boss.r) {
        this._spawnParticles(this.boss.x, this.boss.y, '#f97316', 22);
        this.dragonRockets.splice(i, 1);
        this.callbacks.onToast?.('🐉🚀 טיל הדרקון פגע במלך! עוברים עולם!', true);
        this._triggerWin(1);
        return;
      }

      if (dr.y < -0.05 || dr.y > 1.05 || dr.x < -0.05 || dr.x > 1.05) {
        this.dragonRockets.splice(i, 1);
      }
    }

    // Update Tail Whip Arcs
    for (let i = this.tailWhipArcs.length - 1; i >= 0; i--) {
      this.tailWhipArcs[i].life -= dt;
      if (this.tailWhipArcs[i].life <= 0) this.tailWhipArcs.splice(i, 1);
    }

    // Update Dragons swooping in (completely immune to all balls!)
    for (const d of this.dragons) {
      d.wingPhase += dt * 12;
      const targetPos = d.target === 'queen' && !this.queenEaten ? this.queen : this.boss;
      const dx = targetPos.x - d.x;
      const dy = targetPos.y - d.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const flySpeed = 0.34 + (this.upgrades.dragonMaster || 0) * 0.045;
      d.x += (dx / dist) * flySpeed * dt;
      d.y += (dy / dist) * flySpeed * dt;

      // Dragons shoot missiles!
      d.rocketTimer -= dt;
      if (d.rocketTimer <= 0) {
        d.rocketTimer = 1.1;
        this.dragonRockets.push({
          x: d.x,
          y: d.y - 0.02,
          vx: (dx / dist) * 0.62,
          vy: (dy / dist) * 0.62,
          r: 0.024,
        });
        sound.rocket();
      }

      // Dragons perform Tail Whip!
      d.whipTimer -= dt;
      if (d.whipTimer <= 0 && dist < 0.22) {
        d.whipTimer = 1.3;
        this.tailWhipArcs.push({ x: d.x, y: d.y, r: 0.095, life: 0.28, maxLife: 0.28 });
        this._addFloatingText(d.x, d.y + 0.04, '💥 הצלפת זנב!', '#34d399');
        this.shakeTime = 0.14;
        this.shakeMag = 5;
      }

      // Eat the Queen!
      if (!this.queenEaten && this._distAspect(d.x, d.y, this.queen.x, this.queen.y) < d.r + this.queen.r * 0.8) {
        this.queenEaten = true;
        this._spawnParticles(this.queen.x, this.queen.y, '#e879f9', 26);
        this._addFloatingText(this.queen.x, this.queen.y - 0.04, '🐉 הדרקון אכל את המלכה!', '#34d399');
        sound.dragon();
        d.target = 'boss';
      }

      // Eat the King -> Advance to Next World!
      if (this._distAspect(d.x, d.y, this.boss.x, this.boss.y) < d.r + this.boss.r * 0.9) {
        this._spawnParticles(this.boss.x, this.boss.y, '#facc15', 32);
        this._addFloatingText(this.boss.x, this.boss.y + 0.05, '🐉 הדרקון אכל את המלך! עולם הבא!', '#fde047');
        this.callbacks.onToast?.('🐉 הדרקונים אכלו את המלכה והמלך! עוברים עולם!', true);
        sound.dragon();
        this._triggerWin(1);
        return;
      }
    }
  }

  _updateRockets(dt) {
    // Hovering rockets patrol behind the King so he cannot turn/retreat back
    for (const r of this.kingRockets) {
      r.x += r.vx * dt;
      if (r.x < 0.12) {
        r.x = 0.12;
        r.vx = Math.abs(r.vx);
      } else if (r.x > 0.88) {
        r.x = 0.88;
        r.vx = -Math.abs(r.vx);
      }
    }

    // Periodically launch a diving rocket from behind the King (faster if King is confused or in a pit!)
    const rate = this.bossPitTimer > 0 || this.bossConfuseTimer > 0 ? 1.8 : 1.0;
    this.rocketDiveTimer -= dt * rate;
    if (this.rocketDiveTimer <= 0) {
      this.rocketDiveTimer = 7.2;
      const launcher = this.kingRockets[Math.floor(Math.random() * this.kingRockets.length)];
      this.divingRockets.push({
        x: launcher.x,
        y: launcher.y + 0.015,
        vx: (this.boss.x - launcher.x) * 0.65,
        vy: 0.28,
        r: 0.026,
      });
      sound.rocket();
    }

    for (let i = this.divingRockets.length - 1; i >= 0; i--) {
      const dr = this.divingRockets[i];
      dr.x += dr.vx * dt;
      dr.y += dr.vy * dt;
      this._spawnParticles(dr.x, dr.y - 0.015, '#f97316', 1);

      // If rocket hits the King -> Skip straight to the NEXT WORLD!
      const distBoss = this._distAspect(dr.x, dr.y, this.boss.x, this.boss.y);
      if (distBoss < dr.r + this.boss.r * 0.92) {
        this._spawnParticles(this.boss.x, this.boss.y, '#f97316', 28);
        this._addFloatingText(this.boss.x, this.boss.y + 0.04, '🚀 טיל פגע במלך! עולם הבא!', '#fde047');
        this.callbacks.onToast?.('🚀 טיל פגע במלך! עוברים לעולם הבא!', true);
        this.divingRockets.splice(i, 1);
        this._triggerWin(1);
        return;
      }

      if (dr.y > 0.36 || dr.x < 0 || dr.x > 1) {
        this.divingRockets.splice(i, 1);
      }
    }
  }

  _updateDecoys(dt) {
    for (let i = this.decoys.length - 1; i >= 0; i--) {
      const d = this.decoys[i];
      d.phase += dt * 10;
      d.x += (d.vx + Math.sin(d.phase) * 0.25) * dt;
      d.y += d.vy * dt;
      d.life -= dt;
      if (d.x < 0.08) {
        d.x = 0.08;
        d.vx = Math.abs(d.vx);
      } else if (d.x > 0.92) {
        d.x = 0.92;
        d.vx = -Math.abs(d.vx);
      }
      if (d.y < 0.38) {
        d.vy = Math.abs(d.vy) * 0.4;
      } else if (d.y > 0.84) {
        d.vy = -Math.abs(d.vy);
      }
      if (d.life <= 0) this.decoys.splice(i, 1);
    }
  }

  _updateWeather(dt) {
    const weather = this.config.world.weather;

    // Vegetable Rain (falling straight down, NO wind!)
    for (const drop of this.rainDrops) {
      drop.y += drop.speed * dt;
      if (drop.y > 1.04) {
        if (Math.random() < 0.35 && this.rainSplashes.length < 25) {
          this.rainSplashes.push({
            x: drop.x,
            y: 0.12 + Math.random() * 0.82,
            r: 2,
            maxR: 6 + Math.random() * 4,
            life: 0.25,
            maxLife: 0.25,
          });
        }
        drop.y = -0.05;
        drop.x = Math.random();
      }
    }

    // Rising Steam puffs
    for (const st of this.steamPuffs) {
      st.y += st.vy * dt;
      if (st.y < -0.08) {
        st.y = 1.05;
        st.x = Math.random();
      }
    }

    // Floating Bubbles (and extra bubbles rising on win!)
    for (const b of this.bubbles) {
      b.wobble += dt * 4;
      b.y += b.vy * dt;
      b.x += Math.sin(b.wobble) * 0.025 * dt;
      if (b.y < -0.06) {
        b.y = 1.06;
        b.x = Math.random();
      }
    }

    for (let i = this.rainSplashes.length - 1; i >= 0; i--) {
      const s = this.rainSplashes[i];
      s.life -= dt;
      s.r += 16 * dt;
      if (s.life <= 0) this.rainSplashes.splice(i, 1);
    }

    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt);
    }

    for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
      this.lightningBolts[i].life -= dt;
      if (this.lightningBolts[i].life <= 0) {
        this.lightningBolts.splice(i, 1);
      }
    }

    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0) {
      const minT = weather.lightningIntervalMin;
      const maxT = weather.lightningIntervalMax;
      this.lightningTimer = minT + Math.random() * (maxT - minT);
      this.triggerLightning();
    }
  }

  _updatePlayer(dt) {
    const speedUpgradeMult = 1 + (this.upgrades.speed || 0) * 0.12;
    const baseSpeed = (this.turboTimer > 0 ? 0.66 : 0.46) * speedUpgradeMult;
    let ix = 0;
    let iy = 0;

    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) ix -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) ix += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) iy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) iy += 1;

    if (ix !== 0 || iy !== 0) {
      const len = Math.hypot(ix, iy);
      ix /= len;
      iy /= len;
      const accel = this.config.world.slippery ? 5.5 : 18;
      this.player.vx += (ix * baseSpeed - this.player.vx) * Math.min(1, accel * dt);
      this.player.vy += (iy * baseSpeed - this.player.vy) * Math.min(1, accel * dt);
    } else if (!this.pointer.active) {
      const friction = this.config.world.slippery ? 2.8 : 14;
      this.player.vx *= Math.max(0, 1 - friction * dt);
      this.player.vy *= Math.max(0, 1 - friction * dt);
    }

    const prevX = this.player.x;
    const prevY = this.player.y;

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    const minX = 0.06;
    const maxX = 0.94;
    const minY = 0.41;
    const maxY = 0.86; // Keeps player cleanly above bottom mobile control bar
    this.player.x = Math.max(minX, Math.min(maxX, this.player.x));
    this.player.y = Math.max(minY, Math.min(maxY, this.player.y));

    // Fire Fences are completely impassable barriers! Player CANNOT cross through them!
    for (const fence of this.fireFences) {
      const closestX = Math.max(fence.x1, Math.min(this.player.x, fence.x2));
      const dist = this._distAspect(this.player.x, this.player.y, closestX, fence.y);
      const minDist = this.player.r * 0.72 + fence.thickness * 0.95;
      if (dist < minDist) {
        // Push Harry physically back so he can NEVER pass through the Fire Fence!
        this.player.x = prevX;
        this.player.y = prevY >= fence.y ? Math.max(fence.y + minDist * 0.7, prevY) : Math.min(fence.y - minDist * 0.7, prevY);
        this.player.vx = 0;
        this.player.vy = 0;
        this._consumeProtectionOrFail('אי אפשר לעבור את גדר האש! 🔥', () => {
          this.player.y = prevY >= fence.y ? Math.min(0.85, fence.y + 0.06) : Math.max(0.42, fence.y - 0.06);
        });
        return;
      }
    }

    const speedMag = Math.hypot(this.player.vx, this.player.vy);
    this.player.ballSpin += speedMag * dt * 20;

    // Cone collision uses base player.r so growing giant never penalizes dodging!
    const hitboxMult = this.config.coneHitboxMult;
    for (let i = this.playerCones.length - 1; i >= 0; i--) {
      const cone = this.playerCones[i];
      const dist = this._distAspect(this.player.x, this.player.y, cone.x, cone.y);
      if (dist < (this.player.r + cone.r) * hitboxMult) {
        this._consumeProtectionOrFail(`נתקעת בקונוס! מנסים את שלב ${this.config.level} שוב 🚧`, () => {
          this._spawnParticles(cone.x, cone.y, '#f97316', 14);
          this.playerCones.splice(i, 1);
        });
        return;
      }
    }

    for (let i = this.queenCones.length - 1; i >= 0; i--) {
      const cone = this.queenCones[i];
      const dist = this._distAspect(this.player.x, this.player.y, cone.x, cone.y);
      if (dist < (this.player.r + cone.r) * hitboxMult) {
        this._consumeProtectionOrFail(`נתקעת בקונוס! מנסים את שלב ${this.config.level} שוב 🚧`, () => {
          this._spawnParticles(cone.x, cone.y, '#f97316', 14);
          this.queenCones.splice(i, 1);
        });
        return;
      }
    }

    // Check Queen collision (after Fire Fence barrier check)
    const distQueen = this._distAspect(this.player.x, this.player.y, this.queen.x, this.queen.y);
    if (!this.queenEaten && distQueen < (this.player.r + this.queen.r) * 0.82 && this.queenConfuseTimer <= 0) {
      this._consumeProtectionOrFail('המלכה חטפה לך את הכדור! 👑', () => {
        this.player.y = Math.min(0.85, this.player.y + 0.08);
      });
      return;
    }
  }

  _updateQueen(dt) {
    if (this.queenEaten) return;
    if (this.queen.blockFlash > 0) {
      this.queen.blockFlash = Math.max(0, this.queen.blockFlash - dt);
    }

    if (this.queenFreezeTimer > 0) {
      return;
    }

    const rageMult = 1 + (this.boss.maxHp - this.boss.hp) * 0.07;
    // Rain actively slows down/interferes with the Queen!
    const rainMult = this.queenRainSlowTimer > 0 ? 0.62 : 0.82;
    const maxSpd = this.config.queenSpeed * rageMult * rainMult;

    let targetX = this.player.x;
    if (this.queenConfuseTimer > 0) {
      // Confused Queen ALWAYS moves away from Harry's lane so the shot path is wide open!
      targetX = this.player.x < 0.5 ? 0.86 : 0.14;
    } else {
      const incoming = this.balls.find((b) => b.vy < 0 && !b.pierceQueen && b.y > this.queen.y - 0.03);
      if (incoming) {
        targetX = incoming.x;
      }
    }

    const dx = targetX - this.queen.x;
    const desiredVx = Math.max(-maxSpd, Math.min(maxSpd, dx * (this.queenConfuseTimer > 0 ? 4.5 : 3.4)));
    this.queen.vx += (desiredVx - this.queen.vx) * Math.min(1, 9 * dt);
    this.queen.x += this.queen.vx * dt;
    this.queen.x = Math.max(0.09, Math.min(0.91, this.queen.x));

    // Zigzag slalom Y computation
    let targetY = 0.31;
    let nearestCone = null;
    let nearestDistX = 999;
    for (const cone of this.queenCones) {
      const adx = Math.abs(this.queen.x - cone.x);
      if (adx < nearestDistX) {
        nearestDistX = adx;
        nearestCone = cone;
      }
    }
    if (nearestCone && nearestDistX < 0.16) {
      const influence = 1 - nearestDistX / 0.16;
      const weaveDir = nearestCone.y < 0.31 ? 1 : -1;
      targetY = 0.31 + weaveDir * 0.058 * influence;
    }

    this.queen.y += (targetY - this.queen.y) * Math.min(1, 10 * dt);
    this.queen.slidePhase += Math.abs(this.queen.vx) * dt * 12;

    // Confused Queen cannot throw obstacles!
    if (this.config.queenShotInterval > 0 && this.queenConfuseTimer <= 0) {
      this.queenShotTimer -= dt;
      if (this.queenShotTimer <= 0) {
        this.queenShotTimer = this.config.queenShotInterval;
        const aimDx = (this.player.x - this.queen.x) * 0.45;
        this.hazards.push({
          x: this.queen.x,
          y: this.queen.y + this.queen.r,
          vx: Math.max(-0.22, Math.min(0.22, aimDx)),
          vy: this.config.queenShotSpeed,
          r: 0.025,
          rot: 0,
        });
      }
    }
  }

  _updateBoss(dt) {
    if (this.boss.hitFlash > 0) {
      this.boss.hitFlash = Math.max(0, this.boss.hitFlash - dt);
    }
    this.boss.angryPhase += dt * (4 + (this.boss.maxHp - this.boss.hp) * 1.1);

    // Update King Pits cooldowns
    for (const pit of this.kingPits) {
      if (pit.cooldown > 0) pit.cooldown = Math.max(0, pit.cooldown - dt);
    }

    // Check if King is currently trapped inside a Pit!
    if (this.bossPitTimer > 0) {
      this.bossPitTimer = Math.max(0, this.bossPitTimer - dt);
      return;
    }

    const rageMult = 1 + (this.boss.maxHp - this.boss.hp) * 0.09;
    // Rain actively interferes with the King!
    const rainMult = this.bossRainSlowTimer > 0 ? 0.65 : 0.84;
    const speed = this.config.bossSpeed * rageMult * rainMult;

    if (this.bossConfuseTimer > 0) {
      // Confused King ALWAYS wanders right into Harry's front lane instead of dodging!
      const targetVx = (this.player.x - this.boss.x) * 3.2;
      this.boss.vx += (targetVx - this.boss.vx) * Math.min(1, 7 * dt);
    } else {
      let threat = null;
      for (const b of this.balls) {
        if (b.vy < 0 && b.y < 0.52 && b.y > this.boss.y) {
          threat = b;
          break;
        }
      }

      if (threat && Math.abs(threat.x - this.boss.x) < 0.18) {
        let dodgeDir = this.boss.x >= threat.x ? 1 : -1;
        if (this.boss.x > 0.82) dodgeDir = -1;
        if (this.boss.x < 0.18) dodgeDir = 1;
        const targetVx = dodgeDir * speed * (1 + this.config.bossDodgeReaction * 0.65);
        this.boss.vx += (targetVx - this.boss.vx) * Math.min(1, 8 * dt);
      } else if (Math.abs(this.boss.vx) < speed * 0.6) {
        this.boss.vx = (this.boss.vx >= 0 ? 1 : -1) * speed * 0.8;
      }
    }

    this.boss.x += this.boss.vx * dt;
    // Rockets behind the King prevent him from retreating upward/turning back!
    this.boss.y = 0.105;

    if (this.boss.x < 0.11) {
      this.boss.x = 0.11;
      this.boss.vx = Math.abs(this.boss.vx);
    } else if (this.boss.x > 0.89) {
      this.boss.x = 0.89;
      this.boss.vx = -Math.abs(this.boss.vx);
    }

    // Check if King falls into one of the Pits!
    for (const pit of this.kingPits) {
      if (pit.cooldown <= 0 && Math.abs(this.boss.x - pit.x) < pit.r * 0.8) {
        this.bossPitTimer = 1.85;
        pit.cooldown = 5.5;
        sound.pit();
        this._spawnParticles(pit.x, pit.y, '#78350f', 16);
        this._addFloatingText(this.boss.x, this.boss.y + 0.05, '🕳️ המלך נפל לבור!', '#fde047');
        break;
      }
    }
  }

  _updateDefenders(dt) {
    for (let i = this.defenders.length - 1; i >= 0; i--) {
      const d = this.defenders[i];
      d.x += d.dir * d.speed * dt;
      if (d.x < 0.1) {
        d.x = 0.1;
        d.dir = 1;
      } else if (d.x > 0.9) {
        d.x = 0.9;
        d.dir = -1;
      }

      const dist = this._distAspect(this.player.x, this.player.y, d.x, d.y);
      if (dist < (this.player.r + d.r) * 0.78) {
        this._consumeProtectionOrFail('נתקעת בשומר! מתחילים מחדש 🛡️', () => {
          this._spawnParticles(d.x, d.y, '#f87171', 14);
          this.defenders.splice(i, 1);
        });
        return;
      }
    }
  }

  _updateBalls(dt) {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.spin += dt * 24;

      if (b.kind === 'fire') {
        this._spawnParticles(b.x, b.y + 0.01, '#fb923c', 1);
      } else if (b.kind === 'ghost') {
        this._spawnParticles(b.x, b.y + 0.01, '#38bdf8', 1);
      }

      if (b.x < 0.04) {
        b.x = 0.04;
        b.vx = Math.abs(b.vx);
      } else if (b.x > 0.96) {
        b.x = 0.96;
        b.vx = -Math.abs(b.vx);
      }

      if (b.y < -0.05 || b.y > 1.05) {
        this.balls.splice(i, 1);
        continue;
      }

      // Balls shatter/break the Queen on impact (she respawns shortly after so you can break her again & again!)
      if (!this.queenEaten && b.vy < 0) {
        const dq = this._distAspect(b.x, b.y, this.queen.x, this.queen.y);
        if (dq < b.r + this.queen.r * 0.95) {
          this.queenBroken = true;
          this.queenEaten = true;
          this.queenRespawnTimer = 2.0;
          this.shakeTime = 0.22;
          this.shakeMag = 7;
          sound.shieldBreak();
          this._spawnParticles(this.queen.x, this.queen.y, '#e879f9', 26);
          this._spawnParticles(this.queen.x, this.queen.y, '#fde047', 14);
          this._addFloatingText(this.queen.x, this.queen.y - 0.04, '💥 המלכה נשברה! (+2 עולמות בניצחון)', '#f0abfc');
          this.callbacks.onToast?.('💥 הכדור שבר את המלכה! ניצחון יעביר 2 עולמות!', true);
        }
      }

      // Boss (King) hit check -> Player grows bigger!
      if (b.vy < 0) {
        const db = this._distAspect(b.x, b.y, this.boss.x, this.boss.y);
        if (db < b.r + this.boss.r * 1.12) {
          const dmg = Math.min(this.boss.hp, b.damage);
          this.boss.hp = Math.max(0, this.boss.hp - dmg);
          this.boss.hitFlash = 0.22;
          this.shakeTime = 0.16;
          this.shakeMag = b.kind === 'fire' ? 9 : 6;
          sound.bossHit(b.kind === 'fire');
          this._spawnParticles(
            b.x,
            b.y,
            b.kind === 'fire' ? '#f97316' : b.kind === 'ghost' ? '#38bdf8' : '#facc15',
            22
          );

          // Whoever hits the King grows bigger!
          this.giantScale = Math.min(1.65, Number((this.giantScale + 0.16).toFixed(2)));
          this.callbacks.onGiantScaleChange?.(this.giantScale);
          this._spawnParticles(this.player.x, this.player.y, '#4ade80', 14);
          this._addFloatingText(this.player.x, this.player.y - 0.06, 'גדלת! 💪✨', '#4ade80');

          const hitCoins = this._calcCoinAmount(5);
          this.levelCoinsEarned += hitCoins;
          this.callbacks.onCoinsEarned?.(hitCoins, 'hit');

          this._addFloatingText(
            this.boss.x,
            this.boss.y + 0.04,
            this.boss.hp <= 0 ? `ניצחון! +${hitCoins}🪙` : `-${dmg} ❤️ (+${hitCoins}🪙)`,
            '#fde047'
          );
          this.balls.splice(i, 1);
          this._syncHud();

          if (this.boss.hp <= 0) {
            this._triggerWin();
            return;
          }
        }
      }
    }
  }

  _updateHazards(dt) {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rot += dt * 7;

      if (h.y > 1.05 || h.x < -0.05 || h.x > 1.05) {
        this.hazards.splice(i, 1);
        continue;
      }

      const dp = this._distAspect(h.x, h.y, this.player.x, this.player.y);
      if (dp < (h.r + this.player.r) * 0.78) {
        this._consumeProtectionOrFail('נפגעת ממכשול של המלכה! 💥', () => {
          this.hazards.splice(i, 1);
        });
        return;
      }
    }
  }

  _updatePowerups(dt) {
    const luckBonus = (this.upgrades.veggieLuck || 0) * 0.55;
    this.powerupTimer -= dt * (1 + luckBonus * 0.35);
    if (this.powerupTimer <= 0 && this.powerups.length < 2 + Math.floor(luckBonus)) {
      this.powerupTimer = this.config.powerupInterval;
      const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
      for (let attempt = 0; attempt < 10; attempt++) {
        const px = 0.16 + Math.random() * 0.68;
        const py = 0.48 + Math.random() * 0.34;
        const tooClose = this.playerCones.some((c) => this._distAspect(px, py, c.x, c.y) < 0.09);
        if (!tooClose) {
          this.powerups.push({ x: px, y: py, r: 0.032, type, life: 9.5, bob: Math.random() * Math.PI * 2 });
          break;
        }
      }
    }

    const magnetLvl = this.upgrades.magnet || 0;
    const pullRadius = 0.07 + magnetLvl * 0.045;

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.life -= dt;
      p.bob += dt * 5;
      if (p.life <= 0) {
        this.powerups.splice(i, 1);
        continue;
      }

      const dp = this._distAspect(p.x, p.y, this.player.x, this.player.y);
      if (magnetLvl > 0 && dp < pullRadius) {
        p.x += (this.player.x - p.x) * Math.min(1, (4 + magnetLvl * 1.5) * dt);
        p.y += (this.player.y - p.y) * Math.min(1, (4 + magnetLvl * 1.5) * dt);
      }

      if (dp < p.r + this.player.r) {
        sound.powerup();
        if (p.type.id === 'fire') {
          this.fireShotsLeft += 2;
        } else if (p.type.id === 'ghost') {
          this.ghostShotsLeft = Math.min(this.ghostMaxShots + 2, this.ghostShotsLeft + 2);
        } else if (p.type.id === 'confuse') {
          this.triggerConfuse(true);
        } else if (p.type.id === 'dragon') {
          this.summonDragons(true);
        } else if (p.type.id === 'freeze') {
          this.queenFreezeTimer = 3.5;
        } else if (p.type.id === 'turbo') {
          this.turboTimer = 4.2;
        }
        this._spawnParticles(p.x, p.y, p.type.color, 14);
        this._addFloatingText(p.x, p.y - 0.03, p.type.label, p.type.color);
        this.callbacks.onToast?.(`${p.type.emoji} ${p.type.label}!`, true);
        this.powerups.splice(i, 1);
        this._syncHud();
      }
    }
  }

  _updateCoins(dt) {
    this.coinSpawnTimer -= dt;
    if (this.coinSpawnTimer <= 0 && this.coins.length < 5) {
      this.coinSpawnTimer = 3.6;
      for (let attempt = 0; attempt < 10; attempt++) {
        const cx = 0.15 + Math.random() * 0.7;
        const cy = 0.45 + Math.random() * 0.36;
        const tooClose = this.playerCones.some((c) => this._distAspect(cx, cy, c.x, c.y) < 0.085);
        if (!tooClose) {
          this.coins.push({ x: cx, y: cy, r: 0.025, bob: Math.random() * Math.PI * 2 });
          break;
        }
      }
    }

    const magnetLvl = this.upgrades.magnet || 0;
    const pullRadius = 0.08 + magnetLvl * 0.055;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.bob += dt * 6;
      const dist = this._distAspect(c.x, c.y, this.player.x, this.player.y);

      if (dist < pullRadius) {
        const pullSpeed = 5 + magnetLvl * 2.2;
        c.x += (this.player.x - c.x) * Math.min(1, pullSpeed * dt);
        c.y += (this.player.y - c.y) * Math.min(1, pullSpeed * dt);
      }

      if (dist < c.r + this.player.r * 1.05) {
        const amount = this._calcCoinAmount(5);
        this.levelCoinsEarned += amount;
        sound.coin();
        this._spawnParticles(c.x, c.y, '#facc15', 10);
        this._addFloatingText(c.x, c.y - 0.02, `+${amount} 🪙`, '#fde047');
        this.callbacks.onCoinsEarned?.(amount, 'pickup');
        this.coins.splice(i, 1);
      }
    }
  }

  _updateEffects(dt) {
    for (let i = this.muzzleBeams.length - 1; i >= 0; i--) {
      this.muzzleBeams[i].life -= dt;
      if (this.muzzleBeams[i].life <= 0) this.muzzleBeams.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y -= 0.09 * dt;
      t.life -= dt;
      if (t.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  _distAspect(x1, y1, x2, y2) {
    const aspect = this.height / this.width;
    const dx = x1 - x2;
    const dy = (y1 - y2) * aspect;
    return Math.hypot(dx, dy);
  }

  _spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 0.08 + Math.random() * 0.24;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: 2 + Math.random() * 3.5,
        color,
        life: 0.25 + Math.random() * 0.25,
        maxLife: 0.5,
      });
    }
  }

  _addFloatingText(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  _spawnConfetti() {
    const colors = ['#facc15', '#22c55e', '#38bdf8', '#f43f5e', '#c084fc'];
    for (let i = 0; i < 65; i++) {
      this.confetti.push({
        x: Math.random(),
        y: -0.05 - Math.random() * 0.2,
        vx: (Math.random() - 0.5) * 0.35,
        vy: 0.15 + Math.random() * 0.35,
        size: 5 + Math.random() * 6,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 10,
      });
    }
  }

  // ===================== RENDERING =====================
  render() {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;
    const world = this.config.world;
    const tod = world.timeOfDay;

    ctx.save();

    if (this.shakeTime > 0) {
      const mag = this.shakeMag * (this.shakeTime / 0.25);
      ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
    }

    // 1. Unique Level Pitch Pattern & Colors
    this._drawPitchPattern(W, H, world);

    // 2. Pitch Markings
    ctx.strokeStyle = world.lineColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    const boxW = W * 0.64;
    ctx.strokeRect((W - boxW) / 2, 10, boxW, H * 0.16);

    const midY = H * 0.42;
    ctx.beginPath();
    ctx.moveTo(10, midY);
    ctx.lineTo(W - 10, midY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(W / 2, midY, W * 0.13, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Rain Ground Splashes
    ctx.save();
    ctx.strokeStyle = 'rgba(200, 230, 255, 0.38)';
    ctx.lineWidth = 1.2;
    for (const s of this.rainSplashes) {
      ctx.globalAlpha = Math.max(0, (s.life / s.maxLife) * 0.45);
      ctx.beginPath();
      ctx.ellipse(s.x * W, s.y * H, s.r, s.r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Zigzag Slalom Guide Lines
    this._drawZigzagGuide(this.queenCones, 'rgba(232, 121, 249, 0.24)');
    this._drawZigzagGuide(this.playerCones, 'rgba(255, 255, 255, 0.16)');

    // 5. Aim Line from Player
    if (this.player.hasBall && this.state === 'playing') {
      const px = this.player.x * W;
      const py = this.player.y * H;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(px, py - this.player.r * W * this.giantScale);
      ctx.lineTo(px + this.player.vx * W * 0.28, this.boss.y * H);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Blaster Muzzle Beams
    for (const beam of this.muzzleBeams) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, beam.life / beam.maxLife);
      ctx.strokeStyle = beam.color;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(beam.x1 * W, beam.y1 * H);
      ctx.lineTo(beam.x2 * W, beam.y2 * H);
      ctx.stroke();
      ctx.restore();
    }

    // 7. Collectible Golden Coins on Field
    for (const c of this.coins) {
      this._drawCoin(c.x * W, c.y * H, c.r * W, c.bob);
    }

    // 8. Power-ups & Gun Pickups
    for (const p of this.powerups) {
      const x = p.x * W;
      const y = p.y * H + Math.sin(p.bob) * 4;
      const r = p.r * W;
      ctx.save();
      ctx.fillStyle = p.type.color;
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = p.type.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = `${Math.round(r * 1.25)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.type.emoji, x, y + 1);
      ctx.restore();
    }

    // 9. Zigzag Cones
    for (const cone of [...this.queenCones, ...this.playerCones]) {
      this._drawCone(cone.x * W, cone.y * H, cone.r * W, world.coneColor, tod.shadowScale);
    }

    // 9.5 Fire Fences (obstacles for Harry!) + White See-Through Protective Wind Fence!
    for (const fence of this.fireFences) {
      this._drawFireFence(fence.x1 * W, fence.x2 * W, fence.y * H, fence.thickness * W);
    }
    this._drawWhiteWindFence(W, H);

    // 10. Moving Defenders & Friendly Guardian Guards (never hurt Harry!)
    for (const d of this.defenders) {
      this._drawDefender(d.x * W, d.y * H, d.r * W);
    }
    for (const g of this.guardianGuards) {
      this._drawGuardianGuard(g.x * W, g.y * H, g.r * W);
    }

    // 10.5 Pits for the King (in Boss Zone)
    for (const pit of this.kingPits) {
      this._drawPit(pit.x * W, pit.y * H, pit.r * W);
    }

    // 10.6 Patrol Rockets & Diving Rockets behind the King
    for (const r of this.kingRockets) {
      this._drawRocket(r.x * W, r.y * H, W * 0.024, false);
    }
    for (const dr of this.divingRockets) {
      this._drawRocket(dr.x * W, dr.y * H, dr.r * W, true);
    }

    // 11. Holographic Decoy Clones (confuse Queen & King!)
    for (const d of this.decoys) {
      this._drawDecoy(d.x * W, d.y * H, this.player.r * W * 0.95, d);
    }

    // 11.5 Two Immortal Helpers guarding Harry on the sides: Ron & Hermione
    // Both Ron & Hermione also grow with Harry's giantScale, while Harry stays the biggest!
    for (const h of this.helpers) {
      const growthFactor = h.id === 'ron' ? 0.72 : 0.55;
      const helperScale = 1 + (this.giantScale - 1) * growthFactor;

      // Protective white wind link between Harry and Ron/Hermione
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(h.x * W, h.y * H);
      ctx.lineTo(this.player.x * W, this.player.y * H);
      ctx.stroke();
      ctx.restore();

      this._drawHelper(h.x * W, h.y * H, h.r * W * helperScale, h);
    }

    // 12. Boss (King)
    this._drawBoss(this.boss.x * W, this.boss.y * H, this.boss.r * W, world.bossColor, tod.shadowScale);

    // 13. Boss Queen (if not eaten by Dragons!)
    if (!this.queenEaten) {
      this._drawQueen(this.queen.x * W, this.queen.y * H, this.queen.r * W, world.queenColor, tod.shadowScale);
    }

    // 13.5 Dragons, Dragon Rockets & Tail Whip Arcs (immune to balls!)
    for (const arc of this.tailWhipArcs) {
      this._drawTailWhipArc(arc.x * W, arc.y * H, arc.r * W, arc.life / arc.maxLife);
    }
    for (const dr of this.dragonRockets) {
      this._drawRocket(dr.x * W, dr.y * H, dr.r * W, true);
    }
    for (const d of this.dragons) {
      this._drawDragon(d.x * W, d.y * H, d.r * W, d.wingPhase);
    }

    // 14. Player (Harry Potter) + Mounted Guns + Golden Armor + Dribble Ball
    this._drawPlayer(this.player.x * W, this.player.y * H, this.player.r * W * this.giantScale, tod.shadowScale);

    // 15. Active Soccer & Blaster Balls + Spears
    for (const b of this.balls) {
      this._drawSoccerBall(b.x * W, b.y * H, b.r * W, b.spin, b.kind);
    }
    for (const s of this.spears) {
      this._drawSpear(s.x * W, s.y * H, s.vx, s.vy, W * 0.032);
    }

    // 16. Queen's Thrown Hazards
    for (const h of this.hazards) {
      this._drawHazard(h.x * W, h.y * H, h.r * W, h.rot);
    }

    // 17. Day / Night Atmospheric Lighting + Stadium Spotlights
    this._drawTimeOfDayLighting(W, H, tod);

    // 18. Falling Rain Streaks & Jagged Lightning Bolts (no wind)
    this._drawRainAndLightning(W, H);

    // 19. Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 20. Floating Texts
    for (const t of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.font = '800 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.78)';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x * W, t.y * H);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x * W, t.y * H);
      ctx.restore();
    }

    // 21. Restart Red Vignette Flash
    if (this.state === 'restarting') {
      ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.42, this.restartTimer)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // 22. Confetti
    for (const c of this.confetti) {
      ctx.save();
      ctx.translate(c.x * W, c.y * H);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
      ctx.restore();
    }

    ctx.restore();
  }

  _drawPit(x, y, r) {
    const ctx = this.ctx;
    ctx.save();
    // Outer dirt rim
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.2, r * 1.15, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark pit depth
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.2, r * 0.88, r * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  _drawRocket(x, y, r, isDiving = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    if (isDiving) ctx.scale(1.15, 1.15);

    // Flame tail pointing up
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.8);
    ctx.lineTo(0, -r * (1.55 + Math.sin(this.levelTime * 35) * 0.25));
    ctx.lineTo(r * 0.35, -r * 0.8);
    ctx.closePath();
    ctx.fill();

    // Rocket body pointing downward at the King's back
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -r * 0.8);
    ctx.lineTo(r * 0.45, -r * 0.8);
    ctx.lineTo(r * 0.45, r * 0.25);
    ctx.lineTo(0, r * 1.05);
    ctx.lineTo(-r * 0.45, r * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Warhead tip
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, r * 0.25);
    ctx.lineTo(r * 0.42, r * 0.25);
    ctx.lineTo(0, r * 1.05);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawHelper(x, y, r, helper) {
    const ctx = this.ctx;
    const isRon = helper.id === 'ron';
    const hasGoldArmor = this.goldenArmorLeft > 0;
    const dancing = this.state === 'won';
    const danceAngle = dancing ? Math.sin(performance.now() * 0.015 + (isRon ? 0 : 1.5)) * 0.24 : 0;
    const danceBounce = dancing ? Math.abs(Math.sin(performance.now() * 0.015 + (isRon ? 0 : 1.5))) * 8 : 0;
    ctx.save();
    ctx.translate(x, y - danceBounce);
    ctx.rotate(danceAngle);
    x = 0;
    y = 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.88, r * 0.85, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Golden Armor Radiant Aura for Ron & Hermione too!
    if (hasGoldArmor) {
      ctx.save();
      ctx.strokeStyle = '#fde047';
      ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Gryffindor Robe OR Golden Armor Body (same as Harry Potter all the time!)
    if (hasGoldArmor) {
      const goldGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
      goldGrad.addColorStop(0, '#fef08a');
      goldGrad.addColorStop(0.55, '#eab308');
      goldGrad.addColorStop(1, '#a16207');
      ctx.fillStyle = goldGrad;
      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = 2.6;
    } else {
      ctx.fillStyle = '#7f1d1d';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
    }
    ctx.beginPath();
    ctx.arc(x, y + r * 0.12, r * 0.96, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Golden Armor Shoulder Plates for Ron & Hermione!
    if (hasGoldArmor) {
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x - r * 0.78, y + r * 0.1, r * 0.26, 0, Math.PI * 2);
      ctx.arc(x + r * 0.78, y + r * 0.1, r * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Face
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.06, r * 0.72, 0, Math.PI * 2);
    ctx.fill();

    // Hair (Ron = bright ginger, Hermione = wavy brown)
    ctx.fillStyle = isRon ? '#ea580c' : '#78350f';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.34, r * 0.72, Math.PI, Math.PI * 2);
    ctx.fill();
    if (!isRon) {
      // Hermione's side hair waves
      ctx.beginPath();
      ctx.arc(x - r * 0.62, y - r * 0.05, r * 0.32, 0, Math.PI * 2);
      ctx.arc(x + r * 0.62, y - r * 0.05, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(x - r * 0.24, y - r * 0.05, r * 0.09, 0, Math.PI * 2);
    ctx.arc(x + r * 0.24, y - r * 0.05, r * 0.09, 0, Math.PI * 2);
    ctx.fill();

    // Kick animation leg for Ron & Hermione
    if (helper.kickTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.6);
      ctx.lineTo(x, y - r * 1.38);
      ctx.stroke();
      ctx.restore();
    }

    // Name tag above head (with stun indicator if hit by a star)
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 2.5;
    const tag = helper.stunTimer > 0 ? `${helper.label} 💫` : helper.label;
    ctx.strokeText(tag, x, y - r - 6);
    ctx.fillStyle = helper.stunTimer > 0 ? '#fca5a5' : isRon ? '#fed7aa' : '#fde68a';
    ctx.fillText(tag, x, y - r - 6);
    ctx.restore();
  }

  _drawGuardianGuard(x, y, r) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#065f46';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = `${Math.round(r * 1.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚔️', x, y + 1);
    ctx.restore();
  }

  _drawWhiteWindFence(W, H) {
    // Multiple crisp white, semi-transparent protective wind barriers shielding Harry, Ron & Hermione!
    const ctx = this.ctx;
    ctx.save();

    // 2 horizontal white see-through wind fence barriers in front & back of Harry's trio
    for (const fy of [H * 0.43, H * 0.875]) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(W * 0.05, fy);
      ctx.lineTo(W * 0.95, fy);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 6; i++) {
        const px = W * (0.08 + i * 0.165);
        ctx.fillRect(px - 3, fy - 8, 6, 16);
        ctx.strokeRect(px - 3, fy - 8, 6, 16);
      }
    }

    // Protective white wind gusts swirling around Harry, Ron, and Hermione!
    const trio = [
      { x: this.player.x * W, y: this.player.y * H, r: this.player.r * W * this.giantScale * 1.45 },
      ...this.helpers.map((h) => ({ x: h.x * W, y: h.y * H, r: h.r * W * 1.5 })),
    ];
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    for (const t of trio) {
      const ang = this.levelTime * 3.5;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, ang, ang + Math.PI * 1.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawFireFence(x1, x2, y, thickness) {
    const ctx = this.ctx;
    ctx.save();
    // Glowing fiery bar
    const grad = ctx.createLinearGradient(x1, y - thickness, x1, y + thickness);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.5, '#f97316');
    grad.addColorStop(1, '#b91c1c');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x1, y - thickness * 0.55, x2 - x1, thickness * 1.1, 6);
    ctx.fill();
    ctx.stroke();

    // Flickering flame tongues along the fence
    const flames = Math.max(4, Math.floor((x2 - x1) / 16));
    for (let i = 0; i <= flames; i++) {
      const fx = x1 + (i / flames) * (x2 - x1);
      const fh = thickness * (1.2 + Math.sin(this.levelTime * 18 + i * 1.7) * 0.45);
      ctx.fillStyle = i % 2 === 0 ? '#facc15' : '#fb923c';
      ctx.beginPath();
      ctx.moveTo(fx - 5, y);
      ctx.lineTo(fx, y - fh);
      ctx.lineTo(fx + 5, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _drawDragon(x, y, r, wingPhase) {
    const ctx = this.ctx;
    const flap = Math.sin(wingPhase) * r * 0.48;
    ctx.save();
    ctx.translate(x, y);

    // Immune Aura
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
    ctx.stroke();

    // Dragon Wings
    ctx.fillStyle = '#059669';
    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, 0);
    ctx.lineTo(-r * 1.55, -r * 0.55 + flap);
    ctx.lineTo(-r * 1.1, r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(r * 0.3, 0);
    ctx.lineTo(r * 1.55, -r * 0.55 + flap);
    ctx.lineTo(r * 1.1, r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dragon Tail
    const tailWag = Math.cos(wingPhase * 0.8) * r * 0.35;
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.5);
    ctx.quadraticCurveTo(tailWag, r * 1.15, tailWag * 1.4, r * 1.55);
    ctx.stroke();

    // Dragon Head & Body
    ctx.fillStyle = '#10b981';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dragon Eyes
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-r * 0.24, -r * 0.14, r * 0.14, 0, Math.PI * 2);
    ctx.arc(r * 0.24, -r * 0.14, r * 0.14, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawTailWhipArc(x, y, r, ratio) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = Math.max(0, ratio);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 7 * ratio;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
    ctx.restore();
  }

  _drawSpear(x, y, vx, vy, len) {
    const ctx = this.ctx;
    const ang = Math.atan2(vy, vx);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);

    // Shaft
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.lineTo(len * 0.55, 0);
    ctx.stroke();

    // Spearhead
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(len * 0.95, 0);
    ctx.lineTo(len * 0.42, -5.5);
    ctx.lineTo(len * 0.42, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  _drawDecoy(x, y, r, decoy) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.52 + Math.sin(decoy.phase * 1.5) * 0.18;
    ctx.fillStyle = '#a855f7';
    ctx.strokeStyle = '#f0abfc';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${Math.round(r * 0.85)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('10?', x, y + 1);

    // Fake ball ahead of decoy
    this._drawSoccerBall(x, y - r * 1.25, r * 0.52, decoy.phase * 2, 'ghost');
    ctx.restore();
  }

  _drawCoin(x, y, r, bob) {
    const ctx = this.ctx;
    const cy = y + Math.sin(bob) * 3;
    const scaleX = 0.65 + Math.abs(Math.cos(bob * 0.7)) * 0.35;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.9, r * 0.85, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(x, cy);
    ctx.scale(scaleX, 1);

    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#a16207';
    ctx.font = `800 ${Math.round(r * 0.95)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 0.5);

    ctx.restore();
  }

  _drawPitchPattern(W, H, world) {
    const ctx = this.ctx;
    const pattern = world.pitchPattern;

    ctx.fillStyle = world.turfA;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = world.turfB;
    if (pattern === 'stripes') {
      const stripeCount = 12;
      const stripeH = H / stripeCount;
      for (let i = 0; i < stripeCount; i += 2) {
        ctx.fillRect(0, i * stripeH, W, stripeH + 1);
      }
    } else if (pattern === 'checkered') {
      const cols = 6;
      const rows = 12;
      const cw = W / cols;
      const ch = H / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r + c) % 2 === 0) {
            ctx.fillRect(c * cw, r * ch, cw + 0.5, ch + 0.5);
          }
        }
      }
    } else if (pattern === 'circles') {
      const cx = W / 2;
      const cy = H * 0.45;
      const maxR = Math.hypot(W, H);
      const rings = 9;
      for (let i = rings; i >= 1; i--) {
        ctx.fillStyle = i % 2 === 0 ? world.turfB : world.turfA;
        ctx.beginPath();
        ctx.arc(cx, cy, (i / rings) * maxR, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (pattern === 'diagonal') {
      ctx.save();
      const step = 48;
      for (let offset = -H; offset < W + H; offset += step * 2) {
        ctx.beginPath();
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset + step, 0);
        ctx.lineTo(offset + step - H * 0.6, H);
        ctx.lineTo(offset - H * 0.6, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (pattern === 'vertical') {
      const cols = 7;
      const cw = W / cols;
      for (let c = 0; c < cols; c += 2) {
        ctx.fillRect(c * cw, 0, cw + 0.5, H);
      }
    }
  }

  _drawTimeOfDayLighting(W, H, tod) {
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = tod.ambientOverlay;
    ctx.fillRect(0, 0, W, H);

    if (tod.sunbeams) {
      const grad = ctx.createLinearGradient(0, 0, W, H * 0.7);
      grad.addColorStop(0, 'rgba(255, 250, 200, 0.14)');
      grad.addColorStop(0.5, 'rgba(255, 250, 200, 0.04)');
      grad.addColorStop(1, 'rgba(255, 250, 200, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // Twinkling Morning Stars across the sky!
    ctx.save();
    for (let i = 0; i < 14; i++) {
      const sx = ((i * 73 + this.config.level * 19) % 94 + 3) * 0.01 * W;
      const sy = ((i * 41 + this.config.level * 11) % 34 + 3) * 0.01 * H;
      const twinkle = 0.35 + 0.55 * Math.abs(Math.sin(this.levelTime * 3.2 + i));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
      ctx.fill();
      // 4-point star sparkle
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy);
      ctx.lineTo(sx + 4, sy);
      ctx.moveTo(sx, sy - 4);
      ctx.lineTo(sx, sy + 4);
      ctx.stroke();
    }
    ctx.restore();

    if (tod.isNight) {
      ctx.globalCompositeOperation = 'screen';
      const spots = [
        { x: this.player.x * W, y: this.player.y * H, r: W * 0.26, color: 'rgba(186, 230, 253, 0.24)' },
        { x: this.queen.x * W, y: this.queen.y * H, r: W * 0.24, color: 'rgba(245, 208, 254, 0.22)' },
        { x: this.boss.x * W, y: this.boss.y * H, r: W * 0.28, color: 'rgba(254, 240, 138, 0.24)' },
      ];
      for (const s of spots) {
        const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
        g.addColorStop(0, s.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  _drawRainAndLightning(W, H) {
    const ctx = this.ctx;

    // 1. Soft rising Steam (אדים)
    ctx.save();
    for (const st of this.steamPuffs) {
      ctx.globalAlpha = st.alpha;
      const g = ctx.createRadialGradient(st.x * W, st.y * H, 1, st.x * W, st.y * H, st.r);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(st.x * W, st.y * H, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Vegetable Rain (גשם ירקות: 🥕🥦🍅🥒🌽)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const d of this.rainDrops) {
      ctx.globalAlpha = d.alpha;
      ctx.font = `${d.size}px sans-serif`;
      ctx.fillText(d.emoji, d.x * W, d.y * H);
    }
    ctx.restore();

    // 3. Floating Bubbles (בועות)
    ctx.save();
    for (const b of this.bubbles) {
      const bx = b.x * W;
      const by = b.y * H;
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
      ctx.fillStyle = 'rgba(125, 211, 252, 0.18)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(bx, by, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bubble shine highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(bx - b.r * 0.35, by - b.r * 0.35, b.r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    for (const bolt of this.lightningBolts) {
      const alpha = Math.max(0, bolt.life / bolt.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      for (const seg of bolt.segments) {
        ctx.moveTo(seg.x1 * W, seg.y1 * H);
        ctx.lineTo(seg.x2 * W, seg.y2 * H);
      }
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (const seg of bolt.segments) {
        ctx.moveTo(seg.x1 * W, seg.y1 * H);
        ctx.lineTo(seg.x2 * W, seg.y2 * H);
      }
      for (const br of bolt.branches) {
        ctx.moveTo(br.x1 * W, br.y1 * H);
        ctx.lineTo(br.x2 * W, br.y2 * H);
      }
      ctx.stroke();

      const gx = bolt.hitX * W;
      const gy = bolt.hitY * H;
      const g = ctx.createRadialGradient(gx, gy, 2, gx, gy, W * 0.16);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      g.addColorStop(0.4, 'rgba(56, 189, 248, 0.35)');
      g.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(gx, gy, W * 0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    if (this.lightningFlash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(224, 242, 254, ${Math.min(0.42, this.lightningFlash * 1.15)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  _drawZigzagGuide(cones, strokeStyle) {
    if (cones.length < 2) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    cones.forEach((c, idx) => {
      const x = c.x * this.width;
      const y = c.y * this.height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  _drawCone(x, y, r, color, shadowScale = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(x + (shadowScale - 1) * 4, y + r * 0.55, r * 1.05 * shadowScale, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.35, r * 0.95, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x - r * 0.72, y + r * 0.35);
    ctx.lineTo(x, y - r * 1.05);
    ctx.lineTo(x + r * 0.72, y + r * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.42, y - r * 0.12);
    ctx.lineTo(x + r * 0.42, y - r * 0.12);
    ctx.lineTo(x + r * 0.54, y + r * 0.12);
    ctx.lineTo(x - r * 0.54, y + r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawConfusedOrbit(x, y, r) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `700 ${Math.round(r * 0.7)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const symbols = ['❓', '💫', '😵‍💫'];
    for (let i = 0; i < 3; i++) {
      const ang = this.levelTime * 5 + (i * Math.PI * 2) / 3;
      const sx = x + Math.cos(ang) * r * 1.15;
      const sy = y - r * 1.35 + Math.sin(ang) * r * 0.3;
      ctx.fillText(symbols[i], sx, sy);
    }
    ctx.restore();
  }

  _drawBoss(x, y, r, color, shadowScale = 1) {
    const ctx = this.ctx;
    ctx.save();
    const confused = this.bossConfuseTimer > 0;
    const inPit = this.bossPitTimer > 0;
    const bob = inPit ? 6 : Math.sin(this.boss.angryPhase) * 2.5;
    const wobble = confused ? Math.sin(this.levelTime * 16) * 0.18 : 0;

    ctx.translate(x, y);
    ctx.rotate(wobble);
    if (inPit) ctx.scale(0.84, 0.84);

    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.85, r * 1.0 * shadowScale, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.boss.hitFlash > 0 ? '#ffffff' : confused ? '#a855f7' : color;
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, bob, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.55 + bob);
    ctx.lineTo(-r * 1.05, -r * 1.15 + bob);
    ctx.lineTo(-r * 0.25, -r * 0.85 + bob);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.55 + bob);
    ctx.lineTo(r * 1.05, -r * 1.15 + bob);
    ctx.lineTo(r * 0.25, -r * 0.85 + bob);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 0.08 + bob, r * 0.2, 0, Math.PI * 2);
    ctx.arc(r * 0.32, -r * 0.08 + bob, r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    if (confused) {
      // Dizzy eyes!
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      const eOff = Math.sin(this.levelTime * 14) * r * 0.08;
      ctx.beginPath();
      ctx.arc(-r * 0.32 + eOff, -r * 0.08 + bob, r * 0.09, 0, Math.PI * 2);
      ctx.arc(r * 0.32 - eOff, -r * 0.08 + bob, r * 0.09, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.05 + bob, r * 0.09, 0, Math.PI * 2);
      ctx.arc(r * 0.3, -r * 0.05 + bob, r * 0.09, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.35 + bob);
      ctx.lineTo(-r * 0.12, -r * 0.18 + bob);
      ctx.moveTo(r * 0.55, -r * 0.35 + bob);
      ctx.lineTo(r * 0.12, -r * 0.18 + bob);
      ctx.stroke();
    }

    ctx.restore();

    if (confused) {
      this._drawConfusedOrbit(x, y, r);
    }

    ctx.save();
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(`❤️ ${this.boss.hp}/${this.boss.maxHp}`, x, y + r + 13);
    ctx.restore();
  }

  _drawQueen(x, y, r, color, shadowScale = 1) {
    const ctx = this.ctx;
    ctx.save();
    const frozen = this.queenFreezeTimer > 0;
    const confused = this.queenConfuseTimer > 0;
    const tilt = confused
      ? Math.sin(this.levelTime * 18) * 0.28
      : Math.max(-0.22, Math.min(0.22, this.queen.vx * 0.45));

    ctx.translate(x, y);
    ctx.rotate(tilt);

    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.85, r * 0.95 * shadowScale, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.queen.blockFlash > 0 ? '#ffffff' : frozen ? '#38bdf8' : confused ? '#c084fc' : color;
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.72);
    ctx.lineTo(-r * 0.45, -r * 1.25);
    ctx.lineTo(-r * 0.15, -r * 0.92);
    ctx.lineTo(0, -r * 1.32);
    ctx.lineTo(r * 0.15, -r * 0.92);
    ctx.lineTo(r * 0.45, -r * 1.25);
    ctx.lineTo(r * 0.55, -r * 0.72);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.05, r * 0.16, 0, Math.PI * 2);
    ctx.arc(r * 0.28, -r * 0.05, r * 0.16, 0, Math.PI * 2);
    ctx.fill();

    if (confused) {
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 2;
      const eOff = Math.cos(this.levelTime * 15) * r * 0.07;
      ctx.beginPath();
      ctx.arc(-r * 0.28 + eOff, -r * 0.05, r * 0.07, 0, Math.PI * 2);
      ctx.arc(r * 0.28 - eOff, -r * 0.05, r * 0.07, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(-r * 0.26, -r * 0.02, r * 0.08, 0, Math.PI * 2);
      ctx.arc(r * 0.26, -r * 0.02, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    if (frozen) {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.52)';
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 2;
      ctx.fillRect(-r * 1.1, -r * 1.15, r * 2.2, r * 2.2);
      ctx.strokeRect(-r * 1.1, -r * 1.15, r * 2.2, r * 2.2);
    }

    ctx.restore();

    if (confused) {
      this._drawConfusedOrbit(x, y, r);
    }
  }

  _drawDefender(x, y, r) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = `${Math.round(r * 1.25)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛡️', x, y + 1);
    ctx.restore();
  }

  _drawPlayer(x, y, r, shadowScale = 1) {
    const ctx = this.ctx;
    const hasGoldArmor = this.goldenArmorLeft > 0;
    const dancing = this.state === 'won';
    const danceAngle = dancing ? Math.sin(performance.now() * 0.015) * 0.22 : 0;
    const danceBounce = dancing ? Math.abs(Math.sin(performance.now() * 0.015)) * 10 : 0;
    ctx.save();
    ctx.translate(x, y - danceBounce);
    ctx.rotate(danceAngle);
    x = 0;
    y = 0;

    // Swinging Spear Arc when Harry swings a spear!
    if (this.player.spearSwingTimer > 0) {
      ctx.save();
      const prog = 1 - this.player.spearSwingTimer / 0.3;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -r * 0.4, r * 1.6, -Math.PI + prog * 1.4, -0.3 + prog * 1.4);
      ctx.stroke();
      ctx.restore();
    }

    if (this.turboTimer > 0) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
      ctx.beginPath();
      ctx.arc(x, y, r * 1.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // Golden Armor Radiant Aura!
    if (hasGoldArmor) {
      ctx.save();
      ctx.strokeStyle = '#fde047';
      ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (this.shieldsLeft > 0 || this.invulnTimer > 0) {
      ctx.save();
      ctx.strokeStyle = this.invulnTimer > 0 ? '#fde047' : '#38bdf8';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(x, y, r * 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Mounted Ghost Blaster Gun (Left shoulder)
    const ghostRecoilY = this.gunRecoilGhost * 24;
    ctx.save();
    ctx.fillStyle = this.ghostShotsLeft > 0 ? '#0284c7' : '#334155';
    ctx.strokeStyle = this.ghostShotsLeft > 0 ? '#7dd3fc' : '#64748b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(x - r * 1.15, y - r * 0.95 + ghostRecoilY, r * 0.42, r * 1.05, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Mounted Fire Blaster Gun (Right shoulder)
    const fireRecoilY = this.gunRecoilFire * 24;
    ctx.save();
    ctx.fillStyle = this.fireShotsLeft > 0 ? '#ea580c' : '#334155';
    ctx.strokeStyle = this.fireShotsLeft > 0 ? '#fdba74' : '#64748b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(x + r * 0.73, y - r * 0.95 + fireRecoilY, r * 0.42, r * 1.05, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.85, r * 0.9 * shadowScale, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Harry Potter Robe / Golden Armor Outer Body
    if (hasGoldArmor) {
      const goldGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
      goldGrad.addColorStop(0, '#fef08a');
      goldGrad.addColorStop(0.55, '#eab308');
      goldGrad.addColorStop(1, '#a16207');
      ctx.fillStyle = goldGrad;
      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = 3;
    } else {
      ctx.fillStyle = '#7f1d1d'; // Gryffindor robe
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Golden Armor Shoulder Plates
    if (hasGoldArmor) {
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x - r * 0.78, y + r * 0.1, r * 0.28, 0, Math.PI * 2);
      ctx.arc(x + r * 0.78, y + r * 0.1, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Harry Potter Head & Messy Black Hair
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.08, r * 0.66, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.32, r * 0.68, Math.PI, Math.PI * 2);
    ctx.fill();

    // Lightning Bolt Scar on forehead!
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x + r * 0.15, y - r * 0.56);
    ctx.lineTo(x + r * 0.04, y - r * 0.42);
    ctx.lineTo(x + r * 0.18, y - r * 0.42);
    ctx.lineTo(x + r * 0.06, y - r * 0.28);
    ctx.stroke();

    // Round Harry Potter Glasses!
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(x - r * 0.24, y - r * 0.08, r * 0.19, 0, Math.PI * 2);
    ctx.arc(x + r * 0.24, y - r * 0.08, r * 0.19, 0, Math.PI * 2);
    ctx.moveTo(x - r * 0.05, y - r * 0.08);
    ctx.lineTo(x + r * 0.05, y - r * 0.08);
    ctx.stroke();

    // Eyes inside glasses
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(x - r * 0.24, y - r * 0.08, r * 0.07, 0, Math.PI * 2);
    ctx.arc(x + r * 0.24, y - r * 0.08, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 2.5;
    ctx.strokeText('הארי', x, y + r + 11);
    ctx.fillStyle = '#fef08a';
    ctx.fillText('הארי', x, y + r + 11);

    // Harry Potter kick animation leg!
    if (this.player.kickTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.65);
      ctx.lineTo(x, y - r * 1.45);
      ctx.stroke();
      ctx.restore();
    }

    if (this.player.hasBall) {
      const ballR = r * 0.56;
      this._drawSoccerBall(x, y - r * 1.25, ballR, this.player.ballSpin, 'normal');
    }

    ctx.restore();
  }

  _drawSoccerBall(x, y, r, spin, kind = 'normal') {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    if (kind === 'fire') {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.65, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'ghost') {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.88;
    }

    ctx.rotate(spin);
    ctx.fillStyle = kind === 'fire' ? '#fef08a' : kind === 'ghost' ? '#bae6fd' : '#ffffff';
    ctx.strokeStyle = kind === 'fire' ? '#ea580c' : kind === 'ghost' ? '#0284c7' : '#0f172a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = kind === 'fire' ? '#dc2626' : kind === 'ghost' ? '#6366f1' : '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawHazard(x, y, r, rot) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      const rad = i % 2 === 0 ? r * 1.25 : r * 0.6;
      const px = Math.cos(ang) * rad;
      const py = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ===================== INPUT HANDLING =====================
  _bindEvents() {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        if (this.state === 'playing') e.preventDefault();
      }
      this.keys.add(e.code);
      if (e.code === 'Space') {
        sound.unlock();
        this.shoot();
      } else if (e.code === 'Digit1' || e.code === 'KeyQ') {
        sound.unlock();
        this.shootGhostGun();
      } else if (e.code === 'Digit2' || e.code === 'KeyE') {
        sound.unlock();
        this.shootFireGun();
      } else if (e.code === 'Digit3' || e.code === 'KeyR') {
        sound.unlock();
        this.triggerConfuse();
      } else if (e.code === 'Digit4' || e.code === 'KeyF') {
        sound.unlock();
        this.summonDragons();
      } else if (e.code === 'Digit5' || e.code === 'KeyT') {
        sound.unlock();
        this.throwSpear();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      sound.unlock();
      if (this.state !== 'playing') return;
      this.canvas.setPointerCapture(e.pointerId);
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      this.pointer.active = true;
      this.pointer.id = e.pointerId;
      this.pointer.startX = x;
      this.pointer.startY = y;
      this.pointer.lastX = x;
      this.pointer.lastY = y;
      this.pointer.startTime = performance.now();
      this.pointer.movedDist = 0;
      this.callbacks.onFirstInput?.();
    });

    // Also enforce Fire Fence impassable barrier during touch-drag!
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.pointer.active || e.pointerId !== this.pointer.id) return;
      if (this.state !== 'playing') return;

      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const dx = x - this.pointer.lastX;
      const dy = y - this.pointer.lastY;
      this.pointer.movedDist += Math.hypot(dx, dy);

      const speedMult = 1 + (this.upgrades.speed || 0) * 0.08;
      const dragGain = (this.turboTimer > 0 ? 1.38 : 1.18) * speedMult;
      const nextX = this.player.x + dx * dragGain;
      const nextY = this.player.y + dy * dragGain;

      // Prevent pointer drag from teleporting/tunneling past a Fire Fence!
      let blocked = false;
      for (const fence of this.fireFences) {
        const crossedY =
          (this.player.y <= fence.y && nextY >= fence.y) || (this.player.y >= fence.y && nextY <= fence.y);
        const minX = Math.min(this.player.x, nextX);
        const maxX = Math.max(this.player.x, nextX);
        const overlapsX = maxX >= fence.x1 - 0.02 && minX <= fence.x2 + 0.02;
        if (crossedY && overlapsX) {
          blocked = true;
          this._consumeProtectionOrFail('אי אפשר לעבור את גדר האש! 🔥', () => {});
          break;
        }
      }

      if (!blocked) {
        this.player.x = nextX;
        this.player.y = nextY;
        this.player.vx = dx * 24;
        this.player.vy = dy * 24;
      }

      this.pointer.lastX = x;
      this.pointer.lastY = y;
    });

    const endPointer = (e) => {
      if (!this.pointer.active || e.pointerId !== this.pointer.id) return;
      const elapsed = performance.now() - this.pointer.startTime;
      const totalDy = this.pointer.lastY - this.pointer.startY;

      if (elapsed < 280 && (totalDy < -0.055 || this.pointer.movedDist < 0.025)) {
        this.shoot();
      }

      this.pointer.active = false;
      this.pointer.id = null;
    };

    this.canvas.addEventListener('pointerup', endPointer);
    this.canvas.addEventListener('pointercancel', endPointer);
  }
}
