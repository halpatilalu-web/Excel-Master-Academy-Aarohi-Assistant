/**
 * MINI PLAY ARCADE — Master Game Catalog, Categories & Achievements
 * All descriptions and game concepts are original browser mini-games.
 */
(function (root) {
  'use strict';

  const CATEGORIES = [
    {
      id: 'all',
      name: 'All Games',
      icon: '🎮',
      description: 'Browse every instant-play browser game in Mini Play Arcade.'
    },
    {
      id: 'Arcade',
      name: 'Arcade',
      icon: '🕹️',
      description: 'High-tempo score chasers built around timing, rhythm, and precision.'
    },
    {
      id: 'Puzzle',
      name: 'Puzzle',
      icon: '🧩',
      description: 'Smart spatial, merging, and word-logic challenges for sharp minds.'
    },
    {
      id: 'Reaction',
      name: 'Reaction',
      icon: '⚡',
      description: 'Split-second reflex tests where every millisecond counts.'
    },
    {
      id: 'Casual',
      name: 'Casual',
      icon: '✨',
      description: 'Pick-up-and-play sessions with satisfying combos and unlockables.'
    },
    {
      id: 'Sports',
      name: 'Sports',
      icon: '🏆',
      description: 'Physics-powered acrobatics and trick-shot mini golf courses.'
    },
    {
      id: 'Brain Games',
      name: 'Brain Games',
      icon: '🧠',
      description: 'Lateral thinking riddles, interactive traps, and clever visual clues.'
    }
  ];

  const GAMES = [
    {
      id: 'stack-master',
      slug: 'stack-master',
      title: 'Stack Master',
      tagline: 'Drop neon slabs with millimeter precision.',
      shortDescription: 'Align sliding neon blocks to build a sky-high tower. Chain perfect drops for combo bonuses and slab expansion.',
      seoDescription: 'Play Stack Master free online at Mini Play Arcade. Time each sliding block, trigger perfect-drop shockwaves, build combo streaks, and set a new tower high score.',
      category: 'Arcade',
      categories: ['Arcade', 'Reaction', 'Casual'],
      featured: true,
      trending: true,
      trendingRank: 1,
      difficulty: 'Easy to Learn',
      controls: 'Tap, Click, or Press Space / Down Arrow to drop the moving block.',
      instructions: [
        'Watch the glowing block glide across the top of your tower.',
        'Tap, click, or press Spacebar at the exact moment it aligns with the slab below.',
        'Any overhanging edge is sliced off—making your next target narrower!',
        'Land Perfect Drops in a row to earn escalating combo points and widen your tower.'
      ],
      dailyTargetScore: 350,
      dailyInstruction: 'Reach at least 350 points by chaining Perfect Drops in Stack Master.',
      accent: '#a855f7',
      thumbnail: 'images/games/stack-master.svg',
      url: 'games/stack-master.html'
    },
    {
      id: 'color-switch-rush',
      slug: 'color-switch-rush',
      title: 'Color Switch Rush',
      tagline: 'Bounce through spinning neon rings that match your glow.',
      shortDescription: 'Guide an energy orb upward through rotating multi-color barriers, grab stars, and adapt as your color shifts.',
      seoDescription: 'Play Color Switch Rush in your browser with no downloads. Bounce through matching-color spinning obstacles, collect stars, and survive faster neon stages.',
      category: 'Arcade',
      categories: ['Arcade', 'Reaction'],
      featured: true,
      trending: true,
      trendingRank: 3,
      difficulty: 'Medium',
      controls: 'Tap, Click, or Press Space / Up Arrow to bounce upward.',
      instructions: [
        'Tap, click, or press Space repeatedly to keep your glowing orb airborne.',
        'Only pass through obstacle segments that match your current orb color.',
        'Collect floating stars inside obstacles to boost your score.',
        'Touch chromatic switcher orbs to shift into a new color before the next barrier.'
      ],
      dailyTargetScore: 180,
      dailyInstruction: 'Score 180 or more in Color Switch Rush by collecting stars and clearing color gates.',
      accent: '#06b6d4',
      thumbnail: 'images/games/color-switch-rush.svg',
      url: 'games/color-switch-rush.html'
    },
    {
      id: 'fruit-merge',
      slug: 'fruit-merge',
      title: 'Fruit Merge',
      tagline: 'Drop, bounce, and fuse matching fruits up to the Giant Melon.',
      shortDescription: 'Aim and drop physics-driven fruits into the neon jar. Identical fruits fuse into bigger tiers and trigger chain multipliers.',
      seoDescription: 'Play Fruit Merge free online at Mini Play Arcade. Aim fruit drops, combine matching fruits with realistic 2D physics, chain score multipliers, and reach the Giant Watermelon.',
      category: 'Puzzle',
      categories: ['Puzzle', 'Casual'],
      featured: true,
      trending: true,
      trendingRank: 2,
      difficulty: 'Strategic',
      controls: 'Move Mouse / Drag Finger or use Left/Right Arrows to aim; Click, Release, or Press Space to drop.',
      instructions: [
        'Slide horizontally to position your drop laser inside the container.',
        'Release, click, or press Space to drop the current fruit—check the Next preview to plan ahead.',
        'When two identical fruits touch, they merge into the next larger fruit tier.',
        'Chain merges quickly for up to a 4x combo multiplier, and keep the stack below the top danger line!'
      ],
      dailyTargetScore: 900,
      dailyInstruction: 'Fuse fruits to score at least 900 points in a single Fruit Merge run.',
      accent: '#ec4899',
      thumbnail: 'images/games/fruit-merge.svg',
      url: 'games/fruit-merge.html'
    },
    {
      id: 'tap-speed-challenge',
      slug: 'tap-speed-challenge',
      title: 'Tap Speed Challenge',
      tagline: 'Measure your true reflex speed down to the millisecond.',
      shortDescription: 'Wait for the randomized cyber-green flash across five intense rounds, avoid false starts, and benchmark your millisecond reflexes.',
      seoDescription: 'Test your reaction speed in milliseconds with Tap Speed Challenge at Mini Play Arcade. Five randomized reflex rounds, personal best tracking, and instant performance ranks.',
      category: 'Reaction',
      categories: ['Reaction', 'Arcade'],
      featured: false,
      trending: true,
      trendingRank: 5,
      difficulty: 'Pure Reflex',
      controls: 'Tap the arena, Click, or Press Space the instant the screen turns Cyber Green.',
      instructions: [
        'Each match consists of 5 precision reaction rounds.',
        'Hold steady while the arena glows Crimson/Amber—tapping early counts as a False Start and resets that round.',
        'The instant the signal flashes Cyber Green, tap, click, or hit Spacebar as fast as humanly possible.',
        'Complete all 5 rounds to record your average millisecond reaction time and arcade reflex score.'
      ],
      dailyTargetScore: 1300,
      dailyInstruction: 'Achieve a reflex score of 1,300+ (under ~240ms average) in Tap Speed Challenge.',
      accent: '#10b981',
      thumbnail: 'images/games/tap-speed-challenge.svg',
      url: 'games/tap-speed-challenge.html'
    },
    {
      id: 'flip-master',
      slug: 'flip-master',
      title: 'Flip Master',
      tagline: 'Charge your leap, tuck mid-air, and stick bullseye landings.',
      shortDescription: 'Launch between platforms of varying height and distance, spin daring backflips for multipliers, and nail clean landings.',
      seoDescription: 'Play Flip Master free in your browser. Charge physics-driven jumps, tuck in mid-air for flips, collect sky rings, and stick bullseye platform landings.',
      category: 'Sports',
      categories: ['Sports', 'Arcade'],
      featured: true,
      trending: false,
      trendingRank: 0,
      difficulty: 'Skillful',
      controls: 'Hold Touch / Mouse / Space to charge jump, release to leap, hold in mid-air to spin, release to lock landing.',
      instructions: [
        'Press and hold to crouch and build jump power toward the next platform.',
        'Release to launch into the air and collect floating energy rings along your arc.',
        'Hold again while airborne to tuck and rotate through frontflips or backflips.',
        'Release before touchdown so your jumper straightens out and sticks the bullseye!'
      ],
      dailyTargetScore: 400,
      dailyInstruction: 'Land flips and bullseyes to reach 400 points in Flip Master.',
      accent: '#3b82f6',
      thumbnail: 'images/games/flip-master.svg',
      url: 'games/flip-master.html'
    },
    {
      id: 'dont-fall',
      slug: 'dont-fall',
      title: "Don't Fall",
      tagline: 'Sprint across neon sky-bridges, double-jump hazards, and unlock runners.',
      shortDescription: 'Dash across suspended platforms at rising speeds, leap gaps and laser spikes, bank arcade coins, and unlock 6 cosmetic runners.',
      seoDescription: "Play Don't Fall endless runner online at Mini Play Arcade. Double-jump over gaps and spikes, collect coins, and unlock custom neon runner skins.",
      category: 'Casual',
      categories: ['Casual', 'Arcade', 'Reaction'],
      featured: true,
      trending: true,
      trendingRank: 4,
      difficulty: 'Fast-Paced',
      controls: 'Tap, Click, or Press Space / Up Arrow to Jump; tap again in mid-air to Double Jump.',
      instructions: [
        'Your runner sprints automatically across suspended cyber sky-bridges.',
        'Tap, click, or press Space to jump over laser spikes and bottomless gaps.',
        'Press jump a second time in mid-air to execute a high-arc Double Jump.',
        'Collect golden coins during every run and open the Runner Shop to unlock 6 cosmetic characters!'
      ],
      dailyTargetScore: 550,
      dailyInstruction: "Survive the sky-bridges and score 550+ points in Don't Fall.",
      accent: '#f59e0b',
      thumbnail: 'images/games/dont-fall.svg',
      url: 'games/dont-fall.html'
    },
    {
      id: 'brain-trap',
      slug: 'brain-trap',
      title: 'Brain Trap',
      tagline: '30 lateral-thinking puzzles where nothing is quite what it seems.',
      shortDescription: 'Drag hidden objects, question trick instructions, balance scales, and crack 30 original interactive riddles across 3 difficulty tiers.',
      seoDescription: 'Challenge your mind with 30 original interactive levels in Brain Trap at Mini Play Arcade. Drag clues, use hints wisely, and outsmart every lateral-thinking puzzle.',
      category: 'Brain Games',
      categories: ['Brain Games', 'Puzzle'],
      featured: true,
      trending: true,
      trendingRank: 6,
      difficulty: 'Easy → Hard (30 Levels)',
      controls: 'Click, Tap, or Drag interactive objects and words inside the puzzle stage.',
      instructions: [
        'Read the prompt carefully—sometimes the wording itself hides a twist!',
        'Tap, click, or drag objects around the stage to uncover concealed items or switches.',
        'Stuck on a tricky stage? Use the Hint button for a clever nudge without spoiling the fun.',
        'Clear levels across Easy, Medium, and Hard tiers to unlock all 30 Brain Trap stages.'
      ],
      dailyTargetScore: 500,
      dailyInstruction: 'Solve puzzles in Brain Trap to earn at least 500 points.',
      accent: '#8b5cf6',
      thumbnail: 'images/games/brain-trap.svg',
      url: 'games/brain-trap.html'
    },
    {
      id: 'bubble-pop-frenzy',
      slug: 'bubble-pop-frenzy',
      title: 'Bubble Pop Frenzy',
      tagline: 'Chain massive bubble clusters, trigger bombs, and race the clock.',
      shortDescription: 'Pop matching bubble clusters in a 60-second blitz, build up to 10x speed combos, and detonate Bomb, Laser, Prism, and Chrono bubbles.',
      seoDescription: 'Play Bubble Pop Frenzy free online. Pop matching bubble groups, trigger special bomb and rainbow bubbles, build 10x combos, and beat the timer.',
      category: 'Casual',
      categories: ['Casual', 'Puzzle', 'Reaction'],
      featured: false,
      trending: false,
      trendingRank: 0,
      difficulty: 'Energetic',
      controls: 'Tap or Click any connected group of 2+ matching bubbles, or tap any Special Bubble.',
      instructions: [
        'Tap or click any connected cluster of 2 or more matching colored bubbles to pop them.',
        'Larger clusters award exponentially higher points and charge spawning of Special Bubbles.',
        'Pop consecutive clusters within 1.6 seconds to climb all the way to a 10x Frenzy Multiplier.',
        'Trigger Bomb (3x3 blast), Laser (full row), Prism (color wipe), and Chrono (+5s time) bubbles before the clock hits zero!'
      ],
      dailyTargetScore: 1800,
      dailyInstruction: 'Trigger combos and special bubbles to score 1,800+ in Bubble Pop Frenzy.',
      accent: '#22d3ee',
      thumbnail: 'images/games/bubble-pop-frenzy.svg',
      url: 'games/bubble-pop-frenzy.html'
    },
    {
      id: 'guess-the-emoji',
      slug: 'guess-the-emoji',
      title: 'Guess The Emoji',
      tagline: 'Decode 100 clever emoji clues before the countdown runs out.',
      shortDescription: 'Solve 100 original emoji puzzles spanning Movies, Food, Compound Words, Science, Sports, and Idioms with streak multipliers.',
      seoDescription: 'Play Guess The Emoji online with 100 original clues across 6 categories. Beat the countdown timer, build 5x streak multipliers, and test your wit.',
      category: 'Puzzle',
      categories: ['Puzzle', 'Brain Games', 'Casual'],
      featured: false,
      trending: false,
      trendingRank: 0,
      difficulty: 'Progressive (100 Clues)',
      controls: 'Tap/Click the correct answer option, use 50/50 or Hint tools, or press keys 1–4 on your keyboard.',
      instructions: [
        'Study the emoji combination and its category tag at the top of the card.',
        'Select the matching phrase or word before the countdown bar runs out—faster answers earn time bonuses!',
        'Build consecutive streaks to boost your score multiplier up to 5x.',
        'Progress from breezy 2-emoji warmups to tricky multi-emoji brainteasers across 100 original questions.'
      ],
      dailyTargetScore: 1000,
      dailyInstruction: 'Decode emoji clues and build streaks to score 1,000+ in Guess The Emoji.',
      accent: '#f43f5e',
      thumbnail: 'images/games/guess-the-emoji.svg',
      url: 'games/guess-the-emoji.html'
    },
    {
      id: 'mini-golf-crazy',
      slug: 'mini-golf-crazy',
      title: 'Mini Golf Crazy',
      tagline: 'Master 20 trick-shot neon courses packed with bumpers, sand, and hazards.',
      shortDescription: 'Drag to aim and gauge shot power across 20 handcrafted mini golf holes featuring angled walls, bumpers, sand traps, water, and moving gates.',
      seoDescription: 'Play Mini Golf Crazy free in your browser with 20 playable holes, drag-to-aim physics, bumpers, sand traps, moving obstacles, and stroke-under-par scoring.',
      category: 'Sports',
      categories: ['Sports', 'Puzzle', 'Casual'],
      featured: true,
      trending: false,
      trendingRank: 0,
      difficulty: '20 Courses',
      controls: 'Click or Touch and drag backward to set aim direction and shot power, then release to putt.',
      instructions: [
        'Touch or click inside the course and drag backward to aim the dotted trajectory line.',
        'Watch the color-coded power meter and release to strike the ball.',
        'Bank shots off neon walls and bouncy bumpers while steering clear of water hazards and sticky sand traps.',
        'Sink the ball in as few strokes as possible across all 20 levels to earn Eagle and Hole-in-One bonuses!'
      ],
      dailyTargetScore: 700,
      dailyInstruction: 'Sink putts at or under par to reach 700+ points in Mini Golf Crazy.',
      accent: '#34d399',
      thumbnail: 'images/games/mini-golf-crazy.svg',
      url: 'games/mini-golf-crazy.html'
    }
  ];

  const ACHIEVEMENTS = [
    {
      id: 'first_play',
      title: 'Coin Inserted',
      description: 'Play your very first game at Mini Play Arcade.',
      icon: '🕹️'
    },
    {
      id: 'explorer_5',
      title: 'Arcade Explorer',
      description: 'Try at least 5 different games in the library.',
      icon: '🧭'
    },
    {
      id: 'all_10_games',
      title: 'Grand Tour Champion',
      description: 'Play all 10 games in Mini Play Arcade.',
      icon: '👑'
    },
    {
      id: 'veteran_25',
      title: '25 Runs Deep',
      description: 'Complete 25 total game sessions.',
      icon: '🔥'
    },
    {
      id: 'favorite_collector',
      title: 'Curator',
      description: 'Save 3 or more games to your Favorites list.',
      icon: '💜'
    },
    {
      id: 'daily_challenger',
      title: 'Daily Contender',
      description: 'Complete a featured Daily Challenge.',
      icon: '🎯'
    },
    {
      id: 'daily_streak_3',
      title: 'Triple Crown Daily',
      description: 'Complete 3 Daily Challenges.',
      icon: '⚡'
    },
    {
      id: 'high_roller_1000',
      title: 'Four-Digit Club',
      description: 'Score 1,000 or more points in any game.',
      icon: '💎'
    },
    {
      id: 'lightning_reflex',
      title: 'Cyber Reflexes',
      description: 'Average under 250ms in Tap Speed Challenge.',
      icon: '⏱️'
    },
    {
      id: 'brain_master',
      title: 'Trap Escape Artist',
      description: 'Clear at least 10 puzzles in Brain Trap.',
      icon: '🧠'
    },
    {
      id: 'emoji_whiz',
      title: 'Emoji Linguist',
      description: 'Build a 10-answer streak in Guess The Emoji.',
      icon: '😎'
    },
    {
      id: 'hole_in_one',
      title: 'Ace Putter',
      description: 'Sink a Hole-in-One in Mini Golf Crazy.',
      icon: '⛳'
    }
  ];

  function getGameById(id) {
    return GAMES.find(function (g) { return g.id === id || g.slug === id; }) || null;
  }

  function getRelatedGames(gameId, count) {
    const limit = count || 4;
    const current = getGameById(gameId);
    if (!current) return GAMES.slice(0, limit);
    return GAMES
      .filter(function (g) { return g.id !== current.id; })
      .map(function (g) {
        let relevance = 0;
        if (g.category === current.category) relevance += 4;
        current.categories.forEach(function (c) {
          if (g.categories.indexOf(c) !== -1) relevance += 2;
        });
        if (g.featured) relevance += 1;
        return { game: g, relevance: relevance };
      })
      .sort(function (a, b) { return b.relevance - a.relevance; })
      .slice(0, limit)
      .map(function (item) { return item.game; });
  }

  root.MPA_DATA = {
    SITE_NAME: 'MINI PLAY ARCADE',
    TAGLINE: 'PLAY. COMPETE. REPEAT.',
    CANONICAL_BASE: 'https://miniplayarcade.example.com',
    CATEGORIES: CATEGORIES,
    GAMES: GAMES,
    ACHIEVEMENTS: ACHIEVEMENTS,
    getGameById: getGameById,
    getRelatedGames: getRelatedGames
  };
})(typeof window !== 'undefined' ? window : globalThis);
