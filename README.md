# CoCo

CoCo is an AI-assisted video editing workspace with a FastAPI backend, a Next.js frontend, and an Electron desktop shell. This repository is prepared for public development: local secrets, databases, logs, and build outputs are excluded from Git, and example environment files are included for each service.

## Repository Layout

- `backend/`: FastAPI API, auth, project storage, memberships, generation workflows
- `frontend/`: Next.js app UI
- `electron/`: desktop shell, bundling, auto-update integration
- `cloudflare-service/`: optional email-code auth service for Cloudflare Workers
- `cloud-service/`: optional lightweight cloud auth service
- `license-server/`: optional licensing helper scripts and worker

## Quick Start

### 1. Install dependencies

```bash
# Backend
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt

# Frontend
cd frontend && npm install

# Electron
cd ../electron && npm install
```

### 2. Prepare environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
cp cloudflare-service/.dev.vars.example cloudflare-service/.dev.vars
```

Fill in only the variables you need. For a local-only setup, most optional cloud and payment variables can stay empty.

### 3. Start the app

Infrastructure-only setup:

```bash
./start.sh
```

Full desktop development flow:

```bash
./start-dev.sh
```

Manual web-only flow:

```bash
docker-compose up -d postgres redis
cd backend && .venv/bin/uvicorn main:app --reload
cd frontend && npm run dev
```

## Open Source Notes

- Review [OPEN_SOURCE_CHECKLIST.md](OPEN_SOURCE_CHECKLIST.md) before the first public push.
- `cloud-service/`, `cloudflare-service/`, and `license-server/` are optional. If you do not want to publish those parts, split them into private repositories before pushing to GitHub.
- Electron auto-update is disabled by default unless `GITHUB_RELEASE_OWNER` and `GITHUB_RELEASE_REPO` are configured in the runtime environment.
- Cloud auth is optional. If `CLOUD_AUTH_URL` or `NEXT_PUBLIC_CLOUD_AUTH_URL` is unset, the app falls back to local behavior.

## Environment Files

- [backend/.env.example](backend/.env.example)
- [frontend/.env.example](frontend/.env.example)
- [cloudflare-service/.dev.vars.example](cloudflare-service/.dev.vars.example)

## License

This repository is released under the MIT License. See [LICENSE](LICENSE).
