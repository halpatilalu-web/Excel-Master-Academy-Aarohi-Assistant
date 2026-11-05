/**
 * MINI PLAY ARCADE — Shared UI Controller
 * Renders & wires Header, Mobile Drawer, Footer, Game Cards, Guest Profile Modal,
 * Achievement Toasts, and Cookie/Advertising Consent Manager across all pages.
 */
(function (root) {
  'use strict';

  function getBasePath() {
    if (typeof document === 'undefined') return '.';
    const attr = document.documentElement.getAttribute('data-base-path');
    return attr ? attr.replace(/\/+$/, '') : '.';
  }

  function resolveUrl(relPath) {
    if (!relPath) return '#';
    if (/^(https?:|mailto:|#)/.test(relPath)) return relPath;
    const base = getBasePath();
    const clean = relPath.replace(/^\.\//, '');
    return base === '.' ? clean : base + '/' + clean;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getActiveNavKey() {
    if (typeof document === 'undefined') return 'home';
    return document.documentElement.getAttribute('data-nav') || '';
  }

  function renderHeader() {
    const headerHost = document.getElementById('site-header');
    if (!headerHost) return;

    const active = getActiveNavKey();
    const profile = root.MPA_STORAGE ? root.MPA_STORAGE.getProfile() : { nickname: 'Guest', avatar: '👾' };
    const favCount = root.MPA_STORAGE ? root.MPA_STORAGE.getFavorites().length : 0;
    const soundOn = root.MPA_STORAGE ? root.MPA_STORAGE.isSoundEnabled() : true;

    const navItems = [
      { key: 'home', label: 'Home', href: resolveUrl('index.html') },
      { key: 'all-games', label: 'All Games', href: resolveUrl('pages/all-games.html') },
      { key: 'categories', label: 'Categories', href: resolveUrl('pages/categories.html') },
      { key: 'daily', label: 'Daily Challenge', href: resolveUrl('pages/daily-challenge.html') },
      { key: 'leaderboard', label: 'Leaderboard', href: resolveUrl('pages/leaderboard.html') },
      {
        key: 'favorites',
        label: 'Favorites',
        href: resolveUrl('pages/favorites.html'),
        badge: favCount > 0 ? String(favCount) : ''
      },
      { key: 'about', label: 'About', href: resolveUrl('pages/about.html') }
    ];

    function buildLinks() {
      return navItems.map(function (item) {
        const cls = 'nav-link' + (active === item.key ? ' active' : '');
        const badgeHtml = item.badge
          ? ' <span class="nav-badge" data-fav-count-badge>' + escapeHtml(item.badge) + '</span>'
          : (item.key === 'favorites' ? ' <span class="nav-badge" data-fav-count-badge style="display:none">0</span>' : '');
        return '<a class="' + cls + '" href="' + item.href + '">' + escapeHtml(item.label) + badgeHtml + '</a>';
      }).join('');
    }

    headerHost.className = 'site-header';
    headerHost.innerHTML =
      '<div class="container header-inner">' +
        '<a class="brand-logo" href="' + resolveUrl('index.html') + '" aria-label="Mini Play Arcade Home">' +
          '<img src="' + resolveUrl('images/logo.svg') + '" alt="MINI PLAY ARCADE Logo" width="188" height="44" />' +
        '</a>' +
        '<nav class="primary-nav" aria-label="Primary Navigation">' +
          buildLinks() +
        '</nav>' +
        '<div class="header-actions">' +
          '<button type="button" class="icon-btn" id="header-sound-btn" aria-label="Toggle Sound Effects" title="Toggle Arcade Sound">' +
            (soundOn ? '🔊' : '🔇') +
          '</button>' +
          '<button type="button" class="profile-pill" id="header-profile-btn" aria-label="Open Guest Player Profile">' +
            '<span class="profile-pill-avatar" data-profile-avatar>' + escapeHtml(profile.avatar) + '</span>' +
            '<span class="profile-pill-name" data-profile-name>' + escapeHtml(profile.nickname) + '</span>' +
          '</button>' +
          '<button type="button" class="icon-btn mobile-menu-btn" id="mobile-menu-toggle" aria-expanded="false" aria-controls="mobile-nav-drawer" aria-label="Toggle Navigation Menu">' +
            '☰' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<nav class="mobile-nav-drawer" id="mobile-nav-drawer" aria-label="Mobile Navigation">' +
        '<div class="mobile-nav-grid">' + buildLinks() + '</div>' +
      '</nav>';

    const soundBtn = document.getElementById('header-sound-btn');
    if (soundBtn && root.MPA_STORAGE) {
      soundBtn.addEventListener('click', function () {
        const enabled = root.MPA_STORAGE.toggleSound();
        soundBtn.textContent = enabled ? '🔊' : '🔇';
        if (enabled && root.MPA_SOUND) root.MPA_SOUND.play('click');
        document.querySelectorAll('[data-game-sound-btn]').forEach(function (b) {
          b.innerHTML = (enabled ? '🔊' : '🔇') + ' <span class="btn-text">' + (enabled ? 'Sound' : 'Muted') + '</span>';
        });
      });
    }

    const profileBtn = document.getElementById('header-profile-btn');
    if (profileBtn) {
      profileBtn.addEventListener('click', function () {
        openProfileModal();
      });
    }

    const menuBtn = document.getElementById('mobile-menu-toggle');
    const drawer = document.getElementById('mobile-nav-drawer');
    if (menuBtn && drawer) {
      menuBtn.addEventListener('click', function () {
        const isOpen = drawer.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        menuBtn.textContent = isOpen ? '✕' : '☰';
      });
    }
  }

  function renderFooter() {
    const footerHost = document.getElementById('site-footer');
    if (!footerHost) return;

    const year = new Date().getFullYear();

    footerHost.className = 'site-footer';
    footerHost.innerHTML =
      '<div class="container">' +
        '<div class="mpa-ad-slot mpa-ad-collapsed" data-mpa-ad-slot="FOOTER_BANNER" aria-hidden="true"></div>' +
        '<div class="footer-grid">' +
          '<div class="footer-col">' +
            '<a class="brand-logo" href="' + resolveUrl('index.html') + '" style="margin-bottom:12px">' +
              '<img src="' + resolveUrl('images/logo.svg') + '" alt="MINI PLAY ARCADE" width="176" height="41" />' +
            '</a>' +
            '<p style="color:var(--text-muted);font-size:0.9rem;margin:0 0 12px">' +
              '<strong>PLAY. COMPETE. REPEAT.</strong> Instant, zero-download HTML5 browser games built for speed on mobile, tablet, and desktop.' +
            '</p>' +
            '<span class="chip">100% Free • No Login Required</span>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h3>Explore Arcade</h3>' +
            '<ul class="footer-links">' +
              '<li><a href="' + resolveUrl('index.html') + '">Home</a></li>' +
              '<li><a href="' + resolveUrl('pages/all-games.html') + '">All Games</a></li>' +
              '<li><a href="' + resolveUrl('pages/categories.html') + '">Game Categories</a></li>' +
              '<li><a href="' + resolveUrl('pages/daily-challenge.html') + '">Daily Challenge</a></li>' +
              '<li><a href="' + resolveUrl('pages/leaderboard.html') + '">Leaderboard</a></li>' +
              '<li><a href="' + resolveUrl('pages/favorites.html') + '">My Favorites &amp; Stats</a></li>' +
            '</ul>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h3>Popular Games</h3>' +
            '<ul class="footer-links">' +
              '<li><a href="' + resolveUrl('games/stack-master.html') + '">Stack Master</a></li>' +
              '<li><a href="' + resolveUrl('games/fruit-merge.html') + '">Fruit Merge</a></li>' +
              '<li><a href="' + resolveUrl('games/color-switch-rush.html') + '">Color Switch Rush</a></li>' +
              '<li><a href="' + resolveUrl('games/brain-trap.html') + '">Brain Trap (30 Levels)</a></li>' +
              '<li><a href="' + resolveUrl('games/guess-the-emoji.html') + '">Guess The Emoji (100 Clues)</a></li>' +
              '<li><a href="' + resolveUrl('games/mini-golf-crazy.html') + '">Mini Golf Crazy (20 Holes)</a></li>' +
            '</ul>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h3>Company &amp; Legal</h3>' +
            '<ul class="footer-links">' +
              '<li><a href="' + resolveUrl('pages/about.html') + '">About Us</a></li>' +
              '<li><a href="' + resolveUrl('pages/contact.html') + '">Contact Us</a></li>' +
              '<li><a href="' + resolveUrl('pages/privacy-policy.html') + '">Privacy Policy</a></li>' +
              '<li><a href="' + resolveUrl('pages/terms.html') + '">Terms and Conditions</a></li>' +
              '<li><a href="' + resolveUrl('pages/disclaimer.html') + '">Disclaimer</a></li>' +
              '<li><a href="' + resolveUrl('pages/cookie-policy.html') + '">Cookie Policy</a></li>' +
              '<li><button type="button" class="footer-link-btn" data-open-consent>Manage Cookie Preferences</button></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<span>&copy; ' + year + ' MINI PLAY ARCADE. All games &amp; original graphics created for instant browser play.</span>' +
          '<span>Progress is saved locally in your browser via LocalStorage.</span>' +
        '</div>' +
      '</div>';

    footerHost.querySelectorAll('[data-open-consent]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showConsentBanner(true);
      });
    });
  }

  function renderGameCardHtml(game, opts) {
    const options = opts || {};
    const isFav = root.MPA_STORAGE ? root.MPA_STORAGE.isFavorite(game.id) : false;
    const best = root.MPA_STORAGE ? root.MPA_STORAGE.getBestScore(game.id) : 0;
    const gameHref = resolveUrl(game.url);
    const thumbSrc = resolveUrl(game.thumbnail);

    let topLeftBadge = '';
    if (options.showTrendingRank && game.trendingRank) {
      topLeftBadge = '<span class="chip chip-amber">🔥 #' + game.trendingRank + ' Trending</span>';
    } else if (game.featured) {
      topLeftBadge = '<span class="chip chip-purple">✨ Featured</span>';
    } else {
      topLeftBadge = '<span></span>';
    }

    return (
      '<article class="game-card" data-game-id="' + escapeHtml(game.id) + '">' +
        '<div class="game-card-thumb-wrap">' +
          '<a href="' + gameHref + '" tabindex="-1" aria-hidden="true">' +
            '<img class="game-card-thumb" src="' + thumbSrc + '" alt="' + escapeHtml(game.title + ' — ' + game.category + ' browser game thumbnail') + '" width="480" height="300" loading="lazy" />' +
          '</a>' +
          '<div class="game-card-badges">' +
            topLeftBadge +
            '<button type="button" class="fav-toggle-btn' + (isFav ? ' active' : '') + '" data-fav-btn="' + escapeHtml(game.id) + '" aria-label="' + (isFav ? 'Remove ' : 'Save ') + escapeHtml(game.title) + ' to Favorites" title="Toggle Favorite">' +
              (isFav ? '♥' : '♡') +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="game-card-body">' +
          '<div class="game-card-meta">' +
            '<span class="chip">' + escapeHtml(game.category) + '</span>' +
            (best > 0 ? '<span class="game-card-best" title="Your Personal Best">🏆 ' + best.toLocaleString() + '</span>' : '') +
          '</div>' +
          '<h3 class="game-card-title"><a href="' + gameHref + '">' + escapeHtml(game.title) + '</a></h3>' +
          '<p class="game-card-desc">' + escapeHtml(game.shortDescription) + '</p>' +
          '<div class="game-card-footer">' +
            '<a class="btn btn-primary btn-sm" href="' + gameHref + '">▶ Play Now</a>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function bindFavoriteButtons(container) {
    const scope = container || document;
    scope.querySelectorAll('[data-fav-btn]').forEach(function (btn) {
      if (btn.getAttribute('data-bound') === 'true') return;
      btn.setAttribute('data-bound', 'true');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const gameId = btn.getAttribute('data-fav-btn');
        if (!root.MPA_STORAGE) return;
        const active = root.MPA_STORAGE.toggleFavorite(gameId);
        if (root.MPA_SOUND) root.MPA_SOUND.play('click');
        syncAllFavoriteButtons(gameId, active);
      });
    });
  }

  function syncAllFavoriteButtons(gameId, active) {
    document.querySelectorAll('[data-fav-btn="' + gameId + '"]').forEach(function (btn) {
      btn.classList.toggle('active', active);
      btn.textContent = active ? '♥' : '♡';
    });
    const favCount = root.MPA_STORAGE ? root.MPA_STORAGE.getFavorites().length : 0;
    document.querySelectorAll('[data-fav-count-badge]').forEach(function (badge) {
      if (favCount > 0) {
        badge.textContent = String(favCount);
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    });
  }

  function ensureToastContainer() {
    let stack = document.getElementById('mpa-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'mpa-toast-stack';
      stack.className = 'toast-stack';
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    return stack;
  }

  function showToast(message, icon) {
    if (typeof document === 'undefined') return;
    const stack = ensureToastContainer();
    const item = document.createElement('div');
    item.className = 'toast-item';
    item.innerHTML =
      '<span style="font-size:1.35rem">' + escapeHtml(icon || '✨') + '</span>' +
      '<div>' + escapeHtml(message) + '</div>';
    stack.appendChild(item);
    setTimeout(function () {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 3600);
  }

  function notifyAchievement(achievementId) {
    if (!root.MPA_DATA || !root.MPA_DATA.ACHIEVEMENTS) return;
    const ach = root.MPA_DATA.ACHIEVEMENTS.find(function (a) { return a.id === achievementId; });
    if (!ach) return;
    showToast('Achievement Unlocked: ' + ach.title + '!', ach.icon);
  }

  function openProfileModal() {
    if (typeof document === 'undefined' || !root.MPA_STORAGE) return;
    let modal = document.getElementById('mpa-profile-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mpa-profile-modal';
      modal.className = 'modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Guest Player Profile');
      document.body.appendChild(modal);
      modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.classList.remove('open');
      });
    }

    const profile = root.MPA_STORAGE.getProfile();
    const stats = root.MPA_STORAGE.getSummaryStats();
    const state = root.MPA_STORAGE.getState();
    const avatars = root.MPA_STORAGE.AVATARS;
    const totalAch = (root.MPA_DATA && root.MPA_DATA.ACHIEVEMENTS) ? root.MPA_DATA.ACHIEVEMENTS.length : 12;

    modal.innerHTML =
      '<div class="modal-card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
          '<h2 style="margin:0;font-size:1.35rem">👾 Guest Player Profile</h2>' +
          '<button type="button" class="icon-btn" id="close-profile-modal" aria-label="Close Profile">✕</button>' +
        '</div>' +
        '<p style="margin:0 0 16px;color:var(--text-muted);font-size:0.88rem">' +
          'No account or sign-up required! Customize your local guest handle and avatar—everything saves automatically in your browser.' +
        '</p>' +
        '<label for="guest-nickname-input" style="display:block;font-size:0.84rem;font-weight:700;margin-bottom:6px">Display Nickname</label>' +
        '<input id="guest-nickname-input" type="text" maxlength="20" value="' + escapeHtml(profile.nickname) + '" ' +
          'style="width:100%;padding:11px 14px;border-radius:12px;border:1px solid var(--border-subtle);background:#070a19;color:#fff;font-size:0.95rem;margin-bottom:14px" />' +
        '<div style="font-size:0.84rem;font-weight:700;margin-bottom:6px">Choose Avatar</div>' +
        '<div class="avatar-picker-grid">' +
          avatars.map(function (av) {
            return '<button type="button" class="avatar-option' + (av === profile.avatar ? ' selected' : '') + '" data-pick-avatar="' + escapeHtml(av) + '">' + escapeHtml(av) + '</button>';
          }).join('') +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px">' +
          '<div class="go-stat"><span>Games Played</span><strong>' + stats.totalGamesPlayed + '</strong></div>' +
          '<div class="go-stat"><span>Best Pts Sum</span><strong>' + stats.totalBestPoints.toLocaleString() + '</strong></div>' +
          '<div class="go-stat"><span>Achievements</span><strong>' + stats.unlockedAchievements + '/' + totalAch + '</strong></div>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px">' +
          '<a class="btn btn-secondary btn-sm" href="' + resolveUrl('pages/favorites.html') + '">View Full Stats &amp; Badges</a>' +
          '<button type="button" class="btn btn-primary btn-sm" id="save-profile-btn">Save Profile</button>' +
        '</div>' +
        (stats.totalGamesPlayed > 0
          ? '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-subtle);text-align:right">' +
              '<button type="button" id="reset-local-data-btn" style="background:none;border:none;color:#f87171;font-size:0.8rem;cursor:pointer;text-decoration:underline">Reset Local Browser Data</button>' +
            '</div>'
          : '') +
      '</div>';

    let chosenAvatar = profile.avatar;
    modal.querySelectorAll('[data-pick-avatar]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        chosenAvatar = btn.getAttribute('data-pick-avatar');
        modal.querySelectorAll('[data-pick-avatar]').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
      });
    });

    modal.querySelector('#close-profile-modal').addEventListener('click', function () {
      modal.classList.remove('open');
    });

    modal.querySelector('#save-profile-btn').addEventListener('click', function () {
      const nickInput = modal.querySelector('#guest-nickname-input');
      const updated = root.MPA_STORAGE.updateProfile({
        nickname: nickInput ? nickInput.value : profile.nickname,
        avatar: chosenAvatar
      });
      document.querySelectorAll('[data-profile-name]').forEach(function (el) { el.textContent = updated.nickname; });
      document.querySelectorAll('[data-profile-avatar]').forEach(function (el) { el.textContent = updated.avatar; });
      modal.classList.remove('open');
      showToast('Guest profile saved as ' + updated.nickname + '!', updated.avatar);
    });

    const resetBtn = modal.querySelector('#reset-local-data-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (root.confirm && !root.confirm('Reset your locally saved guest scores, favorites, and achievements in this browser?')) {
          return;
        }
        root.MPA_STORAGE.resetAllProgress();
        modal.classList.remove('open');
        showToast('Local guest progress has been reset.', '🔄');
        if (root.location && typeof root.location.reload === 'function') {
          root.location.reload();
        }
      });
    }

    // Prevent unused variable lint
    void state;
    modal.classList.add('open');
  }

  function showConsentBanner(forceOpen) {
    if (typeof document === 'undefined' || !root.MPA_STORAGE) return;
    const existingChoice = root.MPA_STORAGE.getConsent();
    if (existingChoice && !forceOpen) return;

    let banner = document.getElementById('mpa-consent-banner');
    if (!banner) {
      banner = document.createElement('aside');
      banner.id = 'mpa-consent-banner';
      banner.className = 'consent-banner';
      banner.setAttribute('aria-label', 'Cookie and Storage Preferences');
      banner.innerHTML =
        '<div class="consent-text">' +
          '<strong>🍪 Cookies &amp; Browser Storage Notice:</strong> Mini Play Arcade uses browser LocalStorage to save your high scores, favorites, and guest settings locally. When Google AdSense advertising is enabled, third-party partners may use cookies to serve relevant ads. Read our ' +
          '<a href="' + resolveUrl('pages/privacy-policy.html') + '">Privacy Policy</a> and ' +
          '<a href="' + resolveUrl('pages/cookie-policy.html') + '">Cookie Policy</a>.' +
        '</div>' +
        '<div class="consent-actions">' +
          '<button type="button" class="btn btn-secondary btn-sm" id="consent-essential-btn">Essential Only</button>' +
          '<button type="button" class="btn btn-primary btn-sm" id="consent-accept-btn">Accept All</button>' +
        '</div>';
      document.body.appendChild(banner);

      banner.querySelector('#consent-essential-btn').addEventListener('click', function () {
        root.MPA_STORAGE.setConsent({ advertising: false });
        banner.classList.remove('visible');
        showToast('Saved: Essential browser storage only.', '🛡️');
      });

      banner.querySelector('#consent-accept-btn').addEventListener('click', function () {
        root.MPA_STORAGE.setConsent({ advertising: true });
        banner.classList.remove('visible');
        showToast('Cookie preferences saved.', '✅');
      });
    }

    banner.classList.add('visible');
  }

  function initSharedLayout() {
    renderHeader();
    renderFooter();
    showConsentBanner(false);
    if (root.MPA_ADS && typeof root.MPA_ADS.initAdSlots === 'function') {
      root.MPA_ADS.initAdSlots();
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSharedLayout);
    } else {
      initSharedLayout();
    }
  }

  root.MPA_UI = {
    getBasePath: getBasePath,
    resolveUrl: resolveUrl,
    escapeHtml: escapeHtml,
    renderGameCardHtml: renderGameCardHtml,
    bindFavoriteButtons: bindFavoriteButtons,
    syncAllFavoriteButtons: syncAllFavoriteButtons,
    showToast: showToast,
    notifyAchievement: notifyAchievement,
    openProfileModal: openProfileModal,
    showConsentBanner: showConsentBanner,
    initSharedLayout: initSharedLayout
  };
})(typeof window !== 'undefined' ? window : globalThis);
