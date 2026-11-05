/**
 * GAME 9: GUESS THE EMOJI — 100 Original Emoji Clues Engine
 * Mechanics: 100 unique emoji puzzles across 6 categories, Easy -> Medium -> Hard
 * difficulty progression, real-time countdown timer, up to 5x streak multiplier,
 * 3 lives, 50/50 lifeline, category filter, keyboard 1-4 shortcuts.
 */
(function (root) {
  'use strict';

  // Exact count = 100 original clues (20 + 18 + 16 + 16 + 15 + 15 = 100)
  const QUESTIONS = [
    // --- 1. Compound Words (20) ---
    { emojis: '🌧️ + 🎀', answer: 'Rainbow', cat: 'Compound Words', diff: 1 },
    { emojis: '☀️ + 🌻', answer: 'Sunflower', cat: 'Compound Words', diff: 1 },
    { emojis: '❄️ + ⛄', answer: 'Snowman', cat: 'Compound Words', diff: 1 },
    { emojis: '⭐ + 🐟', answer: 'Starfish', cat: 'Compound Words', diff: 1 },
    { emojis: '🧈 + 🪰', answer: 'Butterfly', cat: 'Compound Words', diff: 1 },
    { emojis: '🔥 + 🚒', answer: 'Firetruck', cat: 'Compound Words', diff: 1 },
    { emojis: '🦷 + 🪥', answer: 'Toothbrush', cat: 'Compound Words', diff: 1 },
    { emojis: '📚 + 🐛', answer: 'Bookworm', cat: 'Compound Words', diff: 1 },
    { emojis: '🌙 + 💡', answer: 'Moonlight', cat: 'Compound Words', diff: 1 },
    { emojis: '🌊 + 🐴', answer: 'Seahorse', cat: 'Compound Words', diff: 1 },
    { emojis: '👂 + 💍', answer: 'Earring', cat: 'Compound Words', diff: 2 },
    { emojis: '👣 + 🖨️', answer: 'Footprint', cat: 'Compound Words', diff: 2 },
    { emojis: '🔑 + 🎹', answer: 'Keyboard', cat: 'Compound Words', diff: 2 },
    { emojis: '💧 + 🍉', answer: 'Watermelon', cat: 'Compound Words', diff: 1 },
    { emojis: '🐉 + 🪰', answer: 'Dragonfly', cat: 'Compound Words', diff: 2 },
    { emojis: '🌩️ + ⚡ + 🐦', answer: 'Thunderbird', cat: 'Compound Words', diff: 2 },
    { emojis: '⏳ + 🥂', answer: 'Hourglass', cat: 'Compound Words', diff: 2 },
    { emojis: '🕯️ + 🪵', answer: 'Candlestick', cat: 'Compound Words', diff: 3 },
    { emojis: '🧭 + 🌹', answer: 'Compass Rose', cat: 'Compound Words', diff: 3 },
    { emojis: '🕸️ + 📷', answer: 'Webcam', cat: 'Compound Words', diff: 2 },

    // --- 2. Food & Drinks (18) ---
    { emojis: '🥞 + 🍁', answer: 'Maple Pancakes', cat: 'Food & Drinks', diff: 1 },
    { emojis: '🔥 + 🐶', answer: 'Hot Dog', cat: 'Food & Drinks', diff: 1 },
    { emojis: '🧁 + ☕', answer: 'Cupcake', cat: 'Food & Drinks', diff: 1 },
    { emojis: '🍎 + 🥧', answer: 'Apple Pie', cat: 'Food & Drinks', diff: 1 },
    { emojis: '🧊 + 🍦', answer: 'Ice Cream', cat: 'Food & Drinks', diff: 1 },
    { emojis: '🥜 + 🧈', answer: 'Peanut Butter', cat: 'Food & Drinks', diff: 1 },
    { emojis: '🍓 + 🥤', answer: 'Strawberry Shake', cat: 'Food & Drinks', diff: 1 },
    { emojis: '🧀 + 🍔', answer: 'Cheeseburger', cat: 'Food & Drinks', diff: 1 },
    { emojis: '🇫🇷 + 🍟', answer: 'French Fries', cat: 'Food & Drinks', diff: 1 },
    { emojis: '🍍 + 🍕', answer: 'Hawaiian Pizza', cat: 'Food & Drinks', diff: 2 },
    { emojis: '🧄 + 🥖', answer: 'Garlic Bread', cat: 'Food & Drinks', diff: 2 },
    { emojis: '🍋 + 💧 + 🧊', answer: 'Iced Lemonade', cat: 'Food & Drinks', diff: 2 },
    { emojis: '🥑 + 🍞', answer: 'Avocado Toast', cat: 'Food & Drinks', diff: 2 },
    { emojis: '🌶️ + 🍫', answer: 'Spiced Hot Cocoa', cat: 'Food & Drinks', diff: 3 },
    { emojis: '🍯 + 🍵 + 🍋', answer: 'Honey Lemon Tea', cat: 'Food & Drinks', diff: 2 },
    { emojis: '🍌 + 🍨 + 🍒', answer: 'Banana Split', cat: 'Food & Drinks', diff: 2 },
    { emojis: '🫧 + 🧋', answer: 'Bubble Tea', cat: 'Food & Drinks', diff: 2 },
    { emojis: '🌽 + 🐶 + 🥢', answer: 'Corn Dog', cat: 'Food & Drinks', diff: 3 },

    // --- 3. Movies & Stories (16) ---
    { emojis: '🦁 + 👑', answer: 'Lion King', cat: 'Movies & Stories', diff: 1 },
    { emojis: '🕷️ + 🧑', answer: 'Spider Hero', cat: 'Movies & Stories', diff: 1 },
    { emojis: '❄️ + 👸 + ⛄', answer: 'Ice Queen Tale', cat: 'Movies & Stories', diff: 1 },
    { emojis: '🧞 + 🪔 + 🕌', answer: 'Magic Lamp', cat: 'Movies & Stories', diff: 1 },
    { emojis: '🐠 + 🔍 + 🌊', answer: 'Lost Clownfish', cat: 'Movies & Stories', diff: 2 },
    { emojis: '🦖 + 🏝️ + 🚙', answer: 'Dino Island', cat: 'Movies & Stories', diff: 2 },
    { emojis: '🧙‍♂️ + 💍 + 🌋', answer: 'Quest of the Ring', cat: 'Movies & Stories', diff: 2 },
    { emojis: '🚢 + 🧊 + 💔', answer: 'Iceberg Voyage', cat: 'Movies & Stories', diff: 2 },
    { emojis: '🐼 + 🥋 + 🥟', answer: 'Kung Fu Panda', cat: 'Movies & Stories', diff: 1 },
    { emojis: '🎈 + 🏠 + 👴', answer: 'Flying Balloon House', cat: 'Movies & Stories', diff: 2 },
    { emojis: '🐀 + 👨‍🍳 + 🍲', answer: 'Little Chef Rat', cat: 'Movies & Stories', diff: 2 },
    { emojis: '👠 + 🎃 + 🕛', answer: 'Cinderella', cat: 'Movies & Stories', diff: 1 },
    { emojis: '🐺 + 👵 + 🧺', answer: 'Red Riding Hood', cat: 'Movies & Stories', diff: 2 },
    { emojis: '🌱 + 🫘 + ☁️', answer: 'Jack and the Beanstalk', cat: 'Movies & Stories', diff: 3 },
    { emojis: '🐢 + 🐇 + 🏁', answer: 'Tortoise and the Hare', cat: 'Movies & Stories', diff: 2 },
    { emojis: '🚀 + 🌌 + ⚔️', answer: 'Galactic Odyssey', cat: 'Movies & Stories', diff: 3 },

    // --- 4. Science & Nature (16) ---
    { emojis: '🌑 + ☀️ + 🌍', answer: 'Solar Eclipse', cat: 'Science & Nature', diff: 2 },
    { emojis: '🌋 + 🔥 + 🪨', answer: 'Volcanic Eruption', cat: 'Science & Nature', diff: 1 },
    { emojis: '🐛 + 繭 + 🦋', answer: 'Metamorphosis', cat: 'Science & Nature', diff: 3 },
    { emojis: '☀️ + 🌱 + 💨', answer: 'Photosynthesis', cat: 'Science & Nature', diff: 2 },
    { emojis: '🌌 + 🕳️ + ⭐', answer: 'Black Hole', cat: 'Science & Nature', diff: 2 },
    { emojis: '🧬 + 🔬', answer: 'DNA Research', cat: 'Science & Nature', diff: 2 },
    { emojis: '🌊 + 🌕 + ↕️', answer: 'Ocean Tides', cat: 'Science & Nature', diff: 3 },
    { emojis: '⚡ + ☁️ + 🔊', answer: 'Thunderstorm', cat: 'Science & Nature', diff: 1 },
    { emojis: '🐻‍❄️ + 🧊 + 🧭', answer: 'Arctic Circle', cat: 'Science & Nature', diff: 2 },
    { emojis: '🌵 + 🐪 + ☀️', answer: 'Sahara Desert', cat: 'Science & Nature', diff: 1 },
    { emojis: '🌳 + 🌧️ + 🦜', answer: 'Tropical Rainforest', cat: 'Science & Nature', diff: 2 },
    { emojis: '🧲 + ⬆️ + ⬇️', answer: 'Magnetic Poles', cat: 'Science & Nature', diff: 3 },
    { emojis: '☄️ + 🌠 + 🌌', answer: 'Meteor Shower', cat: 'Science & Nature', diff: 2 },
    { emojis: '🌡️ + 🌍 + 🔥', answer: 'Global Warming', cat: 'Science & Nature', diff: 2 },
    { emojis: '☀️ + 🔋 + ⚡', answer: 'Solar Energy', cat: 'Science & Nature', diff: 1 },
    { emojis: '🪸 + 🐠 + 🌊', answer: 'Coral Reef', cat: 'Science & Nature', diff: 2 },

    // --- 5. Sports & Games (15) ---
    { emojis: '🏀 + 🗑️ + 🔥', answer: 'Slam Dunk', cat: 'Sports & Games', diff: 1 },
    { emojis: '⚽ + 🥅 + 🧤', answer: 'Penalty Save', cat: 'Sports & Games', diff: 2 },
    { emojis: '⛳ + 1️⃣ + 🏆', answer: 'Hole in One', cat: 'Sports & Games', diff: 1 },
    { emojis: '♟️ + 👑 + ⚔️', answer: 'Checkmate', cat: 'Sports & Games', diff: 2 },
    { emojis: '🏃 + 🥖 + 🏃‍♀️', answer: 'Relay Race', cat: 'Sports & Games', diff: 2 },
    { emojis: '🎾 + 🌿 + 🏆', answer: 'Grand Slam Tennis', cat: 'Sports & Games', diff: 2 },
    { emojis: '🎳 + ❌ + ❌ + ❌', answer: 'Bowling Turkey', cat: 'Sports & Games', diff: 3 },
    { emojis: '🏹 + 🎯', answer: 'Bullseye Archery', cat: 'Sports & Games', diff: 1 },
    { emojis: '🏄 + 🌊', answer: 'Wave Surfing', cat: 'Sports & Games', diff: 1 },
    { emojis: '⛸️ + ❄️ + 🏒', answer: 'Ice Hockey', cat: 'Sports & Games', diff: 1 },
    { emojis: '🧗 + 🪨 + ⛰️', answer: 'Rock Climbing', cat: 'Sports & Games', diff: 2 },
    { emojis: '🏓 + ⚡', answer: 'Table Tennis', cat: 'Sports & Games', diff: 1 },
    { emojis: '🏎️ + 🏁 + 🍾', answer: 'Formula Racing', cat: 'Sports & Games', diff: 2 },
    { emojis: '🥊 + 🔔 + 🏆', answer: 'Title Knockout', cat: 'Sports & Games', diff: 3 },
    { emojis: '🛹 + 🌀 + 🏅', answer: 'Skateboard Kickflip', cat: 'Sports & Games', diff: 3 },

    // --- 6. Idioms & Phrases (15) ---
    { emojis: '🍰 + 👌', answer: 'Piece of Cake', cat: 'Idioms & Phrases', diff: 1 },
    { emojis: '🔨 + 🧊', answer: 'Break the Ice', cat: 'Idioms & Phrases', diff: 2 },
    { emojis: '🌧️ + 🐱 + 🐶', answer: 'Raining Cats and Dogs', cat: 'Idioms & Phrases', diff: 1 },
    { emojis: '🫘 + 🫗 + 🗣️', answer: 'Spill the Beans', cat: 'Idioms & Phrases', diff: 2 },
    { emojis: '🐖 + 🪽 + ☁️', answer: 'When Pigs Fly', cat: 'Idioms & Phrases', diff: 2 },
    { emojis: '🔵 + 🌕 + ⏳', answer: 'Once in a Blue Moon', cat: 'Idioms & Phrases', diff: 2 },
    { emojis: '🔥 + 🕛 + 🛢️', answer: 'Burn the Midnight Oil', cat: 'Idioms & Phrases', diff: 3 },
    { emojis: '🎯 + 🔨 + 🔩', answer: 'Hit the Nail on the Head', cat: 'Idioms & Phrases', diff: 3 },
    { emojis: '🐘 + 🛋️ + 🤫', answer: 'Elephant in the Room', cat: 'Idioms & Phrases', diff: 3 },
    { emojis: '🥶 + 🦶', answer: 'Cold Feet', cat: 'Idioms & Phrases', diff: 2 },
    { emojis: '🍎 + 👁️', answer: 'Apple of My Eye', cat: 'Idioms & Phrases', diff: 2 },
    { emojis: '⏰ + 🪰', answer: 'Time Flies', cat: 'Idioms & Phrases', diff: 1 },
    { emojis: '🤐 + 👄 + 🔑', answer: 'My Lips Are Sealed', cat: 'Idioms & Phrases', diff: 3 },
    { emojis: '🌧️ + ☁️ + 🪙', answer: 'Silver Lining', cat: 'Idioms & Phrases', diff: 3 },
    { emojis: '🐊 + 😢', answer: 'Crocodile Tears', cat: 'Idioms & Phrases', diff: 3 }
  ];

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  root.MPA_GAME_SHELL.registerEngine('guess-the-emoji', function (api) {
    const stage = api.stage;
    let host = null;
    let rafId = null;
    let lastTime = 0;

    let deck = [];
    let deckIndex = 0;
    let selectedCategory = 'All';
    let lives = 3;
    let streak = 0;
    let maxStreak = 0;
    let solvedCount = 0;
    let fiftyFiftyLeft = 2;
    let timeMax = 18;
    let timeLeft = 18;
    let currentQuestion = null;
    let currentChoices = [];
    let lockedChoice = false;

    function ensureDomHost() {
      if (host) return host;
      if (api.canvas) api.canvas.style.display = 'none';
      host = document.createElement('div');
      host.className = 'game-dom-stage';
      stage.insertBefore(host, stage.firstChild);
      return host;
    }

    function buildDeck() {
      const pool = selectedCategory === 'All'
        ? QUESTIONS
        : QUESTIONS.filter(function (q) { return q.cat === selectedCategory; });

      // Sort progressively: Easy -> Medium -> Hard, shuffled within each tier!
      const easy = shuffle(pool.filter(function (q) { return q.diff === 1; }));
      const med = shuffle(pool.filter(function (q) { return q.diff === 2; }));
      const hard = shuffle(pool.filter(function (q) { return q.diff === 3; }));
      deck = easy.concat(med, hard);
      deckIndex = 0;
    }

    function pickChoices(question) {
      const sameCat = QUESTIONS.filter(function (q) {
        return q.cat === question.cat && q.answer !== question.answer;
      });
      const fallback = QUESTIONS.filter(function (q) {
        return q.answer !== question.answer;
      });
      const source = sameCat.length >= 3 ? sameCat : fallback;
      const distractors = shuffle(source).slice(0, 3).map(function (q) { return q.answer; });
      return shuffle([question.answer].concat(distractors));
    }

    function loadQuestion() {
      if (deckIndex >= deck.length) {
        api.gameOver({
          won: true,
          summary: 'Solved ' + solvedCount + ' / ' + deck.length + ' Clues • Max Streak x' + Math.min(5, 1 + Math.floor(maxStreak / 2))
        });
        return;
      }

      currentQuestion = deck[deckIndex];
      currentChoices = pickChoices(currentQuestion);
      lockedChoice = false;
      timeMax = currentQuestion.diff === 1 ? 20 : (currentQuestion.diff === 2 ? 16 : 13);
      timeLeft = timeMax;
      renderQuestionView();
    }

    function getMultiplier() {
      return Math.min(5, 1 + Math.floor(streak / 2));
    }

    function renderQuestionView() {
      ensureDomHost();
      if (!currentQuestion) return;

      const mult = getMultiplier();
      const diffName = currentQuestion.diff === 1 ? 'Easy' : (currentQuestion.diff === 2 ? 'Medium' : 'Hard');
      const hearts = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));

      const categories = ['All', 'Compound Words', 'Food & Drinks', 'Movies & Stories', 'Science & Nature', 'Sports & Games', 'Idioms & Phrases'];

      host.innerHTML =
        '<div class="dom-hud-strip">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<span>' + hearts + '</span>' +
            '<span class="chip">' + currentQuestion.cat + '</span>' +
            '<span class="chip chip-purple">' + diffName + ' • #' + (deckIndex + 1) + '/' + deck.length + '</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<span class="chip chip-amber">🔥 x' + mult + ' Multiplier</span>' +
            '<button type="button" class="ctrl-btn" id="emoji-5050-btn"' + (fiftyFiftyLeft <= 0 ? ' disabled' : '') + '>✂️ 50/50 (' + fiftyFiftyLeft + ')</button>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:4px">' +
          '<div class="timer-bar-wrap" style="flex:1">' +
            '<div class="timer-bar-fill" id="emoji-timer-bar" style="width:100%"></div>' +
          '</div>' +
          '<span id="emoji-timer-text" style="font-family:monospace;font-size:0.88rem;min-width:42px;text-align:right">' + Math.ceil(timeLeft) + 's</span>' +
        '</div>' +
        '<div class="emoji-clue-box" aria-label="Emoji Clue">' +
          currentQuestion.emojis +
        '</div>' +
        '<div class="choices-grid" id="emoji-choices-grid">' +
          currentChoices.map(function (ans, idx) {
            return (
              '<button type="button" class="choice-btn" data-emoji-choice="' + idx + '">' +
                '<span style="color:var(--text-muted);margin-right:6px">' + (idx + 1) + '.</span> ' + ans +
              '</button>'
            );
          }).join('') +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;color:var(--text-muted);padding-top:6px">' +
          '<span>Streak: <strong style="color:#fff">' + streak + '</strong> • Solved: <strong style="color:#fff">' + solvedCount + '</strong>/100</span>' +
          '<label>Category: ' +
            '<select id="emoji-cat-select" style="background:#090d22;color:#fff;border:1px solid var(--border-subtle);border-radius:8px;padding:3px 8px;font-size:0.78rem">' +
              categories.map(function (cat) {
                return '<option value="' + cat + '"' + (cat === selectedCategory ? ' selected' : '') + '>' + cat + '</option>';
              }).join('') +
            '</select>' +
          '</label>' +
        '</div>';

      host.querySelectorAll('[data-emoji-choice]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          submitAnswer(Number(btn.getAttribute('data-emoji-choice')));
        });
      });

      const fiftyBtn = host.querySelector('#emoji-5050-btn');
      if (fiftyBtn) {
        fiftyBtn.addEventListener('click', function () {
          if (!api.isRunning() || lockedChoice || fiftyFiftyLeft <= 0) return;
          fiftyFiftyLeft -= 1;
          fiftyBtn.disabled = true;
          fiftyBtn.textContent = '✂️ 50/50 (' + fiftyFiftyLeft + ')';
          api.playSound('click');

          const wrongButtons = [];
          host.querySelectorAll('[data-emoji-choice]').forEach(function (b) {
            const idx = Number(b.getAttribute('data-emoji-choice'));
            if (currentChoices[idx] !== currentQuestion.answer) {
              wrongButtons.push(b);
            }
          });
          shuffle(wrongButtons).slice(0, 2).forEach(function (b) {
            b.disabled = true;
          });
        });
      }

      const catSelect = host.querySelector('#emoji-cat-select');
      if (catSelect) {
        catSelect.addEventListener('change', function () {
          selectedCategory = catSelect.value;
          resetGame();
        });
      }
    }

    function submitAnswer(choiceIdx) {
      if (!api.isRunning() || lockedChoice || !currentQuestion) return;
      const chosen = currentChoices[choiceIdx];
      if (chosen == null) return;
      lockedChoice = true;

      const buttons = host ? host.querySelectorAll('[data-emoji-choice]') : [];
      buttons.forEach(function (b) {
        const idx = Number(b.getAttribute('data-emoji-choice'));
        if (currentChoices[idx] === currentQuestion.answer) {
          b.classList.add('correct');
        } else if (idx === choiceIdx) {
          b.classList.add('wrong');
        }
      });

      if (chosen === currentQuestion.answer) {
        streak += 1;
        solvedCount += 1;
        if (streak > maxStreak) maxStreak = streak;

        const prog = api.getProgress({ bestStreak: 0 });
        if (streak > (prog.bestStreak || 0)) {
          api.saveProgress({ bestStreak: streak });
        }
        if (streak >= 10) {
          api.unlockAchievement('emoji_whiz');
        }

        const mult = getMultiplier();
        const speedBonus = Math.round(timeLeft * 4);
        const pts = (50 + speedBonus) * mult;
        api.addScore(pts);
        api.playSound(streak >= 4 ? 'combo' : 'pop');

        setTimeout(function () {
          deckIndex += 1;
          loadQuestion();
        }, 480);
      } else {
        handleMistake();
      }
    }

    function handleMistake() {
      streak = 0;
      lives -= 1;
      api.playSound('wrong');

      if (lives <= 0) {
        setTimeout(function () {
          api.gameOver({
            summary: 'Decoded ' + solvedCount + ' Clues • Best Streak: ' + maxStreak
          });
        }, 560);
      } else {
        setTimeout(function () {
          deckIndex += 1;
          loadQuestion();
        }, 680);
      }
    }

    function resetGame() {
      lives = 3;
      streak = 0;
      maxStreak = 0;
      solvedCount = 0;
      fiftyFiftyLeft = 2;
      buildDeck();
      loadQuestion();
    }

    function loop(ts) {
      if (!lastTime) lastTime = ts;
      const dt = Math.min(0.05, (ts - lastTime) / 1000);
      lastTime = ts;

      if (api.isRunning() && !lockedChoice && currentQuestion) {
        timeLeft -= dt;
        const bar = host ? host.querySelector('#emoji-timer-bar') : null;
        const txt = host ? host.querySelector('#emoji-timer-text') : null;
        if (bar) {
          bar.style.width = Math.max(0, (timeLeft / timeMax) * 100) + '%';
        }
        if (txt) {
          txt.textContent = Math.max(0, Math.ceil(timeLeft)) + 's';
        }
        if (timeLeft <= 0) {
          lockedChoice = true;
          handleMistake();
        }
      }

      rafId = root.requestAnimationFrame(loop);
    }

    function bindKeyboard() {
      root.addEventListener('keydown', function (e) {
        if (!api.isRunning() || lockedChoice) return;
        if (e.key >= '1' && e.key <= '4') {
          const idx = Number(e.key) - 1;
          const btn = host ? host.querySelector('[data-emoji-choice="' + idx + '"]') : null;
          if (btn && !btn.disabled) {
            submitAnswer(idx);
          }
        }
      });
    }

    return {
      init: function () {
        ensureDomHost();
        bindKeyboard();
        resetGame();
        rafId = root.requestAnimationFrame(loop);
      },
      start: function () {
        resetGame();
        lastTime = 0;
      },
      pause: function () {},
      resume: function () {
        lastTime = 0;
      },
      restart: function () {
        resetGame();
        lastTime = 0;
      },
      destroy: function () {
        if (rafId) root.cancelAnimationFrame(rafId);
      },
      getShareSummary: function () {
        return solvedCount + ' emoji clues decoded (x' + Math.min(5, 1 + Math.floor(maxStreak / 2)) + ' streak)';
      },
      getQuestionCount: function () {
        return QUESTIONS.length;
      },
      answerCorrectlyForTest: function () {
        if (!currentQuestion) return;
        const idx = currentChoices.indexOf(currentQuestion.answer);
        if (idx !== -1) submitAnswer(idx);
      }
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
