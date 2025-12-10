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

let MANUAL_TIME_SCALE = 1; // valor vindo do slider
let TIME_SCALE = 1; // valor efetivo (pode ser alterado por slow motion)
let MIN_SPEED = 30; // px/s (ajustável pela UI)
let BASE_HP = 180; // ajustável pela UI
const MAX_SPEED = 500;
const SPEED_INCREASE_FACTOR = 1.1; // 10%

const TEAM_COLORS = ['#60a5fa', '#f97316'];

// Config por time (battle)
const TEAM_CONFIGS = [
  { baseHp: 180, damageMult: 1 },
  { baseHp: 180, damageMult: 1 },
];

const SWORD_INTERVAL = 7; // s
const SWORD_DAMAGE_MULT = 1.5;

const KAME_SPEED = 1200;
const KAME_BASE_WIDTH = 0.08; // fração do raio da arena
const KAME_BASE_LENGTH = 1.4; // fração do raio da arena

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
const SLOW_MO_DURATION = 1.5; // s
const SLOW_MO_FACTOR = 0.2; // 20% da velocidade normal

// Fim de rodada (battle)
let roundEnding = false;
let roundEndTimer = 0;
let roundMvp = null;
const ROUND_END_DURATION = 2.2; // segundos em câmera lenta

// Ajusta o tamanho do canvas
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  canvas.width = size * window.devicePixelRatio;
  canvas.height = size * window.devicePixelRatio;

  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  width = canvas.width;
  height = canvas.height;
  arenaRadius = Math.min(width, height) * 0.45; // um pouco de margem
}

window.addEventListener('resize', () => {
  resizeCanvas();
  // após resize mantemos a proporção das posições
});

class Shape {
  constructor(id, type, x, y, radius, mass, color, team = 0, isStar = false) {
    this.id = id;
    this.type = type; // 'circle' | 'square' | 'triangle'
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.baseRadius = radius;
    this.mass = mass;
    this.color = color;
    this.team = team;
    this.isStar = isStar;
    this.role = 'normal';

    // Classe Lança
    this.lancaCooldown = 0;
    this.lancaDashActive = false;
    this.lancaDashTimer = 0;

    // Classe Evoker / Grower
    this.isEvoker = false;
    this.isGrower = false;

    const angle = Math.random() * Math.PI * 2;
    const speed = MIN_SPEED + Math.random() * (MIN_SPEED * 4);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.maxHp = BASE_HP;
    this.hp = this.maxHp;
    this.damageOut = 1; // multiplicador de dano causado
    this.damageIn = 1; // multiplicador de dano recebido
    this.killStreak = 0;
    this.hasSword = false;
    this.lastSoldierStacks = 0;
    this.isLastSoldierBuffed = false;

    // Super geométrico
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

      // Marcadores visuais por classe
      const dirAngle = Math.atan2(this.vy, this.vx) || 0;

      // SUPER: anel grosso em volta
      if (this.isSuper) {
        ctx.save();
        ctx.strokeStyle = this.superDashActive ? '#f97316' : '#e5e7eb';
        ctx.lineWidth = 3 * window.devicePixelRatio;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // LANÇA: seta apontando na direção da velocidade
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

      // EVOKER: dois pequenos orbes orbitando
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

      // GROWER: cruz/grade em cima do corpo
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

      // Minions do Evoker: pequeno círculo de contorno
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
    // limita velocidade máxima só para evitar bug
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

  // reseta estado de fim de rodada
  roundEnding = false;
  roundEndTimer = 0;
  roundMvp = null;

  // a cada novo round, volta a velocidade para 1x
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

// Colisão com borda circular (arena)
function handleWallCollision(shape) {
  const cx = width / 2;
  const cy = height / 2;
  const dx = shape.x - cx;
  const dy = shape.y - cy;
  const dist = Math.hypot(dx, dy);

  if (dist + shape.radius > arenaRadius) {
    // empurra de volta para dentro
    const overlap = dist + shape.radius - arenaRadius;
    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);
    shape.x -= nx * overlap;
    shape.y -= ny * overlap;

    // reflexo do vetor velocidade na normal da parede
    const dot = shape.vx * nx + shape.vy * ny;
    shape.vx -= 2 * dot * nx;
    shape.vy -= 2 * dot * ny;

    // leve boost para garantir que continue se movendo
    shape.applyMinSpeed();
  }
}

// Colisão entre dois círculos (usamos círculo envolvente para todas as formas)
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

    const aShield = a.superDashActive ? 0.2 : 1; // 80% de escudo
    const bShield = b.superDashActive ? 0.2 : 1;
    const aDashDmg = a.superDashActive ? 1.5 : 1; // 50% mais dano
    const bDashDmg = b.superDashActive ? 1.5 : 1;

    const aLancaDash = a.role === 'lanca' && a.lancaDashActive;
    const bLancaDash = b.role === 'lanca' && b.lancaDashActive;

    dmgToA *= bOutBase * bDashDmg;
    dmgToB *= aOutBase * aDashDmg;

    const aLancaShield = aLancaDash ? 0.15 : 1; // 85% imune durante o dash
    const bLancaShield = bLancaDash ? 0.15 : 1;

    dmgToA *= aInBase * aShield * aLancaShield;
    dmgToB *= bInBase * bShield * bLancaShield;

    if (b.hasSword) dmgToA *= SWORD_DAMAGE_MULT;
    if (a.hasSword) dmgToB *= SWORD_DAMAGE_MULT;

    // Lança: dano escala com velocidade e sofre 50% do dano infligido
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

    // Quem está mais rápido na colisão sofre 15% menos dano
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

    // Evoker: invoca 2 círculos quando recebe hit e não morre
    if (!aDied && a.role === 'evoker' && prevHpA > a.hp) {
      spawnEvokerMinions(a, 2);
    }
    if (!bDied && b.role === 'evoker' && prevHpB > b.hp) {
      spawnEvokerMinions(b, 2);
    }

    // Grower: cresce a cada colisão até 3x
    if (a.role === 'grower') {
      applyGrowerStack(a);
    }
    if (b.role === 'grower') {
      applyGrowerStack(b);
    }

    // Contagem de colisões para supers
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
        // trilha visual do dash
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

  // Garantia extra: nunca deixar ninguém parado
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
          const heal = s.maxHp * 0.5; // cura 50% do HP ao pegar a espada
          s.hp = Math.min(s.maxHp, s.hp + heal);
          sword = null;
          addBattleLog(`Geom T${s.team} pegou a espada [+50% HP]!`);
          break;
        }
      }
    }

    shapes = shapes.filter((s) => s.hp > 0);

    // Lança: dash automático a cada 3.5s sem colisão
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

    // Super dash logic
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

      // câmera lenta forte no final
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
        // volta pro tempo normal e reinicia próxima rodada
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

function drawArena() {
  const cx = width / 2;
  const cy = height / 2;

  const grad = ctx.createRadialGradient(cx, cy, arenaRadius * 0.1, cx, cy, arenaRadius);
  grad.addColorStop(0, '#0b1120');
  grad.addColorStop(1, '#020617');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, arenaRadius, 0, Math.PI * 2);
  ctx.fill();

  const borderGrad = ctx.createRadialGradient(cx, cy, arenaRadius * 0.8, cx, cy, arenaRadius);
  borderGrad.addColorStop(0, 'rgba(251, 191, 36, 0.0)');
  borderGrad.addColorStop(1, 'rgba(251, 191, 36, 0.8)');

  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = arenaRadius * 0.03;
  ctx.beginPath();
  ctx.arc(cx, cy, arenaRadius - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  if (mode === 'battle') {
    const margin = 12 * window.devicePixelRatio;
    const barWidth = width * 0.35;
    const barHeight = 10 * window.devicePixelRatio;

    const teams = [0, 1];
    for (let t of teams) {
      // minions (role === 'minion') não contam para a vida total do time
      const teamShapes = shapes.filter((s) => s.team === t && s.role !== 'minion');
      const totalMax = teamShapes.reduce((acc, s) => acc + s.maxHp, 0);
      const totalHp = teamShapes.reduce((acc, s) => acc + Math.max(0, s.hp), 0);
      const pct = totalMax > 0 ? totalHp / totalMax : 0;

      const x = t === 0 ? margin : width - margin - barWidth;
      const y = margin;

      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.fillStyle = TEAM_COLORS[t];
      ctx.fillRect(x, y, barWidth * pct, barHeight);
    }
  }
}

function drawSplashes(dt) {
  const decay = 1.8;
  for (let i = splashes.length - 1; i >= 0; i--) {
    const s = splashes[i];
    s.r += (s.maxR - s.r) * dt * 4;
    s.alpha -= decay * dt;
    if (s.alpha <= 0) {
      splashes.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.strokeStyle = s.color || '#e5e7eb';
    ctx.lineWidth = 2 * window.devicePixelRatio;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawLancaTrails(dt) {
  const decay = 4;
  for (let i = lancaTrails.length - 1; i >= 0; i--) {
    const t = lancaTrails[i];
    t.r += dt * 200;
    t.alpha -= decay * dt;
    if (t.alpha <= 0) {
      lancaTrails.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = t.alpha;
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 1.5 * window.devicePixelRatio;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSword() {
  if (!sword) return;
  ctx.save();
  ctx.translate(sword.x, sword.y);
  ctx.strokeStyle = '#fbbf24';
  ctx.fillStyle = '#fef3c7';
  ctx.lineWidth = 2 * window.devicePixelRatio;
  ctx.beginPath();
  ctx.moveTo(0, -sword.r);
  ctx.lineTo(sword.r * 0.4, sword.r);
  ctx.lineTo(-sword.r * 0.4, sword.r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawKamehamehas() {
  for (const b of kamehamehas) {
    const lifeT = b.life / b.maxLife;
    const alpha = Math.max(0, 1 - lifeT * 1.2);
    const width = b.width * (1 + 0.3 * Math.sin(lifeT * Math.PI * 2));

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));

    // Glow externo
    const glowGrad = ctx.createLinearGradient(-b.length / 2, 0, b.length / 2, 0);
    glowGrad.addColorStop(0, `rgba(56, 189, 248, ${0.0 * alpha})`);
    glowGrad.addColorStop(0.5, `rgba(59, 130, 246, ${0.6 * alpha})`);
    glowGrad.addColorStop(1, `rgba(56, 189, 248, ${0.0 * alpha})`);

    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = glowGrad;
    ctx.fillRect(-b.length / 2, -width, b.length, width * 2);

    // Núcleo branco
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#e5f4ff';
    ctx.fillRect(-b.length / 2, -width * 0.4, b.length, width * 0.8);

    ctx.restore();
  }
}

function drawMvpZoom() {
  if (!roundEnding || !roundMvp) return;

  const current = shapes.find((s) => s.id === roundMvp.id) || roundMvp;
  if (!current) return;

  // escurece o fundo
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // "zoom" aproximando o MVP para o centro
  const zoom = 2.4;
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-current.x, -current.y);
  current.draw(ctx);
  ctx.restore();

  // texto MVP
  ctx.save();
  ctx.fillStyle = '#e5e7eb';
  ctx.textAlign = 'center';
  ctx.font = `${12 * window.devicePixelRatio}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
  const label = `MVP TIME ${current.team === 0 ? 'AZUL' : 'LARANJA'}`;
  ctx.fillText(label, width / 2, height * 0.12);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  drawArena();
  drawSword();
  drawKamehamehas();
  drawLancaTrails(1 / 60);
  drawSplashes(1 / 60);
  for (const s of shapes) {
    s.draw(ctx);
  }
  drawMvpZoom();
}

function splitOffChild(parent) {
  if (!parent || parent.radius <= arenaRadius / 80) return;
  if (shapes.length > 120) return;

  const newRadius = parent.radius * 0.7;
  parent.radius = newRadius;
  parent.mass = Math.max(parent.mass * 0.7, 1);

  const angle = Math.random() * Math.PI * 2;
  const speed = Math.max(Math.hypot(parent.vx, parent.vy), MIN_SPEED);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;

const child = new Shape(Date.now() + Math.random(), parent.type, parent.x, parent.y, newRadius, parent.mass, parent.color, parent.team, false);
  child.vx = vx;
  child.vy = vy;
  child.applyMinSpeed();
  shapes.push(child);
}

function spawnEvokerMinions(caster, count) {
  if (!caster) return;
  const maxShapes = 160;
  for (let i = 0; i < count; i++) {
    if (shapes.length >= maxShapes) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = caster.radius * (1.2 + Math.random() * 0.5);
    const x = caster.x + Math.cos(angle) * dist;
    const y = caster.y + Math.sin(angle) * dist;
    const radius = caster.baseRadius * 0.5;
    const mass = Math.max(radius * 0.6, 1);
    const minion = new Shape(Date.now() + Math.random(), 'circle', x, y, radius, mass, caster.color, caster.team, false);
    minion.maxHp = 1;
    minion.hp = 1;
    minion.damageOut = 0.2;
    minion.damageIn = 1;
    minion.role = 'minion';
    minion.applyMinSpeed();
    shapes.push(minion);
  }
}

function applyGrowerStack(shape) {
  if (!shape || !shape.isGrower) return;
  const maxRadius = shape.baseRadius * 3;
  if (shape.radius >= maxRadius) return;
  shape.radius *= 1.15;
  shape.mass *= 1.15;
  shape.damageOut *= 1.15;
  shape.vx *= 0.9;
  shape.vy *= 0.9;
  if (shape.radius > maxRadius) {
    shape.radius = maxRadius;
  }
}

function addBattleLog(text) {
  if (!battleChatEl) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  battleLog.push(`[${timeStr}] ${text}`);
  if (battleLog.length > MAX_LOG_LINES) {
    battleLog = battleLog.slice(-MAX_LOG_LINES);
  }
  const visible = battleLog.slice(-3);
  battleChatEl.innerHTML = visible
    .map((line) => `<div class="chat-line">${line}</div>`)
    .join('');
}

function resetBattleLog() {
  battleLog = [];
  if (battleChatEl) {
    battleChatEl.innerHTML = '';
  }
}

function registerKill(killer, victim) {
  if (!killer || !victim) return;
  const friendly = killer.team === victim.team;
  killer.killStreak = (killer.killStreak || 0) + 1;

  if (!friendly) {
    killer.damageIn *= 0.85; // 15% menos dano recebido
    killer.damageOut *= 1.2; // 20% mais dano causado
    killer.lastSoldierStacks = (killer.lastSoldierStacks || 0) + 1;

    let healPct = 0.15;
    if (killer.hasSword) {
      healPct = 0.3; // com espada, cura por kill é maior
    }
    const heal = killer.maxHp * healPct;
    killer.hp = Math.min(killer.maxHp, killer.hp + heal);

    addBattleLog(`Geom T${killer.team} matou inimigo T${victim.team} [+armadura 15%, +dano 20%, +cura ${Math.round(healPct * 100)}%]`);
    triggerKillSlowMo();
  } else {
    killer.damageIn *= 1.2; // 20% mais dano recebido
    killer.vx *= 0.7;
    killer.vy *= 0.7;
    addBattleLog(`Geom T${killer.team} acertou aliado T${victim.team} [+30% slow, +20% dano recebido]`);
  }

  if (killer.killStreak >= 2) {
    castKamehameha(killer);
    killer.killStreak = 0;
  }
}

function castKamehameha(killer) {
  const enemies = shapes.filter((s) => s.team !== killer.team);
  if (enemies.length === 0) return;

  let closest = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    const d = Math.hypot(e.x - killer.x, e.y - killer.y);
    if (d < bestDist) {
      bestDist = d;
      closest = e;
    }
  }

  if (!closest) return;

  closest.hp = 0;
  addBattleLog(`Geom T${killer.team} usou KAMEHAMEHA em T${closest.team}!`);
  triggerKillSlowMo();

  const dx = closest.x - killer.x;
  const dy = closest.y - killer.y;
  const dist = Math.hypot(dx, dy) || 1;
  const dirX = dx / dist;
  const dirY = dy / dist;

  const len = arenaRadius * KAME_BASE_LENGTH;
  const wid = arenaRadius * KAME_BASE_WIDTH;

  const beam = {
    x: killer.x + dirX * (len * 0.15),
    y: killer.y + dirY * (len * 0.15),
    vx: dirX * KAME_SPEED,
    vy: dirY * KAME_SPEED,
    length: len,
    width: wid,
    life: 0,
    maxLife: 0.5,
    bounces: 0,
  };

  kamehamehas.push(beam);

  splashes.push({
    x: killer.x,
    y: killer.y,
    r: len * 0.2,
    maxR: len * 0.6,
    alpha: 1,
    color: '#38bdf8',
  });
}

function updateSlowMo(rawDt) {
  if (!slowMoActive) return;
  slowMoTimer -= rawDt;
  if (slowMoTimer <= 0) {
    slowMoActive = false;
    TIME_SCALE = MANUAL_TIME_SCALE;
    if (timeScaleLabel) {
      timeScaleLabel.textContent = `${MANUAL_TIME_SCALE.toFixed(2)}x`;
    }
  }
}

function triggerKillSlowMo() {
  // não aciona slow de kill se já estamos em fim de rodada
  if (roundEnding) return;
  if (!killSlowInput || !killSlowInput.checked) return;
  slowMoActive = true;
  slowMoTimer = SLOW_MO_DURATION;
  TIME_SCALE = MANUAL_TIME_SCALE * SLOW_MO_FACTOR;
  if (timeScaleLabel) {
    timeScaleLabel.textContent = `${TIME_SCALE.toFixed(2)}x`;
  }
}

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const raw = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  const clamped = Math.min(raw, 0.05);
  updateSlowMo(clamped);
  const dt = clamped * TIME_SCALE;

  if (running) {
    update(dt);
    draw();
  }

  requestAnimationFrame(loop);
}

// Controles
modeSelect.addEventListener('change', () => {
  mode = modeSelect.value;
  if (battlePanel) {
    battlePanel.style.display = mode === 'battle' ? 'block' : 'none';
  }
  setupSimulation();
});

restartBtn.addEventListener('click', () => {
  setupSimulation();
});

if (restartChatBtn) {
  restartChatBtn.addEventListener('click', () => {
    setupSimulation();
  });
}

let paused = false;
pauseBtn.addEventListener('click', () => {
  paused = !paused;
  running = !paused;
  pauseBtn.textContent = paused ? 'Continuar' : 'Pausar';
});

shapeCountInput.addEventListener('input', () => {
  const total = parseInt(shapeCountInput.value, 10) || 0;
  shapeCountLabel.textContent = String(total);

  if (mode === 'battle' && blueCountInput && orangeCountInput) {
    const half = Math.floor(total / 2);
    blueCountInput.value = half;
    orangeCountInput.value = total - half;
  }

  setupSimulation();
});

onlyCirclesInput.addEventListener('change', () => {
  onlyCircles = onlyCirclesInput.checked;
  setupSimulation();
});

speedBoostInput.addEventListener('change', () => {
  speedBoostEnabled = speedBoostInput.checked;
});

function syncTotalFromTeamCounts() {
  if (!shapeCountInput || !shapeCountLabel || !blueCountInput || !orangeCountInput) return;
  const b = parseInt(blueCountInput.value, 10) || 0;
  const o = parseInt(orangeCountInput.value, 10) || 0;
  const total = b + o;
  shapeCountInput.value = total;
  shapeCountLabel.textContent = String(total);
}

if (blueCountInput) {
  blueCountInput.addEventListener('input', () => {
    syncTotalFromTeamCounts();
    if (mode === 'battle') setupSimulation();
  });
}

if (orangeCountInput) {
  orangeCountInput.addEventListener('input', () => {
    syncTotalFromTeamCounts();
    if (mode === 'battle') setupSimulation();
  });
}

if (baseHpInput && baseHpLabel) {
  baseHpInput.addEventListener('input', () => {
    const newBase = parseFloat(baseHpInput.value) || BASE_HP;
    BASE_HP = newBase;
    baseHpLabel.textContent = BASE_HP.toFixed(0);
    // Atualiza também configs padrão de time para outros modos
    TEAM_CONFIGS[0].baseHp = BASE_HP;
    TEAM_CONFIGS[1].baseHp = BASE_HP;
    setupSimulation();
  });
}

if (blueHpInput && blueHpLabel) {
  blueHpInput.addEventListener('input', () => {
    const v = parseFloat(blueHpInput.value) || TEAM_CONFIGS[0].baseHp;
    TEAM_CONFIGS[0].baseHp = v;
    blueHpLabel.textContent = v.toFixed(0);
    if (mode === 'battle') setupSimulation();
  });
}

if (orangeHpInput && orangeHpLabel) {
  orangeHpInput.addEventListener('input', () => {
    const v = parseFloat(orangeHpInput.value) || TEAM_CONFIGS[1].baseHp;
    TEAM_CONFIGS[1].baseHp = v;
    orangeHpLabel.textContent = v.toFixed(0);
    if (mode === 'battle') setupSimulation();
  });
}

if (blueDmgInput && blueDmgLabel) {
  blueDmgInput.addEventListener('input', () => {
    const v = parseFloat(blueDmgInput.value) || 100;
    TEAM_CONFIGS[0].damageMult = v / 100;
    blueDmgLabel.textContent = `${v.toFixed(0)}%`;
    if (mode === 'battle') setupSimulation();
  });
}

if (orangeDmgInput && orangeDmgLabel) {
  orangeDmgInput.addEventListener('input', () => {
    const v = parseFloat(orangeDmgInput.value) || 100;
    TEAM_CONFIGS[1].damageMult = v / 100;
    orangeDmgLabel.textContent = `${v.toFixed(0)}%`;
    if (mode === 'battle') setupSimulation();
  });
}

const classInputs = [
  blueSuperCountSelect,
  blueLancaCountSelect,
  blueEvokerCountSelect,
  blueGrowerCountSelect,
  orangeSuperCountSelect,
  orangeLancaCountSelect,
  orangeEvokerCountSelect,
  orangeGrowerCountSelect,
].filter(Boolean);

for (const input of classInputs) {
  input.addEventListener('input', () => {
    if (mode === 'battle') setupSimulation();
  });
}

if (timeScaleInput && timeScaleLabel) {
  timeScaleInput.addEventListener('input', () => {
    const v = parseFloat(timeScaleInput.value) || 1;
    MANUAL_TIME_SCALE = v;
    if (!slowMoActive) {
      TIME_SCALE = v;
      timeScaleLabel.textContent = `${v.toFixed(2)}x`;
    } else {
      // em slow motion, só atualiza o texto base quando o efeito acabar
      timeScaleLabel.textContent = `${(TIME_SCALE).toFixed(2)}x`;
    }
  });
}

// Inicialização
resizeCanvas();
if (battlePanel) {
  battlePanel.style.display = mode === 'battle' ? 'block' : 'none';
}
setupSimulation();

if (minSpeedInput && minSpeedLabel) {
  MIN_SPEED = parseFloat(minSpeedInput.value) || MIN_SPEED;
  minSpeedLabel.textContent = MIN_SPEED.toFixed(0);
}

if (baseHpInput && baseHpLabel) {
  BASE_HP = parseFloat(baseHpInput.value) || BASE_HP;
  baseHpLabel.textContent = BASE_HP.toFixed(0);
}

if (timeScaleInput && timeScaleLabel) {
  const v = parseFloat(timeScaleInput.value) || 1;
  MANUAL_TIME_SCALE = v;
  TIME_SCALE = v;
  timeScaleLabel.textContent = `${v.toFixed(2)}x`;
}

requestAnimationFrame(loop);
