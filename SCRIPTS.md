# Scripts Usage Guide

Comprehensive guide for all npm scripts available in the Quiz Portal monorepo.

## 🏠 Root Level Scripts

Run these commands from the root directory (`d:\quiz-portal\`):

### Development Commands

#### `npm run dev`
**Purpose**: Start both client and server simultaneously for development
**Details**: Uses concurrently to run both frontend and backend dev servers
```bash
npm run dev
```
- **Client**: http://localhost:5173 (Vite dev server)
- **Server**: http://localhost:5000 (Express with hot reload)
- **Auto-reload**: Both servers watch for file changes

#### `npm run dev:client`
**Purpose**: Start only the frontend development server
**Details**: Runs Vite dev server for the React application
```bash
npm run dev:client
```
- **URL**: http://localhost:5173
- **Features**: Hot module replacement, fast builds, TypeScript support

#### `npm run dev:server`
**Purpose**: Start only the backend development server
**Details**: Runs Express server with tsx for TypeScript execution
```bash
npm run dev:server
```
- **URL**: http://localhost:5000
- **Features**: Hot reload on file changes, TypeScript support

### Build Commands

#### `npm run build`
**Purpose**: Build both client and server for production
**Details**: Sequential build process for complete application
```bash
npm run build
```
- **Order**: Client first, then server
- **Output**: Optimized production builds

#### `npm run build:client`
**Purpose**: Build only the frontend for production
**Details**: Creates optimized static files for deployment
```bash
npm run build:client
```
- **Output**: `client/dist/` directory
- **Features**: Code splitting, minification, asset optimization

#### `npm run build:server`
**Purpose**: Build only the backend (TypeScript compilation)
**Details**: Compiles TypeScript to JavaScript for production
```bash
npm run build:server
```
- **Output**: `server/dist/` directory (if configured)
- **Features**: Type checking, modern JavaScript output

### Setup Commands

#### `npm run install:all`
**Purpose**: Install dependencies for root, client, and server
**Details**: Complete setup command for new environment
```bash
npm run install:all
```
- **Installs**: Root workspace dependencies, client packages, server packages
- **Order**: Root → Client → Server
- **Use case**: Initial setup, after clean, dependency updates

### Cleanup Commands

#### `npm run clean`
**Purpose**: Remove all node_modules and build artifacts
**Details**: Clean slate for troubleshooting or fresh installs
```bash
npm run clean
```
- **Removes**: 
  - Root `node_modules/`
  - Client `node_modules/` and `dist/`
  - Server `node_modules/` and `dist/`
- **Note**: Requires `npm run install:all` afterward

## 🖥️ Client Scripts

Run these commands from the `client/` directory:

### `cd client && npm run dev`
**Purpose**: Start Vite development server
**Features**:
- Hot Module Replacement (HMR)
- Fast TypeScript compilation
- Tailwind CSS with JIT compilation
- ESLint integration

### `cd client && npm run build`
**Purpose**: Create production build
**Features**:
- Tree-shaking for smaller bundle size
- Code splitting for optimal loading
- Asset optimization and compression
- TypeScript type checking

### `cd client && npm run preview`
**Purpose**: Preview production build locally
**Details**: Serves the built files to test production behavior
```bash
cd client
npm run build
npm run preview
```

### `cd client && npm run lint`
**Purpose**: Run ESLint for code quality checks
**Features**:
- TypeScript-aware linting
- React-specific rules
- Automatic fixing for some issues
```bash
cd client
npm run lint          # Check for issues
npm run lint -- --fix # Auto-fix issues
```

## 🖧 Server Scripts

Run these commands from the `server/` directory:

### `cd server && npm run dev`
**Purpose**: Start development server with hot reload
**Features**:
- TypeScript execution with tsx
- Automatic restart on file changes
- Environment variable loading
- Debug logging

### `cd server && npm start`
**Purpose**: Start production server
**Details**: Runs the compiled JavaScript in production mode
```bash
cd server
npm run build  # If TypeScript compilation is needed
npm start
```

### `cd server && npm run build`
**Purpose**: Compile TypeScript to JavaScript
**Details**: Prepares server code for production deployment
```bash
cd server
npm run build
```

## 🔄 Common Workflow Commands

### Initial Setup
```bash
# Clone and setup
git clone <repository-url>
cd quiz-portal
npm install
npm run install:all
```

### Daily Development
```bash
# Start development (both client and server)
npm run dev

# Or start individually
npm run dev:client    # Frontend only
npm run dev:server    # Backend only
```

### Testing Production Build
```bash
# Build everything
npm run build

# Test client build
cd client && npm run preview

# Test server build
cd server && npm start
```

### Deployment Preparation
```bash
# Clean build
npm run clean
npm run install:all
npm run build

# Deploy client
cd client && vercel --prod

# Deploy server
cd server && vercel --prod
```

### Troubleshooting
```bash
# Clean everything and restart
npm run clean
npm run install:all
npm run dev

# Clear npm cache if needed
npm cache clean --force
```

## 🎯 Script Dependencies

### Required for Development
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MongoDB** (local or Atlas)

### Root Dependencies
- **concurrently**: Runs multiple commands simultaneously
- **npm-run-all**: Executes npm scripts in parallel/sequence

### Client Dependencies
- **Vite**: Build tool and dev server
- **TypeScript**: Type checking and compilation
- **ESLint**: Code linting and formatting

### Server Dependencies
- **tsx**: TypeScript execution for Node.js
- **Express**: Web framework
- **MongoDB**: Database driver

## ⚡ Performance Tips

### Development
- Use `npm run dev` for full-stack development
- Use individual scripts (`dev:client`, `dev:server`) when working on specific parts
- Keep MongoDB running in background to avoid connection delays

### Building
- Use `npm run build` for complete production builds
- Build client first if testing API calls in preview mode
- Clean builds resolve most dependency issues

### Deployment
- Always run `npm run build` before deployment
- Test production builds locally with preview commands
- Use environment-specific configurations for different deployments

## 🚨 Common Issues & Solutions

### Port Conflicts
```bash
# Kill processes on specific ports
npx kill-port 5173  # Client port
npx kill-port 5000  # Server port
```

### Dependency Issues
```bash
# Clean and reinstall everything
npm run clean
npm cache clean --force
npm run install:all
```

### Build Failures
```bash
# Clean build with verbose output
npm run clean
npm run install:all
npm run build -- --verbose
```

### TypeScript Errors
```bash
# Check TypeScript in client
cd client && npx tsc --noEmit

# Check TypeScript in server
cd server && npx tsc --noEmit
```

This guide covers all available scripts and their use cases. Choose the appropriate commands based on your development needs!
