# ImageBox Product Design & Architecture

## 1. Context & Goals

**User Goal**: A lightweight, local-first tool for office users to manage AI image generation.
**Key Needs**:

- **Lightweight & Cross-Platform**: Windows, Mac, Remote Web Access, Mobile (Optional).
- **Workflow**: Manage templates -> Generate -> Manage Assets.
- **Audience**: Office users (not ComfyUI experts). Focus on ease of use, parameter management, and asset organization.
- **Model**: Google Gemini (specifically `gemini-3-pro-image-preview`).

## 2. Product Architecture

To satisfy "Local + Web + Cross-Platform" with a single lightweight codebase:

**Technology Stack**:

- **Framework**: **Next.js** (React).
  - _Reasoning_: Acts as both the Frontend UI and the Backend API/Server. Can be run locally (`localhost:3000`) to provide the Web Interface for remote/mobile users.
- **Database**: **SQLite** (via **Prisma** ORM).
  - _Reasoning_: Zero-configuration, single-file database, perfect for valid local-first tools.
- **Styling**: **Tailwind CSS** + **Framer Motion**.
  - _Reasoning_: Rapid styling, "Premium" aesthetics, smooth animations.
- **Desktop Wrapper**: **Electron** (Optional but recommended for "App" feel).
  - _Reasoning_: Can wrap the local Next.js server into a clickable `.app` / `.exe`.
- **Mobile Support**: **PWA (Progressive Web App)** or Mobile Web.
  - _Reasoning_: Since "Remote Web" is required, a responsive PWA covers Android/iOS requirements without separate native codebases.

## 3. Core Features & Structure

### A. Dashboard / Gallery (`/`)

_The "Home" view._

- **Visuals**: Masonry grid of generated images.
- **Filtering**: By Template, Date, aspect ratio.
- **Quick Actions**: "Reuse Parameters", "Download", "Delete".
- **Design**: Clean, gallery-style, showing prompt on hover.

### B. The Studio (`/studio`)

_The core work area._

- **Layout**: Split screen (Inputs vs. Results) or Collapsible Sidebar.
- **Workflow**:
  1.  **Select Template**: Dropdown or Card view (e.g., "Social Post", "Presentation Background").
  2.  **Prompt Configuration**:
      - If Template has variables (e.g., "A {animal} in the style of {artist}"), show form fields.
      - Show "Raw Prompt Preview" calculated from variables.
  3.  **Parameters**:
      - Model: Default `gemini-3-pro-image-preview` (Editable).
      - Aspect Ratio: 1:1, 16:9, 9:16, 4:3 (Visual selector).
      - Count: Number of images to generate.
  4.  **Action**: "Generate" (Calls Gemini API).
  5.  **Multi-View**:
      - Compare current results with previous ones.
      - "Pin" favorite results for reference.

### C. Template Manager (`/templates`)

_For the "Power User" or "Admin"._

- **List**: All saved templates.
- **Editor**:
  - Name & Icon.
  - System Prompt / Base Prompt.
  - Define Variables (e.g., `{{keyword}}`).
  - Set Defaults: Model, Resolution, Guidance Scale (if applicable).

### D. Settings (`/settings`)

- **API Keys**: Input for Google Gemini API Key.
- **Network**: Port configuration for remote access (e.g., `0.0.0.0` to share on LAN).
- **Paths**: Where to store images on disk.

## 4. UI/UX Aesthetic "Premium & Light"

- **Theme**: "Obsidian Glass" – Deep dark backgrounds (Slate/Zinc 900) with subtle glassmorphism borders and vibrant accent gradients (Indigo/Violet/Cyan).
- **Typography**: Inter (Clean, legible, modern).
- **Interactions**:
  - Hover lifts on cards.
  - Smooth transitions between pages.
  - Skeleton loaders during generation.

## 5. Implementation Roadmap

1.  **Initialize Next.js Project** (Tailwind, TypeScript).
2.  **Setup Database** (SQLite + Prisma Schema for `Image` and `Template`).
3.  **Implement Gemini API Integration** (Server Action).
4.  **Build Studio UI** (Inputs, Settings, Preview).
5.  **Build Gallery UI**.
6.  **Build Template Manager**.
