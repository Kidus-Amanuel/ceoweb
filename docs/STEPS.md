# Project Setup & Architecture Steps

This document outlines the steps taken to configure the project, fix configuration issues, and establish the frontend architecture.

## 1. Monorepo Configuration

The project is set up as a **pnpm monorepo** defined in `pnpm-workspace.yaml`.

- **Root:** Manages shared configuration and scripts.
- **Workspaces:**
  - `.app`: The Next.js frontend application.
  - `supabase`: Database and backend cloud functions.

## 2. TypeScript Configuration Fix

**Issue:** `tsconfig.json` reported "No inputs were found".
**Solution:**

1.  **Enable `allowJs`:** Added `"allowJs": true` to `compilerOptions` to include JavaScript configuration files.
2.  **Explicit Includes:** Updated the `include` array to use wildcards, ensuring all subfiles are picked up:
    ```json
    "include": [
        ".app/**/*",
        "supabase/**/*"
    ]
    ```

## 3. Frontend Scaffolding (`.app`)

We established a standard Next.js + Vite structure inside the `.app` directory:

- **`app/`**: Contains the App Router `page.tsx` (Login Page) and `layout.tsx`.
- **`components/`**: For UI components (Buttons, Inputs, etc.).
- **`layouts/`**, **`hooks/`**, **`utils/`**, **`types/`**: dedicated folders for code organization.
- **`vite.config.ts`**: Configured for testing with Vitest.

## 4. Root Scripts

To simplify development, a `dev` script was added to the root `package.json`:

```json
"scripts": {
    "dev": "pnpm --filter app dev"
}
```

This allows running `pnpm dev` from the root to start the frontend application seamlessly.

## 5. Login Page Implementation

A responsive, dark-mode ready Login Page was implemented in `.app/app/page.tsx` using **Tailwind CSS**.

- Replaced the default Next.js boilerplate.

## 6. Next.js 16 & React 19 Migration (2026-02-11)

We upgraded the project to the latest stable versions of Next.js and React:

1.  **Framework Upgrade**: Updated to **Next.js 16.0.0** and **React 19.2.0**.
2.  **Middleware to Proxy**: Migrated `middleware.ts` to the new `proxy.ts` system to align with Next.js 16 architecture.
3.  **Async Cookies**: Updated `lib/supabase/server.ts` to handle the asynchronous `cookies()` API.
4.  **ESLint 9**: Migrated to ESLint v9's **Flat Configuration** (`eslint.config.mjs`) as `next lint` was removed.
5.  **Refined Logic**: Fixed React 19 immutability lint errors in `MessageList.tsx`.
6.  **Prerequisites**: Updated Node.js requirement to **v20.9+**.
