# 🚀 CEO Web Project V1

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Supabase-Auth%20%26%20DB-blueviolet?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Zustand-State-orange?style=for-the-badge" alt="Zustand" />
  <img src="https://img.shields.io/badge/PNPM-Workspaces-f69220?style=for-the-badge&logo=pnpm" alt="PNPM" />
</p>

---

A comprehensive **multi-tenant SaaS platform** designed for modern business management. From CRM and Fleet Operations to Inventory and HR, all coordinated through an intelligent AI agent layer.

## �️ Technology Stack

| Component          | Technology                  | Description                                                    |
| :----------------- | :-------------------------- | :------------------------------------------------------------- |
| **Core Framework** | **Next.js 14 (App Router)** | Used for both high-performance Frontend and Backend API logic. |
| **Authentication** | **Supabase SSR**            | Secure, cookie-based session management across the stack.      |
| **Database**       | **Supabase PostgREST**      | Real-time PostgreSQL management with automatic API generation. |
| **State**          | **Zustand**                 | Lightweight, scalable client-side logic management.            |
| **Validation**     | **Zod**                     | Schema-first type-safe validation for all API inputs.          |
| **Logging**        | **Pino + Pino-Pretty**      | Enterprise-grade structured logging for observability.         |
| **API Client**     | **Axios**                   | Centralized instance with global error interceptors.           |

---

## 📂 Project Architecture (Deep Dive)

The project follows a **Modified Layered Architecture** to ensure high decoupling and scalability.

```bash
ceo_web_project_v1/
├── .app/                 # 🌐 Next.js Full-Stack Application
│   ├── app/
│   │   ├── api/          # 📞 The "Receptionists": Route Handlers for External/Internal API calls
│   │   ├── actions/      # ⚡ Server Actions: Direct mutation handlers for UI forms
│   │   ├── (auth)/       # Routing groups for clean URL structures
│   │   └── debug/        # Diagnostic tools for devs (e.g., Supabase check)
│   ├── components/
│   │   ├── ui/           # 💎 Shadcn UI: Atomic, primitive components
│   │   └── shared/       # Reusable complex components
│   ├── services/         # 🧠 The "Specialists": Pure business logic & Supabase interaction
│   ├── lib/
│   │   ├── supabase/     # ☁️ Multi-client config (Client, Server, Middleware)
│   │   └── axios.ts      # 🛠️ Centralized API client with interceptors
│   ├── store/            # 📦 Zustand: Localized state stores (e.g., AuthStore)
│   ├── utils/            # 🔧 Utility Layer (Logger, Error Handlers)
│   └── validators/       # 🛡️ Zod: Source of truth for all data schemas
├── package.json          # Root orchestration
└── pnpm-workspace.yaml   # Monorepo configuration
```

---

## 🚦 Getting Started

### 1️⃣ Prerequisites

- **Node.js**: `v18+`
- **PNPM**: `v9+`

### 2️⃣ Installation

```bash
# Install the monorepo dependencies
pnpm install
```

### 3️⃣ Configuration ⚙️

1.  Navigate to: `cd .app`
2.  Setup environment: `cp .env.example .env.local`
3.  Fill in your **Supabase** credentials.

### 4️⃣ Launch 🚀

```bash
pnpm dev # Runs the Next.js dev server
```

---

## 🪵 Logging System (Pino)

We use **structured, non-blocking logging** for better observability.

### Usage

```typescript
import logger from "@/utils/logger";

// Standard Info
logger.info({ context: "auth" }, "User session started");

// Errors with Metadata
logger.error(
  {
    err,
    userId: user.id,
    context: "database",
  },
  "Failed to update profile",
);
```

> [!TIP]
> In development, logs are "prettified" for the terminal. In production, they output JSON for ingestion by monitoring tools.

---

## 🧪 Testing Suite (Vitest)

Testing is integrated into our **pre-commit pipeline**. Your code won't commit if tests fail!

### Running Tests

| Command           | Result                                |
| :---------------- | :------------------------------------ |
| `pnpm test`       | Runs all unit and component tests.    |
| `pnpm test:watch` | Runs tests in interactive watch mode. |
| `pnpm test:ui`    | Opens the Vitest UI in your browser.  |

### Test Location

Place your tests in `.app/tests/` using the `.spec.tsx` or `.spec.ts` extension.
All tests have access to custom matchers like `toBeInTheDocument()` thanks to `@testing-library/jest-dom`.

---

## 📅 Compatibility & Status

> [!NOTE]
> **Last Compatibility Audit:** 2026-02-07  
> **Framework:** Next.js 14.1.0 (LTS Target)  
> **Ecosystem:** Fully compatible with Windows, macOS, and Linux.

---

## 🧪 Testing

Run our comprehensive test suite powered by **Vitest**:

```bash
# Run unit & component tests
pnpm test
```

---

## 📏 Git Message Conventions

We enforce **Conventional Commits** to maintain a clean, readable project history. Every commit is validated before submission.

### Format

```text
<type>(<scope>): <description>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

### Examples

- ✅ `feat(auth): implement supabase ssr login`
- ✅ `fix(ui): resolve button alignment on mobile`
- ✅ `docs: update deployment instructions`
- ❌ `fixed the bug` (Missing type)
- ❌ `FEAT: ADD LOGIN` (Must be lowercase)

---

<p align="center">
  Built with ❤️ by the CEO Team
</p>
