# Design Spec: Continuous Integration (CI) Pipeline

## Goal
Implement a Continuous Integration (CI) pipeline using GitHub Actions to automatically lint and test code on every push and pull request targeting the `main` branch. This addresses the concern raised in `docs/codebase/CONCERNS.md` regarding the lack of automated checks on pull requests.

## Selected Approach
We are implementing **Approach 2: Parallel Jobs for Linting and Testing**.
- Run linting and testing checks in parallel on GitHub Actions using a Node 22 environment.
- Use `pnpm` as the package manager and leverage dependency caching.

## Detailed Design

### 1. GitHub Actions Workflow File (`.github/workflows/ci.yml`)
We will create a new workflow file at `.github/workflows/ci.yml` with the following configuration:

- **Name:** Continuous Integration
- **Triggers:**
  - `push` to `main`
  - `pull_request` targeting `main`
- **Jobs:**
  - `lint`:
    - OS: `ubuntu-latest`
    - Steps:
      - Checkout repository (`actions/checkout@v4`)
      - Install pnpm (`pnpm/action-setup@v3`) with version `10.34.1` (or latest v10)
      - Setup Node.js (`actions/setup-node@v4`) with Node v22 and pnpm caching enabled
      - Install dependencies (`pnpm install --frozen-lockfile`)
      - Run linter (`pnpm lint`)
  - `test`:
    - OS: `ubuntu-latest`
    - Steps:
      - Checkout repository (`actions/checkout@v4`)
      - Install pnpm (`pnpm/action-setup@v3`) with version `10.34.1` (or latest v10)
      - Setup Node.js (`actions/setup-node@v4`) with Node v22 and pnpm caching enabled
      - Install dependencies (`pnpm install --frozen-lockfile`)
      - Run unit tests (`pnpm test`) with `DATABASE_URL` environment variable mock value (e.g. `postgresql://postgres:postgres@localhost:5432/postgres`)

### 2. Codebase Concerns Update (`docs/codebase/CONCERNS.md`)
We will update the `No CI/CD pipeline` concern under **Top Risks** from unresolved to resolved status by applying a strikethrough.

## Verification & Acceptance Criteria
1. Lint and test scripts run successfully locally.
2. The `.github/workflows/ci.yml` is successfully configured and committed.
3. The workflow file is syntactically valid and ready to trigger on GitHub.
