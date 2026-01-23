export function renderDetailHeader(userProfile) {
    if (!userProfile) return '<div class="mini-profile-fallback">Details</div>';

    const { username } = userProfile;
    const avatarUrl = `https://images.websim.com/avatar/${username}`;
    
    // Calculate bests
    const difficulties = ['easy', 'medium', 'hard'];
    const bestScores = {};
    difficulties.forEach(diff => {
        const scores = userProfile[diff] || [];
        if (scores.length > 0) {
            bestScores[diff] = Math.max(...scores.map(s => s.score));
        } else {
            bestScores[diff] = '-';
        }
    });

    // VS Stats
    const vsScores = userProfile.vs || [];
    const vsWins = vsScores.filter(s => s.result === 'win').length;
    const vsTotal = vsScores.length;

    return `
        <div class="mini-profile-card">
            <div class="mini-profile-avatar-container">
                <img src="${avatarUrl}" class="mini-profile-avatar" alt="${username}">
            </div>
            <div class="mini-profile-info">
                <div class="mini-profile-username">${username}</div>
                <div class="mini-profile-stats">
                    <div class="stat-pill easy" title="Easy Best"><span class="l">E</span><span class="v">${bestScores.easy}</span></div>
                    <div class="stat-pill medium" title="Medium Best"><span class="l">M</span><span class="v">${bestScores.medium}</span></div>
                    <div class="stat-pill hard" title="Hard Best"><span class="l">H</span><span class="v">${bestScores.hard}</span></div>
                    <div class="stat-pill vs" title="VS Wins"><span class="l">VS</span><span class="v">${vsWins}</span></div>
                </div>
            </div>
        </div>
    `;
}

export function renderMyScores(userProfile) {
    if (!userProfile) return '<div style="text-align:center; padding: 20px; color: #888;">No profile found. Play a game to create one!</div>';

    const { username } = userProfile;
    const difficulties = ['easy', 'medium', 'hard'];
    
    // Calculate stats
    let totalGames = 0;
    const bestScores = { easy: '-', medium: '-', hard: '-' };

    difficulties.forEach(diff => {
        const scores = userProfile[diff] || [];
        totalGames += scores.length;
        if (scores.length > 0) {
            const sorted = [...scores].sort((a, b) => b.score - a.score);
            bestScores[diff] = sorted[0].score;
        }
    });

    const avatarUrl = `https://images.websim.com/avatar/${username}`;
    
    // Header HTML
    const headerHtml = `
        <div class="profile-header">
            <div class="profile-avatar-container">
                <img src="${avatarUrl}" alt="${username}" class="profile-avatar-large">
            </div>
            <div class="profile-stats-container">
                <div class="profile-username">${username}</div>
                <div class="profile-total-games">${totalGames} Games Played</div>
                <div class="profile-bests">
                    <div class="best-stat"><span class="label">Easy</span><span class="value">${bestScores.easy}</span></div>
                    <div class="best-stat"><span class="label">Med</span><span class="value">${bestScores.medium}</span></div>
                    <div class="best-stat"><span class="label">Hard</span><span class="value">${bestScores.hard}</span></div>
                </div>
            </div>
        </div>
    `;

    // Difficulty Cards
    const cardsHtml = difficulties.map(diff => {
        const scores = userProfile[diff] || [];
        const bestScore = scores.length > 0 ? Math.max(...scores.map(s => s.score)) : '-';
        
        return `
            <div class="leaderboard-entry-wrapper my-score-entry" data-difficulty="${diff}">
                <div class="my-score-card">
                    <div class="diff-title">${diff.charAt(0).toUpperCase() + diff.slice(1)}</div>
                    <div class="diff-stats">
                        <span class="best-score">Best: ${bestScore}</span>
                        <span class="games-count">${scores.length} Games</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // VS Card
    const vsScores = userProfile.vs || [];
    const vsWins = vsScores.filter(s => s.result === 'win').length;
    const vsCardHtml = `
        <div class="leaderboard-entry-wrapper my-score-entry" data-difficulty="vs">
            <div class="my-score-card" style="border-left: 4px solid #e94560;">
                <div class="diff-title">VS Mode</div>
                <div class="diff-stats">
                    <span class="best-score" style="color: #e94560;">Wins: ${vsWins}</span>
                    <span class="games-count">${vsScores.length} Games</span>
                </div>
            </div>
        </div>
    `;

    return headerHtml + cardsHtml + vsCardHtml;
}

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function renderLeaderboardList(rankedPlayers, currentPage = 1, itemsPerPage = 10) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const playersOnPage = rankedPlayers.slice(startIndex, endIndex);

    return playersOnPage.map((player, index) => {
        const overallIndex = startIndex + index;
        const rank = overallIndex + 1;
        const rankText = getOrdinal(rank);
        const watchIcon = `<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg>`;

        return `
            <div class="leaderboard-entry-wrapper">
                <div class="leaderboard-entry" data-index="${overallIndex}">
                    <div class="avatar-wrapper rank-${rank <= 3 ? rank : 'other'}">
                        <img class="avatar" src="https://images.websim.com/avatar/${player.username}" alt="${player.username}'s avatar">
                        <div class="rank-badge">${rankText}</div>
                    </div>
                    <div class="user-info">
                        <div class="username">${player.username}</div>
                        <div class="games-played">${player.gamesPlayed} ${player.gamesPlayed === 1 ? 'game' : 'games'}</div>
                    </div>
                    <div class="score">
                        <div class="score-value">Score: ${player.highestScore}</div>
                        <div class="level-value">Level: ${player.bestLevel}</div>
                    </div>
                    <button class="watch-replay-btn icon-only" data-index="${overallIndex}" title="Watch Best Replay">${watchIcon}</button>
                </div>
            </div>
        `
    }).join('');
}

export function renderDetailList(scores, currentPage = 1, itemsPerPage = 10, contextData = {}) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const scoresOnPage = scores.slice(startIndex, endIndex);
    const watchIcon = `<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg>`;

    if (scores.length === 0) {
        return '<div style="text-align: center; color: #888; padding: 20px;">No scores recorded yet.</div>';
    }

    return scoresOnPage.map((game, index) => {
        const actualIndex = startIndex + index;
        const isVs = game.opponent !== undefined;
        
        let detailsHtml;
        if (isVs) {
            const result = game.result || 'ended';
            const resultColor = result === 'win' ? 'var(--success-color)' : 'var(--fail-color)';
            detailsHtml = `
                <span class="score-entry-score" style="color: ${resultColor}">
                    ${result.toUpperCase()} vs ${game.opponent || 'Unknown'}
                </span>
                <span class="score-entry-level">Level: ${game.level || 1}</span>
            `;
        } else {
             detailsHtml = `
                <span class="score-entry-score">Score: ${game.score}</span>
                <span class="score-entry-level">Level: ${game.level || 1}</span>
            `;
        }

        return `
        <div class="score-entry">
            <div class="score-details">
                ${detailsHtml}
                <small class="score-entry-date">${new Date(game.timestamp).toLocaleDateString()}</small>
            </div>
            ${game.replayDataUrl ? `
                <button class="watch-replay-btn icon-only" 
                    data-context="detail-view" 
                    data-score-index="${actualIndex}" 
                    title="Watch Replay">
                    ${watchIcon}
                </button>` : ''
            }
        </div>
    `}).join('');
}

export function renderLeaderboardPagination(totalPages, currentPage, type = 'main') {
    if (totalPages <= 1) return '';
    const prefix = type === 'detail' ? 'detail-' : '';

    return `
        <button class="${prefix}page-btn" data-action="first" ${currentPage === 1 ? 'disabled' : ''} aria-label="First page">&lt;&lt;</button>
        <button class="${prefix}page-btn" data-action="prev" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous page">&lt;</button>
        <div class="page-info">
            Page 
            <input type="number" class="${prefix}page-input" value="${currentPage}" min="1" max="${totalPages}"> 
            of ${totalPages}
        </div>
        <button class="${prefix}page-btn" data-action="next" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next page">&gt;</button>
        <button class="${prefix}page-btn" data-action="last" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Last page">&gt;&gt;</button>
    `;
}