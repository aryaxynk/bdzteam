/* BDZ Cosmos — charged particles + orbital links */
(function () {
  'use strict';
  const canvas = document.createElement('canvas');
  canvas.id = 'cosmos';
  document.body.prepend(canvas);
  const overlay = document.createElement('div');
  overlay.className = 'cosmos-overlay';
  document.body.prepend(overlay);

  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  const N = 48;
  const LINK = 130;
  const particles = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function isLight() {
    return document.documentElement.dataset.theme === 'light';
  }

  function spawn() {
    particles.length = 0;
    for (let i = 0; i < N; i++) {
      const angle = Math.random() * Math.PI * 2;
      const orbitR = 40 + Math.random() * Math.min(w, h) * 0.35;
      const cx = w * (0.2 + Math.random() * 0.6);
      const cy = h * (0.15 + Math.random() * 0.7);
      particles.push({
        cx, cy,
        r: orbitR,
        a: angle,
        speed: (0.0004 + Math.random() * 0.0012) * (Math.random() < 0.5 ? 1 : -1),
        size: 1.2 + Math.random() * 2.2,
        charge: Math.random() < 0.5 ? 1 : -1,
        pulse: Math.random() * Math.PI * 2,
        x: cx + Math.cos(angle) * orbitR,
        y: cy + Math.sin(angle) * orbitR
      });
    }
  }

  function tick() {
    const light = isLight();
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.a += p.speed;
      p.pulse += 0.02;
      const ex = 1 + 0.08 * Math.sin(p.a * 0.5);
      const ey = 1 + 0.06 * Math.cos(p.a * 0.7);
      p.x = p.cx + Math.cos(p.a) * p.r * ex;
      p.y = p.cy + Math.sin(p.a) * p.r * ey;
      p.cx += Math.sin(p.a * 0.3) * 0.02;
      p.cy += Math.cos(p.a * 0.25) * 0.015;
      if (p.cx < -50) p.cx = w + 50;
      if (p.cx > w + 50) p.cx = -50;
      if (p.cy < -50) p.cy = h + 50;
      if (p.cy > h + 50) p.cy = -50;
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > LINK) continue;
        const attract = a.charge !== b.charge ? 1 : 0.45;
        const alpha = (1 - dist / LINK) * 0.35 * attract;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        if (light) {
          ctx.strokeStyle = 'rgba(59, 110, 245, ' + (alpha * 0.7) + ')';
        } else {
          ctx.strokeStyle = a.charge !== b.charge
            ? 'rgba(34, 211, 238, ' + alpha + ')'
            : 'rgba(167, 139, 250, ' + (alpha * 0.7) + ')';
        }
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    for (const p of particles) {
      const glow = 0.55 + 0.45 * Math.sin(p.pulse);
      const r = p.size * (0.85 + 0.15 * glow);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 3.5, 0, Math.PI * 2);
      if (light) {
        ctx.fillStyle = p.charge > 0
          ? 'rgba(59, 110, 245, ' + (0.06 * glow) + ')'
          : 'rgba(124, 92, 252, ' + (0.06 * glow) + ')';
      } else {
        ctx.fillStyle = p.charge > 0
          ? 'rgba(91, 140, 255, ' + (0.12 * glow) + ')'
          : 'rgba(34, 211, 238, ' + (0.1 * glow) + ')';
      }
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      if (light) {
        ctx.fillStyle = p.charge > 0 ? 'rgba(59, 110, 245, ' + (0.7 * glow) + ')' : 'rgba(124, 92, 252, ' + (0.65 * glow) + ')';
      } else {
        ctx.fillStyle = p.charge > 0 ? 'rgba(180, 200, 255, ' + (0.9 * glow) + ')' : 'rgba(34, 211, 238, ' + (0.85 * glow) + ')';
      }
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  resize();
  spawn();
  window.addEventListener('resize', function () { resize(); spawn(); });
  requestAnimationFrame(tick);
})();
