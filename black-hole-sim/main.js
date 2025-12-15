const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");

let width = window.innerWidth;
let height = window.innerHeight;

canvas.width = width;
canvas.height = height;

window.addEventListener("resize", () => {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
});

const G = 1200;

const bhTypeSelect = document.getElementById("bh-type");
const bhMassSlider = document.getElementById("bh-mass");
const bhMassLabel = document.getElementById("bh-mass-label");
const cameraDistanceSlider = document.getElementById("camera-distance");
const approachSpeedSlider = document.getElementById("approach-speed");
const modeButtons = document.querySelectorAll(".mode-button");

let cameraDistance = cameraDistanceSlider
  ? parseFloat(cameraDistanceSlider.value)
  : 1;
let approachSpeed = approachSpeedSlider
  ? parseFloat(approachSpeedSlider.value)
  : 0.6;
let cameraMode = "static";
let orbitPhase = 0;

const BASE_BH_MASS = 6000;
const BASE_BH_RADIUS = 60;

class BlackHole {
  constructor(x, y, mass, radius) {
    this.x = x;
    this.y = y;
    this.baseMass = mass;
    this.mass = mass;
    this.baseRadius = radius;
    this.radius = radius;
    this.type = "schwarzschild";
    this.spin = 0;
    this.phase = 0;
    this.massScale = 1;
  }

  setType(type) {
    this.type = type;
    this.spin = type === "kerr" ? 0.9 : 0;
  }

  setMassScale(scale) {
    this.massScale = scale;
    this.mass = this.baseMass * scale;
    const radiusScale = 0.7 + 0.45 * Math.sqrt(scale);
    this.radius = this.baseRadius * radiusScale;
  }

  update(dt) {
    const spinFactor = this.type === "kerr" ? 1.6 : 1;
    this.phase += dt * 0.35 * spinFactor;
  }

  draw(cameraDistance) {
    const safeCamera = Math.max(cameraDistance, 0.25);
    const visualR = this.radius / safeCamera;
    const photonRingR = visualR * 1.4;
    const diskOuterR = visualR * 3.1;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.type === "kerr") {
      const flatten = 0.3 * this.spin;
      ctx.rotate(this.phase * 0.5);
      ctx.scale(1 + flatten, 1 - flatten);
    }

    ctx.beginPath();
    ctx.fillStyle = "#000000";
    ctx.arc(0, 0, visualR, 0, Math.PI * 2);
    ctx.fill();

    const diskGrad = ctx.createRadialGradient(
      0,
      0,
      visualR * 0.9,
      0,
      0,
      diskOuterR
    );
    diskGrad.addColorStop(0.0, "rgba(0,0,0,0)");
    diskGrad.addColorStop(0.15, "rgba(255,255,255,1)");
    diskGrad.addColorStop(0.4, "rgba(252,211,77,0.95)");
    diskGrad.addColorStop(0.75, "rgba(249,115,22,0.8)");
    diskGrad.addColorStop(1.0, "rgba(88,28,12,0)");

    ctx.globalCompositeOperation = "screen";
    ctx.beginPath();
    ctx.fillStyle = diskGrad;
    ctx.arc(0, 0, diskOuterR, 0, Math.PI * 2);
    ctx.fill();

    const photonGrad = ctx.createRadialGradient(
      0,
      0,
      visualR * 0.95,
      0,
      0,
      photonRingR
    );
    photonGrad.addColorStop(0, "rgba(0,0,0,0)");
    photonGrad.addColorStop(0.5, "rgba(255,255,255,0.95)");
    photonGrad.addColorStop(0.75, "rgba(252,211,77,0.9)");
    photonGrad.addColorStop(1, "rgba(0,0,0,0)");

    ctx.beginPath();
    ctx.fillStyle = photonGrad;
    ctx.arc(0, 0, photonRingR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class Planet {
  constructor(x, y, vx, vy, radius, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.trail = [];
    this.maxTrail = 80;
  }

  update(dt, blackHole) {
    const dx = blackHole.x - this.x;
    const dy = blackHole.y - this.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    const force = (G * blackHole.mass) / (distSq + 0.001);
    const ax = (force * dx) / dist;
    const ay = (force * dy) / dist;

    this.vx += ax * dt;
    this.vy += ay * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) {
      this.trail.shift();
    }

    const eventRadius = blackHole.radius * 0.9;
    if (dist < eventRadius) {
      this.dead = true;
    }
  }

  draw() {
    if (this.trail.length > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        const p = this.trail[i];
        ctx.lineTo(p.x, p.y);
      }
      const gradient = ctx.createLinearGradient(
        this.trail[0].x,
        this.trail[0].y,
        this.x,
        this.y
      );
      gradient.addColorStop(0, "rgba(191,219,254,0)");
      const rgbaColor = this.color.startsWith("rgb(")
        ? this.color.replace("rgb(", "rgba(").replace(")", ", 0.9)")
        : this.color;
      gradient.addColorStop(1, rgbaColor);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = this.radius * 0.9;
      ctx.globalAlpha = 0.85;
      ctx.stroke();
      ctx.restore();
    }

    const grd = ctx.createRadialGradient(
      this.x - this.radius * 0.4,
      this.y - this.radius * 0.4,
      this.radius * 0.1,
      this.x,
      this.y,
      this.radius
    );
    grd.addColorStop(0, "#ffffff");
    grd.addColorStop(0.4, this.color);
    grd.addColorStop(1, "#020617");

    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = grd;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.restore();
  }
}

class AccretionParticle {
  constructor(blackHole) {
    this.blackHole = blackHole;
    this.reset();
  }

  reset() {
    const r =
      this.blackHole.radius * (1.3 + Math.random() * 1.5); // anel ao redor do BH
    const angle = Math.random() * Math.PI * 2;

    this.x = this.blackHole.x + Math.cos(angle) * r;
    this.y = this.blackHole.y + Math.sin(angle) * r;

    const orbitalSpeed = 170 + Math.random() * 260;
    this.vx = Math.sin(angle) * orbitalSpeed;
    this.vy = -Math.cos(angle) * orbitalSpeed;

    this.life = 0;
    this.maxLife = 1.4 + Math.random() * 1.2;
    this.size = 1 + Math.random() * 2.4;
    this.hue = 25 + Math.random() * 25;
    this.lightness = 55 + Math.random() * 15;
  }

  update(dt) {
    this.life += dt;
    if (this.life > this.maxLife) {
      this.reset();
      return;
    }

    const dx = this.blackHole.x - this.x;
    const dy = this.blackHole.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;

    const pull = 30 / dist;
    this.vx += (dx / dist) * pull * dt;
    this.vy += (dy / dist) * pull * dt;

    const turbulence = 40 * dt;
    this.vx += (Math.random() - 0.5) * turbulence;
    this.vy += (Math.random() - 0.5) * turbulence;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw() {
    const alpha = 1 - this.life / this.maxLife;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.beginPath();
    ctx.fillStyle = `hsla(${this.hue}, 100%, ${this.lightness}%, ${alpha})`;
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const blackHole = new BlackHole(
  width * 0.5,
  height * 0.5,
  BASE_BH_MASS,
  BASE_BH_RADIUS
);

const planets = [];
const particles = [];
const STAR_COUNT = 450;
const stars = [];

for (let i = 0; i < STAR_COUNT; i++) {
  stars.push({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.8 + 0.3,
    alpha: 0.2 + Math.random() * 0.8,
    twinkleSpeed: 0.4 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2,
  });
}

function spawnInitialPlanets() {
  const colors = [
    "rgb(96,165,250)", 
    "rgb(239,68,68)", 
    "rgb(250,204,21)", 
    "rgb(16,185,129)", 
    "rgb(244,114,182)", 
  ];

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const r = blackHole.radius * (3 + i * 1.3);
    const x = blackHole.x + Math.cos(angle) * r;
    const y = blackHole.y + Math.sin(angle) * r;

    const speed = Math.sqrt((G * blackHole.mass) / r) * 0.28;
    const vx = -Math.sin(angle) * speed;
    const vy = Math.cos(angle) * speed;

    const radius = 8 + Math.random() * 6;

    planets.push(new Planet(x, y, vx, vy, radius, colors[i % colors.length]));
  }
}

spawnInitialPlanets();


if (bhTypeSelect) {
  bhTypeSelect.addEventListener("change", (e) => {
    const value = e.target.value === "kerr" ? "kerr" : "schwarzschild";
    blackHole.setType(value);
  });
}

function updateMassLabel(scale) {
  if (!bhMassLabel) return;
  let text = "Intermediário";
  if (scale <= 0.8) text = "Estelar";
  else if (scale >= 2.0) text = "Supermassivo";
  bhMassLabel.textContent = text;
}

if (bhMassSlider) {
  const initialScale = parseFloat(bhMassSlider.value);
  blackHole.setMassScale(initialScale);
  updateMassLabel(initialScale);

  bhMassSlider.addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    blackHole.setMassScale(value);
    updateMassLabel(value);
  });
} else {
  blackHole.setMassScale(1);
}

if (cameraDistanceSlider) {
  cameraDistance = parseFloat(cameraDistanceSlider.value);
  cameraDistanceSlider.addEventListener("input", (e) => {
    cameraDistance = parseFloat(e.target.value);
  });
}

if (approachSpeedSlider) {
  approachSpeed = parseFloat(approachSpeedSlider.value);
  approachSpeedSlider.addEventListener("input", (e) => {
    approachSpeed = parseFloat(e.target.value);
  });
}

if (modeButtons && modeButtons.length) {
  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      cameraMode = btn.dataset.mode || "static";
    });
  });
}

let isDragging = false;
let dragStart = null;
let dragCurrent = null;

canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  dragStart = { x: e.clientX, y: e.clientY };
  dragCurrent = { ...dragStart };
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  dragCurrent = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener("mouseup", (e) => {
  if (!isDragging || !dragStart) return;
  isDragging = false;
  dragCurrent = { x: e.clientX, y: e.clientY };

  const dx = dragCurrent.x - dragStart.x;
  const dy = dragCurrent.y - dragStart.y;

  const strength = Math.min(Math.sqrt(dx * dx + dy * dy) / 3, 220);

  if (strength < 5) {
    dragStart = null;
    dragCurrent = null;
    return; 
  }

  const angle = Math.atan2(dy, dx);
  const vx = Math.cos(angle) * strength;
  const vy = Math.sin(angle) * strength;

  const distFromBH = Math.hypot(dragStart.x - blackHole.x, dragStart.y - blackHole.y);
  const planetRadius = 6 + Math.random() * 8;

  let color = "rgb(96,165,250)";
  if (distFromBH < blackHole.radius * 2.5) {
    color = "rgb(239,68,68)";
  } else if (distFromBH < blackHole.radius * 4) {
    color = "rgb(250,204,21)";
  } else if (distFromBH < blackHole.radius * 6) {
    color = "rgb(16,185,129)";
  } else {
    color = "rgb(244,114,182)";
  }

  planets.push(new Planet(dragStart.x, dragStart.y, vx, vy, planetRadius, color));

  dragStart = null;
  dragCurrent = null;
});

canvas.addEventListener("mouseleave", () => {
  isDragging = false;
  dragStart = null;
  dragCurrent = null;
});

let lastTime = performance.now();

function handlePlanetCollisions() {
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i];
      const b = planets[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.radius + b.radius;

      if (dist < minDist) {
        const massA = a.radius * a.radius;
        const massB = b.radius * b.radius;
        const totalMass = massA + massB;

        const newX = (a.x * massA + b.x * massB) / totalMass;
        const newY = (a.y * massA + b.y * massB) / totalMass;
        const newVx = (a.vx * massA + b.vx * massB) / totalMass;
        const newVy = (a.vy * massA + b.vy * massB) / totalMass;
        const newRadius = Math.sqrt(totalMass);

        const newColor = massA > massB ? a.color : b.color;

        const merged = new Planet(newX, newY, newVx, newVy, newRadius, newColor);
        merged.trail = a.trail.concat(b.trail).slice(-merged.maxTrail);

        planets.splice(j, 1);
        planets.splice(i, 1, merged);
        j--;
      }
    }
  }
}

function drawBackground(deltaSeconds) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(0,0,10,0.4)";
  ctx.fillRect(0, 0, width, height);

  const lensRadius = (blackHole.radius / Math.max(cameraDistance, 0.25)) * 4.2;

  for (const star of stars) {
    star.phase += star.twinkleSpeed * deltaSeconds;
    const twinkle = 0.5 + 0.5 * Math.sin(star.phase);
    const alpha = star.alpha * twinkle;

    let sx = star.x;
    let sy = star.y;

    const dx = sx - blackHole.x;
    const dy = sy - blackHole.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < lensRadius * 2.5) {
      const r = Math.max(dist, 0.0001);
      const influence = Math.max(0, 1 - r / (lensRadius * 2.5));
      const bendStrength = 2.2 * influence * influence;

      const factor = 1 + bendStrength;
      sx = blackHole.x + dx * factor;
      sy = blackHole.y + dy * factor;

      const mirrorFactor = 1 - bendStrength * 0.4;
      const mx = blackHole.x - dx * mirrorFactor;
      const my = blackHole.y - dy * mirrorFactor;
      const mirrorAlpha = alpha * influence * 0.9;

      ctx.beginPath();
      ctx.fillStyle = `rgba(248,250,252,${mirrorAlpha})`;
      ctx.arc(mx, my, star.size * (1 + 1.5 * influence), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.fillStyle = `rgba(248,250,252,${alpha})`;
    ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawDragPreview() {
  if (!isDragging || !dragStart || !dragCurrent) return;

  const dx = dragCurrent.x - dragStart.x;
  const dy = dragCurrent.y - dragStart.y;
  const strength = Math.min(Math.sqrt(dx * dx + dy * dy) / 3, 220);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dragStart.x, dragStart.y);
  ctx.lineTo(dragStart.x + dx, dragStart.y + dy);
  ctx.strokeStyle = `rgba(96,165,250, ${0.3 + strength / 260})`;
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = "rgba(96,165,250,0.8)";
  ctx.arc(dragStart.x, dragStart.y, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = "rgba(248,250,252,0.9)";
  ctx.arc(dragCurrent.x, dragCurrent.y, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  const simulationSpeed = 1.1;
  const step = dt * simulationSpeed;

  if (cameraMode === "approach") {
    const target = 0.6;
    cameraDistance -= approachSpeed * step * 0.25;
    if (cameraDistance < target) cameraDistance = target;
  }

  if (cameraMode === "orbit") {
    orbitPhase += step * 0.35;
    const orbitRadius = blackHole.baseRadius * 1.4;
    blackHole.x = width * 0.5 + Math.cos(orbitPhase) * orbitRadius;
    blackHole.y = height * 0.5 + Math.sin(orbitPhase) * orbitRadius * 0.5;
  } else {
    blackHole.x = width * 0.5;
    blackHole.y = height * 0.5;
  }

  drawBackground(step);

  for (const p of particles) {
    p.update(step);
    p.draw();
  }

  blackHole.update(step);
  blackHole.draw(cameraDistance);

  for (const planet of planets) {
    planet.update(step, blackHole);
  }

  handlePlanetCollisions();

  for (let i = planets.length - 1; i >= 0; i--) {
    if (planets[i].dead) {
      planets.splice(i, 1);
    }
  }

  for (const planet of planets) {
    planet.draw();
  }

  drawDragPreview();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
