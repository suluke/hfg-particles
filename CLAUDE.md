# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an interactive particle system visualization web application built with JavaScript, WebGL (using regl), and Sass. The project allows users to create and manipulate particle effects with real-time visual feedback.

## Development Commands

- `npm start` - Start development server on port 3000
- `npm run start:dev` - Start dev server with auto-restart (for deep changes to server.js)
- `npm run build` - Run full build (assets + Sass + JavaScript compilation)
- `npm run build:sass` - Compile Sass files only
- `npm run build:assets` - Copy assets (fonts, ffmpeg worker) only
- `npm run build:js` - Compile JavaScript bundles only
- `npm run lint` - Lint JavaScript code using ESLint
- `npm run format` - Auto-fix linting issues
- `npm test` - Run linting (no actual tests available yet)
- `npm run deploy` - Deploy to gh-pages branch (maintainers only)

## Dependency Modernization Notes

The project has been updated with modern dependencies:
- **Sass**: Migrated from deprecated `node-sass-middleware` to modern `sass` package with custom Express middleware
- **JavaScript bundling**: Replaced unmaintained `express-middleware-rollup` with custom rollup-based middleware and build system
- **Rollup plugins**: Updated to modern `@rollup/*` scoped packages (buble, commonjs, json, node-resolve, replace)
- **Express**: Updated to v5.x
- **ESLint**: Updated to v8.x with `npx` commands instead of deprecated `$(npm bin)` syntax
- **Other deps**: Updated nodemon, fs-extra to latest versions

## Getting Started

1. Run `git submodule update --init` to populate the `static/` directory with binary assets
2. Run `npm install` to install dependencies
3. Run `npm start` to start the development server
4. Navigate to `localhost:3000`

## Architecture

### Build System
The project uses a custom build system implemented in `server.js` that serves as both development server and build tool:
- **Rollup** with Bublé for ES6 transpilation and module bundling
- **Node-sass** for SCSS compilation
- **Express** middleware for serving and processing files
- Entry point: `js/main.bundle` (note the `.bundle` suffix)

### Core Components

**Effects System (`js/effects/`)**
- `effect.js` - Base `Effect` class and `ConfigUI` interface that all effects must extend
- `index.js` - Central registry of all effects with color mapping
- Individual effect files implement particle behaviors (e.g., `hue-displace.js`, `wave.js`)

**Rendering (`js/renderer/`)**
- `renderer.js` - Main renderer using regl (WebGL wrapper)
- `state.js` - Manages particle and rendering state
- `pipeline.js` - Rendering pipeline management
- `clock.js` - Animation timing

**UI System (`js/ui/`)**
- `menu.js` - Main control interface
- `timeline.js` - Animation timeline controls
- `record.js` - Video recording functionality
- Various dialog and control components

**Configuration**
- `js/config.js` - Build-time configuration with git revision injection
- `js/presets/` - Predefined effect configurations

### Key Patterns

**Effect Development**
To create a new effect:
1. Create file in `js/effects/my-effect.js`
2. Extend the `Effect` class and implement required static methods
3. Create a `ConfigUI` subclass for user controls
4. Add to the effects list in `js/effects/index.js`

**WebGL Integration**
- Uses regl library for WebGL abstraction
- Effects register shaders and uniforms through the `register()` method
- Particle data managed through the state system

**Configuration Management**
- Supports localStorage persistence
- URL hash-based preset loading
- Real-time config updates through the menu system

## File Structure Notes

- `static/` - Built assets and deployment target (git submodule for gh-pages)
- `sass/` - SCSS styles with component-based organization
- `manual/` - User documentation
- `index.html` - Entry point template (copied to static/ on build)