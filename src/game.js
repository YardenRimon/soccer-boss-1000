import { sound } from './audio.js';
import { generateLevelConfig } from './worlds.js';

const POWERUP_TYPES = [
  { id: 'fire', emoji: '🔥', label: 'כדור אש (עוקף מלכה!)', color: '#f97316' },
  { id: 'freeze', emoji: '❄️', label: 'מלכה קפואה', color: '#38bdf8' },
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

    this.state = 'paused'; // 'paused' | 'playing' | 'restarting' | 'won'
    this.config = generateLevelConfig(1);
    this.levelTime = 0;
    this.restartTimer = 0;
    this.shakeTime = 0;
    this.shakeMag = 0;

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
    this.balls = [];
    this.hazards = [];
    this.powerups = [];
    this.particles = [];
    this.floatingTexts = [];
    this.confetti = [];

    // Weather (Rain & Lightning)
    this.rainDrops = [];
    this.rainSplashes = [];
    this.lightningTimer = 2.0;
    this.lightningFlash = 0;
    this.lightningBolts = [];

    this.queenShotTimer = 1.6;
    this.powerupTimer = 4.0;
    this.ballCooldown = 0;
    this.queenFreezeTimer = 0;
    this.turboTimer = 0;
    this.fireShotsLeft = 0;

    this._lastFrame = 0;
    this._rafId = null;

    this._bindEvents();
    this.resize();
    this.loadLevel(1, false);
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
    this.config = generateLevelConfig(levelNum);
    this.levelTime = 0;
    this.restartTimer = 0;
    this.shakeTime = 0;

    this.player = {
      x: 0.5,
      y: 0.88,
      vx: 0,
      vy: 0,
      r: 0.036,
      ballSpin: 0,
      hasBall: true,
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

    this.defenders = this.config.movingDefenders.map((d) => ({ ...d }));
    this.balls = [];
    this.hazards = [];
    this.powerups = [];
    this.particles = [];
    this.floatingTexts = [];
    this.confetti = [];

    this._initWeather();

    this.queenShotTimer = this.config.queenShotInterval > 0 ? Math.min(1.6, this.config.queenShotInterval) : 999;
    this.powerupTimer = 3.5;
    this.ballCooldown = 0;
    this.queenFreezeTimer = 0;
    this.turboTimer = 0;
    this.fireShotsLeft = 0;

    this.state = startPlaying ? 'playing' : 'paused';
    this._syncHud();
  }

  _initWeather() {
    const count = this.config.world.weather.rainCount;
    this.rainDrops = [];
    for (let i = 0; i < count; i++) {
      this.rainDrops.push({
        x: Math.random(),
        y: Math.random(),
        len: 0.025 + Math.random() * 0.03,
        speed: 0.85 + Math.random() * 0.65,
        alpha: 0.25 + Math.random() * 0.4,
      });
    }
    this.rainSplashes = [];
    this.lightningFlash = 0;
    this.lightningBolts = [];
    this.lightningTimer = 1.4 + Math.random() * 1.8;
  }

  triggerLightning() {
    this.lightningFlash = 0.34;
    this.shakeTime = Math.max(this.shakeTime, 0.14);
    this.shakeMag = Math.max(this.shakeMag, 4);
    sound.thunder();

    // Generate main jagged lightning bolt + optional branch
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

  shoot() {
    if (this.state !== 'playing') return;
    if (!this.player.hasBall) return;

    const isFire = this.fireShotsLeft > 0;
    if (isFire) this.fireShotsLeft -= 1;

    const aimX = Math.max(-0.22, Math.min(0.22, this.player.vx * 0.32));
    const speed = isFire ? 1.35 : 0.98;

    this.balls.push({
      x: this.player.x,
      y: this.player.y - this.player.r * 1.15,
      vx: aimX,
      vy: -speed,
      r: isFire ? 0.028 : 0.023,
      fire: isFire,
      damage: isFire ? 2 : 1,
      spin: 0,
    });

    this.player.hasBall = false;
    this.ballCooldown = this.turboTimer > 0 ? 0.16 : 0.34;
    sound.kick(isFire);
    this._spawnParticles(this.player.x, this.player.y - 0.02, isFire ? '#f97316' : '#ffffff', 7);
    this._syncHud();
  }

  _triggerFail(reason) {
    if (this.state !== 'playing') return;
    this.state = 'restarting';
    this.restartTimer = 0.48;
    this.shakeTime = 0.25;
    this.shakeMag = 8;
    sound.fail();
    this._spawnParticles(this.player.x, this.player.y, '#ef4444', 18);
    this.callbacks.onToast?.(reason, false);
  }

  _triggerWin() {
    this.state = 'won';
    sound.win();
    this.shakeTime = 0.3;
    this.shakeMag = 6;
    this._spawnConfetti();
    this.callbacks.onWin?.({
      level: this.config.level,
      time: this.levelTime,
      isFinale: this.config.isFinale,
    });
  }

  _syncHud() {
    const w = this.config.world;
    const tod = w.timeOfDay;
    this.callbacks.onHudUpdate?.({
      level: this.config.level,
      worldName: `${w.emoji} ${w.name} • ${w.patternNameHe}`,
      timeLabel: `${tod.emoji} ${tod.clock} ${tod.label}`,
      hue: w.hue,
      bossHp: this.boss.hp,
      bossMaxHp: this.boss.maxHp,
      fireShots: this.fireShotsLeft,
      freezeTime: this.queenFreezeTimer,
      turboTime: this.turboTimer,
    });
  }

  update(dt) {
    // Always animate rain and lightning even while modal/win is open for atmospheric immersion
    this._updateWeather(dt);

    // Update confetti even on win screen
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

    // Power-up timers
    let hudDirty = false;
    if (this.queenFreezeTimer > 0) {
      this.queenFreezeTimer = Math.max(0, this.queenFreezeTimer - dt);
      hudDirty = true;
    }
    if (this.turboTimer > 0) {
      this.turboTimer = Math.max(0, this.turboTimer - dt);
      hudDirty = true;
    }

    // Ball respawn at player's feet
    if (!this.player.hasBall) {
      this.ballCooldown -= dt;
      if (this.ballCooldown <= 0) {
        this.player.hasBall = true;
      }
    }

    this._updatePlayer(dt);
    this._updateQueen(dt);
    this._updateBoss(dt);
    this._updateDefenders(dt);
    this._updateBalls(dt);
    this._updateHazards(dt);
    this._updatePowerups(dt);

    if (hudDirty) this._syncHud();
  }

  _updateWeather(dt) {
    const weather = this.config.world.weather;
    const wind = weather.rainWind;

    for (const drop of this.rainDrops) {
      drop.x += wind * dt * 2.2;
      drop.y += drop.speed * dt;
      if (drop.y > 1.02) {
        if (Math.random() < 0.35 && this.rainSplashes.length < 30) {
          this.rainSplashes.push({
            x: drop.x,
            y: 0.1 + Math.random() * 0.85,
            r: 1.5,
            maxR: 5 + Math.random() * 4,
            life: 0.22,
            maxLife: 0.22,
          });
        }
        drop.y = -0.05;
        drop.x = Math.random();
      }
      if (drop.x < -0.05) drop.x = 1.05;
      if (drop.x > 1.05) drop.x = -0.05;
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
    const baseSpeed = this.turboTimer > 0 ? 0.66 : 0.46;
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

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    const minX = 0.06;
    const maxX = 0.94;
    const minY = 0.41;
    const maxY = 0.94;
    this.player.x = Math.max(minX, Math.min(maxX, this.player.x));
    this.player.y = Math.max(minY, Math.min(maxY, this.player.y));

    const speedMag = Math.hypot(this.player.vx, this.player.vy);
    this.player.ballSpin += speedMag * dt * 20;

    // Collision with Player Zigzag Cones & Queen Cones => Instant Restart!
    const allCones = [...this.config.playerCones, ...this.config.queenCones];
    for (const cone of allCones) {
      const dist = this._distAspect(this.player.x, this.player.y, cone.x, cone.y);
      if (dist < (this.player.r + cone.r) * 0.70) {
        this._triggerFail('נתקעת בקונוס! מתחילים מחדש 🚧');
        return;
      }
    }

    // Collision with Queen => Instant Restart!
    const distQueen = this._distAspect(this.player.x, this.player.y, this.queen.x, this.queen.y);
    if (distQueen < (this.player.r + this.queen.r) * 0.85) {
      this._triggerFail('המלכה חטפה לך את הכדור! 👑');
      return;
    }
  }

  _updateQueen(dt) {
    if (this.queen.blockFlash > 0) {
      this.queen.blockFlash = Math.max(0, this.queen.blockFlash - dt);
    }

    if (this.queenFreezeTimer > 0) {
      return;
    }

    let targetX = this.player.x;
    const incoming = this.balls.find((b) => b.vy < 0 && b.y > this.queen.y - 0.03);
    if (incoming) {
      targetX = incoming.x;
    }

    const rageMult = 1 + (this.boss.maxHp - this.boss.hp) * 0.07;
    const maxSpd = this.config.queenSpeed * rageMult;

    const dx = targetX - this.queen.x;
    const desiredVx = Math.max(-maxSpd, Math.min(maxSpd, dx * 3.4));
    this.queen.vx += (desiredVx - this.queen.vx) * Math.min(1, 9 * dt);
    this.queen.x += this.queen.vx * dt;
    this.queen.x = Math.max(0.09, Math.min(0.91, this.queen.x));

    // Zigzag slalom Y computation: Queen slides smoothly AROUND her zigzag cones!
    let targetY = 0.31;
    let nearestCone = null;
    let nearestDistX = 999;
    for (const cone of this.config.queenCones) {
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

    if (this.config.queenShotInterval > 0) {
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

    const rageMult = 1 + (this.boss.maxHp - this.boss.hp) * 0.09;
    const speed = this.config.bossSpeed * rageMult;

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
    } else {
      if (Math.abs(this.boss.vx) < speed * 0.6) {
        this.boss.vx = (this.boss.vx >= 0 ? 1 : -1) * speed * 0.8;
      }
    }

    this.boss.x += this.boss.vx * dt;
    if (this.boss.x < 0.11) {
      this.boss.x = 0.11;
      this.boss.vx = Math.abs(this.boss.vx);
    } else if (this.boss.x > 0.89) {
      this.boss.x = 0.89;
      this.boss.vx = -Math.abs(this.boss.vx);
    }
  }

  _updateDefenders(dt) {
    for (const d of this.defenders) {
      d.x += d.dir * d.speed * dt;
      if (d.x < 0.1) {
        d.x = 0.1;
        d.dir = 1;
      } else if (d.x > 0.9) {
        d.x = 0.9;
        d.dir = -1;
      }

      const dist = this._distAspect(this.player.x, this.player.y, d.x, d.y);
      if (dist < (this.player.r + d.r) * 0.82) {
        this._triggerFail('נתקעת בשומר! מתחילים מחדש 🛡️');
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

      if (b.fire) {
        this._spawnParticles(b.x, b.y + 0.01, '#fb923c', 1);
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

      if (b.vy < 0 && this.queenFreezeTimer <= 0 && !b.fire) {
        const dq = this._distAspect(b.x, b.y, this.queen.x, this.queen.y);
        if (dq < b.r + this.queen.r * 0.90) {
          this.queen.blockFlash = 0.2;
          sound.queenBlock();
          this._spawnParticles(b.x, b.y, '#e879f9', 10);
          this._addFloatingText(this.queen.x, this.queen.y - 0.04, 'נחסם! 👑', '#f0abfc');
          this.balls.splice(i, 1);
          continue;
        }
      }

      if (b.vy < 0) {
        const db = this._distAspect(b.x, b.y, this.boss.x, this.boss.y);
        if (db < b.r + this.boss.r * 1.12) {
          this.boss.hp = Math.max(0, this.boss.hp - 1);
          this.boss.hitFlash = 0.22;
          this.shakeTime = 0.16;
          this.shakeMag = b.fire ? 9 : 6;
          sound.bossHit(b.fire);
          this._spawnParticles(b.x, b.y, b.fire ? '#f97316' : '#facc15', 22);
          this._addFloatingText(
            this.boss.x,
            this.boss.y + 0.04,
            'בום! ניצחון! ⚽🏆',
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
      if (dp < (h.r + this.player.r) * 0.8) {
        this._triggerFail('נפגעת ממכשול של המלכה! 💥');
        return;
      }
    }
  }

  _updatePowerups(dt) {
    this.powerupTimer -= dt;
    if (this.powerupTimer <= 0 && this.powerups.length < 2) {
      this.powerupTimer = this.config.powerupInterval;
      const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
      for (let attempt = 0; attempt < 10; attempt++) {
        const px = 0.16 + Math.random() * 0.68;
        const py = 0.50 + Math.random() * 0.34;
        const tooClose = this.config.playerCones.some((c) => this._distAspect(px, py, c.x, c.y) < 0.09);
        if (!tooClose) {
          this.powerups.push({ x: px, y: py, r: 0.032, type, life: 9.0, bob: Math.random() * Math.PI * 2 });
          break;
        }
      }
    }

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.life -= dt;
      p.bob += dt * 5;
      if (p.life <= 0) {
        this.powerups.splice(i, 1);
        continue;
      }

      const dp = this._distAspect(p.x, p.y, this.player.x, this.player.y);
      if (dp < p.r + this.player.r) {
        sound.powerup();
        if (p.type.id === 'fire') {
          this.fireShotsLeft += 2;
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

  _updateEffects(dt) {
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
    this.floatingTexts.push({ x, y, text, color, life: 0.85, maxLife: 0.85 });
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
    this._drawZigzagGuide(this.config.queenCones, 'rgba(232, 121, 249, 0.24)');
    this._drawZigzagGuide(this.config.playerCones, 'rgba(255, 255, 255, 0.16)');

    // 5. Aim Line from Player
    if (this.player.hasBall && this.state === 'playing') {
      const px = this.player.x * W;
      const py = this.player.y * H;
      ctx.save();
      ctx.strokeStyle = this.fireShotsLeft > 0 ? 'rgba(251, 146, 60, 0.6)' : 'rgba(255, 255, 255, 0.34)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(px, py - this.player.r * W);
      ctx.lineTo(px + this.player.vx * W * 0.28, this.boss.y * H);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Power-ups
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

    // 7. Zigzag Cones
    for (const cone of [...this.config.queenCones, ...this.config.playerCones]) {
      this._drawCone(cone.x * W, cone.y * H, cone.r * W, world.coneColor, tod.shadowScale);
    }

    // 8. Moving Defenders
    for (const d of this.defenders) {
      this._drawDefender(d.x * W, d.y * H, d.r * W);
    }

    // 9. Boss
    this._drawBoss(this.boss.x * W, this.boss.y * H, this.boss.r * W, world.bossColor, tod.shadowScale);

    // 10. Boss Queen
    this._drawQueen(this.queen.x * W, this.queen.y * H, this.queen.r * W, world.queenColor, tod.shadowScale);

    // 11. Player + Dribble Ball
    this._drawPlayer(this.player.x * W, this.player.y * H, this.player.r * W, tod.shadowScale);

    // 12. Active Soccer Balls
    for (const b of this.balls) {
      this._drawSoccerBall(b.x * W, b.y * H, b.r * W, b.spin, b.fire);
    }

    // 13. Queen's Thrown Hazards
    for (const h of this.hazards) {
      this._drawHazard(h.x * W, h.y * H, h.r * W, h.rot);
    }

    // 14. Day / Night Atmospheric Lighting + Stadium Spotlights
    this._drawTimeOfDayLighting(W, H, tod);

    // 15. Falling Rain Streaks & Jagged Lightning Bolts
    this._drawRainAndLightning(W, H, world);

    // 16. Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 17. Floating Texts
    for (const t of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.font = '800 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x * W, t.y * H);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x * W, t.y * H);
      ctx.restore();
    }

    // 18. Restart Red Vignette Flash
    if (this.state === 'restarting') {
      ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.42, this.restartTimer)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // 19. Confetti
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

    // Ambient tint overlay
    ctx.fillStyle = tod.ambientOverlay;
    ctx.fillRect(0, 0, W, H);

    if (tod.sunbeams) {
      // Warm diagonal sunbeams for dawn/morning/noon
      const grad = ctx.createLinearGradient(0, 0, W, H * 0.7);
      grad.addColorStop(0, 'rgba(255, 250, 200, 0.14)');
      grad.addColorStop(0.5, 'rgba(255, 250, 200, 0.04)');
      grad.addColorStop(1, 'rgba(255, 250, 200, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    if (tod.isNight) {
      // Stadium floodlight pools illuminating the Player, Queen, and Boss
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

  _drawRainAndLightning(W, H, world) {
    const ctx = this.ctx;
    const wind = world.weather.rainWind;

    // 1. Rain streaks
    ctx.save();
    ctx.strokeStyle = 'rgba(215, 238, 255, 0.62)';
    ctx.lineWidth = 1.35;
    ctx.lineCap = 'round';
    for (const d of this.rainDrops) {
      ctx.globalAlpha = d.alpha;
      const x1 = d.x * W;
      const y1 = d.y * H;
      const x2 = x1 + wind * W * 0.14;
      const y2 = y1 + d.len * H;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Jagged Lightning Bolts
    for (const bolt of this.lightningBolts) {
      const alpha = Math.max(0, bolt.life / bolt.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Outer cyan-blue electric glow
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      for (const seg of bolt.segments) {
        ctx.moveTo(seg.x1 * W, seg.y1 * H);
        ctx.lineTo(seg.x2 * W, seg.y2 * H);
      }
      ctx.stroke();

      // Core bright white bolt
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

      // Impact flash circle on pitch
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

    // 3. Full-screen sky lightning flash
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

  _drawBoss(x, y, r, color, shadowScale = 1) {
    const ctx = this.ctx;
    ctx.save();
    const bob = Math.sin(this.boss.angryPhase) * 2.5;

    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.85, r * 1.0 * shadowScale, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.boss.hitFlash > 0 ? '#ffffff' : color;
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y + bob, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.7, y - r * 0.55 + bob);
    ctx.lineTo(x - r * 1.05, y - r * 1.15 + bob);
    ctx.lineTo(x - r * 0.25, y - r * 0.85 + bob);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + r * 0.7, y - r * 0.55 + bob);
    ctx.lineTo(x + r * 1.05, y - r * 1.15 + bob);
    ctx.lineTo(x + r * 0.25, y - r * 0.85 + bob);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.08 + bob, r * 0.2, 0, Math.PI * 2);
    ctx.arc(x + r * 0.32, y - r * 0.08 + bob, r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.05 + bob, r * 0.09, 0, Math.PI * 2);
    ctx.arc(x + r * 0.3, y - r * 0.05 + bob, r * 0.09, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.55, y - r * 0.35 + bob);
    ctx.lineTo(x - r * 0.12, y - r * 0.18 + bob);
    ctx.moveTo(x + r * 0.55, y - r * 0.35 + bob);
    ctx.lineTo(x + r * 0.12, y - r * 0.18 + bob);
    ctx.stroke();

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
    const tilt = Math.max(-0.22, Math.min(0.22, this.queen.vx * 0.45));

    ctx.translate(x, y);
    ctx.rotate(tilt);

    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.85, r * 0.95 * shadowScale, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.queen.blockFlash > 0 ? '#ffffff' : frozen ? '#38bdf8' : color;
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

    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(-r * 0.26, -r * 0.02, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.26, -r * 0.02, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    if (frozen) {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.52)';
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 2;
      ctx.fillRect(-r * 1.1, -r * 1.15, r * 2.2, r * 2.2);
      ctx.strokeRect(-r * 1.1, -r * 1.15, r * 2.2, r * 2.2);
    }

    ctx.restore();
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
    ctx.save();

    if (this.turboTimer > 0) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
      ctx.beginPath();
      ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.85, r * 0.9 * shadowScale, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2563eb';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(r * 0.95)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('10', x, y + 1);

    if (this.player.hasBall) {
      const ballR = r * 0.62;
      this._drawSoccerBall(x, y - r * 1.28, ballR, this.player.ballSpin, this.fireShotsLeft > 0);
    }

    ctx.restore();
  }

  _drawSoccerBall(x, y, r, spin, isFire) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    if (isFire) {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.45)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.rotate(spin);
    ctx.fillStyle = isFire ? '#fef08a' : '#ffffff';
    ctx.strokeStyle = isFire ? '#ea580c' : '#0f172a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isFire ? '#dc2626' : '#0f172a';
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

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.pointer.active || e.pointerId !== this.pointer.id) return;
      if (this.state !== 'playing') return;

      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const dx = x - this.pointer.lastX;
      const dy = y - this.pointer.lastY;
      this.pointer.movedDist += Math.hypot(dx, dy);

      const dragGain = this.turboTimer > 0 ? 1.38 : 1.18;
      this.player.x += dx * dragGain;
      this.player.y += dy * dragGain;
      this.player.vx = dx * 24;
      this.player.vy = dy * 24;

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
