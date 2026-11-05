/**
 * GAME 2: COLOR SWITCH RUSH — Playable HTML5 Canvas Engine
 * Mechanics: Bouncing neon orb, rotating 4-color ring & sliding bar obstacles,
 * star collectibles, chromatic color-switcher orbs, particle bursts, rising speed.
 */
(function (root) {
  'use strict';

  root.MPA_GAME_SHELL.registerEngine('color-switch-rush', function (api) {
    const canvas = api.canvas;
    const ctx = canvas.getContext('2d');

    const W = 460;
    const H = 580;
    const COLORS = ['#06b6d4', '#a855f7', '#f43f5e', '#facc15'];
    const COLOR_NAMES = ['CYAN', 'PURPLE', 'ROSE', 'GOLD'];
    const TWO_PI = Math.PI * 2;
    const HALF_PI = Math.PI / 2;

    let rafId = null;
    let lastTime = 0;
    let ball = null;
    let obstacles = [];
    let stars = [];
    let switchers = [];
    let particles = [];
    let cameraY = 0;
    let highestY = 0;
    let spawnedCount = 0;
    let nextSpawnY = 0;
    let starsCollected = 0;
    let gatesCleared = 0;
    let awaitingFirstBounce = true;
    let dead = false;

    function resizeCanvas() {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function normAngle(a) {
      let r = a % TWO_PI;
      if (r < 0) r += TWO_PI;
      return r;
    }

    function spawnParticles(x, y, colorOrAll, count) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * TWO_PI;
        const spd = 60 + Math.random() * 200;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          r: 2.5 + Math.random() * 3.5,
          color: colorOrAll === 'all' ? COLORS[i % 4] : colorOrAll,
          alpha: 1
        });
      }
    }

    function spawnObstacleSegment() {
      const idx = spawnedCount;
      const y = nextSpawnY;
      const speedScale = 1 + Math.min(1.6, idx * 0.08);
      const dir = idx % 2 === 0 ? 1 : -1;

      let type = 'ring';
      if (idx > 0 && idx % 3 === 2) {
        type = 'bars';
      } else if (idx > 1 && idx % 4 === 3) {
        type = 'double-ring';
      }

      obstacles.push({
        id: idx,
        type: type,
        y: y,
        radius: 80,
        innerRadius: 56,
        thickness: 14,
        angle: (idx * 0.7) % TWO_PI,
        rotSpeed: 1.35 * speedScale * dir,
        barOffset: 0,
        barSpeed: 120 * speedScale * dir,
        passed: false
      });

      stars.push({
        x: W / 2,
        y: y,
        collected: false,
        pulse: Math.random() * TWO_PI
      });

      switchers.push({
        x: W / 2,
        y: y - 145,
        collected: false,
        rot: 0
      });

      spawnedCount += 1;
      nextSpawnY -= 290;
    }

    function resetState() {
      const initColorIdx = 0;
      ball = {
        x: W / 2,
        y: H - 120,
        r: 12,
        vy: 0,
        colorIdx: initColorIdx,
        trail: []
      };
      obstacles = [];
      stars = [];
      switchers = [];
      particles = [];
      cameraY = 0;
      highestY = ball.y;
      spawnedCount = 0;
      nextSpawnY = H - 310;
      starsCollected = 0;
      gatesCleared = 0;
      awaitingFirstBounce = true;
      dead = false;

      for (let i = 0; i < 5; i++) {
        spawnObstacleSegment();
      }
    }

    function bounce() {
      if (!api.isRunning() || dead) return;
      awaitingFirstBounce = false;
      ball.vy = -415;
      api.playSound('jump');
      spawnParticles(ball.x, ball.y + 8, COLORS[ball.colorIdx], 6);
    }

    function triggerCrash() {
      if (dead) return;
      dead = true;
      spawnParticles(ball.x, ball.y, 'all', 32);
      setTimeout(function () {
        api.gameOver({
          summary: 'Stars: ' + starsCollected + ' • Gates Cleared: ' + gatesCleared
        });
      }, 320);
    }

    function checkRingCollision(obs, radius, angle) {
      const dy = ball.y - obs.y;
      const absDy = Math.abs(dy);
      const halfThick = obs.thickness / 2;
      if (absDy < radius - halfThick - ball.r + 3 || absDy > radius + halfThick + ball.r - 3) {
        return false;
      }
      // Ball is at x = W/2, so contact angle from ring center is +PI/2 (bottom) or 3*PI/2 (top)
      const contactAngle = dy >= 0 ? HALF_PI : Math.PI * 1.5;
      const rel = normAngle(contactAngle - angle);
      const quadrant = Math.floor(rel / HALF_PI) % 4;
      return quadrant !== ball.colorIdx;
    }

    function checkBarCollision(obs) {
      const barHalfH = 8;
      if (Math.abs(ball.y - obs.y) > barHalfH + ball.r - 2) return false;
      const segW = W / 4;
      const relX = ((ball.x - obs.barOffset) % W + W) % W;
      const segIdx = Math.floor(relX / segW) % 4;
      return segIdx !== ball.colorIdx;
    }

    function update(dt) {
      if (dead) {
        updateParticles(dt);
        return;
      }

      if (!awaitingFirstBounce) {
        ball.vy += 980 * dt;
        ball.y += ball.vy * dt;

        if (ball.y < highestY) {
          const gained = Math.floor((highestY - ball.y) * 0.12);
          if (gained > 0) {
            api.addScore(gained);
            highestY = ball.y;
          }
        }

        const targetCam = Math.max(0, (H * 0.56) - ball.y);
        if (targetCam > cameraY) {
          cameraY += (targetCam - cameraY) * Math.min(1, dt * 10);
        }

        // Floor check
        if (ball.y + cameraY > H + 26) {
          triggerCrash();
          return;
        }
      }

      ball.trail.unshift({ x: ball.x, y: ball.y, color: COLORS[ball.colorIdx] });
      if (ball.trail.length > 10) ball.trail.pop();

      while (nextSpawnY + cameraY > -380) {
        spawnObstacleSegment();
      }

      // Update obstacles & check collisions
      for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        obs.angle = normAngle(obs.angle + obs.rotSpeed * dt);
        obs.barOffset = (obs.barOffset + obs.barSpeed * dt) % W;

        if (!obs.passed && ball.y < obs.y - obs.radius - 20) {
          obs.passed = true;
          gatesCleared += 1;
          api.addScore(20);
        }

        if (obs.type === 'ring') {
          if (checkRingCollision(obs, obs.radius, obs.angle)) {
            triggerCrash();
            return;
          }
        } else if (obs.type === 'double-ring') {
          if (checkRingCollision(obs, obs.radius, obs.angle)) {
            triggerCrash();
            return;
          }
          // Inner counter-rotating ring uses exact same color mapping at opposite spin
          if (checkRingCollision(obs, obs.innerRadius, -obs.angle)) {
            triggerCrash();
            return;
          }
        } else if (obs.type === 'bars') {
          if (checkBarCollision(obs)) {
            triggerCrash();
            return;
          }
        }
      }

      // Collect stars
      stars.forEach(function (st) {
        st.pulse += dt * 4;
        if (!st.collected && Math.abs(ball.y - st.y) < ball.r + 15) {
          st.collected = true;
          starsCollected += 1;
          api.addScore(30);
          api.playSound('star');
          spawnParticles(st.x, st.y, '#facc15', 14);
        }
      });

      // Collect color switchers
      switchers.forEach(function (sw) {
        sw.rot += dt * 3;
        if (!sw.collected && Math.abs(ball.y - sw.y) < ball.r + 14) {
          sw.collected = true;
          let nextIdx = Math.floor(Math.random() * 4);
          if (nextIdx === ball.colorIdx) nextIdx = (nextIdx + 1) % 4;
          ball.colorIdx = nextIdx;
          api.addScore(10);
          api.playSound('perfect');
          spawnParticles(sw.x, sw.y, 'all', 16);
        }
      });

      updateParticles(dt);
    }

    function updateParticles(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= 1.8 * dt;
        if (p.alpha <= 0) particles.splice(i, 1);
      }
    }

    function drawRing(cx, cy, radius, thickness, baseAngle) {
      ctx.lineWidth = thickness;
      ctx.lineCap = 'butt';
      for (let q = 0; q < 4; q++) {
        ctx.beginPath();
        ctx.strokeStyle = COLORS[q];
        ctx.arc(cx, cy, radius, baseAngle + q * HALF_PI, baseAngle + (q + 1) * HALF_PI);
        ctx.stroke();
      }
    }

    function drawStar(cx, cy, r) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? r : r * 0.45;
        const a = (i * Math.PI) / 5 - HALF_PI;
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = '#fde047';
      ctx.fill();
      ctx.restore();
    }

    function render() {
      ctx.fillStyle = '#070b1e';
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(0, cameraY);

      // Launch pad under ball at start
      if (awaitingFirstBounce) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.fillRect(W / 2 - 44, H - 104, 88, 6);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TAP OR PRESS SPACE TO BOUNCE!', W / 2, H - 76);
      }

      // Obstacles
      obstacles.forEach(function (obs) {
        if (obs.y + cameraY < -160 || obs.y + cameraY > H + 160) return;
        if (obs.type === 'ring') {
          drawRing(W / 2, obs.y, obs.radius, obs.thickness, obs.angle);
        } else if (obs.type === 'double-ring') {
          drawRing(W / 2, obs.y, obs.radius, obs.thickness, obs.angle);
          drawRing(W / 2, obs.y, obs.innerRadius, obs.thickness - 2, normAngle(-obs.angle));
        } else if (obs.type === 'bars') {
          const segW = W / 4;
          for (let k = -4; k < 8; k++) {
            const cIdx = ((k % 4) + 4) % 4;
            const bx = obs.barOffset + k * segW;
            if (bx + segW < 0 || bx > W) continue;
            ctx.fillStyle = COLORS[cIdx];
            ctx.fillRect(bx, obs.y - 8, segW + 1, 16);
          }
        }
      });

      // Stars
      stars.forEach(function (st) {
        if (st.collected || st.y + cameraY < -40 || st.y + cameraY > H + 40) return;
        const scale = 1 + Math.sin(st.pulse) * 0.12;
        drawStar(st.x, st.y, 13 * scale);
      });

      // Chromatic Switcher Orbs
      switchers.forEach(function (sw) {
        if (sw.collected || sw.y + cameraY < -40 || sw.y + cameraY > H + 40) return;
        for (let q = 0; q < 4; q++) {
          ctx.beginPath();
          ctx.moveTo(sw.x, sw.y);
          ctx.arc(sw.x, sw.y, 13, sw.rot + q * HALF_PI, sw.rot + (q + 1) * HALF_PI);
          ctx.closePath();
          ctx.fillStyle = COLORS[q];
          ctx.fill();
        }
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, 13, 0, TWO_PI);
        ctx.stroke();
      });

      // Ball trail & ball
      if (!dead && ball) {
        ball.trail.forEach(function (t, idx) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, Math.max(2, ball.r * (1 - idx / 11)), 0, TWO_PI);
          ctx.fillStyle = t.color;
          ctx.globalAlpha = (1 - idx / 10) * 0.32;
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, TWO_PI);
        ctx.fillStyle = COLORS[ball.colorIdx];
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }

      // Particles
      particles.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TWO_PI);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      ctx.restore();

      // Current Orb Color Badge
      if (ball) {
        ctx.fillStyle = 'rgba(8, 12, 30, 0.78)';
        ctx.fillRect(14, 14, 174, 32);
        ctx.strokeStyle = COLORS[ball.colorIdx];
        ctx.lineWidth = 1.5;
        ctx.strokeRect(14, 14, 174, 32);
        ctx.fillStyle = COLORS[ball.colorIdx];
        ctx.font = '800 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('ORB: ' + COLOR_NAMES[ball.colorIdx] + ' • ★ ' + starsCollected, 24, 34);
      }
    }

    function loop(ts) {
      if (!lastTime) lastTime = ts;
      const dt = Math.min(0.05, (ts - lastTime) / 1000);
      lastTime = ts;
      if (api.isRunning()) {
        update(dt);
      }
      render();
      rafId = root.requestAnimationFrame(loop);
    }

    function bindInputs() {
      canvas.addEventListener('pointerdown', function (e) {
        if (!api.isRunning()) return;
        e.preventDefault();
        bounce();
      });
      root.addEventListener('keydown', function (e) {
        if (!api.isRunning()) return;
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
          e.preventDefault();
          bounce();
        }
      });
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
        return starsCollected + ' stars, ' + gatesCleared + ' gates';
      },
      triggerBounce: bounce
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
