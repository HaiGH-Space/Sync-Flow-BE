# Design Spec: Refactoring Unstructured Logging

## 1. Goal
Replace occurrences of `console.log` and `console.error` with the built-in NestJS `Logger` class. This improves log structure and readability, aligns the services with existing gateways and cleanup services, and allows log levels (like debug/error) to be appropriately categorized.

## 2. Changes
We will instantiate the `Logger` using the class-property approach (Approach 1) to ensure consistency with the rest of the codebase (e.g., `SessionCleanupService`).

### Prisma Service (`src/database/prisma/prisma.service.ts`)
- Import `Logger` from `@nestjs/common`.
- Add `private readonly logger = new Logger(PrismaService.name);`.
- Replace `console.log("[🐛] Connected to the database");` with `this.logger.log("[🐛] Connected to the database");`.

### Auth Service (`src/modules/auth/auth.service.ts`)
- Import `Logger` from `@nestjs/common`.
- Add `private readonly logger = new Logger(AuthService.name);`.
- Replace `console.log("Verification Link:", verificationLink);` with `this.logger.debug(`Verification Link: ${verificationLink}`);`. This prevents leaking authentication links in standard production logs while preserving ease of local development.
- Replace `console.error("Register Error:", error);` with `this.logger.error("Register Error:", error instanceof Error ? error.stack : error);`.
- Replace `console.error("Error deleting session on logout:", error);` with `this.logger.error("Error deleting session on logout:", error instanceof Error ? error.stack : error);`.

## 3. Success Criteria
1. The project compiles successfully without any TypeScript or NestJS dependency injection errors.
2. All unit and end-to-end tests pass before and after the change.
3. No active `console.log` or `console.error` calls remain in the core codebase files (`src/`).
