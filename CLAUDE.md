# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ImageBox is a local-first AI image generation tool built with Next.js 16. It allows users to manage templates, generate images using Google Gemini 3 Pro, and organize their generated assets locally. The app prioritizes simplicity, local storage, and cross-platform accessibility (desktop via localhost, remote via LAN).

## Development Commands

### Setup
```bash
npm install                    # Install dependencies
npx prisma generate            # Generate Prisma client types
npx prisma db push             # Apply schema to SQLite database
```

### Development
```bash
npm run dev                    # Start Next.js dev server (http://localhost:3000)
npm run build                  # Build for production
npm start                      # Start production server
npm run lint                   # Run ESLint
```

### Database Management
```bash
npx prisma studio              # Open Prisma Studio to view/edit database
npx prisma db push             # Push schema changes to SQLite
npx prisma migrate dev         # Create and apply migrations (use for schema changes)
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router, React Server Components)
- **Database**: SQLite via Prisma ORM
- **Styling**: Tailwind CSS v4 + Framer Motion for animations
- **AI Model**: Google Gemini (`gemini-3-pro-image-preview`) via `@google/generative-ai`

### Directory Structure
```
app/
  ├── page.tsx              # Gallery view (home page)
  ├── studio/page.tsx       # Image generation interface
  ├── templates/page.tsx    # Template management
  ├── settings/page.tsx     # API key and config
  ├── actions.ts            # Server Actions (all database + API logic)
  └── layout.tsx            # Root layout with Sidebar
components/
  └── Sidebar.tsx           # Main navigation
lib/
  └── prisma.ts             # Prisma client singleton
prisma/
  └── schema.prisma         # Database schema (Template, Image, Setting models)
public/generated/           # Generated images stored here (auto-created)
```

### Key Design Patterns

**Server Actions Pattern**: All database and Gemini API calls are in `app/actions.ts` as Server Actions. Client components import and call these actions directly. This keeps the client bundle small and API keys secure.

**Database Schema**:
- `Template`: Stores reusable prompts with variable slots (e.g., `{{subject}}`)
- `Image`: Stores metadata for generated images (path, prompt, model, params)
- `Setting`: Key-value store for app configuration (especially `GEMINI_API_KEY`)

**Image Storage**: Generated images are saved as base64-decoded PNG files in `public/generated/` with timestamp-uuid filenames. The database stores the relative path (`/generated/{filename}.png`).

**Data Flow for Image Generation**:
1. User enters prompt in Studio (`app/studio/page.tsx`)
2. Calls `generateImageAction()` from `app/actions.ts`
3. Action fetches API key from Settings, calls Gemini API
4. Gemini returns base64 image data in response
5. Action calls `saveGeneratedImage()` to write file to disk and create DB record
6. Client updates UI with new image path

### Component Architecture

**Client vs Server**:
- All route pages are client components (`'use client'`) to support interactivity
- Server Actions handle all server-side logic (DB, API, file I/O)
- No API routes (`/api`) are used; Server Actions replace them

**State Management**:
- Local React state (`useState`) for UI state
- No global state management (Redux/Zustand) is used
- Data fetching happens in `useEffect` hooks via Server Actions

## Important Implementation Notes

### Prisma Configuration
The Prisma client is configured for SQLite in `prisma/schema.prisma`. The database file is `dev.db` in the root directory. Use `lib/prisma.ts` to import the singleton client instance.

### Path Aliases
TypeScript is configured with `@/*` pointing to the root directory. Use `@/app/actions` instead of `../app/actions`.

### Tailwind Configuration
This project uses Tailwind CSS v4. The configuration is in `postcss.config.mjs`. Custom classes use the `bg-background`, `text-foreground`, and `border-border` semantic tokens, with a dark theme applied via `dark` class on `<html>`.

### Framer Motion Usage
Framer Motion is used for:
- Navigation active state transitions (`layoutId="activeNav"` in Sidebar)
- Image result animations (`AnimatePresence` in Studio)

Keep animations subtle and performant.

### Environment Variables
The app stores the Gemini API key in the database (Settings table) rather than `.env` files. Users configure it via the Settings page UI. When developing features that need the API key, fetch it using `getSettings()` from `app/actions.ts`.

### Image Generation Error Handling
The Gemini API may return text instead of images if the prompt is refused or fails. Always check `response.candidates[0].content.parts` for `inlineData` with `mimeType` starting with `image/`. If no images are returned, display the error message to the user.

## Common Workflows

### Adding a New Page
1. Create `app/[route]/page.tsx` (use `'use client'` if interactive)
2. Add route to `navItems` array in `components/Sidebar.tsx`
3. Import icon from `lucide-react`

### Adding a Database Model
1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push` to apply changes
3. Run `npx prisma generate` to update TypeScript types
4. Add Server Actions in `app/actions.ts` for CRUD operations

### Adding a Server Action
1. Add `'use server'` function to `app/actions.ts`
2. Import `prisma` from `@/lib/prisma` if accessing database
3. Return plain objects (no functions, dates as strings if needed)
4. Import and call from client components

### Working with Templates
Templates use a simple variable replacement system. The `basePrompt` field can contain variables like `{{subject}}` or `{{style}}`. When implementing variable substitution, extract variable names using regex `\{\{(\w+)\}\}` and build a form UI for each variable.

## Design Guidelines

**Visual Theme**: The UI follows a "dark glassmorphism" aesthetic with:
- Dark backgrounds (`bg-zinc-900`, `bg-black/40`)
- Subtle borders (`border-white/5`)
- Gradient accents (`from-indigo-600 to-violet-600`)
- Backdrop blur effects (`backdrop-blur-md`)

**Interaction Patterns**:
- Hover states should be subtle (opacity, color shifts)
- Loading states use spinner animations
- Empty states show icons + descriptive text
- Errors display in red with `AlertCircle` icon

**Typography**: Use Inter font (already configured). Prefer small text (`text-sm`, `text-xs`) for labels and metadata. Use uppercase tracking for section headers (`uppercase tracking-wider`).

## Gotchas and Important Notes

- **Generated Images Directory**: The `public/generated/` folder is auto-created by `saveGeneratedImage()`. Don't manually create it or add it to git.
- **SQLite Limitations**: SQLite doesn't support many concurrent writes. If implementing multi-user features, consider PostgreSQL.
- **API Key Security**: The API key is stored in the database, not environment variables. This is intentional for the local-first design.
- **Model Name**: The default model is `gemini-3-pro-image-preview`. Verify this is the correct model name for the Gemini API version being used.
- **Base64 Image Handling**: Images from Gemini come as base64 in the API response. They must be decoded and written to disk, not stored in the database.
- **No Git Repository**: This workspace is not a git repository. If implementing version control features, initialize git first.

## Roadmap & TODO

### High Priority Features

#### 1. Internationalization (i18n)
- [ ] Implement i18n using `next-intl` or `react-i18next`
- [ ] Support English and Chinese languages
- [ ] Add language switcher in Settings
- [ ] Translate all UI text, error messages, and placeholders
- [ ] Store user language preference in database

#### 2. Theme System (Dark/Light Mode)
- [ ] Implement theme toggle in Settings page
- [ ] Create light theme color palette (currently only dark theme exists)
- [ ] Store theme preference in database (Settings table)
- [ ] Add smooth theme transition animations
- [ ] Update all components to support both themes
- [ ] Consider adding system theme auto-detection

#### 3. Multi-Model Support
- [ ] Add OpenAI DALL-E 3 integration
- [ ] Add Stable Diffusion integration (via Stability AI API)
- [ ] Add Midjourney integration (if API available)
- [ ] Allow model selection per generation request
- [ ] Store multiple API keys in Settings (per provider)
- [ ] Add model-specific parameter configurations
- [ ] Display model used in image metadata

### Medium Priority Features

#### 4. Batch Generation
- [ ] Allow generating multiple images from one prompt
- [ ] Support batch generation from multiple templates
- [ ] Add progress indicator for batch operations
- [ ] Implement queue system for sequential generation

#### 5. Image Management Enhancements
- [ ] Add folder/collection organization system
- [ ] Implement tagging system for images
- [ ] Add favorites/star functionality
- [ ] Support image deletion with confirmation
- [ ] Add image metadata viewer (generation params, timestamp, etc.)
- [ ] Implement search and filter functionality (by prompt, date, model, tags)

#### 6. Advanced Generation Controls
- [ ] Add image size/resolution selector
- [ ] Support negative prompts
- [ ] Add generation parameter presets (quality, style strength, etc.)
- [ ] Implement seed control for reproducible generations
- [ ] Add image-to-image support (if model supports)
- [ ] Support prompt weights and syntax highlighting

#### 7. Export & Sharing
- [ ] Batch export selected images as ZIP
- [ ] Export with metadata (JSON sidecar files)
- [ ] Generate shareable links (with optional expiry)
- [ ] Add watermark options for exports
- [ ] Support different export formats (PNG, JPG, WEBP)

### Low Priority / Future Enhancements

#### 8. Performance Optimizations
- [ ] Implement virtual scrolling for large image galleries
- [ ] Add lazy loading for images
- [ ] Implement image thumbnail generation
- [ ] Add client-side caching strategy
- [ ] Optimize database queries with indexes

#### 9. User Experience Improvements
- [ ] Add keyboard shortcuts (generate, delete, navigate)
- [ ] Implement undo/redo for template editing
- [ ] Add drag-and-drop for image organization
- [ ] Implement image comparison view (side-by-side)
- [ ] Add quick actions context menu on images

#### 10. Data Management
- [ ] Implement database backup/restore functionality
- [ ] Add data export (full database + images)
- [ ] Support database migration from older versions
- [ ] Add storage usage statistics in Settings
- [ ] Implement auto-cleanup for old/unused images

#### 11. Deployment & Distribution
- [ ] Create Docker/Docker Compose setup
- [ ] Add Electron wrapper for true desktop app
- [ ] Support portable mode (database + images in same folder)
- [ ] Create installation guides for Windows/Mac/Linux
- [ ] Add auto-update mechanism

#### 12. Developer Experience
- [ ] Add comprehensive error handling and logging
- [ ] Implement retry logic for API failures
- [ ] Add health check endpoint for monitoring
- [ ] Create API documentation for Server Actions
- [ ] Add E2E tests with Playwright
- [ ] Implement unit tests for critical functions

### Community & Documentation
- [ ] Create video tutorial for setup and usage
- [ ] Add FAQ section to documentation
- [ ] Create contribution guidelines
- [ ] Add code of conduct
- [ ] Set up issue templates for GitHub
- [ ] Create changelog for version tracking

### Notes
- All features should maintain the local-first philosophy
- Multi-model support should be modular and extensible
- Keep the UI simple and intuitive despite added features
- Consider performance impact for users with thousands of images
