/**
 * MINI PLAY ARCADE — Homepage & Game Library Controller
 * Powers Hero Canvas, Featured, Trending, Daily Challenge Card, Recently Played,
 * Searchable & Filterable Game Library, and Category Browser.
 */
(function (root) {
  'use strict';

  function initHeroCanvas() {
    const canvas = document.getElementById('hero-bg-canvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const particles = [];
    const COUNT = 36;

    function resize() {
      const rect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : { width: 1200, height: 500 };
      width = Math.max(320, Math.floor(rect.width));
      height = Math.max(260, Math.floor(rect.height));
      canvas.width = width;
      canvas.height = height;
    }

    resize();
    root.addEventListener('resize', resize);

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1.3 + Math.random() * 2.4,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.2 - Math.random() * 0.45,
        hue: i % 3 === 0 ? '#a855f7' : (i % 3 === 1 ? '#06b6d4' : '#3b82f6')
      });
    }

    function step() {
      if (!document.hidden) {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(function (p) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -10) p.y = height + 10;
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.hue;
          ctx.globalAlpha = 0.55;
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      root.requestAnimationFrame(step);
    }

    root.requestAnimationFrame(step);
  }

  function renderHeroStats() {
    const statsHost = document.getElementById('hero-live-stats');
    if (!statsHost || !root.MPA_STORAGE || !root.MPA_DATA) return;
    const stats = root.MPA_STORAGE.getSummaryStats();
    statsHost.innerHTML =
      '<div class="hero-stat-item">' +
        '<span class="hero-stat-value">' + root.MPA_DATA.GAMES.length + '</span>' +
        '<span class="hero-stat-label">Playable Games</span>' +
      '</div>' +
      '<div class="hero-stat-item">' +
        '<span class="hero-stat-value">' + stats.totalGamesPlayed.toLocaleString() + '</span>' +
        '<span class="hero-stat-label">Your Sessions</span>' +
      '</div>' +
      '<div class="hero-stat-item">' +
        '<span class="hero-stat-value">' + stats.totalBestPoints.toLocaleString() + '</span>' +
        '<span class="hero-stat-label">Best Score Sum</span>' +
      '</div>' +
      '<div class="hero-stat-item">' +
        '<span class="hero-stat-value">' + stats.dailyCompletedCount + ' 🏆</span>' +
        '<span class="hero-stat-label">Daily Badges</span>' +
      '</div>';
  }

  function renderFeaturedAndTrending() {
    if (!root.MPA_DATA || !root.MPA_UI) return;
    const featuredHost = document.getElementById('featured-games-grid');
    if (featuredHost) {
      const featured = root.MPA_DATA.GAMES.filter(function (g) { return g.featured; });
      featuredHost.innerHTML = featured.map(function (g) {
        return root.MPA_UI.renderGameCardHtml(g);
      }).join('');
      root.MPA_UI.bindFavoriteButtons(featuredHost);
    }

    const trendingHost = document.getElementById('trending-games-grid');
    if (trendingHost) {
      const trending = root.MPA_DATA.GAMES
        .filter(function (g) { return g.trending; })
        .sort(function (a, b) { return (a.trendingRank || 99) - (b.trendingRank || 99); });
      trendingHost.innerHTML = trending.map(function (g) {
        return root.MPA_UI.renderGameCardHtml(g, { showTrendingRank: true });
      }).join('');
      root.MPA_UI.bindFavoriteButtons(trendingHost);
    }
  }

  function renderRecentlyPlayed() {
    const sec = document.getElementById('recently-played-section');
    const grid = document.getElementById('recently-played-grid');
    if (!sec || !grid || !root.MPA_STORAGE || !root.MPA_DATA || !root.MPA_UI) return;

    const recent = root.MPA_STORAGE.getRecentlyPlayed();
    if (!recent.length) {
      sec.style.display = 'none';
      return;
    }

    const games = recent
      .map(function (item) { return root.MPA_DATA.getGameById(item.gameId); })
      .filter(Boolean)
      .slice(0, 4);

    if (!games.length) {
      sec.style.display = 'none';
      return;
    }

    sec.style.display = 'block';
    grid.innerHTML = games.map(function (g) {
      return root.MPA_UI.renderGameCardHtml(g);
    }).join('');
    root.MPA_UI.bindFavoriteButtons(grid);
  }

  function renderDailyBanner() {
    const host = document.getElementById('home-daily-challenge');
    if (!host || !root.MPA_DAILY || !root.MPA_UI) return;
    const ch = root.MPA_DAILY.getTodayChallenge();
    if (!ch) return;

    const gameHref = root.MPA_UI.resolveUrl(ch.game.url);
    const thumbSrc = root.MPA_UI.resolveUrl(ch.game.thumbnail);
    const statusChip = ch.completed
      ? '<span class="chip chip-green">✅ Challenge Completed (' + ch.badge.icon + ' ' + root.MPA_UI.escapeHtml(ch.badge.name) + ')</span>'
      : '<span class="chip chip-amber">🎯 Today\'s Target: ' + ch.targetScore.toLocaleString() + ' pts</span>';

    host.innerHTML =
      '<div class="daily-banner-card">' +
        '<div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px">' +
            '<span class="chip chip-purple">📅 ' + root.MPA_UI.escapeHtml(ch.formattedDate) + '</span>' +
            statusChip +
          '</div>' +
          '<h2 style="margin:0 0 10px;font-size:clamp(1.5rem,3vw,2.1rem);font-weight:900">' +
            'Daily Challenge: ' + root.MPA_UI.escapeHtml(ch.game.title) +
          '</h2>' +
          '<p style="margin:0 0 14px;color:var(--text-secondary)">' +
            root.MPA_UI.escapeHtml(ch.game.dailyInstruction) +
          '</p>' +
          '<div class="daily-progress-track" role="progressbar" aria-valuenow="' + ch.progressPercent + '" aria-valuemin="0" aria-valuemax="100">' +
            '<div class="daily-progress-fill" style="width:' + ch.progressPercent + '%"></div>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;font-size:0.84rem;color:var(--text-muted);margin-bottom:20px">' +
            '<span>Today\'s Best: <strong style="color:#fff">' + ch.todayBest.toLocaleString() + '</strong> / ' + ch.targetScore.toLocaleString() + '</span>' +
            '<span>Reward Badge: <strong style="color:#fcd34d">' + ch.badge.icon + ' ' + root.MPA_UI.escapeHtml(ch.badge.name) + '</strong></span>' +
          '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:12px">' +
            '<a class="btn btn-primary" href="' + gameHref + '">⚡ Play Daily Challenge</a>' +
            '<a class="btn btn-secondary" href="' + root.MPA_UI.resolveUrl('pages/daily-challenge.html') + '">View Schedule &amp; Badges</a>' +
          '</div>' +
        '</div>' +
        '<div class="daily-preview-box">' +
          '<a href="' + gameHref + '">' +
            '<img src="' + thumbSrc + '" alt="' + root.MPA_UI.escapeHtml(ch.game.title) + ' Daily Challenge Preview" width="480" height="300" />' +
          '</a>' +
        '</div>' +
      '</div>';
  }

  function initSearchableLibrary() {
    const grid = document.getElementById('all-games-grid');
    const pillsHost = document.getElementById('category-filter-pills');
    const searchInput = document.getElementById('game-search-input');
    const clearBtn = document.getElementById('search-clear-btn');
    const countLabel = document.getElementById('library-results-count');
    const categoryTilesHost = document.getElementById('category-overview-tiles');

    if (!grid || !root.MPA_DATA || !root.MPA_UI) return;

    let selectedCategory = 'all';
    let searchQuery = '';

    // Support URL params (?category=Puzzle&q=...)
    try {
      const params = new URLSearchParams(root.location ? root.location.search : '');
      const catParam = params.get('category');
      const qParam = params.get('q');
      if (catParam && root.MPA_DATA.CATEGORIES.some(function (c) { return c.id.toLowerCase() === catParam.toLowerCase(); })) {
        const matched = root.MPA_DATA.CATEGORIES.find(function (c) { return c.id.toLowerCase() === catParam.toLowerCase(); });
        selectedCategory = matched.id;
      }
      if (qParam) {
        searchQuery = qParam.trim();
        if (searchInput) searchInput.value = searchQuery;
      }
    } catch (_) { /* ignore */ }

    function renderPills() {
      if (!pillsHost) return;
      pillsHost.innerHTML = root.MPA_DATA.CATEGORIES.map(function (cat) {
        const activeCls = cat.id === selectedCategory ? ' active' : '';
        return (
          '<button type="button" class="cat-pill' + activeCls + '" data-cat-id="' + root.MPA_UI.escapeHtml(cat.id) + '">' +
            '<span>' + cat.icon + '</span> ' + root.MPA_UI.escapeHtml(cat.name) +
          '</button>'
        );
      }).join('');

      pillsHost.querySelectorAll('[data-cat-id]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          selectedCategory = btn.getAttribute('data-cat-id');
          renderPills();
          renderCategoryTiles();
          renderFilteredGames();
        });
      });
    }

    function renderCategoryTiles() {
      if (!categoryTilesHost) return;
      const realCats = root.MPA_DATA.CATEGORIES.filter(function (c) { return c.id !== 'all'; });
      categoryTilesHost.innerHTML = realCats.map(function (cat) {
        const count = root.MPA_DATA.GAMES.filter(function (g) {
          return g.category === cat.id || (Array.isArray(g.categories) && g.categories.indexOf(cat.id) !== -1);
        }).length;
        const isAct = selectedCategory === cat.id;
        return (
          '<button type="button" class="category-tile' + (isAct ? ' active' : '') + '" data-tile-cat="' + root.MPA_UI.escapeHtml(cat.id) + '">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
              '<span style="font-size:1.75rem">' + cat.icon + '</span>' +
              '<span class="chip">' + count + ' Games</span>' +
            '</div>' +
            '<h3 style="margin:0 0 6px;font-size:1.12rem">' + root.MPA_UI.escapeHtml(cat.name) + '</h3>' +
            '<p style="margin:0;color:var(--text-muted);font-size:0.86rem">' + root.MPA_UI.escapeHtml(cat.description) + '</p>' +
          '</button>'
        );
      }).join('');

      categoryTilesHost.querySelectorAll('[data-tile-cat]').forEach(function (tile) {
        tile.addEventListener('click', function () {
          const cid = tile.getAttribute('data-tile-cat');
          selectedCategory = selectedCategory === cid ? 'all' : cid;
          renderPills();
          renderCategoryTiles();
          renderFilteredGames();
        });
      });
    }

    function renderFilteredGames() {
      const q = searchQuery.toLowerCase();
      const filtered = root.MPA_DATA.GAMES.filter(function (game) {
        const matchesCat = selectedCategory === 'all' ||
          game.category === selectedCategory ||
          (Array.isArray(game.categories) && game.categories.indexOf(selectedCategory) !== -1);
        if (!matchesCat) return false;
        if (!q) return true;
        const haystack = (
          game.title + ' ' +
          game.shortDescription + ' ' +
          game.category + ' ' +
          (game.categories || []).join(' ') + ' ' +
          game.tagline
        ).toLowerCase();
        return haystack.indexOf(q) !== -1;
      });

      if (countLabel) {
        countLabel.textContent = 'Showing ' + filtered.length + ' of ' + root.MPA_DATA.GAMES.length + ' games';
      }

      if (clearBtn) {
        clearBtn.classList.toggle('visible', searchQuery.length > 0);
      }

      if (!filtered.length) {
        grid.innerHTML =
          '<div class="empty-state-box" style="grid-column: 1 / -1">' +
            '<div style="font-size:2.4rem;margin-bottom:8px">🔍</div>' +
            '<h3 style="margin:0 0 8px">No matching games found</h3>' +
            '<p style="color:var(--text-muted);margin:0 0 16px">Try clearing your search or switching back to All Games.</p>' +
            '<button type="button" class="btn btn-secondary btn-sm" id="reset-filters-btn">Show All 10 Games</button>' +
          '</div>';
        const resetBtn = document.getElementById('reset-filters-btn');
        if (resetBtn) {
          resetBtn.addEventListener('click', function () {
            selectedCategory = 'all';
            searchQuery = '';
            if (searchInput) searchInput.value = '';
            renderPills();
            renderCategoryTiles();
            renderFilteredGames();
          });
        }
        return;
      }

      // Insert responsive AdSense row slot cleanly after the first 4 cards when showing >4 games
      const cardsHtml = [];
      filtered.forEach(function (game, idx) {
        if (idx === 4) {
          cardsHtml.push(
            '<div class="mpa-ad-slot mpa-ad-grid-row mpa-ad-collapsed" data-mpa-ad-slot="LIBRARY_BETWEEN_ROWS" aria-hidden="true"></div>'
          );
        }
        cardsHtml.push(root.MPA_UI.renderGameCardHtml(game));
      });

      grid.innerHTML = cardsHtml.join('');
      root.MPA_UI.bindFavoriteButtons(grid);
      if (root.MPA_ADS && typeof root.MPA_ADS.initAdSlots === 'function') {
        root.MPA_ADS.initAdSlots(grid);
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        searchQuery = searchInput.value.trim();
        renderFilteredGames();
      });
    }

    if (clearBtn && searchInput) {
      clearBtn.addEventListener('click', function () {
        searchInput.value = '';
        searchQuery = '';
        renderFilteredGames();
        searchInput.focus();
      });
    }

    renderPills();
    renderCategoryTiles();
    renderFilteredGames();
  }

  function initHome() {
    initHeroCanvas();
    renderHeroStats();
    renderFeaturedAndTrending();
    renderRecentlyPlayed();
    renderDailyBanner();
    initSearchableLibrary();

    if (root.MPA_STORAGE) {
      root.MPA_STORAGE.subscribe(function () {
        renderHeroStats();
      });
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initHome);
    } else {
      initHome();
    }
  }

  root.MPA_HOME = {
    initHome: initHome,
    initSearchableLibrary: initSearchableLibrary
  };
})(typeof window !== 'undefined' ? window : globalThis);
