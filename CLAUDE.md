# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ImageBox is a local-first AI image generation tool built with Next.js 16. It allows users to manage templates, generate images using cloud AI services (Google Gemini, OpenAI) or local models (stable-diffusion.cpp + Z-Image), and organize their generated assets locally. The app prioritizes simplicity, local storage, and cross-platform accessibility (desktop via localhost, remote via LAN, Docker).

## Development Commands

### Setup
```bash
npm install                    # Install dependencies
npm run db:setup               # Initialize database (generate + push)
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
npm run db:studio              # Open Prisma Studio to view/edit database
npm run db:push                # Push schema changes to SQLite
npm run db:generate            # Generate Prisma client types
npm run db:setup               # Generate + push (combined)
```

### Docker Deployment
```bash
# Build and run with Docker
docker build -t imagebox .
docker run -p 3000:3000 -v imagebox-data:/app/data imagebox

# Or use Docker Hub image
docker pull octoooo/imagebox:latest
docker run -p 3000:3000 -v imagebox-data:/app/data octoooo/imagebox
```

### Release to Docker Hub
```bash
# Recommended: Use the release script (auto-increment version, build check, confirmation)
./scripts/release.sh              # Auto-increment patch version (e.g., 0.1.7 -> 0.1.8)
./scripts/release.sh 0.2.0        # Specify version explicitly

# Manual release (if needed)
npm run build                     # Verify build passes first!
git tag v0.1.x && git push origin v0.1.x
```

**Release Notes:**
- Build takes ~25-30 minutes (multi-arch: amd64 + arm64)
- Monitor progress: `gh run list --limit 1` or `gh run watch`
- View on GitHub: https://github.com/Octo-o-o-o/ImageBox/actions
- Images pushed to: `octoooo/imagebox:{version}` and `octoooo/imagebox:latest`

**Common Build Issues:**
- **Prerender error with Prisma**: Add `export const dynamic = 'force-dynamic'` to pages with database operations
- **TypeScript errors**: Run `npm run build` locally before releasing to catch type errors early

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router, React Server Components)
- **Database**: SQLite via Prisma ORM
- **Styling**: Tailwind CSS v4 + Framer Motion for animations
- **AI Models**:
  - Cloud: Google Gemini, OpenAI DALL-E 3, OpenAI-compatible endpoints
  - Local: stable-diffusion.cpp with Z-Image (Tongyi-MAI models)
- **Deployment**: Docker multi-arch (amd64/arm64), auto-build via GitHub Actions

### Directory Structure
```
app/
  ├── page.tsx              # Gallery view (home page)
  ├── create/page.tsx       # Image generation interface
  ├── library/page.tsx      # Image library with folder management
  ├── templates/page.tsx    # Template management
  ├── run_log/page.tsx      # API call logs and debugging
  ├── models/page.tsx       # Provider & model management (API keys, endpoints, parameters)
  ├── actions.ts            # Server Actions (all database + API logic)
  └── layout.tsx            # Root layout with providers
components/
  ├── Sidebar.tsx           # Main navigation with i18n + theme switcher
  ├── ThemeProvider.tsx     # Theme system (dark/light/system)
  └── LanguageProvider.tsx  # i18n system (13 languages)
lib/
  ├── prisma.ts                # Prisma client singleton
  ├── modelParameters.ts       # Model parameter definitions and API mapping
  ├── presetProviders.ts       # Built-in provider and model presets (Google Gemini, OpenRouter)
  ├── localModelInstaller.ts   # Local model (stable-diffusion.cpp) installation automation
  └── i18n/index.ts            # Translation definitions
prisma/
  └── schema.prisma         # Database schema (Provider, AIModel, Template, Image, Folder, Setting, RunLog)
public/generated/           # Generated images stored here (auto-created)
```

### Key Design Patterns

**Server Actions Pattern**: All database and AI API calls are in `app/actions.ts` as Server Actions. Client components import and call these actions directly. This keeps the client bundle small and API keys secure.

**Preset Providers System**: On first app launch, `ensurePresetProvidersAndModels()` auto-creates preset providers (Google Gemini, OpenRouter) and their models in the database. This happens only once (tracked by `presetsInitialized` setting) and won't re-add user-deleted presets. Presets are defined in `lib/presetProviders.ts`.

**Database Schema**:
- `Provider`: AI service providers (Google Gemini, OpenAI, custom endpoints)
- `AIModel`: Individual models with parameter configurations (Gemini 2.5/3 Pro, DALL-E 3, etc.)
- `Template`: Reusable prompts with `{{variable}}` slots, linked to prompt/image models
- `Image`: Generated image metadata (path, prompt, model, params, favorite status)
- `Folder`: Organization system for images (default + user-created)
- `RunLog`: Complete API call history (request, response, duration, errors)
- `Setting`: Key-value store for app configuration

**Image Storage**: Generated images are saved as base64-decoded PNG files in `public/generated/` with timestamp-uuid filenames. The database stores the relative path (`/generated/{filename}.png`).

**Data Flow for Image Generation**:
1. User enters prompt in Create page (`app/create/page.tsx`)
2. Calls `generateImageAction()` from `app/actions.ts`
3. Action fetches provider/model config from database, calls AI API
4. API returns base64 image data in response
5. Action calls `saveGeneratedImage()` to write file to disk and create DB record
6. Client updates UI with new image path

### Component Architecture

**Client vs Server**:
- All route pages are client components (`'use client'`) to support interactivity
- Server Actions handle all server-side logic (DB, API, file I/O)
- No API routes (`/api`) are used; Server Actions replace them

**State Management**:
- Local React state (`useState`) for UI state
- Context providers for global concerns:
  - `ThemeProvider`: Theme state (dark/light/system), persisted to localStorage
  - `LanguageProvider`: i18n state (13 languages), persisted to localStorage
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

### Environment Variables & Provider Setup
The app stores API keys in the database (Provider table) rather than `.env` files. Users configure providers and models via the Models page UI (`/models`). On first launch, preset providers (Google Gemini, OpenRouter) and models are auto-created by `ensurePresetProvidersAndModels()` with null API keys. Users must configure API keys before use.

### Image Generation Error Handling
The Gemini API may return text instead of images if the prompt is refused or fails. Always check `response.candidates[0].content.parts` for `inlineData` with `mimeType` starting with `image/`. If no images are returned, display the error message to the user.

### Internationalization (i18n)
The app uses a custom lightweight i18n system (`lib/i18n/index.ts` + `LanguageProvider`):
- **13 languages supported**: en, zh, zh-TW, ja, de, fr, ru, pt, es, it, ar, no, sv
- **Usage**: `const { t } = useLanguage(); t('sidebar.create')`
- **RTL support**: Automatically sets `dir="rtl"` for Arabic
- Translations stored in localStorage, accessible via `useLanguage()` hook

### Model Parameter System
Multi-model support with automatic parameter mapping (`lib/modelParameters.ts`):
- **Presets**: Pre-configured parameter sets for each model type (Gemini 2.5/3 Pro, DALL-E 3, OpenAI-compatible)
- **Auto-mapping**: Converts UI parameters to provider-specific API formats (e.g., Gemini uses `imageConfig`, OpenAI uses `size`)
- **Reference images**: Dynamic limits per model (2-14 images)
- See `/docs/MODEL_PARAMETER_SYSTEM.md` (internal) for detailed architecture

## Common Workflows

### Adding a New Page
1. Create `app/[route]/page.tsx` (use `'use client'` if interactive)
2. Add route to `navItems` array in `components/Sidebar.tsx`
3. Import icon from `lucide-react`

### Adding a Database Model
1. Edit `prisma/schema.prisma`
2. Run `npm run db:setup` to apply changes and update TypeScript types
3. Add Server Actions in `app/actions.ts` for CRUD operations

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

#### 1. Internationalization (i18n) ✅ COMPLETED
- [x] Implemented custom lightweight i18n system (`LanguageProvider`)
- [x] Support 13 languages (en, zh, zh-TW, ja, de, fr, ru, pt, es, it, ar, no, sv)
- [x] Language switcher in Sidebar
- [x] RTL support for Arabic
- [x] Store language preference in localStorage
- [ ] **TODO**: Translate page-specific content (currently only navigation/common strings)

#### 2. Theme System (Dark/Light Mode) ✅ COMPLETED
- [x] Implemented `ThemeProvider` with dark/light/system modes
- [x] Theme toggle in Sidebar
- [x] Store theme preference in localStorage
- [x] System theme auto-detection
- [x] Smooth transitions via CSS classes
- [ ] **TODO**: Light theme color refinement (basic palette exists)

#### 3. Multi-Model Support ✅ COMPLETED
- [x] Provider management (Google Gemini, OpenAI, custom endpoints)
- [x] Model parameter configuration system with presets
- [x] Google Gemini 2.5 Flash & 3 Pro support
- [x] OpenAI DALL-E 3 support
- [x] OpenAI-compatible endpoint support (OpenRouter, etc.)
- [x] Per-model parameter mapping (aspectRatio, imageSize, quality, etc.)
- [x] Reference image support with model-specific limits (2-14 images)
- [x] RunLog tracking with model metadata
- [x] Local model support via stable-diffusion.cpp
- [x] Z-Image model integration (Tongyi-MAI)
- [x] Automated local model installation with dependency checks
- [ ] **TODO**: Midjourney integration

### Medium Priority Features

#### 4. Batch Generation
- [ ] Allow generating multiple images from one prompt
- [ ] Support batch generation from multiple templates
- [ ] Add progress indicator for batch operations
- [ ] Implement queue system for sequential generation

#### 5. Image Management Enhancements
- [x] Folder/collection organization system (`Folder` model + Library page)
- [x] Favorites/star functionality (`isFavorite` field)
- [x] Image deletion with confirmation
- [x] Image metadata viewer (prompt, model, params, timestamp)
- [x] Download and copy-to-clipboard actions
- [ ] **TODO**: Tagging system for images
- [ ] **TODO**: Search and filter functionality (by prompt, date, model, tags)

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
- [x] Create Docker multi-arch setup (amd64/arm64)
- [x] GitHub Actions auto-build and push to Docker Hub
- [x] Installation guides for Windows/Mac/Linux
- [ ] Docker Compose setup with volume management
- [ ] Add Electron wrapper for true desktop app
- [ ] Support portable mode (database + images in same folder)
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
