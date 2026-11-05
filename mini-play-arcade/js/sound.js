/**
 * MINI PLAY ARCADE — Lightweight Web Audio API Sound Engine
 * Synthesizes clean neon arcade effects with zero external audio downloads.
 */
(function (root) {
  'use strict';

  let ctx = null;

  function getContext() {
    if (root.MPA_STORAGE && !root.MPA_STORAGE.isSoundEnabled()) return null;
    const AudioCtx = root.AudioContext || root.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      try {
        ctx = new AudioCtx();
      } catch (_) {
        return null;
      }
    }
    if (ctx.state === 'suspended') {
      try { ctx.resume(); } catch (_) { /* ignore */ }
    }
    return ctx;
  }

  function tone(freq, duration, type, volume, slideTo, delay) {
    const audio = getContext();
    if (!audio) return;
    try {
      const start = audio.currentTime + (delay || 0);
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), start + duration);
      }
      gain.gain.setValueAtTime(Math.max(0.001, volume || 0.12), start);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    } catch (_) { /* ignore audio errors */ }
  }

  function play(effect) {
    if (root.MPA_STORAGE && !root.MPA_STORAGE.isSoundEnabled()) return;
    switch (effect) {
      case 'tap':
      case 'click':
        tone(520, 0.06, 'triangle', 0.1, 680);
        break;
      case 'jump':
        tone(280, 0.12, 'sine', 0.14, 620);
        break;
      case 'drop':
        tone(340, 0.09, 'triangle', 0.13, 210);
        break;
      case 'perfect':
      case 'combo':
        tone(587, 0.09, 'sine', 0.14, 784, 0);
        tone(880, 0.15, 'triangle', 0.14, 1175, 0.06);
        break;
      case 'pop':
      case 'merge':
        tone(420, 0.09, 'sine', 0.14, 760);
        break;
      case 'coin':
      case 'star':
        tone(988, 0.07, 'sine', 0.12, 988, 0);
        tone(1318, 0.16, 'sine', 0.12, 1318, 0.06);
        break;
      case 'putt':
        tone(210, 0.07, 'triangle', 0.15, 110);
        break;
      case 'win':
      case 'achievement':
        tone(523, 0.1, 'triangle', 0.13, 523, 0);
        tone(659, 0.1, 'triangle', 0.13, 659, 0.09);
        tone(784, 0.12, 'triangle', 0.14, 784, 0.18);
        tone(1046, 0.24, 'sine', 0.16, 1046, 0.27);
        break;
      case 'wrong':
        tone(220, 0.14, 'sawtooth', 0.09, 150, 0);
        break;
      case 'gameover':
        tone(392, 0.14, 'sawtooth', 0.1, 330, 0);
        tone(311, 0.16, 'sawtooth', 0.1, 247, 0.13);
        tone(220, 0.28, 'triangle', 0.12, 130, 0.27);
        break;
      default:
        tone(440, 0.06, 'sine', 0.08);
    }
  }

  root.MPA_SOUND = {
    play: play
  };
})(typeof window !== 'undefined' ? window : globalThis);
