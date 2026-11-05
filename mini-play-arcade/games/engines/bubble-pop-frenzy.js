/**
 * GAME 8: BUBBLE POP FRENZY — Timed Cluster & Special Bubble Arcade Engine
 * Mechanics: 8x9 glowing bubble matrix, flood-fill matching cluster pops (2+),
 * up to 10x speed combo multiplier, Special Bubbles (Bomb, Laser, Prism, Chrono),
 * smooth gravity cascade, auto-shuffle deadlock guard, rich particle bursts.
 */
(function (root) {
  'use strict';

  root.MPA_GAME_SHELL.registerEngine('bubble-pop-frenzy', function (api) {
    const canvas = api.canvas;
    const ctx = canvas.getContext('2d');

    const W = 480;
    const H = 580;
    const COLS = 8;
    const ROWS = 9;
    const CELL = 50;
    const BOARD_X = (W - COLS * CELL) / 2;
    const BOARD_Y = 86;

    const BUBBLE_COLORS = [
      { fill: '#06b6d4', rim: '#a5f3fc' },
      { fill: '#a855f7', rim: '#e9d5ff' },
      { fill: '#f43f5e', rim: '#fecdd3' },
      { fill: '#10b981', rim: '#a7f3d0' },
      { fill: '#f59e0b', rim: '#fde68a' }
    ];

    let rafId = null;
    let lastTime = 0;

    let grid = []; // grid[r][c] = { colorIdx, special: null|'bomb'|'laser'|'prism'|'chrono', yOffset: 0 }
    let particles = [];
    let rings = [];
    let popups = [];
    let timeRemaining = 60;
    let combo = 0;
    let maxCombo = 0;
    let comboDecay = 0;
    let totalPopped = 0;

    function resizeCanvas() {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeBubble(allowSpecial) {
      let special = null;
      if (allowSpecial) {
        const roll = Math.random();
        if (roll < 0.025) special = 'bomb';
        else if (roll < 0.045) special = 'laser';
        else if (roll < 0.06) special = 'prism';
        else if (roll < 0.08) special = 'chrono';
      }
      return {
        colorIdx: Math.floor(Math.random() * BUBBLE_COLORS.length),
        special: special,
        yOffset: 0
      };
    }

    function buildBoard() {
      grid = [];
      for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
          row.push(makeBubble(false));
        }
        grid.push(row);
      }
      ensureHasMove();
    }

    function hasValidMove() {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const b = grid[r][c];
          if (!b) continue;
          if (b.special) return true;
          if (r + 1 < ROWS && grid[r + 1][c] && grid[r + 1][c].colorIdx === b.colorIdx) return true;
          if (c + 1 < COLS && grid[r][c + 1] && grid[r][c + 1].colorIdx === b.colorIdx) return true;
        }
      }
      return false;
    }

    function ensureHasMove() {
      if (hasValidMove()) return;
      // Shuffle colors cleanly and inject a matching pair
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          grid[r][c].colorIdx = Math.floor(Math.random() * BUBBLE_COLORS.length);
        }
      }
      grid[4][3].colorIdx = grid[4][4].colorIdx;
    }

    function resetState() {
      particles = [];
      rings = [];
      popups = [];
      timeRemaining = 60;
      combo = 0;
      maxCombo = 0;
      comboDecay = 0;
      totalPopped = 0;
      buildBoard();
    }

    function cellCenter(r, c) {
      return {
        x: BOARD_X + c * CELL + CELL / 2,
        y: BOARD_Y + r * CELL + CELL / 2
      };
    }

    function spawnBubblePopParticles(r, c, colorHex) {
      const pt = cellCenter(r, c);
      rings.push({ x: pt.x, y: pt.y, rad: 8, color: colorHex, alpha: 0.9 });
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 55 + Math.random() * 135;
        particles.push({
          x: pt.x,
          y: pt.y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          r: 2.5 + Math.random() * 2.8,
          color: colorHex,
          alpha: 1
        });
      }
    }

    function findCluster(startR, startC) {
      const target = grid[startR][startC];
      if (!target) return [];
      const visited = {};
      const queue = [[startR, startC]];
      const cluster = [];
      visited[startR + ',' + startC] = true;

      while (queue.length > 0) {
        const cur = queue.shift();
        const r = cur[0];
        const c = cur[1];
        cluster.push([r, c]);

        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (let d = 0; d < dirs.length; d++) {
          const nr = r + dirs[d][0];
          const nc = c + dirs[d][1];
          const key = nr + ',' + nc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[key]) {
            const nb = grid[nr][nc];
            if (nb && nb.colorIdx === target.colorIdx) {
              visited[key] = true;
              queue.push([nr, nc]);
            }
          }
        }
      }
      return cluster;
    }

    function collapseAndRefill(spawnSpecialType, anchorR, anchorC) {
      for (let c = 0; c < COLS; c++) {
        const writeRows = [];
        for (let r = ROWS - 1; r >= 0; r--) {
          if (grid[r][c]) {
            writeRows.push({ bubble: grid[r][c], fromR: r });
          }
        }

        let idx = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (idx < writeRows.length) {
            const item = writeRows[idx++];
            const dropDist = (r - item.fromR) * CELL;
            item.bubble.yOffset = Math.min(0, item.bubble.yOffset - dropDist);
            grid[r][c] = item.bubble;
          } else {
            const fresh = makeBubble(true);
            fresh.yOffset = -((idx - writeRows.length + 2) * CELL);
            idx++;
            grid[r][c] = fresh;
          }
        }
      }

      if (spawnSpecialType && grid[anchorR] && grid[anchorR][anchorC]) {
        grid[anchorR][anchorC].special = spawnSpecialType;
      }

      ensureHasMove();
    }

    function popCoordinates(coords, labelPrefix, rOrigin, cOrigin) {
      if (!coords.length) return;
      const unique = {};
      const list = [];
      coords.forEach(function (pair) {
        const key = pair[0] + ',' + pair[1];
        if (!unique[key] && grid[pair[0]] && grid[pair[0]][pair[1]]) {
          unique[key] = true;
          list.push(pair);
        }
      });

      if (!list.length) return;

      combo = comboDecay > 0 ? Math.min(10, combo + 1) : 1;
      if (combo > maxCombo) maxCombo = combo;
      comboDecay = 1.65;

      let extraSeconds = 0;
      list.forEach(function (pair) {
        const r = pair[0];
        const c = pair[1];
        const b = grid[r][c];
        if (b && b.special === 'chrono') {
          extraSeconds += 5;
        }
        const colHex = b ? BUBBLE_COLORS[b.colorIdx].fill : '#22d3ee';
        spawnBubblePopParticles(r, c, colHex);
        grid[r][c] = null;
      });

      if (extraSeconds > 0) {
        timeRemaining = Math.min(90, timeRemaining + extraSeconds);
      }

      totalPopped += list.length;
      const basePts = list.length * list.length * 10;
      const gained = Math.round(basePts * (1 + (combo - 1) * 0.25));
      api.addScore(gained);
      api.playSound(combo >= 3 || list.length >= 5 ? 'combo' : 'pop');

      // Reward large clusters with a fresh special bubble!
      let rewardSpecial = null;
      if (!labelPrefix) {
        if (list.length >= 8) rewardSpecial = 'prism';
        else if (list.length >= 6) rewardSpecial = 'bomb';
        else if (list.length >= 5) rewardSpecial = 'laser';
      }

      const center = cellCenter(rOrigin, cOrigin);
      const txt = (labelPrefix ? labelPrefix + ' ' : '') + '+' + gained +
        (combo > 1 ? ' x' + combo : '') +
        (extraSeconds > 0 ? ' (+' + extraSeconds + 's!)' : '');
      popups.push({ x: center.x, y: center.y, text: txt, color: combo >= 3 ? '#fde047' : '#ffffff', alpha: 1 });

      collapseAndRefill(rewardSpecial, rOrigin, cOrigin);
    }

    function handleCellTap(r, c) {
      if (!api.isRunning()) return;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
      const cell = grid[r][c];
      if (!cell) return;

      if (cell.special === 'bomb') {
        const blast = [];
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) blast.push([nr, nc]);
          }
        }
        popCoordinates(blast, '💥 BLAST', r, c);
        return;
      }

      if (cell.special === 'laser') {
        const rowCoords = [];
        for (let cc = 0; cc < COLS; cc++) rowCoords.push([r, cc]);
        popCoordinates(rowCoords, '⚡ LASER', r, c);
        return;
      }

      if (cell.special === 'prism') {
        const targetCol = cell.colorIdx;
        const wipe = [];
        for (let rr = 0; rr < ROWS; rr++) {
          for (let cc = 0; cc < COLS; cc++) {
            if (grid[rr][cc] && grid[rr][cc].colorIdx === targetCol) wipe.push([rr, cc]);
          }
        }
        popCoordinates(wipe, '🌈 PRISM', r, c);
        return;
      }

      if (cell.special === 'chrono') {
        const cluster = findCluster(r, c);
        popCoordinates(cluster.length >= 2 ? cluster : [[r, c]], '⏱️ +5s', r, c);
        return;
      }

      const cluster = findCluster(r, c);
      if (cluster.length < 2) {
        api.playSound('wrong');
        return;
      }
      popCoordinates(cluster, '', r, c);
    }

    function update(dt) {
      timeRemaining -= dt;
      if (timeRemaining <= 0) {
        timeRemaining = 0;
        api.gameOver({
          won: true,
          summary: totalPopped + ' bubbles popped • Max Combo x' + maxCombo
        });
        return;
      }

      if (comboDecay > 0) {
        comboDecay -= dt;
        if (comboDecay <= 0) combo = 0;
      }

      // Animate falling yOffsets
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const b = grid[r][c];
          if (b && b.yOffset < 0) {
            b.yOffset = Math.min(0, b.yOffset + 560 * dt);
          }
        }
      }

      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].rad += 140 * dt;
        rings[i].alpha -= 2.6 * dt;
        if (rings[i].alpha <= 0) rings.splice(i, 1);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 260 * dt;
        p.alpha -= 2.2 * dt;
        if (p.alpha <= 0) particles.splice(i, 1);
      }

      for (let i = popups.length - 1; i >= 0; i--) {
        const pop = popups[i];
        pop.y -= 42 * dt;
        pop.alpha -= 1.15 * dt;
        if (pop.alpha <= 0) popups.splice(i, 1);
      }
    }

    function render() {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#061426');
      grad.addColorStop(1, '#100c29');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Top Timer & Frenzy Bar
      ctx.fillStyle = 'rgba(11, 16, 38, 0.85)';
      ctx.fillRect(BOARD_X, 16, COLS * CELL, 52);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(BOARD_X, 16, COLS * CELL, 52);

      ctx.fillStyle = timeRemaining <= 10 ? '#fb7185' : '#67e8f9';
      ctx.font = '900 18px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('⏱ ' + Math.ceil(timeRemaining) + 's', BOARD_X + 14, 43);

      ctx.textAlign = 'right';
      ctx.fillStyle = combo >= 2 ? '#fde047' : '#94a3b8';
      ctx.font = '800 15px monospace';
      ctx.fillText(combo >= 2 ? 'FRENZY x' + combo : 'POP 2+ MATCHING', BOARD_X + COLS * CELL - 14, 43);

      // Timer progress line
      const pct = Math.max(0, Math.min(1, timeRemaining / 60));
      ctx.fillStyle = timeRemaining <= 10 ? '#f43f5e' : '#22d3ee';
      ctx.fillRect(BOARD_X + 2, 62, (COLS * CELL - 4) * pct, 4);

      // Board Backdrop
      ctx.fillStyle = 'rgba(15, 23, 52, 0.6)';
      ctx.fillRect(BOARD_X - 4, BOARD_Y - 4, COLS * CELL + 8, ROWS * CELL + 8);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.32)';
      ctx.strokeRect(BOARD_X - 4, BOARD_Y - 4, COLS * CELL + 8, ROWS * CELL + 8);

      // Bubbles
      ctx.save();
      ctx.beginPath();
      ctx.rect(BOARD_X - 2, BOARD_Y - 2, COLS * CELL + 4, ROWS * CELL + 4);
      ctx.clip();

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const b = grid[r][c];
          if (!b) continue;
          const pt = cellCenter(r, c);
          const cy = pt.y + b.yOffset;
          const col = BUBBLE_COLORS[b.colorIdx];
          const rad = 20.5;

          ctx.beginPath();
          ctx.arc(pt.x, cy, rad, 0, Math.PI * 2);
          ctx.fillStyle = col.fill;
          ctx.globalAlpha = 0.85;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.lineWidth = b.special ? 3 : 2;
          ctx.strokeStyle = b.special ? '#ffffff' : col.rim;
          ctx.stroke();

          // Glossy bubble shine
          ctx.beginPath();
          ctx.arc(pt.x - 6, cy - 7, 5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fill();

          if (b.special) {
            ctx.font = '17px system-ui, sans-serif';
            ctx.textAlign = 'center';
            const icon = b.special === 'bomb'
              ? '💥'
              : (b.special === 'laser' ? '⚡' : (b.special === 'prism' ? '🌈' : '⏱️'));
            ctx.fillText(icon, pt.x, cy + 6);
          }
        }
      }
      ctx.restore();

      // Expanding pop rings
      rings.forEach(function (rg) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, rg.alpha);
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, rg.rad, 0, Math.PI * 2);
        ctx.strokeStyle = rg.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      });

      // Droplet particles
      particles.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Score popups
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

    function bindInputs() {
      canvas.addEventListener('pointerdown', function (e) {
        if (!api.isRunning()) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * W;
        const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * H;
        const c = Math.floor((x - BOARD_X) / CELL);
        const r = Math.floor((y - BOARD_Y) / CELL);
        handleCellTap(r, c);
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
        return totalPopped + ' bubbles popped, x' + maxCombo + ' combo';
      },
      // Test hook: find and pop first valid cluster
      popAnyValidMove: function () {
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const b = grid[r][c];
            if (b && (b.special || findCluster(r, c).length >= 2)) {
              handleCellTap(r, c);
              return true;
            }
          }
        }
        return false;
      }
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
