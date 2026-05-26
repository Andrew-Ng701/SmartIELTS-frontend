<p align="right">
  <a href="./README.md"><img alt="English README" src="https://img.shields.io/badge/README-ENGLISH-111827?style=for-the-badge&labelColor=555555"></a>
  <a href="./README.zh-TW.md"><img alt="Traditional Chinese README" src="https://img.shields.io/badge/README-%E7%B9%81%E9%AB%94%E4%B8%AD%E6%96%87-2563eb?style=for-the-badge&labelColor=555555"></a>
</p>

<h1 align="center">SmartIELTS Frontend</h1>

<p align="center">
  <strong>Complete frontend source repository for the SmartIELTS platform</strong><br>
  React single-page application for students, administrators, records, profile, dashboard AI, and the Speaking examiner UI.
</p>

<p align="center">
  <strong>React 19</strong> · <strong>TypeScript 5.8</strong> · <strong>Vite 7</strong> · <strong>Tailwind CSS v4</strong> · <strong>Vitest</strong>
</p>

---

## 1. Repository Purpose

**`SmartIELTS-frontend` is the dedicated frontend repository.**

This repository contains the complete SmartIELTS frontend source code, frontend documentation, frontend deployment guide, environment variable example, and frontend-side API integration notes.

The frontend is responsible for:

- Public website, landing page, FAQ, and login-required pages.
- Student dashboard and learning console.
- User-facing Reading, Listening, Writing, and Speaking practice flows.
- Profile, settings, records, and record detail pages.
- Admin console, admin users, admin records, and admin content authoring UI.
- Floating AI Agent drawer and dashboard ask flows.
- Same-origin D-ID Speaking examiner iframe host.
- Frontend API client, TypeScript contracts, view-model mapping, UI validation, and upload orchestration.

The frontend is **not** responsible for:

- Backend API implementation.
- Database schema or migration.
- JWT issuing or server-side token invalidation.
- Final authorization decisions.
- IELTS scoring, AI scoring, record ownership, or status transitions.
- Backend transaction consistency.

Those responsibilities belong in `SmartIELTS-backend`.

## 2. Repository Split

SmartIELTS is organized into three repositories.

| Repository | Contains actual code | Main contents | Should not contain |
| --- | --- | --- | --- |
| **`SmartIELTS-frontend`** | **Yes, frontend code** | React/Vite/TypeScript source, frontend README, frontend deployment guide, `.env.example`, frontend tests, frontend docs | Backend source code, DB migrations, server implementation |
| **`SmartIELTS-backend`** | **Yes, backend code** | Backend source code, backend README, API docs, DB migrations, backend deployment guide, server configuration | React frontend implementation |
| **`SmartIELTS`** | **No application source code** | Overview README, architecture diagram, frontend/backend startup guide, deployment flow, environment requirements, repo links, demo screenshots, API contract entry point | Frontend `src/`, backend implementation, duplicated application source |

Recommended workflow:

- Develop frontend features in `SmartIELTS-frontend`.
- Develop backend features in `SmartIELTS-backend`.
- Maintain cross-project overview, screenshots, architecture diagrams, and repo links in `SmartIELTS`.

## 3. Tech Stack

| Area | Technology |
| --- | --- |
| App framework | React 19 |
| Language | TypeScript 5.8 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 through `@tailwindcss/vite` |
| Test runner | Vitest |
| Package manager | npm with `package-lock.json` |
| App style | Single-page frontend with browser-history-backed page state |
| API integration | Typed wrappers in `src/api`, backend contracts in `src/contracts` |

## 4. Current Frontend Scope

### 4.1 Public Pages

- Landing page.
- FAQ page.
- Login-required page.
- Public header, module dropdown, and mobile navigation.

### 4.2 Authentication

- Login and register UI.
- JWT session storage helper.
- Password change UI.
- HTTP 401 cleanup callback.
- Environment-gated preview auth fallback for local UI inspection.

### 4.3 User Console

- User dashboard snapshot.
- Active and deleted records summary.
- Overall average.
- Module target bands.
- Module stats.
- Score radar, score trend, and module activity.
- Dashboard insights.

### 4.4 User Practice And Records

- Reading and Listening practice entry and workspace.
- Writing submission UI.
- Speaking same-origin iframe examiner page.
- Unified records hub.
- Record detail review.
- Delete and restore UI orchestration where supported by backend APIs.

### 4.5 Profile And Settings

- Account details.
- Display name.
- Profile picture upload.
- Reading, Listening, Writing, and Speaking target bands.
- Password change.

### 4.6 Admin Console

- Admin overview.
- Admin users.
- Admin user detail and user-scoped records.
- Admin records.
- Admin Reading and Listening test authoring.
- Admin Writing authoring.
- Admin Speaking authoring.
- Deleted item views for supported admin content.

### 4.7 Dashboard AI Agent

- Floating AI Agent launcher.
- Drawer chat UI.
- Quick prompts.
- Ask API integration.
- SSE-first response handling with fallback.
- Executive summary badge.

## 5. Project Structure

ASCII tree is used to avoid terminal encoding issues.

```text
.
|-- public/
|   `-- did-speaking-frame.html
|-- src/
|   |-- api/
|   |-- app/
|   |-- assets/
|   |-- components/
|   |-- contracts/
|   |-- features/
|   |   |-- admin/
|   |   |-- auth/
|   |   |-- dashboard-agent/
|   |   |-- public/
|   |   `-- user/
|   |-- hooks/
|   |-- lib/
|   |-- types/
|   |-- App.tsx
|   |-- main.tsx
|   `-- styles.css
|-- docs/
|   `-- frontend/
|       |-- backend-overview.md
|       `-- frontend-overview.md
|-- scripts/
|-- .env.example
|-- package.json
|-- package-lock.json
|-- vite.config.ts
|-- tsconfig.json
|-- tsconfig.app.json
|-- tsconfig.node.json
`-- README.md
```

| Path | Purpose |
| --- | --- |
| `src/app` | App bootstrap, route constants, navigation constants, shell, runtime config |
| `src/api` | API client, endpoint wrappers, errors, API contract tests |
| `src/contracts` | Backend-facing TypeScript DTO/query/VO contracts; backend field names are preserved |
| `src/features/auth` | Login, register, settings, auth session helper |
| `src/features/user` | User console, profile, records, practice, reading, listening, writing, speaking |
| `src/features/admin` | Admin console, users, records, and content management |
| `src/features/dashboard-agent` | AI Agent drawer, ask/preload/SSE/executive summary boundary |
| `src/components` | Shared non-feature UI, exam renderer, audio control |
| `src/hooks` | Shared React hooks |
| `src/lib` | Framework-agnostic helpers, validation, asset URL helpers |
| `public/did-speaking-frame.html` | Same-origin D-ID Speaking examiner iframe page |
| `docs/frontend/frontend-overview.md` | Frontend architecture and implementation map |
| `scripts/e2e-api-smoke.ps1` | API smoke check helper script |

## 6. Local Requirements

Required tools:

- Node.js compatible with Vite 7.
- npm.
- Git.
- PowerShell for Windows local development.

Backend requirement:

```text
http://localhost:8080
```

Local API base URL:

```text
http://localhost:8080/api
```

Vite development proxy:

```text
/api -> http://localhost:8080
```

## 7. Installation

```powershell
npm install
```

For CI or production builds:

```bash
npm ci
```

## 8. Environment Variables

Create a local `.env` from `.env.example` when needed:

```powershell
Copy-Item .env.example .env
```

Current `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_DID_SCRIPT_SRC=https://agent.d-id.com/v2/index.js
VITE_DID_CLIENT_KEY=
VITE_DID_AGENT_ID=
VITE_ENABLE_PREVIEW_AUTH=false
```

| Variable | Required | Local example | Production guidance |
| --- | --- | --- | --- |
| **`VITE_API_BASE_URL`** | **Yes** | `http://localhost:8080/api` | Use the production backend API base URL, for example `https://api.example.com/api`, or use a same-domain `/api` reverse proxy |
| **`VITE_DID_SCRIPT_SRC`** | Required for Speaking examiner | `https://agent.d-id.com/v2/index.js` | Usually keep the official D-ID script URL unless D-ID changes the integration endpoint |
| **`VITE_DID_CLIENT_KEY`** | Required for Speaking examiner | Empty or test key | Configure in the hosting platform; do not commit real credentials |
| **`VITE_DID_AGENT_ID`** | Required for Speaking examiner | Empty or test agent ID | Configure in the hosting platform; do not commit real agent IDs |
| **`VITE_ENABLE_PREVIEW_AUTH`** | Optional | `false` | Must remain `false` in production |

Security notes:

- Do not commit `.env`.
- Do not place server secrets in `VITE_*` variables.
- Vite exposes all `VITE_*` variables to browser code.
- Production credentials should be injected by the hosting platform.

## 9. Common Commands

| Command | Purpose | Use case |
| --- | --- | --- |
| `npm.cmd run dev` | Start Vite dev server | Local development on Windows |
| `npm.cmd run build` | Type-check and production build | Before deployment or commit |
| `npm.cmd run preview` | Preview built output | Production-like local check |
| `npm.cmd run test` | Run Vitest tests | Before commit or CI |

Linux/macOS equivalents:

```bash
npm run dev
npm run build
npm run preview
npm run test
```

## 10. Local Development

Start the backend from `SmartIELTS-backend` first.

Then start the frontend:

```powershell
npm.cmd run dev
```

Default frontend URL:

```text
http://127.0.0.1:5173
```

Frontend browser code usually calls:

```text
/api/...
```

Vite forwards those requests to:

```text
http://localhost:8080/api/...
```

Preview auth can be enabled only for local UI inspection:

```env
VITE_ENABLE_PREVIEW_AUTH=true
```

Production must use:

```env
VITE_ENABLE_PREVIEW_AUTH=false
```

## 11. Tests And Verification

Run tests:

```powershell
npm.cmd run test
```

Current tests focus on:

- API client `Result<T>` parsing.
- API endpoint wrapper behavior.
- Auth session helper.
- App route definitions.
- User dashboard mapping.
- User records and record detail mapping.
- Admin overview, users, and records mapping.
- Reading, Listening, Writing, and Speaking model helpers.
- Form and file validation.

Production build:

```powershell
npm.cmd run build
```

Build output:

```text
dist/
```

Preview the production build:

```powershell
npm.cmd run preview
```

## 12. Frontend Deployment

SmartIELTS Frontend is a static Vite frontend. The deployable artifact is:

```text
dist/
```

Standard deployment flow:

1. Configure production environment variables in the hosting platform.
2. Install dependencies.
3. Run the production build.
4. Publish `dist/` as static assets.
5. Configure SPA fallback to `index.html`.
6. Configure `/api` reverse proxy or set `VITE_API_BASE_URL` to the backend API URL.
7. Configure backend CORS allowed origins if frontend and backend are on different domains.
8. Configure D-ID allowed domain if the Speaking examiner is enabled.
9. Verify login, dashboard, records, profile, admin console, AI Agent, and Speaking iframe.

Linux build example:

```bash
npm ci
npm run build
```

Windows build example:

```powershell
npm ci
npm.cmd run build
```

Publish directory:

```text
dist
```

SPA fallback:

```text
/* -> /index.html
```

API routing:

```text
/api/* -> SmartIELTS backend service
```

## 13. Nginx Example

This is a minimal concept. Production should add the correct domain, TLS, cache policy, compression, security headers, and upstream configuration.

```nginx
server {
  listen 80;
  server_name your-domain.com;

  root /var/www/smartielts-frontend/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://smartielts-backend:8080/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 14. Static Hosting / CDN Notes

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Install command | `npm ci` |
| Output directory | `dist` |
| SPA fallback | Route frontend paths to `/index.html` |
| API | Reverse proxy `/api` or configure `VITE_API_BASE_URL` |

After deployment, check:

- Direct open `/` works.
- Direct refresh of dashboard/user/admin pages does not return 404.
- `/api` requests reach the correct backend.
- Login adds `Authorization: Bearer <token>`.
- HTTP 401 clears frontend session.
- D-ID Speaking iframe does not produce `origin null`.

## 15. API Integration Boundary

Frontend API base path:

```text
/api
```

Shared backend response envelope:

```ts
type Result<T> = {
  code: 0 | 1;
  msg: string | null;
  data: T;
};
```

Frontend interpretation:

| Condition | Behavior |
| --- | --- |
| `code === 1` | Business success |
| `code === 0` | Business failure; show or propagate `msg` |
| HTTP `401` | Clear token/session and return to login |
| Multipart upload | Do not manually set `Content-Type`; let the browser set the boundary |

## 16. Auth Behavior

Frontend session helper:

```text
src/features/auth/authSession.ts
```

Login success stores:

- JWT token.
- userId.
- role.
- tokenExpiresIn.
- refreshAfterSeconds.

Subsequent request header:

```http
Authorization: Bearer <token>
```

Rules:

- `/api/user/**` requires USER.
- `/api/admin/**` requires ADMIN.
- `POST /api/auth/logout` invalidates the token.
- `PUT /api/auth/password` clears the frontend session after success.
- Do not reuse old tokens after logout or password change.

## 17. Speaking D-ID Examiner

The Speaking examiner uses a public static file:

```text
public/did-speaking-frame.html
```

React loads it through:

```text
/did-speaking-frame.html
```

Do not replace this with:

- `srcdoc`
- `blob:`
- `data:`
- `file:`
- React-rendered iframe content

Reasons:

- D-ID allowed domain checks require a normal same-origin page.
- `origin null` can break D-ID integration.
- React StrictMode can affect script lifecycle.

## 18. Frontend / Backend Responsibility Boundary

Frontend owns:

- UI rendering.
- User input collection.
- Local interaction state.
- Form UX validation.
- Upload UX.
- Request orchestration.
- Loading, empty, and error UI.
- API response mapping to view models.
- Browser route/page state.

Backend owns:

- Authentication validation.
- Authorization and permissions.
- Persistence.
- ID and timestamp generation.
- Ownership checks.
- IELTS scoring and AI scoring.
- Status transitions.
- Transaction consistency.
- Token invalidation.

## 19. Pre-Push Checklist

```powershell
npm.cmd run test
npm.cmd run build
git status --short --branch
```

Confirm:

- README and `.env.example` are synchronized.
- `docs/frontend/frontend-overview.md` is updated if architecture, routes, API boundaries, or deployment behavior changed.
- `.env` is not committed.
- Production secrets are not committed.
- User-facing UI does not contain admin-only actions.
- Admin-facing UI does not contain user practice flows.
- Backend contract field names are preserved.

## 20. Release Checklist

| Check | Expected |
| --- | --- |
| Tests | `npm.cmd run test` passes |
| Build | `npm.cmd run build` passes |
| Environment | Production variables are configured |
| Preview auth | `VITE_ENABLE_PREVIEW_AUTH=false` |
| API | Backend URL or `/api` proxy works |
| CORS | Backend allows the frontend origin when needed |
| SPA fallback | Direct route refresh does not 404 |
| Auth | Login/logout/password-change behavior is verified |
| User flow | Dashboard, profile, records, and module entries are verified |
| Admin flow | Admin console, users, records, and content pages are verified |
| D-ID | Speaking iframe loads with a valid origin |
| HTTPS | Production domain uses HTTPS |

## 21. Main Repository Relationship

The main `SmartIELTS` repository should contain only cross-project overview content:

- Overall project README.
- Architecture diagram.
- Frontend repository link.
- Backend repository link.
- Local startup guide for both frontend and backend.
- Deployment flow overview.
- Environment requirements.
- Demo screenshots.
- API contract entry point.

The main repository should not duplicate this frontend source code.

## 22. Related Documents

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Project working rules, boundaries, testing, and Git rules |
| `docs/frontend/frontend-overview.md` | Frontend architecture and implementation map |
| `docs/frontend/backend-overview.md` | Backend-facing reference kept in the frontend workspace |
| `.env.example` | Frontend environment variable template |
| `vite.config.ts` | Vite plugins, port, and local proxy |
| `package.json` | Scripts and dependencies |

## 23. Quick Start

```powershell
npm install
Copy-Item .env.example .env
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173
```

Before pushing:

```powershell
npm.cmd run test
npm.cmd run build
git status --short --branch
```
