# Continuous Integration (CI) Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Continuous Integration (CI) pipeline using GitHub Actions to automatically run lint and test suites on pushes and pull requests to main.

**Architecture:** Create a GitHub Actions workflow with parallel jobs for linting and testing using Node 22 and pnpm, enabling caching for faster workflow runs.

**Tech Stack:** GitHub Actions, Node.js, pnpm, ESLint, Jest

---

### Task 1: Configure CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the CI workflow file**

Write the following YAML structure to `.github/workflows/ci.yml`:

```yaml
name: Continuous Integration

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  lint:
    name: Run Linter
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 10.34.1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Linter
        run: pnpm lint

  test:
    name: Run Unit Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 10.34.1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
        run: pnpm test
```

- [ ] **Step 2: Verify the workflow file exists and is well-formatted**

Run in PowerShell:
```powershell
Test-Path .github/workflows/ci.yml
```
Expected: `True`

- [ ] **Step 3: Commit the CI workflow configuration**

Run:
```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for parallel lint and test jobs"
```

---

### Task 2: Resolve Concern in Documentation

**Files:**
- Modify: `docs/codebase/CONCERNS.md`

- [ ] **Step 1: Mark CI/CD concern as resolved**

Modify the table entry in `docs/codebase/CONCERNS.md` to reflect that the CI pipeline concern is resolved.

Target content at lines 10-12:
```markdown
| High | **Session validated on every request via DB query** — no cache | `src/common/guards/session.guard.ts` | Each authenticated request does 1 DB round-trip; won't scale | Add Redis or in-memory session cache, or sign sessions as JWTs |
| Low | **No CI/CD pipeline** | Scan output (no `.github/`, `.gitlab-ci.yml`, etc.) | No automated test/lint on pull requests | Set up GitHub Actions with lint + test steps |
```

Replacement content:
```markdown
| High | **Session validated on every request via DB query** — no cache | `src/common/guards/session.guard.ts` | Each authenticated request does 1 DB round-trip; won't scale | Add Redis or in-memory session cache, or sign sessions as JWTs |
| ~~Low~~ | ~~**No CI/CD pipeline**~~ | ~~Scan output (no `.github/`, `.gitlab-ci.yml`, etc.)~~ | ~~No automated test/lint on pull requests~~ | ~~Set up GitHub Actions with lint + test steps~~ **Resolved**: Added GitHub Actions workflow. |
```

- [ ] **Step 2: Commit the documentation update**

Run:
```bash
git add docs/codebase/CONCERNS.md
git commit -m "docs: resolve no CI/CD pipeline concern in codebase concerns"
```
