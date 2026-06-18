# Welcome Email Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the inline HTML email sent on user registration in `AuthService` into a dedicated Handlebars template `src/templates/welcome-email.hbs` for easier maintenance, styling, and architectural consistency.

**Architecture:** Use the existing Handlebars adapter in `@nestjs-modules/mailer` by configuring `nest-cli.json` to bundle `.hbs` templates in the compiled `dist` directory, then replace the inline `html` field in `AuthService` with `template` and `context` variables.

**Tech Stack:** NestJS, TypeScript, Handlebars, `@nestjs-modules/mailer`, Jest.

---

### Task 1: Configure Nest CLI to Copy Assets

**Files:**
- Modify: `nest-cli.json`

- [ ] **Step 1: Modify `nest-cli.json`**

Update `nest-cli.json` to add `"assets": ["templates/**/*"]` and `"watchAssets": true` to the `compilerOptions`.

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [
      "templates/**/*"
    ],
    "watchAssets": true
  }
}
```

- [ ] **Step 2: Run build to verify config compilation**

Run the build command in the terminal to verify the config format.
Run: `pnpm.cmd build`
Expected: Done without syntax or configuration errors.

- [ ] **Step 3: Commit changes**

Run:
```bash
git add nest-cli.json
git commit -m "chore: configure nest-cli to copy template assets"
```

---

### Task 2: Create Handlebars Welcome Email Template

**Files:**
- Create: `src/templates/welcome-email.hbs`

- [ ] **Step 1: Create the welcome email template file**

Create the Handlebars template at `src/templates/welcome-email.hbs` containing:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SyncFlow</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 570px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden; border-top: 4px solid #6366f1;" border="0" cellspacing="0" cellpadding="0">
          <!-- Header / Welcome -->
          <tr>
            <td style="padding: 40px 30px 20px 30px;">
              <h1 style="margin: 0 0 16px 0; color: #1f2937; font-size: 24px; font-weight: 700; line-height: 32px;">Welcome, {{name}}!</h1>
              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 24px;">Thank you for signing up for SyncFlow. Please click the button below to verify your email address and activate your account.</p>
            </td>
          </tr>
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 30px 30px 30px;">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #6366f1;">
                    <a href="{{verificationLink}}" target="_blank" style="display: inline-block; padding: 14px 30px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Verify Email</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Warning / Expiration -->
          <tr>
            <td style="padding: 0 30px 40px 30px; border-top: 1px solid #f3f4f6;">
              <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 14px; line-height: 20px; text-align: center;">This link expires in 24 hours.</p>
            </td>
          </tr>
        </table>
        <!-- Bottom Email Footer -->
        <table width="100%" style="max-width: 570px; margin-top: 20px;" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="color: #9ca3af; font-size: 12px; line-height: 18px;">
              &copy; 2026 SyncFlow. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

- [ ] **Step 2: Run build to verify compilation assets copy**

Compile the project and check if the template is successfully copied to the compiled output templates directory.
Run: `pnpm.cmd build`
Expected: Compilation completes successfully. Verify `dist/templates/welcome-email.hbs` exists.

- [ ] **Step 3: Commit changes**

Run:
```bash
git add src/templates/welcome-email.hbs
git commit -m "feat: create welcome-email handlebars template"
```

---

### Task 3: Integrate and Test AuthService Template Mail

**Files:**
- Modify: `src/modules/auth/auth.service.ts`
- Modify: `src/modules/auth/auth.service.spec.ts`

- [ ] **Step 1: Refactor `AuthService` register mail sending**

In `src/modules/auth/auth.service.ts`, replace lines 57-65 with the templated `sendMail` structure.

```typescript
        await this.mailerService.sendMail({
          to: user.email,
          subject: "Welcome to SyncFlow! Verify your Email",
          template: "welcome-email",
          context: {
            name: user.name,
            verificationLink,
          },
        });
```

- [ ] **Step 2: Update `AuthService` spec**

Open `src/modules/auth/auth.service.spec.ts` and verify if any tests assert parameters for `mailerService.sendMail`.
The existing mock for `mailerService` is:
```typescript
  const mockMailerService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };
```
No assertions are currently made on mockMailerService arguments, but let's add an assertion in the registration test to make sure it's called with the template and context arguments instead of inline HTML:

```typescript
    expect(mockMailerService.sendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      subject: "Welcome to SyncFlow! Verify your Email",
      template: "welcome-email",
      context: {
        name: "Test User",
        verificationLink: expect.stringContaining("http://localhost:3000/verify-email?token="),
      },
    });
```
We will modify the test block "should log the verification link as debug log on registration success" in `src/modules/auth/auth.service.spec.ts` to assert that `mailerService.sendMail` is invoked with the expected template options.

- [ ] **Step 3: Run tests to verify implementation**

Run: `pnpm.cmd test`
Expected: All tests pass, including the updated `AuthService` test.

- [ ] **Step 4: Build project**

Verify production build succeeds.
Run: `pnpm.cmd build`
Expected: Compilation completes successfully.

- [ ] **Step 5: Commit and finalize**

Run:
```bash
git add src/modules/auth/auth.service.ts src/modules/auth/auth.service.spec.ts
git commit -m "feat: integrate welcome-email template into AuthService and verify with tests"
```
