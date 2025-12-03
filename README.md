# InstaCanvas

A progressive web app for creating Instagram Story canvases (2790x4960) with filters and effects.

## Features

- **Canvas Creation**: High-quality 2790x4960px canvases for Instagram Stories
- **Image Upload**: Select and position images on the canvas
- **Resize Control**: Scale images with a slider (0.1x - 3x)
- **Color Picker**: Choose custom background colors
- **Favorites**: Save and load your preferred image scale
- **Creative Filters**:
  - **Portra 400**: Film-like warm tones with grain
  - **Ilford B&W**: Classic high-contrast black and white
  - **Light Leak**: Random warm light overlays
  - **Game Boy**: 4-level grayscale with Bayer dithering
- **PWA Support**: Install to home screen and work offline
- **Mobile Optimized**: Web Share API and responsive design

## Installation

```bash
npm install
npm run dev
```

## PWA Installation

- **iOS**: Open in Safari → Share → "Add to Home Screen"
- **Android**: Tap "Install" in the browser menu

## Technologies

- Vite
- PWA Plugin (vite-plugin-pwa)
- HTML5 Canvas API
- Web Share API
- Service Workers
