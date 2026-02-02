import {
    WORLD_SIZE,
    LIGHT_MIN_RADIUS,
    CHAT_BUBBLE_DURATION
} from '../config/constants';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
export const getRandomName = () => {
    const adjs = ['Wandering', 'Glowing', 'Silent', 'Seeking', 'Pale', 'Shimmering', 'Eternal', 'Lost', 'Lonely', 'Bright', 'Dreaming', 'Drifting', 'Golden', 'Radiant', 'Whispering', 'Dancing', 'Floating', 'Ancient', 'Gentle', 'Kind'];
    const nouns = ['Sun', 'Flame', 'Spark', 'Light', 'Ray', 'Guardian', 'Hope', 'Dream', 'Spirit', 'Star', 'Ember', 'Wanderer', 'Soul', 'Beacon', 'Phoenix', 'Wisp', 'Echo', 'Memory', 'Dawn', 'Twilight'];
    return `${adjs[Math.floor(Math.random() * adjs.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
};

export const AI_PERSONALITIES = [
    { type: 'explorer', speed: 1.8, wanderRange: 3000, social: 0.3, pauseChance: 0.01, color: '#60a5fa' },
    { type: 'social', speed: 1.0, wanderRange: 800, social: 0.9, pauseChance: 0.02, color: '#f472b6' },
    { type: 'shy', speed: 0.6, wanderRange: 400, social: 0.1, pauseChance: 0.05, color: '#a78bfa' },
    { type: 'beacon_seeker', speed: 1.4, wanderRange: 2000, social: 0.5, pauseChance: 0.01, color: '#34d399' },
    { type: 'wanderer', speed: 1.2, wanderRange: 1500, social: 0.4, pauseChance: 0.03, color: '#fbbf24' },
    { type: 'guardian', speed: 0.8, wanderRange: 600, social: 0.7, pauseChance: 0.04, color: '#fb923c' },
];

export const AI_MESSAGES = {
    greeting: ['Hey there!', 'Hello friend!', 'Nice to see someone!', 'Oh hi!', 'Greetings traveler!', 'Hey! You made it!', 'Welcome!', 'You shine brightly!'],
    lonely: ['So quiet...', 'Anyone around?', 'Hello?', 'The darkness...', 'Where is everyone?', 'I miss the light...', 'Is anyone there?', 'Such emptiness...'],
    excited: ['So bright!', 'Beautiful!', 'This is amazing!', 'Wow!', 'So pretty!', 'Shining so bright!', 'Incredible!', 'Look at us glow!'],
    group: ['Stronger together!', 'Stick together!', 'Safety in numbers!', 'This feels right!', 'United we glow!', 'We are many!', 'Together as one!'],
    beacon: ['The beacon...', 'Can you feel it?', 'Almost there!', 'Let\'s light it up!', 'Such power!', 'The light calls!'],
    leaving: ['Gotta explore...', 'See you around!', 'Time to wander...', 'Bye for now!', 'Until we meet again!', 'Stay bright!'],
    random: ['What\'s out there?', 'Vast cosmos...', 'Keep shining.', 'Never stop glowing.', 'Stars guide us...', 'The journey continues...', 'So peaceful here...', 'Beautiful night...']
};

export class AIAgent {
    constructor(id) {
        this.id = id;
        this.x = Math.random() * WORLD_SIZE;
        this.y = Math.random() * WORLD_SIZE;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.name = getRandomName();
        this.personality = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
        this.targetX = Math.random() * WORLD_SIZE;
        this.targetY = Math.random() * WORLD_SIZE;
        this.speed = this.personality.speed * (0.8 + Math.random() * 0.4);
        this.radius = LIGHT_MIN_RADIUS + Math.random() * 40;
        this.phase = Math.random() * Math.PI * 2;
        this.isPaused = false;
        this.pauseTimer = 0;
        this.lastMessage = '';
        this.nearbyCount = 0;
        this.mood = 'neutral';
        this.currentMessage = null;
        this.messageTime = 0;
        this.chatCooldown = Math.random() * 300;
        this.color = this.personality.color;
    }

    getRandomMessage(category) {
        const msgs = AI_MESSAGES[category] || AI_MESSAGES.random;
        let msg;
        do {
            msg = msgs[Math.floor(Math.random() * msgs.length)];
        } while (msg === this.lastMessage && msgs.length > 1);
        this.lastMessage = msg;
        return msg;
    }

    update(allEntities, beaconLocations, playerX, playerY) {
        this.nearbyCount = allEntities.filter(e =>
            e.id !== this.id && Math.hypot(e.x - this.x, e.y - this.y) < 300
        ).length;

        if (this.nearbyCount >= 3) this.mood = 'excited';
        else if (this.nearbyCount >= 1) this.mood = 'social';
        else this.mood = Math.random() < 0.3 ? 'lonely' : 'neutral';

        if (this.chatCooldown > 0) this.chatCooldown--;

        if (Date.now() - this.messageTime > CHAT_BUBBLE_DURATION) {
            this.currentMessage = null;
        }

        const distToPlayer = Math.hypot(this.x - playerX, this.y - playerY);
        if (distToPlayer < 250 && this.chatCooldown <= 0 && Math.random() < 0.003) {
            let category = 'random';
            if (this.mood === 'excited') category = Math.random() < 0.5 ? 'excited' : 'group';
            else if (this.mood === 'social') category = Math.random() < 0.7 ? 'greeting' : 'random';
            else if (this.mood === 'lonely') category = 'lonely';

            this.currentMessage = this.getRandomMessage(category);
            this.messageTime = Date.now();
            this.chatCooldown = 400 + Math.random() * 500;
        }

        if (this.isPaused) {
            this.pauseTimer--;
            if (this.pauseTimer <= 0) this.isPaused = false;
            this.phase += 0.03;
            this.currentRadius = this.radius + Math.sin(this.phase) * 3;
            return;
        }

        if (Math.random() < this.personality.pauseChance) {
            this.isPaused = true;
            this.pauseTimer = 60 + Math.floor(Math.random() * 180);
            return;
        }

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 80 || Math.random() < 0.003) {
            if (this.personality.social > 0.6 && allEntities.length > 0 && Math.random() < this.personality.social) {
                const target = allEntities[Math.floor(Math.random() * allEntities.length)];
                if (target && target.id !== this.id) {
                    this.targetX = target.x + (Math.random() - 0.5) * 200;
                    this.targetY = target.y + (Math.random() - 0.5) * 200;
                }
            } else if (this.personality.type === 'beacon_seeker' && beaconLocations && Math.random() < 0.5) {
                const beacon = beaconLocations[Math.floor(Math.random() * beaconLocations.length)];
                if (beacon) {
                    this.targetX = beacon.x + (Math.random() - 0.5) * 100;
                    this.targetY = beacon.y + (Math.random() - 0.5) * 100;
                }
            } else {
                const range = this.personality.wanderRange;
                this.targetX = Math.max(0, Math.min(WORLD_SIZE, this.x + (Math.random() - 0.5) * range));
                this.targetY = Math.max(0, Math.min(WORLD_SIZE, this.y + (Math.random() - 0.5) * range));
            }
        }

        const angle = Math.atan2(dy, dx);
        this.vx += Math.cos(angle) * 0.03;
        this.vy += Math.sin(angle) * 0.03;

        this.vx *= 0.97;
        this.vy *= 0.97;

        const currSpeed = Math.hypot(this.vx, this.vy);
        const maxSpeed = this.speed * (this.mood === 'excited' ? 1.3 : 1);
        if (currSpeed > maxSpeed) {
            this.vx = (this.vx / currSpeed) * maxSpeed;
            this.vy = (this.vy / currSpeed) * maxSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Boundary handling
        if (this.x < 50) { this.vx += 0.1; this.targetX = 500; }
        if (this.x > WORLD_SIZE - 50) { this.vx -= 0.1; this.targetX = WORLD_SIZE - 500; }
        if (this.y < 50) { this.vy += 0.1; this.targetY = 500; }
        if (this.y > WORLD_SIZE - 50) { this.vy -= 0.1; this.targetY = WORLD_SIZE - 500; }

        this.phase += 0.04;
        this.currentRadius = this.radius + Math.sin(this.phase) * 4;
    }
}
