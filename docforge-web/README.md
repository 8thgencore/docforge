# DocForge Web

Frontend for DocForge API built with React, TypeScript, Vite, Tailwind CSS, and React Query.

## Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4
- React Router 7
- TanStack Query 5
- React Hook Form + Zod
- next-themes (light/dark/system)
- Vitest + Testing Library

## Run

```bash
pnpm install
pnpm dev
```

App defaults to API base URL `http://localhost:8300/v1`.

## Scripts

```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm typecheck
pnpm test
```

## Settings

Open `/settings` in the app and configure:

- API base URL
- `X-API-Key`

Both values are stored in `localStorage`.

## Optional env

You can pre-set API URL via env:

```bash
VITE_DOCFORGE_API_BASE_URL=http://localhost:8300/v1
```
