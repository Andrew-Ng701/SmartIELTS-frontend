# SmartIELTS Frontend

SmartIELTS Frontend is the React single-page application for the SmartIELTS platform. This repository contains the complete frontend source code, frontend README, deployment notes, environment variable examples, and frontend-side API integration boundaries.

The frontend is responsible for the public website, student console, IELTS practice flows, profile and records UI, admin console UI, dashboard AI drawer, and the same-origin D-ID Speaking examiner iframe host. Backend business rules, authentication validation, scoring, persistence, permissions, and database migration live in the backend repository.

## Repository Roles

SmartIELTS is split into three repositories:

| Repository | Purpose |
| --- | --- |
| `SmartIELTS-frontend` | Frontend complete source code, frontend README, frontend deployment guide, environment variable examples. |
| `SmartIELTS-backend` | Backend complete source code, backend README, API documents, DB migrations, backend deployment guide. |
| `SmartIELTS` | Main overview repository only. It should not contain actual frontend/backend source code. It should contain the overall README, architecture diagram, frontend/backend startup guide, deployment flow, environment requirements, repository links, demo screenshots, and API contract entry point. |

This repository should only maintain frontend deliverables. Put backend code, API implementation, DB migration, and server deployment details in `SmartIELTS-backend`. Put cross-project overview content in `SmartIELTS`.

## Tech Stack

- React 19
- TypeScript 5.8
- Vite 7
- Tailwind CSS v4 through `@tailwindcss/vite`
- Vitest for focused frontend contract/model tests
- npm with `package-lock.json`

## Project Structure

```text
.
├── public/
│   └── did-speaking-frame.html
├── src/
│   ├── api/
│   ├── app/
│   ├── components/
│   ├── contracts/
│   ├── features/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── dashboard-agent/
│   │   ├── public/
│   │   └── user/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── docs/frontend/
│   ├── frontend-overview.md
│   └── backend-overview.md
├── scripts/
├── .env.example
├── package.json
├── vite.config.ts
└── README.md
```

Important frontend documents:

- `AGENTS.md`: project-specific development rules and frontend/backend responsibility boundaries.
- `docs/frontend/frontend-overview.md`: current frontend architecture, API integration status, and feature ownership.
- `api-contract.md - 快捷方式.lnk`: local shortcut to the backend-owned API contract reference.

## Requirements

- Node.js compatible with Vite 7.
- npm.
- SmartIELTS backend running locally when testing API-backed flows.

Recommended local backend URL:

```text
http://localhost:8080
```

The Vite development server proxies `/api` to `http://localhost:8080`.

## Installation

```powershell
npm install
```

## Environment Variables

Create a local `.env` file from `.env.example` when needed:

```powershell
Copy-Item .env.example .env
```

Current example:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_DID_SCRIPT_SRC=https://agent.d-id.com/v2/index.js
VITE_DID_CLIENT_KEY=
VITE_DID_AGENT_ID=
VITE_ENABLE_PREVIEW_AUTH=false
```

Variable explanations:

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | Frontend API base URL. Local development uses `http://localhost:8080/api`. Browser requests can also use `/api/...` through the Vite proxy. |
| `VITE_DID_SCRIPT_SRC` | Required for D-ID examiner | D-ID agent script URL loaded by `public/did-speaking-frame.html`. Keep the default D-ID script URL unless D-ID changes the integration endpoint. |
| `VITE_DID_CLIENT_KEY` | Required for D-ID examiner | D-ID client key. Do not commit real production credentials into Git. Configure it in the deployment platform environment instead. |
| `VITE_DID_AGENT_ID` | Required for D-ID examiner | D-ID agent ID used by the Speaking examiner iframe page. |
| `VITE_ENABLE_PREVIEW_AUTH` | Optional | Enables local preview login fallback for `user` and `admin` demo entries. Keep `false` for production builds. |

Security notes:

- Do not commit `.env` or production secrets.
- Vite exposes all `VITE_*` variables to browser code. Treat them as public client-side configuration.
- Real authentication, authorization, score calculation, record ownership, and status transitions must remain backend-owned.

## Local Development

Start the frontend development server:

```powershell
npm.cmd run dev
```

Default frontend URL:

```text
http://127.0.0.1:5173
```

During development:

- Frontend code calls `/api/...` for backend requests.
- `vite.config.ts` proxies `/api` to `http://localhost:8080`.
- The backend must be running for real login, dashboard, records, profile, admin, and module API flows.
- Preview auth can be enabled only for local UI inspection by setting `VITE_ENABLE_PREVIEW_AUTH=true`.

## Build

Run the production build:

```powershell
npm.cmd run build
```

Build output is generated in:

```text
dist/
```

The build command runs TypeScript project build first, then Vite production bundling:

```text
tsc -b && vite build
```

## Preview Production Build

```powershell
npm.cmd run preview
```

This serves the generated `dist/` output locally for a production-like check.

## Tests

Run frontend tests:

```powershell
npm.cmd run test
```

Current tests focus on:

- API client `Result<T>` parsing behavior.
- Auth/session helpers.
- Route definitions.
- User/admin console and records mapping.
- Reading/Listening/Writing/Speaking model helpers.
- Shared form and file validation helpers.

## Frontend Deployment

This is a static Vite frontend. A normal deployment flow is:

1. Configure production environment variables in the hosting platform.
2. Install dependencies with `npm ci`.
3. Build with `npm.cmd run build` on Windows or `npm run build` on Linux.
4. Publish the `dist/` directory as static assets.
5. Configure SPA fallback so all frontend routes serve `index.html`.
6. Configure backend API routing or reverse proxy for `/api`.
7. Verify login, dashboard, records, profile, admin console, AI Agent drawer, and Speaking iframe after deployment.

Example build commands for a Linux-based host:

```bash
npm ci
npm run build
```

Static publish directory:

```text
dist
```

SPA fallback requirement:

```text
/* -> /index.html
```

API routing requirement:

```text
/api/* -> SmartIELTS backend service
```

Production environment checklist:

- `VITE_API_BASE_URL` points to the deployed backend API base URL.
- `VITE_ENABLE_PREVIEW_AUTH=false`.
- D-ID variables are configured if Speaking examiner is enabled.
- The backend allows the deployed frontend origin in CORS settings.
- The D-ID allowed domain includes the deployed frontend domain.
- HTTPS is enabled for production.

## API Integration Boundary

The frontend API base path is `/api`. API wrappers live in `src/api`, and backend-facing DTO/query/VO types live in `src/contracts`.

The shared backend response envelope is:

```ts
type Result<T> = {
  code: 0 | 1;
  msg: string | null;
  data: T;
};
```

Frontend success/failure rules:

- `code === 1`: business success.
- `code === 0`: business failure; show or propagate `msg`.
- HTTP `401`: clear frontend auth session and return the user to login.
- Multipart uploads must let the browser set `Content-Type` and boundary automatically.

Do not move backend-owned responsibilities into the frontend. The backend owns scoring, permissions, persistence, IDs, timestamps, record ownership, AI results, token invalidation, and status transitions.

## Speaking D-ID Examiner

The Speaking examiner is hosted by:

```text
public/did-speaking-frame.html
```

React loads it through:

```text
/did-speaking-frame.html
```

Keep this page as a public same-origin static file. Do not replace it with `srcdoc`, `blob:`, `data:`, `file:`, or a React-rendered iframe, because D-ID domain checks and browser origin behavior can break.

## Deployment Notes By Platform

### Static hosting or CDN

- Build command: `npm run build`
- Publish directory: `dist`
- Add SPA fallback to `/index.html`
- Route `/api` to the backend service or set `VITE_API_BASE_URL` to the backend API URL

### Nginx

Minimal production concept:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}

location /api/ {
  proxy_pass http://smartielts-backend:8080/api/;
}
```

Adjust domain, TLS, backend upstream, headers, and cache policy for the real environment.

## Git And Release Checklist

Before pushing frontend changes:

```powershell
npm.cmd run test
npm.cmd run build
git status --short --branch
```

For a frontend release:

1. Confirm `.env.example` documents every required frontend variable.
2. Confirm `docs/frontend/frontend-overview.md` is updated if architecture, API boundaries, routes, or deployment behavior changed.
3. Run tests and build.
4. Commit frontend-only changes to `SmartIELTS-frontend`.
5. Push to the expected branch.
6. Update the main `SmartIELTS` repository overview if repo links, screenshots, architecture diagrams, or cross-project startup steps changed.

## Related Repositories

Add the final repository URLs in the main `SmartIELTS` overview repository. Suggested entries:

- `SmartIELTS`: main overview repository.
- `SmartIELTS-frontend`: this frontend repository.
- `SmartIELTS-backend`: backend repository.

## Current Scripts

| Command | Purpose |
| --- | --- |
| `npm.cmd run dev` | Start Vite development server. |
| `npm.cmd run build` | Type-check and build production assets. |
| `npm.cmd run preview` | Preview the production build locally. |
| `npm.cmd run test` | Run Vitest tests. |

