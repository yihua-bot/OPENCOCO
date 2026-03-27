# Open Source Checklist

Use this checklist before pushing the repository to a public GitHub repo.

## Delete or keep out of Git

These files and directories are local-only and should not be committed:

- `backend/.env`
- `frontend/.env.local`
- `cloudflare-service/.dev.vars`
- `coco.db`
- `backend/coco.db`
- `electron/coco.db`
- `logs/`
- `uploads/`
- `backend/uploads/`
- `electron/uploads/`
- `build/`
- `frontend/.next/`
- `electron/dist/`
- `electron/dist-electron/`
- `cloudflare-service/.wrangler/`
- `node_modules/` in any subproject
- `.DS_Store`

Also remove accidental junk files before publishing. In this repo, the `electron/` directory currently contains suspicious files with shell-output-looking names that should be reviewed and deleted if they are not intentionally needed.

## Keep in Git

These are good candidates to keep public:

- Source code in `backend/`, `frontend/`, `electron/`, `cloud-service/`, `cloudflare-service/`, and `license-server/`
- Dockerfiles and compose setup
- Example env files such as `backend/.env.example`, `frontend/.env.example`, and `cloudflare-service/.dev.vars.example`
- Product and architecture docs, after removing private URLs or credentials

## Review before publishing

These files still deserve a quick review even after the repository cleanup:

- `electron/package.json`
  - Confirm the remaining build metadata matches the public project you want to ship.
- `electron/src/main.ts`
  - Auto-update now depends on runtime env values. Confirm that behavior matches how you want public releases to work.
- `cloudflare-service/wrangler.toml`
  - Replace placeholder D1 and KV IDs with your own before deployment.
- `backend/config.py`
  - Defaults were changed to safer placeholders. Fill in only the production values you actually need.
- Deployment docs under `cloudflare-service/`
  - May expose private worker URLs and operational details.

## Manual decisions you should make

- Decide whether `cloud-service/` and `license-server/` should really be public. If they contain business logic you do not want forked, split them into a separate private repo before open sourcing.
- Decide whether payment, licensing, and membership features should stay enabled in the public version or be extracted behind interfaces.

## If secrets were ever committed before

Ignoring files is not enough if they already entered Git history. Before going public:

1. Run `git log --stat -- backend/.env frontend/.env.local cloudflare-service/.dev.vars '*.db' logs/ build/`.
2. If any secret or local database was committed, rotate the secret first.
3. Rewrite history with `git filter-repo` or BFG before publishing the public repo.

## Recommended preflight

Run these checks before the first public push:

1. `git status --short`
2. `git diff -- .gitignore backend/.env.example frontend/.env.example cloudflare-service/.dev.vars.example`
3. `rg -n --hidden --glob '!.git' --glob '!**/node_modules/**' '(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE KEY)' .`
4. `git add -n .`

If `git add -n .` shows local env files, databases, logs, or build artifacts, stop and fix the ignore rules first.
