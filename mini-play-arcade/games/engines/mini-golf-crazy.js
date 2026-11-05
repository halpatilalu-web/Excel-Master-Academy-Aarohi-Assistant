/**
 * GAME 10: MINI GOLF CRAZY — 20-Hole Physics Course Engine
 * Mechanics: 20 distinct handcrafted levels, drag-to-aim dotted trajectory &
 * power meter, multi-substep 2D ball physics, rectangular walls, moving gates,
 * bouncy neon bumpers, sand traps, water hazards, boost pads, and stroke/par HUD.
 */
(function (root) {
  'use strict';

  const W = 560;
  const H = 520;
  const PLAY = { left: 36, top: 68, right: 524, bottom: 486 };

  // 20 Handcrafted Playable Mini Golf Holes
  const COURSES = [
    {
      hole: 1, name: 'Warmup Fairway', par: 2,
      tee: { x: 105, y: 277 }, cup: { x: 445, y: 277 },
      walls: [], bumpers: [], sand: [], water: [], boosts: [], moving: []
    },
    {
      hole: 2, name: 'Center Pillar', par: 2,
      tee: { x: 100, y: 277 }, cup: { x: 452, y: 277 },
      walls: [{ x: 266, y: 215, w: 26, h: 124 }],
      bumpers: [], sand: [], water: [], boosts: [], moving: []
    },
    {
      hole: 3, name: 'Twin Bumpers', par: 2,
      tee: { x: 96, y: 277 }, cup: { x: 456, y: 277 },
      walls: [],
      bumpers: [{ x: 250, y: 215, r: 22 }, { x: 250, y: 340, r: 22 }, { x: 340, y: 277, r: 20 }],
      sand: [], water: [], boosts: [], moving: []
    },
    {
      hole: 4, name: 'Dune Crossing', par: 3,
      tee: { x: 95, y: 390 }, cup: { x: 455, y: 150 },
      walls: [{ x: 220, y: 68, w: 22, h: 220 }],
      bumpers: [],
      sand: [{ x: 270, y: 330, w: 130, h: 90 }],
      water: [], boosts: [], moving: []
    },
    {
      hole: 5, name: 'Lagoon Edge', par: 3,
      tee: { x: 95, y: 150 }, cup: { x: 455, y: 400 },
      walls: [],
      bumpers: [{ x: 300, y: 165, r: 22 }],
      sand: [],
      water: [{ x: 185, y: 255, w: 185, h: 95 }],
      boosts: [], moving: []
    },
    {
      hole: 6, name: 'Turbo Alley', par: 2,
      tee: { x: 92, y: 410 }, cup: { x: 456, y: 140 },
      walls: [{ x: 36, y: 265, w: 345, h: 22 }],
      bumpers: [{ x: 465, y: 410, r: 24 }],
      sand: [], water: [],
      boosts: [{ x: 210, y: 382, w: 110, h: 52, vx: 380, vy: 0 }],
      moving: []
    },
    {
      hole: 7, name: 'Pendulum Gate', par: 3,
      tee: { x: 96, y: 277 }, cup: { x: 456, y: 277 },
      walls: [{ x: 270, y: 68, w: 22, h: 95 }, { x: 270, y: 390, w: 22, h: 96 }],
      bumpers: [], sand: [], water: [], boosts: [],
      moving: [{ x: 270, y: 235, w: 22, h: 86, ax: 0, ay: 68, speed: 2.2 }]
    },
    {
      hole: 8, name: 'Pinball Parlor', par: 3,
      tee: { x: 92, y: 277 }, cup: { x: 462, y: 277 },
      walls: [],
      bumpers: [
        { x: 215, y: 175, r: 22 }, { x: 215, y: 380, r: 22 },
        { x: 295, y: 277, r: 26 },
        { x: 375, y: 175, r: 22 }, { x: 375, y: 380, r: 22 }
      ],
      sand: [], water: [], boosts: [], moving: []
    },
    {
      hole: 9, name: 'Zig-Zag Chicane', par: 3,
      tee: { x: 90, y: 130 }, cup: { x: 462, y: 425 },
      walls: [
        { x: 190, y: 68, w: 22, h: 275 },
        { x: 348, y: 210, w: 22, h: 276 }
      ],
      bumpers: [], sand: [{ x: 230, y: 390, w: 96, h: 72 }], water: [], boosts: [], moving: []
    },
    {
      hole: 10, name: 'Twin Bridges', par: 3,
      tee: { x: 92, y: 277 }, cup: { x: 462, y: 277 },
      walls: [],
      bumpers: [{ x: 280, y: 277, r: 18 }],
      sand: [],
      water: [
        { x: 210, y: 68, w: 140, h: 120 },
        { x: 210, y: 366, w: 140, h: 120 }
      ],
      boosts: [], moving: []
    },
    {
      hole: 11, name: 'Ricochet Vault', par: 3,
      tee: { x: 105, y: 420 }, cup: { x: 105, y: 135 },
      walls: [{ x: 36, y: 266, w: 340, h: 24 }],
      bumpers: [{ x: 455, y: 395, r: 25 }, { x: 455, y: 160, r: 25 }],
      sand: [], water: [], boosts: [], moving: []
    },
    {
      hole: 12, name: 'Oasis Island', par: 3,
      tee: { x: 92, y: 277 }, cup: { x: 460, y: 277 },
      walls: [{ x: 356, y: 225, w: 18, h: 104 }],
      bumpers: [],
      sand: [{ x: 385, y: 110, w: 95, h: 65 }, { x: 385, y: 380, w: 95, h: 65 }],
      water: [{ x: 185, y: 215, w: 95, h: 124 }],
      boosts: [], moving: []
    },
    {
      hole: 13, name: 'Double Pistons', par: 4,
      tee: { x: 88, y: 277 }, cup: { x: 468, y: 277 },
      walls: [],
      bumpers: [], sand: [], water: [], boosts: [],
      moving: [
        { x: 215, y: 220, w: 22, h: 110, ax: 0, ay: 95, speed: 2.5 },
        { x: 345, y: 220, w: 22, h: 110, ax: 0, ay: -95, speed: 2.5 }
      ]
    },
    {
      hole: 14, name: 'Cyber Slingshot', par: 3,
      tee: { x: 92, y: 130 }, cup: { x: 92, y: 425 },
      walls: [{ x: 36, y: 265, w: 360, h: 24 }],
      bumpers: [{ x: 468, y: 277, r: 28 }],
      sand: [],
      water: [{ x: 200, y: 289, w: 110, h: 70 }],
      boosts: [{ x: 210, y: 104, w: 120, h: 52, vx: 420, vy: 0 }],
      moving: []
    },
    {
      hole: 15, name: 'Sand Castle Labyrinth', par: 4,
      tee: { x: 90, y: 425 }, cup: { x: 462, y: 130 },
      walls: [
        { x: 175, y: 200, w: 20, h: 286 },
        { x: 330, y: 68, w: 20, h: 280 }
      ],
      bumpers: [{ x: 255, y: 145, r: 20 }, { x: 255, y: 405, r: 20 }],
      sand: [{ x: 80, y: 120, w: 75, h: 110 }, { x: 380, y: 340, w: 110, h: 100 }],
      water: [], boosts: [], moving: []
    },
    {
      hole: 16, name: 'Water Gauntlet', par: 3,
      tee: { x: 88, y: 277 }, cup: { x: 468, y: 277 },
      walls: [],
      bumpers: [{ x: 278, y: 140, r: 20 }, { x: 278, y: 414, r: 20 }],
      sand: [],
      water: [{ x: 195, y: 195, w: 166, h: 164 }],
      boosts: [], moving: []
    },
    {
      hole: 17, name: 'Bumper Crossfire', par: 4,
      tee: { x: 88, y: 125 }, cup: { x: 466, y: 430 },
      walls: [{ x: 268, y: 215, w: 24, h: 124 }],
      bumpers: [
        { x: 185, y: 210, r: 20 }, { x: 375, y: 210, r: 20 },
        { x: 185, y: 345, r: 20 }, { x: 375, y: 345, r: 20 }
      ],
      sand: [{ x: 360, y: 100, w: 120, h: 70 }],
      water: [{ x: 75, y: 350, w: 95, h: 105 }],
      boosts: [],
      moving: [{ x: 268, y: 115, w: 24, h: 65, ax: 65, ay: 0, speed: 2.3 }]
    },
    {
      hole: 18, name: 'Neon Fortress', par: 4,
      tee: { x: 92, y: 277 }, cup: { x: 450, y: 277 },
      walls: [
        { x: 365, y: 175, w: 20, h: 72 },
        { x: 365, y: 307, w: 20, h: 72 },
        { x: 365, y: 175, w: 125, h: 18 },
        { x: 365, y: 361, w: 125, h: 18 }
      ],
      bumpers: [{ x: 225, y: 200, r: 22 }, { x: 225, y: 354, r: 22 }],
      sand: [],
      water: [{ x: 140, y: 68, w: 95, h: 70 }, { x: 140, y: 416, w: 95, h: 70 }],
      boosts: [],
      moving: [{ x: 332, y: 248, w: 18, h: 58, ax: 0, ay: 52, speed: 2.6 }]
    },
    {
      hole: 19, name: 'Velocity Canyon', par: 4,
      tee: { x: 88, y: 430 }, cup: { x: 465, y: 125 },
      walls: [
        { x: 165, y: 170, w: 20, h: 316 },
        { x: 290, y: 68, w: 20, h: 300 },
        { x: 400, y: 185, w: 20, h: 301 }
      ],
      bumpers: [{ x: 230, y: 120, r: 18 }, { x: 355, y: 425, r: 18 }],
      sand: [], water: [],
      boosts: [{ x: 64, y: 220, w: 80, h: 90, vx: 0, vy: -360 }],
      moving: []
    },
    {
      hole: 20, name: 'Championship Finale', par: 5,
      tee: { x: 86, y: 277 }, cup: { x: 472, y: 277 },
      walls: [
        { x: 185, y: 68, w: 20, h: 155 },
        { x: 185, y: 330, w: 20, h: 156 },
        { x: 365, y: 165, w: 20, h: 224 }
      ],
      bumpers: [{ x: 278, y: 155, r: 22 }, { x: 278, y: 398, r: 22 }],
      sand: [{ x: 235, y: 242, w: 86, h: 70 }],
      water: [{ x: 395, y: 68, w: 129, h: 68 }, { x: 395, y: 418, w: 129, h: 68 }],
      boosts: [],
      moving: [{ x: 185, y: 245, w: 20, h: 64, ax: 0, ay: 45, speed: 2.8 }]
    }
  ];

  root.MPA_GAME_SHELL.registerEngine('mini-golf-crazy', function (api) {
    const canvas = api.canvas;
    const ctx = canvas.getContext('2d');

    let rafId = null;
    let lastTime = 0;

    let levelIdx = 0;
    let ball = { x: 100, y: 277, vx: 0, vy: 0, r: 10, safeX: 100, safeY: 277 };
    let strokesThisHole = 0;
    let totalStrokes = 0;
    let aiming = false;
    let dragStart = { x: 0, y: 0 };
    let dragCurr = { x: 0, y: 0 };
    let holeBanner = null; // { title, sub, timer }
    let particles = [];
    let movePhase = 0;

    function resizeCanvas() {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function getProgressData() {
      return api.getProgress({
        unlockedHole: 1,
        holeInOne: false
      });
    }

    function loadHole(idx) {
      levelIdx = Math.max(0, Math.min(COURSES.length - 1, idx));
      const c = COURSES[levelIdx];
      ball = {
        x: c.tee.x,
        y: c.tee.y,
        vx: 0,
        vy: 0,
        r: 10,
        safeX: c.tee.x,
        safeY: c.tee.y
      };
      strokesThisHole = 0;
      aiming = false;
      holeBanner = null;
      particles = [];
    }

    function resetCourse() {
      totalStrokes = 0;
      loadHole(0);
    }

    function isBallStopped() {
      return (ball.vx * ball.vx + ball.vy * ball.vy) < 9;
    }

    function spawnParticles(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 45 + Math.random() * 145;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          r: 2.5 + Math.random() * 2.5,
          color: color,
          alpha: 1
        });
      }
    }

    function resolveRectBounce(rect) {
      const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
      const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;
      const distSq = dx * dx + dy * dy;
      if (distSq >= ball.r * ball.r) return;

      const dist = Math.sqrt(distSq);
      if (dist < 0.001) {
        // Ball center inside rect -> push out nearest edge
        const leftPen = Math.abs(ball.x - rect.x);
        const rightPen = Math.abs(rect.x + rect.w - ball.x);
        const topPen = Math.abs(ball.y - rect.y);
        const botPen = Math.abs(rect.y + rect.h - ball.y);
        const m = Math.min(leftPen, rightPen, topPen, botPen);
        if (m === leftPen) { ball.x = rect.x - ball.r; ball.vx = -Math.abs(ball.vx) * 0.82; }
        else if (m === rightPen) { ball.x = rect.x + rect.w + ball.r; ball.vx = Math.abs(ball.vx) * 0.82; }
        else if (m === topPen) { ball.y = rect.y - ball.r; ball.vy = -Math.abs(ball.vy) * 0.82; }
        else { ball.y = rect.y + rect.h + ball.r; ball.vy = Math.abs(ball.vy) * 0.82; }
        return;
      }

      const nx = dx / dist;
      const ny = dy / dist;
      ball.x += nx * (ball.r - dist);
      ball.y += ny * (ball.r - dist);

      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        ball.vx = (ball.vx - 2 * dot * nx) * 0.84;
        ball.vy = (ball.vy - 2 * dot * ny) * 0.84;
        api.playSound('click');
      }
    }

    function onCupSunk() {
      const course = COURSES[levelIdx];
      ball.vx = 0;
      ball.vy = 0;
      ball.x = course.cup.x;
      ball.y = course.cup.y;

      const diff = strokesThisHole - course.par;
      let callout = 'PAR';
      let pts = 80;
      if (strokesThisHole === 1) {
        callout = '⛳ HOLE-IN-ONE!';
        pts = 220;
        api.saveProgress({ holeInOne: true });
        api.unlockAchievement('hole_in_one');
      } else if (diff <= -2) {
        callout = '🦅 EAGLE!';
        pts = 175;
      } else if (diff === -1) {
        callout = '🐦 BIRDIE!';
        pts = 130;
      } else if (diff === 0) {
        callout = '✨ PAR!';
        pts = 95;
      } else if (diff === 1) {
        callout = 'BOGEY';
        pts = 60;
      } else {
        callout = '+' + diff + ' STROKES';
        pts = 35;
      }

      api.addScore(pts);
      api.playSound('win');
      spawnParticles(course.cup.x, course.cup.y, '#34d399', 24);

      const prog = getProgressData();
      if (levelIdx + 2 > (prog.unlockedHole || 1)) {
        api.saveProgress({ unlockedHole: Math.min(COURSES.length, levelIdx + 2) });
      }

      holeBanner = {
        title: callout + ' (+' + pts + ')',
        sub: levelIdx < COURSES.length - 1 ? 'Advancing to Hole ' + (levelIdx + 2) + '...' : 'All 20 Courses Complete!',
        timer: 1.55
      };
    }

    function strikeBall(vx, vy) {
      if (!api.isRunning() || holeBanner || !isBallStopped()) return;
      const mag = Math.hypot(vx, vy);
      if (mag < 25) return;
      ball.safeX = ball.x;
      ball.safeY = ball.y;
      ball.vx = vx;
      ball.vy = vy;
      strokesThisHole += 1;
      totalStrokes += 1;
      api.playSound('putt');
    }

    function update(dt) {
      movePhase += dt;

      if (holeBanner) {
        holeBanner.timer -= dt;
        if (holeBanner.timer <= 0) {
          holeBanner = null;
          if (levelIdx < COURSES.length - 1) {
            loadHole(levelIdx + 1);
          } else {
            api.gameOver({
              won: true,
              summary: 'Completed all 20 Holes in ' + totalStrokes + ' strokes!'
            });
          }
        }
      }

      const course = COURSES[levelIdx];
      const SUBSTEPS = 5;
      const subDt = dt / SUBSTEPS;

      for (let s = 0; s < SUBSTEPS; s++) {
        if (holeBanner) break;

        // Check sand drag vs normal turf drag
        let inSand = false;
        for (let i = 0; i < course.sand.length; i++) {
          const sd = course.sand[i];
          if (ball.x > sd.x && ball.x < sd.x + sd.w && ball.y > sd.y && ball.y < sd.y + sd.h) {
            inSand = true;
            break;
          }
        }

        // Boost pads
        for (let i = 0; i < course.boosts.length; i++) {
          const bs = course.boosts[i];
          if (ball.x > bs.x && ball.x < bs.x + bs.w && ball.y > bs.y && ball.y < bs.y + bs.h) {
            ball.vx += bs.vx * subDt * 3.5;
            ball.vy += bs.vy * subDt * 3.5;
          }
        }

        const frictionPerSec = inSand ? 4.4 : 1.38;
        const damp = Math.max(0, 1 - frictionPerSec * subDt);
        ball.vx *= damp;
        ball.vy *= damp;

        if (Math.hypot(ball.vx, ball.vy) < 8) {
          ball.vx = 0;
          ball.vy = 0;
        }

        ball.x += ball.vx * subDt;
        ball.y += ball.vy * subDt;

        // Outer course rails
        if (ball.x - ball.r < PLAY.left) {
          ball.x = PLAY.left + ball.r;
          ball.vx = Math.abs(ball.vx) * 0.85;
        } else if (ball.x + ball.r > PLAY.right) {
          ball.x = PLAY.right - ball.r;
          ball.vx = -Math.abs(ball.vx) * 0.85;
        }
        if (ball.y - ball.r < PLAY.top) {
          ball.y = PLAY.top + ball.r;
          ball.vy = Math.abs(ball.vy) * 0.85;
        } else if (ball.y + ball.r > PLAY.bottom) {
          ball.y = PLAY.bottom - ball.r;
          ball.vy = -Math.abs(ball.vy) * 0.85;
        }

        // Static walls
        for (let i = 0; i < course.walls.length; i++) {
          resolveRectBounce(course.walls[i]);
        }

        // Moving gates
        for (let i = 0; i < course.moving.length; i++) {
          const mv = course.moving[i];
          const dynRect = {
            x: mv.x + Math.sin(movePhase * mv.speed) * mv.ax,
            y: mv.y + Math.sin(movePhase * mv.speed) * mv.ay,
            w: mv.w,
            h: mv.h
          };
          resolveRectBounce(dynRect);
        }

        // Round neon bumpers
        for (let i = 0; i < course.bumpers.length; i++) {
          const bm = course.bumpers[i];
          const dx = ball.x - bm.x;
          const dy = ball.y - bm.y;
          const dist = Math.hypot(dx, dy);
          const minD = ball.r + bm.r;
          if (dist < minD && dist > 0.001) {
            const nx = dx / dist;
            const ny = dy / dist;
            ball.x = bm.x + nx * minD;
            ball.y = bm.y + ny * minD;
            const speedOut = Math.max(250, Math.hypot(ball.vx, ball.vy) * 1.15);
            ball.vx = nx * speedOut;
            ball.vy = ny * speedOut;
            api.playSound('pop');
            spawnParticles(bm.x + nx * bm.r, bm.y + ny * bm.r, '#c084fc', 8);
          }
        }

        // Water hazard check
        for (let i = 0; i < course.water.length; i++) {
          const wt = course.water[i];
          if (ball.x > wt.x && ball.x < wt.x + wt.w && ball.y > wt.y && ball.y < wt.y + wt.h) {
            spawnParticles(ball.x, ball.y, '#38bdf8', 16);
            api.playSound('wrong');
            strokesThisHole += 1; // +1 hazard stroke penalty
            totalStrokes += 1;
            ball.x = ball.safeX;
            ball.y = ball.safeY;
            ball.vx = 0;
            ball.vy = 0;
            break;
          }
        }

        // Cup capture check
        const cupDx = course.cup.x - ball.x;
        const cupDy = course.cup.y - ball.y;
        const cupDist = Math.hypot(cupDx, cupDy);
        const speedNow = Math.hypot(ball.vx, ball.vy);
        if (cupDist < 15 && speedNow < 420) {
          onCupSunk();
          break;
        } else if (cupDist < 21) {
          // Gentle lip gravity pull
          ball.vx += (cupDx / Math.max(1, cupDist)) * 220 * subDt;
          ball.vy += (cupDy / Math.max(1, cupDist)) * 220 * subDt;
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= 2.1 * dt;
        if (p.alpha <= 0) particles.splice(i, 1);
      }
    }

    function render() {
      ctx.fillStyle = '#051516';
      ctx.fillRect(0, 0, W, H);

      const course = COURSES[levelIdx];

      // Top Course Header Bar
      ctx.fillStyle = 'rgba(8, 22, 26, 0.9)';
      ctx.fillRect(PLAY.left, 14, PLAY.right - PLAY.left, 42);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(PLAY.left, 14, PLAY.right - PLAY.left, 42);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('HOLE ' + course.hole + '/20: ' + course.name.toUpperCase(), PLAY.left + 12, 40);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#6ee7b7';
      ctx.font = '800 13px monospace';
      ctx.fillText('PAR ' + course.par + ' • SHOTS ' + strokesThisHole, PLAY.right - 96, 40);

      // Prev / Next Hole selector buttons for unlocked holes
      ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.fillRect(PLAY.right - 82, 20, 34, 30);
      ctx.fillRect(PLAY.right - 42, 20, 34, 30);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('◀', PLAY.right - 65, 40);
      ctx.fillText('▶', PLAY.right - 25, 40);

      // Fairway Turf with Subtle Checker Pattern
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(PLAY.left, PLAY.top, PLAY.right - PLAY.left, PLAY.bottom - PLAY.top);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      const tile = 34;
      for (let y = PLAY.top; y < PLAY.bottom; y += tile) {
        for (let x = PLAY.left; x < PLAY.right; x += tile) {
          if ((Math.floor((x - PLAY.left) / tile) + Math.floor((y - PLAY.top) / tile)) % 2 === 0) {
            ctx.fillRect(x, y, Math.min(tile, PLAY.right - x), Math.min(tile, PLAY.bottom - y));
          }
        }
      }

      // Sand traps
      course.sand.forEach(function (sd) {
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(sd.x, sd.y, sd.w, sd.h);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(sd.x, sd.y, sd.w, sd.h);
      });

      // Water hazards
      course.water.forEach(function (wt) {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(wt.x, wt.y, wt.w, wt.h);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(wt.x, wt.y, wt.w, wt.h);
      });

      // Boost pads
      course.boosts.forEach(function (bs) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
        ctx.fillRect(bs.x, bs.y, bs.w, bs.h);
        ctx.strokeStyle = '#22d3ee';
        ctx.strokeRect(bs.x, bs.y, bs.w, bs.h);
        ctx.fillStyle = '#67e8f9';
        ctx.font = '800 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(bs.vx !== 0 ? '>>>' : '▲▲▲', bs.x + bs.w / 2, bs.y + bs.h / 2 + 5);
      });

      // Static walls
      course.walls.forEach(function (wl) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(wl.x, wl.y, wl.w, wl.h);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(wl.x, wl.y, wl.w, wl.h);
      });

      // Moving gates
      course.moving.forEach(function (mv) {
        const mx = mv.x + Math.sin(movePhase * mv.speed) * mv.ax;
        const my = mv.y + Math.sin(movePhase * mv.speed) * mv.ay;
        ctx.fillStyle = '#4c1d95';
        ctx.fillRect(mx, my, mv.w, mv.h);
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(mx, my, mv.w, mv.h);
      });

      // Bumpers
      course.bumpers.forEach(function (bm) {
        ctx.beginPath();
        ctx.arc(bm.x, bm.y, bm.r, 0, Math.PI * 2);
        ctx.fillStyle = '#7e22ce';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#e9d5ff';
        ctx.stroke();
      });

      // Outer neon fairway border
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.strokeRect(PLAY.left, PLAY.top, PLAY.right - PLAY.left, PLAY.bottom - PLAY.top);

      // Cup & Flag
      ctx.beginPath();
      ctx.arc(course.cup.x, course.cup.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#022c22';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#6ee7b7';
      ctx.stroke();

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(course.cup.x, course.cup.y);
      ctx.lineTo(course.cup.x, course.cup.y - 36);
      ctx.stroke();
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(course.cup.x, course.cup.y - 36);
      ctx.lineTo(course.cup.x + 22, course.cup.y - 28);
      ctx.lineTo(course.cup.x, course.cup.y - 20);
      ctx.closePath();
      ctx.fill();

      // Drag-to-Aim Trajectory & Power Gauge
      if (aiming && isBallStopped() && !holeBanner) {
        const pullX = dragStart.x - dragCurr.x;
        const pullY = dragStart.y - dragCurr.y;
        const rawDist = Math.hypot(pullX, pullY);
        const clamped = Math.min(155, rawDist);
        const powerRatio = clamped / 155;

        if (clamped > 6) {
          const nx = pullX / rawDist;
          const ny = pullY / rawDist;
          const gaugeColor = powerRatio < 0.45 ? '#34d399' : (powerRatio < 0.78 ? '#facc15' : '#f43f5e');

          ctx.save();
          ctx.setLineDash([6, 6]);
          ctx.strokeStyle = gaugeColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ball.x, ball.y);
          ctx.lineTo(ball.x + nx * clamped * 1.35, ball.y + ny * clamped * 1.35);
          ctx.stroke();
          ctx.restore();

          // Power label near ball
          ctx.fillStyle = gaugeColor;
          ctx.font = '800 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(Math.round(powerRatio * 100) + '%', ball.x, ball.y - 18);
        }
      } else if (isBallStopped() && !holeBanner && strokesThisHole === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DRAG BACKWARD TO AIM & PUTT', (PLAY.left + PLAY.right) / 2, PLAY.bottom - 14);
      }

      // Golf Ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#94a3b8';
      ctx.stroke();

      // Particles
      particles.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Hole Cleared Banner
      if (holeBanner) {
        ctx.fillStyle = 'rgba(6, 12, 28, 0.86)';
        ctx.fillRect(W / 2 - 170, H / 2 - 52, 340, 104);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(W / 2 - 170, H / 2 - 52, 340, 104);

        ctx.fillStyle = '#fde047';
        ctx.font = '900 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(holeBanner.title, W / 2, H / 2 - 8);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.fillText(holeBanner.sub, W / 2, H / 2 + 24);
      }
    }

    function toCanvasCoords(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * W,
        y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * H
      };
    }

    function bindInputs() {
      canvas.addEventListener('pointerdown', function (e) {
        if (!api.isRunning()) return;
        e.preventDefault();
        const pt = toCanvasCoords(e);

        // Check Prev / Next unlocked hole buttons
        if (pt.y >= 16 && pt.y <= 54) {
          const prog = getProgressData();
          const maxHoleIdx = Math.max(levelIdx, (prog.unlockedHole || 1) - 1);
          if (pt.x >= PLAY.right - 84 && pt.x <= PLAY.right - 46 && levelIdx > 0) {
            loadHole(levelIdx - 1);
            api.playSound('click');
            return;
          }
          if (pt.x >= PLAY.right - 44 && pt.x <= PLAY.right - 6 && levelIdx < maxHoleIdx) {
            loadHole(levelIdx + 1);
            api.playSound('click');
            return;
          }
        }

        if (!isBallStopped() || holeBanner) return;
        aiming = true;
        dragStart = pt;
        dragCurr = pt;
        if (canvas.setPointerCapture) {
          try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
        }
      });

      canvas.addEventListener('pointermove', function (e) {
        if (!aiming) return;
        dragCurr = toCanvasCoords(e);
      });

      canvas.addEventListener('pointerup', function (e) {
        if (!aiming) return;
        aiming = false;
        const endPt = toCanvasCoords(e);
        const pullX = dragStart.x - endPt.x;
        const pullY = dragStart.y - endPt.y;
        const dist = Math.hypot(pullX, pullY);
        if (dist > 8) {
          const clamped = Math.min(155, dist);
          const speedScale = 4.65;
          strikeBall((pullX / dist) * clamped * speedScale, (pullY / dist) * clamped * speedScale);
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
        resetCourse();
        bindInputs();
        render();
        rafId = root.requestAnimationFrame(loop);
      },
      start: function () {
        resetCourse();
        lastTime = 0;
      },
      pause: function () {
        aiming = false;
      },
      resume: function () {
        lastTime = 0;
      },
      restart: function () {
        loadHole(levelIdx);
        lastTime = 0;
      },
      destroy: function () {
        if (rafId) root.cancelAnimationFrame(rafId);
      },
      getShareSummary: function () {
        return 'Hole ' + (levelIdx + 1) + '/20 (' + totalStrokes + ' total strokes)';
      },
      getCourseCount: function () {
        return COURSES.length;
      },
      puttForTest: function (vx, vy) {
        strikeBall(vx || 480, vy || 0);
      }
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
