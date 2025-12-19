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

- **100% Free & Open Source** - No API costs beyond your own Gemini key, no hidden fees
- **Local-First Storage** - All images and data stored locally on your machine
- **Template Management** - Create reusable prompt templates with variable substitution
- **Modern UI** - Beautiful dark glassmorphism design with smooth animations
- **Cross-Platform Access** - Use via localhost or LAN from any device
- **Privacy Focused** - Your API keys and images never leave your machine
- **SQLite Database** - Lightweight, portable, zero-configuration database
- **Server Actions** - Fast, secure API calls with Next.js Server Actions

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

1. Navigate to **Settings** page
2. Enter your Google Gemini API key
3. Click **Save Settings**
4. Go to **Studio** and start generating images!

## Usage

### Creating Templates

1. Go to **Templates** page
2. Click **New Template**
3. Add variables using `{{variableName}}` syntax (e.g., `{{subject}}`, `{{style}}`)
4. Save and use in Studio

**Example Template:**
```
A beautiful {{subject}} in {{style}} style, highly detailed, 4k
```

### Generating Images

1. Go to **Studio** page
2. Enter a prompt or select a template
3. Fill in template variables if applicable
4. Click **Generate**
5. View results in **Gallery**

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
│   ├── page.tsx              # Gallery (home page)
│   ├── studio/page.tsx       # Image generation interface
│   ├── templates/page.tsx    # Template management
│   ├── settings/page.tsx     # Settings & API keys
│   ├── actions.ts            # Server Actions (DB + API)
│   └── layout.tsx            # Root layout with navigation
├── components/
│   └── Sidebar.tsx           # Navigation sidebar
├── lib/
│   └── prisma.ts             # Prisma client singleton
├── prisma/
│   └── schema.prisma         # Database schema
└── public/generated/         # Generated images (auto-created)
```

## Roadmap

### High Priority
- [ ] **Internationalization (i18n)** - English & Chinese language support
- [ ] **Dark/Light Theme** - User-selectable theme with smooth transitions
- [ ] **Multi-Model Support** - OpenAI DALL-E 3, Stable Diffusion, and more

### Medium Priority
- [ ] Batch image generation
- [ ] Advanced image organization (tags, folders, favorites)
- [ ] Enhanced generation controls (size, negative prompts, seeds)
- [ ] Export & sharing features

### Future Enhancements
- [ ] Performance optimizations (virtual scrolling, lazy loading)
- [ ] Database backup/restore
- [ ] Docker deployment
- [ ] Electron desktop wrapper

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
