/**
 * MINI PLAY ARCADE — Universal Individual Game Page Shell
 * Coordinates HUD, Start / Pause / Resume / Restart, LocalStorage Best Score,
 * Daily Challenge verification, Game-Over Overlay, Share Score, Scroll Lock,
 * and Related Games across all 10 games.
 */
(function (root) {
  'use strict';

  const registeredFactories = {};
  let activeController = null;

  function registerEngine(gameId, factoryFn) {
    registeredFactories[gameId] = factoryFn;
    if (typeof document !== 'undefined' && document.readyState !== 'loading') {
      const pageGameId = document.documentElement.getAttribute('data-game-id');
      if (pageGameId === gameId && !activeController) {
        bootGamePage(gameId);
      }
    }
  }

  function bootGamePage(gameId) {
    const game = root.MPA_DATA ? root.MPA_DATA.getGameById(gameId) : null;
    const stage = document.getElementById('game-stage');
    if (!game || !stage) return null;

    const canvas = document.getElementById('game-canvas');
    const scoreEl = document.getElementById('hud-current-score');
    const bestEl = document.getElementById('hud-best-score');
    const startBtn = document.getElementById('btn-start');
    const pauseBtn = document.getElementById('btn-pause');
    const restartBtn = document.getElementById('btn-restart');
    const soundBtn = document.getElementById('btn-game-sound');
    const fullscreenBtn = document.getElementById('btn-fullscreen');
    const favBtn = document.getElementById('btn-game-fav');

    const startOverlay = document.getElementById('overlay-start');
    const pauseOverlay = document.getElementById('overlay-pause');
    const gameOverOverlay = document.getElementById('overlay-gameover');

    const overlayStartTrigger = document.getElementById('overlay-btn-start');
    const overlayResumeTrigger = document.getElementById('overlay-btn-resume');
    const overlayPauseRestart = document.getElementById('overlay-btn-pause-restart');
    const overlayPlayAgain = document.getElementById('overlay-btn-play-again');
    const shareScoreBtn = document.getElementById('btn-share-score');
    const headerShareBtn = document.getElementById('btn-share-inline');

    const goFinalScoreEl = document.getElementById('go-final-score');
    const goBestScoreEl = document.getElementById('go-best-score');
    const goSummaryTextEl = document.getElementById('go-summary-text');
    const goNewBestPill = document.getElementById('go-new-best-pill');

    let currentScore = 0;
    let bestScore = root.MPA_STORAGE ? root.MPA_STORAGE.getBestScore(gameId) : 0;
    let running = false;
    let paused = false;
    let lastExtraText = '';

    if (bestEl) bestEl.textContent = bestScore.toLocaleString();

    // Daily Challenge indicator if today's game matches
    const dailyTagHost = document.getElementById('game-daily-indicator');
    if (dailyTagHost && root.MPA_DAILY) {
      const ch = root.MPA_DAILY.getTodayChallenge();
      if (ch && ch.game.id === gameId) {
        dailyTagHost.innerHTML = ch.completed
          ? '<span class="chip chip-green">✅ Daily Challenge Completed!</span>'
          : '<span class="chip chip-amber">🎯 Today\'s Daily Target: ' + ch.targetScore.toLocaleString() + ' pts</span>';
      }
    }

    // Favorite button sync
    if (favBtn && root.MPA_STORAGE) {
      const refreshFav = function () {
        const fav = root.MPA_STORAGE.isFavorite(gameId);
        favBtn.classList.toggle('active', fav);
        favBtn.innerHTML = (fav ? '♥' : '♡') + ' <span class="btn-text">' + (fav ? 'Saved' : 'Favorite') + '</span>';
      };
      refreshFav();
      favBtn.addEventListener('click', function () {
        const active = root.MPA_STORAGE.toggleFavorite(gameId);
        if (root.MPA_SOUND) root.MPA_SOUND.play('click');
        if (root.MPA_UI) root.MPA_UI.syncAllFavoriteButtons(gameId, active);
        refreshFav();
      });
    }

    // Sound button sync
    if (soundBtn && root.MPA_STORAGE) {
      const syncSoundLabel = function () {
        const on = root.MPA_STORAGE.isSoundEnabled();
        soundBtn.innerHTML = (on ? '🔊' : '🔇') + ' <span class="btn-text">' + (on ? 'Sound' : 'Muted') + '</span>';
      };
      syncSoundLabel();
      soundBtn.addEventListener('click', function () {
        const on = root.MPA_STORAGE.toggleSound();
        syncSoundLabel();
        const headerSound = document.getElementById('header-sound-btn');
        if (headerSound) headerSound.textContent = on ? '🔊' : '🔇';
        if (on && root.MPA_SOUND) root.MPA_SOUND.play('click');
      });
    }

    // Fullscreen button
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', function () {
        const cabinet = document.querySelector('.arcade-cabinet');
        if (!cabinet) return;
        if (!document.fullscreenElement && cabinet.requestFullscreen) {
          cabinet.requestFullscreen().catch(function () {});
        } else if (document.exitFullscreen) {
          document.exitFullscreen().catch(function () {});
        }
      });
    }

    // Populate Related Games
    const relatedHost = document.getElementById('related-games-grid');
    if (relatedHost && root.MPA_DATA && root.MPA_UI) {
      const related = root.MPA_DATA.getRelatedGames(gameId, 4);
      relatedHost.innerHTML = related.map(function (g) {
        return root.MPA_UI.renderGameCardHtml(g);
      }).join('');
      root.MPA_UI.bindFavoriteButtons(relatedHost);
    }

    function updateHudButtons() {
      if (startBtn) {
        startBtn.disabled = running && !paused;
        startBtn.innerHTML = (running && paused)
          ? '▶ <span class="btn-text">Resume</span>'
          : '▶ <span class="btn-text">Start</span>';
      }
      if (pauseBtn) {
        pauseBtn.disabled = !running;
        pauseBtn.innerHTML = paused
          ? '▶ <span class="btn-text">Resume</span>'
          : '⏸ <span class="btn-text">Pause</span>';
      }
      if (restartBtn) {
        restartBtn.disabled = false;
      }
    }

    function setScore(val) {
      currentScore = Math.max(0, Math.round(Number(val) || 0));
      if (scoreEl) scoreEl.textContent = currentScore.toLocaleString();
      if (currentScore > bestScore) {
        bestScore = currentScore;
        if (bestEl) bestEl.textContent = bestScore.toLocaleString();
        if (root.MPA_STORAGE) {
          root.MPA_STORAGE.updateHighScoreLive(gameId, bestScore);
        }
      }
      return currentScore;
    }

    function addScore(delta) {
      return setScore(currentScore + (Number(delta) || 0));
    }

    function triggerGameOver(options) {
      if (!running && gameOverOverlay && gameOverOverlay.classList.contains('visible')) {
        return;
      }
      const opts = options || {};
      if (typeof opts.score === 'number') {
        setScore(opts.score);
      }
      running = false;
      paused = false;
      lastExtraText = opts.summary || '';

      let result = { score: currentScore, best: bestScore, isNewBest: false, dailyCompletedNow: false };
      if (root.MPA_STORAGE) {
        const prevBestBeforeSession = root.MPA_STORAGE.getBestScore(gameId);
        result = root.MPA_STORAGE.recordGameSession(gameId, currentScore);
        bestScore = result.best;
        if (bestEl) bestEl.textContent = bestScore.toLocaleString();
        if (currentScore >= prevBestBeforeSession && currentScore > 0 && opts.forceNewBest) {
          result.isNewBest = true;
        }
      }

      if (root.MPA_SOUND) {
        root.MPA_SOUND.play(opts.won ? 'win' : 'gameover');
      }

      if (goFinalScoreEl) goFinalScoreEl.textContent = currentScore.toLocaleString();
      if (goBestScoreEl) goBestScoreEl.textContent = bestScore.toLocaleString();

      let summaryMsg = opts.summary || ('Awesome effort in ' + game.title + '! Ready for another run?');
      if (result.dailyCompletedNow) {
        summaryMsg += ' 🎯 Daily Challenge Target Cleared!';
        if (dailyTagHost) {
          dailyTagHost.innerHTML = '<span class="chip chip-green">✅ Daily Challenge Completed!</span>';
        }
      }
      if (goSummaryTextEl) goSummaryTextEl.textContent = summaryMsg;
      if (goNewBestPill) {
        goNewBestPill.classList.toggle('visible', Boolean(result.isNewBest && currentScore > 0));
      }

      if (startOverlay) startOverlay.classList.remove('visible');
      if (pauseOverlay) pauseOverlay.classList.remove('visible');
      if (gameOverOverlay) gameOverOverlay.classList.add('visible');

      updateHudButtons();
    }

    const factory = registeredFactories[gameId];
    let engine = null;

    const api = {
      gameId: gameId,
      game: game,
      stage: stage,
      canvas: canvas,
      setScore: setScore,
      addScore: addScore,
      getScore: function () { return currentScore; },
      getBestScore: function () { return bestScore; },
      gameOver: triggerGameOver,
      playSound: function (sfx) {
        if (root.MPA_SOUND) root.MPA_SOUND.play(sfx);
      },
      getProgress: function (fallback) {
        return root.MPA_STORAGE ? root.MPA_STORAGE.getGameProgress(gameId, fallback) : (fallback || {});
      },
      saveProgress: function (patch) {
        return root.MPA_STORAGE ? root.MPA_STORAGE.setGameProgress(gameId, patch) : (patch || {});
      },
      unlockAchievement: function (achId) {
        return root.MPA_STORAGE ? root.MPA_STORAGE.unlockAchievement(achId) : false;
      },
      isPaused: function () { return paused; },
      isRunning: function () { return running && !paused; }
    };

    if (typeof factory === 'function') {
      engine = factory(api);
      if (engine && typeof engine.init === 'function') {
        engine.init();
      }
    }

    function startGame() {
      if (running && paused) {
        resumeGame();
        return;
      }
      setScore(0);
      running = true;
      paused = false;
      lastExtraText = '';
      if (startOverlay) startOverlay.classList.remove('visible');
      if (pauseOverlay) pauseOverlay.classList.remove('visible');
      if (gameOverOverlay) gameOverOverlay.classList.remove('visible');
      if (root.MPA_STORAGE) root.MPA_STORAGE.recordGameStart(gameId);
      if (root.MPA_SOUND) root.MPA_SOUND.play('click');
      if (engine && typeof engine.start === 'function') {
        engine.start();
      }
      updateHudButtons();
    }

    function pauseGame() {
      if (!running || paused) return;
      paused = true;
      if (pauseOverlay) pauseOverlay.classList.add('visible');
      if (engine && typeof engine.pause === 'function') {
        engine.pause();
      }
      updateHudButtons();
    }

    function resumeGame() {
      if (!running || !paused) return;
      paused = false;
      if (pauseOverlay) pauseOverlay.classList.remove('visible');
      if (engine && typeof engine.resume === 'function') {
        engine.resume();
      }
      updateHudButtons();
    }

    function togglePause() {
      if (!running) return;
      if (paused) resumeGame();
      else pauseGame();
    }

    function restartGame() {
      setScore(0);
      running = true;
      paused = false;
      if (startOverlay) startOverlay.classList.remove('visible');
      if (pauseOverlay) pauseOverlay.classList.remove('visible');
      if (gameOverOverlay) gameOverOverlay.classList.remove('visible');
      if (root.MPA_STORAGE) root.MPA_STORAGE.recordGameStart(gameId);
      if (root.MPA_SOUND) root.MPA_SOUND.play('click');
      if (engine && typeof engine.restart === 'function') {
        engine.restart();
      } else if (engine && typeof engine.start === 'function') {
        engine.start();
      }
      updateHudButtons();
    }

    async function shareScore() {
      const shareScoreVal = Math.max(currentScore, bestScore);
      const customNote = (engine && typeof engine.getShareSummary === 'function')
        ? engine.getShareSummary()
        : lastExtraText;
      const text = '🕹️ I scored ' + shareScoreVal.toLocaleString() + ' pts in ' + game.title +
        (customNote ? ' (' + customNote + ')' : '') +
        ' on MINI PLAY ARCADE! Can you beat my score?';
      const shareUrl = root.location ? root.location.href : '';

      if (root.navigator && typeof root.navigator.share === 'function') {
        try {
          await root.navigator.share({
            title: game.title + ' — MINI PLAY ARCADE',
            text: text,
            url: shareUrl
          });
          return;
        } catch (_) { /* user cancelled or fallback */ }
      }

      if (root.navigator && root.navigator.clipboard && typeof root.navigator.clipboard.writeText === 'function') {
        try {
          await root.navigator.clipboard.writeText(text + (shareUrl ? ' ' + shareUrl : ''));
          if (root.MPA_UI) root.MPA_UI.showToast('Scorecard copied to clipboard! Share it anywhere.', '📋');
          return;
        } catch (_) { /* fallback */ }
      }

      if (root.MPA_UI) root.MPA_UI.showToast(text, '🏆');
    }

    if (startBtn) startBtn.addEventListener('click', startGame);
    if (overlayStartTrigger) overlayStartTrigger.addEventListener('click', startGame);
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
    if (overlayResumeTrigger) overlayResumeTrigger.addEventListener('click', resumeGame);
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    if (overlayPauseRestart) overlayPauseRestart.addEventListener('click', restartGame);
    if (overlayPlayAgain) overlayPlayAgain.addEventListener('click', restartGame);
    if (shareScoreBtn) shareScoreBtn.addEventListener('click', shareScore);
    if (headerShareBtn) headerShareBtn.addEventListener('click', shareScore);

    // Prevent page scrolling on Space / Arrow keys when actively playing
    root.addEventListener('keydown', function (e) {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'p' || e.key === 'P') {
        if (running) {
          e.preventDefault();
          togglePause();
        }
        return;
      }
      if (running && !paused) {
        if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) !== -1) {
          e.preventDefault();
        }
      }
    }, { passive: false });

    // Prevent unwanted touchmove scroll inside canvas viewport while running
    stage.addEventListener('touchmove', function (e) {
      if (canvas && (e.target === canvas || e.target === stage)) {
        e.preventDefault();
      }
    }, { passive: false });

    updateHudButtons();

    activeController = {
      gameId: gameId,
      start: startGame,
      pause: pauseGame,
      resume: resumeGame,
      restart: restartGame,
      shareScore: shareScore,
      getScore: function () { return currentScore; },
      getBestScore: function () { return bestScore; },
      isRunning: function () { return running; },
      isPaused: function () { return paused; },
      engine: engine
    };

    return activeController;
  }

  if (typeof document !== 'undefined') {
    const onReady = function () {
      const pageGameId = document.documentElement.getAttribute('data-game-id');
      if (pageGameId && registeredFactories[pageGameId] && !activeController) {
        bootGamePage(pageGameId);
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady);
    } else {
      onReady();
    }
  }

  root.MPA_GAME_SHELL = {
    registerEngine: registerEngine,
    bootGamePage: bootGamePage,
    getActiveController: function () { return activeController; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
