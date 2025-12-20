# ImageBox

<div align="center">

**A local-first AI image generation tool**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

## Overview

**ImageBox** is a completely free, local-first AI image generation tool built with Next.js 16. Generate stunning AI images using Google Gemini 3 Pro, manage reusable templates, and organize all your creations locally. No cloud storage, no subscriptions, no data collection—just pure creative freedom on your machine.

## Features

### Core Capabilities

- **🎨 Multi-Model Support** - Seamlessly integrate multiple AI providers:
  - Google Gemini Official API (Gemini 2.5 Flash, Gemini 3 Pro)
  - OpenAI Official API (DALL-E 3)
  - OpenAI-compatible endpoints (OpenRouter, custom providers)
  - Auto-adaptive parameter configuration with built-in presets
  - Smart parameter mapping for different API formats

- **📝 Advanced Template System** - Powerful prompt management workflow:
  - Create reusable templates with `{{variable}}` syntax
  - Two-stage generation: Prompt optimization → Image generation
  - Separate model selection for prompt enhancement and image creation
  - Customizable system prompts for prompt optimization
  - Dynamic form generation from template variables

- **🖼️ Image-to-Image Generation** - Reference-guided creation:
  - Upload reference images to guide generation (supports 2-14 images per model)
  - Smart validation for image size and aspect ratio
  - Automatic adjustment based on model capabilities
  - Visual feedback for image compatibility

- **📁 Complete Asset Management** - Organize your creations:
  - Folder-based organization system
  - Masonry grid gallery with responsive layout
  - Quick actions: Download, copy to clipboard, favorite, delete
  - Image metadata tracking (prompt, model, parameters, timestamp)

- **📊 Full Run Logs** - Complete generation history tracking:
  - Detailed logs for every API call (prompt generation & image generation)
  - Request/response timing and duration
  - Success/failure status with error messages
  - Configuration parameters for each generation
  - Searchable history for debugging and analysis

### Privacy & Storage

- **🔒 Privacy First** - Your data stays yours:
  - All images and metadata stored locally (SQLite database)
  - API keys stored locally, never transmitted except to chosen providers
  - Only necessary AI model API calls go to external services
  - No telemetry, no analytics, no data collection
  - Full control over your creative assets

- **💾 Local-First Architecture**:
  - SQLite database - Lightweight, portable, zero-configuration
  - File-based image storage in `public/generated/`
  - No cloud dependencies (except AI model APIs)
  - Works offline for management and viewing

### Remote Access & Security

- **🔐 Token-Based Authentication** - Secure remote access with access tokens:
  - Create multiple access tokens with custom names and descriptions
  - Flexible expiration options (1 hour, 24 hours, 7 days, 30 days, or permanent)
  - Revoke tokens instantly for security
  - Track last usage time for each token
  - Cookie and header-based authentication support

- **🌐 Smart Access Control** - Intelligent middleware protection:
  - Local access (localhost) requires no authentication
  - Remote access requires valid token and enabled remote access setting
  - First-time setup wizard guides initial configuration
  - Public paths and static resources automatically allowed
  - Real-time token validation with automatic expiration

- **📂 Custom Storage Paths** - Flexible storage configuration:
  - Configure custom image storage directory
  - Path validation before saving
  - Storage statistics and monitoring
  - Visual folder browser for easy path selection
  - Automatic fallback to default path if custom path fails

### User Experience

- **✨ Modern UI** - Beautiful dark glassmorphism design with smooth animations
- **🌍 Multi-Language Support** - 13 languages: English, Chinese (Simplified & Traditional), Japanese, German, French, Russian, Portuguese, Spanish, Italian, Arabic (RTL), Norwegian, Swedish
- **🎨 Theme System** - Dark/light/system theme modes with seamless transitions
- **🌐 Cross-Platform Access** - Use via localhost or LAN from any device with secure remote access
- **⚡ Fast & Secure** - Next.js Server Actions for optimized API calls
- **🆓 100% Free & Open Source** - No hidden fees, only your own API key costs

## Screenshots

> Coming soon - Screenshots will be added after UI refinement

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Google Gemini API key (free tier available at [Google AI Studio](https://makersuite.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/imagebox.git
cd imagebox

# Install dependencies
npm install

# Initialize database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### First-Time Setup

1. Navigate to **Models** page (`/models`)
2. Add a new Provider and configure your API key
3. Add a new Model and select the appropriate provider
4. Go to **Create** (`/create`) and start generating images!

### Remote Access Setup (Optional)

If you want to access ImageBox from other devices on your network:

1. Navigate to **Settings** page (`/settings`)
2. Enable **Remote Access** toggle
3. Click **Create Access Token**
4. Choose an expiration time and add a description (optional)
5. Copy the generated token and access link
6. On your remote device, visit the access link and enter the token
7. You're now securely connected!

**Security Tips:**
- Use shorter expiration times for better security
- Create separate tokens for different devices
- Revoke tokens when no longer needed
- Keep your tokens private - they grant full access to your ImageBox instance

## Usage

### Creating Templates

1. Go to **Templates** page (`/templates`)
2. Click **New Template**
3. Add variables using `{{variableName}}` syntax (e.g., `{{subject}}`, `{{style}}`)
4. Save and use in Create page

**Example Template:**
```
A beautiful {{subject}} in {{style}} style, highly detailed, 4k
```

### Generating Images

1. Go to **Create** page (`/create`)
2. Enter a prompt or select a template
3. Fill in template variables if applicable
4. Click **Generate**
5. View results in **Library** (`/library`)

## Tech Stack

- **Framework**: Next.js 16 (App Router, React Server Components)
- **Database**: SQLite via Prisma ORM
- **Styling**: Tailwind CSS v4 + Framer Motion
- **AI Model**: Google Gemini 3 Pro (`gemini-3-pro-image-preview`)
- **Language**: TypeScript 5

## Project Structure

```
imagebox/
├── app/
│   ├── page.tsx              # Home page (redirects to /library)
│   ├── library/page.tsx      # Image gallery and management
│   ├── create/page.tsx       # Image generation interface
│   ├── templates/page.tsx    # Template management
│   ├── models/page.tsx       # Model & provider configuration
│   ├── settings/page.tsx     # Settings (remote access, storage)
│   ├── run_log/page.tsx      # Generation history logs
│   ├── auth/login/page.tsx   # Remote access login page
│   ├── api/
│   │   ├── auth/             # Authentication endpoints
│   │   ├── images/           # Image serving API
│   │   └── browse-folders/   # Folder browser API
│   ├── actions.ts            # Server Actions (DB + API)
│   └── layout.tsx            # Root layout with navigation
├── components/
│   ├── Sidebar.tsx           # Navigation sidebar
│   ├── ThemeProvider.tsx     # Theme management
│   ├── LanguageProvider.tsx  # I18n support
│   └── FolderBrowser.tsx     # Storage path browser
├── lib/
│   ├── prisma.ts             # Prisma client singleton
│   ├── modelParameters.ts    # Parameter mapping system
│   ├── imageUrl.ts           # Image URL utilities
│   └── i18n/                 # Translation files
├── prisma/
│   └── schema.prisma         # Database schema
├── middleware.ts             # Auth & access control
└── public/generated/         # Generated images (auto-created)
```

## Roadmap

### ✅ Completed Features
- [x] **Internationalization (i18n)** - 13 languages with RTL support for Arabic
- [x] **Dark/Light Theme** - User-selectable theme with smooth transitions and system detection
- [x] **Multi-Model Support** - Google Gemini 2.5/3 Pro, OpenAI DALL-E 3, and OpenAI-compatible endpoints
- [x] **Remote Access System** - Token-based authentication with flexible access control
- [x] **Custom Storage Paths** - Configurable image storage directory with validation
- [x] **Folder Organization** - Folder-based image management system
- [x] **Image Favorites** - Star/favorite functionality for quick access

### High Priority
- [ ] **Advanced Search & Filtering** - Search images by prompt, date, model, tags
- [ ] **Batch Generation** - Generate multiple images from one prompt
- [ ] **Image Tagging System** - Custom tags for better organization

### Medium Priority
- [ ] Enhanced generation controls (negative prompts, seeds, advanced parameters)
- [ ] Export & sharing features (ZIP export, shareable links)
- [ ] Stable Diffusion integration
- [ ] Image editing and variations

### Future Enhancements
- [ ] Performance optimizations (virtual scrolling, lazy loading, thumbnails)
- [ ] Database backup/restore functionality
- [ ] Docker/Docker Compose deployment
- [ ] Electron desktop wrapper
- [ ] Mobile-responsive interface improvements

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Development

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# View database with Prisma Studio
npx prisma studio

# Lint code
npm run lint
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Google Gemini AI](https://deepmind.google/technologies/gemini/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Animated with [Framer Motion](https://www.framer.com/motion/)

## Support

If you find this project helpful, please consider:
- Starring the repository ⭐
- Sharing it with others
- [Opening an issue](https://github.com/yourusername/imagebox/issues) for bugs or feature requests

---

<div align="center">

Made with ❤️ by the open source community

</div>
