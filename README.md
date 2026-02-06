# CEO Web Project V1

A comprehensive multi-tenant SaaS platform enabling businesses to manage CRM, Fleet Operations, Inventory, HR, and internal communications—powered by an intelligent AI agent.

## 🚀 Technology Stack

- **Frontend:** [Next.js 14](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Backend/Database:** [Supabase](https://supabase.com/)
- **Testing:** [Vitest](https://vitest.dev/)
- **Package Manager:** [pnpm](https://pnpm.io/)
- **Monorepo:** pnpm workspaces

## 📂 Project Structure

```bash
ceo_web_project_v1/
├── .app/                 # Next.js Frontend Application
│   ├── app/              # App Router (Pages & Layouts)
│   ├── components/       # Reusable UI Components
│   ├── hooks/            # Custom React Hooks
│   ├── lib/              # Utility Libraries
│   ├── public/           # Static Assets
│   └── ...
├── supabase/             # Supabase Configuration & Functions
├── package.json          # Root Package Config
├── pnpm-workspace.yaml   # Workspace Definitions
└── tsconfig.json         # Root TypeScript Config
```

## 🛠️ Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (Install via `npm install -g pnpm`)

### Installation

1.  Clone the repository:

    ```bash
    git clone <repository-url>
    cd ceo_web_project_v1
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

### Running the Application

To start the development server for the frontend:

```bash
pnpm dev
```

> This command runs `pnpm --filter app dev`, launching the Next.js app located in `.app/`.

Visit [http://localhost:3000](http://localhost:3000) (or the port shown in the terminal) to view the app.

## 🧪 Testing

Run unit tests via Vitest:

```bash
pnpm test
```

## 📝 Development Notes

- **TypeScript:** The project is configured with a root `tsconfig.json` that includes the `.app` and `supabase` workspaces.
- **Linting:** Pre-configured with ESLint and Prettier. Use `pnpm lint` and `pnpm format` to maintain code quality.

## 📏 Git Conventions

This project enforces **Conventional Commits** to ensure a clean history.

### Commit Message Format

```
<type>(<scope>): <description>
```

### ✅ Valid Examples

- `feat: add login page login`
- `fix: resolve tsconfig error`
- `docs: update readme`
- `style: format code`
- `refactor: simplify auth logic`

### ❌ Invalid Examples

- `added login page` (Missing type)
- `Feat: new feature` (Type must be lowercase)
- `feat start` (Missing colon)

**Common Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Build/tooling changes
