# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build & Development
- `npm run dev` - Start development server on port 8080
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run lint` - Run ESLint checks
- `npm run preview` - Preview production build

### Testing
Currently no test suite is implemented. When adding tests, follow the existing TypeScript patterns.

## Project Architecture

### Core Stack
- **Frontend**: React 18.3.1 + TypeScript + Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand (global) + TanStack React Query (server state)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router DOM v6

### Key Directory Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components (don't modify directly)
│   └── [Feature components]
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── integrations/supabase/  # Supabase client, types, and queries
├── lib/                # Utility functions
├── store/              # Zustand state stores
├── types/              # Global TypeScript types
└── data/               # Mock data and constants
```

### State Management Patterns
- **Global State**: Use Zustand stores in `src/store/`
- **Server State**: Use TanStack React Query for API calls
- **Form State**: Use React Hook Form with Zod schemas
- **Component State**: Use React hooks for local state

### Database Schema (Supabase)
The app uses a comprehensive PostgreSQL schema with these core tables:
- `users`, `leagues`, `fantasy_teams`, `players`, `nfl_teams`
- `league_members`, `team_rosters`, `roster_moves`
- `player_stats`, `notifications`, `weeks`
- `waiver_priority`, `waiver_requests`, `admin_actions`

### Key Features Implemented
1. **League Management**: Create/join leagues, invitations, owner configuration
2. **Draft System**: Snake draft with auto-draft, 60-second timer
3. **Trading System**: Player trade proposals and execution
4. **Weekly Elimination**: Automatic lowest-scoring team elimination
5. **Waiver System**: Priority-based waiver processing
6. **Authentication**: Supabase auth with protected routes

### Component Patterns
- Use shadcn/ui components from `src/components/ui/`
- Custom components follow the naming convention: `ComponentName.tsx`
- Pages are in `src/pages/` and use React Router
- Hooks are in `src/hooks/` and prefixed with `use`

### TypeScript Configuration
- Path aliases: `@/*` maps to `./src/*`
- Composite project setup with separate configs
- Relaxed strict mode for development flexibility

### Styling Guidelines
- Use Tailwind CSS classes
- Custom NFL-themed colors defined in `tailwind.config.js`
- Dark mode support available
- Framer Motion for animations

### API Integration
- Supabase client configured in `src/integrations/supabase/`
- Use the provided query hooks for data fetching
- All database operations should use the existing Supabase functions

### Current Status
The project is 92% complete with 12/13 major systems implemented. The remaining system is the Admin Panel (0% complete). All core functionality is operational.

### Important Notes
- The app uses a "Survivor" format where teams are eliminated weekly
- League owners can be players (controlled by `owner_plays` field)
- Draft uses snake format with turn-based selection
- Weekly elimination is automated via database triggers
- Waiver priority resets weekly and processes automatically