# OPENCOCO

OPENCOCO is the open-source edition of CoCo: an AI-assisted video editing workspace built with a FastAPI backend, a Next.js frontend, and an Electron desktop shell. This repository is prepared for public development: local secrets, databases, logs, and build outputs are excluded from Git, and example environment files are included for each service.

## Repository Layout

- `backend/`: FastAPI API, auth, project storage, memberships, generation workflows
- `frontend/`: Next.js app UI
- `electron/`: desktop shell, bundling, auto-update integration

## Downloads

- Source code: available immediately from this repository via `git clone` or GitHub's `Download ZIP`
- Desktop application builds: available from GitHub Releases when maintainers publish tagged releases
- If the Releases page has no binaries yet, build locally by following the setup steps below

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



## Environment Files

- [backend/.env.example](backend/.env.example)
- [frontend/.env.example](frontend/.env.example)
- [cloudflare-service/.dev.vars.example](cloudflare-service/.dev.vars.example)

## License

This repository is released under the MIT License. See [LICENSE](LICENSE).
