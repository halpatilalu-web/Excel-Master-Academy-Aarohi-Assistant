/**
 * GAME 6: DON'T FALL — Endless Sky-Bridge Runner + Cosmetic Shop Engine
 * Mechanics: Auto-running cyber bridges, abyss gaps, spike clusters, double-jump,
 * persistent coin wallet, and 6 unlockable cosmetic runner skins.
 */
(function (root) {
  'use strict';

  root.MPA_GAME_SHELL.registerEngine('dont-fall', function (api) {
    const canvas = api.canvas;
    const ctx = canvas.getContext('2d');

    const W = 580;
    const H = 500;
    const GRAVITY = 1260;

    const SKINS = [
      { id: 'cyber', name: 'Cyber Runner', cost: 0, body: '#06b6d4', rim: '#cffafe', trail: '#22d3ee' },
      { id: 'ninja', name: 'Neon Ninja', cost: 40, body: '#a855f7', rim: '#f3e8ff', trail: '#c084fc' },
      { id: 'solar', name: 'Solar Bot', cost: 90, body: '#f59e0b', rim: '#fef3c7', trail: '#fde047' },
      { id: 'frost', name: 'Frost Phantom', cost: 150, body: '#38bdf8', rim: '#ffffff', trail: '#7dd3fc' },
      { id: 'blaze', name: 'Crimson Blaze', cost: 220, body: '#f43f5e', rim: '#ffe4e6', trail: '#fb7185' },
      { id: 'galaxy', name: 'Galaxy Legend', cost: 350, body: '#10b981', rim: '#fde047', trail: '#a855f7' }
    ];

    let rafId = null;
    let lastTime = 0;

    let runner = null;
    let segments = [];
    let coins = [];
    let particles = [];
    let speed = 265;
    let distanceAccumulator = 0;
    let runCoins = 0;
    let shopOpen = false;

    function getWalletData() {
      return api.getProgress({
        coins: 0,
        unlockedSkins: ['cyber'],
        selectedSkin: 'cyber'
      });
    }

    function getActiveSkin() {
      const data = getWalletData();
      return SKINS.find(function (s) { return s.id === data.selectedSkin; }) || SKINS[0];
    }

    function resizeCanvas() {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function addBridgeSegment(prevEnd, safeIntro) {
      const gap = safeIntro ? 0 : (72 + Math.random() * 68);
      const x = prevEnd + gap;
      const w = safeIntro ? 540 : (220 + Math.random() * 210);
      const y = safeIntro ? 360 : Math.max(275, Math.min(395, 345 + (Math.random() - 0.5) * 85));

      const spikes = [];
      if (!safeIntro && w > 240 && Math.random() < 0.72) {
        const sx = x + 85 + Math.random() * (w - 155);
        spikes.push({ x: sx, count: Math.random() < 0.45 ? 2 : 1 });
      }

      segments.push({ x: x, y: y, w: w, h: 22, spikes: spikes });

      // Coins arc
      const coinCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < coinCount; i++) {
        coins.push({
          x: x + 40 + i * 34,
          y: y - 52 - Math.sin((i / Math.max(1, coinCount - 1)) * Math.PI) * 34,
          r: 10,
          taken: false
        });
      }
    }

    function resetState() {
      segments = [];
      coins = [];
      particles = [];
      addBridgeSegment(0, true);
      for (let i = 0; i < 5; i++) {
        const last = segments[segments.length - 1];
        addBridgeSegment(last.x + last.w, false);
      }

      runner = {
        x: 112,
        y: 360 - 30,
        w: 30,
        h: 30,
        vy: 0,
        jumpsUsed: 0,
        grounded: true,
        rot: 0,
        trail: []
      };

      speed = 265;
      distanceAccumulator = 0;
      runCoins = 0;
    }

    function jump() {
      if (!api.isRunning() || shopOpen || !runner) return;
      if (runner.jumpsUsed < 2) {
        runner.vy = runner.jumpsUsed === 0 ? -470 : -430;
        runner.jumpsUsed += 1;
        runner.grounded = false;
        api.playSound('jump');
        const skin = getActiveSkin();
        for (let i = 0; i < 8; i++) {
          particles.push({
            x: runner.x + runner.w / 2,
            y: runner.y + runner.h,
            vx: -60 - Math.random() * 90,
            vy: (Math.random() - 0.5) * 90,
            r: 3,
            color: skin.trail,
            alpha: 1
          });
        }
      }
    }

    function triggerFall(msg) {
      api.gameOver({
        summary: msg + ' • Coins Collected: +' + runCoins
      });
    }

    function update(dt) {
      if (shopOpen) return;

      speed = Math.min(510, speed + dt * 6.5);
      const dx = speed * dt;
      distanceAccumulator += dx * 0.08;
      if (distanceAccumulator >= 1) {
        const whole = Math.floor(distanceAccumulator);
        distanceAccumulator -= whole;
        api.addScore(whole);
      }

      // Scroll world left
      for (let i = segments.length - 1; i >= 0; i--) {
        segments[i].x -= dx;
        segments[i].spikes.forEach(function (sp) { sp.x -= dx; });
        if (segments[i].x + segments[i].w < -80) {
          segments.splice(i, 1);
        }
      }

      while (segments.length < 6) {
        const last = segments[segments.length - 1];
        addBridgeSegment(last.x + last.w, false);
      }

      for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].x -= dx;
        if (coins[i].x < -40) coins.splice(i, 1);
      }

      // Runner vertical physics
      const prevBottom = runner.y + runner.h;
      runner.vy += GRAVITY * dt;
      runner.y += runner.vy * dt;
      runner.grounded = false;

      if (runner.jumpsUsed > 0) {
        runner.rot += dt * 7.5;
      } else {
        runner.rot = 0;
      }

      // Check bridge collision
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (runner.x + runner.w > seg.x + 4 && runner.x < seg.x + seg.w - 4) {
          if (runner.vy >= 0 && prevBottom <= seg.y + 12 && runner.y + runner.h >= seg.y) {
            runner.y = seg.y - runner.h;
            runner.vy = 0;
            runner.jumpsUsed = 0;
            runner.grounded = true;
            runner.rot = 0;
          }
        }

        // Check spike hazard collision
        for (let s = 0; s < seg.spikes.length; s++) {
          const sp = seg.spikes[s];
          const spikeW = sp.count * 20;
          const spikeH = 22;
          if (
            runner.x + runner.w - 5 > sp.x &&
            runner.x + 5 < sp.x + spikeW &&
            runner.y + runner.h - 4 > seg.y - spikeH &&
            runner.y < seg.y
          ) {
            triggerFall('Hit a laser spike!');
            return;
          }
        }
      }

      // Abyss check
      if (runner.y > H + 30) {
        triggerFall('Fell off the sky-bridge!');
        return;
      }

      // Collect coins
      const cx = runner.x + runner.w / 2;
      const cy = runner.y + runner.h / 2;
      coins.forEach(function (c) {
        if (!c.taken) {
          const distSq = (cx - c.x) * (cx - c.x) + (cy - c.y) * (cy - c.y);
          if (distSq < (c.r + 18) * (c.r + 18)) {
            c.taken = true;
            runCoins += 1;
            api.addScore(15);
            api.playSound('coin');
            const wallet = getWalletData();
            api.saveProgress({ coins: (wallet.coins || 0) + 1 });
          }
        }
      });

      runner.trail.unshift({ x: runner.x, y: runner.y + runner.h / 2 });
      if (runner.trail.length > 9) runner.trail.pop();
      runner.trail.forEach(function (t) { t.x -= dx * 0.65; });

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= 2.2 * dt;
        if (p.alpha <= 0) particles.splice(i, 1);
      }
    }

    function render() {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#09091f');
      grad.addColorStop(1, '#1a0f2e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      const skin = getActiveSkin();
      const wallet = getWalletData();

      // Sky-bridges & spikes
      segments.forEach(function (seg) {
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(seg.x, seg.y, seg.w, seg.h);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(seg.x, seg.y, seg.w, seg.h);

        seg.spikes.forEach(function (sp) {
          ctx.fillStyle = '#f43f5e';
          for (let k = 0; k < sp.count; k++) {
            const bx = sp.x + k * 20;
            ctx.beginPath();
            ctx.moveTo(bx, seg.y);
            ctx.lineTo(bx + 10, seg.y - 22);
            ctx.lineTo(bx + 20, seg.y);
            ctx.closePath();
            ctx.fill();
          }
        });
      });

      // Coins
      coins.forEach(function (c) {
        if (c.taken) return;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fillStyle = '#facc15';
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Runner trail & character
      if (runner) {
        runner.trail.forEach(function (t, idx) {
          ctx.globalAlpha = (1 - idx / 10) * 0.35;
          ctx.fillStyle = skin.trail;
          ctx.fillRect(t.x, t.y - 6, 16 - idx, 12);
        });
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.translate(runner.x + runner.w / 2, runner.y + runner.h / 2);
        ctx.rotate(runner.rot);
        ctx.fillStyle = skin.body;
        ctx.fillRect(-runner.w / 2, -runner.h / 2, runner.w, runner.h);
        ctx.strokeStyle = skin.rim;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-runner.w / 2, -runner.h / 2, runner.w, runner.h);

        // Visor eyes
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(2, -7, 9, 6);
        ctx.restore();
      }

      // Particles
      particles.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Wallet & Runner Shop Button inside Top-Right of Canvas
      ctx.fillStyle = 'rgba(11, 15, 36, 0.88)';
      ctx.fillRect(14, 14, 164, 34);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(14, 14, 164, 34);
      ctx.fillStyle = '#fde047';
      ctx.font = '800 13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('🪙 WALLET: ' + (wallet.coins || 0), 24, 35);

      // Interactive Runner Shop button box
      ctx.fillStyle = 'rgba(168, 85, 247, 0.28)';
      ctx.fillRect(W - 154, 14, 140, 34);
      ctx.strokeStyle = '#c084fc';
      ctx.strokeRect(W - 154, 14, 140, 34);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎨 RUNNER SHOP', W - 84, 35);
    }

    function openShopModal() {
      shopOpen = true;
      let modal = document.getElementById('dont-fall-shop-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dont-fall-shop-modal';
        modal.className = 'modal-backdrop';
        document.body.appendChild(modal);
      }

      function renderShopContents() {
        const wallet = getWalletData();
        const unlocked = wallet.unlockedSkins || ['cyber'];
        modal.innerHTML =
          '<div class="modal-card">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
              '<h2 style="margin:0;font-size:1.3rem">🎨 Cosmetic Runner Shop</h2>' +
              '<button type="button" class="icon-btn" id="close-runner-shop">✕</button>' +
            '</div>' +
            '<p style="margin:0 0 14px;color:var(--text-secondary);font-size:0.88rem">' +
              'Your Coin Balance: <strong style="color:#fde047">🪙 ' + (wallet.coins || 0) + ' Coins</strong> (earned strictly by playing!)' +
            '</p>' +
            '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px">' +
              SKINS.map(function (sk) {
                const isOwned = unlocked.indexOf(sk.id) !== -1;
                const isSelected = wallet.selectedSkin === sk.id;
                return (
                  '<div style="padding:12px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid ' + (isSelected ? '#22d3ee' : 'rgba(255,255,255,0.12)') + '">' +
                    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
                      '<span style="width:26px;height:26px;border-radius:6px;background:' + sk.body + ';border:2px solid ' + sk.rim + ';display:inline-block"></span>' +
                      '<strong style="font-size:0.9rem">' + sk.name + '</strong>' +
                    '</div>' +
                    (isSelected
                      ? '<button type="button" class="btn btn-secondary btn-sm" style="width:100%" disabled>✓ Equipped</button>'
                      : (isOwned
                          ? '<button type="button" class="btn btn-primary btn-sm" style="width:100%" data-equip-skin="' + sk.id + '">Equip</button>'
                          : '<button type="button" class="btn btn-secondary btn-sm" style="width:100%" data-buy-skin="' + sk.id + '"' + ((wallet.coins || 0) < sk.cost ? ' disabled' : '') + '>Unlock 🪙 ' + sk.cost + '</button>')) +
                  '</div>'
                );
              }).join('') +
            '</div>' +
          '</div>';

        modal.querySelector('#close-runner-shop').addEventListener('click', function () {
          modal.classList.remove('open');
          shopOpen = false;
          lastTime = 0;
        });

        modal.querySelectorAll('[data-equip-skin]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            const sid = btn.getAttribute('data-equip-skin');
            api.saveProgress({ selectedSkin: sid });
            api.playSound('click');
            renderShopContents();
            render();
          });
        });

        modal.querySelectorAll('[data-buy-skin]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            const sid = btn.getAttribute('data-buy-skin');
            const sk = SKINS.find(function (item) { return item.id === sid; });
            const cur = getWalletData();
            if (!sk || (cur.coins || 0) < sk.cost) return;
            const nextUnlocked = (cur.unlockedSkins || ['cyber']).concat([sid]);
            api.saveProgress({
              coins: cur.coins - sk.cost,
              unlockedSkins: nextUnlocked,
              selectedSkin: sid
            });
            api.playSound('achievement');
            renderShopContents();
            render();
          });
        });
      }

      renderShopContents();
      modal.classList.add('open');
    }

    function bindInputs() {
      canvas.addEventListener('pointerdown', function (e) {
        const rect = canvas.getBoundingClientRect();
        const cx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * W;
        const cy = ((e.clientY - rect.top) / Math.max(1, rect.height)) * H;

        // Check Runner Shop button click
        if (cx >= W - 158 && cy >= 10 && cy <= 52) {
          e.preventDefault();
          openShopModal();
          return;
        }

        if (!api.isRunning()) return;
        e.preventDefault();
        jump();
      });

      root.addEventListener('keydown', function (e) {
        if (!api.isRunning() || shopOpen || e.repeat) return;
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
          e.preventDefault();
          jump();
        }
      });
    }

    function loop(ts) {
      if (!lastTime) lastTime = ts;
      const dt = Math.min(0.05, (ts - lastTime) / 1000);
      lastTime = ts;
      if (api.isRunning() && !shopOpen) {
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
        shopOpen = false;
        lastTime = 0;
      },
      pause: function () {},
      resume: function () {
        lastTime = 0;
      },
      restart: function () {
        resetState();
        shopOpen = false;
        lastTime = 0;
      },
      destroy: function () {
        if (rafId) root.cancelAnimationFrame(rafId);
      },
      getShareSummary: function () {
        return 'Skin: ' + getActiveSkin().name + ', +' + runCoins + ' coins';
      },
      triggerJump: jump,
      openShop: openShopModal
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
