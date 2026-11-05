/**
 * MINI PLAY ARCADE — LocalStorage Player Profile & Progress Manager
 * Zero-login guest persistence: profile, favorites, recently played,
 * personal bests, total plays, game-specific state, achievements, and consent.
 */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'mpa_player_state_v1';
  const CONSENT_KEY = 'mpa_cookie_consent_v1';

  const AVATARS = ['👾', '🚀', '⚡', '🐉', '🦊', '🤖', '💎', '🔥', '🌟', '🎯'];

  const memoryFallback = {};

  function rawGet(key) {
    try {
      if (root.localStorage) {
        return root.localStorage.getItem(key);
      }
    } catch (_) { /* private mode fallback */ }
    return Object.prototype.hasOwnProperty.call(memoryFallback, key) ? memoryFallback[key] : null;
  }

  function rawSet(key, value) {
    try {
      if (root.localStorage) {
        root.localStorage.setItem(key, value);
        return true;
      }
    } catch (_) { /* ignore quota / private mode */ }
    memoryFallback[key] = value;
    return false;
  }

  function generateGuestId() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return 'Player-' + num;
  }

  function createDefaultState() {
    const handle = generateGuestId();
    return {
      version: 1,
      profile: {
        nickname: handle,
        avatar: '👾',
        createdAt: new Date().toISOString()
      },
      stats: {
        totalGamesPlayed: 0,
        totalScoreAccumulated: 0,
        gamesPlayedCountById: {}
      },
      bestScores: {},          // { [gameId]: number }
      scoreHistory: [],        // [{ gameId, score, timestamp }] (capped at 120)
      recentlyPlayed: [],      // [{ gameId, playedAt }] (most recent first, max 10)
      favorites: [],           // [gameId]
      achievements: {},        // { [achievementId]: unlockedTimestamp }
      dailyCompleted: {},      // { ['YYYY-MM-DD']: { gameId, score, target, completedAt } }
      gameProgress: {},        // { [gameId]: customObject (coins, skins, unlockedLevel, bestMs, etc.) }
      settings: {
        soundEnabled: true
      }
    };
  }

  let cachedState = null;
  const listeners = [];

  function loadState() {
    if (cachedState) return cachedState;
    const raw = rawGet(STORAGE_KEY);
    if (!raw) {
      cachedState = createDefaultState();
      saveState();
      return cachedState;
    }
    try {
      const parsed = JSON.parse(raw);
      const defaults = createDefaultState();
      cachedState = Object.assign({}, defaults, parsed, {
        profile: Object.assign({}, defaults.profile, parsed.profile || {}),
        stats: Object.assign({}, defaults.stats, parsed.stats || {}, {
          gamesPlayedCountById: Object.assign({}, (parsed.stats && parsed.stats.gamesPlayedCountById) || {})
        }),
        bestScores: Object.assign({}, parsed.bestScores || {}),
        scoreHistory: Array.isArray(parsed.scoreHistory) ? parsed.scoreHistory : [],
        recentlyPlayed: Array.isArray(parsed.recentlyPlayed) ? parsed.recentlyPlayed : [],
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
        achievements: Object.assign({}, parsed.achievements || {}),
        dailyCompleted: Object.assign({}, parsed.dailyCompleted || {}),
        gameProgress: Object.assign({}, parsed.gameProgress || {}),
        settings: Object.assign({}, defaults.settings, parsed.settings || {})
      });
    } catch (_) {
      cachedState = createDefaultState();
    }
    return cachedState;
  }

  function saveState() {
    if (!cachedState) return;
    rawSet(STORAGE_KEY, JSON.stringify(cachedState));
    notifyListeners();
  }

  function subscribe(fn) {
    if (typeof fn === 'function') listeners.push(fn);
    return function unsubscribe() {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  function notifyListeners() {
    const snapshot = loadState();
    listeners.slice().forEach(function (fn) {
      try { fn(snapshot); } catch (_) { /* ignore listener errors */ }
    });
  }

  function getProfile() {
    return Object.assign({}, loadState().profile);
  }

  function updateProfile(updates) {
    const state = loadState();
    if (updates && typeof updates.nickname === 'string') {
      const cleaned = updates.nickname.trim().replace(/[<>]/g, '').slice(0, 20);
      if (cleaned.length >= 2) {
        state.profile.nickname = cleaned;
      }
    }
    if (updates && typeof updates.avatar === 'string' && AVATARS.indexOf(updates.avatar) !== -1) {
      state.profile.avatar = updates.avatar;
    }
    saveState();
    return getProfile();
  }

  function unlockAchievement(achievementId) {
    const state = loadState();
    if (state.achievements[achievementId]) return false;
    state.achievements[achievementId] = new Date().toISOString();
    saveState();
    if (root.MPA_UI && typeof root.MPA_UI.notifyAchievement === 'function') {
      root.MPA_UI.notifyAchievement(achievementId);
    }
    if (root.MPA_SOUND && typeof root.MPA_SOUND.play === 'function') {
      root.MPA_SOUND.play('achievement');
    }
    return true;
  }

  function evaluateAchievements() {
    const state = loadState();
    const newlyUnlocked = [];
    function check(cond, id) {
      if (cond && !state.achievements[id]) {
        if (unlockAchievement(id)) newlyUnlocked.push(id);
      }
    }

    const distinctPlayed = Object.keys(state.stats.gamesPlayedCountById).filter(function (k) {
      return state.stats.gamesPlayedCountById[k] > 0;
    }).length;

    const maxSingleScore = Object.keys(state.bestScores).reduce(function (max, k) {
      return Math.max(max, Number(state.bestScores[k]) || 0);
    }, 0);

    const dailyCount = Object.keys(state.dailyCompleted).length;

    check(state.stats.totalGamesPlayed >= 1, 'first_play');
    check(distinctPlayed >= 5, 'explorer_5');
    check(distinctPlayed >= 10, 'all_10_games');
    check(state.stats.totalGamesPlayed >= 25, 'veteran_25');
    check(state.favorites.length >= 3, 'favorite_collector');
    check(dailyCount >= 1, 'daily_challenger');
    check(dailyCount >= 3, 'daily_streak_3');
    check(maxSingleScore >= 1000, 'high_roller_1000');

    const tapProg = state.gameProgress['tap-speed-challenge'] || {};
    check(tapProg.bestAvgMs && tapProg.bestAvgMs < 250, 'lightning_reflex');

    const brainProg = state.gameProgress['brain-trap'] || {};
    check(Array.isArray(brainProg.clearedLevels) && brainProg.clearedLevels.length >= 10, 'brain_master');

    const emojiProg = state.gameProgress['guess-the-emoji'] || {};
    check((emojiProg.bestStreak || 0) >= 10, 'emoji_whiz');

    const golfProg = state.gameProgress['mini-golf-crazy'] || {};
    check(Boolean(golfProg.holeInOne), 'hole_in_one');

    return newlyUnlocked;
  }

  function recordGameStart(gameId) {
    if (!gameId) return;
    const state = loadState();
    state.recentlyPlayed = [
      { gameId: gameId, playedAt: new Date().toISOString() }
    ].concat(state.recentlyPlayed.filter(function (item) { return item.gameId !== gameId; })).slice(0, 10);
    saveState();
  }

  function recordGameSession(gameId, rawScore) {
    if (!gameId) return { score: 0, best: 0, isNewBest: false };
    const score = Math.max(0, Math.round(Number(rawScore) || 0));
    const state = loadState();

    state.stats.totalGamesPlayed += 1;
    state.stats.totalScoreAccumulated += score;
    state.stats.gamesPlayedCountById[gameId] = (state.stats.gamesPlayedCountById[gameId] || 0) + 1;

    const prevBest = Number(state.bestScores[gameId]) || 0;
    const isNewBest = score > prevBest;
    if (isNewBest) {
      state.bestScores[gameId] = score;
    }

    state.recentlyPlayed = [
      { gameId: gameId, playedAt: new Date().toISOString() }
    ].concat(state.recentlyPlayed.filter(function (item) { return item.gameId !== gameId; })).slice(0, 10);

    state.scoreHistory.unshift({
      gameId: gameId,
      score: score,
      timestamp: new Date().toISOString()
    });
    if (state.scoreHistory.length > 120) {
      state.scoreHistory.length = 120;
    }

    saveState();

    // Check daily challenge completion if applicable
    let dailyCompletedNow = false;
    if (root.MPA_DAILY && typeof root.MPA_DAILY.checkSubmission === 'function') {
      dailyCompletedNow = root.MPA_DAILY.checkSubmission(gameId, score);
    }

    evaluateAchievements();

    return {
      score: score,
      best: Math.max(prevBest, score),
      isNewBest: isNewBest,
      dailyCompletedNow: dailyCompletedNow
    };
  }

  function updateHighScoreLive(gameId, rawScore) {
    if (!gameId) return 0;
    const score = Math.max(0, Math.round(Number(rawScore) || 0));
    const state = loadState();
    const prevBest = Number(state.bestScores[gameId]) || 0;
    if (score > prevBest) {
      state.bestScores[gameId] = score;
      saveState();
    }
    return state.bestScores[gameId] || 0;
  }

  function getBestScore(gameId) {
    const state = loadState();
    return Number(state.bestScores[gameId]) || 0;
  }

  function isFavorite(gameId) {
    return loadState().favorites.indexOf(gameId) !== -1;
  }

  function toggleFavorite(gameId) {
    if (!gameId) return false;
    const state = loadState();
    const idx = state.favorites.indexOf(gameId);
    let active = false;
    if (idx === -1) {
      state.favorites.unshift(gameId);
      active = true;
    } else {
      state.favorites.splice(idx, 1);
      active = false;
    }
    saveState();
    evaluateAchievements();
    return active;
  }

  function getFavorites() {
    return loadState().favorites.slice();
  }

  function getRecentlyPlayed() {
    return loadState().recentlyPlayed.slice();
  }

  function getGameProgress(gameId, fallback) {
    const state = loadState();
    if (!state.gameProgress[gameId]) {
      return fallback ? JSON.parse(JSON.stringify(fallback)) : {};
    }
    return Object.assign({}, fallback || {}, state.gameProgress[gameId]);
  }

  function setGameProgress(gameId, patch) {
    const state = loadState();
    state.gameProgress[gameId] = Object.assign({}, state.gameProgress[gameId] || {}, patch || {});
    saveState();
    evaluateAchievements();
    return state.gameProgress[gameId];
  }

  function isSoundEnabled() {
    return Boolean(loadState().settings.soundEnabled);
  }

  function toggleSound() {
    const state = loadState();
    state.settings.soundEnabled = !state.settings.soundEnabled;
    saveState();
    return state.settings.soundEnabled;
  }

  function getSummaryStats() {
    const state = loadState();
    const totalBestPoints = Object.keys(state.bestScores).reduce(function (acc, k) {
      return acc + (Number(state.bestScores[k]) || 0);
    }, 0);
    const unlockedCount = Object.keys(state.achievements).length;
    const distinctGames = Object.keys(state.stats.gamesPlayedCountById).length;
    return {
      totalGamesPlayed: state.stats.totalGamesPlayed,
      totalBestPoints: totalBestPoints,
      favoritesCount: state.favorites.length,
      unlockedAchievements: unlockedCount,
      distinctGamesPlayed: distinctGames,
      dailyCompletedCount: Object.keys(state.dailyCompleted).length
    };
  }

  function markDailyCompleted(dateKey, payload) {
    const state = loadState();
    if (state.dailyCompleted[dateKey]) return false;
    state.dailyCompleted[dateKey] = Object.assign({ completedAt: new Date().toISOString() }, payload);
    saveState();
    evaluateAchievements();
    return true;
  }

  function getDailyCompletedMap() {
    return Object.assign({}, loadState().dailyCompleted);
  }

  // Cookie & Advertising Consent Management
  function getConsent() {
    const raw = rawGet(CONSENT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function setConsent(preferences) {
    const record = {
      essential: true, // LocalStorage for saving guest game scores & settings
      advertising: Boolean(preferences && preferences.advertising),
      updatedAt: new Date().toISOString()
    };
    rawSet(CONSENT_KEY, JSON.stringify(record));
    if (root.MPA_ADS && typeof root.MPA_ADS.onConsentUpdated === 'function') {
      root.MPA_ADS.onConsentUpdated(record);
    }
    return record;
  }

  function resetAllProgress() {
    cachedState = createDefaultState();
    saveState();
    return cachedState;
  }

  root.MPA_STORAGE = {
    AVATARS: AVATARS,
    getState: loadState,
    subscribe: subscribe,
    getProfile: getProfile,
    updateProfile: updateProfile,
    recordGameStart: recordGameStart,
    recordGameSession: recordGameSession,
    updateHighScoreLive: updateHighScoreLive,
    getBestScore: getBestScore,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    getFavorites: getFavorites,
    getRecentlyPlayed: getRecentlyPlayed,
    getGameProgress: getGameProgress,
    setGameProgress: setGameProgress,
    unlockAchievement: unlockAchievement,
    evaluateAchievements: evaluateAchievements,
    getSummaryStats: getSummaryStats,
    markDailyCompleted: markDailyCompleted,
    getDailyCompletedMap: getDailyCompletedMap,
    isSoundEnabled: isSoundEnabled,
    toggleSound: toggleSound,
    getConsent: getConsent,
    setConsent: setConsent,
    resetAllProgress: resetAllProgress
  };
})(typeof window !== 'undefined' ? window : globalThis);
