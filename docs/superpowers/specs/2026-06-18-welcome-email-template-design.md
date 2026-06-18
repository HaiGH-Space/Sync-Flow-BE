# Design Spec: Welcome Email Handlebars Template

## Background
In `AuthService`, welcome email is sent to the registered user using an inline HTML body. This inline layout is hard to maintain, style, and scale, and is inconsistent with the Handlebars template engine that is already configured under `MailModule`.

## Goals
- Remove inline HTML mail body from `src/modules/auth/auth.service.ts`.
- Create a reusable, modern, and beautiful `welcome-email.hbs` template in `src/templates/`.
- Configure `nest-cli.json` to copy templates folder from `src/templates` to `dist/templates` during the NestJS build process.
- Update `AuthService` to call `mailerService.sendMail` using the new Handlebars template name and passing proper context data.
- Ensure that unit tests pass successfully.

---

## 1. File Structure & Template Content

### New File: `src/templates/welcome-email.hbs`
This file will contain the Handlebars template with placeholders for dynamic data:
- `{{name}}`
- `{{verificationLink}}`

The layout will be a clean, modern card-based design with an indigo accent header bar (`#6366f1`), optimized for cross-client compatibility using tables and inline CSS.

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

---

## 2. Compiler Assets Configuration

### Modifying File: `nest-cli.json`
We will specify `"assets": ["templates/**/*"]` in the compiler options so that Nest CLI copies templates under `src/templates` to the output `dist/templates` folder:

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

---

## 3. AuthService Refactoring

### Modifying File: `src/modules/auth/auth.service.ts`
We will modify the registration code block where `mailerService.sendMail` is called:

```diff
-        await this.mailerService.sendMail({
-          to: user.email,
-          subject: "Welcome to SyncFlow! Verify your Email",
-          html: `
-          <h1>Welcome ${user.name}!</h1>
-          <p>Please click the link below to verify your email:</p>
-          <a href="${verificationLink}">Verify Email</a>
-          <p>This link expires in 24 hours.</p>`,
-        });
+        await this.mailerService.sendMail({
+          to: user.email,
+          subject: "Welcome to SyncFlow! Verify your Email",
+          template: "welcome-email",
+          context: {
+            name: user.name,
+            verificationLink,
+          },
+        });
```

---

## 4. Verification & Testing
1. Verify that `pnpm build` executes successfully and copies `src/templates/welcome-email.hbs` to `dist/templates/welcome-email.hbs`.
2. Run unit tests (`pnpm test`) and ensure all tests continue to pass.
