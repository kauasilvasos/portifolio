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
    killer.damageIn *= 0.85;
    killer.damageOut *= 1.2;
    killer.lastSoldierStacks = (killer.lastSoldierStacks || 0) + 1;

    let healPct = 0.15;
    if (killer.hasSword) {
      healPct = 0.3;
    }
    const heal = killer.maxHp * healPct;
    killer.hp = Math.min(killer.maxHp, killer.hp + heal);

    addBattleLog(`Geom T${killer.team} matou inimigo T${victim.team} [+armadura 15%, +dano 20%, +cura ${Math.round(healPct * 100)}%]`);
    triggerKillSlowMo();
  } else {
    killer.damageIn *= 1.2;
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
      timeScaleLabel.textContent = `${(TIME_SCALE).toFixed(2)}x`;
    }
  });
}

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
