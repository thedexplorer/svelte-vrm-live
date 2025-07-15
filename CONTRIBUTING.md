# Contributing to **Svelte-VRM-Live**

> Welcome, and thank you for taking the time to contribute! This guide explains the philosophy, workflow, and technical standards we follow. It is largely inspired by the fantastic [Ultralytics CONTRIBUTING.md](https://github.com/ultralytics/ultralytics/blob/main/CONTRIBUTING.md) and adapted to the specifics of a SvelteKit + Three.js (Threlte) project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Support Channels](#support-channels)
3. [Prerequisites](#prerequisites)
4. [Workflow Overview](#workflow-overview)
5. [Development Environment](#development-environment)
6. [Branching & Commit-Message Conventions](#branching--commit-message-conventions)
7. [Coding Guidelines](#coding-guidelines)
8. [Documentation Guidelines](#documentation-guidelines)
9. [Assets & Media](#assets--media)
10. [Testing](#testing)
11. [Performance & Quality Targets](#performance--quality-targets)
12. [Security Policy](#security-policy)
13. [Release Process](#release-process)
14. [License & CLA](#license--cla)
15. [Acknowledgements](#acknowledgements)

---

## Code of Conduct

We pledge to foster an open, welcoming, diverse, inclusive, and harassment-free community. All interactions are governed by the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct). Violations may be reported privately to **`maintainers@svelte-vrm-live.dev`**.

---

## Support Channels

• **GitHub Issues** — Bug reports & feature requests.
• **GitHub Discussions** — Questions, ideas, showcase.
• **Discord (#dev)** — Realtime help (invite link in the repo header).

Please search existing topics before opening new ones.

---

## Prerequisites

| Tool               | Version | Notes                                       |
| ------------------ | ------- | ------------------------------------------- |
| Node.js            | ≥ 18.x  | LTS recommended                             |
| pnpm               | ≥ 8.x   | **Required** — project uses pnpm workspaces |
| Git                | ≥ 2.40  | Enable commit signing if possible           |
| VS Code (optional) | latest  | Recommended editor w/ Svelte extension      |

> **Tip:** A ready-to-use **Dev Container**/GitHub Codespace is provided (`.devcontainer`).

---

## Workflow Overview

1. **Pick / propose an issue** → comment to avoid duplicate work.
2. **Fork** the repo & **create a feature branch** (`feat/<short-name>`).
3. **Develop** + **write/adjust tests & docs**.
4. Ensure **`pnpm lint test build`** passes locally.
5. **Commit** changes using [Conventional Commits](https://www.conventionalcommits.org) (see examples below).
6. **Push** and open a **Pull Request (PR)** against `main`.
7. **Sign the CLA** when prompted by the CLA bot.
8. Engage in review → get approvals → merge 🎉

---

## Development Environment

```bash
# 1️⃣ Clone **your fork**
$ git clone https://github.com/<you>/svelte-vrm-live.git && cd svelte-vrm-live

# 2️⃣ Install deps (syncs lockfile)
$ pnpm install

# 3️⃣ Run the dev server
$ pnpm dev      # open http://localhost:5173

# 4️⃣ Run linters & tests continuously (optional)
$ pnpm lint:watch & pnpm test --watch
```

### Recommended VS Code Extensions

- **Svelte for VS Code** – syntax + diagnostics
- **ESLint** / **Prettier** – auto-format on save
- **tailwindcss** – class name IntelliSense

---

## Branching & Commit-Message Conventions

### Branch Naming

```
feat/<scope>     # new feature
fix/<scope>      # bug fix
chore/<scope>    # tooling, CI, docs-only, cleanup
refactor/<scope> # non-breaking restructures
```

### Conventional Commits

Format: `type(scope)!?: subject`

Examples:

- `feat(chat): add emoji reactions`
- `fix(tts): correct phoneme timing off-by-1`
- `refactor(scene)!: migrate to Threlte @v6` _(breaking change)_

> Commits are auto-squashed into the PR title during merge.

---

## Coding Guidelines

### General

- **TypeScript** everywhere with `strict` mode.
- Prefer **functional, composable** helpers.
- Avoid hard-coding secrets; use `.env` vars and **never commit real keys**.

### Formatting & Linting

- **Prettier** for formatting (see `.prettierrc`).
- **ESLint** + `@sveltejs/eslint-plugin-svelte` for lint rules.
- Auto-fix: `pnpm lint`.

### Svelte/Threlte Best Practices

- Use **Svelte Runes** (`$state`, `@effect`) over `onMount` where possible.
- Dispose Three.js resources in `onDestroy` to prevent GPU memory leaks.
- Keep component props **serializable** (no class/object instances).

### Project Structure

```
src/
  lib/        # reusable libraries (animation, audio, llm, etc.)
  routes/     # +page.svelte, API endpoints
  static/     # public assets: models/, animations/, textures/
```

---

## Documentation Guidelines

- Public APIs must have **TSDoc/JSDoc** comments.
- Complex algorithms require inline explanatory comments.
- For user-facing changes update `README.md` or create a doc under `docs/`.
- Diagrams? Use **Mermaid** inside markdown.

---

## Assets & Media

### 3D Models

1. Place `.vrm` or `.glb` under `static/models/`.
2. Ensure license permits redistribution; add a `LICENSE.txt` alongside.
3. Optimize: ❬50k tris, ≤ 20 MiB, Draco compression preferred.

### Animations

- Raw `.fbx` → `static/animations/`.
- Name files in **kebab-case**.
- Run `pnpm mixamo:remap <file.fbx>` to generate retargeted `.anim.json` compatible with VRM.

### Images/Textures

- Use `.webp` where possible.
- Large textures (≥2 k) must be mip-mapped or down-scaled.

---

## Testing

| Layer            | Tool       | Command     |
| ---------------- | ---------- | ----------- |
| Lint             | ESLint     | `pnpm lint` |
| Unit & Component | Vitest     | `pnpm test` |
| API Endpoints    | Supertest  | `pnpm test` |
| E2E (planned)    | Playwright | `pnpm e2e`  |

All new logic must be covered by unit or integration tests with ≥ 80 % line coverage.

---

## Performance & Quality Targets

- **FPS:** ≥ 60 @ 1080p (desktop), ≥ 30 @ 720p (mobile).
- **Initial Load:** ≤ 3 s on cable connection.
- **Bundle Size:** ≤ 2 MiB compressed (`vite build --report`).
- **Memory:** ≤ 500 MiB browser memory after 5 min idle.

Use `browser-perf` & Chrome DevTools to profile heavy changes.

---

## Security Policy

Found a vulnerability? Please **DO NOT** open a public issue. Email **security@svelte-vrm-live.dev** with details. We follow [responsible disclosure](https://en.wikipedia.org/wiki/Responsible_disclosure): you’ll receive an acknowledgment within 72 h and a fix ETA.

---

## Release Process

1. All merged PRs trigger **`release-please`** to draft a new version.
2. Maintainers review the changelog.
3. Tag & GitHub Release are published.
4. Cloudflare Pages build is deployed automatically.

---

## License & CLA

- Code is licensed under **GNU AGPL v3.0**. By contributing you agree that **your contribution is distributed under the same license**.
- A signed **Contributor License Agreement (CLA)** is **mandatory**. Our [CLA Assistant](https://github.com/cla-assistant/github-action) will comment on your PR with instructions (type `I have read the CLA Document and I hereby sign the CLA`).

---

## Acknowledgements

This guide borrows structure and inspiration from the [Ultralytics YOLO CONTRIBUTING.md](https://github.com/ultralytics/ultralytics/blob/main/CONTRIBUTING.md) and the GoogleCloudPlatform community templates. ❤️

Happy hacking! ✨
