/**
 * MINI PLAY ARCADE — Leaderboard Architecture (Local + Demo Benchmark Mode)
 * =========================================================================
 * HONESTY & ARCHITECTURE NOTE:
 * - By default, this module runs in "local-demo" mode: it combines the visitor's
 *   real browser-saved LocalStorage scores with clearly labeled local demonstration
 *   pace-setters ("DEMO PACE-SETTER"). It NEVER claims to be a verified global
 *   multiplayer leaderboard.
 * - Ready for Firebase / Supabase: register a live cloud adapter via
 *   `MPA_LEADERBOARD.registerCloudAdapter({ fetchEntries, submitScore })`
 *   when connecting a backend database.
 */
(function (root) {
  'use strict';

  let cloudAdapter = null;

  const DEMO_PACESETTERS = [
    { handle: 'NovaPulse (Demo)', avatar: '🚀', skillFactor: 1.48 },
    { handle: 'CyberKiran (Demo)', avatar: '⚡', skillFactor: 1.32 },
    { handle: 'PixelViper (Demo)', avatar: '🐉', skillFactor: 1.18 },
    { handle: 'AetherFox (Demo)', avatar: '🦊', skillFactor: 1.04 },
    { handle: 'SynthWave99 (Demo)', avatar: '🤖', skillFactor: 0.92 },
    { handle: 'PrismDrifter (Demo)', avatar: '💎', skillFactor: 0.78 },
    { handle: 'OrbitRunner (Demo)', avatar: '🌟', skillFactor: 0.64 },
    { handle: 'ArcadeRookie (Demo)', avatar: '👾', skillFactor: 0.48 }
  ];

  function registerCloudAdapter(adapter) {
    if (adapter && typeof adapter.fetchEntries === 'function') {
      cloudAdapter = adapter;
    }
  }

  function isCloudConnected() {
    return Boolean(cloudAdapter);
  }

  function seededOffset(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) + str.charCodeAt(i);
    }
    return (Math.abs(h) % 9) * 10;
  }

  function getRankBadge(rank) {
    if (rank === 1) return { icon: '🥇', label: 'Champion', className: 'badge-rank-1' };
    if (rank === 2) return { icon: '🥈', label: 'Master', className: 'badge-rank-2' };
    if (rank === 3) return { icon: '🥉', label: 'Elite', className: 'badge-rank-3' };
    if (rank <= 5) return { icon: '💠', label: 'Top 5', className: 'badge-rank-top' };
    return { icon: '🎮', label: 'Contender', className: 'badge-rank-std' };
  }

  function getPeriodFactor(period) {
    if (period === 'daily') return 0.88;
    if (period === 'weekly') return 1.08;
    return 1.28; // alltime
  }

  function computePlayerScoreForFilter(period, gameId) {
    if (!root.MPA_STORAGE) return 0;
    const state = root.MPA_STORAGE.getState();
    const now = Date.now();
    const dayKey = root.MPA_DAILY ? root.MPA_DAILY.getDateKey(new Date()) : new Date().toISOString().slice(0, 10);
    const weekCutoff = now - 7 * 86400000;

    if (period === 'alltime') {
      if (gameId === 'overall') {
        return Object.keys(state.bestScores).reduce(function (sum, k) {
          return sum + (Number(state.bestScores[k]) || 0);
        }, 0);
      }
      return Number(state.bestScores[gameId]) || 0;
    }

    // Filter scoreHistory by daily or weekly window
    const filtered = (state.scoreHistory || []).filter(function (entry) {
      if (!entry || !entry.timestamp) return false;
      if (period === 'daily') {
        return entry.timestamp.slice(0, 10) === dayKey;
      }
      const t = Date.parse(entry.timestamp);
      return !isNaN(t) && t >= weekCutoff;
    });

    if (gameId === 'overall') {
      // Sum of best score per game within the period
      const bestByGame = {};
      filtered.forEach(function (entry) {
        bestByGame[entry.gameId] = Math.max(bestByGame[entry.gameId] || 0, Number(entry.score) || 0);
      });
      return Object.keys(bestByGame).reduce(function (sum, k) { return sum + bestByGame[k]; }, 0);
    }

    return filtered.reduce(function (max, entry) {
      return entry.gameId === gameId ? Math.max(max, Number(entry.score) || 0) : max;
    }, 0);
  }

  function getLocalRankings(options) {
    const opts = options || {};
    const period = opts.period || 'alltime'; // 'daily' | 'weekly' | 'alltime'
    const gameId = opts.gameId || 'overall';
    const includeDemo = opts.includeDemo !== false;

    const games = (root.MPA_DATA && root.MPA_DATA.GAMES) ? root.MPA_DATA.GAMES : [];
    const targetGame = gameId === 'overall' ? null : root.MPA_DATA.getGameById(gameId);
    const baseTarget = targetGame
      ? targetGame.dailyTargetScore
      : games.reduce(function (sum, g) { return sum + g.dailyTargetScore; }, 0) * 0.42;

    const periodFactor = getPeriodFactor(period);
    const dateSeed = root.MPA_DAILY ? root.MPA_DAILY.getDateKey(new Date()) : '2026-11-05';

    const entries = [];

    if (includeDemo) {
      DEMO_PACESETTERS.forEach(function (bot) {
        const variance = seededOffset(bot.handle + ':' + period + ':' + gameId + ':' + (period === 'alltime' ? 'fixed' : dateSeed));
        const raw = Math.round((baseTarget * bot.skillFactor * periodFactor + variance) / 10) * 10;
        entries.push({
          name: bot.handle,
          avatar: bot.avatar,
          score: Math.max(50, raw),
          source: 'demo',
          sourceLabel: 'Demo Pace-Setter',
          isCurrentPlayer: false
        });
      });
    }

    const profile = root.MPA_STORAGE ? root.MPA_STORAGE.getProfile() : { nickname: 'Guest Player', avatar: '👾' };
    const playerScore = computePlayerScoreForFilter(period, gameId);

    entries.push({
      name: profile.nickname,
      avatar: profile.avatar,
      score: playerScore,
      source: 'local',
      sourceLabel: 'You (Saved in Browser)',
      isCurrentPlayer: true
    });

    // Also include individual local recent runs when viewing local-only mode for a specific game
    if (!includeDemo && root.MPA_STORAGE) {
      const state = root.MPA_STORAGE.getState();
      const historyRuns = (state.scoreHistory || [])
        .filter(function (item) { return gameId === 'overall' || item.gameId === gameId; })
        .slice(0, 8);
      historyRuns.forEach(function (run, idx) {
        const g = root.MPA_DATA ? root.MPA_DATA.getGameById(run.gameId) : null;
        entries.push({
          name: profile.nickname + ' — Run #' + (idx + 1) + (g ? ' (' + g.title + ')' : ''),
          avatar: profile.avatar,
          score: run.score,
          source: 'local-history',
          sourceLabel: new Date(run.timestamp).toLocaleDateString(),
          isCurrentPlayer: false
        });
      });
    }

    entries.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.isCurrentPlayer ? -1 : 1;
    });

    return entries.map(function (entry, idx) {
      const rank = idx + 1;
      return Object.assign({}, entry, {
        rank: rank,
        badge: getRankBadge(rank)
      });
    });
  }

  async function fetchLeaderboard(options) {
    if (cloudAdapter && typeof cloudAdapter.fetchEntries === 'function') {
      const remoteEntries = await cloudAdapter.fetchEntries(options || {});
      return {
        mode: 'cloud',
        disclaimer: 'Live Cloud Leaderboard',
        entries: remoteEntries
      };
    }
    return {
      mode: 'local-demo',
      disclaimer: 'Local & Demonstration Rankings: Your scores are stored locally in this browser and compared against offline arcade pace-setters. Connect Firebase or Supabase via MPA_LEADERBOARD.registerCloudAdapter() for global rankings.',
      entries: getLocalRankings(options)
    };
  }

  root.MPA_LEADERBOARD = {
    registerCloudAdapter: registerCloudAdapter,
    isCloudConnected: isCloudConnected,
    getLocalRankings: getLocalRankings,
    fetchLeaderboard: fetchLeaderboard,
    getRankBadge: getRankBadge
  };
})(typeof window !== 'undefined' ? window : globalThis);
