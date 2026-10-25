# Password reset configuration

The frontend implementation uses Supabase Auth's standard recovery flow. It does not create or store custom reset tokens.

## Supabase URL configuration

In the Supabase dashboard, open **Authentication → URL Configuration**.

1. Keep the production **Site URL** set to the canonical FixIt frontend origin.
2. Add these exact **Redirect URLs**:
   - `https://fixit-community-web-hassaans-team.vercel.app/reset-password`
   - `http://localhost:3000/reset-password`
3. Add a separate exact preview URL only when a specific preview deployment must be tested. Avoid a broad wildcard for production recovery links.

Supabase validates the `redirectTo` value sent by `resetPasswordForEmail()`. If it is absent from this allowlist, Supabase can fall back to the Site URL rather than the intended reset page.

## Frontend environment

Set the following Vercel Production environment variable on the existing frontend project:

```text
VITE_PASSWORD_RESET_REDIRECT_URL=https://fixit-community-web-hassaans-team.vercel.app/reset-password
```

For local development, either use the `.env.example` value or omit the variable. When omitted, the client derives `/reset-password` from the current browser origin. Non-local HTTP redirect URLs are rejected by the frontend.

## Email delivery

For real users, configure a custom SMTP provider in **Supabase → Project Settings → Authentication → SMTP Settings** (the dashboard label can vary slightly). Supply a verified sender domain/address, host, port, username, and password from the chosen email provider. Do not place SMTP credentials in frontend/Vite variables.

Then review **Authentication → Email Templates → Reset Password** and keep the recovery action linked through Supabase's confirmation URL (normally `{{ .ConfirmationURL }}`). Do not construct a token URL manually.

The default Supabase email service is rate-limited and may restrict delivery to project-team addresses; it should not be treated as production email infrastructure. Custom SMTP is required for dependable delivery to local citizens.

## Required end-to-end verification

After the local changes are reviewed and separately deployed with permission:

1. Use a real inbox owned by the tester and a non-production test account.
2. Request a reset from `/forgot-password` and confirm the UI always gives the same generic response.
3. Confirm the message arrives, the sender/domain is correct, and the link opens the production `/reset-password` page.
4. Set a strong new password and confirm the app returns to Login.
5. Confirm the old password fails and the new password succeeds.
6. Open the same recovery link again and confirm it is rejected as used.
7. Request another link, allow it to expire, and confirm the expired-link screen offers a new request.
8. Repeat with test Citizen, Admin, and Coordinator accounts. Recovery does not modify their database roles.

Do not mark the feature production-ready until this inbox-to-login sequence has passed.
