# Enable noImplicitAny Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable `noImplicitAny: true` in `tsconfig.json` to enforce strict implicit any checks and fix any resulting compiler errors in the workspace.

**Architecture:** We will set `"noImplicitAny": true` in `tsconfig.json` and run the TypeScript compiler in dry-run mode (`tsc --noEmit`) to identify files containing type errors. We will then surgically resolve each compilation error by adding proper type annotations without changing runtime logic, and verify that the project builds and all tests pass.

**Tech Stack:** NestJS, TypeScript

---

### Task 1: Enable noImplicitAny in tsconfig.json

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Set noImplicitAny to true**
  Set `"noImplicitAny": true` under `"compilerOptions"` in `tsconfig.json`.

- [ ] **Step 2: Run tsc to verify errors**
  Run: `npx tsc --noEmit`
  Expected: Error output for files with implicit any (e.g. `src/modules/health/health.controller.spec.ts`).

- [ ] **Step 3: Commit tsconfig change**
  ```bash
  git add tsconfig.json
  git commit -m "config: enable noImplicitAny in tsconfig.json"
  ```

### Task 2: Resolve implicit any in health.controller.spec.ts

**Files:**
- Modify: `src/modules/health/health.controller.spec.ts`

- [ ] **Step 1: Annotate parameter c in checks.map**
  Change the map function to explicitly type `c` as `any` or a function type like `() => any`.
  
  ```typescript
  checks.map((c: () => any) => c())
  ```

- [ ] **Step 2: Verify type checking passes**
  Run: `npx tsc --noEmit`
  Expected: Command completes successfully with no output/errors.

- [ ] **Step 3: Run project build**
  Run: `pnpm.cmd build`
  Expected: Build succeeds.

- [ ] **Step 4: Run project tests**
  Run: `pnpm.cmd test`
  Expected: All unit tests pass.

- [ ] **Step 5: Commit changes**
  ```bash
  git add src/modules/health/health.controller.spec.ts
  git commit -m "test: fix implicit any in health controller unit test"
  ```
