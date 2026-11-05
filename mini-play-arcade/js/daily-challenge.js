/**
 * MINI PLAY ARCADE — Date-Based Daily Challenge System
 * Deterministically rotates the featured game and target score every calendar day.
 */
(function (root) {
  'use strict';

  const BADGE_THEMES = [
    { name: 'Neon Vanguard', icon: '⚡', tier: 'Gold' },
    { name: 'Cyber Champion', icon: '🏆', tier: 'Diamond' },
    { name: 'Pulse Breaker', icon: '💠', tier: 'Platinum' },
    { name: 'Starlight Ace', icon: '🌟', tier: 'Nova' },
    { name: 'Quantum Striker', icon: '🚀', tier: 'Apex' },
    { name: 'Prism Master', icon: '🔮', tier: 'Mythic' },
    { name: 'Hyper Legend', icon: '👑', tier: 'Crown' }
  ];

  function getDateKey(dateObj) {
    const d = dateObj || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function hashDateKey(dateKey) {
    let hash = 2166136261;
    for (let i = 0; i < dateKey.length; i++) {
      hash ^= dateKey.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }

  function getChallengeForDate(dateObj) {
    const d = dateObj || new Date();
    const dateKey = getDateKey(d);
    const games = (root.MPA_DATA && root.MPA_DATA.GAMES) ? root.MPA_DATA.GAMES : [];
    if (!games.length) return null;

    // Use ordinal day index so consecutive days never pick the exact same game
    const epochDays = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    const gameIndex = ((epochDays % games.length) + games.length) % games.length;
    const game = games[gameIndex];

    const seed = hashDateKey(dateKey);
    const multiplierSteps = [1.0, 1.1, 1.15, 1.2, 1.25];
    const mult = multiplierSteps[seed % multiplierSteps.length];
    const targetScore = Math.round((game.dailyTargetScore * mult) / 10) * 10;
    const badge = BADGE_THEMES[epochDays % BADGE_THEMES.length];

    const completedMap = root.MPA_STORAGE ? root.MPA_STORAGE.getDailyCompletedMap() : {};
    const completionRecord = completedMap[dateKey] || null;

    // Calculate best score achieved today on this game
    let todayBest = 0;
    if (root.MPA_STORAGE) {
      const state = root.MPA_STORAGE.getState();
      (state.scoreHistory || []).forEach(function (entry) {
        if (entry.gameId === game.id && typeof entry.timestamp === 'string' && entry.timestamp.slice(0, 10) === dateKey) {
          if (entry.score > todayBest) todayBest = entry.score;
        }
      });
      if (completionRecord && completionRecord.score > todayBest) {
        todayBest = completionRecord.score;
      }
    }

    return {
      dateKey: dateKey,
      formattedDate: d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      game: game,
      targetScore: targetScore,
      instructions: 'Score ' + targetScore.toLocaleString() + ' or higher in ' + game.title + ' today! ' + game.controls,
      badge: badge,
      completed: Boolean(completionRecord),
      completionRecord: completionRecord,
      todayBest: todayBest,
      progressPercent: Math.min(100, Math.round((todayBest / Math.max(1, targetScore)) * 100))
    };
  }

  function getTodayChallenge() {
    return getChallengeForDate(new Date());
  }

  function getUpcomingSchedule(daysCount) {
    const count = daysCount || 5;
    const list = [];
    const base = new Date();
    for (let i = -2; i < count; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const item = getChallengeForDate(d);
      if (item) {
        item.offsetDays = i;
        list.push(item);
      }
    }
    return list;
  }

  function checkSubmission(gameId, score) {
    const challenge = getTodayChallenge();
    if (!challenge || challenge.game.id !== gameId) return false;
    if (challenge.completed) return false;
    if (score >= challenge.targetScore && root.MPA_STORAGE) {
      return root.MPA_STORAGE.markDailyCompleted(challenge.dateKey, {
        gameId: gameId,
        gameTitle: challenge.game.title,
        score: score,
        targetScore: challenge.targetScore,
        badgeName: challenge.badge.name,
        badgeIcon: challenge.badge.icon
      });
    }
    return false;
  }

  function getTimeUntilNextChallenge() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return {
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0')
    };
  }

  root.MPA_DAILY = {
    getDateKey: getDateKey,
    getTodayChallenge: getTodayChallenge,
    getChallengeForDate: getChallengeForDate,
    getUpcomingSchedule: getUpcomingSchedule,
    checkSubmission: checkSubmission,
    getTimeUntilNextChallenge: getTimeUntilNextChallenge
  };
})(typeof window !== 'undefined' ? window : globalThis);
