import { Game } from './game.js';
import { UIController } from './ui.js';
import { submitScore, migrateUserScores } from './leaderboard-api.js';
import { showReplay, hideReplay } from './replay.js';
import { playBackgroundMusic, fadeInMusic, fadeOutMusic, setMusicMuted, setSFXMuted } from './audio.js';
import { LeaderboardController } from './leaderboard-controller.js';
import { InputController } from './input-controller.js';
import { VSManager } from './vs-manager.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    let hasInteracted = false;

    const handleFirstInteraction = () => {
        if (!hasInteracted) {
            hasInteracted = true;
            playBackgroundMusic();
        }
    };
    
    // UI Elements
    const elements = {
        scoreDisplay: document.getElementById('score-display'),
        scoreEl: document.getElementById('score'),
        levelDisplay: document.getElementById('level-display'),
        startMenu: document.getElementById('start-menu'),
        gameOverMenu: document.getElementById('game-over-menu'),
        finalScoreEl: document.getElementById('final-score'),
        homeBtn: document.getElementById('home-btn'),
        difficultyBtns: document.querySelectorAll('.difficulty-btn'),
        replayBtn: document.getElementById('replay-btn'),
        replayContainer: document.getElementById('replay-container'),
        closeReplayBtn: document.getElementById('close-replay-btn'),
        submitScoreBtn: document.getElementById('submit-score-btn'),
        leaderboardBtn: document.getElementById('leaderboard-btn'),
        leaderboardView: document.getElementById('leaderboard-view'),
        closeLeaderboardBtn: document.getElementById('close-leaderboard-btn'),
        leaderboardMainView: document.getElementById('leaderboard-main-view'),
        leaderboardList: document.getElementById('leaderboard-list'),
        leaderboardDifficultyFilters: document.getElementById('leaderboard-difficulty-filters'),
        leaderboardFilterBtns: document.querySelectorAll('.leaderboard-filter-btn'),
        leaderboardPagination: document.getElementById('leaderboard-pagination'),
        
        leaderboardDetailView: document.getElementById('leaderboard-detail-view'),
        detailList: document.getElementById('detail-list'),
        detailPagination: document.getElementById('detail-pagination'),
        detailBackBtn: document.getElementById('detail-back-btn'),
        detailHeaderContent: document.getElementById('detail-header-content'),

        musicToggleBtn: document.getElementById('music-toggle-btn'),
        tapToRestart: document.getElementById('tap-to-restart'),

        // VS Elements
        vsModeBtn: document.getElementById('vs-mode-btn'),
        playerHeartsContainer: document.getElementById('player-hearts-container'),
        playerHearts: document.getElementById('player-hearts'),
        opponentView: document.getElementById('opponent-view'),
        difficultyIndicator: document.getElementById('difficulty-indicator'),
        vsStatusDisplay: document.getElementById('vs-status-display'),

        // About view
        aboutBtn: document.getElementById('about-btn'),
        aboutView: document.getElementById('about-view'),
        closeAboutBtn: document.getElementById('close-about-btn')
    };

    const game = new Game(canvas);
    const ui = new UIController(elements);
    const vsManager = new VSManager(game, ui);

    // Link game to VS manager
    game.vsManagerUpdate = (dt) => vsManager.updateGameLoop(dt);
    
    let replayOrigin = 'gameover'; // 'gameover' or 'leaderboard'
    let leaderboardOrigin = 'start';
    let currentDifficulty = 'easy';

    // Initialize Controllers
    const leaderboardController = new LeaderboardController(elements, ui, {
        onReplay: (replayData) => {
            replayOrigin = 'leaderboard';
            fadeOutMusic();
            elements.leaderboardView.classList.add('hidden');
            ui.showReplayContainer();
            showReplay(replayData);
        },
        onInteraction: handleFirstInteraction
    });

    const inputController = new InputController(game, handleFirstInteraction);
    inputController.init();

    // removed leaderboard logic, state variables and handlers (moved to LeaderboardController)
    // removed tap and spacebar handlers (moved to InputController)

    // Set up game callbacks
    game.onScoreUpdate = (score) => ui.updateScore(score);
    game.onLevelUp = (level, isInitial) => {
        ui.updateLevel(level, isInitial);
        // Sync level for drain logic handled in game loop
    };
    
    // Hook for VS health updates
    const originalGameLoop = game.gameLoop.bind(game);
    game.gameLoop = (t) => {
        originalGameLoop(t);
        if (game.mode === 'vs') {
            ui.updatePlayerHearts(game.health);
        }
    };

    game.onGameOver = (gameData) => {
        if (gameData.mode === 'vs') {
            const resultText = gameData.result === 'win' ? 'VICTORY' : 'DEFEAT';
            ui.showGameOverMenu(resultText);
            elements.finalScoreEl.textContent = resultText;
            elements.finalScoreEl.style.color = gameData.result === 'win' ? 'var(--success-color)' : 'var(--fail-color)';
        } else {
            ui.showGameOverMenu(gameData.score);
            elements.finalScoreEl.style.color = '';
        }
    };

    // Difficulty Selection
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling to start menu
            handleFirstInteraction(); // Start audio on difficulty select
            const difficulty = btn.dataset.difficulty;
            currentDifficulty = difficulty;
            ui.updateDifficulty(difficulty);
            game.setDifficulty(difficulty); // Update visuals
        });
    });

    // VS Mode Button
    if (elements.vsModeBtn) {
        elements.vsModeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleFirstInteraction();
            ui.showVSZenScreen();
            vsManager.startSeeking();
            game.start('easy'); // Start Zen mode logic internally set in vsManager
        });
    }

    // Tap to Start
    elements.startMenu.addEventListener('click', (e) => {
        // Prevent starting if clicking on difficulty buttons or VS button
        if (e.target.closest('.difficulty-selector') || e.target.closest('.vs-btn')) return;
        
        handleFirstInteraction();
        game.start(currentDifficulty);
        ui.showGameScreen();
    });

    // Game Over Menu Tap to Restart
    elements.gameOverMenu.addEventListener('click', (e) => {
        // Don't trigger if clicking buttons or interactions inside
        if (e.target.closest('button') || e.target.closest('.difficulty-selector')) return;
        
        // Prevent accidental restart if text is not visible yet
        if (elements.tapToRestart && elements.tapToRestart.style.opacity === '0') return;

        ui.clearTimeouts();
        game.reset();
        
        if (game.mode === 'vs') {
             ui.showStartMenu(); // VS goes back to menu to find new opponent
        } else {
            ui.showGameScreen();
            game.start(currentDifficulty);
        }
    });

    // Home button
    elements.homeBtn.addEventListener('click', () => {
        if (game.mode === 'zen' || game.mode === 'vs') {
            vsManager.cancelSeeking();
        }
        ui.clearTimeouts();
        game.setMode('standard');
        game.reset();
        ui.showStartMenu();
    });

    // Replay button (from Game Over)
    elements.replayBtn.addEventListener('click', async () => {
        handleFirstInteraction();
        replayOrigin = 'gameover';
        fadeOutMusic();
        ui.showReplayContainer();
        
        if (!game.replayConfig.currentUser) {
            try {
                const currentUser = await window.websim.getCurrentUser();
                game.replayConfig.currentUser = currentUser;
            } catch (error) {
                console.error("Could not get current user for replay:", error);
                game.replayConfig.currentUser = null;
            }
        }

        showReplay({
            frames: game.replayFrames,
            config: game.replayConfig
        });
    });

    elements.closeReplayBtn.addEventListener('click', () => {
        ui.hideReplayContainer(replayOrigin);
        hideReplay();
        fadeInMusic();
    });

    // Submit score button
    elements.submitScoreBtn.addEventListener('click', async () => {
        ui.setSubmitButtonState('disabled', 'Submitting...');
        
        await submitScore(
            game.lastGameData,
            () => ui.setSubmitButtonState('disabled', 'Submitted!'),
            () => {
                ui.setSubmitButtonState('disabled', 'Error!');
                setTimeout(() => {
                    ui.setSubmitButtonState('enabled', 'Submit Score');
                }, 2000);
            }
        );
    });

    // Audio Toggle (3 States: All On -> Music Muted -> All Muted -> ...)
    let audioState = 0; // 0: On, 1: Music Off, 2: All Off
    elements.musicToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Don't trigger game tap
        handleFirstInteraction(); // Ensure audio context is ready
        
        audioState = (audioState + 1) % 3;
        
        const onIcon = elements.musicToggleBtn.querySelector('.audio-on');
        const musicOffIcon = elements.musicToggleBtn.querySelector('.music-off');
        const allOffIcon = elements.musicToggleBtn.querySelector('.audio-off');
        
        // Update Audio Logic
        if (audioState === 0) {
            // All On
            setMusicMuted(false);
            setSFXMuted(false);
            
            onIcon.classList.remove('hidden');
            musicOffIcon.classList.add('hidden');
            allOffIcon.classList.add('hidden');
            elements.musicToggleBtn.style.color = ''; // Reset color
        } else if (audioState === 1) {
            // Music Muted (SFX On)
            setMusicMuted(true);
            setSFXMuted(false);

            onIcon.classList.add('hidden');
            musicOffIcon.classList.remove('hidden');
            allOffIcon.classList.add('hidden');
            elements.musicToggleBtn.style.color = 'var(--fail-color)'; // Red indicator
        } else {
            // All Muted
            setMusicMuted(true);
            setSFXMuted(true);

            onIcon.classList.add('hidden');
            musicOffIcon.classList.add('hidden');
            allOffIcon.classList.remove('hidden');
            elements.musicToggleBtn.style.color = ''; // Reset color
        }
    });

    // Leaderboard button (Game Over)
    elements.leaderboardBtn.addEventListener('click', () => {
        leaderboardOrigin = 'gameover';
        leaderboardController.show('easy');
    });

    // Leaderboard button (Start Menu)
    const startLeaderboardBtn = document.getElementById('start-leaderboard-btn');
    if (startLeaderboardBtn) {
        startLeaderboardBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            leaderboardOrigin = 'start';
            leaderboardController.show('easy');
        });
    }

    // About Button (Start Menu)
    if (elements.aboutBtn) {
        elements.aboutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ui.showAbout();
        });
    }

    if (elements.closeAboutBtn) {
        elements.closeAboutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ui.hideAbout();
        });
    }

    elements.closeLeaderboardBtn.addEventListener('click', () => {
        ui.hideLeaderboardView(leaderboardOrigin);
    });

    // Responsive UI Scaling
    const updateUIScale = () => {
        const minDim = Math.min(window.innerWidth, window.innerHeight);
        // Base scale on a reference dimension of 450px
        // Allow it to scale down to 0.6 (small inline) and up to 1.2 (desktop)
        const scale = Math.min(Math.max(minDim / 450, 0.6), 1.2);
        document.documentElement.style.setProperty('--ui-scale', scale);
    };

    // Window resize
    window.addEventListener('resize', () => {
        game.resizeCanvas();
        updateUIScale();
    });

    // Initial setup
    updateUIScale();
    game.reset();
    ui.updateDifficulty(currentDifficulty);
    game.setDifficulty(currentDifficulty);
    migrateUserScores();
});