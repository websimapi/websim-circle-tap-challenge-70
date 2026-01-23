import { room } from './leaderboard-api.js';

export class VSManager {
    constructor(game, ui) {
        this.game = game;
        this.ui = ui;
        this.state = 'idle'; // idle, seeking, connecting, counting_down, playing, ended
        this.opponent = null;
        this.matchId = null;
        this.opponentCanvas = document.getElementById('opponent-canvas');
        this.ctx = this.opponentCanvas.getContext('2d');
        this.currentUser = null;
        
        // Game sync data
        this.lastPresenceUpdate = 0;
        
        // Initialization
        this.init();
    }

    async init() {
        this.currentUser = await window.websim.getCurrentUser();
        
        // Subscribe to presence for matchmaking and game state
        room.subscribePresence((presence) => {
            this.handlePresenceUpdate(presence);
        });

        room.subscribePresenceUpdateRequests((req, fromId) => {
            this.handlePresenceRequest(req, fromId);
        });

        // Start render loop for opponent view
        this.renderLoop();
    }

    resetState() {
        this.opponent = null;
        this.opponentId = null;
        this.matchId = null;
        this.currentOpponentState = null;
        this.targetOpponentState = null;
        this.ui.resetVSUI();
    }

    startSeeking() {
        this.resetState();
        this.state = 'seeking';
        this.game.setMode('zen'); // Start Zen mode while waiting
        this.ui.updateVSStatus('Searching for opponent...', true);
        
        room.updatePresence({
            status: 'seeking',
            vs_level: this.game.level,
            vs_mode_active: true,
            vs_health: 300,
            vs_score: 0
        });
    }

    cancelSeeking() {
        this.state = 'idle';
        this.game.setMode('standard');
        this.ui.updateVSStatus('', false);
        this.resetState();
        
        room.updatePresence({
            status: 'idle',
            vs_mode_active: false
        });
    }

    handlePresenceUpdate(presence) {
        // Update Lobby UI (Title Screen)
        this.updateLobbyPreview(presence);

        if (this.state === 'seeking') {
            this.attemptMatchmaking(presence);
        } else if (this.state === 'playing' || this.state === 'counting_down') {
            this.syncGameState(presence);
        }
    }

    updateLobbyPreview(presence) {
        const lobbyUsers = [];
        const myId = room.clientId;

        Object.entries(presence).forEach(([clientId, data]) => {
            // Include everyone in VS mode, except potentially myself if I want to see "others"
            // But usually seeing myself confirms I am in the pool. 
            // However, the prompt implies "people waiting", so let's show all active VS users.
            if (data.vs_mode_active && clientId !== myId) {
                const peer = room.peers[clientId];
                if (peer) {
                    lobbyUsers.push({
                        username: peer.username,
                        avatarUrl: peer.avatarUrl,
                        status: data.status, // 'seeking' or 'playing'
                        clientId: clientId
                    });
                }
            }
        });

        this.ui.updateVSLobbyPreview(lobbyUsers);
    }

    attemptMatchmaking(presence) {
        const myId = room.clientId;
        const potentialOpponents = Object.entries(presence)
            .filter(([id, data]) => {
                return id !== myId && 
                       data.status === 'seeking' && 
                       data.vs_mode_active;
            });

        if (potentialOpponents.length > 0) {
            // Sort by ID to ensure deterministic pairing
            potentialOpponents.sort((a, b) => a[0].localeCompare(b[0]));
            const opponentId = potentialOpponents[0][0];
            const opponentData = potentialOpponents[0][1];

            // Lower ID initiates the invite
            if (myId < opponentId) {
                this.state = 'connecting';
                room.requestPresenceUpdate(opponentId, { type: 'vs_invite', matchId: `${myId}-${opponentId}` });
            }
        }
    }

    handlePresenceRequest(req, fromId) {
        if (req.type === 'vs_invite' && this.state === 'seeking') {
            this.acceptMatch(fromId, req.matchId);
        } else if (req.type === 'vs_accept' && (this.state === 'connecting' || this.state === 'seeking')) {
            this.startMatch(fromId, req.matchId);
        } else if (req.type === 'vs_damage') {
             // Handled locally usually, but can enforce here
        } else if (req.type === 'vs_end') {
            if (this.state === 'playing') {
                this.endMatch('win'); // Opponent died/quit
            }
        }
    }

    acceptMatch(opponentId, matchId) {
        this.state = 'connecting';
        this.matchId = matchId;
        room.requestPresenceUpdate(opponentId, { type: 'vs_accept', matchId: matchId });
        this.startMatch(opponentId, matchId);
    }

    startMatch(opponentId, matchId) {
        this.opponent = room.peers[opponentId]; // { username, avatarUrl, ... }
        this.opponentId = opponentId;
        this.matchId = matchId;
        this.state = 'counting_down';
        
        // Clear any previous interpolation state
        this.currentOpponentState = null;
        this.targetOpponentState = null;

        this.ui.setupVSMatch(this.opponent);
        
        // Reset game for match
        this.game.setMode('vs');
        this.game.setDifficulty('easy'); // Ensure visuals are easy during countdown
        this.game.reset(); // Resets local state
        
        // Initial VS State
        room.updatePresence({
            status: 'playing',
            matchId: matchId,
            vs_health: 300,
            vs_level: 1,
            vs_score: 0,
            vs_angle: 0,
            vs_targetStart: 0,
            vs_targetSize: 0.4
        });

        // Countdown
        let count = 3;
        this.ui.updateVSStatus(`Starting in ${count}...`, true);
        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                this.ui.updateVSStatus(`Starting in ${count}...`, true);
            } else {
                clearInterval(interval);
                this.state = 'playing';
                this.ui.updateVSStatus('FIGHT!', true);
                setTimeout(() => this.ui.updateVSStatus('', false), 1000);
                this.game.start('easy', { 
                username: this.opponent.username, 
                avatarUrl: this.opponent.avatarUrl 
            }); 
            }
        }, 1000);
    }

    syncGameState(presence) {
        if (!this.opponentId || !presence[this.opponentId]) {
            // Opponent disconnected
            if (this.state === 'playing') {
                this.endMatch('win');
            }
            return;
        }

        const oppData = presence[this.opponentId];
        // Handle undefined health (initial state) by defaulting to 300, but allow 0 (death)
        // If we are counting down, force 300 to avoid reading stale end-game state from previous match
        let oppHealth = oppData.vs_health !== undefined ? oppData.vs_health : 300;
        if (this.state === 'counting_down') {
            oppHealth = 300;
        }
        
        // Update opponent UI
        this.ui.updateOpponentHearts(oppHealth);
        this.ui.updateOpponentScore(oppData.vs_score || 0);
        this.ui.updateOpponentLevel(oppData.vs_level || 1);
        
        // Logic for drain
        if (this.state === 'playing') {
            const myLevel = this.game.level;
            const oppLevel = oppData.vs_level || 1;
            
            // This is calculated in game loop locally, but we can verify here
            this.game.setOpponentLevel(oppLevel);

            // Check if opponent died
            if (oppHealth <= 0) {
                this.endMatch('win');
            }
        }

        // Store target render data for interpolation
        this.targetOpponentState = {
            angle: oppData.vs_angle || 0,
            targetStart: oppData.vs_targetStart || 0,
            targetSize: oppData.vs_targetSize || 0,
            level: oppData.vs_level || 1,
            score: oppData.vs_score || 0,
            health: oppHealth
        };

        // Initialize current state if not set
        if (!this.currentOpponentState) {
            this.currentOpponentState = { ...this.targetOpponentState };
        }
    }

    updateGameLoop(deltaTime) {
        if (this.state !== 'playing') return;

        // Interpolate Opponent State
        if (this.targetOpponentState && this.currentOpponentState) {
            // Lerp angle correctly handling wrap-around
            const currentAngle = this.currentOpponentState.angle;
            const targetAngle = this.targetOpponentState.angle;
            
            let diff = targetAngle - currentAngle;
            // Normalize diff to -PI to PI
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            const lerpFactor = Math.min(deltaTime * 10, 1); // Approx 10Hz sync
            
            this.currentOpponentState.angle += diff * lerpFactor;
            
            // Snap other values (targets usually jump)
            this.currentOpponentState.targetStart = this.targetOpponentState.targetStart;
            this.currentOpponentState.targetSize = this.targetOpponentState.targetSize;
            this.currentOpponentState.level = this.targetOpponentState.level;
            this.currentOpponentState.score = this.targetOpponentState.score;
            this.currentOpponentState.health = this.targetOpponentState.health;

            // Update Game's view of opponent for Replay recording
            this.game.opponentState = { ...this.currentOpponentState };
        }

        // Broadcast my state occasionally (e.g. 10Hz) or on critical change
        const now = performance.now();
        if (now - this.lastPresenceUpdate > 100) {
            room.updatePresence({
                vs_health: this.game.health,
                vs_level: this.game.level,
                vs_score: this.game.score,
                vs_angle: this.game.angle,
                vs_targetStart: this.game.targetStartAngle,
                vs_targetSize: this.game.targetSize
            });
            this.lastPresenceUpdate = now;
        }

        // Check loss condition
        if (this.game.health <= 0) {
            this.endMatch('loss');
        }
    }

    endMatch(result) { // 'win' or 'loss'
        if (this.state === 'ended') return;
        this.state = 'ended';
        const opponentName = this.opponent ? this.opponent.username : 'Unknown';

        this.game.gameOver(
            result === 'win' ? 'You Win!' : 'You Died', 
            result,
            opponentName
        );
        
        room.updatePresence({
            status: 'idle',
            vs_mode_active: false
        });
        
        if (this.opponentId) {
            room.requestPresenceUpdate(this.opponentId, { type: 'vs_end' });
        }
    }

    renderLoop() {
        requestAnimationFrame(() => this.renderLoop());
        
        const d = this.currentOpponentState || this.opponentRenderData;
        if (!d) return;

        const ctx = this.ctx;
        const w = this.opponentCanvas.width;
        const h = this.opponentCanvas.height;
        const cx = w/2;
        const cy = h/2;
        const r = w * 0.4;
        const lw = 6;

        ctx.clearRect(0, 0, w, h);

        // Track
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI*2);
        ctx.strokeStyle = '#0f3460';
        ctx.lineWidth = lw;
        ctx.stroke();

        // Target
        if (d.targetSize > 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, d.targetStart, d.targetStart + d.targetSize);
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = lw;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // Cursor
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(d.angle);
        ctx.beginPath();
        ctx.moveTo(0, -r + lw/2);
        ctx.lineTo(0, -r - lw/2);
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }
}