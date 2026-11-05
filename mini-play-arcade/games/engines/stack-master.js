/**
 * GAME 1: STACK MASTER — Playable HTML5 Canvas Engine
 * Mechanics: Moving neon blocks, overhang slicing physics, Perfect Placement
 * shockwaves, combo multipliers, slab expansion at 4x streak, smooth camera pan.
 */
(function (root) {
  'use strict';

  root.MPA_GAME_SHELL.registerEngine('stack-master', function (api) {
    const canvas = api.canvas;
    const ctx = canvas.getContext('2d');

    const W = 480;
    const H = 580;
    const BLOCK_H = 26;
    const BASE_Y = H - 70;
    const PERFECT_TOLERANCE = 6;

    let rafId = null;
    let lastTime = 0;
    let stack = [];
    let activeBlock = null;
    let debris = [];
    let shockwaves = [];
    let floatTexts = [];
    let combo = 0;
    let maxCombo = 0;
    let level = 0;
    let cameraY = 0;
    let targetCameraY = 0;

    function resizeCanvas() {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function slabColor(idx) {
      const hue = (268 + idx * 11) % 360;
      return {
        main: 'hsl(' + hue + ', 86%, 60%)',
        top: 'hsl(' + hue + ', 92%, 72%)',
        edge: 'hsl(' + hue + ', 82%, 44%)'
      };
    }

    function resetState() {
      stack = [
        { x: (W - 220) / 2, y: BASE_Y, w: 220, h: BLOCK_H, color: slabColor(0) }
      ];
      debris = [];
      shockwaves = [];
      floatTexts = [];
      combo = 0;
      maxCombo = 0;
      level = 1;
      cameraY = 0;
      targetCameraY = 0;
      spawnNextBlock();
    }

    function spawnNextBlock() {
      const top = stack[stack.length - 1];
      const fromLeft = level % 2 === 1;
      const speed = Math.min(430, 165 + level * 9.5);
      activeBlock = {
        x: fromLeft ? -top.w + 20 : W - 20,
        y: top.y - BLOCK_H,
        w: top.w,
        h: BLOCK_H,
        vx: fromLeft ? speed : -speed,
        color: slabColor(level)
      };

      const desiredTopScreenY = H * 0.46;
      const actualTopScreenY = activeBlock.y + targetCameraY;
      if (actualTopScreenY < desiredTopScreenY) {
        targetCameraY += (desiredTopScreenY - actualTopScreenY);
      }
    }

    function dropBlock() {
      if (!api.isRunning() || !activeBlock) return;
      const prev = stack[stack.length - 1];
      const delta = activeBlock.x - prev.x;
      const absDelta = Math.abs(delta);

      if (absDelta >= activeBlock.w) {
        // Missed completely -> entire block falls as debris and triggers Game Over
        debris.push({
          x: activeBlock.x,
          y: activeBlock.y,
          w: activeBlock.w,
          h: BLOCK_H,
          vx: activeBlock.vx * 0.25,
          vy: 30,
          rot: 0,
          vrot: (delta > 0 ? 1 : -1) * 2.2,
          color: activeBlock.color
        });
        activeBlock = null;
        setTimeout(function () {
          api.gameOver({
            summary: 'Tower Height: ' + (level - 1) + ' floors • Max Combo: x' + maxCombo
          });
        }, 320);
        return;
      }

      let placedX = activeBlock.x;
      let placedW = activeBlock.w;

      if (absDelta <= PERFECT_TOLERANCE) {
        // Perfect Drop!
        placedX = prev.x;
        placedW = prev.w;
        combo += 1;
        if (combo > maxCombo) maxCombo = combo;

        // Every 4 consecutive perfects, reward slightly wider slab up to 220px
        let expanded = false;
        if (combo > 0 && combo % 4 === 0 && placedW < 220) {
          const bonusW = Math.min(16, 220 - placedW);
          placedW += bonusW;
          placedX = Math.max(24, Math.min(W - placedW - 24, placedX - bonusW / 2));
          expanded = true;
        }

        const pts = 25 + combo * 15;
        api.addScore(pts);
        api.playSound('perfect');

        shockwaves.push({
          x: placedX + placedW / 2,
          y: activeBlock.y + BLOCK_H / 2,
          w: placedW,
          alpha: 1
        });
        floatTexts.push({
          x: placedX + placedW / 2,
          y: activeBlock.y - 10,
          text: expanded ? 'PERFECT x' + combo + ' • WIDER!' : 'PERFECT x' + combo + ' (+' + pts + ')',
          color: '#fde047',
          alpha: 1
        });
      } else {
        // Slice overhanging part
        combo = 0;
        const overlapStart = Math.max(prev.x, activeBlock.x);
        const overlapEnd = Math.min(prev.x + prev.w, activeBlock.x + activeBlock.w);
        placedX = overlapStart;
        placedW = overlapEnd - overlapStart;

        const cutW = activeBlock.w - placedW;
        const cutX = delta > 0 ? overlapEnd : activeBlock.x;
        debris.push({
          x: cutX,
          y: activeBlock.y,
          w: cutW,
          h: BLOCK_H,
          vx: (delta > 0 ? 1 : -1) * 75,
          vy: -25,
          rot: 0,
          vrot: (delta > 0 ? 1 : -1) * 3.1,
          color: activeBlock.color
        });

        api.addScore(15);
        api.playSound('drop');

        if (placedW < 10) {
          stack.push({ x: placedX, y: activeBlock.y, w: placedW, h: BLOCK_H, color: activeBlock.color });
          activeBlock = null;
          api.gameOver({
            summary: 'Tower Height: ' + level + ' floors • Max Combo: x' + maxCombo
          });
          return;
        }
      }

      stack.push({
        x: placedX,
        y: activeBlock.y,
        w: placedW,
        h: BLOCK_H,
        color: activeBlock.color
      });

      level += 1;
      spawnNextBlock();
    }

    function update(dt) {
      cameraY += (targetCameraY - cameraY) * Math.min(1, dt * 7);

      if (activeBlock) {
        activeBlock.x += activeBlock.vx * dt;
        if (activeBlock.vx > 0 && activeBlock.x + activeBlock.w > W - 18) {
          activeBlock.x = W - 18 - activeBlock.w;
          activeBlock.vx *= -1;
        } else if (activeBlock.vx < 0 && activeBlock.x < 18) {
          activeBlock.x = 18;
          activeBlock.vx *= -1;
        }
      }

      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vy += 680 * dt;
        d.rot += d.vrot * dt;
        if (d.y + cameraY > H + 120) {
          debris.splice(i, 1);
        }
      }

      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.w += 220 * dt;
        sw.alpha -= 2.2 * dt;
        if (sw.alpha <= 0) shockwaves.splice(i, 1);
      }

      for (let i = floatTexts.length - 1; i >= 0; i--) {
        const ft = floatTexts[i];
        ft.y -= 44 * dt;
        ft.alpha -= 1.15 * dt;
        if (ft.alpha <= 0) floatTexts.splice(i, 1);
      }
    }

    function drawSlab(b) {
      const depth = 8;
      // Top bevel (2.5D isometric gleam)
      ctx.fillStyle = b.color.top;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + depth, b.y - depth);
      ctx.lineTo(b.x + b.w + depth, b.y - depth);
      ctx.lineTo(b.x + b.w, b.y);
      ctx.closePath();
      ctx.fill();

      // Right bevel
      ctx.fillStyle = b.color.edge;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w, b.y);
      ctx.lineTo(b.x + b.w + depth, b.y - depth);
      ctx.lineTo(b.x + b.w + depth, b.y + b.h - depth);
      ctx.lineTo(b.x + b.w, b.y + b.h);
      ctx.closePath();
      ctx.fill();

      // Front face
      ctx.fillStyle = b.color.main;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // Subtle highlight line
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    }

    function render() {
      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#090d26');
      bg.addColorStop(1, '#150d2e');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Subtle grid horizon lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      const gridOffset = (cameraY * 0.5) % 40;
      for (let y = gridOffset; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(0, cameraY);

      // Foundation pedestal
      const first = stack[0];
      if (first) {
        const pedGrad = ctx.createLinearGradient(0, first.y + BLOCK_H, 0, first.y + 130);
        pedGrad.addColorStop(0, '#1e1b4b');
        pedGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = pedGrad;
        ctx.fillRect(first.x, first.y + BLOCK_H, first.w, 120);
      }

      // Tower slabs
      for (let i = 0; i < stack.length; i++) {
        const b = stack[i];
        if (b.y + cameraY > H + 50 || b.y + cameraY < -80) continue;
        drawSlab(b);
      }

      // Active moving slab
      if (activeBlock) {
        drawSlab(activeBlock);
      }

      // Falling sliced debris
      debris.forEach(function (d) {
        ctx.save();
        ctx.translate(d.x + d.w / 2, d.y + d.h / 2);
        ctx.rotate(d.rot);
        ctx.fillStyle = d.color.main;
        ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
        ctx.restore();
      });

      // Perfect shockwaves
      shockwaves.forEach(function (sw) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 3;
        ctx.strokeRect(sw.x - sw.w / 2, sw.y - BLOCK_H / 2 - 4, sw.w, BLOCK_H + 8);
        ctx.restore();
      });

      // Floating combo labels
      floatTexts.forEach(function (ft) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = '800 15px system-ui, sans-serif';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore();

      // Top Stage Info Pill
      ctx.fillStyle = 'rgba(8, 12, 30, 0.72)';
      ctx.fillRect(14, 14, 152, 32);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.strokeRect(14, 14, 152, 32);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('FLOOR ' + Math.max(0, level - 1) + (combo > 1 ? ' • x' + combo : ''), 24, 35);
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
        dropBlock();
      });

      root.addEventListener('keydown', function (e) {
        if (!api.isRunning()) return;
        if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'Enter') {
          e.preventDefault();
          dropBlock();
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
        return (level - 1) + ' floors, x' + maxCombo + ' max combo';
      },
      // Test hook
      triggerDrop: dropBlock
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
