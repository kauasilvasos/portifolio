const canvas = document.getElementById('arenaCanvas');
const ctx = canvas.getContext('2d');

const modeSelect = document.getElementById('modeSelect');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');
const shapeCountInput = document.getElementById('shapeCount');
const shapeCountLabel = document.getElementById('shapeCountLabel');
const onlyCirclesInput = document.getElementById('onlyCircles');
const speedBoostInput = document.getElementById('speedBoost');
const minSpeedInput = document.getElementById('minSpeed');
const minSpeedLabel = document.getElementById('minSpeedLabel');
const timeScaleInput = document.getElementById('timeScale');
const timeScaleLabel = document.getElementById('timeScaleLabel');
const killSlowInput = document.getElementById('killSlow');
const baseHpInput = document.getElementById('baseHp');
const baseHpLabel = document.getElementById('baseHpLabel');
const battlePanel = document.getElementById('battlePanel');
const blueHpInput = document.getElementById('blueHp');
const blueHpLabel = document.getElementById('blueHpLabel');
const orangeHpInput = document.getElementById('orangeHp');
const orangeHpLabel = document.getElementById('orangeHpLabel');
const blueDmgInput = document.getElementById('blueDmg');
const blueDmgLabel = document.getElementById('blueDmgLabel');
const orangeDmgInput = document.getElementById('orangeDmg');
const orangeDmgLabel = document.getElementById('orangeDmgLabel');
const blueSuperCountSelect = document.getElementById('blueSuperCount');
const blueLancaCountSelect = document.getElementById('blueLancaCount');
const blueEvokerCountSelect = document.getElementById('blueEvokerCount');
const blueGrowerCountSelect = document.getElementById('blueGrowerCount');
const orangeSuperCountSelect = document.getElementById('orangeSuperCount');
const orangeLancaCountSelect = document.getElementById('orangeLancaCount');
const orangeEvokerCountSelect = document.getElementById('orangeEvokerCount');
const orangeGrowerCountSelect = document.getElementById('orangeGrowerCount');
const blueCountInput = document.getElementById('blueCount');
const orangeCountInput = document.getElementById('orangeCount');
const battleChatEl = document.getElementById('battleChat');
const restartChatBtn = document.getElementById('restartChatBtn');

let width = 0;
let height = 0;
let arenaRadius = 0;
let shapes = [];
let mode = 'normal';
let running = true;
let lastTime = 0;

let MANUAL_TIME_SCALE = 1;
let TIME_SCALE = 1;
let MIN_SPEED = 30;
let BASE_HP = 180;
const MAX_SPEED = 500;
const SPEED_INCREASE_FACTOR = 1.1;

const TEAM_COLORS = ['#60a5fa', '#f97316'];

const TEAM_CONFIGS = [
  { baseHp: 180, damageMult: 1 },
  { baseHp: 180, damageMult: 1 },
];

const SWORD_INTERVAL = 7;
const SWORD_DAMAGE_MULT = 1.5;

const KAME_SPEED = 1200;
const KAME_BASE_WIDTH = 0.08;
const KAME_BASE_LENGTH = 1.4;

let splashes = [];
let kamehamehas = [];
let lancaTrails = [];
let onlyCircles = false;
let speedBoostEnabled = true;
let starId = null;
let sword = null;
let swordTimer = 0;
let battleLog = [];
const MAX_LOG_LINES = 60;

let slowMoActive = false;
let slowMoTimer = 0;
const SLOW_MO_DURATION = 1.5;
const SLOW_MO_FACTOR = 0.2;

let roundEnding = false;
let roundEndTimer = 0;
let roundMvp = null;
const ROUND_END_DURATION = 2.2;

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  canvas.width = size * window.devicePixelRatio;
  canvas.height = size * window.devicePixelRatio;

  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  width = canvas.width;
  height = canvas.height;
  arenaRadius = Math.min(width, height) * 0.45;
}

window.addEventListener('resize', () => {
  resizeCanvas();
});

class Shape {
  constructor(id, type, x, y, radius, mass, color, team = 0, isStar = false) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.baseRadius = radius;
    this.mass = mass;
    this.color = color;
    this.team = team;
    this.isStar = isStar;
    this.role = 'normal';

    this.lancaCooldown = 0;
    this.lancaDashActive = false;
    this.lancaDashTimer = 0;

    this.isEvoker = false;
    this.isGrower = false;

    const angle = Math.random() * Math.PI * 2;
    const speed = MIN_SPEED + Math.random() * (MIN_SPEED * 4);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.maxHp = BASE_HP;
    this.hp = this.maxHp;
    this.damageOut = 1;
    this.damageIn = 1;
    this.killStreak = 0;
    this.hasSword = false;
    this.lastSoldierStacks = 0;
    this.isLastSoldierBuffed = false;

    this.isSuper = false;
    this.superCollisionCount = 0;
    this.superDashPending = false;
    this.superDashTimer = 0;
    this.superDashActive = false;
    this.superDashActiveTimer = 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.isStar) {
      ctx.fillStyle = '#fee2a5';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2 * window.devicePixelRatio;
      ctx.beginPath();
      const spikes = 5;
      const outerR = this.radius;
      const innerR = this.radius * 0.5;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i * Math.PI) / spikes;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = this.color;
      switch (this.type) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'square':
          ctx.beginPath();
          ctx.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
          ctx.fill();
          break;
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(0, -this.radius);
          ctx.lineTo(this.radius, this.radius);
          ctx.lineTo(-this.radius, this.radius);
          ctx.closePath();
          ctx.fill();
          break;
      }

      const dirAngle = Math.atan2(this.vy, this.vx) || 0;

      if (this.isSuper) {
        ctx.save();
        ctx.strokeStyle = this.superDashActive ? '#f97316' : '#e5e7eb';
        ctx.lineWidth = 3 * window.devicePixelRatio;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (this.role === 'lanca') {
        ctx.save();
        ctx.rotate(dirAngle);
        const r = this.radius * 1.2;
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(r - this.radius * 0.6, this.radius * 0.3);
        ctx.lineTo(r - this.radius * 0.6, -this.radius * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (this.role === 'evoker') {
        ctx.save();
        const t = (performance.now ? performance.now() : Date.now()) / 1000;
        const baseR = this.radius * 1.4;
        const a1 = t * 2;
        const a2 = t * 2 + Math.PI;
        ctx.fillStyle = '#a855f7';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(Math.cos(a1) * baseR, Math.sin(a1) * baseR, this.radius * 0.25, 0, Math.PI * 2);
        ctx.arc(Math.cos(a2) * baseR, Math.sin(a2) * baseR, this.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (this.role === 'grower') {
        ctx.save();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5 * window.devicePixelRatio;
        const r = this.radius * 0.9;
        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(r, 0);
        ctx.moveTo(0, -r);
        ctx.lineTo(0, r);
        ctx.stroke();
        ctx.restore();
      }

      if (this.role === 'minion') {
        ctx.save();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.2 * window.devicePixelRatio;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (this.hasSword) {
        ctx.save();
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 2 * window.devicePixelRatio;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (mode === 'battle') {
      const barWidth = this.radius * 2;
      const barHeight = 4;
      const pct = Math.max(this.hp, 0) / this.maxHp;
      ctx.translate(-barWidth / 2, -this.radius - 8);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, barWidth, barHeight);
      ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#f87171';
      ctx.fillRect(0, 0, barWidth * pct, barHeight);
    }

    ctx.restore();
  }

  applyMinSpeed() {
    const speed = Math.hypot(this.vx, this.vy);
    if (speed < MIN_SPEED) {
      const factor = (MIN_SPEED + Math.random() * 10) / (speed || 1);
      this.vx *= factor;
      this.vy *= factor;
    }
    const newSpeed = Math.hypot(this.vx, this.vy);
    if (newSpeed > MAX_SPEED) {
      const f = MAX_SPEED / newSpeed;
      this.vx *= f;
      this.vy *= f;
    }
  }
}

function createRandomShape(id, forcedTeam = null) {
  const types = ['circle', 'square', 'triangle'];
  const type = onlyCircles ? 'circle' : types[Math.floor(Math.random() * types.length)];

  const baseRadius = arenaRadius / 20;
  const radius = baseRadius * (0.7 + Math.random() * 0.6);
  const mass = radius * (0.5 + Math.random());

  const r = (arenaRadius - radius - 20) * Math.sqrt(Math.random());
  const angle = Math.random() * Math.PI * 2;
  const cx = width / 2 + Math.cos(angle) * r;
  const cy = height / 2 + Math.sin(angle) * r;

  const team = mode === 'battle' ? (forcedTeam != null ? forcedTeam : (id % TEAM_COLORS.length)) : 0;

  let color;
  if (mode === 'battle') {
    color = TEAM_COLORS[team];
  } else {
    const colorPalette = ['#60a5fa', '#f97316', '#22c55e', '#e879f9', '#facc15', '#38bdf8'];
    color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
  }

  const shape = new Shape(id, type, cx, cy, radius, mass, color, team, false);

  if (mode === 'battle') {
    const cfg = TEAM_CONFIGS[team] || { baseHp: BASE_HP, damageMult: 1 };
    shape.maxHp = cfg.baseHp;
    shape.hp = shape.maxHp;
    shape.damageOut = cfg.damageMult;
    shape.damageIn = 1;
  }

  return shape;
}

function setupSimulation() {
  shapes = [];
  splashes = [];
  lancaTrails = [];
  starId = null;
  sword = null;
  swordTimer = 0;

  roundEnding = false;
  roundEndTimer = 0;
  roundMvp = null;

  MANUAL_TIME_SCALE = 1;
  TIME_SCALE = 1;
  if (timeScaleInput) {
    timeScaleInput.value = '1';
  }
  if (timeScaleLabel) {
    timeScaleLabel.textContent = '1.00x';
  }

  if (mode === 'battle') {
    resetBattleLog();
  }

  onlyCircles = !!onlyCirclesInput?.checked;
  speedBoostEnabled = !!speedBoostInput?.checked;

  const totalSlider = parseInt(shapeCountInput.value, 10) || 15;

  if (mode === 'battle' && blueCountInput && orangeCountInput) {
    let blueCount = parseInt(blueCountInput.value, 10);
    let orangeCount = parseInt(orangeCountInput.value, 10);

    if (Number.isNaN(blueCount)) blueCount = 0;
    if (Number.isNaN(orangeCount)) orangeCount = 0;

    if (blueCount <= 0 && orangeCount <= 0) {
      const half = Math.floor(totalSlider / 2);
      blueCount = half;
      orangeCount = totalSlider - half;
      blueCountInput.value = blueCount;
      orangeCountInput.value = orangeCount;
    }

    blueCount = Math.max(0, Math.min(40, blueCount));
    orangeCount = Math.max(0, Math.min(40, orangeCount));

    const total = blueCount + orangeCount;
    if (shapeCountInput && shapeCountLabel) {
      shapeCountInput.value = total;
      shapeCountLabel.textContent = String(total);
    }

    let idCounter = 0;
    for (let i = 0; i < blueCount; i++) {
      shapes.push(createRandomShape(idCounter++, 0));
    }
    for (let i = 0; i < orangeCount; i++) {
      shapes.push(createRandomShape(idCounter++, 1));
    }
  } else {
    const count = totalSlider;
    for (let i = 0; i < count; i++) {
      shapes.push(createRandomShape(i));
    }
  }

  if (mode === 'battle') {
    applyBattleClasses();
  }

  if (mode === 'star' && shapes.length > 0) {
    const index = Math.floor(Math.random() * shapes.length);
    shapes[index].isStar = true;
    starId = shapes[index].id;
  }
}

function getIntFromInput(inputEl, fallback = 0) {
  if (!inputEl) return fallback;
  const v = parseInt(inputEl.value, 10);
  return Number.isNaN(v) ? fallback : v;
}

function applyBattleClasses() {
  const teamClassConfig = {
    0: {
      super: getIntFromInput(blueSuperCountSelect, 0),
      lanca: getIntFromInput(blueLancaCountSelect, 0),
      evoker: getIntFromInput(blueEvokerCountSelect, 0),
      grower: getIntFromInput(blueGrowerCountSelect, 0),
    },
    1: {
      super: getIntFromInput(orangeSuperCountSelect, 0),
      lanca: getIntFromInput(orangeLancaCountSelect, 0),
      evoker: getIntFromInput(orangeEvokerCountSelect, 0),
      grower: getIntFromInput(orangeGrowerCountSelect, 0),
    },
  };

  for (let teamId = 0; teamId < TEAM_COLORS.length; teamId++) {
    const cfg = teamClassConfig[teamId];
    const teamShapes = shapes
      .filter((s) => s.team === teamId)
      .sort((a, b) => b.radius - a.radius);

    const assignRole = (roleName, count) => {
      let remaining = count;
      for (const s of teamShapes) {
        if (remaining <= 0) break;
        if (s.role !== 'normal') continue;
        if (roleName === 'super') {
          makeSuper(s);
        } else if (roleName === 'lanca') {
          makeLanca(s);
        } else if (roleName === 'evoker') {
          makeEvoker(s);
        } else if (roleName === 'grower') {
          makeGrower(s);
        }
        remaining--;
      }
    };

    assignRole('super', cfg.super || 0);
    assignRole('lanca', cfg.lanca || 0);
    assignRole('evoker', cfg.evoker || 0);
    assignRole('grower', cfg.grower || 0);
  }
}

function makeSuper(shape) {
  shape.role = 'super';
  shape.isSuper = true;
  shape.superCollisionCount = 0;
  shape.superDashPending = false;
  shape.superDashTimer = 0;
  shape.superDashActive = false;
  shape.superDashActiveTimer = 0;
  shape.maxHp *= 2;
  shape.hp = shape.maxHp;
  shape.radius *= 1.1;
  shape.mass *= 1.1;
  addBattleLog(`Geom T${shape.team} recebeu SUPER (vida x2, dash e escudo)`);
}

function makeLanca(shape) {
  shape.role = 'lanca';
  shape.lancaCooldown = 0;
  shape.lancaDashActive = false;
  shape.lancaDashTimer = 0;
  addBattleLog(`Geom T${shape.team} recebeu classe LANÇA`);
}

function makeEvoker(shape) {
  shape.role = 'evoker';
  shape.isEvoker = true;
  addBattleLog(`Geom T${shape.team} recebeu classe EVOKER`);
}

function makeGrower(shape) {
  shape.role = 'grower';
  shape.isGrower = true;
  addBattleLog(`Geom T${shape.team} recebeu classe GROWER`);
}

function handleWallCollision(shape) {
  const cx = width / 2;
  const cy = height / 2;
  const dx = shape.x - cx;
  const dy = shape.y - cy;
  const dist = Math.hypot(dx, dy);

  if (dist + shape.radius > arenaRadius) {
    const overlap = dist + shape.radius - arenaRadius;
    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);
    shape.x -= nx * overlap;
    shape.y -= ny * overlap;

    const dot = shape.vx * nx + shape.vy * ny;
    shape.vx -= 2 * dot * nx;
    shape.vy -= 2 * dot * ny;

    shape.applyMinSpeed();
  }
}

function handleShapeCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.radius + b.radius;

  if (dist === 0 || dist >= minDist) return;

  const overlap = minDist - dist;
  const nx = dx / dist;
  const ny = dy / dist;

  a.x -= nx * (overlap * (b.mass / (a.mass + b.mass)));
  a.y -= ny * (overlap * (b.mass / (a.mass + b.mass)));
  b.x += nx * (overlap * (a.mass / (a.mass + b.mass)));
  b.y += ny * (overlap * (a.mass / (a.mass + b.mass)));

  const dvx = b.vx - a.vx;
  const dvy = b.vy - a.vy;
  const relVel = dvx * nx + dvy * ny;

  if (relVel > 0) return;

  const restitution = 0.98;
  const impulse = (-(1 + restitution) * relVel) / (1 / a.mass + 1 / b.mass);

  const ix = impulse * nx;
  const iy = impulse * ny;

  a.vx -= ix / a.mass;
  a.vy -= iy / a.mass;
  b.vx += ix / b.mass;
  b.vy += iy / b.mass;

  a.applyMinSpeed();
  b.applyMinSpeed();

  const impactStrength = Math.abs(relVel);
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  let kill = false;

  if (mode === 'battle') {
    const damageBase = impactStrength * 0.5;
    const totalMass = a.mass + b.mass || 1;

    let dmgToA = damageBase * (b.mass / totalMass);
    let dmgToB = damageBase * (a.mass / totalMass);

    const prevHpA = a.hp;
    const prevHpB = b.hp;

    const aOutBase = a.damageOut || 1;
    const bOutBase = b.damageOut || 1;
    const aInBase = a.damageIn || 1;
    const bInBase = b.damageIn || 1;

    const aShield = a.superDashActive ? 0.2 : 1;
    const bShield = b.superDashActive ? 0.2 : 1;
    const aDashDmg = a.superDashActive ? 1.5 : 1;
    const bDashDmg = b.superDashActive ? 1.5 : 1;

    const aLancaDash = a.role === 'lanca' && a.lancaDashActive;
    const bLancaDash = b.role === 'lanca' && b.lancaDashActive;

    dmgToA *= bOutBase * bDashDmg;
    dmgToB *= aOutBase * aDashDmg;

    const aLancaShield = aLancaDash ? 0.15 : 1;
    const bLancaShield = bLancaDash ? 0.15 : 1;

    dmgToA *= aInBase * aShield * aLancaShield;
    dmgToB *= bInBase * bShield * bLancaShield;

    if (b.hasSword) dmgToA *= SWORD_DAMAGE_MULT;
    if (a.hasSword) dmgToB *= SWORD_DAMAGE_MULT;

    if (aLancaDash) {
      const speed = Math.hypot(a.vx, a.vy);
      const speedFactor = Math.min(1 + speed / 400, 3);
      dmgToB *= speedFactor;
      const recoil = dmgToB * 0.5;
      a.hp -= recoil;
    }
    if (bLancaDash) {
      const speed = Math.hypot(b.vx, b.vy);
      const speedFactor = Math.min(1 + speed / 400, 3);
      dmgToA *= speedFactor;
      const recoil = dmgToA * 0.5;
      b.hp -= recoil;
    }

    const speedA = Math.hypot(a.vx, a.vy);
    const speedB = Math.hypot(b.vx, b.vy);
    if (speedA > speedB) {
      dmgToA *= 0.85;
    } else if (speedB > speedA) {
      dmgToB *= 0.85;
    }

    a.hp -= dmgToA;
    b.hp -= dmgToB;

    const aDied = a.hp <= 0;
    const bDied = b.hp <= 0;

    if (aDied && !bDied) {
      kill = true;
      registerKill(b, a);
    } else if (bDied && !aDied) {
      kill = true;
      registerKill(a, b);
    } else if (aDied && bDied) {
      kill = true;
    }

    if (!aDied && a.role === 'evoker' && prevHpA > a.hp) {
      spawnEvokerMinions(a, 2);
    }
    if (!bDied && b.role === 'evoker' && prevHpB > b.hp) {
      spawnEvokerMinions(b, 2);
    }

    if (a.role === 'grower') {
      applyGrowerStack(a);
    }
    if (b.role === 'grower') {
      applyGrowerStack(b);
    }

    if (a.isSuper) {
      a.superCollisionCount = (a.superCollisionCount || 0) + 1;
      if (a.superCollisionCount >= 2 && !a.superDashPending && !a.superDashActive) {
        a.superCollisionCount = 0;
        a.superDashPending = true;
        a.superDashTimer = 0.5;
      }
    }
    if (b.isSuper) {
      b.superCollisionCount = (b.superCollisionCount || 0) + 1;
      if (b.superCollisionCount >= 2 && !b.superDashPending && !b.superDashActive) {
        b.superCollisionCount = 0;
        b.superDashPending = true;
        b.superDashTimer = 0.5;
      }
    }
  }

  if (mode === 'grower') {
    a.radius *= 1.1;
    b.radius *= 1.1;
    a.mass *= 1.1;
    b.mass *= 1.1;
  }

  if (mode === 'star') {
    if (a.isStar && !b.isStar) {
      const boost = 200 + impactStrength * 0.5;
      a.vx += nx * boost;
      a.vy += ny * boost;
      shapes = shapes.filter((s) => s !== b);
      kill = true;
    } else if (b.isStar && !a.isStar) {
      const boost = 200 + impactStrength * 0.5;
      b.vx -= nx * boost;
      b.vy -= ny * boost;
      shapes = shapes.filter((s) => s !== a);
      kill = true;
    }
  }

  if (mode === 'split') {
    splitOffChild(a);
    splitOffChild(b);
  }

  if (speedBoostEnabled) {
    const boost = SPEED_INCREASE_FACTOR;
    a.vx *= boost;
    a.vy *= boost;
    b.vx *= boost;
    b.vy *= boost;
  }

  const splashColor = kill ? '#ef4444' : '#e5e7eb';
  splashes.push({
    x: midX,
    y: midY,
    r: (a.radius + b.radius) * 0.6,
    maxR: (a.radius + b.radius) * 2,
    alpha: 0.9,
    color: splashColor,
  });
}

function updateKamehamehas(dt) {
  const cx = width / 2;
  const cy = height / 2;

  for (let i = kamehamehas.length - 1; i >= 0; i--) {
    const b = kamehamehas[i];
    b.life += dt;
    if (b.life > b.maxLife) {
      kamehamehas.splice(i, 1);
      continue;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    const dx = b.x - cx;
    const dy = b.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const nX = dx / dist;
    const nY = dy / dist;

    if (dist > arenaRadius * 0.95 && b.bounces < 1) {
      const dot = b.vx * nX + b.vy * nY;
      b.vx -= 2 * dot * nX;
      b.vy -= 2 * dot * nY;
      b.bounces += 1;

      const innerR = arenaRadius * 0.85;
      b.x = cx + nX * innerR;
      b.y = cy + nY * innerR;

      splashes.push({
        x: b.x,
        y: b.y,
        r: b.width * 1.2,
        maxR: b.width * 3,
        alpha: 1,
        color: '#93c5fd',
      });
    }
  }
}

function update(dt) {
  for (const s of shapes) {
    if (mode === 'blackhole') {
      const cx = width / 2;
      const cy = height / 2;
      const dx = cx - s.x;
      const dy = cy - s.y;
      const dist = Math.hypot(dx, dy) || 1;
      const strength = 5000 / (dist * dist);
      const ax = (dx / dist) * strength;
      const ay = (dy / dist) * strength;
      s.vx += ax * dt;
      s.vy += ay * dt;
    }

    s.x += s.vx * dt;
    s.y += s.vy * dt;

    if (mode === 'battle' && s.role === 'lanca') {
      s.lancaCooldown += dt;
      if (s.lancaDashActive) {
        s.lancaDashTimer -= dt;
        if (s.lancaDashTimer <= 0) {
          s.lancaDashActive = false;
        }
        lancaTrails.push({
          x: s.x,
          y: s.y,
          r: s.radius * 0.7,
          alpha: 0.8,
          color: TEAM_COLORS[s.team],
        });
      }
    }
  }

  for (const s of shapes) {
    handleWallCollision(s);
  }

  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      handleShapeCollision(shapes[i], shapes[j]);
    }
  }

  for (const s of shapes) {
    s.applyMinSpeed();
  }

  if (mode === 'battle') {
    swordTimer += dt;
    if (!sword && swordTimer >= SWORD_INTERVAL) {
      sword = {
        x: width / 2,
        y: height / 2,
        r: arenaRadius / 18,
      };
      swordTimer = 0;
      addBattleLog('Uma espada apareceu no centro da arena!');
    }

    if (sword) {
      for (const s of shapes) {
        const dx = s.x - sword.x;
        const dy = s.y - sword.y;
        const dist = Math.hypot(dx, dy);
        if (dist < s.radius + sword.r) {
          s.hasSword = true;
          const heal = s.maxHp * 0.5;
          s.hp = Math.min(s.maxHp, s.hp + heal);
          sword = null;
          addBattleLog(`Geom T${s.team} pegou a espada [+50% HP]!`);
          break;
        }
      }
    }

    shapes = shapes.filter((s) => s.hp > 0);

    for (const s of shapes) {
      if (s.role === 'lanca' && !s.lancaDashActive && s.lancaCooldown >= 3.5) {
        const enemies = shapes.filter((e) => e.team !== s.team);
        if (enemies.length > 0) {
          let target = enemies[0];
          for (const e of enemies) {
            if (e.hp < target.hp) target = e;
          }
          const dx = target.x - s.x;
          const dy = target.y - s.y;
          const dist = Math.hypot(dx, dy) || 1;
          const dirX = dx / dist;
          const dirY = dy / dist;
          const dashSpeed = 900;
          s.vx = dirX * dashSpeed;
          s.vy = dirY * dashSpeed;
          s.lancaDashActive = true;
          s.lancaDashTimer = 0.35;
          s.lancaCooldown = 0;
          addBattleLog(`LANÇA T${s.team} avançou no inimigo com menos HP!`);
        }
      }
    }

    const aliveCount = shapes.length;
    if (aliveCount > 0 && aliveCount < 4) {
      const cx = width / 2;
      const cy = height / 2;
      const orbitStrength = 40;
      for (const s of shapes) {
        const dx = s.x - cx;
        const dy = s.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const tx = -dy / dist;
        const ty = dx / dist;
        s.vx += tx * orbitStrength * dt;
      }
    }

    for (const s of shapes) {
      if (!s.isSuper) continue;

      if (s.superDashPending) {
        s.superDashTimer -= dt;
        if (s.superDashTimer <= 0) {
          s.superDashPending = false;

          const enemies = shapes.filter((e) => e.team !== s.team);
          if (enemies.length > 0) {
            let closest = null;
            let bestDist = Infinity;
            for (const e of enemies) {
              const d = Math.hypot(e.x - s.x, e.y - s.y);
              if (d < bestDist) {
                bestDist = d;
                closest = e;
              }
            }
            if (closest) {
              const dx = closest.x - s.x;
              const dy = closest.y - s.y;
              const dist = Math.hypot(dx, dy) || 1;
              const dirX = dx / dist;
              const dirY = dy / dist;
              const dashSpeed = 900;
              s.vx = dirX * dashSpeed;
              s.vy = dirY * dashSpeed;
              s.superDashActive = true;
              s.superDashActiveTimer = 0.4;
              addBattleLog(`SUPER T${s.team} iniciou um DASH!`);
            }
          }
        }
      } else if (s.superDashActive) {
        s.superDashActiveTimer -= dt;
        if (s.superDashActiveTimer <= 0) {
          s.superDashActive = false;
        }
      }
    }

    if (aliveCount === 1) {
      const last = shapes[0];
      if (!last.isLastSoldierBuffed) {
        const stacks = last.lastSoldierStacks || 0;
        if (stacks > 0) {
          const sizeBoost = 1 + 0.15 * stacks;
          const powerBoost = 1 + 0.2 * stacks;
          last.radius *= sizeBoost;
          last.mass *= sizeBoost;
          last.damageOut *= powerBoost;
          addBattleLog(`Último soldado T${last.team} ficou gigante e furioso (${stacks} eliminações).`);
        } else {
          addBattleLog(`Último soldado T${last.team} resiste sozinho!`);
        }
        last.isLastSoldierBuffed = true;
      }
    }
  }

  if (mode === 'battle') {
    if (!roundEnding && shapes.length <= 1) {
      roundEnding = true;
      roundEndTimer = ROUND_END_DURATION;
      roundMvp = shapes[0] || null;

      slowMoActive = false;
      slowMoTimer = 0;
      TIME_SCALE = MANUAL_TIME_SCALE * 0.15;
      if (timeScaleLabel) {
        timeScaleLabel.textContent = `${TIME_SCALE.toFixed(2)}x`;
      }
    }

    if (roundEnding) {
      roundEndTimer -= dt;
      if (roundEndTimer <= 0) {
        TIME_SCALE = MANUAL_TIME_SCALE;
        if (timeScaleLabel) {
          timeScaleLabel.textContent = `${TIME_SCALE.toFixed(2)}x`;
        }
        setupSimulation();
        return;
      }
    }
  }

  updateKamehamehas(dt);
}
