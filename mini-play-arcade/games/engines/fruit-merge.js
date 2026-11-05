/**
 * GAME 3: FRUIT MERGE — Playable 2D Physics Puzzle Engine
 * Mechanics: 10 fruit tiers, multi-substep circle collision & restitution solver,
 * identical fruit fusion, chain score multipliers, top danger-line detection.
 */
(function (root) {
  'use strict';

  root.MPA_GAME_SHELL.registerEngine('fruit-merge', function (api) {
    const canvas = api.canvas;
    const ctx = canvas.getContext('2d');

    const W = 460;
    const H = 580;
    const JAR = { left: 56, right: 404, top: 98, bottom: 548 };
    const DANGER_Y = 128;

    const FRUITS = [
      { tier: 0, name: 'Blueberry', r: 15, color: '#6366f1', rim: '#a5b4fc', pts: 10 },
      { tier: 1, name: 'Cherry', r: 21, color: '#f43f5e', rim: '#fda4af', pts: 22 },
      { tier: 2, name: 'Lime', r: 28, color: '#84cc16', rim: '#d9f99d', pts: 40 },
      { tier: 3, name: 'Lemon', r: 35, color: '#eab308', rim: '#fef08a', pts: 70 },
      { tier: 4, name: 'Kiwi', r: 43, color: '#10b981', rim: '#6ee7b7', pts: 115 },
      { tier: 5, name: 'Orange', r: 52, color: '#f97316', rim: '#fdba74', pts: 180 },
      { tier: 6, name: 'Peach', r: 62, color: '#ec4899', rim: '#f9a8d4', pts: 260 },
      { tier: 7, name: 'Coconut', r: 72, color: '#a855f7', rim: '#e9d5ff', pts: 380 },
      { tier: 8, name: 'Pineapple', r: 83, color: '#06b6d4', rim: '#67e8f9', pts: 540 },
      { tier: 9, name: 'Watermelon', r: 95, color: '#22c55e', rim: '#bbf7d0', pts: 800 }
    ];

    let rafId = null;
    let lastTime = 0;
    let balls = [];
    let particles = [];
    let popups = [];
    let aimX = (JAR.left + JAR.right) / 2;
    let currentTier = 0;
    let nextTier = 1;
    let dropCooldown = 0;
    let comboChain = 0;
    let comboTimer = 0;
    let dangerTimer = 0;
    let highestTierReached = 0;
    let mergesCount = 0;
    let idCounter = 1;

    function resizeCanvas() {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function pickSpawnTier() {
      return Math.floor(Math.random() * 4); // Tiers 0..3 can drop
    }

    function resetState() {
      balls = [];
      particles = [];
      popups = [];
      aimX = (JAR.left + JAR.right) / 2;
      currentTier = pickSpawnTier();
      nextTier = pickSpawnTier();
      dropCooldown = 0;
      comboChain = 0;
      comboTimer = 0;
      dangerTimer = 0;
      highestTierReached = 0;
      mergesCount = 0;
    }

    function clampAim(x) {
      const r = FRUITS[currentTier].r;
      return Math.max(JAR.left + r + 3, Math.min(JAR.right - r - 3, x));
    }

    function dropFruit() {
      if (!api.isRunning() || dropCooldown > 0) return;
      const spec = FRUITS[currentTier];
      const spawnX = clampAim(aimX) + (Math.random() - 0.5) * 1.2;
      balls.push({
        id: idCounter++,
        tier: currentTier,
        x: spawnX,
        y: JAR.top - 10,
        vx: 0,
        vy: 45,
        r: spec.r,
        age: 0,
        merged: false
      });
      api.playSound('drop');
      currentTier = nextTier;
      nextTier = pickSpawnTier();
      aimX = clampAim(aimX);
      dropCooldown = 0.42;
    }

    function spawnBurst(x, y, color) {
      for (let i = 0; i < 14; i++) {
        const a = (Math.PI * 2 * i) / 14 + Math.random() * 0.3;
        const spd = 65 + Math.random() * 140;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          r: 3 + Math.random() * 3,
          color: color,
          alpha: 1
        });
      }
    }

    function stepPhysics(dt) {
      const SUBSTEPS = 5;
      const subDt = dt / SUBSTEPS;

      for (let s = 0; s < SUBSTEPS; s++) {
        // Integrate gravity & walls
        for (let i = 0; i < balls.length; i++) {
          const b = balls[i];
          b.age += subDt;
          b.vy += 860 * subDt;
          b.vx *= 0.996;
          b.x += b.vx * subDt;
          b.y += b.vy * subDt;

          if (b.x - b.r < JAR.left) {
            b.x = JAR.left + b.r;
            b.vx = Math.abs(b.vx) * 0.38;
          } else if (b.x + b.r > JAR.right) {
            b.x = JAR.right - b.r;
            b.vx = -Math.abs(b.vx) * 0.38;
          }
          if (b.y + b.r > JAR.bottom) {
            b.y = JAR.bottom - b.r;
            b.vy = -Math.abs(b.vy) * 0.22;
            b.vx *= 0.94;
          }
        }

        // Pairwise collisions & merges
        const newMergedBalls = [];
        for (let i = 0; i < balls.length; i++) {
          const a = balls[i];
          if (a.merged) continue;
          for (let j = i + 1; j < balls.length; j++) {
            const b = balls[j];
            if (b.merged) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy;
            const minDist = a.r + b.r;

            if (distSq < minDist * minDist) {
              if (a.tier === b.tier) {
                // Merge identical fruits!
                a.merged = true;
                b.merged = true;
                const mx = (a.x + b.x) * 0.5;
                const my = (a.y + b.y) * 0.5;
                const nextT = Math.min(FRUITS.length - 1, a.tier + 1);
                const spec = FRUITS[nextT];

                if (a.tier < FRUITS.length - 1) {
                  newMergedBalls.push({
                    id: idCounter++,
                    tier: nextT,
                    x: Math.max(JAR.left + spec.r, Math.min(JAR.right - spec.r, mx)),
                    y: Math.min(JAR.bottom - spec.r, my),
                    vx: (a.vx + b.vx) * 0.3,
                    vy: -65,
                    r: spec.r,
                    age: 0.5,
                    merged: false
                  });
                }

                comboChain = comboTimer > 0 ? Math.min(8, comboChain + 1) : 1;
                comboTimer = 2.2;
                const mult = 1 + (comboChain - 1) * 0.5;
                const gained = Math.round(spec.pts * mult);
                api.addScore(gained);
                mergesCount += 1;
                if (nextT > highestTierReached) highestTierReached = nextT;

                api.playSound(comboChain >= 2 ? 'combo' : 'merge');
                spawnBurst(mx, my, spec.rim);
                popups.push({
                  x: mx,
                  y: my - 10,
                  text: '+' + gained + (mult > 1 ? ' (x' + mult.toFixed(1) + ')' : ''),
                  color: mult > 1 ? '#fde047' : '#ffffff',
                  alpha: 1
                });
                break;
              } else {
                // Elastic circle separation + impulse
                const dist = Math.max(0.01, Math.sqrt(distSq));
                const nx = dx / dist;
                const ny = dy / dist;
                const overlap = minDist - dist;
                const massA = a.r * a.r;
                const massB = b.r * b.r;
                const totalMass = massA + massB;

                a.x -= nx * overlap * (massB / totalMass);
                a.y -= ny * overlap * (massB / totalMass);
                b.x += nx * overlap * (massA / totalMass);
                b.y += ny * overlap * (massA / totalMass);

                const rvx = b.vx - a.vx;
                const rvy = b.vy - a.vy;
                const velAlongNormal = rvx * nx + rvy * ny;
                if (velAlongNormal < 0) {
                  const restitution = 0.28;
                  const jImp = -(1 + restitution) * velAlongNormal / (1 / massA + 1 / massB);
                  const impX = jImp * nx;
                  const impY = jImp * ny;
                  a.vx -= impX / massA;
                  a.vy -= impY / massA;
                  b.vx += impX / massB;
                  b.vy += impY / massB;
                }
              }
            }
          }
        }

        if (newMergedBalls.length > 0) {
          balls = balls.filter(function (item) { return !item.merged; }).concat(newMergedBalls);
        }
      }
    }

    function update(dt) {
      if (dropCooldown > 0) dropCooldown = Math.max(0, dropCooldown - dt);
      if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) comboChain = 0;
      }

      stepPhysics(dt);

      // Check danger line overflow for settled fruits (age > 1.3s)
      let overflowing = false;
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (b.age > 1.3 && b.y - b.r < DANGER_Y) {
          overflowing = true;
          break;
        }
      }

      if (overflowing) {
        dangerTimer += dt;
        if (dangerTimer >= 1.85) {
          api.gameOver({
            summary: 'Best Fruit: ' + FRUITS[highestTierReached].name + ' • ' + mergesCount + ' Merges'
          });
          return;
        }
      } else {
        dangerTimer = Math.max(0, dangerTimer - dt * 2);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= 2.1 * dt;
        if (p.alpha <= 0) particles.splice(i, 1);
      }

      for (let i = popups.length - 1; i >= 0; i--) {
        const pop = popups[i];
        pop.y -= 36 * dt;
        pop.alpha -= 1.2 * dt;
        if (pop.alpha <= 0) popups.splice(i, 1);
      }
    }

    function drawFruitCircle(x, y, tier, alpha) {
      const spec = FRUITS[tier];
      ctx.save();
      if (typeof alpha === 'number') ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.arc(x, y, spec.r, 0, Math.PI * 2);
      ctx.fillStyle = spec.color;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = spec.rim;
      ctx.stroke();

      // Glossy highlight
      ctx.beginPath();
      ctx.arc(x - spec.r * 0.3, y - spec.r * 0.32, Math.max(3, spec.r * 0.22), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fill();

      // Cute arcade eyes + smile
      const eyeOffset = Math.max(4, spec.r * 0.26);
      const eyeR = Math.max(1.8, spec.r * 0.08);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x - eyeOffset, y - spec.r * 0.05, eyeR, 0, Math.PI * 2);
      ctx.arc(x + eyeOffset, y - spec.r * 0.05, eyeR, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y + spec.r * 0.04, Math.max(3, spec.r * 0.2), 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.restore();
    }

    function render() {
      ctx.fillStyle = '#0b0a1f';
      ctx.fillRect(0, 0, W, H);

      // Next Fruit Preview Box
      ctx.fillStyle = 'rgba(19, 25, 56, 0.85)';
      ctx.fillRect(JAR.right - 98, 12, 98, 56);
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(JAR.right - 98, 12, 98, 56);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('NEXT', JAR.right - 88, 32);

      const nextSpec = FRUITS[nextTier];
      ctx.beginPath();
      ctx.arc(JAR.right - 28, 40, Math.min(18, nextSpec.r * 0.72), 0, Math.PI * 2);
      ctx.fillStyle = nextSpec.color;
      ctx.fill();
      ctx.strokeStyle = nextSpec.rim;
      ctx.stroke();

      // Combo indicator
      if (comboChain >= 2) {
        ctx.fillStyle = '#fde047';
        ctx.font = '800 14px monospace';
        ctx.fillText('CHAIN x' + (1 + (comboChain - 1) * 0.5).toFixed(1), JAR.left, 42);
      }

      // Jar Container Background
      ctx.fillStyle = 'rgba(17, 23, 52, 0.72)';
      ctx.fillRect(JAR.left, JAR.top, JAR.right - JAR.left, JAR.bottom - JAR.top);

      // Danger line
      ctx.save();
      ctx.setLineDash([7, 6]);
      ctx.strokeStyle = dangerTimer > 0.15 ? '#f43f5e' : 'rgba(244, 63, 94, 0.45)';
      ctx.lineWidth = dangerTimer > 0.15 ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(JAR.left + 4, DANGER_Y);
      ctx.lineTo(JAR.right - 4, DANGER_Y);
      ctx.stroke();
      ctx.restore();

      // Aim guide + current fruit ready to drop
      if (dropCooldown <= 0.05) {
        const cx = clampAim(aimX);
        ctx.save();
        ctx.setLineDash([4, 5]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.moveTo(cx, JAR.top - 10);
        ctx.lineTo(cx, JAR.bottom);
        ctx.stroke();
        ctx.restore();

        drawFruitCircle(cx, JAR.top - 14, currentTier, 0.95);
      }

      // Dropped Fruits
      for (let i = 0; i < balls.length; i++) {
        drawFruitCircle(balls[i].x, balls[i].y, balls[i].tier, 1);
      }

      // Jar Neon Walls
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(JAR.left, JAR.top);
      ctx.lineTo(JAR.left, JAR.bottom);
      ctx.lineTo(JAR.right, JAR.bottom);
      ctx.lineTo(JAR.right, JAR.top);
      ctx.stroke();

      // Tier legend bar along bottom
      const stepX = (JAR.right - JAR.left) / FRUITS.length;
      for (let t = 0; t < FRUITS.length; t++) {
        const lx = JAR.left + stepX * (t + 0.5);
        ctx.beginPath();
        ctx.arc(lx, H - 14, 5 + t * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = FRUITS[t].color;
        ctx.globalAlpha = t <= highestTierReached ? 1 : 0.35;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Particles & Popups
      particles.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      popups.forEach(function (pop) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pop.alpha);
        ctx.fillStyle = pop.color;
        ctx.font = '800 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
      });
    }

    function getCanvasX(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / Math.max(1, rect.width);
      return (e.clientX - rect.left) * scaleX;
    }

    function bindInputs() {
      let dragging = false;

      canvas.addEventListener('pointermove', function (e) {
        if (!api.isRunning()) return;
        aimX = clampAim(getCanvasX(e));
      });

      canvas.addEventListener('pointerdown', function (e) {
        if (!api.isRunning()) return;
        e.preventDefault();
        dragging = true;
        aimX = clampAim(getCanvasX(e));
      });

      canvas.addEventListener('pointerup', function (e) {
        if (!api.isRunning() || !dragging) return;
        e.preventDefault();
        dragging = false;
        aimX = clampAim(getCanvasX(e));
        dropFruit();
      });

      root.addEventListener('keydown', function (e) {
        if (!api.isRunning()) return;
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          aimX = clampAim(aimX - 22);
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          aimX = clampAim(aimX + 22);
        } else if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'Enter') {
          e.preventDefault();
          dropFruit();
        }
      });
    }

    function loop(ts) {
      if (!lastTime) lastTime = ts;
      const dt = Math.min(0.04, (ts - lastTime) / 1000);
      lastTime = ts;
      if (api.isRunning()) {
        update(dt);
      }
      render();
      rafId = root.requestAnimationFrame(loop);
    }

    return {
      init: function () {
        resizeCanvas();
        resetState();
        bindInputs();
        render();
        rafId = root.requestAnimationFrame(loop);
      },
      start: function () {
        resetState();
        lastTime = 0;
      },
      pause: function () {},
      resume: function () {
        lastTime = 0;
      },
      restart: function () {
        resetState();
        lastTime = 0;
      },
      destroy: function () {
        if (rafId) root.cancelAnimationFrame(rafId);
      },
      getShareSummary: function () {
        return 'Reached ' + FRUITS[highestTierReached].name + ' (' + mergesCount + ' merges)';
      },
      triggerDrop: dropFruit
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
