import { SampleApp } from '../types';

export const SAMPLE_APPS: SampleApp[] = [
  {
    id: 'asteroids-arcade',
    title: 'Neon Asteroids Arcade',
    description: 'Cyberpunk canvas space shooter with particle explosions, WebAudio synth sounds, and virtual JSON config.',
    category: 'Game',
    tag: 'Canvas & WebAudio',
    icon: 'Gamepad2',
    fileCount: 6,
    entryPoint: 'index.html',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Neon Asteroids - Arcade Vector</title>
  <link rel="stylesheet" href="css/game.css">
</head>
<body>
  <div id="game-container">
    <div id="hud">
      <div class="hud-item"><span class="label">SCORE</span><span id="score-val" class="value">0000</span></div>
      <div class="hud-item"><span class="label">LIVES</span><span id="lives-val" class="value">❤❤❤</span></div>
      <div class="hud-item"><span class="label">LEVEL</span><span id="level-val" class="value">1</span></div>
      <div class="hud-item"><span class="label">HIGH</span><span id="high-val" class="value">0000</span></div>
    </div>
    
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    
    <div id="controls-hint">
      <span>[▲/W] Thrust</span>
      <span>[◀/▶ / A/D] Rotate</span>
      <span>[SPACE] Shoot</span>
      <span>[B] Shield</span>
    </div>

    <!-- Mobile Touch Controls -->
    <div id="touch-controls">
      <div class="touch-group left">
        <button id="btn-left" class="t-btn">◀</button>
        <button id="btn-right" class="t-btn">▶</button>
      </div>
      <div class="touch-group right">
        <button id="btn-thrust" class="t-btn">▲</button>
        <button id="btn-fire" class="t-btn action">⚡</button>
      </div>
    </div>

    <div id="overlay" class="overlay">
      <h1 class="title">NEON ASTEROIDS</h1>
      <p class="subtitle">VECTOR WARFARE 2088</p>
      <button id="btn-start" class="btn-glow">LAUNCH MISSION</button>
    </div>
  </div>

  <script src="js/audio.js"></script>
  <script src="js/particles.js"></script>
  <script src="js/game.js"></script>
</body>
</html>`,

      'css/game.css': `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  user-select: none;
}

body {
  background: #05050d;
  color: #00f0ff;
  font-family: 'Courier New', monospace;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

#game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  max-width: 900px;
  max-height: 650px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 50px rgba(0, 240, 255, 0.15);
  border: 1px solid #1a2035;
  border-radius: 8px;
  background: #090a14;
}

#hud {
  position: absolute;
  top: 16px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
  z-index: 10;
}

.hud-item {
  display: flex;
  flex-direction: column;
}

.hud-item .label {
  font-size: 11px;
  color: #708090;
  letter-spacing: 2px;
}

.hud-item .value {
  font-size: 20px;
  font-weight: bold;
  color: #00f0ff;
  text-shadow: 0 0 8px #00f0ff;
}

#gameCanvas {
  background: radial-gradient(circle at center, #0e1122 0%, #05060d 100%);
  border: 1px solid #00f0ff33;
  box-shadow: inset 0 0 30px rgba(0, 240, 255, 0.05);
  width: 100%;
  height: 100%;
  border-radius: 6px;
}

#controls-hint {
  position: absolute;
  bottom: 12px;
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #5b6e8a;
  pointer-events: none;
}

#touch-controls {
  display: none;
  position: absolute;
  bottom: 15px;
  left: 10px;
  right: 10px;
  justify-content: space-between;
  pointer-events: auto;
  z-index: 20;
}

.touch-group {
  display: flex;
  gap: 12px;
}

.t-btn {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: rgba(0, 240, 255, 0.15);
  border: 2px solid #00f0ff;
  color: #00f0ff;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
}

.t-btn.action {
  background: rgba(255, 0, 128, 0.25);
  border-color: #ff0080;
  color: #ff0080;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(5, 6, 13, 0.85);
  backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
  z-index: 30;
  transition: opacity 0.3s ease;
}

.overlay.hidden {
  opacity: 0;
  pointer-events: none;
}

.title {
  font-size: 42px;
  letter-spacing: 6px;
  color: #00f0ff;
  text-shadow: 0 0 20px #00f0ff, 0 0 40px #ff0080;
}

.subtitle {
  font-size: 14px;
  color: #ff0080;
  letter-spacing: 4px;
}

.btn-glow {
  margin-top: 15px;
  padding: 14px 36px;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
  color: #05060d;
  background: #00f0ff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 0 25px #00f0ff;
  transition: transform 0.1s, box-shadow 0.2s;
}

.btn-glow:hover {
  transform: scale(1.05);
  box-shadow: 0 0 35px #00f0ff;
}

@media (max-width: 768px) {
  #touch-controls { display: flex; }
  #controls-hint { display: none; }
  .title { font-size: 28px; }
}`,

      'js/audio.js': `// WebAudio Sound Synthesizer
class SoundFX {
  constructor() {
    this.ctx = null;
  }
  
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
  }

  playLaser() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playExplosion() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playThrust() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }
}
window.soundFX = new SoundFX();`,

      'js/particles.js': `// Particle Physics System
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  createExplosion(x, y, color = '#00f0ff', count = 18) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1,
        color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.015
      });
    }
  }

  createThrusterSpark(x, y, angle) {
    const spread = (Math.random() - 0.5) * 0.6;
    const speed = Math.random() * 3 + 2;
    this.particles.push({
      x, y,
      vx: -Math.cos(angle + spread) * speed,
      vy: -Math.sin(angle + spread) * speed,
      size: Math.random() * 2.5 + 1,
      color: '#ff0080',
      alpha: 0.9,
      decay: 0.08
    });
  }

  updateAndDraw(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
window.particleSystem = new ParticleSystem();`,

      'js/game.js': `// Main Game Loop & Physics
(async function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  // Test Virtual Fetch from ZIP data
  let config = { shipSpeed: 0.15, maxSpeed: 6, initialAsteroids: 4, bulletSpeed: 8 };
  try {
    const res = await fetch('data/config.json');
    if (res.ok) {
      config = await res.json();
      console.log('Game config loaded dynamically from virtual ZIP:', config);
    }
  } catch (e) {
    console.warn('Using default fallback config');
  }

  const scoreEl = document.getElementById('score-val');
  const livesEl = document.getElementById('lives-val');
  const levelEl = document.getElementById('level-val');
  const highEl = document.getElementById('high-val');
  const overlay = document.getElementById('overlay');
  const btnStart = document.getElementById('btn-start');

  let score = 0;
  let lives = 3;
  let level = 1;
  let highScore = parseInt(localStorage.getItem('neon_asteroids_hi') || '0', 10);
  highEl.textContent = String(highScore).padStart(4, '0');

  let isPlaying = false;
  let keys = {};
  
  const ship = {
    x: 400,
    y: 300,
    r: 12,
    angle: -Math.PI / 2,
    rotation: 0,
    vx: 0,
    vy: 0,
    invulnerable: 0
  };

  let bullets = [];
  let asteroids = [];
  let lastShot = 0;

  function spawnAsteroids(count) {
    asteroids = [];
    for (let i = 0; i < count; i++) {
      let x, y;
      do {
        x = Math.random() * canvas.width;
        y = Math.random() * canvas.height;
      } while (Math.hypot(x - ship.x, y - ship.y) < 160);

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.5 + 0.5;
      asteroids.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3, // 3: large, 2: med, 1: small
        radius: 36,
        vertices: createAsteroidShape(36)
      });
    }
  }

  function createAsteroidShape(radius) {
    const points = [];
    const numPoints = Math.floor(Math.random() * 4) + 8;
    for (let i = 0; i < numPoints; i++) {
      const a = (i / numPoints) * Math.PI * 2;
      const dist = radius * (0.75 + Math.random() * 0.5);
      points.push({ x: Math.cos(a) * dist, y: Math.sin(a) * dist });
    }
    return points;
  }

  function resetGame() {
    score = 0;
    lives = 3;
    level = 1;
    ship.x = canvas.width / 2;
    ship.y = canvas.height / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = -Math.PI / 2;
    ship.invulnerable = 120;
    bullets = [];
    spawnAsteroids(config.initialAsteroids || 4);
    updateHud();
    isPlaying = true;
    overlay.classList.add('hidden');
    window.soundFX.init();
    console.info('Asteroids Mission launched! Canvas resolution: ' + canvas.width + 'x' + canvas.height);
  }

  function updateHud() {
    scoreEl.textContent = String(score).padStart(4, '0');
    livesEl.textContent = '❤'.repeat(Math.max(0, lives));
    levelEl.textContent = level;
    if (score > highScore) {
      highScore = score;
      highEl.textContent = String(highScore).padStart(4, '0');
      localStorage.setItem('neon_asteroids_hi', String(highScore));
    }
  }

  function fireBullet() {
    const now = Date.now();
    if (now - lastShot < 150) return;
    lastShot = now;
    
    const bx = ship.x + Math.cos(ship.angle) * ship.r * 1.4;
    const by = ship.y + Math.sin(ship.angle) * ship.r * 1.4;
    bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(ship.angle) * (config.bulletSpeed || 8) + ship.vx * 0.4,
      vy: Math.sin(ship.angle) * (config.bulletSpeed || 8) + ship.vy * 0.4,
      life: 50
    });
    window.soundFX.playLaser();
  }

  // Keyboard
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space' && isPlaying) {
      e.preventDefault();
      fireBullet();
    }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  // Touch
  function bindTouch(id, code) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = (e) => { e.preventDefault(); keys[code] = true; if (code === 'Space') fireBullet(); };
    const end = (e) => { e.preventDefault(); keys[code] = false; };
    el.addEventListener('touchstart', start);
    el.addEventListener('touchend', end);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
  }
  bindTouch('btn-left', 'ArrowLeft');
  bindTouch('btn-right', 'ArrowRight');
  bindTouch('btn-thrust', 'ArrowUp');
  bindTouch('btn-fire', 'Space');

  btnStart.addEventListener('click', resetGame);

  // Main Loop
  function loop() {
    requestAnimationFrame(loop);

    // Clear with slight trail
    ctx.fillStyle = '#090a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isPlaying) {
      window.particleSystem.updateAndDraw(ctx);
      return;
    }

    // Ship Rotation & Thrust
    if (keys['ArrowLeft'] || keys['KeyA']) ship.angle -= 0.06;
    if (keys['ArrowRight'] || keys['KeyD']) ship.angle += 0.06;
    if (keys['ArrowUp'] || keys['KeyW']) {
      ship.vx += Math.cos(ship.angle) * (config.shipSpeed || 0.15);
      ship.vy += Math.sin(ship.angle) * (config.shipSpeed || 0.15);
      const spd = Math.hypot(ship.vx, ship.vy);
      if (spd > config.maxSpeed) {
        ship.vx = (ship.vx / spd) * config.maxSpeed;
        ship.vy = (ship.vy / spd) * config.maxSpeed;
      }
      window.soundFX.playThrust();
      window.particleSystem.createThrusterSpark(
        ship.x - Math.cos(ship.angle) * 12,
        ship.y - Math.sin(ship.angle) * 12,
        ship.angle
      );
    } else {
      ship.vx *= 0.985;
      ship.vy *= 0.985;
    }

    ship.x = (ship.x + ship.vx + canvas.width) % canvas.width;
    ship.y = (ship.y + ship.vy + canvas.height) % canvas.height;

    if (ship.invulnerable > 0) ship.invulnerable--;

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x = (b.x + b.vx + canvas.width) % canvas.width;
      b.y = (b.y + b.vy + canvas.height) % canvas.height;
      b.life--;

      ctx.save();
      ctx.fillStyle = '#ff0080';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff0080';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (b.life <= 0) {
        bullets.splice(i, 1);
        continue;
      }

      // Check collision with asteroids
      for (let j = asteroids.length - 1; j >= 0; j--) {
        const ast = asteroids[j];
        if (Math.hypot(b.x - ast.x, b.y - ast.y) < ast.radius) {
          bullets.splice(i, 1);
          window.soundFX.playExplosion();
          window.particleSystem.createExplosion(ast.x, ast.y, ast.size === 3 ? '#00f0ff' : '#ffe600', 16);
          score += ast.size === 3 ? 20 : (ast.size === 2 ? 50 : 100);

          if (ast.size > 1) {
            const nextSize = ast.size - 1;
            const nextRad = ast.radius * 0.55;
            for (let k = 0; k < 2; k++) {
              const na = Math.random() * Math.PI * 2;
              asteroids.push({
                x: ast.x,
                y: ast.y,
                vx: Math.cos(na) * (Math.random() * 2 + 1),
                vy: Math.sin(na) * (Math.random() * 2 + 1),
                size: nextSize,
                radius: nextRad,
                vertices: createAsteroidShape(nextRad)
              });
            }
          }
          asteroids.splice(j, 1);
          updateHud();
          break;
        }
      }
    }

    // Asteroids
    for (const ast of asteroids) {
      ast.x = (ast.x + ast.vx + canvas.width) % canvas.width;
      ast.y = (ast.y + ast.vy + canvas.height) % canvas.height;

      ctx.save();
      ctx.translate(ast.x, ast.y);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      for (let i = 0; i < ast.vertices.length; i++) {
        const v = ast.vertices[i];
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Check collision with ship
      if (ship.invulnerable <= 0 && Math.hypot(ship.x - ast.x, ship.y - ast.y) < ast.radius + ship.r) {
        lives--;
        window.soundFX.playExplosion();
        window.particleSystem.createExplosion(ship.x, ship.y, '#ff0080', 30);
        updateHud();
        ship.x = canvas.width / 2;
        ship.y = canvas.height / 2;
        ship.vx = 0;
        ship.vy = 0;
        ship.invulnerable = 120;

        if (lives <= 0) {
          isPlaying = false;
          overlay.querySelector('.title').textContent = 'MISSION FAILED';
          overlay.querySelector('.subtitle').textContent = 'FINAL SCORE: ' + score;
          btnStart.textContent = 'RETRY MISSION';
          overlay.classList.remove('hidden');
          console.warn('Game Over! Final score: ' + score);
        }
      }
    }

    // Level progression
    if (asteroids.length === 0) {
      level++;
      spawnAsteroids(config.initialAsteroids + level);
      updateHud();
      console.info('Advanced to Level ' + level);
    }

    // Draw Ship
    if (ship.invulnerable === 0 || Math.floor(Date.now() / 100) % 2 === 0) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -9);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 9);
      ctx.closePath();
      ctx.stroke();

      if (ship.invulnerable > 0) {
        ctx.strokeStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    window.particleSystem.updateAndDraw(ctx);
  }

  loop();
})();`,

      'data/config.json': `{
  "gameTitle": "Neon Asteroids 2088",
  "version": "1.4.0",
  "shipSpeed": 0.18,
  "maxSpeed": 6.5,
  "bulletSpeed": 9.0,
  "initialAsteroids": 4
}`
    }
  },

  {
    id: 'cosmic-nebula',
    title: '3D Cosmic Particle Vortex',
    description: 'Interactive particle gravity simulator with mouse vortex physics, color palettes, and live stats.',
    category: 'Visual & 3D',
    tag: 'Canvas & Math',
    icon: 'Sparkles',
    fileCount: 4,
    entryPoint: 'index.html',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cosmic Nebula Vortex</title>
  <link rel="stylesheet" href="css/nebula.css">
</head>
<body>
  <canvas id="nebulaCanvas"></canvas>
  
  <div id="controls-panel">
    <div class="header">
      <h2>COSMIC VORTEX</h2>
      <span id="fps-badge">60 FPS</span>
    </div>
    
    <div class="control-row">
      <label>Particle Count</label>
      <input type="range" id="slider-count" min="300" max="2500" value="1000" step="100">
      <span id="val-count" class="badge">1000</span>
    </div>
    
    <div class="control-row">
      <label>Gravity Core</label>
      <input type="range" id="slider-gravity" min="1" max="10" value="5" step="1">
      <span id="val-gravity" class="badge">5.0</span>
    </div>

    <div class="control-row">
      <label>Palette</label>
      <select id="select-theme">
        <option value="cyberpunk">Cyberpunk Neon</option>
        <option value="supernova">Supernova Gold</option>
        <option value="deepsea">Abyssal Cyan</option>
        <option value="aurora">Aurora Borealis</option>
      </select>
    </div>

    <button id="btn-pulse" class="action-btn">TRIGGER GRAVITY PULSE</button>
  </div>

  <script src="js/nebula.js"></script>
</body>
</html>`,

      'css/nebula.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #020205;
  color: #e2e8f0;
  font-family: system-ui, -apple-system, sans-serif;
  overflow: hidden;
  width: 100vw;
  height: 100vh;
}

#nebulaCanvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

#controls-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(10, 15, 30, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 18px;
  width: 280px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #38bdf8;
}

#fps-badge {
  font-size: 11px;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
}

.control-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-row label {
  font-size: 12px;
  color: #94a3b8;
}

.control-row input[type=range] {
  accent-color: #38bdf8;
  cursor: pointer;
}

.control-row select {
  background: #1e293b;
  color: #f1f5f9;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  outline: none;
}

.badge {
  font-size: 11px;
  color: #cbd5e1;
  font-family: monospace;
}

.action-btn {
  background: linear-gradient(135deg, #0284c7, #6366f1);
  color: white;
  border: none;
  padding: 10px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: opacity 0.2s;
}

.action-btn:hover { opacity: 0.9; }`,

      'js/nebula.js': `const canvas = document.getElementById('nebulaCanvas');
const ctx = canvas.getContext('2d');

let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);

window.addEventListener('resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});

const palettes = {
  cyberpunk: ['#ff007f', '#7928ca', '#00f0ff', '#4338ca'],
  supernova: ['#f59e0b', '#ef4444', '#facc15', '#b45309'],
  deepsea: ['#06b6d4', '#0284c7', '#3b82f6', '#1e40af'],
  aurora: ['#10b981', '#06b6d4', '#8b5cf6', '#ec4899']
};

let currentPalette = palettes.cyberpunk;
let particleCount = 1000;
let gravityStrength = 0.05;
let particles = [];

let mouse = { x: width / 2, y: height / 2, down: false };

window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener('touchmove', e => {
  if (e.touches[0]) {
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
  }
});

class Particle {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.size = Math.random() * 2 + 0.8;
    this.color = currentPalette[Math.floor(Math.random() * currentPalette.length)];
    this.orbitRadius = Math.random() * 300 + 40;
    this.angle = Math.random() * Math.PI * 2;
    this.angularSpeed = (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1);
  }
  update() {
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    // Orbital & gravitational force
    const force = (1 / dist) * gravityStrength * 80;
    this.vx += (dx / dist) * force - (dy / dist) * force * 1.8;
    this.vy += (dy / dist) * force + (dx / dist) * force * 1.8;

    this.vx *= 0.96;
    this.vy *= 0.96;

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
      if (Math.random() < 0.1) this.reset();
    }
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
}

initParticles();

// FPS meter
let lastTime = performance.now();
let frames = 0;
const fpsBadge = document.getElementById('fps-badge');

function render() {
  requestAnimationFrame(render);

  frames++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    fpsBadge.textContent = frames + ' FPS';
    frames = 0;
    lastTime = now;
  }

  ctx.fillStyle = 'rgba(2, 2, 5, 0.2)';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw();
  }
}

render();

// Controls
document.getElementById('slider-count').addEventListener('input', e => {
  particleCount = parseInt(e.target.value, 10);
  document.getElementById('val-count').textContent = particleCount;
  initParticles();
});

document.getElementById('slider-gravity').addEventListener('input', e => {
  const v = parseFloat(e.target.value);
  gravityStrength = v * 0.01;
  document.getElementById('val-gravity').textContent = v.toFixed(1);
});

document.getElementById('select-theme').addEventListener('change', e => {
  currentPalette = palettes[e.target.value] || palettes.cyberpunk;
  initParticles();
});

document.getElementById('btn-pulse').addEventListener('click', () => {
  for (const p of particles) {
    const angle = Math.random() * Math.PI * 2;
    p.vx += Math.cos(angle) * 15;
    p.vy += Math.sin(angle) * 15;
  }
  console.info('Gravity pulse triggered!');
});`,

      'data/presets.json': `{
  "name": "Cosmic Presets",
  "themes": ["cyberpunk", "supernova", "deepsea", "aurora"]
}`
    }
  },

  {
    id: 'cybersynth-studio',
    title: 'CyberSynth 8-Pad Studio',
    description: 'WebAudio beat machine with 8 custom synthesizer pads, real-time audio visualization, and BPM control.',
    category: 'Audio & Music',
    tag: 'WebAudio & UI',
    icon: 'Music',
    fileCount: 4,
    entryPoint: 'index.html',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CyberSynth 8-Pad Beat Studio</title>
  <link rel="stylesheet" href="css/synth.css">
</head>
<body>
  <div class="studio-card">
    <div class="studio-header">
      <div class="brand">
        <h1>CYBERSYNTH-8</h1>
        <span class="badge">DSP SYNTHESIZER</span>
      </div>
      <div class="meta-controls">
        <label>TEMPO: <span id="bpm-val">120</span> BPM</label>
        <input type="range" id="bpm-slider" min="60" max="180" value="120">
      </div>
    </div>

    <!-- Visualizer Canvas -->
    <canvas id="scopeCanvas" width="600" height="90"></canvas>

    <!-- 8 Drum/Synth Pads -->
    <div class="pad-grid">
      <button class="pad" data-sound="kick" data-key="1">
        <span class="pad-label">KICK 808</span>
        <span class="pad-key">[1]</span>
      </button>
      <button class="pad" data-sound="snare" data-key="2">
        <span class="pad-label">NEON SNARE</span>
        <span class="pad-key">[2]</span>
      </button>
      <button class="pad" data-sound="hihat" data-key="3">
        <span class="pad-label">HI-HAT</span>
        <span class="pad-key">[3]</span>
      </button>
      <button class="pad" data-sound="clap" data-key="4">
        <span class="pad-label">CYBER CLAP</span>
        <span class="pad-key">[4]</span>
      </button>
      <button class="pad" data-sound="tom" data-key="Q">
        <span class="pad-label">HEX TOM</span>
        <span class="pad-key">[Q]</span>
      </button>
      <button class="pad" data-sound="laser" data-key="W">
        <span class="pad-label">ZAP LEAD</span>
        <span class="pad-key">[W]</span>
      </button>
      <button class="pad" data-sound="bass" data-key="E">
        <span class="pad-label">SUB BASS</span>
        <span class="pad-key">[E]</span>
      </button>
      <button class="pad" data-sound="chime" data-key="R">
        <span class="pad-label">CRYSTAL CHIME</span>
        <span class="pad-key">[R]</span>
      </button>
    </div>

    <div class="footer-bar">
      <span>Play with Mouse Click or Keyboard [1-4, Q-R]</span>
      <button id="btn-demo-beat" class="btn-primary">▶ AUTO BEAT LOOP</button>
    </div>
  </div>

  <script src="js/synth.js"></script>
</body>
</html>`,

      'css/synth.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #090d16;
  color: #f8fafc;
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 16px;
}

.studio-card {
  background: #111827;
  border: 1px solid #1f293d;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 650px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.studio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #1f293d;
  padding-bottom: 14px;
}

.brand h1 {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #38bdf8;
}

.brand .badge {
  font-size: 10px;
  color: #a855f7;
  font-weight: bold;
}

.meta-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #94a3b8;
}

.meta-controls input {
  accent-color: #38bdf8;
  cursor: pointer;
}

#scopeCanvas {
  background: #0b1120;
  border: 1px solid #1e293b;
  border-radius: 8px;
  width: 100%;
  height: 90px;
}

.pad-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.pad {
  aspect-ratio: 1;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 8px;
  transition: all 0.08s ease;
  position: relative;
  overflow: hidden;
}

.pad:hover {
  background: #334155;
  border-color: #38bdf8;
}

.pad:active, .pad.active {
  transform: scale(0.94);
  background: #0284c7;
  border-color: #38bdf8;
  box-shadow: 0 0 20px #0284c7;
}

.pad-label {
  font-size: 11px;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: 0.5px;
  text-align: center;
}

.pad-key {
  font-size: 10px;
  color: #64748b;
  margin-top: 4px;
  font-family: monospace;
}

.footer-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #64748b;
  border-top: 1px solid #1f293d;
  padding-top: 14px;
}

.btn-primary {
  background: #38bdf8;
  color: #0f172a;
  border: none;
  font-weight: 700;
  font-size: 12px;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:hover { opacity: 0.9; }

@media (max-width: 500px) {
  .pad-grid { grid-template-columns: repeat(2, 1fr); }
  .footer-bar { flex-direction: column; gap: 10px; }
}`,

      'js/synth.js': `(function() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let analyser = null;

  function ensureAudio() {
    if (!ctx) {
      ctx = new AudioContext();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(ctx.destination);
      startScope();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  // Synthesis engine
  const sounds = {
    kick: () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(analyser);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    },
    snare: () => {
      // Noise + Tone
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 800;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(analyser);
      whiteNoise.start();
    },
    hihat: () => {
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 6000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(analyser);
      noise.start();
    },
    clap: () => {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (!ctx) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(900 + i * 200, ctx.currentTime);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(analyser);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
        }, i * 25);
      }
    },
    tom: () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.8, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(analyser);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    },
    laser: () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(analyser);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    },
    bass: () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65.41, ctx.currentTime); // C2
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(analyser);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    },
    chime: () => {
      const freqs = [523.25, 659.25, 783.99]; // C5 major
      freqs.forEach(f => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(analyser);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      });
    }
  };

  function playSound(name, padEl) {
    ensureAudio();
    if (sounds[name]) {
      sounds[name]();
      console.log('Triggered Sound Pad: [' + name.toUpperCase() + ']');
      if (padEl) {
        padEl.classList.add('active');
        setTimeout(() => padEl.classList.remove('active'), 120);
      }
    }
  }

  // Oscilloscope drawing
  const canvas = document.getElementById('scopeCanvas');
  const sCtx = canvas.getContext('2d');

  function startScope() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      sCtx.fillStyle = '#0b1120';
      sCtx.fillRect(0, 0, canvas.width, canvas.height);

      sCtx.lineWidth = 2;
      sCtx.strokeStyle = '#38bdf8';
      sCtx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) sCtx.moveTo(x, y);
        else sCtx.lineTo(x, y);

        x += sliceWidth;
      }

      sCtx.lineTo(canvas.width, canvas.height / 2);
      sCtx.stroke();
    }
    draw();
  }

  // Wire up UI
  const pads = document.querySelectorAll('.pad');
  pads.forEach(pad => {
    pad.addEventListener('click', () => {
      playSound(pad.dataset.sound, pad);
    });
  });

  const keyMap = {
    '1': 'kick', '2': 'snare', '3': 'hihat', '4': 'clap',
    'q': 'tom', 'w': 'laser', 'e': 'bass', 'r': 'chime',
    'Q': 'tom', 'W': 'laser', 'E': 'bass', 'R': 'chime'
  };

  window.addEventListener('keydown', e => {
    const sName = keyMap[e.key];
    if (sName) {
      const pad = document.querySelector('.pad[data-sound="' + sName + '"]');
      playSound(sName, pad);
    }
  });

  // Demo loop
  let isLooping = false;
  let loopInterval = null;
  const demoBtn = document.getElementById('btn-demo-beat');
  const bpmSlider = document.getElementById('bpm-slider');
  const bpmVal = document.getElementById('bpm-val');

  bpmSlider.addEventListener('input', e => {
    bpmVal.textContent = e.target.value;
    if (isLooping) {
      stopLoop();
      startLoop();
    }
  });

  function startLoop() {
    const bpm = parseInt(bpmSlider.value, 10);
    const stepTime = (60 / bpm / 4) * 1000;
    let step = 0;
    isLooping = true;
    demoBtn.textContent = '⏹ STOP LOOP';
    demoBtn.style.background = '#ef4444';

    loopInterval = setInterval(() => {
      ensureAudio();
      if (step % 8 === 0) playSound('kick', document.querySelector('.pad[data-sound="kick"]'));
      if (step % 8 === 4) playSound('snare', document.querySelector('.pad[data-sound="snare"]'));
      if (step % 2 === 0) playSound('hihat', document.querySelector('.pad[data-sound="hihat"]'));
      if (step === 6 || step === 14) playSound('laser', document.querySelector('.pad[data-sound="laser"]'));
      step = (step + 1) % 16;
    }, stepTime);
  }

  function stopLoop() {
    clearInterval(loopInterval);
    isLooping = false;
    demoBtn.textContent = '▶ AUTO BEAT LOOP';
    demoBtn.style.background = '#38bdf8';
  }

  demoBtn.addEventListener('click', () => {
    if (isLooping) stopLoop();
    else startLoop();
  });
})();`,

      'data/patterns.json': `{
  "preset": "Cyber-Groove-01",
  "bpm": 120,
  "steps": 16
}`
    }
  },

  {
    id: 'markdown-studio',
    title: 'Markdown Pro Live Studio',
    description: 'Real-time markdown document previewer with syntax highlighting, export, and statistics.',
    category: 'Productivity',
    tag: 'Text & HTML',
    icon: 'FileText',
    fileCount: 4,
    entryPoint: 'index.html',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Live Studio</title>
  <link rel="stylesheet" href="css/editor.css">
</head>
<body>
  <div id="app">
    <header class="topbar">
      <div class="logo">
        <span class="icon">📝</span>
        <h1>MARKDOWN PRO</h1>
      </div>
      <div class="stats">
        <span id="stat-words">0 words</span>
        <span id="stat-chars">0 chars</span>
        <span id="stat-lines">0 lines</span>
      </div>
    </header>

    <div class="split-pane">
      <div class="editor-side">
        <div class="pane-header">
          <span>SOURCE (MARKDOWN)</span>
          <button id="btn-insert-table" class="tiny-btn">+ Table</button>
        </div>
        <textarea id="markdown-input" spellcheck="false" placeholder="Write markdown here..."></textarea>
      </div>

      <div class="preview-side">
        <div class="pane-header">
          <span>LIVE PREVIEW</span>
          <button id="btn-copy-html" class="tiny-btn">Copy HTML</button>
        </div>
        <div id="preview-output" class="markdown-body"></div>
      </div>
    </div>
  </div>

  <script src="js/editor.js"></script>
</body>
</html>`,

      'css/editor.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #0f172a;
  color: #e2e8f0;
  font-family: system-ui, -apple-system, sans-serif;
  height: 100vh;
  overflow: hidden;
}

#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo h1 {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #38bdf8;
}

.stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #94a3b8;
  font-family: monospace;
}

.split-pane {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-side, .preview-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-side {
  border-right: 1px solid #334155;
}

.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 1px;
}

.tiny-btn {
  background: #334155;
  color: #f1f5f9;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.tiny-btn:hover { background: #475569; }

#markdown-input {
  flex: 1;
  background: #090d16;
  color: #f1f5f9;
  border: none;
  padding: 18px;
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
}

#preview-output {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #0f172a;
  line-height: 1.7;
}

.markdown-body h1 { font-size: 24px; margin-bottom: 14px; color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 6px; }
.markdown-body h2 { font-size: 20px; margin-top: 18px; margin-bottom: 10px; color: #7dd3fc; }
.markdown-body h3 { font-size: 16px; margin-top: 14px; margin-bottom: 8px; color: #bae6fd; }
.markdown-body p { margin-bottom: 12px; color: #cbd5e1; }
.markdown-body code { background: #1e293b; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #f43f5e; font-size: 13px; }
.markdown-body pre { background: #020617; padding: 14px; border-radius: 6px; overflow-x: auto; margin-bottom: 14px; border: 1px solid #1e293b; }
.markdown-body pre code { background: none; padding: 0; color: #38bdf8; }
.markdown-body ul, .markdown-body ol { margin-left: 24px; margin-bottom: 14px; color: #cbd5e1; }
.markdown-body blockquote { border-left: 4px solid #38bdf8; padding-left: 14px; color: #94a3b8; font-style: italic; margin-bottom: 14px; }
.markdown-body table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
.markdown-body th, .markdown-body td { border: 1px solid #334155; padding: 8px 12px; text-align: left; }
.markdown-body th { background: #1e293b; color: #f1f5f9; }

@media (max-width: 768px) {
  .split-pane { flex-direction: column; }
  .editor-side { height: 50%; border-right: none; border-bottom: 1px solid #334155; }
  .preview-side { height: 50%; }
}`,

      'js/editor.js': `const textarea = document.getElementById('markdown-input');
const preview = document.getElementById('preview-output');
const statWords = document.getElementById('stat-words');
const statChars = document.getElementById('stat-chars');
const statLines = document.getElementById('stat-lines');

// Simple, fast Markdown parser
function parseMarkdown(md) {
  let html = md;
  // Code blocks
  html = html.replace(new RegExp('\\x60\\x60\\x60([\\\\s\\\\S]*?)\\x60\\x60\\x60', 'g'), '<pre><code>$1</code></pre>');
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  // Blockquote
  html = html.replace(/^\\> (.*$)/gim, '<blockquote>$1</blockquote>');
  // Bold & Italic
  html = html.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
  html = html.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
  // Inline code
  html = html.replace(new RegExp('\\x60([^\\x60]+)\\x60', 'g'), '<code>$1</code>');
  // Unordered list
  html = html.replace(/^\\- (.*$)/gim, '<ul><li>$1</li></ul>');
  html = html.replace(/<\\/ul>\\s*<ul>/g, '');
  // Line breaks & paragraphs
  const paragraphs = html.split(/\\n\\n+/);
  return paragraphs.map(p => {
    if (p.startsWith('<h') || p.startsWith('<pre') || p.startsWith('<block') || p.startsWith('<ul') || p.startsWith('<table')) {
      return p;
    }
    return '<p>' + p.replace(/\\n/g, '<br>') + '</p>';
  }).join('\\n');
}

function update() {
  const text = textarea.value;
  preview.innerHTML = parseMarkdown(text);
  
  const words = (text.trim().match(/\\S+/g) || []).length;
  const chars = text.length;
  const lines = text.split('\\n').length;

  statWords.textContent = words + ' words';
  statChars.textContent = chars + ' chars';
  statLines.textContent = lines + ' lines';
}

textarea.addEventListener('input', update);

// Load default
textarea.value = "# Welcome to Markdown Pro Studio!\\n\\nThis document is running **entirely in your browser** inside the virtual sandbox.\\n\\n## Key Features\\n- Live side-by-side editing\\n- Instant HTML conversion\\n- Virtual file asset binding\\n\\n> \\"Code runs everywhere when the browser is your runtime.\\"\\n\\n### Code Sample\\n\`\`\`javascript\\nfunction calculateSpeed(distance, time) {\\n  return distance / time;\\n}\\nconsole.log('Virtual App Ready!');\\n\`\`\`\\n\\n- [x] Extract ZIP files in memory\\n- [x] Resolve nested assets seamlessly\\n- [x] Inspect console & network telemetry\\n";

update();

document.getElementById('btn-copy-html').addEventListener('click', () => {
  navigator.clipboard.writeText(preview.innerHTML);
  console.info('HTML markup copied to clipboard');
});

document.getElementById('btn-insert-table').addEventListener('click', () => {
  textarea.value += "\\n\\n| Feature | Status | Performance |\\n|---|---|---|\\n| ZIP Extraction | Active | 100% |\\n| Virtual FS | Enabled | Ultra |\\n";
  update();
});`
    }
  }
];
