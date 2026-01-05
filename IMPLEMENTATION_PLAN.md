# DevOrbit Dashboard - Implementation Plan

This document outlines the planned features, architecture decisions, and implementation details.

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Kebab Menu | ✅ Completed | `components/KebabMenu.tsx` - Full implementation with all menu items |
| Browser-Style Tabs | ✅ Completed | `components/AppTabs.tsx` - Drag-drop, keyboard nav, auto-open |
| Port Conflict Auto-Fix | ✅ Completed | `server/services/PortManager.js` + `PortConflictModal.tsx` |
| Docker Compose Detection | ✅ Completed | `server/services/DockerComposeService.js` - Parse & manage |
| Docker Deployment | ✅ Completed | `Dockerfile`, `docker-compose.yml`, `docker/init-db.sql` |
| Open in Finder/Terminal | ✅ Completed | API endpoints in `server/index.js` |
| Resizable Sidebar | ✅ Completed | Drag to resize, persisted to localStorage |
| Refresh Buttons | ✅ Completed | Global and per-folder refresh in sidebar |
| Favorite Button in Detail | ✅ Completed | Star button in AppDetail header |
| **Backend Persistence** | ✅ Completed | `server/services/settingsService.js` + `hooks/useApps.ts` |
| **Architecture Refactor** | ✅ Completed | Backend/frontend separation with REST API |
| Database Integration | 🔲 Pending | Schema ready, needs PostgreSQL connection |
| Persistent Terminals | 🔲 Pending | Session manager created, needs full integration |

---

## Critical Issue: Settings Persistence

### Problem

Currently, user settings (favorites, archived apps, custom ports, renamed apps) are stored in **browser localStorage**. This causes:

1. **Settings lost when switching browsers** - Each browser has its own localStorage
2. **Settings not synced with Docker** - Docker container runs different browser instance
3. **Settings lost on cache clear** - Browser data deletion removes all settings

### Solution: Backend Persistence Service

Move all user settings from frontend localStorage to backend file-based storage.

### Architecture

```
┌─────────────────┐     REST API      ┌──────────────────┐     File System
│   Browser UI    │ ────────────────► │  Express Server  │ ────────────────► │ data/settings.json
│   (React)       │                   │  (Node.js)       │                   │ data/config.json
└─────────────────┘                   └──────────────────┘                   └──────────────────
        │                                      │
        └──────── WebSocket (PTY) ─────────────┘
```

### Implementation Steps

#### 1. Create Settings Persistence Service

**File**: `server/services/settingsService.js`

```javascript
// Stores:
// - favorites: string[] (app IDs)
// - archived: string[] (app IDs)
// - customPorts: { [appId]: number }
// - customNames: { [appId]: string }

class SettingsService {
  getSettings()
  updateFavorite(appId, isFavorite)
  updateArchived(appId, isArchived)
  updatePort(appId, port)
  updateName(appId, name)
}
```

#### 2. Add API Endpoints

```
GET  /api/settings                  - Get all settings
PUT  /api/settings/favorite/:id     - Toggle favorite
PUT  /api/settings/archive/:id      - Toggle archive
PUT  /api/settings/port/:id         - Set custom port
PUT  /api/settings/name/:id         - Set custom name
```

#### 3. Update Frontend Hook

Modify `hooks/useApps.ts` to:
- Fetch settings from backend on load
- Save settings via API instead of localStorage
- Remove all localStorage calls

---

## Architecture: Backend & Frontend Separation

### Current Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Development                         │
├─────────────────────────────────────────────────────┤
│  Vite Dev Server (localhost:3000)   ◄──── Hot Reload │
│  Express Server (localhost:3099)    ◄──── API + WS   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  Production                          │
├─────────────────────────────────────────────────────┤
│  Express Server (localhost:3099)                     │
│    ├── API Routes (/api/*)                          │
│    ├── WebSocket (/api/pty)                         │
│    └── Static Files (dist/)  ◄──── Built React App  │
└─────────────────────────────────────────────────────┘
```

### Architecture Goals

1. **Backend** (`server/`): Pure API server, no frontend concerns
2. **Frontend** (`src/` or root): React app consuming API
3. **Shared**: TypeScript types, constants
4. **Deployment**: Single Docker image serving both

### File Structure

```
DevOrbit Dashboard/
├── server/
│   ├── index.js           # Express entry point
│   ├── services/
│   │   ├── configService.js
│   │   ├── settingsService.js  # NEW: User settings persistence
│   │   ├── scannerService.js
│   │   ├── processService.js
│   │   ├── ptyService.js
│   │   ├── PortManager.js
│   │   └── DockerComposeService.js
│   └── db/
│       ├── index.js
│       ├── schema.js
│       └── repositories/
├── components/            # React components
├── hooks/                 # React hooks
├── services/              # Frontend API services
│   ├── api.ts
│   └── geminiService.ts
├── types.ts               # Shared TypeScript types
├── data/                  # Persisted data (gitignored)
│   ├── config.json        # Scan directories config
│   └── settings.json      # User settings (NEW)
└── dist/                  # Built frontend (gitignored)
```

---

## Docker Build Process

### Issue: Docker UI Differs from Dev Server

The Docker container may serve outdated frontend code if:
1. The `dist/` folder wasn't rebuilt before Docker build
2. Docker cache used old layers

### Solution: Multi-stage Build (Already Implemented)

The Dockerfile already uses multi-stage builds:

```dockerfile
# Build stage - always builds fresh frontend
FROM node:20-alpine AS builder
RUN npm run build  # Creates dist/

# Production stage - uses fresh build
FROM node:20-alpine AS production
COPY --from=builder /app/dist ./dist
```

### Build Commands

```bash
# Force fresh build (no cache)
docker compose build --no-cache

# Or rebuild just the frontend before Docker build
npm run build && docker compose build
```

### Docker Compose Volumes

```yaml
volumes:
  # Persistent data directory for settings
  - devorbit-data:/app/data

  # Project directories (read-only)
  - ${HOME}/Projects:/Users/hape/Projects:ro
  - ${HOME}/PROJECTS:/Users/hape/PROJECTS:ro
```

---

## Remaining Features

### 1. Database Integration (PostgreSQL)

**Status**: Schema ready, connection logic exists, needs activation

**Files**:
- `docker/init-db.sql` - Schema
- `server/db/index.js` - Connection
- `server/db/repositories/applicationsRepository.js` - CRUD

**When to Enable**:
- When file-based storage becomes a bottleneck
- When multi-user support is needed
- When persistent run history is required

### 2. Persistent Terminal Sessions

**Status**: TerminalSessionManager exists, needs WebSocket integration

**Goal**: Terminal sessions persist across browser refreshes

**Implementation**:
1. Store terminal output buffer on server
2. Allow reconnecting to existing sessions
3. Clean up stale sessions automatically

### 3. Full Docker Compose Integration

**Status**: Detection works, needs management UI

**Goal**: Start/stop/manage Docker Compose services from dashboard

**Implementation**:
1. Parse compose files for services
2. Add service management UI in AppDetail
3. Stream logs per service

---

## Implementation Priority (Updated)

| Priority | Feature | Status | Impact |
|----------|---------|--------|--------|
| 1 | **Backend Settings Persistence** | ✅ Completed | Critical - Data loss prevention |
| 2 | **Docker Build Verification** | ✅ Completed | Critical - Feature parity |
| 3 | Database Integration | 🔲 Pending | Medium - Scalability |
| 4 | Persistent Terminals | 🔲 Pending | Medium - UX improvement |
| 5 | Docker Compose Management UI | 🔲 Pending | Low - Power user feature |

---

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start dev server (Vite + Express concurrently)
npm run dev

# Frontend: http://localhost:3000
# Backend:  http://localhost:3099
```

### Production (Docker)

```bash
# Build and start
docker compose up --build -d

# Access at http://localhost:3099

# View logs
docker compose logs -f devorbit
```

### Environment Variables

```bash
# .env.local
GEMINI_API_KEY=your_api_key        # For AI analysis
SERVER_PORT=3099                    # Backend port
DATABASE_URL=postgres://...         # Optional, enables DB
```

---

## Notes

- Settings will be migrated from localStorage to backend on first API call
- Docker volumes ensure settings persist across container restarts
- File-based storage is sufficient for single-user deployment
- Enable PostgreSQL for multi-user or production deployments
