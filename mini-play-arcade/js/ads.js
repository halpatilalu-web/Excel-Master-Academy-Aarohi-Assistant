/**
 * MINI PLAY ARCADE — Google AdSense Safe Loader & Responsive Slot Manager
 * =======================================================================
 * - Keeps advertisements completely disabled until ADS_ENABLED === true and a
 *   valid "ca-pub-..." publisher ID is configured in config/adsense-config.js.
 * - Prevents duplicate AdSense script injection.
 * - Never displays fake advertisements or artificial impressions.
 * - Respects visitor cookie/advertising consent preferences.
 */
(function (root) {
  'use strict';

  let scriptInjected = false;

  function getConfig() {
    return root.MPA_ADS_CONFIG || {
      ADS_ENABLED: false,
      ADS_CLIENT_ID: 'YOUR_ADSENSE_PUBLISHER_ID',
      ADS_PREVIEW_MODE: false,
      REQUIRE_CONSENT: true,
      SLOTS: {}
    };
  }

  function hasValidPublisherId(clientId) {
    if (typeof clientId !== 'string') return false;
    const trimmed = clientId.trim();
    if (!trimmed || trimmed === 'YOUR_ADSENSE_PUBLISHER_ID') return false;
    return /^ca-pub-\d{10,20}$/.test(trimmed);
  }

  function hasValidSlotId(slotId) {
    if (typeof slotId !== 'string') return false;
    const trimmed = slotId.trim();
    if (!trimmed || trimmed.indexOf('YOUR_') === 0) return false;
    return /^\d{6,20}$/.test(trimmed);
  }

  function isLiveAdsReady() {
    const cfg = getConfig();
    return Boolean(cfg.ADS_ENABLED) && hasValidPublisherId(cfg.ADS_CLIENT_ID);
  }

  function injectAdSenseScriptOnce(clientId) {
    if (scriptInjected) return;
    if (typeof document === 'undefined') return;

    const existing = document.querySelector('script[data-mpa-adsense="true"], script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]');
    if (existing) {
      scriptInjected = true;
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(clientId);
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-mpa-adsense', 'true');
    document.head.appendChild(script);
    scriptInjected = true;
  }

  function applyConsentSignal() {
    const cfg = getConfig();
    root.adsbygoogle = root.adsbygoogle || [];
    if (!cfg.REQUIRE_CONSENT || !root.MPA_STORAGE) return true;
    const consent = root.MPA_STORAGE.getConsent();
    if (!consent) {
      // Defer personalized ads until visitor chooses in consent banner; serve non-personalized if loaded
      root.adsbygoogle.requestNonPersonalizedAds = 1;
      return true;
    }
    root.adsbygoogle.requestNonPersonalizedAds = consent.advertising ? 0 : 1;
    return true;
  }

  function initAdSlots(scope) {
    if (typeof document === 'undefined') return;
    const containerRoot = scope || document;
    const cfg = getConfig();
    const containers = containerRoot.querySelectorAll('[data-mpa-ad-slot]');
    const liveReady = isLiveAdsReady();
    const previewMode = Boolean(cfg.ADS_PREVIEW_MODE) && !liveReady;

    if (!liveReady && !previewMode) {
      // Keep ad slots cleanly collapsed when disabled so the UI stays crisp and uncluttered
      containers.forEach(function (el) {
        el.classList.add('mpa-ad-collapsed');
        el.classList.remove('mpa-ad-active', 'mpa-ad-preview');
        el.setAttribute('aria-hidden', 'true');
      });
      return;
    }

    if (liveReady) {
      applyConsentSignal();
      injectAdSenseScriptOnce(cfg.ADS_CLIENT_ID.trim());
    }

    containers.forEach(function (el) {
      if (el.getAttribute('data-mpa-ad-initialized') === 'true') return;

      const slotKey = el.getAttribute('data-mpa-ad-slot');
      const slotId = (cfg.SLOTS && cfg.SLOTS[slotKey]) || '';

      if (previewMode) {
        // Developer layout preview mode ONLY (never enabled in default config)
        el.classList.remove('mpa-ad-collapsed');
        el.classList.add('mpa-ad-preview');
        el.removeAttribute('aria-hidden');
        el.innerHTML =
          '<div class="mpa-ad-reserved-inner">' +
            '<span class="mpa-ad-badge">Advertisement Slot Preview</span>' +
            '<span class="mpa-ad-slot-meta">Slot Key: ' + slotKey + ' (Disabled in Production)</span>' +
          '</div>';
        el.setAttribute('data-mpa-ad-initialized', 'true');
        return;
      }

      if (liveReady && hasValidSlotId(slotId)) {
        el.classList.remove('mpa-ad-collapsed', 'mpa-ad-preview');
        el.classList.add('mpa-ad-active');
        el.removeAttribute('aria-hidden');
        el.innerHTML = '<div class="mpa-ad-label">Advertisement</div>';

        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.setAttribute('data-ad-client', cfg.ADS_CLIENT_ID.trim());
        ins.setAttribute('data-ad-slot', slotId.trim());
        ins.setAttribute('data-ad-format', 'auto');
        ins.setAttribute('data-full-width-responsive', 'true');
        el.appendChild(ins);

        try {
          (root.adsbygoogle = root.adsbygoogle || []).push({});
        } catch (_) {
          /* Ad blocker or deferred script load */
        }
        el.setAttribute('data-mpa-ad-initialized', 'true');
      } else {
        el.classList.add('mpa-ad-collapsed');
        el.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function onConsentUpdated() {
    if (isLiveAdsReady()) {
      applyConsentSignal();
      initAdSlots();
    }
  }

  root.MPA_ADS = {
    getConfig: getConfig,
    isLiveAdsReady: isLiveAdsReady,
    hasValidPublisherId: hasValidPublisherId,
    hasValidSlotId: hasValidSlotId,
    initAdSlots: initAdSlots,
    onConsentUpdated: onConsentUpdated
  };
})(typeof window !== 'undefined' ? window : globalThis);
