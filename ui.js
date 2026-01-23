import { generateHeartSVG } from './utils.js';

export class UIController {
    constructor(elements) {
        this.elements = elements;
        this.levelFadeTimeout = null;
        this.gameOverButtonTimeout = null;
        this.restartTextTimeout = null;
    }

    showAbout() {
        if(this.elements.aboutView) this.elements.aboutView.classList.remove('hidden');
    }

    hideAbout() {
        if(this.elements.aboutView) this.elements.aboutView.classList.add('hidden');
    }

    showStartMenu() {
        this.elements.startMenu.classList.remove('hidden');
        this.elements.gameOverMenu.classList.add('hidden');
        this.elements.scoreDisplay.classList.add('hidden');
        this.elements.levelDisplay.classList.add('hidden');
        this.elements.vsStatusDisplay.classList.add('hidden');
        if(this.elements.aboutView) this.elements.aboutView.classList.add('hidden');
        this.resetVSUI();
        this.clearTimeouts(); 
        this.elements.submitScoreBtn.disabled = false;
        this.elements.submitScoreBtn.textContent = 'Submit Score';
    }

    showGameScreen() {
        this.elements.startMenu.classList.add('hidden');
        this.elements.gameOverMenu.classList.add('hidden');
        this.elements.scoreDisplay.classList.remove('hidden');
        this.elements.levelDisplay.classList.remove('level-out', 'level-in');
        this.elements.difficultyIndicator.classList.remove('hidden');
        
        // Force reflow
        void this.elements.levelDisplay.offsetWidth;
        setTimeout(() => {
            this.elements.levelDisplay.classList.add('level-in');
        }, 50);
    }

    showVSZenScreen() {
        this.elements.startMenu.classList.add('hidden');
        this.elements.gameOverMenu.classList.add('hidden');
        this.elements.scoreDisplay.classList.remove('hidden');
        this.elements.levelDisplay.classList.remove('hidden');
        this.elements.vsStatusDisplay.classList.remove('hidden');
    }

    showGameOverMenu(score) {
        this.elements.startMenu.classList.add('hidden');
        this.elements.gameOverMenu.classList.remove('hidden');
        this.elements.scoreDisplay.classList.add('hidden');
        this.elements.levelDisplay.classList.remove('level-in', 'level-out');
        this.elements.finalScoreEl.textContent = score;
        
        const gameOverButtons = this.elements.gameOverMenu.querySelectorAll('button');
        gameOverButtons.forEach(btn => btn.disabled = true);

        // Reset submit button text before it appears
        this.elements.submitScoreBtn.textContent = 'Submit Score';

        // Delay Tap to Restart appearance
        if (this.elements.tapToRestart) {
            this.elements.tapToRestart.style.opacity = '0';
            this.elements.tapToRestart.classList.remove('blink');
            
            this.restartTextTimeout = setTimeout(() => {
                this.elements.tapToRestart.style.transition = 'opacity 0.5s ease-in';
                this.elements.tapToRestart.style.opacity = '1';
                
                // Resume blinking after fade in
                this.restartTextTimeout = setTimeout(() => {
                    this.elements.tapToRestart.style.transition = '';
                    this.elements.tapToRestart.style.opacity = '';
                    this.elements.tapToRestart.classList.add('blink');
                    this.restartTextTimeout = null;
                }, 500);
            }, 500);
        }
        
        this.gameOverButtonTimeout = setTimeout(() => {
            gameOverButtons.forEach(btn => btn.disabled = false);
        }, 800); // 0.8 second delay

        this.levelFadeTimeout = setTimeout(() => {
            this.elements.levelDisplay.classList.add('hidden');
        }, 3000);
    }

    updateScore(score) {
        if (!this.elements.scoreDisplay.classList.contains('hidden')) {
            this.elements.scoreEl.textContent = score;
        }
        // Always update player VS score just in case
        const playerVsScore = document.getElementById('player-vs-score');
        if (playerVsScore) {
            playerVsScore.textContent = `Score: ${score}`;
        }
    }

    updateOpponentScore(score) {
        const opponentScore = document.getElementById('opponent-score');
        if (opponentScore) {
            opponentScore.textContent = `Score: ${score}`;
        }
    }

    updateOpponentLevel(level) {
        const el = document.getElementById('opponent-level');
        if (el) el.textContent = level;
    }

    updateLevel(level, isInitial = false) {
        const levelDisplay = this.elements.levelDisplay;
        
        if (isInitial) {
            levelDisplay.classList.remove('hidden'); // Ensure it's visible
            levelDisplay.textContent = level;
            levelDisplay.classList.remove('level-in', 'level-out');
            // Force reflow
            void levelDisplay.offsetWidth;
            setTimeout(() => {
                levelDisplay.classList.add('level-in');
            }, 50);
            return;
        }

        levelDisplay.classList.remove('level-in');
        levelDisplay.classList.add('level-out');

        const onOutAnimationEnd = () => {
            levelDisplay.removeEventListener('animationend', onOutAnimationEnd);
            levelDisplay.textContent = level;
            levelDisplay.classList.remove('level-out');
            levelDisplay.classList.add('level-in');

            const onInAnimationEnd = () => {
                levelDisplay.removeEventListener('animationend', onInAnimationEnd);
                levelDisplay.classList.remove('level-in');
            };
            levelDisplay.addEventListener('animationend', onInAnimationEnd, { once: true });
        };
        levelDisplay.addEventListener('animationend', onOutAnimationEnd, { once: true });
    }

    showReplayContainer() {
        this.elements.replayContainer.classList.remove('hidden');
        this.elements.gameOverMenu.classList.add('hidden');
    }

    hideReplayContainer(origin = 'gameover') {
        this.elements.replayContainer.classList.add('hidden');
        if (origin === 'leaderboard') {
            this.elements.leaderboardView.classList.remove('hidden');
        } else {
            this.elements.gameOverMenu.classList.remove('hidden');
        }
    }

    showLeaderboardView() {
        this.elements.startMenu.classList.add('hidden');
        this.elements.gameOverMenu.classList.add('hidden');
        this.elements.leaderboardView.classList.remove('hidden');
    }

    hideLeaderboardView(origin = 'start') {
        this.elements.leaderboardView.classList.add('hidden');
        if (origin === 'gameover') {
            this.elements.gameOverMenu.classList.remove('hidden');
        } else {
            this.elements.startMenu.classList.remove('hidden');
        }
    }

    showPagination() {
        this.elements.leaderboardPagination.classList.remove('hidden');
    }

    hidePagination() {
        this.elements.leaderboardPagination.classList.add('hidden');
    }

    setSubmitButtonState(state, text) {
        this.elements.submitScoreBtn.disabled = state === 'disabled';
        this.elements.submitScoreBtn.textContent = text;
    }

    updateDifficulty(difficulty) {
        // Update top-right indicator
        const indicator = document.getElementById('difficulty-indicator');
        if (indicator) {
            indicator.setAttribute('data-difficulty', difficulty);
            indicator.title = `Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`;
        }

        // Update buttons
        const allDiffBtns = document.querySelectorAll('.diff-btn');
        allDiffBtns.forEach(btn => {
            if (btn.dataset.difficulty === difficulty) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // VS Mode UI Methods
    updateVSLobbyPreview(users) {
        const container = document.getElementById('vs-lobby-preview');
        if (!container) return;

        container.innerHTML = '';
        
        // Prioritize seeking users (waiting), then playing
        const sortedUsers = users.sort((a, b) => {
            if (a.status === 'seeking' && b.status !== 'seeking') return -1;
            if (a.status !== 'seeking' && b.status === 'seeking') return 1;
            return 0;
        });

        // Show max 3 avatars
        const maxAvatars = 3;
        const count = sortedUsers.length;
        const displayUsers = sortedUsers.slice(0, maxAvatars);

        displayUsers.forEach((user, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'lobby-avatar-container';
            // Reverse z-index so first element is on top of the stack
            wrapper.style.zIndex = maxAvatars - index; 

            const img = document.createElement('img');
            img.src = user.avatarUrl || `https://images.websim.com/avatar/${user.username}`;
            img.className = `lobby-avatar status-${user.status}`;
            img.title = `${user.username} (${user.status === 'seeking' ? 'Waiting' : 'Fighting'})`;
            
            wrapper.appendChild(img);
            container.appendChild(wrapper);
        });

        if (count > maxAvatars) {
            const overflow = document.createElement('div');
            overflow.className = 'lobby-overflow';
            overflow.textContent = `+${count - maxAvatars}`;
            container.appendChild(overflow);
        }
    }

    updateVSStatus(text, show) {
        this.elements.vsStatusDisplay.textContent = text;
        if (show) this.elements.vsStatusDisplay.classList.remove('hidden');
        else this.elements.vsStatusDisplay.classList.add('hidden');
    }

    setupVSMatch(opponent) {
        this.elements.difficultyIndicator.classList.add('hidden');
        this.elements.scoreDisplay.classList.add('hidden'); // Hide main score
        this.elements.playerHeartsContainer.classList.remove('hidden');
        this.elements.opponentView.classList.remove('hidden');
        
        // Setup Player Hearts
        this.elements.playerHearts.innerHTML = '';
        for(let i=0; i<3; i++) {
            this.elements.playerHearts.innerHTML += generateHeartSVG('player', i);
        }

        // Setup Opponent
        document.getElementById('opponent-name').textContent = opponent.username;
        const pfpEl = document.getElementById('opponent-pfp');
        if (pfpEl) {
            pfpEl.src = opponent.avatarUrl || `https://images.websim.com/avatar/${opponent.username}`;
        }

        const oppHeartsEl = document.getElementById('opponent-hearts');
        oppHeartsEl.innerHTML = '';
        for(let i=0; i<3; i++) {
            oppHeartsEl.innerHTML += generateHeartSVG('opp', i);
        }
        
        this.updateOpponentLevel(1);

        // Start updates loop/animation if needed
        this.animateHearts(300, 'player');
        this.animateHearts(300, 'opp');
    }

    updatePlayerHearts(health) {
        this.animateHearts(health, 'player');
    }

    updateOpponentHearts(health) {
        this.animateHearts(health, 'opp');
    }

    animateHearts(health, prefix) {
        // Health is 0-300
        for (let i = 0; i < 3; i++) {
            const heartHealth = Math.max(0, Math.min(100, health - (i * 100)));
            const percentage = heartHealth / 100;
            
            // Adjust rect y position to drain
            const fillRect = document.querySelector(`#${prefix}-clip-${i} rect`);
            const wrapper = document.querySelector(`#${prefix}-heart-${i}`);
            
            if (fillRect) {
                // height is 24, so y goes from 0 (full) to 24 (empty)
                const y = 24 * (1 - percentage);
                fillRect.setAttribute('y', y);
            }

            if (wrapper) {
                if (percentage === 1) {
                    wrapper.classList.add('heart-pulsing');
                    wrapper.style.filter = ''; // Ensure we clear grayscale if coming from 0
                } else if (percentage === 0) {
                    wrapper.classList.remove('heart-pulsing');
                    wrapper.style.filter = 'grayscale(1) brightness(0.5)';
                } else {
                    wrapper.classList.remove('heart-pulsing');
                    wrapper.style.filter = '';
                }
            }
        }
    }

    resetVSUI() {
        this.elements.difficultyIndicator.classList.remove('hidden');
        this.elements.playerHeartsContainer.classList.add('hidden');
        this.elements.opponentView.classList.add('hidden');
        this.elements.vsStatusDisplay.classList.add('hidden');
        // Ensure main score is visible if not in menu
        if (this.elements.startMenu.classList.contains('hidden') && this.elements.gameOverMenu.classList.contains('hidden')) {
            this.elements.scoreDisplay.classList.remove('hidden');
        }
    }

    clearTimeouts() {
        if (this.levelFadeTimeout) {
            clearTimeout(this.levelFadeTimeout);
            this.levelFadeTimeout = null;
        }
        if (this.gameOverButtonTimeout) {
            clearTimeout(this.gameOverButtonTimeout);
            this.gameOverButtonTimeout = null;
        }
        if (this.restartTextTimeout) {
            clearTimeout(this.restartTextTimeout);
            this.restartTextTimeout = null;
        }
    }
}