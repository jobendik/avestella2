import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, addDoc } from 'firebase/firestore';
import { Share2, MessageCircle, X, Send, Sparkles, Users, Zap, Heart, Sun, Wind } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// FIREBASE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const WORLD_SIZE = 8000;
const LIGHT_MIN_RADIUS = 30;
const LIGHT_MAX_RADIUS = 180;
const COLD_ONSET_DELAY = 8000;
const TETHER_MAX_DIST = 500;
const TETHER_STRENGTH = 0.02;
const TETHER_SNAP_TIME = 180;
const WARMTH_LINGER_FRAMES = 900;
const WARMTH_GRANT_FLOOR = 450;
const IDLE_BREATH_THRESHOLD = 180;
const CROWDING_DISTANCE = 50;
const OPTIMAL_DISTANCE = 120;
const MAX_CONNECTION_DIST = 300;
const FRAGMENT_COLLECT_RADIUS = 60;
const FRAGMENT_SPAWN_RATE = 0.02;
const BEACON_ACTIVATION_FRAMES = 4;
const PRESENCE_HEARTBEAT_MS = 15000;
const CHAT_BUBBLE_DURATION = 8000;
const AI_COUNT = 20;
const BOND_GROW_RATE = 0.002;
const BOND_DECAY_RATE = 0.0005;

const BEACONS = [
  { id: 'b1', x: WORLD_SIZE/2, y: WORLD_SIZE/2, icon: '🌟', type: 'sanctuary' },
  { id: 'b2', x: WORLD_SIZE/2 - 1000, y: WORLD_SIZE/2 - 1000, icon: '🔮', type: 'wisdom' },
  { id: 'b3', x: WORLD_SIZE/2 + 1000, y: WORLD_SIZE/2 + 1000, icon: '✨', type: 'hope' },
  { id: 'b4', x: WORLD_SIZE/2 + 1000, y: WORLD_SIZE/2 - 1000, icon: '⚡', type: 'courage' },
  { id: 'b5', x: WORLD_SIZE/2 - 1000, y: WORLD_SIZE/2 + 1000, icon: '💫', type: 'unity' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
const getRandomName = () => {
  const adjs = ['Wandering', 'Glowing', 'Silent', 'Seeking', 'Pale', 'Shimmering', 'Eternal', 'Lost', 'Lonely', 'Bright', 'Dreaming', 'Drifting', 'Golden', 'Radiant', 'Whispering', 'Dancing', 'Floating', 'Ancient', 'Gentle', 'Kind'];
  const nouns = ['Sun', 'Flame', 'Spark', 'Light', 'Ray', 'Guardian', 'Hope', 'Dream', 'Spirit', 'Star', 'Ember', 'Wanderer', 'Soul', 'Beacon', 'Phoenix', 'Wisp', 'Echo', 'Memory', 'Dawn', 'Twilight'];
  return `${adjs[Math.floor(Math.random() * adjs.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
};

const vibrate = (pattern) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 191, b: 36 };
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.windNode = null;
    this.humNode = null;
    this.droneNode = null;
    this.isStarted = false;
  }

  async start() {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!this.ctx) {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.5;
    }
    
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.isStarted) return;
    this.isStarted = true;
    this.createWind();
    this.createHum();
    this.createDrone();
  }

  createWind() {
    if (!this.ctx) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
    this.windNode = { gain, filter };
  }

  createHum() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 100;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    this.humNode = { osc, gain };
  }

  createDrone() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 55;
    gain.gain.value = 0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 120;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    this.droneNode = { gain };
  }

  updateMovementHum(speed) {
    if (!this.humNode || !this.ctx) return;
    const targetFreq = 100 + (speed * 20);
    const targetVol = Math.min(0.2, speed * 0.05);
    this.humNode.osc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    this.humNode.gain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.1);
  }

  setEnvironment(type) {
    if (!this.windNode || !this.ctx) return;
    const now = this.ctx.currentTime;
    const windVol = (type === 'wind' || type === 'cold') ? 0.3 : 0.05;
    this.windNode.gain.gain.setTargetAtTime(windVol, now, 2);
    const droneVol = (type === 'cold') ? 0.2 : 0.0;
    this.droneNode.gain.gain.setTargetAtTime(droneVol, now, 3);
  }

  playBloom() {
    if (!this.ctx) return;
    const freqs = [261.63, 329.63, 392.00, 523.25];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.1 + (i * 0.05));
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 4);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 5);
    });
  }

  playSnap() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playCollect() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playSpark() {
    if (!this.ctx) return;
    const freqs = [600, 800, 1200];
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const delay = i * 0.04;
      gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + delay + 0.02);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + delay + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + 0.25);
    });
  }

  playProximity(intensity = 0.5, pitch = 440) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = pitch;
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(intensity * 0.1, this.ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }

  playChime() {
    if (!this.ctx) return;
    const freqs = [523, 659, 784];
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const delay = i * 0.1;
      gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + 1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + 1.1);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI PERSONALITIES & MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════
const AI_PERSONALITIES = [
  { type: 'explorer', speed: 1.8, wanderRange: 3000, social: 0.3, pauseChance: 0.01, color: '#60a5fa' },
  { type: 'social', speed: 1.0, wanderRange: 800, social: 0.9, pauseChance: 0.02, color: '#f472b6' },
  { type: 'shy', speed: 0.6, wanderRange: 400, social: 0.1, pauseChance: 0.05, color: '#a78bfa' },
  { type: 'beacon_seeker', speed: 1.4, wanderRange: 2000, social: 0.5, pauseChance: 0.01, color: '#34d399' },
  { type: 'wanderer', speed: 1.2, wanderRange: 1500, social: 0.4, pauseChance: 0.03, color: '#fbbf24' },
  { type: 'guardian', speed: 0.8, wanderRange: 600, social: 0.7, pauseChance: 0.04, color: '#fb923c' },
];

const AI_MESSAGES = {
  greeting: ['Hey there!', 'Hello friend!', 'Nice to see someone!', 'Oh hi!', 'Greetings traveler!', 'Hey! You made it!', 'Welcome!', 'You shine brightly!'],
  lonely: ['So quiet...', 'Anyone around?', 'Hello?', 'The darkness...', 'Where is everyone?', 'I miss the light...', 'Is anyone there?', 'Such emptiness...'],
  excited: ['So bright!', 'Beautiful!', 'This is amazing!', 'Wow!', 'So pretty!', 'Shining so bright!', 'Incredible!', 'Look at us glow!'],
  group: ['Stronger together!', 'Stick together!', 'Safety in numbers!', 'This feels right!', 'United we glow!', 'We are many!', 'Together as one!'],
  beacon: ['The beacon...', 'Can you feel it?', 'Almost there!', 'Let\'s light it up!', 'Such power!', 'The light calls!'],
  leaving: ['Gotta explore...', 'See you around!', 'Time to wander...', 'Bye for now!', 'Until we meet again!', 'Stay bright!'],
  random: ['What\'s out there?', 'Vast cosmos...', 'Keep shining.', 'Never stop glowing.', 'Stars guide us...', 'The journey continues...', 'So peaceful here...', 'Beautiful night...']
};

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL EFFECTS CLASSES
// ═══════════════════════════════════════════════════════════════════════════════
class Particle {
  constructor(x, y, type = 'dust') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.life = 1.0;
    
    switch (type) {
      case 'spark':
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 4;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.decay = 0.02;
        this.size = Math.random() * 5 + 2;
        this.color = '#FDB813'; // Bright gold
        break;
      case 'trail':
        this.vx = 0;
        this.vy = 0;
        this.decay = 0.02;
        this.size = Math.random() * 3 + 1;
        this.color = '#fbbf24';
        break;
      case 'storm':
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.decay = 0.04;
        this.size = Math.random() * 2;
        this.color = '#94a3b8'; // Lighter slate for contrast
        break;
      case 'wave':
        const waveAngle = Math.random() * Math.PI * 2;
        const waveSpeed = 2 + Math.random() * 6;
        this.vx = Math.cos(waveAngle) * waveSpeed;
        this.vy = Math.sin(waveAngle) * waveSpeed;
        this.decay = 0.015;
        this.size = 2 + Math.random() * 3;
        this.color = '#FFFFFF'; // Pure white
        break;
      case 'bloom':
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.decay = 0.02;
        this.size = Math.random() * 4 + 2;
        this.color = '#FDB813';
        break;
      case 'snap':
        const snapAngle = Math.random() * Math.PI * 2;
        const snapSpeed = 1 + Math.random() * 3;
        this.vx = Math.cos(snapAngle) * snapSpeed;
        this.vy = Math.sin(snapAngle) * snapSpeed;
        this.decay = 0.03;
        this.size = 1 + Math.random() * 2;
        this.color = '#e879f9';
        break;
      default: // dust
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.decay = 0.005;
        this.size = Math.random() * 2;
        this.color = '#ffffff';
    }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }
}

class Ripple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 20;
    this.life = 1.0;
  }

  update() {
    this.radius += 0.5;
    this.life -= 0.01;
  }
}

class Shockwave {
  constructor(x, y, maxR = 300) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.maxRadius = maxR;
    this.alpha = 1.0;
  }

  update() {
    this.radius += 8; // Faster shockwave expansion
    this.alpha -= 0.02;
    if (this.radius > this.maxRadius) this.alpha = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI AGENT CLASS
// ═══════════════════════════════════════════════════════════════════════════════
class AIAgent {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const canvasRef = useRef(null);
  const [user, setUser] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [tetherMsg, setTetherMsg] = useState(null);
  const [activeShard, setActiveShard] = useState('b1');
  const activeShardRef = useRef('b1');
  const [lightLevel, setLightLevel] = useState(0);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [weatherType, setWeatherType] = useState('calm');
  const [nearbyCount, setNearbyCount] = useState(0);
  const [totalSoulsMet, setTotalSoulsMet] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [showAchievement, setShowAchievement] = useState(null);
  const lastTapTime = useRef(0);
  const lastTrailTime = useRef(0);

  // Game State
  const gameState = useRef({
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2,
    vx: 0,
    vy: 0,
    radius: LIGHT_MIN_RADIUS,
    name: getRandomName(),
    
    // Multiplayer & Sync
    hasMoved: false,
    forcePresenceUpdate: false,
    lastPresenceWrite: 0,
    writeInFlight: false,
    currentShard: 'b1',
    previousShard: 'b1',
    
    // Warmth & Environment
    coldTimer: 0,
    stationaryTimer: 0,
    warmthLinger: 0,
    wasNearWarmth: false,
    
    // Tether System
    tetherHostId: null,
    tetherStressTimer: 0,
    knownTetheredGuests: new Set(),
    
    // Social Systems
    bonds: new Map(),
    soulsMet: new Set(),
    constellationBonus: 0,
    inEncounter: false,
    
    // Collections & Progress
    fragmentsCollected: 0,
    beaconsLit: 0,
    
    // UI & Messages
    toastQueue: [],
    myMessages: [],
    
    // Entities
    otherPlayers: {},
    aiAgents: [],
    echoes: [],
    
    // Visual Effects
    particles: [],
    ripples: [],
    shockwaves: [],
    screenFlash: { color: '#FFF', intensity: 0, decay: 0.05 },
    localFragments: Array.from({length: 150}, () => ({
      x: Math.random() * WORLD_SIZE,
      y: Math.random() * WORLD_SIZE,
      phase: Math.random() * Math.PI * 2
    })),
    
    // Beacon States
    beaconStates: BEACONS.reduce((acc, b) => {
      acc[b.id] = { charge: 0, active: false, activeTimer: 0 };
      return acc;
    }, {}),
    
    // Interaction
    targetX: null,
    targetY: null,
    isInteracting: false,
    
    // Audio
    audio: new AudioEngine()
  });

  const triggerScreenFlash = (color, intensity) => {
    gameState.current.screenFlash = { color, intensity, decay: 0.02 };
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // ACHIEVEMENT SYSTEM
  // ═════════════════════════════════════════════════════════════════════════════
  const unlockAchievement = (id, title, description) => {
    if (!achievements.includes(id)) {
      setAchievements(prev => [...prev, id]);
      setShowAchievement({ title, description });
      triggerScreenFlash('#fbbf24', 0.6); // Gold flash on achievement
      vibrate([50, 50]);
      gameState.current.audio.playChime();
      setTimeout(() => setShowAchievement(null), 4000);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION & AUTH
  // ═════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const init = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
      
      const params = new URLSearchParams(window.location.search);
      const hostId = params.get('tether');
      if (hostId) gameState.current.tetherHostId = hostId;
      
      // Initialize AI Agents
      gameState.current.aiAgents = Array.from({length: AI_COUNT}, (_, i) => new AIAgent(`ai_${i}`));
    };

    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    init();
    return () => unsubscribe();
  }, []);

  // Sync ref mirror
  useEffect(() => {
    activeShardRef.current = activeShard;
  }, [activeShard]);

  // ═════════════════════════════════════════════════════════════════════════════
  // CLEANUP ON EXIT
  // ═════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const cleanup = () => {
      if (!user) return;
      const state = gameState.current;
      const shardsToCheck = new Set([state.currentShard, state.previousShard, activeShardRef.current]);
      shardsToCheck.forEach(shard => {
        if (!shard) return;
        const col = `avestella_players_${shard}`;
        deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, user.uid)).catch(() => {});
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') cleanup();
    };

    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', cleanup);
      window.removeEventListener('pagehide', cleanup);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // ═════════════════════════════════════════════════════════════════════════════
  // FIREBASE SUBSCRIPTIONS
  // ═════════════════════════════════════════════════════════════════════════════
  
  // 1. Players (Sharded)
  useEffect(() => {
    if (!user) return;
    const playersColName = `avestella_players_${activeShard}`;
    const unsubPlayers = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', playersColName),
      (snap) => {
        const others = {};
        snap.forEach(d => {
          if (d.id !== user.uid) {
            const data = d.data();
            if (Date.now() - (data.lastSeen?.toMillis() || 0) < 60000) {
              others[d.id] = { ...data, id: d.id };
            }
          }
        });
        gameState.current.otherPlayers = others;
      },
      (error) => { console.error("Players sync error:", error); }
    );
    return () => unsubPlayers();
  }, [user, activeShard]);

  // 2. Chat (Sharded) - Using memory sort to avoid index requirement
  useEffect(() => {
    if (!user) return;
    const chatColName = `avestella_chat_${activeShard}`;
    
    // We grab the collection and sort in memory to avoid "Index Required" errors
    const unsubChat = onSnapshot(
        collection(db, 'artifacts', appId, 'public', 'data', chatColName),
        (snap) => {
            const msgs = [];
            snap.forEach(d => msgs.push({id: d.id, ...d.data()}));
            
            // Client-side sort descending
            msgs.sort((a, b) => {
                const tA = a.createdAt?.toMillis() || 0;
                const tB = b.createdAt?.toMillis() || 0;
                return tB - tA; 
            });

            // Take top 20 and reverse for display (oldest at top)
            setChatMessages(msgs.slice(0, 20).reverse());

            // Update bubble state for players
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (gameState.current.otherPlayers[data.uid]) {
                        gameState.current.otherPlayers[data.uid].currentMessage = data.text;
                        gameState.current.otherPlayers[data.uid].messageTime = Date.now();
                    }
                }
            });
        },
        (error) => { console.error("Chat sync error:", error); }
    );
    return () => unsubChat();
  }, [user, activeShard]);

  // 3. Echoes (Global)
  useEffect(() => {
    if (!user) return;
    const unsubEchoes = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'avestella_echoes'),
      (snap) => {
        const e = [];
        snap.forEach(d => e.push({id: d.id, ...d.data()}));
        gameState.current.echoes = e;
      },
      (error) => { console.error("Echoes sync error:", error); }
    );
    return () => unsubEchoes();
  }, [user]);

  // ═════════════════════════════════════════════════════════════════════════════
  // PRESENCE BROADCAST & SHARD MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!user) return;

    const broadcastInterval = setInterval(() => {
      const state = gameState.current;
      if (state.writeInFlight) return;
      
      const now = Date.now();
      
      // Calculate Current Shard
      let nearestId = 'b1';
      let minD = Infinity;
      BEACONS.forEach(b => {
        const d = Math.hypot(state.x - b.x, state.y - b.y);
        if(d < minD) {
          minD = d;
          nearestId = b.id;
        }
      });
      
      state.currentShard = nearestId;
      if (nearestId !== activeShardRef.current) {
        setActiveShard(nearestId);
      }
      
      const shardChanged = state.currentShard !== state.previousShard;
      const shouldWrite = state.hasMoved || state.forcePresenceUpdate || 
                         (now - state.lastPresenceWrite > PRESENCE_HEARTBEAT_MS);
      
      const playerData = {
        x: state.x,
        y: state.y,
        name: state.name,
        radius: state.radius,
        tetherHost: state.tetherHostId,
        lastSeen: serverTimestamp()
      };

      if (shardChanged) {
        state.writeInFlight = true;
        const newCol = `avestella_players_${state.currentShard}`;
        const oldCol = `avestella_players_${state.previousShard}`;
        
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', newCol, user.uid), playerData, { merge: true })
          .then(() => {
            deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', oldCol, user.uid)).catch(() => {});
            state.lastPresenceWrite = now;
            state.previousShard = state.currentShard;
            state.hasMoved = false;
            state.forcePresenceUpdate = false;
          })
          .catch(() => {})
          .finally(() => { state.writeInFlight = false; });
          
      } else if (shouldWrite) {
        state.writeInFlight = true;
        const col = `avestella_players_${state.currentShard}`;
        
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', col, user.uid), playerData, { merge: true })
          .then(() => {
            state.lastPresenceWrite = now;
            state.forcePresenceUpdate = false;
            state.hasMoved = false;
          })
          .catch(() => {})
          .finally(() => { state.writeInFlight = false; });
      }
      
      // Beacon Charging Logic
      BEACONS.forEach(b => {
        let chargePower = 0;
        const dxMe = state.x - b.x;
        const dyMe = state.y - b.y;
        if (dxMe*dxMe + dyMe*dyMe < 250*250) chargePower += 1;
        
        Object.values(state.otherPlayers).forEach(p => {
          const dx = p.x - b.x;
          const dy = p.y - b.y;
          if (Math.abs(dx) > 250 || Math.abs(dy) > 250) return;
          if (dx*dx + dy*dy < 250*250) chargePower += 1;
        });
        
        let bState = state.beaconStates[b.id];
        if (chargePower > 0) {
          const rate = chargePower * 4; 
          bState.charge = Math.min(100, bState.charge + rate);
          
          if (bState.charge >= 100) {
            bState.activeTimer++;
            if (bState.activeTimer > BEACON_ACTIVATION_FRAMES && !bState.active) {
              bState.active = true;
              state.beaconsLit++;
              state.shockwaves.push(new Shockwave(b.x, b.y, 600));
              triggerScreenFlash('#ffffff', 0.9); // Flash white on beacon lit
              if(dxMe*dxMe + dyMe*dyMe < 1000*1000) state.audio.playBloom();
              unlockAchievement('beacon', 'Illuminator', 'You lit a beacon');
              if (state.beaconsLit >= 5) {
                unlockAchievement('master', 'Master of Light', 'Lit all 5 beacons');
              }
            }
          }
        } else {
          bState.activeTimer = 0;
          bState.charge = Math.max(0, bState.charge - 2);
          if (bState.charge < 90) bState.active = false;
        }
      });
      
    }, 500);

    return () => clearInterval(broadcastInterval);
  }, [user]);

  // ═════════════════════════════════════════════════════════════════════════════
  // UI POLLING
  // ═════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const uiInterval = setInterval(() => {
      const state = gameState.current;
      
      // Toast Queue
      if (state.toastQueue.length > 0) {
        const msg = state.toastQueue.shift();
        setTetherMsg(msg);
        setTimeout(() => setTetherMsg(null), 4000);
      }
      
      // Light Bar
      const pct = Math.max(0, Math.min(100, 
        (state.radius - LIGHT_MIN_RADIUS) / (LIGHT_MAX_RADIUS - LIGHT_MIN_RADIUS) * 100
      ));
      setLightLevel(pct);
      
      // Weather State
      if (state.coldTimer > 200) setWeatherType('storm');
      else if (state.stationaryTimer > 200) setWeatherType('calm');
      else setWeatherType('wind');
      
      // Total Souls Met
      setTotalSoulsMet(state.soulsMet.size);
      
    }, 500);

    return () => clearInterval(uiInterval);
  }, []);

  // ═════════════════════════════════════════════════════════════════════════════
  // INTERACTION HANDLERS
  // ═════════════════════════════════════════════════════════════════════════════
  const handleStart = (clientX, clientY) => {
    if (!isStarted) {
      setIsStarted(true);
      gameState.current.audio.start();
      gameState.current.radius = LIGHT_MIN_RADIUS * 1.5;
      gameState.current.forcePresenceUpdate = true;
    }

    const now = Date.now();
    const isDoubleTap = now - lastTapTime.current < 300;
    lastTapTime.current = now;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const state = gameState.current;
    const canvas = canvasRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const offsetX = centerX - state.x;
    const offsetY = centerY - state.y;

    // Entity Selection
    const allEntities = [
      ...state.aiAgents.map(a => ({
        id: a.id,
        x: a.x,
        y: a.y,
        name: a.name,
        radius: a.currentRadius || 40,
        isAI: true,
        personality: a.personality.type,
        color: a.color
      })),
      ...Object.values(state.otherPlayers).map(p => ({
        ...p,
        isPlayer: true
      }))
    ];

    let hit = null;
    for(let e of allEntities) {
      const ex = e.x + offsetX;
      const ey = e.y + offsetY;
      const dist = Math.hypot(x - ex, y - ey);
      if(dist < 50) {
        hit = e;
        break;
      }
    }

    if(hit) {
      setSelectedEntity(hit);
      vibrate(20);
      return;
    } else {
      setSelectedEntity(null);
    }

    // Movement Target
    gameState.current.isInteracting = true;
    gameState.current.targetX = x;
    gameState.current.targetY = y;
  };

  const handleSpark = () => {
    const state = gameState.current;
    state.audio.playSpark();
    vibrate([40]);
    for (let i = 0; i < 40; i++) {
      state.particles.push(new Particle(state.x, state.y, 'wave'));
    }
    state.shockwaves.push(new Shockwave(state.x, state.y, 300));
  };

  const handleMove = (clientX, clientY) => {
    if (!gameState.current.isInteracting) return;
    const rect = canvasRef.current.getBoundingClientRect();
    gameState.current.targetX = clientX - rect.left;
    gameState.current.targetY = clientY - rect.top;
  };

  const handleEnd = () => {
    gameState.current.isInteracting = false;
    gameState.current.targetX = null;
    gameState.current.targetY = null;
  };

  const sendChat = async (e) => {
    e.preventDefault();
    if(!chatInput.trim() || !user) return;
    
    const text = chatInput.trim();
    setChatInput("");
    vibrate(20);
    
    // Local bubble
    gameState.current.myMessages.push({ text, time: Date.now() });
    
    // Firebase
    const chatColName = `avestella_chat_${activeShard}`;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', chatColName), {
      text,
      uid: user.uid,
      name: gameState.current.name,
      createdAt: serverTimestamp()
    });
  };

  const handleBeckon = () => {
    if (!user) return;
    const url = `${window.location.origin}${window.location.pathname}?tether=${user.uid}`;
    
    // Create temporary element for copy
    const textArea = document.createElement("textarea");
    textArea.value = url;
    
    // Ensure it's not visible but part of DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
          gameState.current.shockwaves.push(new Shockwave(gameState.current.x, gameState.current.y));
          gameState.current.audio.playBloom();
          vibrate([50, 50]);
          gameState.current.toastQueue.push("Tether link copied!");
      } else {
          throw new Error('Copy command failed');
      }
    } catch (err) {
      console.error("Copy failed", err);
      gameState.current.toastQueue.push("Could not copy link.");
    }
    
    document.body.removeChild(textArea);
  };

  const handlePlaceEcho = async () => {
    const text = prompt("Leave a memory for others:");
    if(text && user) {
      const state = gameState.current;
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'avestella_echoes'), {
        x: state.x,
        y: state.y,
        text,
        uid: user.uid,
        name: state.name,
        createdAt: serverTimestamp()
      });
      vibrate(50);
      state.toastQueue.push("Memory etched into the cosmos.");
      unlockAchievement('echo', 'Echo Maker', 'Left a message for others');
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // MAIN ANIMATION LOOP
  // ═════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!user) return;
    
    let animationId;
    const ctx = canvasRef.current.getContext('2d');

    const loop = (time) => {
      const state = gameState.current;
      const { width, height } = canvasRef.current;
      const centerX = width / 2;
      const centerY = height / 2;

      // ─────────────────────────────────────────────────────────────────────────
      // 1. UPDATE PHASE
      // ─────────────────────────────────────────────────────────────────────────
      
      // Movement Logic - Updated for faster, snappier movement
      if (state.isInteracting && state.targetX !== null) {
        state.hasMoved = true;
        const dx = (state.targetX - centerX);
        const dy = (state.targetY - centerY);
        const angle = Math.atan2(dy, dx);
        const dist = Math.min(Math.hypot(dx, dy), 100);
        
        // Increased acceleration factor from 0.0005 to 0.002
        const accel = dist * 0.002; 
        state.vx += Math.cos(angle) * accel;
        state.vy += Math.sin(angle) * accel;
      }

      // Tether Elastic Snap
      if (state.tetherHostId && state.otherPlayers[state.tetherHostId]) {
        const host = state.otherPlayers[state.tetherHostId];
        const dx = host.x - state.x;
        const dy = host.y - state.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > TETHER_MAX_DIST) {
          state.tetherStressTimer++;
          if (state.tetherStressTimer > TETHER_SNAP_TIME) {
            state.tetherHostId = null;
            state.audio.playSnap();
            for(let i=0; i<30; i++) {
              state.particles.push(new Particle(state.x + dx/2, state.y + dy/2, 'snap'));
            }
          } else {
            const force = (dist - TETHER_MAX_DIST) * TETHER_STRENGTH;
            const angle = Math.atan2(dy, dx);
            state.vx += Math.cos(angle) * force;
            state.vy += Math.sin(angle) * force;
          }
        } else {
          state.tetherStressTimer = Math.max(0, state.tetherStressTimer - 1);
        }
      }

      // Increased friction slightly to balance higher acceleration (0.96 -> 0.92)
      state.vx *= 0.92;
      state.vy *= 0.92;
      state.x = Math.max(0, Math.min(WORLD_SIZE, state.x + state.vx));
      state.y = Math.max(0, Math.min(WORLD_SIZE, state.y + state.vy));
      
      const speed = Math.hypot(state.vx, state.vy);

      // AI Update
      const allEntitiesForAI = [
        { id: 'player', x: state.x, y: state.y },
        ...state.aiAgents.map(a => ({ id: a.id, x: a.x, y: a.y })),
        ...Object.entries(state.otherPlayers).map(([id, p]) => ({ id, x: p.x, y: p.y }))
      ];
      state.aiAgents.forEach(agent => agent.update(allEntitiesForAI, BEACONS, state.x, state.y));

      // Combine all entities
      const nearbyEntities = [
        ...Object.values(state.otherPlayers).map(p => ({ ...p, isPlayer: true })),
        ...state.aiAgents.map(a => ({
          id: a.id,
          x: a.x,
          y: a.y,
          name: a.name,
          radius: a.currentRadius || 40,
          isAI: true,
          currentMessage: a.currentMessage,
          messageTime: a.messageTime,
          color: a.color,
          personality: a.personality.type
        }))
      ];

      // Warmth Calculation
      let accumulatedWarmthStrength = 0;
      let nearby = [];
      
      nearbyEntities.forEach(p => {
        const dist = Math.hypot(state.x - p.x, state.y - p.y);
        
        // Tethered Guest Detection
        if (p.tetherHost === user.uid && dist < 800) {
          if (!state.knownTetheredGuests.has(p.id)) {
            state.knownTetheredGuests.add(p.id);
            state.shockwaves.push(new Shockwave(state.x, state.y, 400));
            state.audio.playBloom();
            state.toastQueue.push("A tethered soul has arrived.");
          }
        }
        
        if (dist < MAX_CONNECTION_DIST) {
          nearby.push(p);
          
          // Track souls met
          if (!state.soulsMet.has(p.id)) {
            state.soulsMet.add(p.id);
            state.audio.playProximity(0.3, 440 + Math.random() * 200);
            vibrate([20]);
          }
          
          if (dist > CROWDING_DISTANCE) {
            let strength = 0;
            if (dist <= OPTIMAL_DISTANCE) {
              strength = (dist - CROWDING_DISTANCE) / (OPTIMAL_DISTANCE - CROWDING_DISTANCE);
            } else {
              strength = 1 - ((dist - OPTIMAL_DISTANCE) / (MAX_CONNECTION_DIST - OPTIMAL_DISTANCE));
            }
            accumulatedWarmthStrength += strength;
            
            if (!state.inEncounter && dist < 120) {
              state.inEncounter = true;
            }
          }
        }
      });

      setNearbyCount(nearby.length);

      // Bond System
      nearby.forEach(p => {
        const currentBond = state.bonds.get(p.id) || 0;
        const newBond = Math.min(1, currentBond + BOND_GROW_RATE);
        state.bonds.set(p.id, newBond);
        if (currentBond === 0 && newBond > 0) vibrate([20]);
      });

      state.bonds.forEach((strength, id) => {
        if (!nearby.find(p => p.id === id)) {
          const newStrength = Math.max(0, strength - BOND_DECAY_RATE);
          newStrength > 0 ? state.bonds.set(id, newStrength) : state.bonds.delete(id);
        }
      });

      // Constellation Bonus
      if (nearby.length >= 2) {
        state.constellationBonus = Math.min(30, state.constellationBonus + 0.5);
      } else {
        state.constellationBonus = Math.max(0, state.constellationBonus - 0.2);
      }

      // Achievements
      if (state.soulsMet.size >= 10 && !achievements.includes('social')) {
        unlockAchievement('social', 'Social Butterfly', 'Met 10 different souls');
      }
      if (nearby.length >= 3 && !achievements.includes('constellation')) {
        unlockAchievement('constellation', 'Constellation', 'Formed bonds with 3 souls');
      }

      // Beacon Warmth
      BEACONS.forEach(b => {
        const bState = state.beaconStates[b.id];
        if (bState.active) {
          const dist = Math.hypot(state.x - b.x, state.y - b.y);
          if (dist < 400) {
            accumulatedWarmthStrength += 1.5;
          }
        }
      });

      // Warmth Logic
      const isNearWarmth = accumulatedWarmthStrength > 0.1;
      if (isNearWarmth) {
        if (!state.wasNearWarmth) {
          state.warmthLinger = Math.max(state.warmthLinger, WARMTH_GRANT_FLOOR);
        }
        state.warmthLinger = Math.min(WARMTH_LINGER_FRAMES, state.warmthLinger + 5);
      } else if (state.warmthLinger > 0) {
        state.warmthLinger--;
      }
      state.wasNearWarmth = isNearWarmth;

      // Cold & Idle
      if (state.hasMoved && speed < 0.1) {
        state.coldTimer++;
        state.stationaryTimer++;
      } else {
        state.coldTimer = 0;
        state.stationaryTimer = 0;
        state.inEncounter = false;
      }

      if (state.stationaryTimer > IDLE_BREATH_THRESHOLD && state.stationaryTimer % 90 === 0) {
        state.ripples.push(new Ripple(state.x, state.y));
      }

      // Radius Logic
      const softCap = 1 - Math.exp(-0.5 * accumulatedWarmthStrength);
      const effectiveWarmth = isNearWarmth ? softCap : (state.warmthLinger > 0 ? 0.5 : 0);
      
      if (effectiveWarmth > 0) {
        const growth = Math.min(0.25, effectiveWarmth * 0.25);
        state.radius = Math.min(LIGHT_MAX_RADIUS, state.radius + growth);
      } else if (state.coldTimer > (COLD_ONSET_DELAY / 16)) {
        const floor = LIGHT_MAX_RADIUS * 0.2;
        state.radius = Math.max(floor, state.radius - 0.1);
      } else {
        state.radius = Math.max(LIGHT_MIN_RADIUS, state.radius - 0.05);
      }

      // Audio
      state.audio.updateMovementHum(speed);
      if (state.coldTimer > (COLD_ONSET_DELAY / 16)) {
        state.audio.setEnvironment('cold');
      } else {
        state.audio.setEnvironment('wind');
      }

      // Fragments
      if (Math.random() < FRAGMENT_SPAWN_RATE && speed > 0.2) {
        const angle = Math.random() * Math.PI * 2;
        const r = 300 + Math.random() * 300;
        state.localFragments.push({
          x: state.x + Math.cos(angle) * r,
          y: state.y + Math.sin(angle) * r,
          phase: Math.random() * Math.PI * 2
        });
      }
      if (state.localFragments.length > 250) {
        state.localFragments.splice(0, state.localFragments.length - 250);
      }

      state.localFragments = state.localFragments.filter(f => {
        const dist = Math.hypot(state.x - f.x, state.y - f.y);
        if (dist > 1500) return false;
        if (dist < FRAGMENT_COLLECT_RADIUS) {
          state.radius = Math.min(LIGHT_MAX_RADIUS, state.radius + 2);
          state.fragmentsCollected++;
          state.audio.playCollect();
          triggerScreenFlash('#FFD700', 0.4); // Gold flash on collect
          vibrate(30);
          for(let i=0; i<5; i++) state.particles.push(new Particle(f.x, f.y, 'spark'));
          
          if (state.fragmentsCollected >= 5 && !achievements.includes('collector')) {
            unlockAchievement('collector', 'Light Collector', 'Collected 5 light fragments');
          }
          return false;
        }
        return true;
      });

      // Trail particles
      if (Math.hypot(state.vx, state.vy) > 1 && time - lastTrailTime.current > 50) {
        state.particles.push(new Particle(state.x, state.y, 'trail'));
        lastTrailTime.current = time;
      }

      // Ambient particles
      if (Math.random() > 0.8) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * state.radius * 0.5;
        state.particles.push(new Particle(
          state.x + Math.cos(angle) * dist,
          state.y + Math.sin(angle) * dist,
          'dust'
        ));
      }

      // Storm particles
      if (state.coldTimer > 100 && Math.random() > 0.5) {
        state.particles.push(new Particle(
          state.x + (Math.random()-0.5)*width,
          state.y + (Math.random()-0.5)*height,
          'storm'
        ));
      }

      // ─────────────────────────────────────────────────────────────────────────
      // 2. RENDER PHASE
      // ─────────────────────────────────────────────────────────────────────────
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const offsetX = centerX - state.x;
      const offsetY = centerY - state.y;

      // Echoes
      state.echoes.forEach(e => {
        const ex = e.x + offsetX;
        const ey = e.y + offsetY;
        if (ex < -100 || ex > width+100 || ey < -100 || ey > height+100) return;
        
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(ex, ey, 5, ex, ey, 40);
        grad.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ex, ey, 40, 0, Math.PI*2);
        ctx.fill();
        
        // Show message if near
        if (Math.hypot(state.x - e.x, state.y - e.y) < 100) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.font = '11px sans-serif';
          ctx.fillStyle = 'rgba(167, 139, 250, 0.9)';
          ctx.textAlign = 'center';
          ctx.fillText(e.text, ex, ey - 50);
          ctx.font = '9px sans-serif';
          ctx.fillStyle = 'rgba(167, 139, 250, 0.5)';
          ctx.fillText(`- ${e.name}`, ex, ey - 35);
        }
      });

      // Fragments
      state.localFragments.forEach(f => {
        const fx = f.x + offsetX;
        const fy = f.y + offsetY;
        if (fx < -50 || fx > width+50 || fy < -50 || fy > height+50) return;
        
        const pulse = Math.sin((time / 500) + f.phase) * 5;
        // Updated colors for brightness
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(fx, fy, 1, fx, fy, 25 + pulse);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        grad.addColorStop(0.3, 'rgba(255, 215, 0, 0.6)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(fx, fy, 25 + pulse, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(fx, fy, 3, 0, Math.PI*2);
        ctx.fill();
      });

      // Beacons
      BEACONS.forEach(b => {
        const bx = b.x + offsetX;
        const by = b.y + offsetY;
        if (bx < -300 || bx > width + 300 || by < -300 || by > height + 300) return;
        
        const bState = state.beaconStates[b.id];
        const isActive = bState.active;
        const glowR = isActive ? 300 + Math.sin(time/500)*20 : 100 + (bState.charge);
        
        // Brighter Beacon Glow
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(bx, by, 10, bx, by, glowR);
        grad.addColorStop(0, isActive ? 'rgba(150, 220, 255, 0.8)' : 'rgba(150, 150, 150, 0.3)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, glowR, 0, Math.PI*2);
        ctx.fill();
        
        ctx.globalCompositeOperation = 'source-over';
        
        // Draw track for charge
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(bx, by, 40, 0, Math.PI*2);
        ctx.stroke();

        // Draw progress
        if (bState.charge > 0) {
          ctx.strokeStyle = isActive ? `rgba(150, 220, 255, 0.9)` : `rgba(100, 200, 255, ${bState.charge/100})`;
          ctx.lineWidth = isActive ? 6 : 4;
          ctx.beginPath();
          ctx.arc(bx, by, 40, -Math.PI/2, -Math.PI/2 + (Math.PI*2 * (bState.charge/100)));
          ctx.stroke();
        }
        
        ctx.fillStyle = isActive ? '#FFFFFF' : '#888888';
        ctx.beginPath();
        ctx.moveTo(bx, by - 40);
        ctx.lineTo(bx + 15, by + 20);
        ctx.lineTo(bx - 15, by + 20);
        ctx.fill();
      });

      // Constellation Lines
      if (nearby.length >= 2 && state.constellationBonus > 10) {
        ctx.globalCompositeOperation = 'screen';
        nearby.forEach(p => {
          const px = p.x + offsetX;
          const py = p.y + offsetY;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(px, py);
          ctx.strokeStyle = `rgba(255, 215, 100, ${state.constellationBonus / 80})`; // Brighter gold
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }

      // Tether Line
      if (state.tetherHostId && state.otherPlayers[state.tetherHostId]) {
        const host = state.otherPlayers[state.tetherHostId];
        const hx = host.x + offsetX;
        const hy = host.y + offsetY;
        
        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        const mx = (centerX + hx) / 2;
        const my = (centerY + hy) / 2 + 50;
        ctx.quadraticCurveTo(mx, my, hx, hy);
        
        const stress = Math.min(1, state.tetherStressTimer / TETHER_SNAP_TIME);
        ctx.strokeStyle = `rgba(255, ${215 * (1-stress)}, ${255 * stress}, ${0.5 + stress * 0.5})`;
        ctx.lineWidth = 1 + stress * 2;
        ctx.stroke();
      }

      // Entities (Players + AI)
      nearbyEntities.forEach(p => {
        const px = p.x + offsetX;
        const py = p.y + offsetY;
        if (px < -150 || px > width + 150 || py < -150 || py > height + 150) return;

        const dist = Math.hypot(state.x - p.x, state.y - p.y);
        
        // Bond lines
        if (dist < MAX_CONNECTION_DIST * 1.5) {
          const bondStrength = state.bonds.get(p.id) || 0;
          if (bondStrength > 0) {
            ctx.globalCompositeOperation = 'screen';
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(px, py);
            const gradient = ctx.createLinearGradient(centerX, centerY, px, py);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${bondStrength})`);
            gradient.addColorStop(1, `rgba(255, 200, 100, ${bondStrength * 0.5})`);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1 + bondStrength * 3;
            ctx.stroke();
          }
        }

        // Entity glow - Enhanced Brightness
        const r = p.radius || 60;
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(px, py, 2, px, py, Math.max(0, r));
        const colorRgb = p.color ? hexToRgb(p.color) : { r: 255, g: 200, b: 100 };
        // Brighter core
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.4, `rgba(${colorRgb.r}, ${colorRgb.g}, ${colorRgb.b}, 0.6)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI*2);
        ctx.fill();

        // Chat Bubble
        if (p.currentMessage) {
          const bubbleY = py - r - 20;
          const msgAge = Date.now() - (p.messageTime || 0);
          const msgAlpha = Math.min(1, (CHAT_BUBBLE_DURATION - msgAge) / 1000);
          
          if (msgAlpha > 0) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.font = '12px sans-serif';
            const textWidth = ctx.measureText(p.currentMessage).width;
            ctx.fillStyle = `rgba(10, 10, 10, ${msgAlpha * 0.8})`;
            drawRoundedRect(ctx, px - textWidth / 2 - 8, bubbleY - 10, textWidth + 16, 20, 10);
            ctx.fill();
            ctx.fillStyle = `rgba(255, 255, 255, ${msgAlpha})`;
            ctx.textAlign = 'center';
            ctx.fillText(p.currentMessage, px, bubbleY + 4);
          }
        }
      });

      // Player (Self) - Enhanced Brightness
      const selfPulse = Math.sin(time / 1000) * 2;
      const selfGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, state.radius + selfPulse);
      selfGrad.addColorStop(0, '#FFFFFF'); // Pure white center
      selfGrad.addColorStop(0.15, '#FFD700'); // Gold mid
      selfGrad.addColorStop(0.5, 'rgba(255, 140, 0, 0.5)'); // Brighter outer
      selfGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = selfGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, state.radius + selfPulse, 0, Math.PI*2);
      ctx.fill();

      // Player Chat Bubbles
      ctx.globalCompositeOperation = 'source-over';
      state.myMessages = state.myMessages.filter(m => Date.now() - m.time < CHAT_BUBBLE_DURATION);
      state.myMessages.forEach((msg, i) => {
        const age = Date.now() - msg.time;
        const alpha = Math.min(1, (CHAT_BUBBLE_DURATION - age) / 1000);
        const yOffset = -state.radius - 30 - i * 25;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillText(msg.text, centerX, centerY + yOffset);
      });

      // Ripples
      state.ripples.forEach((r, i) => {
        r.update();
        if (r.life <= 0) {
          state.ripples.splice(i, 1);
          return;
        }
        const rx = r.x + offsetX;
        const ry = r.y + offsetY;
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = `rgba(255, 215, 0, ${r.life * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rx, ry, r.radius, 0, Math.PI*2);
        ctx.stroke();
      });

      // Shockwaves
      state.shockwaves.forEach((w, i) => {
        w.update();
        if (w.alpha <= 0) {
          state.shockwaves.splice(i, 1);
          return;
        }
        const wx = w.x + offsetX;
        const wy = w.y + offsetY;
        
        ctx.globalCompositeOperation = 'screen';
        const waveGrad = ctx.createRadialGradient(wx, wy, Math.max(0, w.radius - 80), wx, wy, w.radius);
        waveGrad.addColorStop(0, 'rgba(0,0,0,0)');
        waveGrad.addColorStop(0.5, `rgba(253, 186, 19, ${w.alpha})`);
        waveGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = waveGrad;
        ctx.beginPath();
        ctx.arc(wx, wy, w.radius, 0, Math.PI*2);
        ctx.fill();
      });

      // Particles
      state.particles.forEach((p, i) => {
        p.update();
        if (p.life <= 0) {
          state.particles.splice(i, 1);
          return;
        }
        const px = p.x + offsetX;
        const py = p.y + offsetY;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life; // Removed 0.8 cap for brightness
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // Vignette / Cold Effect
      ctx.globalCompositeOperation = 'source-over';
      if (state.coldTimer > (COLD_ONSET_DELAY / 16)) {
        const coldRatio = Math.min(1, (state.coldTimer - (COLD_ONSET_DELAY / 16)) / 200);
        const vig = ctx.createRadialGradient(centerX, centerY, height/3, centerX, centerY, height);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, `rgba(10, 20, 30, ${coldRatio * 0.9})`);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, width, height);
      }
      
      // Screen Flash Effect
      if (state.screenFlash.intensity > 0) {
        // Decay and clamp intensity
        state.screenFlash.intensity = Math.max(0, state.screenFlash.intensity - state.screenFlash.decay);
        const { color, intensity } = state.screenFlash;
        
        if (intensity > 0) {
            const flashGrad = ctx.createRadialGradient(centerX, centerY, height/2, centerX, centerY, height);
            flashGrad.addColorStop(0, 'rgba(0,0,0,0)');
            
            // Safe hex conversion ensuring 0-255 range
            const alphaVal = Math.min(255, Math.max(0, Math.floor(intensity * 255)));
            const alphaHex = alphaVal.toString(16).padStart(2, '0');
            
            try {
                flashGrad.addColorStop(1, `${color}${alphaHex}`);
                ctx.fillStyle = flashGrad;
                ctx.fillRect(0, 0, width, height);
            } catch (e) {
                // Prevent crash on invalid color
            }
        }
      }

      animationId = requestAnimationFrame(loop);
    };

    const resize = () => {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();
    animationId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [user, isStarted, achievements]);

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-pointer touch-none"
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleEnd}
      />

      {!isStarted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-4 animate-pulse">
            <Sun className="w-16 h-16 mx-auto text-amber-400" />
            <p className="text-white/80 text-lg">Touch to exist</p>
          </div>
        </div>
      )}

      {isStarted && (
        <>
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-white/90 text-sm font-light">{gameState.current.name}</div>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {AI_COUNT + Object.keys(gameState.current.otherPlayers).length}
                  </span>
                  {nearbyCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Heart className="w-3 h-3" />
                      {nearbyCount} near
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {totalSoulsMet} met
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all backdrop-blur-sm"
                >
                  <MessageCircle className="w-4 h-4 text-white/70" />
                </button>
              </div>
            </div>
          </div>

          {/* Light Bar */}
          <div className="absolute top-20 right-4 h-32 w-8 pointer-events-none">
            <div className="relative h-full w-full bg-black/30 rounded-full border border-white/10 overflow-hidden backdrop-blur-sm">
              <div
                className="absolute bottom-0 w-full bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 transition-all duration-300"
                style={{ height: `${lightLevel}%` }}
              />
              <Sun className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            </div>
          </div>

          {/* Weather Indicator */}
          {weatherType === 'storm' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-500/20 pointer-events-none">
              <Wind className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-300">Dark Storm</span>
            </div>
          )}

          {/* Achievement Popup */}
          {showAchievement && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500/90 to-yellow-600/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-amber-300/30 shadow-2xl animate-bounce pointer-events-none">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-white" />
                <div>
                  <div className="font-semibold text-white text-sm">{showAchievement.title}</div>
                  <div className="text-xs text-white/80">{showAchievement.description}</div>
                </div>
              </div>
            </div>
          )}

          {/* Toast Messages */}
          {tetherMsg && (
            <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white/90 text-sm pointer-events-none">
              {tetherMsg}
            </div>
          )}

          {/* Selected Entity Card */}
          {selectedEntity && (
            <div className="absolute top-40 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-4 min-w-[200px] shadow-2xl pointer-events-auto">
              <button
                onClick={() => setSelectedEntity(null)}
                className="absolute top-2 right-2 text-white/40 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="text-center space-y-2">
                <div className="text-white/90 font-medium">{selectedEntity.name || 'Unknown Soul'}</div>
                <div className="text-xs text-white/40 capitalize">
                  {selectedEntity.isAI ? `Spirit · ${selectedEntity.personality}` : 'Wanderer'}
                </div>
                {selectedEntity.color && (
                  <div className="flex justify-center">
                    <div
                      className="w-8 h-8 rounded-full border border-white/20"
                      style={{ backgroundColor: selectedEntity.color }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-0 right-0 px-4 flex justify-between items-end pointer-events-none">
            {/* Left Controls */}
            <div className="flex gap-2 pointer-events-auto">
                <button
                onClick={handleBeckon}
                className="bg-purple-500/20 hover:bg-purple-500/30 backdrop-blur-sm border border-purple-400/30 text-purple-200 px-4 py-2 rounded-full text-sm flex items-center gap-2 active:scale-95 transition-all"
                >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Beckon</span>
                </button>
                
                <button
                onClick={handlePlaceEcho}
                className="bg-indigo-500/20 hover:bg-indigo-500/30 backdrop-blur-sm border border-indigo-400/30 text-indigo-200 px-4 py-2 rounded-full text-sm flex items-center gap-2 active:scale-95 transition-all"
                >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Echo</span>
                </button>
            </div>

            {/* Spark Button (Right) */}
            <button
                onClick={handleSpark}
                className="pointer-events-auto w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_0_20px_rgba(251,191,36,0.4)] flex items-center justify-center text-white active:scale-90 transition-transform hover:scale-105"
            >
                <Zap className="w-6 h-6 animate-pulse" />
            </button>
          </div>

          {/* Chat Overlay */}
          {showChat && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col pointer-events-auto">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-white/90 font-light">Echoes</h2>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center text-white/30 text-sm py-8">
                    Silence...
                  </div>
                )}
                {chatMessages.map(m => (
                  <div key={m.id} className="space-y-1">
                    <div className="text-xs text-white/40">
                      {m.name || m.uid === user?.uid ? 'You' : 'Someone'}
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white/80 text-sm">
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={sendChat} className="p-4 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="whisper into the void..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white/90 text-sm placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
                <button
                  type="submit"
                  className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center hover:bg-amber-500/30 active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4 text-amber-200" />
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}