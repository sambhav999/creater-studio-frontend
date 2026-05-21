# Frontend Integration

The frontend is a standalone Vite app that talks to the backend API.

## Development Flow

```text
Template gallery
  -> Studio controls
  -> API package generation
  -> Three.js preview
  -> Export or AI refinement
```

## API Configuration

The frontend uses:

```text
VITE_API_URL=http://localhost:3001
```

During local development, `vite.config.js` also proxies `/api` requests to the backend:

```text
/api -> http://localhost:3001
```

Keep these values aligned with the backend `PORT`.

## Template Export

The template sidebar exposes an `All` export action. It downloads the backend template pack from:

```text
GET /api/templates/export
```

The exported JSON includes template metadata, difficulty tuning, theme presets, control schemes, scoring specs, collision specs, procedural asset manifests, and AI refinement prompt packs.
