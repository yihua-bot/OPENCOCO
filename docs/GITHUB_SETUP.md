# GitHub Setup

This document is for maintainers preparing the public GitHub repository and the first downloadable release.

## Repository About

Recommended description:

`AI-assisted video editing workspace built with FastAPI, Next.js, and Electron.`

Recommended topics:

- `electron`
- `nextjs`
- `fastapi`
- `typescript`
- `python`
- `ai`
- `video-editing`
- `desktop-app`

## Source Code vs App Downloads

- Public repository visibility makes the source code downloadable immediately.
- End users can directly download runnable desktop builds only after a maintainer publishes release assets on the GitHub Releases page.
- Until release assets exist, users need to clone the repository and build locally.

## First Public Release

Suggested tag:

`v1.0.0`

Suggested release title:

`OPENCOCO v1.0.0`

Suggested release notes:

```md
## OPENCOCO v1.0.0

First public open-source release of OPENCOCO.

### Included
- Electron desktop shell
- Next.js frontend
- FastAPI backend
- public repository setup, example env files, and release workflow

### Notes
- Source code is available in this repository under the MIT License.
- Prebuilt desktop binaries are attached to this release when the GitHub Actions workflow completes successfully.
- If your platform asset is missing, you can still build locally using the instructions in `README.md`.
```

## Release Flow

After the repository looks correct on GitHub:

```bash
git checkout main
git pull --ff-only
git tag v1.0.0
git push origin v1.0.0
```

That tag triggers `.github/workflows/release.yml`, which publishes release assets to the current repository.

## Optional GitHub Settings

Recommended repository settings:

- enable Issues
- keep Actions enabled
- allow squash merge or rebase merge based on your preference
- auto-delete merged branches
