# KULT Creator Studio Frontend

React and Vite frontend for the KULT Creator Studio game creation interface.

## Requirements

- Node.js 18 or newer
- npm
- Backend API running on `http://localhost:3001`

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs on `http://localhost:5173` by default.

## Scripts

- `npm run dev` starts the Vite development server.
- `npm run build` creates a production build in `dist/`.
- `npm run preview` previews the production build.
- `npm run lint` runs ESLint over `src/`.

## Environment

```text
VITE_APP_NAME=KULT Creator Studio
VITE_API_URL=http://localhost:3001
VITE_ENABLE_AI_REFINEMENT=true
VITE_DEFAULT_TEMPLATE=flappy
VITE_DEFAULT_THEME=neon
```

## Backend Connection

The Vite dev server proxies `/api` requests to `http://localhost:3001`. If the backend port changes, update both `VITE_API_URL` in `.env` and the proxy target in `vite.config.js`.
