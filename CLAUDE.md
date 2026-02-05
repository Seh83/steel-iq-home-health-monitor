# CLAUDE.md - Steel-IQ Home Health Monitor

## Project Overview

Steel-IQ Home Health Monitor is a 3D digital twin visualization and monitoring application for structural health monitoring of buildings. It provides real-time sensor monitoring, interactive 3D visualization of building components using Three.js, an alert system for critical issues (moisture, temperature, stress), and panel/sensor management. Built as a Base44 platform app with React + Vite.

## Tech Stack

- **Framework:** React 18.2 with Vite 6.1
- **Styling:** Tailwind CSS 3.4 with CSS variables for theming (dark mode via class strategy)
- **UI Components:** shadcn/ui (Radix UI primitives) in `src/components/ui/`
- **3D Graphics:** Three.js 0.171 (raw Three.js, not React Three Fiber)
- **State Management:** React Context (auth), TanStack React Query 5 (server state), local useState
- **Forms:** React Hook Form + Zod validation
- **Animation:** Framer Motion
- **Routing:** React Router DOM 6
- **Backend:** Base44 SDK (`@base44/sdk`) - all data operations go through Base44 entities
- **Charts:** Recharts
- **Icons:** Lucide React

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run lint       # ESLint (quiet mode)
npm run lint:fix   # ESLint with auto-fix
npm run typecheck  # TypeScript type checking via jsconfig.json
npm run preview    # Preview production build
```

## Project Structure

```
src/
├── api/                        # Base44 SDK client initialization
│   └── base44Client.js
├── components/
│   ├── ui/                     # shadcn/ui components (DO NOT manually edit)
│   ├── dashboard/              # Dashboard feature components
│   │   ├── DigitalTwinViewer.jsx  # 3D warehouse visualization (Three.js)
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── StatusCards.jsx
│   │   ├── ViewControls.jsx
│   │   ├── AlertTooltip.jsx
│   │   ├── ComponentPropertiesPanel.jsx
│   │   └── sensorData.jsx      # Mock sensor data and alert definitions
│   ├── sensors/                # Sensor management components
│   │   └── SensorActionModal.jsx
│   └── panels/                 # Panel detail components
│       └── PanelDetailView.jsx
├── hooks/
│   └── use-mobile.jsx          # Mobile detection hook
├── lib/                        # Core utilities and contexts
│   ├── AuthContext.jsx          # Authentication context (Base44 auth)
│   ├── query-client.js          # React Query client config
│   ├── app-params.js            # Environment/URL parameter handling
│   ├── utils.js                 # cn() helper, isIframe detection
│   ├── NavigationTracker.jsx    # Page navigation analytics
│   └── PageNotFound.jsx         # 404 page
├── pages/                      # Route-level page components
│   ├── Dashboard.jsx            # Main dashboard with 3D viewer
│   └── Sensors.jsx              # Sensor management page
├── utils/
│   └── index.ts                 # Additional utilities
├── App.jsx                     # Root component
├── Layout.jsx                  # Layout wrapper
├── main.jsx                    # Entry point
├── pages.config.js             # Route configuration
├── index.css                   # Tailwind directives and CSS variables
└── globals.css                 # Global styles
```

## Linting and Type Checking Scope

Both ESLint and TypeScript checking are scoped to specific directories:

**Included:**
- `src/components/**/*.{js,jsx}` (except `src/components/ui/`)
- `src/pages/**/*.jsx`
- `src/Layout.jsx`

**Excluded (do not lint/typecheck):**
- `src/lib/**/*` - Core utilities
- `src/components/ui/**/*` - shadcn/ui components (auto-generated)
- `src/api/` - Base44 client

### Key ESLint Rules
- Unused imports are **errors** (`unused-imports/no-unused-imports`)
- Unused variables are **warnings** (prefix with `_` to suppress)
- `react/prop-types` is **off** (no PropTypes required)
- `react/react-in-jsx-scope` is **off** (React 17+ JSX transform)
- React Hooks rules are enforced

## Path Aliases

`@/*` maps to `./src/*` (configured in jsconfig.json and resolved by Vite via Base44 plugin).

## Architecture Patterns

### Data Flow
All backend data goes through Base44 SDK entities:
- `base44.entities.Sensor.list()` - Fetch sensors
- `base44.entities.Panel.list()` - Fetch panels
- `base44.auth.me()` / `base44.auth.logout()` - Authentication

React Query manages caching and refetching. No custom REST/GraphQL endpoints.

### 3D Visualization
`DigitalTwinViewer.jsx` is the largest component (~858 lines). It uses raw Three.js (not React Three Fiber):
- Creates warehouse geometry (columns, beams, roof trusses)
- Raycasting for mouse interaction with 3D objects
- Separate animation loop for rendering
- `userData` on Three.js objects for metadata tracking
- Auto-rotation with manual drag override

### Component Patterns
- Functional components only (no class components)
- Framer Motion `AnimatePresence` + `motion.div` for modals/overlays
- Props destructuring in function parameters
- Early returns for conditional rendering

### Styling
- Tailwind utility classes exclusively (no CSS modules, no styled-components)
- Theme colors defined as CSS variables in `index.css`, referenced via `hsl(var(--name))`
- Dark mode support via Tailwind `darkMode: ["class"]`
- Use `cn()` from `src/lib/utils.js` to merge Tailwind classes

## Environment Variables

Required in `.env.local`:
```
VITE_BASE44_APP_ID=<app-id>
VITE_BASE44_APP_BASE_URL=<backend-url>
```

Optional:
```
VITE_BASE44_FUNCTIONS_VERSION=<version>
BASE44_LEGACY_SDK_IMPORTS=true  # Enable legacy import paths
```

## Key Conventions

1. **File naming:** PascalCase for components (`Dashboard.jsx`), camelCase for utilities (`query-client.js`)
2. **One component per file** (with rare exceptions for tightly coupled helpers)
3. **No test framework configured** - no Jest, Vitest, or test files exist
4. **No CI/CD pipeline** - deployment handled by the Base44 platform
5. **ES Modules** throughout (`"type": "module"` in package.json)
6. **JSX files use `.jsx` extension**, utility files use `.js` or `.ts`
7. **Do not edit `src/components/ui/`** - these are shadcn/ui generated components
8. **Do not edit `src/lib/`** - these are excluded from linting/typechecking and treated as stable core code
9. **Do not edit `src/api/`** - Base44 client initialization is platform-managed

## Pages and Routing

Routes are defined in `src/pages.config.js`. Currently two pages:
- **Dashboard** (`/`) - Main page with 3D digital twin viewer, status cards, alerts
- **Sensors** - Sensor list with filtering, search, and detail views

The `Layout.jsx` wrapper provides the common layout shell.

## Common Tasks

### Adding a new page
1. Create component in `src/pages/NewPage.jsx`
2. Register in `src/pages.config.js` by adding to `PAGES` object
3. Import and export the component

### Adding a new feature component
1. Create in the appropriate `src/components/<feature>/` directory
2. Keep components focused - split large components into sub-components
3. Use shadcn/ui primitives from `src/components/ui/` for common UI elements

### Working with sensors/panels data
Use React Query hooks with Base44 SDK:
```jsx
import { useQuery } from "@tanstack/react-query";
import base44 from "@base44/sdk";

const { data: sensors } = useQuery({
  queryKey: ["sensors"],
  queryFn: () => base44.entities.Sensor.list(),
});
```
