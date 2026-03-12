# How to Re-enable Sign-in (Authentication)

Sign-in is currently **disabled**: the app runs in guest mode.

**Note:** The **Siteline API token** (e.g. `SITELINE_API_TOKEN`, `SITELINE_API_URL` in your backend’s `.env`) is **not** affected by this. That token is used by the backend to call Siteline’s API. For the Billings page and Siteline features to work, the backend must still have those variables set in `.env`; they are independent of whether user sign-in is enabled or disabled. All routes (including `/job`, `/billings`, `/admin`) are reachable without logging in. The middleware does not redirect to `/login`, and the dashboard does not require a user.

To turn authentication back on:

## 1. Set the environment variable

In `.env.local` (create it in the project root if missing), set:

```bash
NEXT_PUBLIC_AUTH_ENABLED=true
```

If this variable is unset or set to anything other than `"true"`, sign-in stays disabled.

## 2. Restart the dev server

Restart so the new env is picked up:

```bash
npm run dev
```

For a production build, rebuild after changing env:

```bash
npm run build
```

## 3. What changes when sign-in is enabled

- **Middleware** (`middleware.ts`): Checks for the session cookie. Unauthenticated requests to protected paths are redirected to `/login`.
- **RequireAuth** (`src/components/auth/RequireAuth.tsx`): Redirects to `/login` if there is no user; shows a loading state while auth is resolving.
- **AuthContext** (`src/contexts/AuthContext.tsx`): No longer uses a guest user; restores token + profile from storage and `/auth/profile`.
- **Login page** (`src/app/login/page.tsx`): The sign-in form is shown; successful login sends users to `/job` (or `/pending` if status is not active).
- **Register page** (`src/app/register/page.tsx`): The registration form is shown; successful registration can send users to `/pending` or `/job` depending on backend.

## 4. Optional: disable auth via code instead of env

Auth is gated by `AUTH_DISABLED` in `src/lib/auth/config.ts`:

```ts
export const AUTH_DISABLED =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_AUTH_ENABLED !== "true"
    : true;
```

To force sign-in **off** regardless of env (e.g. for a branch or demo), set:

```ts
export const AUTH_DISABLED = true;
```

To force sign-in **on** regardless of env:

```ts
export const AUTH_DISABLED = false;
```

Revert to the env-based check when you want behavior to follow `NEXT_PUBLIC_AUTH_ENABLED` again.

## Summary

| Goal              | Action |
|-------------------|--------|
| Require login     | Set `NEXT_PUBLIC_AUTH_ENABLED=true` in `.env.local` and restart. |
| No login (guest)  | Omit the variable or set `NEXT_PUBLIC_AUTH_ENABLED=false` (or leave unset). |

---

## Billings: “Contracts & Pay apps” tab

The **Contracts & Pay apps** tab on the Billings page is currently **hidden** (Contracts table + Pay apps by month).

To show it again:

1. Open `src/app/(dashboard)/billings/page.tsx`.
2. Find the constant `CONTRACTS_PAYAPPS_TAB_ENABLED` and set it to `true`:
   ```ts
   const CONTRACTS_PAYAPPS_TAB_ENABLED = true;
   ```
3. Save and reload. The tab and its content will appear; the page will also load contracts and pay apps data when that tab is active.
