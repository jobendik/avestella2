# AURA — The Social Cosmos
## Complete Project Blueprint & Implementation Guide

**Version:** 2.1.0  
**Last Updated:** 2026-01-14  
**Status:** Phase 3 - Social Depth  

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [Core Philosophy](#2-core-philosophy)
3. [Technical Architecture](#3-technical-architecture)
4. [Feature Checklist](#4-feature-checklist)
5. [Implementation Details](#5-implementation-details)
6. [Code Conventions](#6-code-conventions)
7. [Data Structures](#7-data-structures)
8. [Audio System](#8-audio-system)
9. [Visual Design System](#9-visual-design-system)
10. [Network Architecture](#10-network-architecture)
11. [Future Roadmap](#11-future-roadmap)
12. [Known Issues](#12-known-issues)
13. [Testing Checklist](#13-testing-checklist)

---

## 1. Project Vision

### 1.1 What is AURA?

AURA is a **multiplayer social experience** set in an infinite procedurally-generated cosmos. Players exist as luminous orbs of energy that drift through space, discovering others, forming connections, and leaving their mark on the universe through echoes, stars, and constellations.

### 1.2 Core Experience

Unlike traditional games with explicit goals, AURA is about:
- **Presence** — Simply existing in a shared space with others
- **Connection** — Forming meaningful bonds through interaction
- **Expression** — Communicating through whispers, songs, and emotions
- **Discovery** — Exploring infinite procedural space across multiple realms
- **Legacy** — Leaving permanent echoes that persist for all players

### 1.3 Target Emotions

Players should feel:
- **Wonder** — At the vastness and beauty of the cosmos
- **Intimacy** — When connecting deeply with another soul
- **Serenity** — From the ambient soundscape and gentle mechanics
- **Achievement** — As they grow, evolve, and unlock new abilities
- **Belonging** — As part of a larger cosmic community

### 1.4 Unique Selling Points

1. **Cursor-based movement** — No WASD, just drift toward your cursor
2. **Bond-based mechanics** — Your abilities grow with social connections
3. **Procedural infinite space** — Every coordinate is unique, forever
4. **Spatial voice chat** — Talk to nearby players with distance-based audio
5. **Persistent echoes** — Messages last forever in the cosmos
6. **Visual constellation forming** — Connected players create geometric patterns
7. **Multiple themed realms** — Each with unique atmosphere and music

### 1.5 Inspiration Sources

- Journey (thatgamecompany) — Anonymous, emotional multiplayer
- Sky: Children of the Light — Social expression and connection
- .io games — Accessible, immediate multiplayer
- No Man's Sky — Infinite procedural exploration
- Agar.io — Simple but deep social mechanics

---

## 2. Core Philosophy

### 2.1 Design Principles

| Principle | Description |
|-----------|-------------|
| **Gentle** | No combat, no death, no loss. Only growth. |
| **Social** | Every mechanic should encourage player interaction |
| **Beautiful** | Visual and audio quality are paramount |
| **Accessible** | Anyone can play within 10 seconds of loading |
| **Mysterious** | Don't explain everything; let players discover |
| **Persistent** | Actions should have lasting impact |

### 2.2 Interaction Philosophy

- **Positive-sum** — Helping others always helps yourself
- **Proximity-based** — Most actions require being near others
- **Consent-based** — Can't force interactions; must be mutual
- **Low-stakes** — Nothing bad happens if you fail or leave

### 2.3 Progression Philosophy

- **Horizontal, not vertical** — Higher level = more options, not more power
- **Social progression** — Bonds unlock abilities, not just XP
- **Visual progression** — Players can see your growth at a glance
- **Never punishing** — You can't lose progress

---

## 3. Technical Architecture

### 3.1 Technology Stack

```
Frontend:
├── Vanilla JavaScript (ES6+)
├── HTML5 Canvas (2D rendering)
├── Web Audio API (spatial audio)
├── WebRTC (voice chat) [PLANNED]
└── CSS3 (UI styling)

Backend:
├── Firebase Authentication (anonymous auth)
├── Cloud Firestore (real-time database)
└── Firebase Hosting [OPTIONAL]

Build:
├── Single HTML file (artifact-compatible)
├── No build step required
└── CDN dependencies only
```

### 3.2 File Structure (Current)

```
/index.html          — Complete application (single file)
/BLUEPRINT.md        — This document
/ROADMAP.md          — Historical changes
```

### 3.3 File Structure (Planned Multi-file)

```
/src
├── /core
│   ├── game.js          — Main game loop
│   ├── config.js        — All constants
│   └── utils.js         — Helper functions
├── /entities
│   ├── player.js        — Player class
│   ├── star.js          — Star class
│   ├── echo.js          — Echo class
│   └── projectile.js    — Whisper projectile
├── /systems
│   ├── audio.js         — Web Audio engine
│   ├── network.js       — Firebase sync
│   ├── procedural.js    — Star generation
│   └── achievements.js  — Achievement tracker
├── /ui
│   ├── panels.js        — UI panel management
│   ├── toast.js         — Notification system
│   └── minimap.js       — Minimap renderer
├── /render
│   ├── canvas.js        — Main renderer
│   ├── effects.js       — Particles, trails
│   └── shaders.js       — Visual effects
└── /data
    ├── achievements.json
    ├── quests.json
    └── realms.json
```

### 3.4 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| FPS | 60 | ~60 |
| Initial Load | <2s | ~1.5s |
| Memory | <100MB | ~60MB |
| Network Sync | 700ms | 700ms |
| Max Players (visible) | 50 | ~30 |
| Max Stars (rendered) | 500 | ~300 |

---

## 4. Feature Checklist

### Legend
- ✅ **Complete** — Fully implemented and tested
- 🔄 **In Progress** — Partially implemented
- ⏳ **Planned** — Designed but not started
- 💡 **Idea** — Concept stage only

---

### 4.1 Core Mechanics

#### Movement & Camera
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Cursor-following movement | ✅ | P0 | Smooth lerp at 0.032 speed |
| Camera follow with lerp | ✅ | P0 | 0.075 lerp factor |
| Screen shake on actions | ✅ | P1 | Configurable in settings |
| Player trail rendering | ✅ | P1 | 35-point trail with fade |
| Momentum/inertia | ⏳ | P2 | Optional physics mode |
| Zoom in/out | 💡 | P3 | Scroll wheel or pinch |

#### Whisper System
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Send whisper projectile | ✅ | P0 | Text travels to cursor direction |
| Targeted whispers | ✅ | P0 | Click player → whisper to them |
| Whisper homing | ✅ | P1 | Projectiles curve toward target |
| Whisper trails | ✅ | P1 | 18-point visual trail |
| Receive whisper | ✅ | P0 | Display text above receiver |
| Whisper sound effects | ✅ | P1 | Send + receive sounds |
| Whisper history | ⏳ | P2 | Chat log panel |
| Whisper reactions | 💡 | P3 | React to received messages |

#### Sing Action
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Trigger sing animation | ✅ | P0 | Expanding ring effect |
| Play musical chord | ✅ | P0 | Realm-specific scale |
| Particle burst | ✅ | P1 | 30 particles on sing |
| Broadcast to others | ✅ | P0 | Others see/hear sing |
| Harmonic resonance | ⏳ | P2 | Sing together = bonus |
| Song recording | 💡 | P3 | Record and replay songs |

#### Pulse Action
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Trigger pulse wave | ✅ | P0 | Large expanding ring |
| Light nearby stars | ✅ | P0 | 1.8x view radius |
| XP gain per star | ✅ | P0 | 3 XP per star |
| Cumulative star count | ✅ | P0 | Persistent tracking |
| Pulse chain reaction | 💡 | P3 | Stars light adjacent stars |
| Mega pulse | 💡 | P3 | Group pulse = larger radius |

#### Echo System
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Plant echo at location | ✅ | P0 | Creates permanent marker |
| Echo visual (pulsing orb) | ✅ | P1 | Breathing animation |
| Echo text display | ✅ | P0 | Shows when nearby |
| Echo persistence (Firebase) | ✅ | P0 | Stored in database |
| Echo aging/decay | ⏳ | P2 | Echoes fade over months |
| Echo voting/starring | ⏳ | P2 | Favorite echoes persist longer |
| Echo threading | 💡 | P3 | Reply to existing echoes |
| Echo search | 💡 | P3 | Find echoes by keyword |

#### Emote System
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Emote wheel UI | ✅ | P0 | 12 emotes in circle |
| Display emote above player | ✅ | P0 | 3.5 second duration |
| Broadcast emote | ✅ | P0 | Others see emote |
| Custom emote sets | ⏳ | P2 | Unlock new emotes |
| Animated emotes | 💡 | P3 | Premium emote effects |

---

### 4.2 Social Systems

#### Bond/Connection System
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Bond value tracking (0-100) | ✅ | P0 | Per-player bond strength |
| Bond gain on whisper hit | ✅ | P0 | +11 per successful whisper |
| Bond decay over time | ✅ | P0 | -0.06 per frame |
| Connection threshold (25%) | ✅ | P0 | "Connected" status |
| Visual tether between bonded | ✅ | P1 | Gradient line |
| Tether pull effect | ✅ | P1 | High bond = slight attraction |
| Bond persistence | ⏳ | P1 | Save bonds to Firebase |
| Friend system | ⏳ | P1 | Permanent friend list |
| Block system | ⏳ | P2 | Hide specific players |
| Bond milestones | ⏳ | P2 | Rewards at 50%, 100% |

#### Constellation System
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Detect 3+ connected players | ✅ | P1 | Triangle detection |
| Draw constellation shape | ✅ | P1 | Glowing triangle fill |
| Constellation bonuses | ⏳ | P2 | XP bonus for forming |
| Named constellations | 💡 | P3 | Save and name patterns |
| Constellation leaderboard | 💡 | P3 | Largest constellations |

#### Voice Chat
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Voice toggle UI | ✅ | P0 | Button + status |
| Voice visualizer | ✅ | P1 | Animated bars |
| Speaking indicator | ✅ | P1 | Ring around speaking players |
| WebRTC peer connection | ✅ | P0 | Implemented in src/core/voice.ts |
| Spatial audio falloff | ✅ | P0 | Volume by distance |
| Push-to-talk option | ✅ | P1 | Hold Space to transmit |
| Voice activity detection | ✅ | P1 | Auto-detect speaking |
| Voice channel rooms | 💡 | P2 | Separate voice channels |
| Voice effects | 💡 | P3 | Realm-based voice filters |

#### Social Panel
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Nearby players list | ✅ | P0 | Sorted by bond |
| Player preview (bond, distance) | ✅ | P0 | Status indicators |
| Click to open profile | ✅ | P0 | Profile card popup |
| Friends tab | ⏳ | P1 | Permanent friend list |
| Recent tab | ⏳ | P1 | Recently interacted |
| Online status | ⏳ | P1 | Show if friend is online |
| Teleport to friend | ⏳ | P2 | Jump to friend location |

#### Profile Card
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Avatar display | ✅ | P0 | Colored orb |
| Name and title | ✅ | P0 | Form + Level |
| Stats (stars, echoes, age) | ✅ | P0 | Three stat boxes |
| Bond progress bar | ✅ | P0 | Current bond % |
| Whisper button | ✅ | P0 | Direct message |
| Follow button | ✅ | P0 | Move toward player |
| Voice status | ✅ | P1 | Speaking indicator |
| Add friend button | ⏳ | P1 | Save to friend list |
| View achievements | 💡 | P3 | See their unlocks |
| Gift/trade | 💡 | P3 | Send items |

---

### 4.3 Progression Systems

#### Experience & Leveling
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| XP gain from actions | ✅ | P0 | Whisper=8, Star=3, Echo=25 |
| Level thresholds | ✅ | P0 | 100,300,700,1500,3000,6000,12000,25000 |
| Level-up effects | ✅ | P1 | Particle burst + sound |
| Form evolution | ✅ | P0 | Spark→Ember→Flame→etc |
| Visual size increase | ✅ | P1 | Larger orb + halo |
| XP progress bar | ✅ | P0 | Shows current/next |
| Prestige system | 💡 | P3 | Reset for bonuses |

#### Achievement System
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Achievement definitions | ✅ | P0 | 12 achievements defined |
| Progress tracking | ✅ | P0 | Stats object tracks all |
| Unlock detection | ✅ | P0 | Auto-check on stat change |
| Achievement panel UI | ✅ | P0 | Grid with progress bars |
| Achievement toast | ✅ | P1 | Notification on unlock |
| Achievement sound | ✅ | P1 | Special jingle |
| Achievement persistence | ✅ | P0 | localStorage |
| Achievement categories | ⏳ | P2 | Group by type |
| Secret achievements | ⏳ | P2 | Hidden until unlocked |
| Achievement points | 💡 | P3 | Total score |

**Current Achievements:**
| ID | Name | Requirement | XP Reward | Status |
|----|------|-------------|-----------|--------|
| first_whisper | First Words | 1 whisper | 10 | ✅ |
| chatterbox | Chatterbox | 50 whispers | 50 | ✅ |
| first_conn | Kindred Spirit | 1 connection | 25 | ✅ |
| social | Social Butterfly | 10 connections | 75 | ✅ |
| star10 | Star Lighter | 10 stars | 20 | ✅ |
| star100 | Star Collector | 100 stars | 100 | ✅ |
| echo5 | Echo Planter | 5 echoes | 30 | ✅ |
| realm3 | Realm Explorer | 3 realms | 40 | ✅ |
| voice | Voice Pioneer | Use voice | 15 | ✅ |
| lv5 | Nova | Level 5 | 50 | ✅ |
| lv10 | Celestial | Level 10 | 100 | ✅ |
| bond100 | Deep Bond | 100% bond | 60 | ✅ |

#### Quest System
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Daily quest definitions | ✅ | P0 | 5 quests defined |
| Quest progress tracking | ✅ | P0 | dailyProgress object |
| Quest completion detection | ✅ | P0 | Auto-check on progress |
| Quest panel UI | ✅ | P0 | List with progress bars |
| Quest completion toast | ✅ | P1 | Notification |
| Quest reset (daily) | ⏳ | P1 | Reset at midnight |
| Weekly quests | ⏳ | P2 | Longer-term goals |
| Quest chains | 💡 | P3 | Multi-step quests |
| Community quests | 💡 | P3 | Server-wide goals |

**Current Quests:**
| ID | Name | Requirement | XP Reward | Status |
|----|------|-------------|-----------|--------|
| whisper3 | Cosmic Messenger | 3 whispers | 15 | ✅ |
| star5 | Illuminate | 5 stars | 10 | ✅ |
| connect1 | Make a Friend | 1 connection | 20 | ✅ |
| sing2 | Cosmic Harmony | 2 sings | 10 | ✅ |
| emote3 | Express Yourself | 3 emotes | 10 | ✅ |

---

### 4.4 World Systems

#### Realm System
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Multiple realms defined | ✅ | P0 | 5 realms |
| Realm selection UI | ✅ | P0 | Sidebar buttons |
| Realm transition effect | ✅ | P1 | Fade overlay |
| Realm-specific visuals | ✅ | P0 | Colors, nebula |
| Realm-specific music | ✅ | P0 | Different scales |
| Level-locked realms | ✅ | P0 | Starforge@5, Sanctuary@10 |
| Realm population display | ⏳ | P2 | Show player count |
| Realm events | 💡 | P3 | Time-limited gatherings |

**Current Realms:**
| ID | Name | Icon | Unlock | BG Color | Music Key |
|----|------|------|--------|----------|-----------|
| genesis | Genesis | 🌌 | Lv 1 | [5,5,12] | C Major |
| nebula | Nebula Gardens | 🌸 | Lv 1 | [15,5,20] | C# Major |
| void | The Void | 🌑 | Lv 1 | [2,2,5] | C Minor (low) |
| starforge | Starforge | 🔥 | Lv 5 | [15,8,5] | D Major |
| sanctuary | Sanctuary | 🏛️ | Lv 10 | [8,12,18] | B Major |

#### Procedural Star Generation
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Cell-based generation | ✅ | P0 | 180px cells |
| Deterministic seeding | ✅ | P0 | Same coords = same stars |
| Realm-specific density | ✅ | P1 | Void=sparse, Nebula=dense |
| Star brightness variation | ✅ | P1 | 0.25-1.0 range |
| Star twinkling | ✅ | P1 | Sine wave animation |
| Lit state tracking | ✅ | P0 | Per-star lit boolean |
| Star burst effect | ✅ | P1 | Flash on lighting |
| Named star systems | 💡 | P3 | Special procedural names |
| Star clusters | 💡 | P3 | Denser regions |

#### Minimap
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Player position (center) | ✅ | P0 | White dot |
| Other players | ✅ | P0 | Colored by hue |
| Bond indication | ✅ | P1 | Opacity by bond |
| Echo markers | ✅ | P1 | Realm-specific |
| View radius circle | ✅ | P1 | Dashed circle |
| Realm indicator | ✅ | P1 | Background color |
| Clickable navigation | ⏳ | P2 | Click to move |
| Zoom levels | 💡 | P3 | Toggle zoom |

---

### 4.5 Visual & Audio

#### Particle System
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Particle spawning | ✅ | P0 | spawn() function |
| Radial explosion pattern | ✅ | P0 | Circular burst |
| Directional pattern | ✅ | P0 | Action-based direction |
| Particle physics | ✅ | P0 | Velocity + drag |
| Particle fade | ✅ | P0 | Life-based alpha |
| Particle size variation | ✅ | P1 | 2-6.5px range |
| Hue variation | ✅ | P1 | ±35 from base |
| Toggle in settings | ✅ | P0 | Performance option |
| Particle limits | ⏳ | P2 | Cap max particles |

#### Trail System
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Player trail | ✅ | P0 | 35 points max |
| Other player trails | ✅ | P0 | 22 points max |
| Trail fade | ✅ | P0 | Life-based alpha |
| Trail thickness | ✅ | P1 | Life-based width |
| Projectile trails | ✅ | P0 | 18 points max |
| Trail color gradient | ⏳ | P2 | Hue shift along trail |

#### Floating Text
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| XP gain popups | ✅ | P0 | "+X XP" text |
| Whisper text display | ✅ | P0 | Message above hit player |
| Float animation | ✅ | P0 | Rise + fade |
| Customizable duration | ✅ | P0 | 1.5-2.5 seconds |
| Damage numbers | N/A | - | No combat system |

#### Audio Engine
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Web Audio context | ✅ | P0 | Initialize on interaction |
| Ambient drone | ✅ | P0 | 55Hz base + LFO |
| Realm-specific drone pitch | ✅ | P1 | Different base frequency |
| Musical scale system | ✅ | P0 | Pentatonic per realm |
| Note playback | ✅ | P0 | Sine wave oscillator |
| Chord playback | ✅ | P0 | 3-note chords |
| Volume control | ✅ | P0 | Master gain node |
| Mute toggle | ✅ | P0 | Settings integration |
| Spatial audio | ✅ | P1 | Distance-based volume via VoiceChat |
| Voice integration | ✅ | P0 | WebRTC in src/core/voice.ts |

---

### 4.6 UI Systems

#### Settings Panel
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Music toggle | ✅ | P0 | Enable/disable drone |
| Volume slider | ✅ | P0 | 0-100% range |
| Color picker | ✅ | P0 | 9 hue options |
| Particles toggle | ✅ | P0 | Performance option |
| Screen shake toggle | ✅ | P0 | Accessibility |
| Settings persistence | ⏳ | P1 | localStorage |
| Key rebinding | 💡 | P3 | Custom hotkeys |
| Graphics quality | 💡 | P3 | Low/Med/High presets |

#### Toast Notifications
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Toast display | ✅ | P0 | Top-center position |
| Toast animation | ✅ | P0 | Slide in/out |
| Toast types | ✅ | P0 | Default, achievement, quest, level |
| Auto-dismiss | ✅ | P0 | 4.3 second duration |
| Toast queue | ⏳ | P2 | Multiple simultaneous |
| Toast actions | 💡 | P3 | Clickable toasts |

#### Loading & Onboarding
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Loading screen | ✅ | P0 | Logo + features |
| Name input | ✅ | P0 | 20 char max |
| Feature highlights | ✅ | P1 | 3 animated icons |
| Onboarding modal | ✅ | P0 | Controls explanation |
| Skip option | ⏳ | P2 | For returning players |
| Tutorial mode | 💡 | P3 | Guided first experience |

---

### 4.7 Network & Persistence

#### Firebase Integration
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Anonymous authentication | ✅ | P0 | Auto sign-in |
| Custom token support | ✅ | P0 | For embedded use |
| Player position sync | ✅ | P0 | 700ms interval |
| Event broadcasting | ✅ | P0 | Sing, pulse, whisper, emote |
| Event cleanup | ✅ | P0 | Delete events >60s old |
| Echo persistence | ✅ | P0 | Permanent storage |
| Player data persistence | ⏳ | P1 | Save XP, stats |
| Friend list storage | ⏳ | P1 | Firestore subcollection |
| Offline mode | ✅ | P0 | Bot fallback |
| Rate limiting | ⏳ | P2 | Prevent spam |

#### Local Storage
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Achievement persistence | ✅ | P0 | JSON in localStorage |
| Settings persistence | ⏳ | P1 | Store user prefs |
| Player data backup | ⏳ | P2 | Offline cache |
| Quest progress | ⏳ | P2 | Daily tracking |
| Clear data option | ⏳ | P2 | Reset everything |

---

## 5. Implementation Details

### 5.1 Movement System

```javascript
// Core movement formula
player.x += (player.tx - player.x) * CONFIG.DRIFT; // 0.032
player.y += (player.ty - player.y) * CONFIG.DRIFT;

// Target follows cursor
player.tx = camera.x + mouseX;
player.ty = camera.y + mouseY;

// Camera follows player
camera.x += (camera.tx - camera.x) * 0.075;
camera.y += (camera.ty - camera.y) * 0.075;
camera.tx = player.x - W/2;
camera.ty = player.y - H/2;
```

### 5.2 Bond Calculation

```javascript
// On successful whisper hit
const currentBond = player.bonds.get(targetId) || 0;
const newBond = Math.min(100, currentBond + CONFIG.BOND_GAIN); // +11
player.bonds.set(targetId, newBond);

// Bond decay (every frame)
player.bonds.forEach((strength, id) => {
    const decayed = Math.max(0, strength - CONFIG.BOND_DECAY); // -0.06
    if (decayed === 0) player.bonds.delete(id);
    else player.bonds.set(id, decayed);
});

// Connection threshold
const isConnected = bond >= 25;
```

### 5.3 Procedural Star Generation

```javascript
// Deterministic seed function
function seed(s) {
    const x = Math.sin(s) * 43758.5453;
    return x - Math.floor(x);
}

// Generate stars for a cell
function genStars(cellX, cellY, realm) {
    const key = `${realm}:${cellX},${cellY}`;
    if (stars.has(key)) return;
    
    let s = cellX * 12.9898 + cellY * 78.233 + realm.charCodeAt(0) * 0.1;
    const densityMod = realm === 'void' ? 0.5 : realm === 'nebula' ? 1.3 : 1;
    const count = Math.floor((5 + seed(s) * 8) * densityMod);
    
    const arr = [];
    for (let i = 0; i < count; i++) {
        s = s * 1.1 + i * 0.7;
        const localX = seed(s) * CONFIG.STAR_CELL;
        s = s * 1.3 + 0.5;
        const localY = seed(s) * CONFIG.STAR_CELL;
        s = s * 0.9 + 0.3;
        const brightness = 0.25 + seed(s) * 0.75;
        
        arr.push(new Star(
            cellX * CONFIG.STAR_CELL + localX,
            cellY * CONFIG.STAR_CELL + localY,
            false, brightness, realm
        ));
    }
    stars.set(key, arr);
}
```

### 5.4 Achievement Check System

```javascript
// Stats object tracks all progress
const stats = {
    whispers: 0,
    stars: 0,
    echoes: 0,
    connections: 0,
    maxBond: 0,
    voice: 0,
    level: 1,
    realms: 1
};

// Achievement definition format
const ACHIEVEMENTS = [
    {
        id: 'first_whisper',
        name: 'First Words',
        desc: 'Send your first whisper',
        icon: '💬',
        reward: 10,      // XP reward
        track: 'whispers', // stat to track
        need: 1          // threshold
    },
    // ...
];

// Check function (called after stat changes)
function checkAchievements() {
    ACHIEVEMENTS.forEach(a => {
        if (unlocked.has(a.id)) return;
        if (stats[a.track] >= a.need) {
            unlocked.add(a.id);
            Audio.playAchievement();
            toast(`🏆 ${a.name}!`, 'achievement');
            gainXP(a.reward, false);
            localStorage.setItem('aura_achievements', JSON.stringify([...unlocked]));
        }
    });
}
```

### 5.5 WebRTC Voice Chat (TO IMPLEMENT)

```javascript
// Planned implementation structure
class VoiceChat {
    constructor() {
        this.localStream = null;
        this.peers = new Map(); // peerId -> RTCPeerConnection
        this.audioContext = null;
        this.gainNodes = new Map(); // peerId -> GainNode
    }
    
    async init() {
        // Get microphone access
        this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        this.audioContext = new AudioContext();
    }
    
    connectToPeer(peerId, signalingChannel) {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        // Add local audio track
        this.localStream.getTracks().forEach(track => {
            pc.addTrack(track, this.localStream);
        });
        
        // Handle incoming audio
        pc.ontrack = (event) => {
            const audio = new Audio();
            audio.srcObject = event.streams[0];
            
            // Route through Web Audio for spatial effects
            const source = this.audioContext.createMediaStreamSource(event.streams[0]);
            const gain = this.audioContext.createGain();
            source.connect(gain);
            gain.connect(this.audioContext.destination);
            
            this.gainNodes.set(peerId, gain);
        };
        
        this.peers.set(peerId, pc);
        return pc;
    }
    
    updateSpatialAudio(peerId, distance) {
        const gain = this.gainNodes.get(peerId);
        if (!gain) return;
        
        // Distance-based falloff
        const maxDistance = CONFIG.TETHER * 2;
        const volume = Math.max(0, 1 - (distance / maxDistance));
        gain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
    }
}
```

---

## 6. Code Conventions

### 6.1 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Constants | UPPER_SNAKE | `CONFIG.TETHER_RANGE` |
| Variables | camelCase | `currentRealm` |
| Functions | camelCase | `checkAchievements()` |
| Classes | PascalCase | `class Star {}` |
| DOM IDs | kebab-case | `#msg-input` |
| CSS Classes | kebab-case | `.player-item` |
| Event handlers | on/handle prefix | `handleMove()` |

### 6.2 File Organization (Single File)

```javascript
// 1. Configuration & Constants
const CONFIG = { ... };
const SCALES = { ... };
const REALMS = { ... };

// 2. State Variables
let gameActive = false;
let currentRealm = 'genesis';

// 3. Audio System
const Audio = { ... };

// 4. Canvas Setup
const canvas = document.getElementById('cosmos');

// 5. Entity Classes
class Star { ... }
class Echo { ... }

// 6. Procedural Generation
function seed(s) { ... }
function genStars() { ... }

// 7. Game Logic Functions
function gainXP() { ... }
function checkAchievements() { ... }

// 8. Action Functions
function createWhisper() { ... }
function doSing() { ... }

// 9. Update Loop
function update() { ... }

// 10. Render Functions
function render() { ... }
function renderStars() { ... }

// 11. UI Functions
function toast() { ... }
function showProfile() { ... }

// 12. Input Handlers
canvas.addEventListener('click', ...);
document.addEventListener('keydown', ...);

// 13. Network Functions
function initNetwork() { ... }
function broadcast() { ... }

// 14. Initialization
document.getElementById('start').addEventListener('click', ...);
requestAnimationFrame(render);
setInterval(update, 16);
```

### 6.3 CSS Organization

```css
/* 1. CSS Variables */
:root { --gold: #e8c547; }

/* 2. Reset & Base */
* { margin: 0; }
body { ... }

/* 3. Layout Components */
#ui { ... }
#top { ... }

/* 4. Interactive Elements */
.action { ... }
.action:hover { ... }

/* 5. Panels & Modals */
.panel { ... }
#profile { ... }

/* 6. Animations */
@keyframes pulse { ... }

/* 7. Responsive */
@media (max-width: 768px) { ... }
```

---

## 7. Data Structures

### 7.1 Player Object

```javascript
const player = {
    // Position
    x: 0,           // Current X
    y: 0,           // Current Y
    tx: 0,          // Target X (cursor)
    ty: 0,          // Target Y (cursor)
    
    // Appearance
    hue: 180,       // Color hue (0-360)
    r: 11,          // Core radius
    halo: 55,       // Halo radius
    
    // State
    singing: 0,     // Sing animation progress (0-1)
    pulsing: 0,     // Pulse animation progress (0-1)
    emoting: null,  // Current emote emoji
    emoteT: 0,      // Emote time remaining
    
    // Progression
    xp: 0,
    stars: 0,
    echoes: 0,
    
    // Social
    bonds: new Map(), // playerId -> bondStrength (0-100)
    
    // Visual
    trail: [],      // Array of {x, y, life}
    
    // Identity
    name: 'Wanderer',
    id: 'local-xxx',
    born: Date.now()
};
```

### 7.2 Other Player Object

```javascript
// Stored in: others.get(playerId)
{
    x: 0, y: 0,
    hue: 180,
    name: 'Player',
    xp: 0,
    stars: 0,
    echoes: 0,
    r: 11,
    halo: 55,
    singing: 0,
    pulsing: 0,
    emoting: null,
    emoteT: 0,
    trail: [],
    id: 'firebase-uid',
    born: Date.now(),
    speaking: false,    // Voice chat status
    isBot: false        // True for offline bots
}
```

### 7.3 Firebase Document Structures

```javascript
// players/{uid}
{
    x: 0,
    y: 0,
    hue: 180,
    name: 'Player',
    xp: 0,
    stars: 0,
    echoes: 0,
    born: 1234567890,
    realm: 'genesis',
    speaking: false,
    t: 1234567890       // Timestamp for cleanup
}

// events/{eventId}
{
    type: 'whisper',    // whisper|sing|pulse|emote|echo
    uid: 'sender-uid',
    name: 'Sender',
    x: 0, y: 0,
    realm: 'genesis',
    t: 1234567890,
    
    // Type-specific fields:
    // whisper: dx, dy, text, target
    // sing: hue
    // pulse: hue
    // emote: emoji
    // echo: text, hue
}

// echoes/{echoId}
{
    x: 0,
    y: 0,
    text: 'Hello cosmos',
    hue: 180,
    name: 'Author',
    realm: 'genesis',
    uid: 'author-uid',
    t: 1234567890
}
```

---

## 8. Audio System

### 8.1 Musical Scales by Realm

```javascript
const SCALES = {
    genesis: [261.63, 293.66, 329.63, 392, 440, 523.25],    // C Major Pentatonic
    nebula: [277.18, 311.13, 369.99, 415.3, 466.16, 554.37], // C# Major
    void: [130.81, 146.83, 164.81, 196, 220, 261.63],       // C Minor (octave down)
    starforge: [293.66, 329.63, 369.99, 440, 493.88, 587.33], // D Major
    sanctuary: [246.94, 293.66, 329.63, 392, 440, 493.88]    // B Major
};
```

### 8.2 Drone Base Frequencies

```javascript
const DRONE_FREQ = {
    genesis: 55,    // A1
    nebula: 62,     // B1
    void: 41,       // E1 (low)
    starforge: 73,  // D2
    sanctuary: 49   // G1
};
```

### 8.3 Sound Design Principles

1. **Layered** — Multiple oscillators create depth
2. **Soft Attack** — All sounds fade in (0.06s)
3. **Long Release** — Sounds fade out naturally (1-2s)
4. **Harmonic** — Chords use simple ratios (1:1.25:1.5)
5. **Dynamic** — Volume responds to action intensity

---

## 9. Visual Design System

### 9.1 Color Palette

```css
:root {
    /* Primary */
    --gold: #e8c547;
    --gold-dim: #a68a2a;
    --gold-bright: #ffd700;
    
    /* Accent */
    --pink: #ff6b9d;
    --blue: #4ecdc4;
    --purple: #a855f7;
    
    /* Background */
    --void: #050508;
    
    /* Glass Effect */
    --glass: rgba(255,255,255,0.06);
    --glass-hover: rgba(255,255,255,0.12);
    --glass-border: rgba(255,255,255,0.12);
    
    /* Text */
    --text-primary: rgba(255,255,255,0.95);
    --text-secondary: rgba(255,255,255,0.6);
    --text-dim: rgba(255,255,255,0.35);
    
    /* Status */
    --danger: #ef4444;
    --success: #22c55e;
}
```

### 9.2 Typography

```css
/* Headings - Elegant serif */
font-family: 'Cormorant Garamond', serif;

/* Body - Clean sans */
font-family: 'Outfit', sans-serif;

/* Code/Technical */
font-family: 'JetBrains Mono', monospace;
```

### 9.3 Animation Timing

| Animation | Duration | Easing |
|-----------|----------|--------|
| Hover transitions | 0.2s | ease |
| Panel open/close | 0.3s | ease |
| Toast in/out | 0.3s | ease |
| Realm transition | 0.5s | linear |
| Pulse expansion | 1.0s | linear |
| Particle life | ~1.5s | linear |

### 9.4 Rendering Order (Back to Front)

1. Background (solid color fade)
2. Nebula gradients
3. Background stars (parallax)
4. Procedural stars (unlit)
5. Procedural stars (lit)
6. Echoes
7. Constellation fills
8. Tether lines
9. Other player trails
10. Other players
11. Projectile trails
12. Projectiles
13. Player trail
14. Player
15. Particles
16. Floating text
17. Emotes
18. Vignette overlay
19. UI layer (HTML)

---

## 10. Network Architecture

### 10.1 Data Flow

```
[Player Input]
     ↓
[Local State Update]
     ↓
[Render Immediately] ←─────────────────┐
     ↓                                  │
[Broadcast to Firebase] (700ms interval)│
     ↓                                  │
[Firebase Realtime Sync]                │
     ↓                                  │
[Other Clients Receive] ────────────────┘
```

### 10.2 Sync Strategy

| Data Type | Sync Method | Frequency |
|-----------|-------------|-----------|
| Position | Set document | 700ms |
| Events | Add document | Immediate |
| Echoes | Add document | Immediate |
| Cleanup | Delete old | 25s |

### 10.3 Offline Handling

```javascript
if (firebaseConfig && typeof firebase !== 'undefined') {
    // Try to connect
    try {
        firebase.initializeApp(firebaseConfig);
        // ...
    } catch (e) {
        initBots(); // Fallback to bots
    }
} else {
    initBots(); // No config = offline mode
}
```

---

## 11. Future Roadmap

### Phase 1: Polish ✅ COMPLETE
- [x] Fix any remaining bugs
- [x] Performance optimization
- [x] Mobile touch improvements
- [x] Settings persistence (src/core/persistence.ts)
- [x] Quest reset timer

### Phase 2: Voice Chat ✅ COMPLETE
- [x] WebRTC peer connections (src/core/voice.ts)
- [x] Signaling via Firebase
- [x] Spatial audio mixing
- [x] Push-to-talk option
- [x] Voice activity detection

### Phase 3: Social Depth (CURRENT)
- [ ] Friend system (add/remove)
- [ ] Friend persistence (Firebase)
- [ ] Online status indicators
- [ ] Teleport to friends
- [ ] Private whisper channels

### Phase 4: Content Expansion
- [ ] More achievements (20+)
- [ ] Weekly quests
- [ ] New realms (2-3 more)
- [ ] Seasonal events
- [ ] Unlockable emotes

### Phase 5: Advanced Features
- [ ] Custom avatars/shapes
- [ ] Constellation naming
- [ ] Echo voting/featuring
- [ ] Leaderboards
- [ ] Moderation tools

### Phase 6: Platform
- [ ] User accounts (optional)
- [ ] Cross-device sync
- [ ] Mobile app wrapper
- [ ] Desktop app (Electron)
- [ ] API for integrations

---

## 12. Known Issues

### Critical
| Issue | Status | Notes |
|-------|--------|-------|
| ~~Voice chat not functional~~ | ✅ Resolved | Implemented in src/core/voice.ts |

### High Priority
| Issue | Status | Notes |
|-------|--------|-------|
| ~~Quest reset not implemented~~ | ✅ Resolved | Daily reset with timer in persistence.ts |
| ~~Settings not persisted~~ | ✅ Resolved | PersistenceManager in src/core/persistence.ts |
| Bond persistence missing | Open | Bonds lost on refresh |

### Medium Priority
| Issue | Status | Notes |
|-------|--------|-------|
| Mobile touch sometimes sticky | Open | Touch event handling |
| Particles can impact performance | Open | Need particle limits |
| Long usernames overflow | Open | CSS truncation needed |

### Low Priority
| Issue | Status | Notes |
|-------|--------|-------|
| No zoom controls | Open | Nice to have |
| No key rebinding | Open | Accessibility feature |
| Echoes never expire | Open | Could cause database growth |

---

## 13. Testing Checklist

### Core Functionality
- [ ] Can enter name and start game
- [ ] Cursor movement works smoothly
- [ ] Camera follows player
- [ ] Can send whispers
- [ ] Can sing (visual + audio)
- [ ] Can pulse (lights stars)
- [ ] Can plant echoes
- [ ] Can emote (all 12 emotes)

### Social Features
- [ ] Other players visible
- [ ] Bonds increase on whisper hit
- [ ] Bonds decay over time
- [ ] Tethers render between bonded players
- [ ] Profile card opens on click
- [ ] Can whisper specific player
- [ ] Can follow player

### Progression
- [ ] XP increases from actions
- [ ] Level up triggers effects
- [ ] Achievements unlock correctly
- [ ] Achievement persistence works
- [ ] Quest progress tracks
- [ ] Quest completion rewards

### Realms
- [ ] Can switch realms
- [ ] Transition animation plays
- [ ] Realm colors change
- [ ] Realm music changes
- [ ] Level-locked realms blocked
- [ ] Stars separate per realm

### UI
- [ ] All panels open/close
- [ ] Settings toggles work
- [ ] Volume slider works
- [ ] Color picker works
- [ ] Toasts appear/dismiss
- [ ] Minimap accurate

### Network
- [ ] Firebase connects
- [ ] Position syncs to others
- [ ] Events broadcast correctly
- [ ] Echoes persist
- [ ] Offline mode works

### Performance
- [ ] 60 FPS maintained
- [ ] No memory leaks
- [ ] Works on mobile
- [ ] Works in all major browsers

---

## Appendix A: Quick Reference

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| W / 1 | Open whisper input |
| S / 2 | Sing |
| P / 3 | Pulse |
| E / 4 | Open echo input |
| Q | Open emote wheel |
| V | Toggle voice |
| Tab | Toggle social panel |
| Escape | Close all panels |

### XP Rewards
| Action | XP |
|--------|-----|
| Whisper hit | 8 |
| Star lit | 3 |
| Echo planted | 25 |
| Achievement | 10-100 |
| Quest complete | 10-20 |

### Level Thresholds
| Level | XP Required | Form |
|-------|-------------|------|
| 1 | 0 | Spark |
| 2 | 100 | Ember |
| 3 | 300 | Flame |
| 4 | 700 | Prism |
| 5 | 1,500 | Nova |
| 6 | 3,000 | Celestial |
| 7 | 6,000 | Eternal |
| 8 | 12,000 | Infinite |

### Config Values
| Setting | Value |
|---------|-------|
| Drift speed | 0.032 |
| Camera lerp | 0.075 |
| Bond gain | +11 |
| Bond decay | -0.06/frame |
| Connection threshold | 25% |
| Tether range | 380px |
| View base | 520px |
| View per bond | +40px |
| Star cell size | 180px |
| Whisper speed | 5.5 |
| Network sync | 700ms |

---

## Appendix B: Implementation Priority

### P0 - Must Have (MVP)
- Movement, camera, rendering
- Whisper, sing, pulse, echo
- Bond system basics
- Level progression
- Firebase multiplayer
- Basic UI

### P1 - Should Have (Polish)
- Achievements
- Quests
- Settings panel
- All realms
- Voice UI (without WebRTC)
- Profile cards

### P2 - Nice to Have (Enhancement)
- Voice chat (WebRTC)
- Friend system
- Bond persistence
- Quest reset
- Settings persistence
- Mobile optimization

### P3 - Future (Expansion)
- Custom avatars
- Leaderboards
- Events system
- User accounts
- Moderation

---

*This document should be updated as features are implemented or requirements change.*

**Document Version:** 2.0.0  
**Compatible With:** AURA index.html v2.0+
