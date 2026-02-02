import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, MicOff, MessageCircle, X, Send, Sun, Heart, Sparkles, Wind, MapPin, Users, Zap } from 'lucide-react';

// === CONSTANTS ===
const WORLD_SIZE = 6000;
const LIGHT_DECAY_RATE = 0.05;
const LIGHT_REGEN_RATE = 0.8;
const MIN_RADIUS = 30;
const MAX_RADIUS = 180;
const STORM_DECAY_MULTIPLIER = 2.5;
const AI_COUNT = 20;
const CHAT_BUBBLE_DURATION = 8000;
const CONNECTION_DISTANCE = 300;
const BOND_GROW_RATE = 0.002;
const BOND_DECAY_RATE = 0.0005;

// === UTILITIES ===
const getRandomName = () => {
  const adjs = ['Wandering', 'Glowing', 'Silent', 'Seeking', 'Pale', 'Shimmering', 
    'Eternal', 'Lost', 'Lonely', 'Bright', 'Dreaming', 'Drifting', 'Golden', 
    'Radiant', 'Whispering', 'Dancing', 'Floating', 'Ancient', 'Gentle', 'Kind'];
  const nouns = ['Sun', 'Flame', 'Spark', 'Light', 'Ray', 'Guardian', 'Hope', 
    'Dream', 'Spirit', 'Star', 'Ember', 'Wanderer', 'Soul', 'Beacon', 'Phoenix',
    'Wisp', 'Echo', 'Memory', 'Dawn', 'Twilight'];
  return `${adjs[Math.floor(Math.random() * adjs.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
};

const vibrate = (pattern) => {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
};

// === AUDIO SYSTEM ===
let audioContext = null;
const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

const playProximityTone = (intensity = 0.5, pitch = 440) => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = pitch;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(intensity * 0.1, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) { }
};

const playWaveSound = () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    [600, 800, 1200].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const delay = i * 0.04;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + delay + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.25);
    });
  } catch (e) { }
};

const playChime = () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const delay = i * 0.1;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 1.1);
    });
  } catch (e) { }
};

// === AI PERSONALITIES ===
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

// === AI AGENT CLASS ===
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
    this.radius = MIN_RADIUS + Math.random() * 40;
    this.phase = Math.random() * Math.PI * 2;
    this.isPaused = false;
    this.pauseTimer = 0;
    this.lastMessage = '';
    this.messageTimer = 0;
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

    if (this.x < 50) { this.vx += 0.1; this.targetX = 500; }
    if (this.x > WORLD_SIZE - 50) { this.vx -= 0.1; this.targetX = WORLD_SIZE - 500; }
    if (this.y < 50) { this.vy += 0.1; this.targetY = 500; }
    if (this.y > WORLD_SIZE - 50) { this.vy -= 0.1; this.targetY = WORLD_SIZE - 500; }

    this.phase += 0.04;
    this.currentRadius = this.radius + Math.sin(this.phase) * 4;
  }
}

// === PARTICLE SYSTEM ===
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
        this.color = '#FDB813';
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
        this.color = '#64748b';
        break;
      case 'wave':
        const waveAngle = Math.random() * Math.PI * 2;
        const waveSpeed = 2 + Math.random() * 6;
        this.vx = Math.cos(waveAngle) * waveSpeed;
        this.vy = Math.sin(waveAngle) * waveSpeed;
        this.decay = 0.015;
        this.size = 2 + Math.random() * 3;
        this.color = '#FFF';
        break;
      default:
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

// === MAIN COMPONENT ===
export default function LuminousSouls() {
  const [messages, setMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isMicOn, setIsMicOn] = useState(false);
  const [beacons, setBeacons] = useState({});
  const [lightFragments, setLightFragments] = useState({});
  const [memoryEchoes, setMemoryEchoes] = useState({});
  const [weatherState, setWeatherState] = useState({ type: 'calm', intensity: 0 });
  const [lightPercentage, setLightPercentage] = useState(100);
  const [achievements, setAchievements] = useState([]);
  const [showAchievement, setShowAchievement] = useState(null);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [selectedSoul, setSelectedSoul] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSoulsMetCount, setTotalSoulsMetCount] = useState(0);

  const canvasRef = useRef(null);
  const requestRef = useRef();
  const lastTrailTime = useRef(0);
  const lastTapTime = useRef(0);
  const aiAgents = useRef([]);
  const gameState = useRef({
    x: 3000,
    y: 3000,
    vx: 0,
    vy: 0,
    radius: MAX_RADIUS,
    name: getRandomName(),
    particles: [],
    shockwaves: [],
    collectedFragments: new Set(),
    constellationBonus: 0,
    myMessages: [],
    bonds: new Map(),
    soulsMet: new Set(),
    fragmentsCollected: 0,
    beaconsLit: 0,
  });

  const touchTarget = useRef({ active: false, targetX: 0, targetY: 0 });

  const BEACON_LOCATIONS = useMemo(() => [
    { id: 'b1', x: 1500, y: 1500, type: 'wisdom', icon: '🔮' },
    { id: 'b2', x: 4500, y: 1500, type: 'hope', icon: '✨' },
    { id: 'b3', x: 1500, y: 4500, type: 'courage', icon: '⚡' },
    { id: 'b4', x: 4500, y: 4500, type: 'unity', icon: '💫' },
    { id: 'b5', x: 3000, y: 3000, type: 'sanctuary', icon: '🌟' },
  ], []);

  // === STORAGE HELPERS ===
  const saveProgress = async () => {
    if (!window.storage) return;
    try {
      const progress = {
        name: gameState.current.name,
        achievements: achievements,
        beaconsLit: gameState.current.beaconsLit,
        fragmentsCollected: gameState.current.fragmentsCollected,
        soulsMet: gameState.current.soulsMet.size,
        lightLevel: gameState.current.radius,
      };
      await window.storage.set('player-progress', JSON.stringify(progress));
    } catch (e) {
      console.log('Storage not available');
    }
  };

  const loadProgress = async () => {
    if (!window.storage) return;
    try {
      const result = await window.storage.get('player-progress');
      if (result && result.value) {
        const progress = JSON.parse(result.value);
        gameState.current.name = progress.name || getRandomName();
        setAchievements(progress.achievements || []);
        gameState.current.beaconsLit = progress.beaconsLit || 0;
        gameState.current.fragmentsCollected = progress.fragmentsCollected || 0;
        setTotalSoulsMetCount(progress.soulsMet || 0);
      }
    } catch (e) {
      console.log('Could not load progress');
    }
  };

  const loadBeacons = async () => {
    if (!window.storage) return;
    try {
      const result = await window.storage.get('beacons-state', true);
      if (result && result.value) {
        setBeacons(JSON.parse(result.value));
      }
    } catch (e) {
      console.log('No shared beacons');
    }
  };

  const saveBeacons = async (beaconsData) => {
    if (!window.storage) return;
    try {
      await window.storage.set('beacons-state', JSON.stringify(beaconsData), true);
    } catch (e) {
      console.log('Could not save beacons');
    }
  };

  const loadEchoes = async () => {
    if (!window.storage) return;
    try {
      const result = await window.storage.get('memory-echoes', true);
      if (result && result.value) {
        setMemoryEchoes(JSON.parse(result.value));
      }
    } catch (e) {
      console.log('No shared echoes');
    }
  };

  const saveEchoes = async (echoesData) => {
    if (!window.storage) return;
    try {
      await window.storage.set('memory-echoes', JSON.stringify(echoesData), true);
    } catch (e) {
      console.log('Could not save echoes');
    }
  };

  // === ACHIEVEMENT SYSTEM ===
  const unlockAchievement = (id, title, description) => {
    if (!achievements.includes(id)) {
      setAchievements(prev => [...prev, id]);
      setShowAchievement({ title, description });
      vibrate([50, 50]);
      playChime();
      setTimeout(() => setShowAchievement(null), 4000);
    }
  };

  // === INITIALIZATION ===
  useEffect(() => {
    const init = async () => {
      await loadProgress();
      await loadBeacons();
      await loadEchoes();
      
      const agents = [];
      for (let i = 0; i < AI_COUNT; i++) {
        agents.push(new AIAgent(`ai_${i}`));
      }
      aiAgents.current = agents;
      
      setIsLoading(false);
    };
    init();

    // Auto-save every 10 seconds
    const saveInterval = setInterval(saveProgress, 10000);

    // Weather changes
    const weatherInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setWeatherState({ type: 'storm', intensity: Math.random() });
        setTimeout(() => setWeatherState({ type: 'calm', intensity: 0 }), 15000);
      }
    }, 45000);

    // Spawn light fragments
    const fragmentInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        const fragId = `frag_${Date.now()}_${Math.random()}`;
        setLightFragments(prev => ({
          ...prev,
          [fragId]: {
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            value: 10 + Math.floor(Math.random() * 20),
            createdAt: Date.now()
          }
        }));
      }
    }, 12000);

    return () => {
      clearInterval(saveInterval);
      clearInterval(weatherInterval);
      clearInterval(fragmentInterval);
    };
  }, []);

  const placeMemoryEcho = async () => {
    const text = prompt("Leave a message for other souls:");
    if (!text) return;
    vibrate(50);

    const echoId = `echo_${Date.now()}`;
    const newEchoes = {
      ...memoryEchoes,
      [echoId]: {
        x: gameState.current.x,
        y: gameState.current.y,
        text,
        creatorName: gameState.current.name,
        createdAt: Date.now()
      }
    };
    
    setMemoryEchoes(newEchoes);
    await saveEchoes(newEchoes);
    
    unlockAchievement('echo', 'Echo Maker', 'Left a message for others');
  };

  // === ANIMATION LOOP ===
  const animate = (time) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const state = gameState.current;

    // AI Update
    const allEntitiesForAI = [
      { id: 'player', x: state.x, y: state.y },
      ...aiAgents.current.map(a => ({ id: a.id, x: a.x, y: a.y }))
    ];
    aiAgents.current.forEach(agent => agent.update(allEntitiesForAI, BEACON_LOCATIONS, state.x, state.y));

    // Movement
    if (touchTarget.current.active) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const dx = (touchTarget.current.targetX - centerX + state.x) - state.x;
      const dy = (touchTarget.current.targetY - centerY + state.y) - state.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 5) {
        const angle = Math.atan2(dy, dx);
        const strength = Math.min(dist / 100, 1);
        state.vx += Math.cos(angle) * 0.5 * strength;
        state.vy += Math.sin(angle) * 0.5 * strength;
      }
    }
    state.vx *= 0.90;
    state.vy *= 0.90;
    state.x = Math.max(0, Math.min(state.x + state.vx, WORLD_SIZE));
    state.y = Math.max(0, Math.min(state.y + state.vy, WORLD_SIZE));

    if (Math.hypot(state.vx, state.vy) > 1 && time - lastTrailTime.current > 50) {
      state.particles.push(new Particle(state.x, state.y, 'trail'));
      lastTrailTime.current = time;
    }

    // Nearby entities
    const allEntities = aiAgents.current.map(a => ({ 
      id: a.id, 
      x: a.x, 
      y: a.y, 
      name: a.name, 
      radius: a.currentRadius || 40, 
      isAI: true, 
      currentMessage: a.currentMessage, 
      messageTime: a.messageTime,
      color: a.color
    }));

    let nearbyOthers = [];
    allEntities.forEach(p => {
      const dist = Math.hypot(state.x - p.x, state.y - p.y);
      if (dist < CONNECTION_DISTANCE) {
        nearbyOthers.push(p);
        if (!state.soulsMet.has(p.id)) {
          state.soulsMet.add(p.id);
          playProximityTone(0.3, 440 + Math.random() * 200);
        }
      }
    });
    setNearbyCount(nearbyOthers.length);

    // Check total souls met achievement
    if (state.soulsMet.size >= 10 && !achievements.includes('social')) {
      unlockAchievement('social', 'Social Butterfly', 'Met 10 different souls');
    }

    // Bonds
    nearbyOthers.forEach(p => {
      const currentBond = state.bonds.get(p.id) || 0;
      const newBond = Math.min(1, currentBond + BOND_GROW_RATE);
      state.bonds.set(p.id, newBond);
      if (currentBond === 0 && newBond > 0) vibrate([20]);
    });
    state.bonds.forEach((strength, id) => {
      if (!nearbyOthers.find(p => p.id === id)) {
        const newStrength = Math.max(0, strength - BOND_DECAY_RATE);
        newStrength > 0 ? state.bonds.set(id, newStrength) : state.bonds.delete(id);
      }
    });

    if (nearbyOthers.length >= 2) {
      state.constellationBonus = Math.min(30, state.constellationBonus + 0.5);
      if (nearbyOthers.length >= 3 && !achievements.includes('constellation')) {
        unlockAchievement('constellation', 'Constellation', 'Formed bonds with 3 souls');
      }
    } else {
      state.constellationBonus = Math.max(0, state.constellationBonus - 0.2);
    }

    // Weather & Light
    if (weatherState.type === 'storm' && Math.random() > 0.95) {
      state.particles.push(new Particle(
        state.x + (Math.random() - 0.5) * 400, 
        state.y + (Math.random() - 0.5) * 400, 
        'storm'
      ));
    }
    const weatherMultiplier = weatherState.type === 'storm' ? STORM_DECAY_MULTIPLIER : 1;
    const totalRegen = (nearbyOthers.length > 0 ? LIGHT_REGEN_RATE * (1 + nearbyOthers.length * 0.3) : 0);
    const totalDecay = LIGHT_DECAY_RATE * weatherMultiplier;
    state.radius = totalRegen > totalDecay 
      ? Math.min(MAX_RADIUS, state.radius + (totalRegen - totalDecay)) 
      : Math.max(MIN_RADIUS, state.radius - totalDecay);
    setLightPercentage(Math.floor(((state.radius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * 100));

    // Fragments
    Object.entries(lightFragments).forEach(([id, frag]) => {
      if (Math.hypot(state.x - frag.x, state.y - frag.y) < state.radius && !state.collectedFragments.has(id)) {
        state.collectedFragments.add(id);
        state.fragmentsCollected++;
        state.radius = Math.min(MAX_RADIUS, state.radius + frag.value);
        vibrate(30);
        for (let i = 0; i < 20; i++) state.particles.push(new Particle(frag.x, frag.y, 'spark'));
        
        setLightFragments(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });

        if (state.fragmentsCollected >= 5 && !achievements.includes('collector')) {
          unlockAchievement('collector', 'Light Collector', 'Collected 5 light fragments');
        }
      }
    });

    // Beacons
    BEACON_LOCATIONS.forEach(loc => {
      const bData = beacons[loc.id] || { progress: 0, active: false };
      if (!bData.active && Math.hypot(state.x - loc.x, state.y - loc.y) < 150 && Math.random() < 0.03) {
        const newProgress = Math.min(100, (bData.progress || 0) + 1 + nearbyOthers.length * 3);
        const willActivate = newProgress >= 100;
        
        const newBeacons = {
          ...beacons,
          [loc.id]: {
            progress: newProgress,
            active: willActivate,
            x: loc.x,
            y: loc.y,
            type: loc.type,
            activatedAt: willActivate ? Date.now() : null
          }
        };
        
        setBeacons(newBeacons);
        saveBeacons(newBeacons);
        
        if (willActivate) {
          state.shockwaves.push({ x: loc.x, y: loc.y, radius: 10, maxRadius: 2500, alpha: 1 });
          state.beaconsLit++;
          vibrate([100, 50, 100]);
          playChime();
          unlockAchievement('beacon', 'Illuminator', 'You lit a beacon');
          
          if (state.beaconsLit >= 5) {
            unlockAchievement('master', 'Master of Light', 'Lit all 5 beacons');
          }
        }
      }
    });

    // === RENDER ===
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const offsetX = centerX - state.x;
    const offsetY = centerY - state.y;

    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'screen';

    // Memory Echoes
    Object.entries(memoryEchoes).forEach(([id, echo]) => {
      const ex = echo.x + offsetX;
      const ey = echo.y + offsetY;
      if (ex < -200 || ex > canvas.width + 200) return;
      const grad = ctx.createRadialGradient(ex, ey, 5, ex, ey, 40);
      grad.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ex, ey, 40, 0, Math.PI * 2);
      ctx.fill();

      // Show message if near
      if (Math.hypot(state.x - echo.x, state.y - echo.y) < 100) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = '11px sans-serif';
        ctx.fillStyle = 'rgba(167, 139, 250, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(echo.text, ex, ey - 50);
        ctx.font = '9px sans-serif';
        ctx.fillStyle = 'rgba(167, 139, 250, 0.5)';
        ctx.fillText(`- ${echo.creatorName}`, ex, ey - 35);
        ctx.globalCompositeOperation = 'screen';
      }
    });

    // Fragments
    Object.entries(lightFragments).forEach(([id, frag]) => {
      if (state.collectedFragments.has(id)) return;
      const fx = frag.x + offsetX;
      const fy = frag.y + offsetY;
      if (fx < -100 || fx > canvas.width + 100) return;
      const pulse = Math.sin(time * 0.003) * 0.3 + 0.7;
      const grad = ctx.createRadialGradient(fx, fy, 2, fx, fy, 30);
      grad.addColorStop(0, `rgba(252, 211, 77, ${pulse})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx, fy, 30, 0, Math.PI * 2);
      ctx.fill();
    });

    // Beacons
    BEACON_LOCATIONS.forEach(loc => {
      const bData = beacons[loc.id] || { progress: 0, active: false };
      const bx = loc.x + offsetX;
      const by = loc.y + offsetY;
      if (bx < -500 || bx > canvas.width + 500) return;
      const glowSize = bData.active ? 500 : 120 + (bData.progress || 0) * 2;
      const grad = ctx.createRadialGradient(bx, by, 10, bx, by, glowSize);
      grad.addColorStop(0, bData.active 
        ? `rgba(96, 165, 250, ${Math.sin(time * 0.002) * 0.2 + 0.8})` 
        : 'rgba(100, 116, 139, 0.5)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, glowSize, 0, Math.PI * 2);
      ctx.fill();
    });

    // Constellation lines
    if (nearbyOthers.length >= 2 && state.constellationBonus > 10) {
      ctx.globalCompositeOperation = 'source-over';
      nearbyOthers.forEach(p => {
        const px = p.x + offsetX;
        const py = p.y + offsetY;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(px, py);
        ctx.strokeStyle = `rgba(255, 215, 0, ${state.constellationBonus / 100})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      ctx.globalCompositeOperation = 'screen';
    }

    // Entities
    allEntities.forEach(p => {
      const px = p.x + offsetX;
      const py = p.y + offsetY;
      if (px < -400 || px > canvas.width + 400) return;

      // Bond lines
      const distToMe = Math.hypot(state.x - p.x, state.y - p.y);
      if (distToMe < CONNECTION_DISTANCE * 1.5) {
        const bondStrength = state.bonds.get(p.id) || 0;
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(px, py);
        const gradient = ctx.createLinearGradient(centerX, centerY, px, py);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${bondStrength})`);
        gradient.addColorStop(1, `rgba(255, 200, 100, ${bondStrength * 0.5})`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1 + bondStrength * 3;
        ctx.stroke();
        ctx.globalCompositeOperation = 'screen';
      }

      // Entity Body with personality color
      const r = p.radius || MIN_RADIUS;
      const grad = ctx.createRadialGradient(px, py, 2, px, py, Math.max(0, r));
      const colorRgb = hexToRgb(p.color || '#fbbf24');
      grad.addColorStop(0, `rgba(255, 255, 200, 0.9)`);
      grad.addColorStop(0.5, `rgba(${colorRgb.r}, ${colorRgb.g}, ${colorRgb.b}, 0.4)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
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
          ctx.fillStyle = `rgba(20, 20, 20, ${msgAlpha * 0.8})`;
          ctx.beginPath();
          ctx.roundRect(px - textWidth / 2 - 8, bubbleY - 10, textWidth + 16, 20, 10);
          ctx.fill();
          ctx.fillStyle = `rgba(255, 255, 255, ${msgAlpha})`;
          ctx.textAlign = 'center';
          ctx.fillText(p.currentMessage, px, bubbleY + 4);
          ctx.globalCompositeOperation = 'screen';
        }
      }
    });

    // PLAYER
    const myGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, Math.max(0, state.radius));
    myGrad.addColorStop(0, '#FFFFFF');
    myGrad.addColorStop(0.2, '#FDB813');
    myGrad.addColorStop(0.5, 'rgba(255, 140, 0, 0.4)');
    myGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = myGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, state.radius, 0, Math.PI * 2);
    ctx.fill();

    // Player Chat Bubbles
    state.myMessages = state.myMessages.filter(m => Date.now() - m.time < CHAT_BUBBLE_DURATION);
    state.myMessages.forEach((msg, i) => {
      const age = Date.now() - msg.time;
      const alpha = Math.min(1, (CHAT_BUBBLE_DURATION - age) / 1000);
      const yOffset = -state.radius - 30 - i * 30;
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillText(msg.text, centerX, centerY + yOffset);
      ctx.globalCompositeOperation = 'screen';
    });

    // Particles
    if (Math.random() > 0.8) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * state.radius * 0.5;
      state.particles.push(new Particle(
        state.x + Math.cos(angle) * dist, 
        state.y + Math.sin(angle) * dist, 
        'dust'
      ));
    }
    state.particles.forEach((p, i) => {
      p.update();
      if (p.life <= 0) { state.particles.splice(i, 1); return; }
      const px = p.x + offsetX;
      const py = p.y + offsetY;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life * 0.8;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Shockwaves
    state.shockwaves.forEach((w, i) => {
      w.radius += 20;
      w.alpha -= 0.008;
      if (w.alpha <= 0) { state.shockwaves.splice(i, 1); return; }
      const wx = w.x + offsetX;
      const wy = w.y + offsetY;
      const waveGrad = ctx.createRadialGradient(wx, wy, Math.max(0, w.radius - 80), wx, wy, w.radius);
      waveGrad.addColorStop(0, 'rgba(0,0,0,0)');
      waveGrad.addColorStop(0.5, `rgba(253, 186, 19, ${w.alpha})`);
      waveGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = waveGrad;
      ctx.beginPath();
      ctx.arc(wx, wy, w.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Vignette
    ctx.globalCompositeOperation = 'source-over';
    const vignette = ctx.createRadialGradient(centerX, centerY, canvas.height / 3, centerX, centerY, canvas.height);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (!isLoading) {
      requestRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(requestRef.current);
    }
  }, [isLoading, beacons, lightFragments, weatherState]);

  const sendSpark = () => {
    vibrate([40]);
    playWaveSound();
    for (let i = 0; i < 40; i++) {
      gameState.current.particles.push(new Particle(gameState.current.x, gameState.current.y, 'wave'));
    }
    gameState.current.shockwaves.push({ 
      x: gameState.current.x, 
      y: gameState.current.y, 
      radius: 10, 
      maxRadius: 300, 
      alpha: 0.8 
    });
  };

  const handleCanvasInteraction = (clientX, clientY, isDoubleTap = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const state = gameState.current;
    const offsetX = canvas.width / 2 - state.x;
    const offsetY = canvas.height / 2 - state.y;
    const worldX = screenX - offsetX;
    const worldY = screenY - offsetY;

    const allSouls = aiAgents.current.map(a => ({ 
      id: a.id, 
      x: a.x, 
      y: a.y, 
      name: a.name, 
      radius: a.currentRadius || 40, 
      isAI: true,
      personality: a.personality.type,
      color: a.color
    }));

    let tappedSoul = null;
    for (const soul of allSouls) {
      if (Math.hypot(worldX - soul.x, worldY - soul.y) < (soul.radius || 50) + 25) {
        tappedSoul = soul;
        break;
      }
    }

    if (tappedSoul) {
      setSelectedSoul(tappedSoul);
      vibrate(20);
      touchTarget.current.active = true;
      touchTarget.current.targetX = screenX;
      touchTarget.current.targetY = screenY;
    } else if (isDoubleTap) {
      sendSpark();
    } else {
      setSelectedSoul(null);
    }
  };

  const handleInput = (type, x, y) => {
    if (type === 'start') {
      const now = Date.now();
      const isDoubleTap = now - lastTapTime.current < 300;
      lastTapTime.current = now;

      if (isDoubleTap) {
        handleCanvasInteraction(x, y, true);
      } else {
        touchTarget.current.active = true;
        touchTarget.current.targetX = x;
        touchTarget.current.targetY = y;
        handleCanvasInteraction(x, y, false);
      }
    } else if (type === 'move' && touchTarget.current.active) {
      touchTarget.current.targetX = x;
      touchTarget.current.targetY = y;
    } else if (type === 'end') {
      touchTarget.current.active = false;
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const msg = inputText.trim();
    setInputText("");
    vibrate(20);
    gameState.current.myMessages.push({ text: msg, time: Date.now() });
    
    const newMessage = {
      id: `msg_${Date.now()}`,
      text: msg,
      senderName: gameState.current.name,
      x: gameState.current.x,
      y: gameState.current.y,
      createdAt: Date.now()
    };
    setMessages(prev => [...prev, newMessage].slice(-50));
  };

  // Helper function
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 191, b: 36 };
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-black text-amber-500 flex items-center justify-center animate-pulse tracking-[0.5em] text-xs">
        AWAKENING...
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none font-sans text-white">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 touch-none"
        onTouchStart={e => handleInput('start', e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={e => handleInput('move', e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={() => handleInput('end')}
        onMouseDown={e => handleInput('start', e.clientX, e.clientY)}
        onMouseMove={e => handleInput('move', e.clientX, e.clientY)}
        onMouseUp={() => handleInput('end')}
      />

      {/* Top Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
        <div className="flex flex-col items-start gap-1">
          <span className="text-[10px] text-amber-200/50 uppercase tracking-widest border-l border-amber-500/50 pl-2">
            {gameState.current.name}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40">{AI_COUNT} souls</span>
            {nearbyCount > 0 && <span className="text-[10px] text-amber-400 font-bold">{nearbyCount} near</span>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Users size={10} className="text-purple-400/60" />
            <span className="text-[9px] text-purple-300/60">{totalSoulsMetCount + gameState.current.soulsMet.size} met</span>
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={placeMemoryEcho}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
            title="Leave Memory"
          >
            <MapPin size={14} className="text-purple-300" />
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
            title="Messages"
          >
            <MessageCircle size={14} className="text-amber-100" />
          </button>
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
              isMicOn ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'border-white/10 text-white/40'
            }`}
          >
            {isMicOn ? <Mic size={14} /> : <MicOff size={14} />}
          </button>
        </div>
      </div>

      {/* Light Meter */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 h-32 w-1 bg-white/10 rounded-full overflow-hidden pointer-events-none z-10">
        <div
          className={`absolute bottom-0 w-full transition-all duration-700 ${
            lightPercentage < 30 ? 'bg-red-500' : 'bg-amber-400'
          }`}
          style={{ height: `${lightPercentage}%` }}
        />
      </div>

      {/* Weather */}
      {weatherState.type === 'storm' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-900/80 border border-slate-700 px-3 py-1 rounded-full flex items-center gap-2 pointer-events-none z-10">
          <Wind size={12} className="text-slate-400 animate-pulse" />
          <span className="text-[10px] text-slate-300">Dark Storm</span>
        </div>
      )}

      {/* Achievement */}
      {showAchievement && (
        <div className="absolute top-32 right-4 pointer-events-none z-30 animate-in slide-in-from-right duration-500">
          <div className="bg-amber-900/80 backdrop-blur-md border border-amber-500/30 rounded-lg p-3 shadow-lg flex items-center gap-3 max-w-[200px]">
            <Sparkles size={16} className="text-amber-300 shrink-0" />
            <div>
              <div className="text-amber-100 font-bold text-xs">{showAchievement.title}</div>
              <div className="text-amber-200/60 text-[10px] leading-tight">{showAchievement.description}</div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Soul */}
      {selectedSoul && (
        <div className="absolute top-20 left-4 pointer-events-auto z-20">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center gap-3 pr-8 relative">
            <button 
              onClick={() => setSelectedSoul(null)} 
              className="absolute top-1 right-1 text-white/30 hover:text-white p-1"
            >
              <X size={12} />
            </button>
            <div 
              className="w-8 h-8 rounded-full opacity-80" 
              style={{ 
                background: `linear-gradient(135deg, ${selectedSoul.color}, ${selectedSoul.color}88)` 
              }}
            />
            <div>
              <div className="text-white text-xs font-medium">{selectedSoul.name}</div>
              <div className="text-white/40 text-[10px] capitalize">{selectedSoul.personality}</div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-between items-end z-20 pointer-events-none">
        <div className="pointer-events-auto flex-1 flex justify-center mr-16">
          <form onSubmit={handleSendMessage} className="w-full max-w-[200px]">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="whisper..."
              className="w-full bg-transparent border-b border-white/10 text-center text-sm py-2 text-white/80 placeholder-white/20 focus:outline-none focus:border-amber-500/50 focus:placeholder-transparent transition-all"
            />
          </form>
        </div>

        <button
          onClick={sendSpark}
          className="pointer-events-auto absolute bottom-0 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_0_30px_rgba(251,191,36,0.4)] flex items-center justify-center text-white active:scale-90 transition-transform hover:scale-105"
        >
          <Zap size={28} className="animate-pulse" />
        </button>
      </div>

      {/* Chat Overlay */}
      {showChat && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[60vh]">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <span className="text-xs font-bold text-amber-500 tracking-widest">ECHOES</span>
              <button onClick={() => setShowChat(false)} className="text-white/40 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-white/20 text-xs py-10">Only silence...</div>
              )}
              {messages.map(m => (
                <div key={m.id} className="flex flex-col items-start">
                  <span className="text-[10px] text-amber-500/70 mb-0.5">{m.senderName}</span>
                  <div className="text-xs text-gray-300 bg-white/5 px-3 py-2 rounded-lg rounded-tl-none border border-white/5">
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}