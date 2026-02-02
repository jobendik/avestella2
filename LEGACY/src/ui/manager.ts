// UI management for AURA
import type { Player, OtherPlayer } from '../types';
import { CONFIG } from '../core/config';
import { GameLogic } from '../game/logic';

export class UIManager {
    // Show a toast notification
    static toast(msg: string, type: string = 'default'): void {
        const container = document.getElementById('toasts');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast${type === 'achievement' ? ' achievement' : type === 'quest' ? ' quest' : ''}`;

        const icons: Record<string, string> = {
            level: '⭐',
            conn: '💫',
            achievement: '🏆',
            quest: '✅',
            default: '✨'
        };

        toast.innerHTML = `<span>${icons[type] || icons.default}</span><span>${msg}</span>`;
        container.appendChild(toast);

        setTimeout(() => toast.remove(), 4300);
    }

    // Update HUD stats display
    static updateHUD(player: Player): void {
        const level = GameLogic.getLevel(player.xp);
        const nextLevelXP = CONFIG.LEVEL_XP[level] || CONFIG.LEVEL_XP[CONFIG.LEVEL_XP.length - 1];
        const prevLevelXP = level > 1 ? CONFIG.LEVEL_XP[level - 2] : 0;
        const progress = ((player.xp - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100;

        const xpVal = document.getElementById('xp-val');
        const xpFill = document.getElementById('xp-fill');
        const connVal = document.getElementById('conn-val');
        const starVal = document.getElementById('star-val');
        const myName = document.getElementById('my-name');
        const myTitle = document.getElementById('my-title');

        if (xpVal) xpVal.textContent = `${player.xp} / ${nextLevelXP}`;
        if (xpFill) xpFill.style.width = `${Math.min(progress, 100)}%`;
        if (connVal) connVal.textContent = (player.linkedCount || 0).toString();
        if (starVal) starVal.textContent = player.stars.toString();
        if (myName) myName.textContent = player.name;
        if (myTitle) myTitle.textContent = `${GameLogic.getForm(level)} • Lv ${level}`;
    }

    // Show player profile card (overload removed - using position-based version below)
    static showProfileById(
        id: string,
        others: Map<string, OtherPlayer>,
        player: Player,
        lastMouseX: number,
        lastMouseY: number,
        width: number,
        height: number
    ): void {
        const other = others.get(id);
        if (!other) return;

        const card = document.getElementById('profile');
        if (!card) return;

        const bond = player.bonds.get(id) || 0;
        const level = Math.floor((other.xp || 0) / 100) + 1;
        const form = GameLogic.getForm(level);
        const age = Math.floor((Date.now() - (other.born || Date.now())) / 3600000);

        // Update card content
        const banner = document.getElementById('prof-banner');
        const avatar = document.getElementById('prof-avatar');
        const name = document.getElementById('prof-name');
        const title = document.getElementById('prof-title');
        const stars = document.getElementById('prof-stars');
        const echoes = document.getElementById('prof-echoes');
        const ageElem = document.getElementById('prof-age');
        const bondVal = document.getElementById('prof-bond-val');
        const bondFill = document.getElementById('prof-bond-fill');
        const voice = document.getElementById('prof-voice');

        if (banner) {
            banner.style.background = `linear-gradient(135deg,hsla(${other.hue},60%,40%,0.5),hsla(${other.hue + 40},50%,30%,0.3))`;
        }
        if (avatar) {
            avatar.style.background = `linear-gradient(135deg,hsl(${other.hue},68%,55%),hsl(${other.hue + 30},58%,45%))`;
            avatar.style.boxShadow = `0 0 24px hsla(${other.hue},68%,50%,0.55)`;
        }
        if (name) name.textContent = other.name;
        if (title) title.textContent = `${form} • Lv ${level}`;
        if (stars) stars.textContent = (other.stars || 0).toString();
        if (echoes) echoes.textContent = (other.echoes || 0).toString();
        if (ageElem) ageElem.textContent = age < 1 ? '<1h' : `${age}h`;
        if (bondVal) bondVal.textContent = `${Math.round(bond)}%`;
        if (bondFill) bondFill.style.width = `${bond}%`;

        if (voice) {
            if (other.speaking) {
                voice.innerHTML = '<span>🎙️</span> Speaking';
                voice.classList.add('speaking');
            } else {
                voice.innerHTML = '<span>🔇</span> Silent';
                voice.classList.remove('speaking');
            }
        }

        // Position card near mouse
        let cx = lastMouseX + 20;
        let cy = lastMouseY - 110;
        if (cx + 290 > width) cx = lastMouseX - 310;
        if (cy + 350 > height) cy = height - 360;
        if (cy < 15) cy = 15;

        card.style.left = `${cx}px`;
        card.style.top = `${cy}px`;
        card.classList.add('show');
    }

    // Hide player profile card
    static hideProfile(): void {
        const card = document.getElementById('profile');
        if (card) card.classList.remove('show');
    }

    // Update realm UI elements
    static updateRealmUI(realm: string): void {
        const realmText = document.getElementById('realm-text');
        const realmIcon = document.getElementById('realm-icon');
        const realmButtons = document.querySelectorAll('.realm');

        if (realmText) realmText.textContent = realm;
        if (realmIcon) realmIcon.textContent = realm === 'genesis' ? '🌌' : realm === 'nebula' ? '🌸' : realm === 'void' ? '🌑' : '⚡';

        realmButtons.forEach(btn => {
            const btnRealm = btn.getAttribute('data-realm');
            btn.classList.toggle('active', btnRealm === realm);
        });
    }

    // Update realm lock states based on player level
    static updateRealmLocks(playerXP: number): void {
        const level = GameLogic.getLevel(playerXP);
        const realmButtons = document.querySelectorAll('.realm');

        // Realm unlock levels: genesis=1, nebula=1, void=1, starforge=5, abyss=7, crystal=8, sanctuary=10, celestial=11
        const unlockLevels: Record<string, number> = {
            genesis: 1,
            nebula: 1,
            void: 1,
            starforge: 2,
            abyss: 3,
            crystal: 4,
            sanctuary: 5,
            celestial: 6,
            tagarena: 2  // Tag Arena unlocks at level 2
        };

        realmButtons.forEach(btn => {
            const realmId = btn.getAttribute('data-realm');
            const unlockLevel = realmId ? (unlockLevels[realmId] || 999) : 999;
            btn.classList.toggle('locked', level < unlockLevel);
        });
    }

    // Show emote wheel
    static showEmoteWheel(x: number, y: number): void {
        const wheel = document.getElementById('emotes');
        if (!wheel) return;

        let wx = x - 95;
        let wy = y - 95;
        if (wx < 10) wx = 10;
        if (wy < 10) wy = 10;
        if (wx + 190 > window.innerWidth) wx = window.innerWidth - 200;
        if (wy + 190 > window.innerHeight) wy = window.innerHeight - 200;

        wheel.style.left = `${wx}px`;
        wheel.style.top = `${wy}px`;
        wheel.classList.add('show');
    }

    // Hide emote wheel
    static hideEmoteWheel(): void {
        const wheel = document.getElementById('emotes');
        if (wheel) wheel.classList.remove('show');
    }

    // Update voice visualization bars
    static updateVoiceViz(amplitude: number): void {
        const bars = document.querySelectorAll('.vbar');
        bars.forEach((bar) => {
            const height = 4 + Math.random() * amplitude * 10;
            (bar as HTMLElement).style.height = `${height}px`;
        });
    }

    // Show realm transition overlay
    static showRealmTransition(realmName: string, realmIcon: string, callback: () => void): void {
        const trans = document.getElementById('realm-trans');
        const transIcon = document.getElementById('trans-icon');
        const transName = document.getElementById('trans-name');

        if (!trans || !transIcon || !transName) return;

        transIcon.textContent = realmIcon;
        transName.textContent = realmName;
        trans.classList.add('active');

        setTimeout(() => {
            callback();
            setTimeout(() => trans.classList.remove('active'), 800);
        }, 600);
    }

    // Update minimap view radius indicator
    static updateMinimapViewRadius(): void {
        // This is handled in the renderer, but we could add UI elements here
    }

    // Show loading screen
    static showLoading(): void {
        const loading = document.getElementById('loading');
        if (loading) loading.classList.remove('hide');
    }

    // Hide loading screen
    static hideLoading(): void {
        const loading = document.getElementById('loading');
        if (loading) loading.classList.add('hide');
    }

    // Update voice button state
    static updateVoiceButton(voiceOn: boolean): void {
        const btn = document.getElementById('voice-btn');
        const status = document.getElementById('voice-status');

        if (!btn || !status) return;

        if (voiceOn) {
            btn.classList.add('on');
            btn.classList.remove('muted');
            btn.textContent = '🎙️';
            status.textContent = 'On';
        } else {
            btn.classList.remove('on');
            btn.classList.add('muted');
            btn.textContent = '🔇';
            status.textContent = 'Off';
        }
    }

    // Show message input box
    static showMessageBox(placeholder?: string, targetText?: string): void {
        const msgBox = document.getElementById('msg-box');
        const msgTarget = document.getElementById('msg-target');
        const msgInput = document.getElementById('msg-input') as HTMLInputElement;

        if (!msgBox || !msgInput) return;

        if (placeholder) {
            msgInput.placeholder = placeholder;
        }

        if (targetText && msgTarget) {
            msgTarget.textContent = targetText;
            msgTarget.classList.add('show');
        } else if (msgTarget) {
            msgTarget.classList.remove('show');
        }

        msgBox.classList.add('show');
        msgInput.value = '';
        msgInput.focus();
    }

    // Hide message input box
    static hideMessageBox(): void {
        const msgBox = document.getElementById('msg-box');
        const msgTarget = document.getElementById('msg-target');

        if (msgBox) msgBox.classList.remove('show');
        if (msgTarget) msgTarget.classList.remove('show');
    }

    // Update nearby players list
    static updateNearby(others: Map<string, OtherPlayer>): void {
        const list = document.getElementById('nearby-list');
        if (!list) return;

        if (others.size === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">🌌</div><div class="empty-text">Drift through space to find others...</div></div>';
            return;
        }

        list.innerHTML = '';
        others.forEach((other, id) => {
            const item = document.createElement('div');
            item.className = 'player-item';
            if (other.speaking) item.classList.add('speaking');
            item.dataset.id = id;

            const bond = 50; // TODO: Get actual bond value
            item.innerHTML = `
                <div class="player-orb" style="background: linear-gradient(135deg, hsl(${other.hue}, 68%, 55%), hsl(${other.hue + 30}, 58%, 45%)); box-shadow: 0 0 12px hsla(${other.hue}, 68%, 50%, 0.5);">
                    ${other.speaking ? '<div class="player-speaking-ring"></div>' : ''}
                </div>
                <div class="player-info">
                    <div class="player-name">${other.name}</div>
                    <div class="player-status">${other.singing ? '🎵 Singing' : other.pulsing ? '✨ Pulsing' : other.emoting ? other.emoting : 'Drifting'}</div>
                </div>
                <div class="player-bond">
                    <div class="player-bond-fill" style="width: ${bond}%"></div>
                </div>
            `;

            list.appendChild(item);
        });

        // Add click handlers
        list.querySelectorAll('.player-item').forEach(el => {
            el.addEventListener('click', () => {
                const playerId = (el as HTMLElement).dataset.id;
                if (playerId) {
                    // Show profile for this player
                    const other = others.get(playerId);
                    if (other) {
                        // TODO: Show profile at mouse position
                    }
                }
            });
        });
    }

    // Update quests panel
    static updateQuests(): void {
        const dailyList = document.getElementById('daily-quest-list');
        const weeklyList = document.getElementById('weekly-quest-list');
        const weeklyTimer = document.getElementById('weekly-reset-timer');

        if (!dailyList) return;

        // Daily quests from config (QUESTS are the daily quests)
        const dailyQuests = (CONFIG as any).QUESTS || [];

        dailyList.innerHTML = '';
        dailyQuests.forEach((quest: any) => {
            const item = document.createElement('div');
            item.className = 'quest-item';

            // TODO: Get actual progress from dailyProgress
            const progress = 0;
            const complete = progress >= quest.need;
            if (complete) item.classList.add('complete');

            const pct = Math.round((progress / quest.need) * 100);
            item.innerHTML = `
                <div class="quest-header">
                    <div class="quest-name">${quest.name}</div>
                    <div class="quest-reward">+${quest.reward} XP</div>
                </div>
                <div class="quest-desc">${quest.desc}</div>
                <div class="quest-progress">
                    <div class="quest-bar">
                        <div class="quest-bar-fill" style="width: ${pct}%"></div>
                    </div>
                    <div class="quest-count">${progress} / ${quest.need}</div>
                </div>
            `;
            dailyList.appendChild(item);
        });

        // Weekly quests
        if (weeklyList) {
            weeklyList.innerHTML = '';
            const weeklyQuests = (CONFIG as any).WEEKLY_QUESTS || [];

            weeklyQuests.forEach((quest: any) => {
                const item = document.createElement('div');
                item.className = 'quest-item weekly';

                // TODO: Get actual progress from weeklyProgress
                const progress = 0;
                const complete = progress >= quest.need;
                if (complete) item.classList.add('complete');

                const pct = Math.round((progress / quest.need) * 100);
                item.innerHTML = `
                    <div class="weekly-label">Weekly Challenge</div>
                    <div class="quest-header">
                        <div class="quest-name">${quest.name}</div>
                        <div class="quest-reward">+${quest.reward} XP</div>
                    </div>
                    <div class="quest-desc">${quest.desc}</div>
                    <div class="quest-progress">
                        <div class="quest-bar">
                            <div class="quest-bar-fill" style="width: ${pct}%"></div>
                        </div>
                        <div class="quest-count">${progress} / ${quest.need}</div>
                    </div>
                `;
                weeklyList.appendChild(item);
            });
        }

        // Update weekly timer
        if (weeklyTimer) {
            // Calculate time until next Monday
            const now = new Date();
            const nextMonday = new Date(now);
            nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
            nextMonday.setHours(0, 0, 0, 0);
            const msLeft = nextMonday.getTime() - now.getTime();
            const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
            const daysLeft = Math.floor(hoursLeft / 24);
            weeklyTimer.textContent = `Resets in ${daysLeft}d ${hoursLeft % 24}h`;
        }
    }

    // Update achievements panel
    static updateAchievements(): void {
        const achGrid = document.getElementById('ach-grid');
        if (!achGrid) return;

        // Get achievements from CONFIG
        const achievements = CONFIG.ACHIEVEMENTS;

        // TODO: Get unlocked set from game state - for now use localStorage
        let unlockedSet: Set<string>;
        try {
            const saved = localStorage.getItem('aura_achievements');
            unlockedSet = saved ? new Set(JSON.parse(saved)) : new Set();
        } catch {
            unlockedSet = new Set();
        }

        achGrid.innerHTML = '';
        achievements.forEach((ach: any) => {
            const card = document.createElement('div');
            card.className = 'ach-card';
            const isUnlocked = unlockedSet.has(ach.id);

            if (isUnlocked) {
                card.classList.add('unlocked');
            } else {
                card.classList.add('locked');
            }

            // Add category class for styling
            if (ach.secret) {
                card.classList.add('secret');
            }

            card.innerHTML = `
                <div class="ach-icon">${ach.secret && !isUnlocked ? '❓' : ach.icon}</div>
                <div class="ach-info">
                    <div class="ach-name">${ach.secret && !isUnlocked ? '???' : ach.name}</div>
                    <div class="ach-desc">${ach.secret && !isUnlocked ? 'Secret achievement' : ach.desc}</div>
                    <div class="ach-reward">+${ach.xp} XP</div>
                </div>
            `;

            achGrid.appendChild(card);
        });

        // Update counts (only count non-secret or unlocked secret achievements)
        // @ts-ignore Reserved for filtered view
        const _visibleTotal = achievements.filter((a: any) => !a.secret).length;
        const unlockedCount = achievements.filter((a: any) => unlockedSet.has(a.id)).length;
        const achCount = document.getElementById('ach-count');
        const achTotal = document.getElementById('ach-total');
        if (achCount) achCount.textContent = unlockedCount.toString();
        if (achTotal) achTotal.textContent = achievements.length.toString();
    }

    // Show profile at specific position
    static showProfile(other: OtherPlayer, x: number, y: number): void {
        const card = document.getElementById('profile');
        if (!card) return;

        const level = Math.floor((other.xp || 0) / 100) + 1;
        const form = GameLogic.getForm(level);
        const age = Math.floor((Date.now() - (other.born || Date.now())) / 3600000);

        // Update card content
        const banner = document.getElementById('prof-banner');
        const avatar = document.getElementById('prof-avatar');
        const name = document.getElementById('prof-name');
        const title = document.getElementById('prof-title');
        const stars = document.getElementById('prof-stars');
        const echoes = document.getElementById('prof-echoes');
        const ageElem = document.getElementById('prof-age');
        const bondVal = document.getElementById('prof-bond-val');
        const bondFill = document.getElementById('prof-bond-fill');
        const voice = document.getElementById('prof-voice');

        if (banner) {
            (banner as HTMLElement).style.background = `linear-gradient(135deg,hsla(${other.hue},60%,40%,0.5),hsla(${other.hue + 40},50%,30%,0.3))`;
        }
        if (avatar) {
            (avatar as HTMLElement).style.background = `linear-gradient(135deg,hsl(${other.hue},68%,55%),hsl(${other.hue + 30},58%,45%))`;
            (avatar as HTMLElement).style.boxShadow = `0 0 24px hsla(${other.hue},68%,50%,0.55)`;
        }
        if (name) name.textContent = other.name;
        if (title) title.textContent = `${form} • Lv ${level}`;
        if (stars) stars.textContent = (other.stars || 0).toString();
        if (echoes) echoes.textContent = (other.echoes || 0).toString();
        if (ageElem) ageElem.textContent = age < 1 ? '<1h' : `${age}h`;
        if (bondVal) bondVal.textContent = '0%';
        if (bondFill) (bondFill as HTMLElement).style.width = '0%';

        if (voice) {
            if (other.speaking) {
                voice.innerHTML = '<span>🎙️</span> Speaking';
                voice.classList.add('speaking');
            } else {
                voice.innerHTML = '<span>🔇</span> Silent';
                voice.classList.remove('speaking');
            }
        }

        // Position card near click
        let cx = x + 20;
        let cy = y - 110;
        if (cx + 290 > window.innerWidth) cx = x - 310;
        if (cy + 350 > window.innerHeight) cy = window.innerHeight - 360;
        if (cy < 15) cy = 15;

        card.style.left = `${cx}px`;
        card.style.top = `${cy}px`;
        card.classList.add('show');
    }
}
