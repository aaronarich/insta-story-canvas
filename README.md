# Instagram Story Canvas

A React Native/Expo app that helps you create perfectly sized Instagram stories with custom white borders. Upload any image and the app will automatically resize it to Instagram's 9:16 aspect ratio (2790x4960 pixels) with a clean white background.

## ✨ Features

- **Perfect Instagram Story Dimensions**: Automatically formats images to Instagram's 9:16 aspect ratio (2790x4960 pixels)
- **Smart Image Scaling**: Maintains image proportions while fitting within the story canvas
- **White Border Background**: Adds clean white borders around your images
- **Cross-Platform**: Works on iOS, Android, and Web
- **High Quality Export**: Saves images in high resolution JPEG format
- **Easy Image Selection**: Pick images from your device's photo library
- **Scale Control**: Adjustable image scaling for perfect positioning

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd insta-story-canvas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on your preferred platform**
   - **iOS**: `npm run ios` or press `i` in the terminal
   - **Android**: `npm run android` or press `a` in the terminal
   - **Web**: `npm run web` or press `w` in the terminal

## 📱 How to Use

1. **Launch the app** on your device or simulator
2. **Grant permissions** when prompted for photo library access
3. **Tap "Pick Image"** to select an image from your device
4. **Adjust the scale** using the slider if needed
5. **Tap "Save"** to export your Instagram story
6. **Find your image** in your device's Photos app (or Downloads folder on web)

## 🛠️ Technical Details

### Built With

- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **Expo GL** - Graphics and rendering capabilities
- **React Native View Shot** - High-quality image capture
- **Expo Image Picker** - Image selection from device
- **Expo Media Library** - Saving images to device

### Architecture

- **Canvas Dimensions**: 2790x4960 pixels (Instagram Story format)
- **Aspect Ratio**: 9:16 (portrait orientation)
- **Image Processing**: Automatic scaling and centering
- **Export Format**: High-quality JPEG

### Platform-Specific Features

- **Web**: Uses HTML5 Canvas API for image processing and direct download
- **iOS/Android**: Uses React Native View Shot for native image capture and Media Library for saving

## 📁 Project Structure

```
insta-story-canvas/
├── App.js                 # Main application component
├── package.json          # Dependencies and scripts
├── app.json             # Expo configuration
├── assets/              # App icons and splash screens
├── public/              # Web-specific assets
└── README.md            # This file
```

## 🔧 Configuration

### App Configuration (`app.json`)

- **Bundle ID**: `com.aaronarich.instastorycanvas`
- **Platforms**: iOS, Android, Web
- **Permissions**: Photo library access for reading and writing
- **Orientation**: Portrait only (optimized for stories)

### Dependencies

Key packages include:
- `expo-image-picker` - Image selection
- `expo-media-library` - Photo library access
- `react-native-view-shot` - Image capture
- `@react-native-community/slider` - Scale control

## 🚀 Deployment

### Building for Production

1. **Configure EAS Build** (if using Expo Application Services)
   ```bash
   eas build:configure
   ```

2. **Build for platforms**
   ```bash
   eas build --platform ios
   eas build --platform android
   ```

### Web Deployment

The app can be deployed to any static hosting service:
- Vercel
- Netlify
- GitHub Pages
- AWS S3

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/)
- Instagram story dimensions based on official platform specifications

---

**Note**: This app requires photo library permissions to function properly. Make sure to grant the necessary permissions when prompted.
