import { hsl } from 'd3-color';
import { getHslStringForLevel, isAngleInArc, getComputedColors } from './utils.js';
import { initAudio, playSuccess, playFail, playStart } from './audio.js';
// removed draw-related imports

import { GameRenderer } from './game-renderer.js';
import { difficulties } from './game-config.js';

// A simplified interface to the LocalStorageSync class in leaderboard.js
const localScoreManager = {
    addScore: (gameData) => {
        try {
            const key = 'circleTapPendingScores';
            const pendingScores = JSON.parse(localStorage.getItem(key)) || [];
            if (!pendingScores.some(s => s.timestamp === gameData.timestamp)) {
                pendingScores.push(gameData);
                localStorage.setItem(key, JSON.stringify(pendingScores));
            }
        } catch (e) {
            console.error("Failed to save score locally:", e);
        }
    }
};

// removed difficulties constant (moved to game-config.js)

export class Game {
    constructor(canvas) {
        this.colors = getComputedColors();
        
        // Renderer handles canvas and drawing
        this.renderer = new GameRenderer(canvas, this.colors);
        
        // Visual dimensions for logic (synced from renderer)
        this.size = 0;
        this.radius = 0;
        this.lineWidth = 0;

        // Game state
        this.gameState = 'start';
        this.score = 0;
        this.angle = -Math.PI / 2;
        this.direction = 1;
        this.speed = 0;
        this.targetStartAngle = 0;
        this.targetSize = 0;
        this.lastFrameTime = 0;
        this.animationFrameId = null;
        this.currentDifficulty = 'easy';
        this.replayFrames = [];
        this.replayConfig = {};
        this.level = 0;
        this.tapsThisLevel = 0;
        this.tapsForNextLevel = 1;
        this.currentColorHsl = hsl(getHslStringForLevel(1));
        this.targetColorHsl = hsl(getHslStringForLevel(1));
        this.lastGameData = {};
        this.failTap = null;

        this.onGameOver = null;
        this.onScoreUpdate = null;
        this.onLevelUp = null;
        
        // VS Mode props
        this.mode = 'standard'; // 'standard', 'zen', 'vs'
        this.health = 300;
        this.maxHealth = 300;
        this.opponentLevel = 1;
        this.vsManagerUpdate = null; // Callback

        // Start idle animation loop
        this.lastFrameTime = performance.now();
        this.gameLoop(this.lastFrameTime);
    }

    setMode(mode) {
        this.mode = mode;
        if (mode === 'zen') {
             this.gameState = 'playing'; // Auto start for zen
             this.setDifficulty('easy');
             this.level = 1;
             this.generateNewTarget();
             this.currentColorHsl = hsl(getHslStringForLevel(1));
             this.targetColorHsl = hsl(getHslStringForLevel(1));
        }
    }

    setOpponentLevel(level) {
        this.opponentLevel = level;
    }

    setDifficulty(difficulty) {
        this.currentDifficulty = difficulty;
        this.targetSize = difficulties[difficulty].size;
        this.speed = difficulties[difficulty].speed;
        this.resizeCanvas();
        // Generate a random target for visual flair in menu
        if (this.gameState === 'start') {
            this.generateNewTarget();
        }
    }

    resizeCanvas() {
        const dimensions = this.renderer.resize(this.currentDifficulty);
        if (dimensions) {
            this.size = dimensions.size;
            this.radius = dimensions.radius;
            this.lineWidth = dimensions.lineWidth;
        }

        if (this.gameState !== 'playing') {
            this.draw();
        }
    }

    generateNewTarget() {
        this.targetStartAngle = Math.random() * Math.PI * 2;
    }

    start(difficulty, opponentInfo = null) {
        this.currentDifficulty = difficulty;
        this.resizeCanvas();

        initAudio();
        playStart();
        
        const settings = difficulties[difficulty];
        this.speed = settings.speed;
        this.targetSize = settings.size;

        this.score = 0;
        this.angle = -Math.PI / 2;
        this.direction = 1;

        this.level = 1; 
        this.tapsThisLevel = 0;
        this.tapsForNextLevel = 1;
        this.failTap = null;
        
        this.currentColorHsl = hsl(getHslStringForLevel(1));
        this.targetColorHsl = hsl(getHslStringForLevel(1));

        // VS specific reset
        if (this.mode === 'vs') {
            this.health = 300;
            this.opponentLevel = 1;
        }

        this.generateNewTarget();
        
        this.gameState = 'playing';
        this.replayFrames = [];
        this.replayConfig = {
            difficulty: this.currentDifficulty,
            difficulties,
            colors: this.colors,
            mode: this.mode,
            opponent: opponentInfo
        };
        
        if (this.onScoreUpdate) this.onScoreUpdate(this.score);
        if (this.onLevelUp) this.onLevelUp(this.level, true); 
    }

    gameOver(message = null, result = null, opponentName = null) {
        this.replayConfig.result = result;
        playFail();
        this.gameState = 'gameover';
        
        this.replayFrames.push({
            angle: this.angle,
            targetStartAngle: this.targetStartAngle,
            targetSize: this.targetSize,
            score: this.score,
            level: this.level, 
            health: this.health,
            targetColor: this.currentColorHsl.toString(),
            success: false,
            timestamp: performance.now(),
            opponent: this.opponentState ? {...this.opponentState} : null
        });

        this.lastGameData = {
            score: this.score,
            level: this.level,
            difficulty: this.currentDifficulty,
            mode: this.mode,
            replayData: {
                frames: this.replayFrames,
                config: this.replayConfig,
            },
            timestamp: new Date().toISOString(),
            // VS extras
            result: result,
            opponent: opponentName
        };

        // Save to local storage immediately, just in case (only standard mode)
        if (this.mode === 'standard') {
            localScoreManager.addScore(this.lastGameData);
        }

        if (this.onGameOver) this.onGameOver(this.lastGameData);
    }

    // removed drawVisualizer() {} - logic moved to GameRenderer

    draw() {
        // Collect state to pass to renderer
        const replayFrame = this.replayFrames[this.replayFrames.length-1];
        
        const renderState = {
            currentColorHsl: this.currentColorHsl,
            targetSize: this.targetSize,
            targetStartAngle: this.targetStartAngle,
            failTap: this.failTap,
            angle: this.angle,
            replayFrame: replayFrame
        };

        const isShowingFail = this.renderer.draw(renderState);
        
        // Sync failTap expiration if renderer says it's done
        if (this.failTap && !isShowingFail) {
            this.failTap = null;
        }
    }

    gameLoop(currentTime) {
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        // Smooth color interpolation
        const lerpFactor = Math.min(deltaTime * 2.5, 1);
        this.currentColorHsl.h += (this.targetColorHsl.h - this.currentColorHsl.h) * lerpFactor;
        this.currentColorHsl.s += (this.targetColorHsl.s - this.currentColorHsl.s) * lerpFactor;
        this.currentColorHsl.l += (this.targetColorHsl.l - this.currentColorHsl.l) * lerpFactor;
        this.currentColorHsl.opacity += (this.targetColorHsl.opacity - this.currentColorHsl.opacity) * lerpFactor;

        if (this.gameState === 'playing') {
            this.angle += this.speed * this.direction * deltaTime;
            
            // VS Logic: Drain
            if (this.mode === 'vs') {
                const DRAIN_RATE_BASE = 10;
                
                // If I am ahead, drain opponent (logic handled mostly by them, but I regenerate)
                if (this.level > this.opponentLevel) {
                     this.health = Math.min(this.maxHealth, this.health + (DRAIN_RATE_BASE / 2) * deltaTime);
                } 
                
                // If opponent is ahead, I drain
                if (this.opponentLevel > this.level) {
                    const diff = this.opponentLevel - this.level;
                    const drain = DRAIN_RATE_BASE * diff * deltaTime;
                    this.health = Math.max(0, this.health - drain);
                }

                // Snap to 0 if very low to ensure death triggers reliably
                if (this.health < 1) this.health = 0;

                if (this.vsManagerUpdate) this.vsManagerUpdate(deltaTime);
            }

            this.replayFrames.push({
                angle: this.angle,
                targetStartAngle: this.targetStartAngle,
                targetSize: this.targetSize,
                score: this.score,
                level: this.level,
                health: this.health,
                targetColor: this.currentColorHsl.toString(),
                timestamp: currentTime,
                pulseAmount: 0,
                opponent: this.opponentState ? {...this.opponentState} : null
            });
        } else if (this.gameState === 'start' || this.gameState === 'gameover') {
            // Idle spin
            const idleSpeed = difficulties[this.currentDifficulty].speed;
            this.angle += idleSpeed * deltaTime;
        }

        this.draw();
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    handleTap() {
        if (this.gameState !== 'playing') return;
        
        const angleTolerance = Math.atan2(this.lineWidth / 2.5, this.radius);
        const inZone = isAngleInArc(this.angle, this.targetStartAngle - angleTolerance, this.targetSize + 2 * angleTolerance);

        if (inZone) {
            playSuccess();
            this.score++;
            
            this.tapsThisLevel++;
            if (this.tapsThisLevel >= this.tapsForNextLevel) {
                this.levelUp();
            }

            this.direction *= -1;
            this.speed *= 1.04;

            const lastFrame = this.replayFrames[this.replayFrames.length - 1];
            if (lastFrame) {
                lastFrame.success = true;
                lastFrame.newTarget = {
                    start: this.targetStartAngle,
                    size: difficulties[this.currentDifficulty].size
                };
            }

            this.generateNewTarget();
            
            if (this.onScoreUpdate) this.onScoreUpdate(this.score);
        } else {
            this.failTap = {
                angle: this.angle,
                timestamp: performance.now()
            };

            if (this.mode === 'standard') {
                this.gameOver();
            } else if (this.mode === 'zen') {
                playFail();
                // Zen penalty: reduced score, drop level
                this.score = Math.max(0, this.score - 5);

                // Reduce speed to help recover (clamped to base speed)
                this.speed = Math.max(difficulties[this.currentDifficulty].speed, this.speed / 1.1);

                if (this.level > 1) {
                    this.level--;
                    this.tapsThisLevel = 0;
                    this.tapsForNextLevel = this.level;
                    this.targetColorHsl = hsl(getHslStringForLevel(this.level));
                    if (this.onLevelUp) this.onLevelUp(this.level);
                }
                this.generateNewTarget();
                if (this.onScoreUpdate) this.onScoreUpdate(this.score);
            } else if (this.mode === 'vs') {
                playFail();
                // Lose 1 full heart
                this.health = Math.max(0, this.health - 100);
                this.generateNewTarget();
                // Check death is handled in update loop via vsManagerUpdate hook usually
            }
        }
    }

    levelUp() {
        this.targetColorHsl = hsl(getHslStringForLevel(this.level + 1));
        
        this.level++;
        this.tapsThisLevel = 0;
        this.tapsForNextLevel = this.level;

        if (this.onLevelUp) this.onLevelUp(this.level);
    }

    reset() {
        this.gameState = 'start';
        this.score = 0;
        this.level = 1;
        this.tapsThisLevel = 0;
        this.tapsForNextLevel = 1;
        this.health = 300; // Reset health mostly for VS mode hygiene
        this.failTap = null;
        this.currentColorHsl = hsl(getHslStringForLevel(1));
        
        // Update visual state for idle mode
        this.setDifficulty(this.currentDifficulty);
        this.angle = -Math.PI / 2;
        
        // Ensure loop is running
        if (!this.animationFrameId) {
            this.lastFrameTime = performance.now();
            this.gameLoop(this.lastFrameTime);
        }
    }
}