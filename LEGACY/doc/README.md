# AURA — The Social Cosmos

A real-time spatial voice chat universe built with Vite, TypeScript, and Firebase.

## Features

- 🌌 **Infinite procedurally generated space**
- 🎙️ **Spatial voice chat** (coming soon)
- ✨ **Particle effects and visual feedback**
- 🎵 **Generative audio soundscapes**
- 💫 **Social connections and bond system**
- 🏆 **Achievements and daily quests**
- 🌍 **Multiple realms to explore**

## Tech Stack

### Frontend
- **Vite** - Lightning fast build tool
- **TypeScript** - Type-safe development
- **HTML5 Canvas** - Rendering engine
- **Web Audio API** - Procedural audio

### Backend
- **Express.js** - REST API server
- **TypeScript** - Type-safe backend
- **Firebase** - Real-time database & authentication (optional)

## Project Structure

```
AURA2/
├── src/
│   ├── core/          # Core systems (audio, config, firebase)
│   ├── game/          # Game logic modules
│   ├── ui/            # UI components and handlers
│   ├── network/       # Network and multiplayer logic
│   ├── types/         # TypeScript type definitions
│   ├── styles/        # CSS stylesheets
│   └── main.ts        # Application entry point
├── server/
│   └── index.ts       # Express backend server
├── index.html         # HTML template
├── vite.config.ts     # Vite configuration
├── tsconfig.json      # TypeScript config (frontend)
├── tsconfig.server.json  # TypeScript config (backend)
└── package.json       # Dependencies
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
cd AURA2
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Configure Firebase:
```bash
cp .env.example .env
# Edit .env with your Firebase credentials
```

### Development

Run both frontend and backend in development mode:
```bash
npm run dev
```

Or run them separately:
```bash
# Frontend only (port 3000)
npm run dev:frontend

# Backend only (port 3001)
npm run dev:backend
```

### Building for Production

```bash
npm run build
```

### Running in Production

```bash
npm start
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Firebase (optional)
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Server
PORT=3001
NODE_ENV=development
```

## Controls

- **Mouse/Touch** - Move through space
- **W** / **1** - Send a whisper
- **S** / **2** - Sing (emit sound wave)
- **P** / **3** - Pulse (light nearby stars)
- **E** / **4** - Create an echo (permanent message)
- **Q** - Open emote wheel
- **V** - Toggle voice chat
- **Tab** - Show nearby players
- **Esc** - Close panels

## Development Notes

This project has been refactored from a single HTML file into a professional TypeScript project structure. The original `index.html.backup` file contains the complete original implementation for reference.

### TODO

- [ ] Complete game logic modules (entities, rendering, procedural generation)
- [ ] Implement UI event handlers
- [ ] Add Firebase integration for multiplayer
- [ ] Implement voice chat functionality
- [ ] Add unit tests
- [ ] Set up CI/CD pipeline
- [ ] Add Docker support

## License

MIT

## Credits

Created with ✨ by the AURA team
