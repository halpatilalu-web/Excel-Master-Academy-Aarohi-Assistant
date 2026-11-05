/**
 * MINI PLAY ARCADE — Google AdSense Configuration
 * ================================================
 * IMPORTANT:
 * 1. Keep ADS_ENABLED = false until your domain is officially reviewed and
 *    approved in your Google AdSense account.
 * 2. Never invent a publisher ID or slot ID. Replace the placeholders below
 *    ONLY with the exact values provided inside your Google AdSense dashboard.
 * 3. See ADSENSE_SETUP.md in the project root for step-by-step setup instructions.
 */
(function (root) {
  'use strict';

  const ADS_CONFIG = {
    // Master switch: set to true ONLY after official Google AdSense approval
    ADS_ENABLED: false,

    // Replace with your real publisher ID from Google AdSense (format: "ca-pub-XXXXXXXXXXXXXXXX")
    ADS_CLIENT_ID: 'YOUR_ADSENSE_PUBLISHER_ID',

    // Optional layout test mode for developers/site owners before going live.
    // Keep false in production so visitors never see placeholder boxes.
    ADS_PREVIEW_MODE: false,

    // Require visitor cookie/advertising consent before requesting personalized ads
    REQUIRE_CONSENT: true,

    // Responsive AdSense unit slot IDs (replace each placeholder with your AdSense unit ID)
    SLOTS: {
      HOME_BELOW_HERO: 'YOUR_HOME_HERO_SLOT_ID',
      HOME_BETWEEN_SECTIONS: 'YOUR_HOME_MID_SLOT_ID',
      LIBRARY_BETWEEN_ROWS: 'YOUR_LIBRARY_ROW_SLOT_ID',
      GAME_BELOW_INSTRUCTIONS: 'YOUR_GAME_INSTRUCTIONS_SLOT_ID',
      GAME_BELOW_STAGE: 'YOUR_GAME_BELOW_STAGE_SLOT_ID',
      FOOTER_BANNER: 'YOUR_FOOTER_SLOT_ID'
    }
  };

  root.MPA_ADS_CONFIG = Object.freeze(ADS_CONFIG);
})(typeof window !== 'undefined' ? window : globalThis);
