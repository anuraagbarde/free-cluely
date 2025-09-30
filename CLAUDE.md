# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cluely is an Electron-based desktop assistant that provides real-time AI-powered insights through a transparent, always-on-top overlay window. It analyzes screenshots, audio files, and text to provide contextual assistance during meetings, interviews, presentations, and coding sessions.

## Development Commands

### Setup

```bash
# Install dependencies (use this if you encounter Sharp/Python build errors)
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --ignore-scripts
npm rebuild sharp

# Standard installation
npm install
```

### Running the Application

```bash
# Development mode (recommended) - starts Vite dev server on port 5180 and launches Electron
npm start
# Equivalent to: npm run app:dev

# Production build - creates distributable in release/ folder
npm run dist
# Equivalent to: npm run app:build
```

### Development Utilities

```bash
# Clean build artifacts
npm run clean

# Run Vite dev server only (without Electron)
npm run dev

# Build renderer (React) code
npm run build

# Compile Electron TypeScript and run in development
npm run electron:dev

# Compile Electron TypeScript and run in production
npm run electron:build

# Watch mode for Electron TypeScript
npm run watch
```

## Architecture

### Application Structure

The app consists of three main layers:

1. **Electron Main Process** (`electron/` directory)

   - `main.ts`: Entry point, initializes AppState singleton that coordinates all helpers
   - `AppState`: Central state manager that orchestrates WindowHelper, ScreenshotHelper, ProcessingHelper, and ShortcutsHelper
   - `WindowHelper.ts`: Manages BrowserWindow lifecycle, positioning, visibility, and dynamic resizing
   - `ScreenshotHelper.ts`: Handles screenshot capture, queuing (separate queues for "queue" vs "solutions" views), and preview generation
   - `ProcessingHelper.ts`: Coordinates LLM interactions for processing screenshots and audio
   - `LLMHelper.ts`: Abstraction layer supporting both Google Gemini (cloud) and Ollama (local) LLM providers
   - `ipcHandlers.ts`: IPC bridge between main process and renderer
   - `shortcuts.ts`: Global keyboard shortcuts (Cmd/Ctrl+B for visibility, Cmd/Ctrl+H for screenshot, Cmd/Ctrl+arrows for movement)
   - `preload.ts`: Exposes safe IPC channels to renderer via `window.electronAPI`

2. **React Renderer** (`src/` directory)

   - `App.tsx`: Root component managing view state ("queue" vs "solutions"), toast notifications, and event listeners
   - `_pages/Queue.tsx`: Initial view for capturing and managing screenshots before processing
   - `_pages/Solutions.tsx`: Displays AI-generated solutions and allows debugging/refinement
   - `_pages/Debug.tsx`: Interface for iterative problem refinement
   - `components/`: Reusable UI components organized by feature (Queue, Solutions, ui)

3. **IPC Communication Pattern**
   - Renderer → Main: `window.electronAPI.methodName()` calls invoke IPC handlers
   - Main → Renderer: `mainWindow.webContents.send(eventName, data)` broadcasts events
   - Events defined in `AppState.PROCESSING_EVENTS` constant

### State Management

- **AppState Singleton** (electron/main.ts): Single source of truth for application state

  - Manages view state: "queue" (screenshot capture) or "solutions" (AI results)
  - Maintains screenshot queues (separate for each view)
  - Holds current problem info and debugging state
  - Coordinates between all helper classes

- **Screenshot Workflow**:
  1. User takes screenshots (Cmd/Ctrl+H) → stored in view-specific queue
  2. User requests processing → screenshots sent to LLM
  3. View switches from "queue" to "solutions"
  4. Additional screenshots in "solutions" view go to separate queue for debugging/refinement

### LLM Provider Flexibility

The app supports two LLM providers configured via `.env`:

**Ollama (Local/Private)**:

```env
USE_OLLAMA=true
OLLAMA_MODEL=llama3.2
OLLAMA_URL=http://localhost:11434
```

**Google Gemini (Cloud)**:

```env
GEMINI_API_KEY=your_api_key_here
```

LLMHelper abstracts provider differences with runtime model detection and graceful fallbacks.

### Window Management

- Transparent overlay with `transparent: true` and `alwaysOnTop: true`
- Dynamic resizing based on content via `updateContentDimensions` IPC
- Width constraints: 50% of screen (60% when debugging, 75% after first debug)
- Platform-specific configurations for Windows, macOS, and Linux
- Movement via keyboard shortcuts (Cmd/Ctrl + arrow keys)

## Environment Configuration

Create a `.env` file in the root with one of these configurations:

```env
# Option 1: Ollama (recommended for privacy)
USE_OLLAMA=true
OLLAMA_MODEL=llama3.2
OLLAMA_URL=http://localhost:11434

# Option 2: Google Gemini
GEMINI_API_KEY=your_api_key_here

# Development flags (optional)
NODE_ENV=development
IS_DEV_TEST=true
MOCK_API_WAIT_TIME=500
```

## Key Technical Details

- **Port**: Vite dev server runs on port 5180 (hardcoded in multiple places)
- **TypeScript**: Separate tsconfig for renderer (tsconfig.json) and Electron (electron/tsconfig.json, tsconfig.node.json)
- **Styling**: Tailwind CSS with custom configuration
- **Image Processing**: Sharp library for screenshot preview generation (requires native rebuild)
- **Audio Support**: Can process .mp3 and .wav files alongside screenshots
- **Build Output**:
  - Renderer → `dist/`
  - Electron → `dist-electron/`
  - Final distributable → `release/`

## Platform Support

Cross-platform with platform-specific window configurations:

- **macOS**: Native window management, proper transparency
- **Windows**: Custom focusable settings, taskbar handling
- **Linux**: AppImage and .deb packages, special focus handling

## Troubleshooting Development Issues

### Port 5180 in use

```bash
lsof -i :5180
kill [PID]
```

### Sharp build failures

Already handled by postinstall script, but manually:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm rebuild sharp
```

### Ollama not connecting

Ensure Ollama is running: `ollama serve`
Check model is pulled: `ollama pull llama3.2`
