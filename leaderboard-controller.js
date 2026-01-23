import { fetchLeaderboard, syncScores, fetchUserProfile } from './leaderboard-api.js';
import { renderLeaderboardList, renderLeaderboardPagination, renderMyScores, renderDetailList, renderDetailHeader } from './leaderboard-render.js';

export class LeaderboardController {
    constructor(elements, ui, callbacks) {
        this.elements = elements;
        this.ui = ui;
        this.callbacks = callbacks || {}; // { onReplay: (data) => {}, onInteraction: () => {} }
        
        this.state = {
            currentPage: 1,
            totalPages: 1,
            itemsPerPage: 10,
            currentDifficulty: 'easy'
        };

        this.detailState = {
            active: false,
            data: [], // array of score objects
            currentPage: 1,
            itemsPerPage: 8, // slightly fewer for detail view
            userProfile: null,
            currentUser: null 
        };
        
        this.data = {
            rankedPlayers: [],
            cache: { easy: null, medium: null, hard: null }
        };
        
        this.isMyScoresActive = false;
        this.currentUser = null;
        this.userProfile = null;
        
        this._bindMethods();
        this._addEventListeners();
    }

    _bindMethods() {
        this.handleFilterClick = this.handleFilterClick.bind(this);
        this.handlePaginationClick = this.handlePaginationClick.bind(this);
        this.handleDetailPaginationClick = this.handleDetailPaginationClick.bind(this);
        this.handleListClick = this.handleListClick.bind(this);
        this.handleBackClick = this.handleBackClick.bind(this);
        this.handleDetailListClick = this.handleDetailListClick.bind(this);
    }

    _addEventListeners() {
        this.elements.leaderboardDifficultyFilters.addEventListener('click', this.handleFilterClick);
        this.elements.leaderboardPagination.addEventListener('click', this.handlePaginationClick);
        this.elements.leaderboardList.addEventListener('click', this.handleListClick);
        
        // Detail view listeners
        this.elements.detailBackBtn.addEventListener('click', this.handleBackClick);
        this.elements.detailPagination.addEventListener('click', this.handleDetailPaginationClick);
        this.elements.detailList.addEventListener('click', this.handleDetailListClick);
    }

    async show(difficulty = 'easy') {
        if (this.callbacks.onInteraction) this.callbacks.onInteraction();

        // Adjust items per page for mobile/small screens
        const isSmallScreen = window.innerHeight < 750 || window.innerWidth < 480;
        this.state.itemsPerPage = isSmallScreen ? 5 : 8;
        this.detailState.itemsPerPage = isSmallScreen ? 5 : 8;
        
        syncScores();
        this.hideDetailView(); // Ensure we start on main list
        this.loadLeaderboard(difficulty);
    }

    async loadLeaderboard(difficulty) {
        this.state.currentDifficulty = difficulty;
        this.isMyScoresActive = false;
        this.state.currentPage = 1;
        
        this.ui.showLeaderboardView();
        this.elements.leaderboardList.innerHTML = '<p>Loading scores...</p>';
        this.ui.hidePagination();
        this.data.rankedPlayers = [];

        this._updateFilterButtons(difficulty);

        try {
            if (this.data.cache[difficulty]) {
                this.data.rankedPlayers = this.data.cache[difficulty];
            } else {
                this.data.rankedPlayers = await fetchLeaderboard(difficulty);
                this.data.cache[difficulty] = this.data.rankedPlayers;
            }
            
            this.state.totalPages = Math.ceil(this.data.rankedPlayers.length / this.state.itemsPerPage);

            if (this.data.rankedPlayers.length === 0) {
                this.elements.leaderboardList.innerHTML = `<p>No scores for ${difficulty} difficulty yet. Be the first!</p>`;
                this.ui.hidePagination();
            } else {
                this._render();
                this.ui.showPagination();
            }
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            this.elements.leaderboardList.innerHTML = '<p>Could not load leaderboard. Please try again later.</p>';
            this.ui.hidePagination();
        }
    }

    _updateFilterButtons(activeDifficulty) {
        this.elements.leaderboardFilterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === activeDifficulty);
        });
        const myScoresBtn = document.getElementById('my-scores-btn');
        if (myScoresBtn) myScoresBtn.classList.remove('active');
    }

    async handleFilterClick(e) {
        const targetBtn = e.target.closest('.leaderboard-filter-btn');
        if (!targetBtn || targetBtn.classList.contains('active')) return;
        
        const difficulty = targetBtn.dataset.difficulty;

        if (difficulty === 'mine') {
            await this._switchToMyScores(targetBtn);
        } else {
            this.loadLeaderboard(difficulty);
        }
    }

    async _switchToMyScores(targetBtn) {
        this.isMyScoresActive = true;
        this.state.currentPage = 1;
        
        this.elements.leaderboardFilterBtns.forEach(btn => btn.classList.remove('active'));
        targetBtn.classList.add('active');
        
        this.elements.leaderboardList.innerHTML = '<p>Loading your profile...</p>';
        this.ui.hidePagination();

        if (!this.currentUser) {
            try {
                this.currentUser = await window.websim.getCurrentUser();
            } catch {
                 this.elements.leaderboardList.innerHTML = `<p>Could not verify user. Please try again.</p>`;
                 return;
            }
        }

        try {
            this.userProfile = await fetchUserProfile(this.currentUser.username);
            this._render();
        } catch (e) {
            console.error("Error fetching user profile", e);
            this.elements.leaderboardList.innerHTML = `<p>Error loading profile.</p>`;
        }
    }

    _render() {
        if (this.isMyScoresActive) {
            this.elements.leaderboardList.innerHTML = renderMyScores(this.userProfile);
            this.ui.hidePagination();
            return;
        }

        const { currentPage, itemsPerPage } = this.state;
        let dataToRender = this.data.rankedPlayers;
        
        this.elements.leaderboardList.innerHTML = renderLeaderboardList(dataToRender, currentPage, itemsPerPage);
        
        const totalPages = Math.ceil(dataToRender.length / itemsPerPage);
        this.state.totalPages = totalPages;

        if (totalPages > 1) {
            this.elements.leaderboardPagination.innerHTML = renderLeaderboardPagination(totalPages, currentPage, 'main');
            this.ui.showPagination();
        } else {
            this.ui.hidePagination();
        }
    }

    handlePaginationClick(e) {
        if (!e.target.dataset.action) return;
        
        const action = e.target.dataset.action;
        const { currentPage, totalPages } = this.state;
        let newPage = currentPage;
        
        if (action === 'first') newPage = 1;
        else if (action === 'prev') newPage = Math.max(1, currentPage - 1);
        else if (action === 'next') newPage = Math.min(totalPages, currentPage + 1);
        else if (action === 'last') newPage = totalPages;

        if (newPage !== currentPage) {
            this.state.currentPage = newPage;
            this._render();
        }
    }

    // --- Detail View Logic ---

    showDetailView(scores, userProfile) {
        this.detailState.active = true;
        this.detailState.data = scores;
        this.detailState.currentPage = 1;
        this.detailState.userProfile = userProfile;
        this.detailState.currentUser = userProfile ? { username: userProfile.username } : null;

        this.elements.leaderboardMainView.classList.add('hidden');
        this.elements.leaderboardDetailView.classList.remove('hidden');
        
        this.elements.detailHeaderContent.innerHTML = renderDetailHeader(userProfile);
        
        this._renderDetail();
    }

    hideDetailView() {
        this.detailState.active = false;
        this.detailState.data = [];
        this.elements.leaderboardDetailView.classList.add('hidden');
        this.elements.leaderboardMainView.classList.remove('hidden');
    }

    _renderDetail() {
        const { data, currentPage, itemsPerPage } = this.detailState;
        
        this.elements.detailList.innerHTML = renderDetailList(data, currentPage, itemsPerPage);
        
        const totalPages = Math.ceil(data.length / itemsPerPage);
        if (totalPages > 1) {
            this.elements.detailPagination.innerHTML = renderLeaderboardPagination(totalPages, currentPage, 'detail');
            this.elements.detailPagination.classList.remove('hidden');
        } else {
            this.elements.detailPagination.classList.add('hidden');
        }
    }

    handleDetailPaginationClick(e) {
        if (!e.target.dataset.action) return;
        
        const action = e.target.dataset.action;
        const totalPages = Math.ceil(this.detailState.data.length / this.detailState.itemsPerPage);
        let newPage = this.detailState.currentPage;

        if (action === 'first') newPage = 1;
        else if (action === 'prev') newPage = Math.max(1, newPage - 1);
        else if (action === 'next') newPage = Math.min(totalPages, newPage + 1);
        else if (action === 'last') newPage = totalPages;

        if (newPage !== this.detailState.currentPage) {
            this.detailState.currentPage = newPage;
            this._renderDetail();
        }
    }

    async handleListClick(e) {
        const watchBtn = e.target.closest('.watch-replay-btn');
        const entry = e.target.closest('.leaderboard-entry');
        const myScoreCard = e.target.closest('.my-score-entry');

        if (watchBtn) {
            e.stopPropagation();
            await this._handleReplayClick(watchBtn);
            return;
        } 

        // Handle Main Leaderboard Entry Click
        if (entry) {
            const index = entry.dataset.index;
            const player = this.data.rankedPlayers[index];
            if (player) {
                // Fetch full profile to get cross-difficulty stats
                try {
                    // Show a quick loading state if needed, or just wait
                    this.elements.detailHeaderContent.innerHTML = '<div style="font-size:0.8rem;">Loading profile...</div>';
                    
                    const profile = await fetchUserProfile(player.username);
                    const userProfile = profile || { username: player.username };
                    this.showDetailView(player.allScores, userProfile);
                } catch (e) {
                    console.error("Error fetching detail profile", e);
                    this.showDetailView(player.allScores, { username: player.username });
                }
            }
        }
        
        // Handle My Scores Card Click
        if (myScoreCard) {
            const diff = myScoreCard.dataset.difficulty;
            const scores = (this.userProfile && this.userProfile[diff]) ? this.userProfile[diff] : [];
            // Sort by score
            scores.sort((a,b) => b.score - a.score);
            this.showDetailView(scores, this.userProfile);
        }
    }

    async handleDetailListClick(e) {
        const watchBtn = e.target.closest('.watch-replay-btn');
        if (watchBtn) {
            e.stopPropagation();
            await this._handleDetailReplayClick(watchBtn);
        }
    }

    handleBackClick() {
        this.hideDetailView();
    }

    async _handleReplayClick(watchBtn) {
        // Only handles Best Replay from main list now
        const index = watchBtn.dataset.index;
        const playerData = this.data.rankedPlayers[index];
        const user = { username: playerData.username };
        const gameData = playerData.bestGameData;

        await this._loadReplay(gameData, user, watchBtn);
    }

    async _handleDetailReplayClick(watchBtn) {
        const scoreIndex = parseInt(watchBtn.dataset.scoreIndex); // Absolute index in the data array
        const gameData = this.detailState.data[scoreIndex];
        const user = this.detailState.currentUser;
        
        await this._loadReplay(gameData, user, watchBtn);
    }

    async _loadReplay(gameData, user, btn) {
        if (!gameData || !gameData.replayDataUrl) return;

        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<span style="font-size: 0.6rem;">...</span>'; 
        btn.disabled = true;

        try {
            const response = await fetch(gameData.replayDataUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const replayData = await response.json();

            if (!replayData.config.currentUser) {
                replayData.config.currentUser = {
                    username: user.username,
                    avatar_url: `https://images.websim.com/avatar/${user.username}`
                };
            }

            if (this.callbacks.onReplay) {
                this.callbacks.onReplay(replayData);
            }
        } catch (fetchError) {
            console.error("Error fetching replay data:", fetchError);
            alert("Could not load replay.");
        } finally {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }
}