/**
 * GAME 7: BRAIN TRAP — 30 Original Interactive Lateral-Thinking Puzzles
 * Mechanics: Draggable obstacles & tools, clickable prompt words, ordered sequence
 * taps, interactive toggle circuits, precision counters, custom hints for all 30
 * levels, 3 difficulty tiers (Easy 1-10, Medium 11-20, Hard 21-30), saved progress.
 */
(function (root) {
  'use strict';

  const PUZZLES = [
    // ==================== TIER 1: EASY (LEVELS 1 - 10) ====================
    {
      id: 1,
      difficulty: 'Easy',
      type: 'select',
      prompt: 'Which one is ACTUALLY the biggest in real life?',
      hint: 'Ignore the icon drawing size on screen—think about real-world scale!',
      explain: 'An elephant is bigger than a mouse, an apple, and a bicycle—even when drawn tiny!',
      items: [
        { id: 'apple', label: '🍎', size: 68, correct: false },
        { id: 'mouse', label: '🐭', size: 74, correct: false },
        { id: 'elephant', label: '🐘', size: 28, correct: true },
        { id: 'bike', label: '🚲', size: 58, correct: false }
      ]
    },
    {
      id: 2,
      difficulty: 'Easy',
      type: 'drag-reveal',
      prompt: 'Wake up the sleepy owl! Find the bright sun.',
      hint: 'That storm cloud looks movable—try dragging it aside!',
      explain: 'The sun was hiding right behind the storm cloud!',
      cover: { icon: '⛈️', size: 84, x: 50, y: 45 },
      hidden: { icon: '☀️', size: 56, x: 50, y: 45 }
    },
    {
      id: 3,
      difficulty: 'Easy',
      type: 'prompt-word',
      prompt: 'Do not fall for decoys! Tap the GREEN button.',
      targetWord: 'GREEN',
      hint: 'Every button below is the wrong color or says the wrong thing. Look at the sentence above!',
      explain: 'The word "GREEN" inside the instruction itself was the only genuine green target!',
      decoys: [
        { label: 'BLUE', bg: '#ef4444' },
        { label: 'RED', bg: '#3b82f6' },
        { label: 'YELLOW', bg: '#a855f7' }
      ]
    },
    {
      id: 4,
      difficulty: 'Easy',
      type: 'drag-tool',
      prompt: 'Unlock the treasure chest!',
      hint: 'Drag the golden key directly onto the locked chest.',
      explain: 'Dragging the key to the lock pops the treasure wide open!',
      tool: { icon: '🔑', label: 'Key', x: 22, y: 55 },
      target: { icon: '🧰', solvedIcon: '💎', label: 'Locked Chest', x: 74, y: 50 },
      decoys: [{ icon: '🪨', x: 48, y: 65 }]
    },
    {
      id: 5,
      difficulty: 'Easy',
      type: 'counter',
      prompt: 'A farmer has 9 sheep. All BUT 6 run away. How many sheep remain?',
      hint: 'Read "all BUT 6" very carefully—no subtraction needed!',
      explain: '"All but 6" means those 6 stayed right where they are!',
      visual: '🐑 🐑 🐑 🐑 🐑 🐑  💨🐑🐑🐑',
      answer: 6
    },
    {
      id: 6,
      difficulty: 'Easy',
      type: 'sequence',
      prompt: 'Tap the numbers from SMALLEST to LARGEST value.',
      hint: 'Watch out for negative signs! -15 is smaller than -2.',
      explain: '-15 < -2 < 0 < 8. Negative numbers flip the magnitude trap!',
      items: [
        { id: 'a', label: '8', order: 4 },
        { id: 'b', label: '-15', order: 1 },
        { id: 'c', label: '0', order: 3 },
        { id: 'd', label: '-2', order: 2 }
      ]
    },
    {
      id: 7,
      difficulty: 'Easy',
      type: 'drag-tool',
      prompt: 'Put out the campfire before leaving camp!',
      hint: 'Drag the water bucket over to the flames.',
      explain: 'Safety first—pouring water douses the campfire cleanly!',
      tool: { icon: '🪣', label: 'Water', x: 20, y: 46 },
      target: { icon: '🔥', solvedIcon: '💨', label: 'Campfire', x: 75, y: 52 },
      decoys: [{ icon: '🪵', x: 48, y: 38 }]
    },
    {
      id: 8,
      difficulty: 'Easy',
      type: 'counter',
      prompt: 'Some months have 31 days; others have 30. How many months have 28 days?',
      hint: 'Does March also reach day 28 on the calendar?',
      explain: 'Every single one of the 12 months has at least 28 days!',
      visual: '📅 Jan • Feb • Mar • Apr • May • Jun ... Dec',
      answer: 12
    },
    {
      id: 9,
      difficulty: 'Easy',
      type: 'drag-reveal',
      prompt: 'Where did the magician hide the white rabbit?',
      hint: 'Drag the top hat upward to peek underneath!',
      explain: 'Classic magic trick—the rabbit was tucked right under the top hat!',
      cover: { icon: '🎩', size: 80, x: 52, y: 48 },
      hidden: { icon: '🐰', size: 52, x: 52, y: 52 }
    },
    {
      id: 10,
      difficulty: 'Easy',
      type: 'select',
      prompt: 'You overtake the runner in 2nd place right before the tape. What place do you finish in?',
      hint: 'If you pass 2nd place, did you pass 1st place yet?',
      explain: 'Passing the person in 2nd place puts YOU in 2nd place—1st place is still ahead!',
      items: [
        { id: 'p1', label: '🥇 1st', size: 28, correct: false },
        { id: 'p2', label: '🥈 2nd', size: 28, correct: true },
        { id: 'p3', label: '🥉 3rd', size: 28, correct: false },
        { id: 'p4', label: '🏅 4th', size: 28, correct: false }
      ]
    },

    // ==================== TIER 2: MEDIUM (LEVELS 11 - 20) ====================
    {
      id: 11,
      difficulty: 'Medium',
      type: 'drag-tool',
      prompt: 'Power up the offline arcade robot!',
      hint: 'Drag the charged green battery cell into the robot.',
      explain: 'Fresh battery installed—the arcade bot is back online!',
      tool: { icon: '🔋', label: 'Battery', x: 78, y: 62 },
      target: { icon: '🤖', solvedIcon: '⚡', label: 'Offline Bot', x: 26, y: 46 },
      decoys: [{ icon: '🧲', x: 54, y: 34 }, { icon: '📎', x: 52, y: 70 }]
    },
    {
      id: 12,
      difficulty: 'Medium',
      type: 'prompt-word',
      prompt: 'Find the hidden STAR to clear the night sky!',
      targetWord: 'STAR',
      hint: 'Those icons below are moons, comets, and planets—check the prompt text!',
      explain: 'Clever eyes! You tapped the word STAR right in the headline!',
      decoys: [
        { label: '🌙 Moon', bg: '#1e293b' },
        { label: '🪐 Saturn', bg: '#312e81' },
        { label: '☄️ Comet', bg: '#0f172a' }
      ]
    },
    {
      id: 13,
      difficulty: 'Medium',
      type: 'toggle',
      prompt: 'Light up switches that sum to EXACTLY 11.',
      hint: 'Combine 8 + 2 + 1 = 11.',
      explain: '8 + 2 + 1 = 11—binary thinking for the win!',
      targetSum: 11,
      switches: [
        { label: '+8', value: 8 },
        { label: '+4', value: 4 },
        { label: '+2', value: 2 },
        { label: '+1', value: 1 }
      ]
    },
    {
      id: 14,
      difficulty: 'Medium',
      type: 'counter',
      prompt: 'Count ALL squares in a 2×2 grid (don\'t forget the outer border!).',
      hint: '4 small squares + 1 big 2×2 outer square!',
      explain: 'There are 4 unit squares plus 1 large 2×2 outer square = 5 total squares!',
      visual: '┌───┬───┐\n│ 1 │ 2 │\n├───┼───┤\n│ 3 │ 4 │\n└───┴───┘',
      answer: 5
    },
    {
      id: 15,
      difficulty: 'Medium',
      type: 'sequence',
      prompt: 'Tap the polygons in increasing order of SIDES.',
      hint: 'Circle (0 straight sides) → Triangle (3) → Square (4) → Hexagon (6).',
      explain: '0 sides → 3 sides → 4 sides → 6 sides!',
      items: [
        { id: 'sq', label: '🟦 Square', order: 3 },
        { id: 'hex', label: '⬡ Hexagon', order: 4 },
        { id: 'cir', label: '⚪ Circle', order: 1 },
        { id: 'tri', label: '🔺 Triangle', order: 2 }
      ]
    },
    {
      id: 16,
      difficulty: 'Medium',
      type: 'drag-reveal',
      prompt: 'Find the spare house key before the rain starts!',
      hint: 'Check under the potted plant on the porch—drag it!',
      explain: 'Everyone hides the spare key under the flowerpot!',
      cover: { icon: '🪴', size: 82, x: 62, y: 50 },
      hidden: { icon: '🗝️', size: 50, x: 62, y: 54 }
    },
    {
      id: 17,
      difficulty: 'Medium',
      type: 'select',
      prompt: 'Which glass holds the MOST juice when the objects inside are removed?',
      hint: 'All 4 glasses have the same brim level right now. The largest submerged object displaced the most juice!',
      explain: 'Wait—the smallest submerged pebble displaced the LEAST liquid, leaving the MOST juice behind!',
      items: [
        { id: 'brick', label: '🥛+🧱 Brick', size: 24, correct: false },
        { id: 'watch', label: '🥛+⌚ Watch', size: 24, correct: false },
        { id: 'clip', label: '🥛+📎 Paperclip', size: 24, correct: true },
        { id: 'apple2', label: '🥛+🍎 Apple', size: 24, correct: false }
      ]
    },
    {
      id: 18,
      difficulty: 'Medium',
      type: 'drag-tool',
      prompt: 'Melt the frozen ice block to free the trophy!',
      hint: 'Drag the blazing sun over to the ice cube.',
      explain: 'Solar heat melted the ice block in a flash!',
      tool: { icon: '☀️', label: 'Sun', x: 22, y: 34 },
      target: { icon: '🧊', solvedIcon: '🏆', label: 'Frozen Trophy', x: 72, y: 54 },
      decoys: [{ icon: '❄️', x: 50, y: 66 }]
    },
    {
      id: 19,
      difficulty: 'Medium',
      type: 'counter',
      prompt: '3 arcade machines print 3 tickets in 3 minutes. How many minutes do 10 machines need to print 10 tickets?',
      hint: 'Each individual machine takes 3 minutes to print 1 ticket—and all 10 run simultaneously!',
      explain: 'Running in parallel, 10 machines each print 1 ticket in the exact same 3 minutes!',
      visual: '🕹️×3 → 🎟️×3 (3 min)   |   🕹️×10 → 🎟️×10 (? min)',
      answer: 3
    },
    {
      id: 20,
      difficulty: 'Medium',
      type: 'toggle',
      prompt: 'Balance the energy bridge to EXACTLY 19 GW.',
      hint: 'Try 12 + 5 + 2 = 19.',
      explain: '12 + 5 + 2 = 19 GW—reactor bridge stabilized!',
      targetSum: 19,
      switches: [
        { label: '+12', value: 12 },
        { label: '+9', value: 9 },
        { label: '+5', value: 5 },
        { label: '+2', value: 2 }
      ]
    },

    // ==================== TIER 3: HARD (LEVELS 21 - 30) ====================
    {
      id: 21,
      difficulty: 'Hard',
      type: 'prompt-word',
      prompt: 'Every safe code below is jammed. Tap EXIT to escape the room!',
      targetWord: 'EXIT',
      hint: 'Look at the word EXIT in the mission instruction!',
      explain: 'When the keypad is rigged, use the literal EXIT sign above!',
      decoys: [
        { label: '🔒 0000', bg: '#334155' },
        { label: '🔒 1234', bg: '#334155' },
        { label: '🔒 9999', bg: '#334155' }
      ]
    },
    {
      id: 22,
      difficulty: 'Hard',
      type: 'counter',
      prompt: 'A lily pad doubles in size every day. On Day 20 it covers the whole pond. On which day did it cover HALF the pond?',
      hint: 'Don\'t divide 20 by 2! If it doubles every single day, work backward one day from full.',
      explain: 'Since it doubles each day, one day before Day 20 (Day 19) it was half the pond!',
      visual: '🪷 ×2 each day → Full Pond on Day 20',
      answer: 19
    },
    {
      id: 23,
      difficulty: 'Hard',
      type: 'sequence',
      prompt: 'Tap the fractions from SMALLEST to LARGEST.',
      hint: 'Convert mentally: 1/5 = 0.20, 1/4 = 0.25, 2/5 = 0.40, 3/4 = 0.75.',
      explain: '0.20 (1/5) < 0.25 (1/4) < 0.40 (2/5) < 0.75 (3/4)!',
      items: [
        { id: 'f1', label: '3 / 4', order: 4 },
        { id: 'f2', label: '1 / 5', order: 1 },
        { id: 'f3', label: '2 / 5', order: 3 },
        { id: 'f4', label: '1 / 4', order: 2 }
      ]
    },
    {
      id: 24,
      difficulty: 'Hard',
      type: 'drag-reveal',
      prompt: 'Find the silent ninja hiding in the dojo!',
      hint: 'Move that giant boulder in the corner!',
      explain: 'Master of stealth uncovered behind the boulder!',
      cover: { icon: '🪨', size: 86, x: 36, y: 48 },
      hidden: { icon: '🥷', size: 52, x: 36, y: 50 }
    },
    {
      id: 25,
      difficulty: 'Hard',
      type: 'counter',
      prompt: 'You have a 3L jug and a 5L jug. What is the exact liter target you measure by filling 5L, pouring into 3L, emptying 3L, moving the 2L over, and refilling 5L to top off 3L?',
      hint: '2L sits in the 3L jug (leaving 1L of room). Pouring from a full 5L jug until 3L is full leaves how much in the 5L jug?',
      explain: '5L minus 1L poured into the 3L jug leaves exactly 4 liters—the classic Die Hard riddle!',
      visual: '🏺 5L  ⟶  🏺 3L (already holding 2L)',
      answer: 4
    },
    {
      id: 26,
      difficulty: 'Hard',
      type: 'drag-tool',
      prompt: 'Defuse the cartoon bomb before it goes boom!',
      hint: 'Drag the scissors onto the bomb\'s fuse!',
      explain: 'Snip! Fuse cut cleanly with zero panic.',
      tool: { icon: '✂️', label: 'Scissors', x: 80, y: 38 },
      target: { icon: '💣', solvedIcon: '🎉', label: 'Ticking Bomb', x: 30, y: 54 },
      decoys: [{ icon: '🕯️', x: 56, y: 66 }, { icon: '🎈', x: 52, y: 30 }]
    },
    {
      id: 27,
      difficulty: 'Hard',
      type: 'toggle',
      prompt: 'Calibrate the quantum lock to EXACTLY 27.',
      hint: 'Combine 16 + 8 + 3 = 27.',
      explain: '16 + 8 + 3 = 27! Quantum vault unlocked.',
      targetSum: 27,
      switches: [
        { label: '+16', value: 16 },
        { label: '+11', value: 11 },
        { label: '+8', value: 8 },
        { label: '+5', value: 5 },
        { label: '+3', value: 3 }
      ]
    },
    {
      id: 28,
      difficulty: 'Hard',
      type: 'select',
      prompt: 'A bat and a ball cost $110 total. The bat costs $100 MORE than the ball. How much does the ball cost?',
      hint: 'If the ball were $10, the bat would be $110, making $120 total! Try half of $10.',
      explain: 'Ball = $5, Bat = $105 ($100 more than $5), and $5 + $105 = $110!',
      items: [
        { id: 'c10', label: '$10', size: 26, correct: false },
        { id: 'c5', label: '$5', size: 26, correct: true },
        { id: 'c1', label: '$1', size: 26, correct: false },
        { id: 'c15', label: '$15', size: 26, correct: false }
      ]
    },
    {
      id: 29,
      difficulty: 'Hard',
      type: 'counter',
      prompt: 'How many total triangles are in a triangle split down the middle from top vertex to base?',
      hint: 'Left half + Right half + Whole outer triangle!',
      explain: '2 inner halves + 1 outer combined triangle = 3 triangles!',
      visual: '    /│\\\n   / │ \\\n  /──┴──\\',
      answer: 3
    },
    {
      id: 30,
      difficulty: 'Hard',
      type: 'sequence',
      prompt: 'FINAL BOSS: Tap the cosmic bodies from CLOSEST to Sun to FARTHEST!',
      hint: 'Mercury → Earth → Jupiter → Neptune.',
      explain: 'You conquered all 30 Brain Trap levels! Mercury → Earth → Jupiter → Neptune.',
      items: [
        { id: 'jup', label: '🟠 Jupiter', order: 3 },
        { id: 'mer', label: '🪨 Mercury', order: 1 },
        { id: 'nep', label: '🔵 Neptune', order: 4 },
        { id: 'ear', label: '🌍 Earth', order: 2 }
      ]
    }
  ];

  root.MPA_GAME_SHELL.registerEngine('brain-trap', function (api) {
    const stage = api.stage;
    let host = null;
    let currentLevelIdx = 0;
    let hintShown = false;
    let mistakesOnLevel = 0;
    let showingSelector = false;

    function getProgressData() {
      return api.getProgress({
        clearedLevels: [],
        highestUnlocked: 1
      });
    }

    function markLevelSolved(levelNum) {
      const prog = getProgressData();
      const cleared = Array.isArray(prog.clearedLevels) ? prog.clearedLevels.slice() : [];
      if (cleared.indexOf(levelNum) === -1) {
        cleared.push(levelNum);
      }
      const nextUnlock = Math.min(PUZZLES.length, Math.max(prog.highestUnlocked || 1, levelNum + 1));
      api.saveProgress({
        clearedLevels: cleared,
        highestUnlocked: nextUnlock
      });
      if (cleared.length >= 10) {
        api.unlockAchievement('brain_master');
      }
    }

    function ensureDomHost() {
      if (host) return host;
      if (api.canvas) api.canvas.style.display = 'none';
      host = document.createElement('div');
      host.className = 'game-dom-stage';
      stage.insertBefore(host, stage.firstChild);
      return host;
    }

    function renderLevelSelector() {
      showingSelector = true;
      const prog = getProgressData();
      const cleared = prog.clearedLevels || [];
      const maxUnlock = Math.max(1, prog.highestUnlocked || 1);

      host.innerHTML =
        '<div class="dom-hud-strip">' +
          '<strong>🧠 Select Puzzle (' + cleared.length + '/30 Solved)</strong>' +
          '<button type="button" class="btn btn-secondary btn-sm" id="brain-close-selector">Back to Puzzle</button>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:12px 0;overflow-y:auto">' +
          PUZZLES.map(function (pz, idx) {
            const unlocked = pz.id <= maxUnlock || cleared.indexOf(pz.id) !== -1;
            const done = cleared.indexOf(pz.id) !== -1;
            return (
              '<button type="button" class="choice-btn" style="padding:10px 4px;font-size:0.85rem;' +
                (done ? 'border-color:#10b981;background:rgba(16,185,129,0.16)' : '') + '" ' +
                (unlocked ? '' : 'disabled ') +
                'data-pick-lvl="' + idx + '">' +
                (done ? '✓ ' : (unlocked ? '' : '🔒 ')) + pz.id +
              '</button>'
            );
          }).join('') +
        '</div>';

      host.querySelector('#brain-close-selector').addEventListener('click', function () {
        showingSelector = false;
        renderCurrentPuzzle();
      });

      host.querySelectorAll('[data-pick-lvl]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          currentLevelIdx = Number(btn.getAttribute('data-pick-lvl')) || 0;
          showingSelector = false;
          hintShown = false;
          mistakesOnLevel = 0;
          renderCurrentPuzzle();
        });
      });
    }

    function onPuzzleSolved(pz) {
      const bonus = Math.max(25, (hintShown ? 55 : 100) - mistakesOnLevel * 15);
      api.addScore(bonus);
      api.playSound('win');
      markLevelSolved(pz.id);

      const board = host.querySelector('#brain-interactive-board');
      if (!board) return;
      board.innerHTML =
        '<div style="text-align:center;max-width:440px">' +
          '<div style="font-size:2.6rem;margin-bottom:6px">🎉</div>' +
          '<h3 style="margin:0 0 8px;color:#6ee7b7">Level ' + pz.id + ' Cracked! (+' + bonus + ' pts)</h3>' +
          '<p style="margin:0 0 18px;color:var(--text-secondary);font-size:0.93rem">' + pz.explain + '</p>' +
          (currentLevelIdx < PUZZLES.length - 1
            ? '<button type="button" class="btn btn-primary" id="brain-next-btn">Next Puzzle (Level ' + (pz.id + 1) + ') →</button>'
            : '<button type="button" class="btn btn-primary" id="brain-finish-all">🏆 Complete All 30 Puzzles!</button>') +
        '</div>';

      const nextBtn = board.querySelector('#brain-next-btn');
      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          currentLevelIdx += 1;
          hintShown = false;
          mistakesOnLevel = 0;
          renderCurrentPuzzle();
        });
      }
      const finBtn = board.querySelector('#brain-finish-all');
      if (finBtn) {
        finBtn.addEventListener('click', function () {
          api.gameOver({
            won: true,
            summary: 'All 30 Brain Trap Puzzles Solved!'
          });
        });
      }
    }

    function flashMistake(msg) {
      mistakesOnLevel += 1;
      api.playSound('wrong');
      const fb = host.querySelector('#brain-feedback-line');
      if (fb) {
        fb.textContent = '❌ ' + (msg || 'It\'s a trap! Think laterally and try again.');
        fb.style.color = '#fb7185';
      }
    }

    function makeDraggable(el, board, onMove) {
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let origLeft = 0;
      let origTop = 0;

      el.addEventListener('pointerdown', function (e) {
        if (!api.isRunning()) return;
        e.preventDefault();
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        origLeft = el.offsetLeft;
        origTop = el.offsetTop;
        if (el.setPointerCapture) {
          try { el.setPointerCapture(e.pointerId); } catch (_) {}
        }
      });

      el.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        const nx = Math.max(0, Math.min(board.clientWidth - el.offsetWidth, origLeft + (e.clientX - startX)));
        const ny = Math.max(0, Math.min(board.clientHeight - el.offsetHeight, origTop + (e.clientY - startY)));
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
        if (typeof onMove === 'function') onMove(nx, ny);
      });

      el.addEventListener('pointerup', function () {
        dragging = false;
      });
    }

    function renderCurrentPuzzle() {
      ensureDomHost();
      if (showingSelector) {
        renderLevelSelector();
        return;
      }

      const pz = PUZZLES[currentLevelIdx];
      const diffClass = pz.difficulty === 'Easy'
        ? 'chip-green'
        : (pz.difficulty === 'Medium' ? 'chip-amber' : 'chip-purple');

      let promptHtml = pz.prompt;
      if (pz.type === 'prompt-word' && pz.targetWord) {
        promptHtml = pz.prompt.replace(
          pz.targetWord,
          '<span id="brain-secret-word" style="cursor:pointer;text-decoration:underline;text-decoration-color:rgba(56,189,248,0.45)">' + pz.targetWord + '</span>'
        );
      }

      host.innerHTML =
        '<div class="dom-hud-strip">' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<span class="chip ' + diffClass + '">' + pz.difficulty + '</span>' +
            '<strong>Level ' + pz.id + ' / ' + PUZZLES.length + '</strong>' +
          '</div>' +
          '<div style="display:flex;gap:8px">' +
            '<button type="button" class="ctrl-btn" id="brain-hint-btn">💡 Hint</button>' +
            '<button type="button" class="ctrl-btn" id="brain-levels-btn">📋 Levels</button>' +
          '</div>' +
        '</div>' +
        '<div style="padding:10px 6px 2px;text-align:center">' +
          '<h3 style="margin:0;font-size:1.14rem;line-height:1.4">' + promptHtml + '</h3>' +
          '<div id="brain-feedback-line" style="min-height:22px;font-size:0.86rem;margin-top:4px;color:#fde047">' +
            (hintShown ? '💡 Hint: ' + pz.hint : '') +
          '</div>' +
        '</div>' +
        '<div class="brain-board" id="brain-interactive-board"></div>';

      host.querySelector('#brain-hint-btn').addEventListener('click', function () {
        hintShown = true;
        api.playSound('click');
        const fb = host.querySelector('#brain-feedback-line');
        if (fb) {
          fb.textContent = '💡 Hint: ' + pz.hint;
          fb.style.color = '#fde047';
        }
      });

      host.querySelector('#brain-levels-btn').addEventListener('click', function () {
        renderLevelSelector();
      });

      const secretWord = host.querySelector('#brain-secret-word');
      if (secretWord) {
        secretWord.addEventListener('click', function () {
          if (!api.isRunning()) return;
          onPuzzleSolved(pz);
        });
      }

      const board = host.querySelector('#brain-interactive-board');

      if (pz.type === 'select') {
        board.innerHTML =
          '<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;align-items:center">' +
            pz.items.map(function (it, idx) {
              return (
                '<button type="button" class="choice-btn" data-sel-idx="' + idx + '" style="min-width:118px;min-height:84px;font-size:' + it.size + 'px">' +
                  it.label +
                '</button>'
              );
            }).join('') +
          '</div>';
        board.querySelectorAll('[data-sel-idx]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (!api.isRunning()) return;
            const item = pz.items[Number(btn.getAttribute('data-sel-idx'))];
            if (item && item.correct) onPuzzleSolved(pz);
            else flashMistake('Look closer—don\'t fall for visual tricks!');
          });
        });
      } else if (pz.type === 'prompt-word') {
        board.innerHTML =
          '<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center">' +
            pz.decoys.map(function (d) {
              return (
                '<button type="button" class="choice-btn" data-decoy="1" style="background:' + d.bg + ';min-width:130px;padding:18px">' +
                  d.label +
                '</button>'
              );
            }).join('') +
          '</div>';
        board.querySelectorAll('[data-decoy]').forEach(function (b) {
          b.addEventListener('click', function () {
            if (!api.isRunning()) return;
            flashMistake('Trap button! Where ELSE does that word appear on screen?');
          });
        });
      } else if (pz.type === 'drag-reveal') {
        board.innerHTML =
          '<button type="button" id="brain-hidden-target" style="position:absolute;left:calc(' + pz.hidden.x + '% - 34px);top:calc(' + pz.hidden.y + '% - 34px);width:68px;height:68px;font-size:' + pz.hidden.size + 'px;background:none;border:none;cursor:pointer">' +
            pz.hidden.icon +
          '</button>' +
          '<div id="brain-cover-obj" class="brain-draggable" style="left:calc(' + pz.cover.x + '% - 48px);top:calc(' + pz.cover.y + '% - 48px);width:96px;height:96px;font-size:' + pz.cover.size + 'px;display:flex;align-items:center;justify-content:center;background:#090d20;border-radius:20px;border:1px dashed rgba(255,255,255,0.2)">' +
            pz.cover.icon +
          '</div>';
        const coverEl = board.querySelector('#brain-cover-obj');
        makeDraggable(coverEl, board);
        board.querySelector('#brain-hidden-target').addEventListener('click', function () {
          if (!api.isRunning()) return;
          onPuzzleSolved(pz);
        });
      } else if (pz.type === 'drag-tool') {
        board.innerHTML =
          '<div id="brain-drop-target" style="position:absolute;left:calc(' + pz.target.x + '% - 44px);top:calc(' + pz.target.y + '% - 44px);width:88px;height:88px;font-size:52px;display:flex;align-items:center;justify-content:center;border-radius:18px;background:rgba(255,255,255,0.05);border:1px solid var(--border-subtle)">' +
            pz.target.icon +
          '</div>' +
          (pz.decoys || []).map(function (dc) {
            return '<div style="position:absolute;left:calc(' + dc.x + '% - 26px);top:calc(' + dc.y + '% - 26px);font-size:40px">' + dc.icon + '</div>';
          }).join('') +
          '<div id="brain-drag-tool" class="brain-draggable" style="left:calc(' + pz.tool.x + '% - 36px);top:calc(' + pz.tool.y + '% - 36px);width:72px;height:72px;font-size:44px;display:flex;align-items:center;justify-content:center;border-radius:16px;background:rgba(56,189,248,0.16);border:1px solid #22d3ee">' +
            pz.tool.icon +
          '</div>';

        const toolEl = board.querySelector('#brain-drag-tool');
        const targetEl = board.querySelector('#brain-drop-target');
        makeDraggable(toolEl, board, function () {
          const r1 = toolEl.getBoundingClientRect();
          const r2 = targetEl.getBoundingClientRect();
          const overlap = !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
          if (overlap) {
            targetEl.textContent = pz.target.solvedIcon;
            onPuzzleSolved(pz);
          }
        });
      } else if (pz.type === 'counter') {
        let countVal = 0;
        board.innerHTML =
          '<pre style="margin:0 0 14px;padding:10px 16px;border-radius:12px;background:rgba(255,255,255,0.04);color:#67e8f9;font-size:1rem;text-align:center">' + pz.visual + '</pre>' +
          '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">' +
            '<button type="button" class="choice-btn" id="cnt-minus" style="width:52px">−</button>' +
            '<strong id="cnt-display" style="font-family:monospace;font-size:2rem;min-width:58px;text-align:center">0</strong>' +
            '<button type="button" class="choice-btn" id="cnt-plus" style="width:52px">+</button>' +
          '</div>' +
          '<button type="button" class="btn btn-primary btn-sm" id="cnt-submit">Submit Answer</button>';

        const disp = board.querySelector('#cnt-display');
        board.querySelector('#cnt-minus').addEventListener('click', function () {
          if (!api.isRunning()) return;
          countVal = Math.max(0, countVal - 1);
          disp.textContent = String(countVal);
          api.playSound('click');
        });
        board.querySelector('#cnt-plus').addEventListener('click', function () {
          if (!api.isRunning()) return;
          countVal += 1;
          disp.textContent = String(countVal);
          api.playSound('click');
        });
        board.querySelector('#cnt-submit').addEventListener('click', function () {
          if (!api.isRunning()) return;
          if (countVal === pz.answer) onPuzzleSolved(pz);
          else flashMistake('Not ' + countVal + '! Re-read every word carefully.');
        });
      } else if (pz.type === 'sequence') {
        let expectedStep = 1;
        board.innerHTML =
          '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;width:100%;max-width:380px">' +
            pz.items.map(function (it, idx) {
              return '<button type="button" class="choice-btn" data-seq-idx="' + idx + '">' + it.label + '</button>';
            }).join('') +
          '</div>';
        board.querySelectorAll('[data-seq-idx]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (!api.isRunning()) return;
            const item = pz.items[Number(btn.getAttribute('data-seq-idx'))];
            if (item.order === expectedStep) {
              btn.classList.add('correct');
              btn.disabled = true;
              api.playSound('pop');
              expectedStep += 1;
              if (expectedStep > pz.items.length) {
                onPuzzleSolved(pz);
              }
            } else {
              expectedStep = 1;
              board.querySelectorAll('[data-seq-idx]').forEach(function (b) {
                b.classList.remove('correct');
                b.disabled = false;
              });
              flashMistake('Wrong order! Sequence reset—check carefully.');
            }
          });
        });
      } else if (pz.type === 'toggle') {
        const activeFlags = pz.switches.map(function () { return false; });
        board.innerHTML =
          '<div style="margin-bottom:14px;font-family:monospace;font-size:1.3rem">Current Output: <strong id="toggle-sum" style="color:#22d3ee">0</strong> / ' + pz.targetSum + '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">' +
            pz.switches.map(function (sw, idx) {
              return '<button type="button" class="choice-btn" data-sw-idx="' + idx + '" style="min-width:78px">⚡ ' + sw.label + '</button>';
            }).join('') +
          '</div>';

        const sumEl = board.querySelector('#toggle-sum');
        board.querySelectorAll('[data-sw-idx]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (!api.isRunning()) return;
            const idx = Number(btn.getAttribute('data-sw-idx'));
            activeFlags[idx] = !activeFlags[idx];
            btn.classList.toggle('correct', activeFlags[idx]);
            api.playSound('click');
            const total = pz.switches.reduce(function (acc, sw, i) {
              return acc + (activeFlags[i] ? sw.value : 0);
            }, 0);
            sumEl.textContent = String(total);
            if (total === pz.targetSum) {
              onPuzzleSolved(pz);
            }
          });
        });
      }
    }

    return {
      init: function () {
        const prog = getProgressData();
        const startLvl = Math.min(PUZZLES.length - 1, Math.max(0, (prog.highestUnlocked || 1) - 1));
        currentLevelIdx = startLvl;
        renderCurrentPuzzle();
      },
      start: function () {
        hintShown = false;
        mistakesOnLevel = 0;
        showingSelector = false;
        renderCurrentPuzzle();
      },
      pause: function () {},
      resume: function () {},
      restart: function () {
        currentLevelIdx = 0;
        hintShown = false;
        mistakesOnLevel = 0;
        showingSelector = false;
        renderCurrentPuzzle();
      },
      getShareSummary: function () {
        const prog = getProgressData();
        return (prog.clearedLevels || []).length + '/30 Brain Trap levels cracked';
      },
      getPuzzleCount: function () {
        return PUZZLES.length;
      },
      solveCurrentForTest: function () {
        onPuzzleSolved(PUZZLES[currentLevelIdx]);
      }
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
