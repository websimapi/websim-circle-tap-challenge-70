export const room = new WebsimSocket();
const OLD_COLLECTION_NAME = 'leaderboard_scores_v3';
const NEW_COLLECTION_NAME = 'leaderboard_profiles_v2';
const LOCAL_STORAGE_KEY = 'circleTapPendingScores';

class LocalStorageSync {
    constructor() {
        this.pendingScores = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
    }

    _save() {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.pendingScores));
    }

    addScore(gameData) {
        // Avoid duplicates
        if (!this.pendingScores.some(s => s.timestamp === gameData.timestamp)) {
            this.pendingScores.push(gameData);
            this._save();
        }
    }

    removeScore(timestamp) {
        this.pendingScores = this.pendingScores.filter(s => s.timestamp !== timestamp);
        this._save();
    }

    getScores() {
        return this.pendingScores;
    }
}

const scoreSync = new LocalStorageSync();

// Migration function to be run on page load
export async function migrateUserScores() {
    console.log("Checking for user score migration...");
    try {
        const currentUser = await window.websim.getCurrentUser();
        if (!currentUser || !currentUser.username) {
            console.warn("Cannot migrate scores, no current user found.");
            return;
        }

        // 1. Fetch old scores for the current user
        const oldScores = await new Promise(resolve => {
            let unsub;
            unsub = room.collection(OLD_COLLECTION_NAME).filter({ username: currentUser.username }).subscribe(records => {
                if (unsub) unsub();
                resolve(records);
            });
        });

        if (oldScores.length === 0) {
            console.log("No old scores to migrate.");
            return;
        }

        console.log(`Found ${oldScores.length} old scores to migrate for ${currentUser.username}.`);

        // 2. Fetch or create new profile
        const profileCollection = room.collection(NEW_COLLECTION_NAME);
        const existingProfiles = await new Promise(resolve => {
            let unsub;
            unsub = profileCollection.filter({ username: currentUser.username }).subscribe(records => {
                if (unsub) unsub();
                resolve(records);
            });
        });

        // If multiple profiles exist, merge into the newest one.
        let userProfile = existingProfiles.length > 0 
            ? existingProfiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] 
            : null;

        const newProfileData = {
            easy: userProfile?.easy || [],
            medium: userProfile?.medium || [],
            hard: userProfile?.hard || [],
        };
        
        let hasNewScoresToMerge = false;
        
        // 3. Aggregate old scores into the new format
        oldScores.forEach(score => {
            const difficulty = score.difficulty || 'easy';
            const scoreData = {
                score: score.score,
                level: score.level,
                replayDataUrl: score.replayDataUrl,
                timestamp: score.timestamp
            };
            // Avoid duplicates
            if (!newProfileData[difficulty].some(s => s.timestamp === score.timestamp)) {
                 newProfileData[difficulty].push(scoreData);
                 hasNewScoresToMerge = true;
            }
        });

        if (!hasNewScoresToMerge) {
            console.log("All old scores already present in new profile. Deleting redundant old entries.");
        } else {
             // 4. Create or Update the new profile document
            if (userProfile) {
                console.log("Updating existing profile.");
                await profileCollection.update(userProfile.id, newProfileData);
            } else {
                console.log("Creating new profile.");
                await profileCollection.create(newProfileData);
            }
        }

        // 5. Delete the old scores after successful migration
        console.log("Deleting old score entries...");
        for (const score of oldScores) {
            try {
                await room.collection(OLD_COLLECTION_NAME).delete(score.id);
            } catch (deleteError) {
                // This might fail if another client deletes it first, which is okay.
                // console.warn(`Could not delete old score ${score.id}:`, deleteError.message);
            }
        }
        
        console.log("Migration complete.");

    } catch (error) {
        console.error("Error during user score migration:", error);
    }
}

export async function submitScore(lastGameData, onSuccess, onError) {
    try {
        let gameDataForDb = { ...lastGameData };
        // Step 1: Upload replay data
        if (gameDataForDb.replayData) {
            try {
                const replayJson = JSON.stringify(gameDataForDb.replayData);
                const replayBlob = new Blob([replayJson], { type: 'application/json' });
                const replayFile = new File([replayBlob], 'replay.json');
                gameDataForDb.replayDataUrl = await window.websim.upload(replayFile);
                delete gameDataForDb.replayData;
            } catch (uploadError) {
                console.error("Error uploading replay data:", uploadError);
                // Don't save locally if upload fails, as the replay is a core part
                if (onError) onError(uploadError);
                return;
            }
        }

        // Step 2: Prepare the score object
        const newScore = {
            score: gameDataForDb.score,
            level: gameDataForDb.level,
            replayDataUrl: gameDataForDb.replayDataUrl,
            timestamp: gameDataForDb.timestamp,
        };

        if (gameDataForDb.mode === 'vs') {
            newScore.result = gameDataForDb.result; // 'win' or 'loss'
            newScore.opponent = gameDataForDb.opponent;
        }

        let difficulty = gameDataForDb.difficulty; // 'easy', 'medium', 'hard', 'vs'
        if (gameDataForDb.mode === 'vs') {
            difficulty = 'vs';
        }

        const profileCollection = room.collection(NEW_COLLECTION_NAME);

        // Step 3: Find user's existing profile right before submission
        const currentUser = await window.websim.getCurrentUser();
        const profiles = await new Promise(resolve => {
            let unsub;
            unsub = profileCollection.filter({ username: currentUser.username }).subscribe(records => {
                if (unsub) unsub();
                resolve(records);
            });
        });
        
        // If multiple profiles exist, update the newest one.
        const userProfile = profiles.length > 0
            ? profiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
            : null;

        // Step 4: Update or create profile
        if (userProfile) {
            // Check if 'vs' array exists in profile, if not handled gracefully
            const currentScores = userProfile[difficulty] || [];
            const updatedScores = [...currentScores, newScore];
            
            // Limit history length to prevent document getting too large (e.g., 50)
            if (updatedScores.length > 50) {
                 updatedScores.sort((a,b) => b.score - a.score); // Keep best
                 updatedScores.length = 50;
            }

            await profileCollection.update(userProfile.id, { [difficulty]: updatedScores });
        } else {
            const newProfile = {
                easy: [],
                medium: [],
                hard: [],
                vs: [], // Ensure structure exists
                [difficulty]: [newScore],
            };
            await profileCollection.create(newProfile);
        }

        scoreSync.removeScore(gameDataForDb.timestamp);
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error submitting score:", error);
        // Fallback for offline/errors: add to local storage for sync/migration later
        scoreSync.addScore(lastGameData);
        if (onError) onError(error);
    }
}

export async function syncScores() {
    console.log("Starting score sync...");
    const pending = scoreSync.getScores();
    if (pending.length === 0) {
        console.log("No pending scores to sync.");
        return;
    }

    // Run migration first to ensure new profile exists if possible
    await migrateUserScores();

    try {
        const currentUser = await window.websim.getCurrentUser();
        if (!currentUser || !currentUser.username) {
            console.warn("Cannot sync scores, no current user found.");
            return;
        }

        // In the new model, we don't need to check against old scores.
        // We just need to add pending local scores to the user's profile.
        if (pending.length > 0) {
            console.log(`Syncing ${pending.length} scores...`);
            for (const gameData of pending) {
                console.log(`Uploading score from ${gameData.timestamp}`);
                await submitScore(gameData, null, (err) => {
                    console.error(`Sync failed for score ${gameData.timestamp}:`, err);
                });
            }
            console.log("Sync process completed.");
        } else {
            console.log("All local scores are already on the server.");
        }

    } catch (error) {
        console.error("Error during score sync process:", error);
    }
}

export async function fetchLeaderboard(difficulty) {
    const fetchOldScores = new Promise(resolve => {
        let unsub;
        unsub = room.collection(OLD_COLLECTION_NAME).filter({ difficulty }).subscribe(records => {
            if (unsub) unsub();
            resolve(records);
        });
    });

    const fetchNewProfiles = new Promise(resolve => {
        let unsub;
        unsub = room.collection(NEW_COLLECTION_NAME).subscribe(records => {
            if (unsub) unsub();
            resolve(records);
        });
    });

    const [oldScores, newProfiles] = await Promise.all([fetchOldScores, fetchNewProfiles]);

    const players = {}; // Group scores by username

    // Process new profiles first
    newProfiles.forEach(profile => {
        const username = profile.username;
        const scoresForDifficulty = profile[difficulty] || [];

        if (scoresForDifficulty.length > 0) {
            if (!players[username]) {
                players[username] = { username: username, allScores: [] };
            }
            players[username].allScores.push(...scoresForDifficulty);
        }
    });

    // Process old scores, only for users not already in the new format
    oldScores.forEach(scoreRecord => {
        const username = scoreRecord.username;
        if (!players[username]) {
            players[username] = { username: username, allScores: [] };
        }
        // Add if not already processed from a new profile (avoids race conditions during migration)
        if (!players[username].allScores.some(s => s.timestamp === scoreRecord.timestamp)) {
             players[username].allScores.push(scoreRecord);
        }
    });
    
    const rankedPlayers = Object.values(players).map(playerData => {
        const bestGame = playerData.allScores.reduce((best, current) => {
            if (!best) return current;
            if (current.score > best.score) return current;
            if (current.score === best.score && current.level > best.level) return current;
            return best;
        }, null);
        
        return {
            username: playerData.username,
            highestScore: bestGame ? bestGame.score : 0,
            bestLevel: bestGame ? bestGame.level : 0,
            gamesPlayed: playerData.allScores.length,
            bestGameData: bestGame,
            allScores: playerData.allScores.sort((a,b) => {
                if (b.score !== a.score) return b.score - a.score;
                return b.level - a.level;
            }),
        };
    }).filter(p => p && p.bestGameData)
      .sort((a, b) => {
          if (b.highestScore !== a.highestScore) return b.highestScore - a.highestScore;
          return b.bestLevel - a.bestLevel;
      });
    
    return rankedPlayers;
}

export async function fetchUserProfile(username) {
    const profileCollection = room.collection(NEW_COLLECTION_NAME);
    const profiles = await new Promise(resolve => {
        let unsub;
        unsub = profileCollection.filter({ username }).subscribe(records => {
            if (unsub) unsub();
            resolve(records);
        });
    });
    
    // Sort by created_at desc to get latest
    return profiles.length > 0 
        ? profiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] 
        : null;
}