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

    const glowGrad = ctx.createLinearGradient(-b.length / 2, 0, b.length / 2, 0);
    glowGrad.addColorStop(0, `rgba(56, 189, 248, ${0.0 * alpha})`);
    glowGrad.addColorStop(0.5, `rgba(59, 130, 246, ${0.6 * alpha})`);
    glowGrad.addColorStop(1, `rgba(56, 189, 248, ${0.0 * alpha})`);

    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = glowGrad;
    ctx.fillRect(-b.length / 2, -width, b.length, width * 2);

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

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const zoom = 2.4;
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-current.x, -current.y);
  current.draw(ctx);
  ctx.restore();

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
