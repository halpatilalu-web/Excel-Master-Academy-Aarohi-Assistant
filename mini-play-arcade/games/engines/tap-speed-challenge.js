/**
 * GAME 4: TAP SPEED CHALLENGE — Millisecond Reaction Speed Engine
 * Mechanics: 5-round reflex test, randomized start delays, false-start guard,
 * millisecond precision via performance.now(), personal best ms & arcade points.
 */
(function (root) {
  'use strict';

  root.MPA_GAME_SHELL.registerEngine('tap-speed-challenge', function (api) {
    const canvas = api.canvas;
    const ctx = canvas.getContext('2d');

    const W = 520;
    const H = 540;
    const TOTAL_ROUNDS = 5;

    let rafId = null;
    let lastTime = 0;

    // States: 'idle' | 'waiting' | 'signal' | 'false-start' | 'round-result' | 'finished'
    let phase = 'idle';
    let roundIndex = 0; // 0..4
    let roundTimes = [];
    let falseStarts = 0;
    let waitRemaining = 0;
    let signalStartPerf = 0;
    let lastReactionMs = 0;
    let pulse = 0;

    function nowPerf() {
      return (root.performance && typeof root.performance.now === 'function')
        ? root.performance.now()
        : Date.now();
    }

    function resizeCanvas() {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function armRound() {
      phase = 'waiting';
      waitRemaining = 1.35 + Math.random() * 2.65;
    }

    function resetMatch() {
      roundIndex = 0;
      roundTimes = [];
      falseStarts = 0;
      lastReactionMs = 0;
      armRound();
    }

    function scoreForMs(ms) {
      // 150ms -> ~410 pts, 220ms -> ~312 pts, 300ms -> ~200 pts, 450ms -> ~80 pts
      return Math.max(40, Math.round(620 - ms * 1.4));
    }

    function rankTitle(avgMs) {
      if (avgMs < 185) return '⚡ CYBERNETIC REFLEX';
      if (avgMs < 220) return '🏆 ESPORTS PRO';
      if (avgMs < 260) return '🔥 RAZOR SHARP';
      if (avgMs < 315) return '✨ SOLID GAMER';
      return '🎯 WARMING UP';
    }

    function handleTap() {
      if (!api.isRunning()) return;

      if (phase === 'waiting') {
        falseStarts += 1;
        phase = 'false-start';
        api.playSound('wrong');
        return;
      }

      if (phase === 'false-start') {
        armRound();
        api.playSound('click');
        return;
      }

      if (phase === 'signal') {
        const elapsed = Math.max(18, Math.round(nowPerf() - signalStartPerf));
        lastReactionMs = elapsed;
        roundTimes.push(elapsed);

        const roundPts = scoreForMs(elapsed);
        api.addScore(roundPts);
        api.playSound(elapsed < 230 ? 'perfect' : 'pop');

        // Persist personal best fastest single tap & average
        const prog = api.getProgress({ bestSingleMs: null, bestAvgMs: null });
        if (!prog.bestSingleMs || elapsed < prog.bestSingleMs) {
          prog.bestSingleMs = elapsed;
          api.saveProgress({ bestSingleMs: elapsed });
        }

        if (roundTimes.length >= TOTAL_ROUNDS) {
          phase = 'finished';
          const sum = roundTimes.reduce(function (a, b) { return a + b; }, 0);
          const avg = Math.round(sum / TOTAL_ROUNDS);
          const updatedProg = api.getProgress({ bestSingleMs: elapsed, bestAvgMs: null });
          const patch = {};
          if (!updatedProg.bestAvgMs || avg < updatedProg.bestAvgMs) {
            patch.bestAvgMs = avg;
          }
          if (!updatedProg.bestSingleMs || elapsed < updatedProg.bestSingleMs) {
            patch.bestSingleMs = elapsed;
          }
          api.saveProgress(patch);
          if (avg < 250) {
            api.unlockAchievement('lightning_reflex');
          }

          setTimeout(function () {
            api.gameOver({
              won: true,
              summary: '5-Round Average: ' + avg + ' ms • ' + rankTitle(avg)
            });
          }, 550);
        } else {
          phase = 'round-result';
        }
        return;
      }

      if (phase === 'round-result') {
        roundIndex += 1;
        armRound();
        api.playSound('click');
      }
    }

    function update(dt) {
      pulse += dt * 4;
      if (phase === 'waiting') {
        waitRemaining -= dt;
        if (waitRemaining <= 0) {
          phase = 'signal';
          signalStartPerf = nowPerf();
        }
      }
    }

    function render() {
      let bgTop = '#0c122b';
      let bgBot = '#10193d';
      let ringColor = '#38bdf8';
      let headline = 'GET READY';
      let subline = 'Tap or press Space when the arena flashes GREEN';
      let centerIcon = '⏱️';

      if (phase === 'waiting') {
        bgTop = '#3b0a1e';
        bgBot = '#1f0814';
        ringColor = '#f43f5e';
        headline = 'WAIT FOR GREEN...';
        subline = 'Hold steady! Do not tap yet.';
        centerIcon = '🛑';
      } else if (phase === 'signal') {
        bgTop = '#064e3b';
        bgBot = '#047857';
        ringColor = '#34d399';
        headline = 'TAP NOW!';
        subline = 'Click, Tap, or Press Spacebar immediately!';
        centerIcon = '⚡';
      } else if (phase === 'false-start') {
        bgTop = '#451a03';
        bgBot = '#291002';
        ringColor = '#f59e0b';
        headline = 'TOO SOON!';
        subline = 'You tapped before the green flash. Tap to retry Round ' + (roundIndex + 1) + '.';
        centerIcon = '⚠️';
      } else if (phase === 'round-result') {
        bgTop = '#0f172a';
        bgBot = '#1e1b4b';
        ringColor = '#22d3ee';
        headline = lastReactionMs + ' ms';
        subline = 'Tap or press Space to start Round ' + (roundIndex + 2) + ' of ' + TOTAL_ROUNDS;
        centerIcon = '🎯';
      } else if (phase === 'finished') {
        const avg = roundTimes.length
          ? Math.round(roundTimes.reduce(function (a, b) { return a + b; }, 0) / roundTimes.length)
          : 0;
        bgTop = '#171038';
        bgBot = '#091d2e';
        ringColor = '#a855f7';
        headline = 'AVG: ' + avg + ' ms';
        subline = rankTitle(avg);
        centerIcon = '🏆';
      }

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, bgTop);
      grad.addColorStop(1, bgBot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Top Round & Personal Best Strip
      const prog = api.getProgress({ bestSingleMs: null, bestAvgMs: null });
      ctx.fillStyle = 'rgba(6, 10, 25, 0.68)';
      ctx.fillRect(18, 16, W - 36, 42);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.strokeRect(18, 16, W - 36, 42);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('ROUND ' + Math.min(TOTAL_ROUNDS, roundIndex + 1) + ' / ' + TOTAL_ROUNDS, 32, 42);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#fde047';
      const pbText = prog.bestAvgMs
        ? 'BEST AVG: ' + prog.bestAvgMs + ' ms' + (prog.bestSingleMs ? ' (FASTEST: ' + prog.bestSingleMs + ' ms)' : '')
        : 'BEST: -- ms';
      ctx.fillText(pbText, W - 32, 42);

      // Center Reactive Ring
      const cx = W / 2;
      const cy = 235;
      const pulseScale = phase === 'signal' ? 1.06 : 1 + Math.sin(pulse) * 0.03;

      ctx.beginPath();
      ctx.arc(cx, cy, 98 * pulseScale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = ringColor;
      ctx.stroke();

      ctx.font = '44px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(centerIcon, cx, cy - 18);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 30px system-ui, sans-serif';
      ctx.fillText(headline, cx, cy + 28);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 14px system-ui, sans-serif';
      ctx.fillText(subline, cx, cy + 135);

      // 5-Round History Slots at Bottom
      const slotW = 84;
      const gap = 10;
      const totalBarW = TOTAL_ROUNDS * slotW + (TOTAL_ROUNDS - 1) * gap;
      const startX = (W - totalBarW) / 2;
      const slotY = H - 104;

      for (let i = 0; i < TOTAL_ROUNDS; i++) {
        const sx = startX + i * (slotW + gap);
        const recorded = roundTimes[i];
        ctx.fillStyle = recorded != null ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(sx, slotY, slotW, 66);
        ctx.strokeStyle = i === roundIndex && phase !== 'finished'
          ? '#22d3ee'
          : (recorded != null ? '#10b981' : 'rgba(255,255,255,0.14)');
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, slotY, slotW, 66);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.fillText('R' + (i + 1), sx + slotW / 2, slotY + 22);

        ctx.fillStyle = '#ffffff';
        ctx.font = '800 15px monospace';
        ctx.fillText(recorded != null ? recorded + 'ms' : '---', sx + slotW / 2, slotY + 48);
      }
    }

    function bindInputs() {
      canvas.addEventListener('pointerdown', function (e) {
        if (!api.isRunning()) return;
        e.preventDefault();
        handleTap();
      });

      root.addEventListener('keydown', function (e) {
        if (!api.isRunning()) return;
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleTap();
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
        phase = 'idle';
        bindInputs();
        render();
        rafId = root.requestAnimationFrame(loop);
      },
      start: function () {
        resetMatch();
        lastTime = 0;
      },
      pause: function () {},
      resume: function () {
        lastTime = 0;
      },
      restart: function () {
        resetMatch();
        lastTime = 0;
      },
      destroy: function () {
        if (rafId) root.cancelAnimationFrame(rafId);
      },
      getShareSummary: function () {
        if (!roundTimes.length) return '';
        const avg = Math.round(roundTimes.reduce(function (a, b) { return a + b; }, 0) / roundTimes.length);
        return avg + ' ms avg reaction speed';
      },
      // Test hooks
      forceSignalAndTap: function () {
        phase = 'signal';
        signalStartPerf = nowPerf() - 195;
        handleTap();
      }
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
