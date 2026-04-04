(function () {
  // ==================== GAME STATE & CONFIG ====================
  const GAME_CONFIG = {
    STAGE_1_POINTS: 300,
    STAGE_2_POINTS: 400,
    STAGE_3_POINTS: 500,
    TOTAL_POSSIBLE: 1200,
    COMBO_DURATION: 5000, // 5 seconds
    MIN_ACCURACY_FOR_PERFECT: 95,
  };

  const GameState = {
    currentStage: 'intro',
    score: 0,
    accuracy: 0,
    streak: 0,
    stage1: { score: 0, correct: false, attempts: 0, selectedFlow: [] },
    stage2: { score: 0, correct: false, selections: 0, selected: new Set() },
    stage3: { score: 0, correct: 0, total: 4, sorted: 0 },
    startTime: null,
    stageStartTime: null,
  };

  // ==================== DOM ELEMENTS ====================
  const gameContainer = document.getElementById('guideOverlay');
  const screens = {
    intro: document.getElementById('guideIntroScreen'),
    stage1: document.getElementById('guideStage1'),
    stage2: document.getElementById('guideStage2'),
    stage3: document.getElementById('guideStage3'),
    complete: document.getElementById('guideCompleteScreen'),
  };

  const buttons = {
    start: document.getElementById('guideStartBtn'),
    skip: document.getElementById('guideSkipBtn'),
    stage1Deselect: document.getElementById('stage1Deselect'),
    stage1Reset: document.getElementById('stage1Reset'),
    stage1Next: document.getElementById('stage1Next'),
    stage2Deselect: document.getElementById('stage2Deselect'),
    stage2Reset: document.getElementById('stage2Reset'),
    stage2Back: document.getElementById('stage2Back'),
    stage2Next: document.getElementById('stage2Next'),
    stage3Reset: document.getElementById('stage3Reset'),
    stage3Back: document.getElementById('stage3Back'),
    sendSurface: document.getElementById('sendSurface'),
    sendSubsurface: document.getElementById('sendSubsurface'),
    finishBtn: document.getElementById('guideFinishBtn'),
    goDashboard: document.getElementById('goDashboardBtn'),
    replayGuide: document.getElementById('replayGuideBtn'),
  };

  const elements = {
    gameScore: document.getElementById('gameScore'),
    gameAccuracy: document.getElementById('gameAccuracy'),
    gameStreak: document.getElementById('gameStreak'),
    stageName: document.getElementById('stageName'),
    progressPercent: document.getElementById('progressPercent'),
    progressBar: document.getElementById('progressBar'),
    stageIndicators: document.querySelectorAll('.stage-indicator'),
    flowTiles: document.querySelectorAll('.flow-tile'),
    flowResult: document.getElementById('flowResult'),
    flowFeedback: document.getElementById('flowFeedback'),
    sensorChoices: document.querySelectorAll('.sensor-choice'),
    sensorFeedback: document.getElementById('sensorFeedback'),
    sensorProgress: document.getElementById('sensorProgress'),
    sensorProgressBar: document.getElementById('sensorProgressBar'),
    defectCards: document.querySelectorAll('.defect-card'),
    surfaceBin: document.getElementById('surfaceBin'),
    subsurfaceBin: document.getElementById('subsurfaceBin'),
    surfaceCount: document.getElementById('surfaceCount'),
    subsurfaceCount: document.getElementById('subsurfaceCount'),
    defectFeedback: document.getElementById('defectFeedback'),
    finalScore: document.getElementById('finalScore'),
    finalAccuracy: document.getElementById('finalAccuracy'),
    finalBadge: document.getElementById('finalBadge'),
    finalBadgeText: document.getElementById('finalBadgeText'),
    score1: document.getElementById('score1'),
    score2: document.getElementById('score2'),
    score3: document.getElementById('score3'),
  };

  // ==================== UTILITY FUNCTIONS ====================
  function updateDisplay() {
    elements.gameScore.textContent = GameState.score;
    elements.gameAccuracy.textContent = calculateAccuracy() + '%';
    elements.gameStreak.textContent = GameState.streak;
  }

  function calculateAccuracy() {
    const totalAttempts = GameState.stage1.attempts + GameState.stage2.selections + GameState.stage3.total;
    if (totalAttempts === 0) return 0;
    const correctAnswers = (GameState.stage1.correct ? 1 : 0) + (GameState.stage2.correct ? 1 : 0) + GameState.stage3.correct;
    return Math.round((correctAnswers / 3) * 100);
  }

  function updateProgressBar(stage) {
    const stageMap = { intro: 0, stage1: 25, stage2: 50, stage3: 75, complete: 100 };
    const progress = stageMap[stage] || 0;
    elements.progressBar.style.width = progress + '%';
    elements.progressPercent.textContent = progress + '%';
    
    elements.stageIndicators.forEach(indicator => {
      indicator.classList.remove('active', 'completed');
      const indicatorStage = indicator.dataset.stage;
      if (stageMap[indicatorStage] <= progress) {
        indicator.classList.add(stageMap[indicatorStage] < progress ? 'completed' : 'active');
      }
    });
  }

  function showScreen(name) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[name].classList.add('active');
    GameState.currentStage = name;
    
    const stageNames = {
      intro: 'Welcome',
      stage1: 'Stage 1: Flow',
      stage2: 'Stage 2: Tools',
      stage3: 'Stage 3: Defects',
      complete: 'Complete!',
    };
    elements.stageName.textContent = stageNames[name];
    updateProgressBar(name);
  }

  function addExperience(points) {
    GameState.score += points;
    GameState.streak += 10;
    updateDisplay();
    playPointsAnimation(points);
  }

  function playPointsAnimation(points) {
    const el = document.createElement('div');
    el.className = 'points-popup';
    el.textContent = '+' + points;
    el.style.position = 'fixed';
    el.style.top = '100px';
    el.style.right = '50px';
    el.style.fontSize = '2rem';
    el.style.fontWeight = 'bold';
    el.style.color = '#4ade80';
    el.style.zIndex = '9999';
    el.style.pointerEvents = 'none';
    el.style.animation = 'floatUp 1.5s ease-out forwards';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  function resetStreak() {
    GameState.streak = 0;
    updateDisplay();
  }

  function getBadgeInfo(score) {
    const percentage = (score / GAME_CONFIG.TOTAL_POSSIBLE) * 100;
    if (percentage >= 95) return { icon: '🏆', text: 'LEGENDARY' };
    if (percentage >= 85) return { icon: '⭐', text: 'Expert' };
    if (percentage >= 75) return { icon: '🌟', text: 'Advanced' };
    if (percentage >= 60) return { icon: '✨', text: 'Intermediate' };
    return { icon: '🎯', text: 'Beginner' };
  }

  // ==================== STAGE 1: FLOW ARRANGEMENT ====================
  function initStage1() {
    let tempChosenFlow = [];

    elements.flowTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        if (tile.classList.contains('selected')) return;

        const step = tile.dataset.step;
        tempChosenFlow.push(step);
        tile.classList.add('selected', 'tile-selected');

        // Update display
        const resultElements = [];
        tempChosenFlow.forEach(step => {
          const label = { prepare: '⚙️', scan: '🔍', analyze: '📊', review: '📋' }[step];
          resultElements.push(`<span class="flow-step">${label}</span>`);
        });
        elements.flowResult.innerHTML = resultElements.join(' → ') || 'Click tiles to build sequence...';

        // Enable deselect and reset buttons
        buttons.stage1Deselect.disabled = false;

        const correctOrder = ['prepare', 'scan', 'analyze', 'review'];
        
        if (tempChosenFlow.length === correctOrder.length) {
          const isCorrect = JSON.stringify(tempChosenFlow) === JSON.stringify(correctOrder);
          
          elements.flowTiles.forEach((btn, idx) => {
            btn.classList.remove('correct', 'wrong');
            if (tempChosenFlow[idx] === correctOrder[idx]) {
              btn.classList.add('correct');
            } else {
              btn.classList.add('wrong');
            }
          });

          if (isCorrect) {
            elements.flowFeedback.className = 'feedback-text positive';
            elements.flowFeedback.textContent = '✓ Perfect! You understand the inspection flow!';
            GameState.stage1.correct = true;
            GameState.stage1.score = Math.max(GAME_CONFIG.STAGE_1_POINTS - (GameState.stage1.attempts * 50), 100);
            addExperience(GameState.stage1.score);
            buttons.stage1Next.disabled = false;
          } else {
            elements.flowFeedback.className = 'feedback-text negative';
            elements.flowFeedback.textContent = '✗ Not quite right. Use deselect to fix your sequence.';
            GameState.stage1.attempts++;
            resetStreak();
          }
        }
      });
    });

    buttons.stage1Deselect?.addEventListener('click', () => {
      if (tempChosenFlow.length === 0) return;
      
      const removed = tempChosenFlow.pop();
      const tileToDeselect = Array.from(elements.flowTiles).find(t => t.dataset.step === removed);
      if (tileToDeselect) {
        tileToDeselect.classList.remove('selected', 'tile-selected', 'correct', 'wrong');
      }
      
      if (tempChosenFlow.length === 0) {
        buttons.stage1Deselect.disabled = true;
      }
      
      elements.flowFeedback.className = 'feedback-text neutral';
      elements.flowFeedback.textContent = 'Continue building your sequence...';
      buttons.stage1Next.disabled = true;
      
      // Update display
      const resultElements = [];
      tempChosenFlow.forEach(step => {
        const label = { prepare: '⚙️', scan: '🔍', analyze: '📊', review: '📋' }[step];
        resultElements.push(`<span class="flow-step">${label}</span>`);
      });
      elements.flowResult.innerHTML = resultElements.join(' → ') || '<span class="empty-state">Click tiles to build sequence...</span>';
    });

    buttons.stage1Reset?.addEventListener('click', () => {
      tempChosenFlow = [];
      elements.flowTiles.forEach(tile => {
        tile.classList.remove('selected', 'tile-selected', 'correct', 'wrong');
      });
      elements.flowFeedback.className = 'feedback-text neutral';
      elements.flowFeedback.textContent = 'Ready to start! Click a tile.';
      buttons.stage1Deselect.disabled = true;
      buttons.stage1Next.disabled = true;
      elements.flowResult.innerHTML = '<span class="empty-state">Click tiles to build sequence...</span>';
    });

    buttons.stage1Next?.addEventListener('click', () => {
      showScreen('stage2');
    });
  }

  // ==================== STAGE 2: SENSOR SELECTION ====================
  function initStage2() {
    let correctSelected = new Set();
    let wrongSelected = false;
    const selectedButtons = new Set();
    const selectionOrder = []; // Track order of selections for deselect

    elements.sensorChoices.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('selected')) return;

        btn.classList.add('selected', 'sensor-selected');
        selectedButtons.add(btn);
        selectionOrder.push(btn); // Track order
        GameState.stage2.selections++;

        const isCorrect = btn.dataset.correct === 'true';

        if (isCorrect) {
          btn.classList.add('correct');
          correctSelected.add(btn.textContent.trim());
          addExperience(75);
        } else {
          btn.classList.add('wrong');
          wrongSelected = true;
          resetStreak();
        }

        // Enable deselect button
        buttons.stage2Deselect.disabled = false;

        // Update progress
        const progressValue = correctSelected.size;
        elements.sensorProgress.textContent = `${progressValue}/3`;
        elements.sensorProgressBar.style.width = (progressValue / 3 * 100) + '%';

        // Update feedback
        if (correctSelected.size === 3 && !wrongSelected) {
          elements.sensorFeedback.className = 'feedback-text positive';
          elements.sensorFeedback.textContent = '✓ Excellent! All correct sensors identified!';
          GameState.stage2.correct = true;
          GameState.stage2.score = GAME_CONFIG.STAGE_2_POINTS;
          buttons.stage2Next.disabled = false;
        } else if (wrongSelected) {
          elements.sensorFeedback.className = 'feedback-text negative';
          elements.sensorFeedback.textContent = '✗ One item is not part of the inspection system. Use deselect if needed.';
        } else {
          elements.sensorFeedback.className = 'feedback-text neutral';
          elements.sensorFeedback.textContent = `Good progress: ${correctSelected.size}/3 correct sensors selected.`;
        }
      });
    });

    buttons.stage2Deselect?.addEventListener('click', () => {
      if (selectionOrder.length === 0) return;
      
      const lastSelected = selectionOrder.pop();
      lastSelected.classList.remove('selected', 'sensor-selected', 'correct', 'wrong');
      selectedButtons.delete(lastSelected);
      
      const wasCorrect = lastSelected.dataset.correct === 'true';
      if (wasCorrect) {
        correctSelected.delete(lastSelected.textContent.trim());
        GameState.stage2.correct = false;
        buttons.stage2Next.disabled = true;
      } else {
        wrongSelected = false;
      }
      
      GameState.stage2.selections--;
      
      // Disable deselect if no more selections
      if (selectionOrder.length === 0) {
        buttons.stage2Deselect.disabled = true;
      }
      
      // Update progress
      const progressValue = correctSelected.size;
      elements.sensorProgress.textContent = `${progressValue}/3`;
      elements.sensorProgressBar.style.width = (progressValue / 3 * 100) + '%';
      
      // Update feedback
      elements.sensorFeedback.className = 'feedback-text neutral';
      elements.sensorFeedback.textContent = 'Continue selecting the tools...';
    });

    buttons.stage2Reset?.addEventListener('click', () => {
      selectedButtons.forEach(btn => {
        btn.classList.remove('selected', 'sensor-selected', 'correct', 'wrong');
      });
      selectedButtons.clear();
      selectionOrder.length = 0;
      correctSelected.clear();
      wrongSelected = false;
      GameState.stage2.correct = false;
      GameState.stage2.selections = 0;
      
      elements.sensorFeedback.className = 'feedback-text neutral';
      elements.sensorFeedback.textContent = 'Select the inspection tools used';
      elements.sensorProgress.textContent = '0/3';
      elements.sensorProgressBar.style.width = '0%';
      buttons.stage2Deselect.disabled = true;
      buttons.stage2Next.disabled = true;
    });

    buttons.stage2Back?.addEventListener('click', () => {
      showScreen('stage1');
    });

    buttons.stage2Next?.addEventListener('click', () => {
      showScreen('stage3');
    });
  }

  // ==================== STAGE 3: DEFECT SORTING ====================
  function initStage3() {
    let activeCard = null;
    let sortedCount = 0;

    // Make defect cards clickable
    elements.defectCards.forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        // Deselect previous card
        elements.defectCards.forEach(c => c.classList.remove('selected', 'card-selected'));
        
        // Select new card
        card.classList.add('selected', 'card-selected');
        activeCard = card;
        
        // Update feedback
        const defectText = card.querySelector('.defect-text')?.textContent || card.textContent.trim();
        elements.defectFeedback.className = 'feedback-text neutral';
        elements.defectFeedback.textContent = `Selected: ${defectText}`;
        
        // Enable send buttons
        buttons.sendSurface.disabled = false;
        buttons.sendSubsurface.disabled = false;
      });
    });

    function sortDefect(targetType) {
      if (!activeCard) {
        elements.defectFeedback.className = 'feedback-text negative';
        elements.defectFeedback.textContent = '✗ Please select a defect card first!';
        return;
      }

      const correctAnswer = activeCard.dataset.answer;
      const isCorrect = targetType === correctAnswer;
      
      // Get defect name
      const defectText = activeCard.querySelector('.defect-text')?.textContent || activeCard.textContent.trim().split('\n')[0];

      // Create sorted chip
      const chip = document.createElement('div');
      chip.className = 'sorted-chip chip-animate';
      chip.innerHTML = `<span class="chip-text">${defectText}</span>`;
      
      if (isCorrect) {
        chip.classList.add('correct-chip');
        elements.defectFeedback.className = 'feedback-text positive';
        elements.defectFeedback.textContent = '✓ Correct! Great classification!';
        GameState.stage3.correct++;
        addExperience(125);
      } else {
        chip.classList.add('wrong-chip');
        elements.defectFeedback.className = 'feedback-text negative';
        elements.defectFeedback.textContent = '✗ Wrong category. This defect is ' + (correctAnswer === 'surface' ? 'Surface' : 'Subsurface') + '.';
        resetStreak();
      }

      // Add to the correct bin
      if (targetType === 'surface') {
        elements.surfaceBin.appendChild(chip);
        elements.surfaceCount.textContent = elements.surfaceBin.children.length;
      } else {
        elements.subsurfaceBin.appendChild(chip);
        elements.subsurfaceCount.textContent = elements.subsurfaceBin.children.length;
      }

      // Mark card as done and disable it
      activeCard.classList.add('done', 'card-done');
      activeCard.style.opacity = '0.5';
      activeCard.style.pointerEvents = 'none';
      activeCard = null;
      
      // Deselect all cards
      elements.defectCards.forEach(c => c.classList.remove('selected', 'card-selected'));
      
      // Disable send buttons
      buttons.sendSurface.disabled = true;
      buttons.sendSubsurface.disabled = true;
      
      sortedCount++;
      GameState.stage3.sorted = sortedCount;

      // Check if all sorted
      if (sortedCount === 4) {
        GameState.stage3.score = Math.max((GameState.stage3.correct / 4) * GAME_CONFIG.STAGE_3_POINTS, 100);
        if (GameState.stage3.correct === 4) {
          elements.defectFeedback.className = 'feedback-text positive';
          elements.defectFeedback.textContent = '✓ Perfect! All defects sorted correctly!';
        }
        buttons.finishBtn.disabled = false;
      }
    }

    // Setup send button click handlers
    buttons.sendSurface?.addEventListener('click', () => {
      sortDefect('surface');
    });

    buttons.sendSubsurface?.addEventListener('click', () => {
      sortDefect('subsurface');
    });

    // Reset button for Stage 3
    buttons.stage3Reset?.addEventListener('click', () => {
      GameState.stage3 = { score: 0, correct: 0, total: 4, sorted: 0 };
      sortedCount = 0;
      
      // Reset all defect cards
      elements.defectCards.forEach(card => {
        card.classList.remove('selected', 'card-selected', 'card-done', 'done');
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
        card.disabled = false;
      });
      
      // Clear bins
      elements.surfaceBin.innerHTML = '';
      elements.subsurfaceBin.innerHTML = '';
      elements.surfaceCount.textContent = '0';
      elements.subsurfaceCount.textContent = '0';
      
      // Reset feedback and buttons
      elements.defectFeedback.className = 'feedback-text neutral';
      elements.defectFeedback.textContent = 'Select a defect card first';
      buttons.sendSurface.disabled = true;
      buttons.sendSubsurface.disabled = true;
      buttons.finishBtn.disabled = true;
      
      activeCard = null;
    });

    buttons.stage3Back?.addEventListener('click', () => {
      showScreen('stage2');
    });

    buttons.finishBtn?.addEventListener('click', () => {
      showCompletionScreen();
    });
  }

  // ==================== COMPLETION SCREEN ====================
  function showCompletionScreen() {
    showScreen('complete');

    const badge = getBadgeInfo(GameState.score);
    elements.finalScore.textContent = GameState.score;
    elements.finalAccuracy.textContent = calculateAccuracy() + '%';
    elements.finalBadge.textContent = badge.icon;
    elements.finalBadgeText.textContent = badge.text;

    elements.score1.textContent = GameState.stage1.score + ' pts';
    elements.score2.textContent = GameState.stage2.score + ' pts';
    elements.score3.textContent = GameState.stage3.score + ' pts';

    // Store completion
    localStorage.setItem('claysight-guide-complete', 'true');
    localStorage.setItem('claysight-game-score', GameState.score);
  }

  // ==================== INITIALIZATION ====================
  function initGame() {
    GameState.startTime = Date.now();
    GameState.stageStartTime = Date.now();
    showScreen('intro');
    updateDisplay();

    buttons.start?.addEventListener('click', () => {
      resetGameState();
      showScreen('stage1');
      initStage1();
      initStage2();
      initStage3();
    });

    buttons.skip?.addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });

    buttons.goDashboard?.addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });

    buttons.replayGuide?.addEventListener('click', () => {
      resetGameState();
      initGame();
    });
  }

  function resetGameState() {
    GameState.score = 0;
    GameState.accuracy = 0;
    GameState.streak = 0;
    GameState.stage1 = { score: 0, correct: false, attempts: 0, selectedFlow: [] };
    GameState.stage2 = { score: 0, correct: false, selections: 0, selected: new Set() };
    GameState.stage3 = { score: 0, correct: 0, total: 4, sorted: 0 };
    
    elements.flowTiles.forEach(t => {
      t.classList.remove('selected', 'correct', 'wrong', 'tile-selected');
      t.disabled = false;
    });
    
    elements.sensorChoices.forEach(s => {
      s.classList.remove('selected', 'correct', 'wrong', 'sensor-selected');
      s.disabled = false;
    });

    elements.defectCards.forEach(c => {
      c.classList.remove('selected', 'done', 'card-selected', 'card-done');
      c.style.opacity = '1';
      c.style.pointerEvents = 'auto';
      c.disabled = false;
    });

    elements.surfaceBin.innerHTML = '';
    elements.subsurfaceBin.innerHTML = '';
    elements.surfaceCount.textContent = '0';
    elements.subsurfaceCount.textContent = '0';

    buttons.stage1Deselect.disabled = true;
    buttons.stage1Next.disabled = true;
    buttons.stage2Deselect.disabled = true;
    buttons.stage2Reset.disabled = false;
    buttons.stage2Next.disabled = true;
    buttons.stage3Reset.disabled = false;
    buttons.sendSurface.disabled = true;
    buttons.sendSubsurface.disabled = true;
    buttons.finishBtn.disabled = true;

    updateDisplay();
    updateProgressBar('intro');
  }

  // Add CSS animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes floatUp {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-50px);
      }
    }
    @keyframes chipSlideIn {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    .chip-animate {
      animation: chipSlideIn 0.3s ease-out;
    }
  `;
  document.head.appendChild(style);

  // Start game
  initGame();
})();