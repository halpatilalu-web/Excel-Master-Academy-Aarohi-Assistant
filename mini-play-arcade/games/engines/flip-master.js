/**
 * GAME 5: FLIP MASTER — Physics-Inspired Acrobatic Platform Jumper
 * Mechanics: Hold to charge leap + preview arc, release to jump, hold in mid-air
 * to tuck & spin frontflips, release before touchdown to lock upright landing,
 * collect floating sky rings, hit bullseye centers, survive moving platforms.
 */
(function (root) {
  'use strict';

  root.MPA_GAME_SHELL.registerEngine('flip-master', function (api) {
    const canvas = api.canvas;
    const ctx = canvas.getContext('2d');

    const W = 560;
    const H = 520;
    const GRAVITY = 1040;
    const TWO_PI = Math.PI * 2;

    let rafId = null;
    let lastTime = 0;

    let platforms = [];
    let rings = [];
    let particles = [];
    let popups = [];
    let jumper = null;
    let cameraX = 0;
    let targetCameraX = 0;
    let holdingInput = false;
    let stageNum = 1;
    let totalFlips = 0;
    let ringsGrabbed = 0;

    function resizeCanvas() {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createNextPlatform(prev, index) {
      const gap = 125 + Math.random() * Math.min(130, 55 + index * 9);
      const width = Math.max(66, 122 - Math.min(48, index * 3.2));
      const baseY = 350 + (Math.random() - 0.5) * 90;
      const moving = index >= 4 && index % 3 === 1;
      const plat = {
        index: index,
        x: prev.x + prev.w + gap,
        baseX: prev.x + prev.w + gap,
        y: Math.max(260, Math.min(420, baseY)),
        w: width,
        h: 22,
        moving: moving,
        movePhase: Math.random() * TWO_PI,
        moveAmp: moving ? 26 : 0
      };

      // Spawn 2 collectible sky rings along the parabolic arc between prev and plat
      const midX = (prev.x + prev.w * 0.5 + plat.x + plat.w * 0.5) * 0.5;
      const peakY = Math.min(prev.y, plat.y) - 105;
      rings.push({ x: midX - 28, y: peakY + 12, r: 12, taken: false });
      rings.push({ x: midX + 28, y: peakY + 4, r: 12, taken: false });

      return plat;
    }

    function resetState() {
      platforms = [
        { index: 0, x: 56, baseX: 56, y: 370, w: 124, h: 22, moving: false, movePhase: 0, moveAmp: 0 }
      ];
      rings = [];
      particles = [];
      popups = [];
      for (let i = 1; i <= 5; i++) {
        platforms.push(createNextPlatform(platforms[platforms.length - 1], i));
      }

      jumper = {
        state: 'grounded', // 'grounded' | 'charging' | 'airborne' | 'crashed'
        platIndex: 0,
        offsetOnPlat: 62,
        x: 56 + 62,
        y: 370,
        vx: 0,
        vy: 0,
        charge: 0,
        angle: 0,
        spinAccum: 0,
        tucked: false
      };

      cameraX = 0;
      targetCameraX = 0;
      holdingInput = false;
      stageNum = 1;
      totalFlips = 0;
      ringsGrabbed = 0;
    }

    function spawnParticles(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TWO_PI;
        const s = 50 + Math.random() * 160;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          r: 2.5 + Math.random() * 3,
          color: color,
          alpha: 1
        });
      }
    }

    function launchJump() {
      if (jumper.state !== 'charging') return;
      const power = Math.max(0.22, Math.min(1, jumper.charge));
      jumper.state = 'airborne';
      jumper.vx = 185 + power * 265;
      jumper.vy = -(370 + power * 360);
      jumper.angle = 0.12;
      jumper.spinAccum = 0;
      jumper.tucked = false;
      jumper.charge = 0;
      api.playSound('jump');
      spawnParticles(jumper.x, jumper.y, '#38bdf8', 10);
    }

    function crash(reason) {
      if (jumper.state === 'crashed') return;
      jumper.state = 'crashed';
      holdingInput = false;
      spawnParticles(jumper.x, jumper.y - 16, '#f43f5e', 24);
      setTimeout(function () {
        api.gameOver({
          summary: reason + ' • Stage ' + stageNum + ' • ' + totalFlips + ' Flips'
        });
      }, 360);
    }

    function update(dt) {
      cameraX += (targetCameraX - cameraX) * Math.min(1, dt * 6.5);

      // Update moving platforms
      platforms.forEach(function (p) {
        if (p.moving) {
          p.movePhase += dt * 2.1;
          p.x = p.baseX + Math.sin(p.movePhase) * p.moveAmp;
        }
      });

      if (jumper.state === 'grounded' || jumper.state === 'charging') {
        const curPlat = platforms[jumper.platIndex];
        if (curPlat) {
          jumper.x = curPlat.x + jumper.offsetOnPlat;
          jumper.y = curPlat.y;
        }
        if (jumper.state === 'charging') {
          jumper.charge = Math.min(1, jumper.charge + dt * 0.92);
        }
      } else if (jumper.state === 'airborne') {
        const prevY = jumper.y;
        jumper.vy += GRAVITY * dt;
        jumper.x += jumper.vx * dt;
        jumper.y += jumper.vy * dt;

        if (holdingInput) {
          jumper.tucked = true;
          const spinDelta = 8.4 * dt;
          jumper.angle += spinDelta;
          jumper.spinAccum += spinDelta;
        } else {
          jumper.tucked = false;
          // Auto-stabilize gently toward nearest upright multiple of 2*PI
          const nearestUpright = Math.round(jumper.angle / TWO_PI) * TWO_PI;
          jumper.angle += (nearestUpright - jumper.angle) * Math.min(1, dt * 8.5);
        }

        // Collect sky rings
        rings.forEach(function (rg) {
          if (!rg.taken) {
            const dx = jumper.x - rg.x;
            const dy = (jumper.y - 22) - rg.y;
            if (dx * dx + dy * dy < (rg.r + 22) * (rg.r + 22)) {
              rg.taken = true;
              ringsGrabbed += 1;
              api.addScore(25);
              api.playSound('coin');
              spawnParticles(rg.x, rg.y, '#facc15', 10);
              popups.push({ x: rg.x, y: rg.y - 8, text: '+25 RING', color: '#fde047', alpha: 1 });
            }
          }
        });

        // Check platform landing when descending
        if (jumper.vy > 0) {
          for (let i = 0; i < platforms.length; i++) {
            const p = platforms[i];
            if (jumper.x >= p.x - 6 && jumper.x <= p.x + p.w + 6 && prevY <= p.y + 8 && jumper.y >= p.y) {
              // Check upright posture tolerance
              const nearest = Math.round(jumper.angle / TWO_PI) * TWO_PI;
              const tiltErr = Math.abs(jumper.angle - nearest);

              if (tiltErr > 0.92) {
                jumper.y = p.y;
                crash('Head-first wipeout!');
                return;
              }

              // Clean landing!
              jumper.state = 'grounded';
              jumper.y = p.y;
              jumper.vx = 0;
              jumper.vy = 0;
              jumper.angle = 0;
              jumper.offsetOnPlat = Math.max(10, Math.min(p.w - 10, jumper.x - p.x));

              if (i > jumper.platIndex) {
                const flipsDone = Math.max(0, Math.round(jumper.spinAccum / TWO_PI));
                totalFlips += flipsDone;
                const centerDist = Math.abs((jumper.x) - (p.x + p.w / 2));
                const bullseye = centerDist <= p.w * 0.2;

                let pts = 40 + flipsDone * 45;
                if (bullseye) pts += 35;
                api.addScore(pts);
                api.playSound(bullseye || flipsDone >= 1 ? 'perfect' : 'drop');

                const label = (bullseye ? 'BULLSEYE! ' : 'STUCK IT! ') +
                  (flipsDone > 0 ? flipsDone + 'x FLIP ' : '') + '(+' + pts + ')';
                popups.push({
                  x: jumper.x,
                  y: jumper.y - 54,
                  text: label,
                  color: bullseye ? '#fde047' : '#38bdf8',
                  alpha: 1
                });
                spawnParticles(jumper.x, jumper.y, bullseye ? '#fde047' : '#22d3ee', 14);

                jumper.platIndex = i;
                stageNum += 1;
                targetCameraX = Math.max(0, p.x - 82);

                // Keep spawning ahead
                while (platforms.length - jumper.platIndex < 5) {
                  const last = platforms[platforms.length - 1];
                  platforms.push(createNextPlatform(last, last.index + 1));
                }
              }
              return;
            }
          }
        }

        // Missed and fell into abyss
        if (jumper.y > H + 60) {
          crash('Missed the platform!');
          return;
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.alpha -= 2 * dt;
        if (pt.alpha <= 0) particles.splice(i, 1);
      }

      for (let i = popups.length - 1; i >= 0; i--) {
        const pop = popups[i];
        pop.y -= 38 * dt;
        pop.alpha -= 1.05 * dt;
        if (pop.alpha <= 0) popups.splice(i, 1);
      }
    }

    function drawTrajectoryPreview() {
      const power = Math.max(0.22, Math.min(1, jumper.charge));
      const vx = 185 + power * 265;
      const vy = -(370 + power * 360);
      ctx.fillStyle = 'rgba(34, 211, 238, 0.72)';
      for (let step = 1; step <= 11; step++) {
        const t = step * 0.065;
        const px = jumper.x + vx * t;
        const py = (jumper.y - 18) + vy * t + 0.5 * GRAVITY * t * t;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, 5 - step * 0.25), 0, TWO_PI);
        ctx.fill();
      }
    }

    function drawJumper() {
      ctx.save();
      const crouch = jumper.state === 'charging' ? jumper.charge * 10 : 0;
      ctx.translate(jumper.x, jumper.y - 22 + crouch * 0.5);
      ctx.rotate(jumper.angle);

      if (jumper.tucked) {
        // Tucked acrobatic spin pose
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, TWO_PI);
        ctx.fill();
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(8, -11, 7.5, 0, TWO_PI);
        ctx.fill();
      } else {
        // Upright athletic pose
        // Legs
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-5, 8);
        ctx.lineTo(-8, 22 - crouch * 0.5);
        ctx.moveTo(5, 8);
        ctx.lineTo(8, 22 - crouch * 0.5);
        ctx.stroke();

        // Torso
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(-8, -10, 16, 20);

        // Head + Visor
        ctx.beginPath();
        ctx.arc(0, -19, 8.5, 0, TWO_PI);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(1, -21, 7, 4);
      }
      ctx.restore();
    }

    function render() {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#070e24');
      grad.addColorStop(1, '#131036');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(-cameraX, 0);

      // Platforms
      platforms.forEach(function (p) {
        if (p.x + p.w < cameraX - 80 || p.x > cameraX + W + 80) return;

        // Pillar glow below platform
        const pilGrad = ctx.createLinearGradient(0, p.y + p.h, 0, H);
        pilGrad.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
        pilGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = pilGrad;
        ctx.fillRect(p.x + 8, p.y + p.h, p.w - 16, H - p.y);

        // Platform deck
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = p.moving ? '#a855f7' : '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(p.x, p.y, p.w, p.h);

        // Bullseye center pad
        const bullW = p.w * 0.36;
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(p.x + (p.w - bullW) / 2, p.y, bullW, 5);
      });

      // Sky Rings
      rings.forEach(function (rg) {
        if (rg.taken || rg.x < cameraX - 40 || rg.x > cameraX + W + 40) return;
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, rg.r, 0, TWO_PI);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      });

      // Trajectory preview while charging
      if (jumper && jumper.state === 'charging') {
        drawTrajectoryPreview();
      }

      // Jumper
      if (jumper && jumper.state !== 'crashed') {
        drawJumper();
      }

      // Particles & Popups
      particles.forEach(function (pt) {
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, TWO_PI);
        ctx.fillStyle = pt.color;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      popups.forEach(function (pop) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pop.alpha);
        ctx.fillStyle = pop.color;
        ctx.font = '800 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
      });

      ctx.restore();

      // Charge Power Bar + Stage HUD
      ctx.fillStyle = 'rgba(8, 12, 30, 0.78)';
      ctx.fillRect(14, 14, 196, 34);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(14, 14, 196, 34);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('STAGE ' + stageNum + ' • FLIPS ' + totalFlips + ' • ◯ ' + ringsGrabbed, 24, 35);

      if (jumper && jumper.state === 'charging') {
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fillRect(W / 2 - 80, 20, 160, 12);
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(W / 2 - 80, 20, 160 * jumper.charge, 12);
      }
    }

    function onPressStart() {
      if (!api.isRunning() || !jumper) return;
      holdingInput = true;
      if (jumper.state === 'grounded') {
        jumper.state = 'charging';
        jumper.charge = 0.08;
      }
    }

    function onPressEnd() {
      if (!jumper) return;
      holdingInput = false;
      if (jumper.state === 'charging' && api.isRunning()) {
        launchJump();
      }
    }

    function bindInputs() {
      canvas.addEventListener('pointerdown', function (e) {
        if (!api.isRunning()) return;
        e.preventDefault();
        onPressStart();
      });
      root.addEventListener('pointerup', function () {
        onPressEnd();
      });
      root.addEventListener('keydown', function (e) {
        if (!api.isRunning() || e.repeat) return;
        if (e.code === 'Space' || e.code === 'ArrowUp') {
          e.preventDefault();
          onPressStart();
        }
      });
      root.addEventListener('keyup', function (e) {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
          onPressEnd();
        }
      });
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
      pause: function () {
        holdingInput = false;
      },
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
        return 'Stage ' + stageNum + ' with ' + totalFlips + ' flips';
      },
      // Test hook
      simulateQuickJump: function () {
        onPressStart();
        jumper.charge = 0.55;
        onPressEnd();
      }
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
