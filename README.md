# Peel - JSON Photo Generation UI

A modern web UI frontend for the Google Nano Banana Pro API, specializing in JSON-style photo generation with drag-and-drop image support.

## Features

- 🎨 **Image Upload**: Drag & drop, paste from clipboard, or click to upload images
- 📝 **JSON Prompt Editor**: Syntax-highlighted JSON editor with real-time validation
- 🔄 **Flexible Prompts**: Supports both JSON and plain text prompts
- 🖼️ **Image Generation**: Generate images from scratch or edit existing ones
- 💾 **File-Based Storage**: Persistent data storage in your Documents folder (works across browsers/devices)
- 📁 **Data Migration**: Easy migration from browser storage to file-based storage
- 🎯 **Modern UI**: Beautiful, responsive design with smooth animations

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Build

```bash
npm run build
```

## Usage

1. **Enter API Key**: Add your Google Nano Banana Pro API key at the top of the page
2. **Upload Image** (optional): Drag, drop, paste, or click to upload an image
3. **Enter Prompt**: 
   - Use plain text for simple prompts
   - Use JSON format for structured prompts (automatically highlighted)
4. **Generate**: Click the "Generate Image" button
5. **Download**: Save your generated image

## JSON Prompt Format

When your prompt starts with `{` or `[`, it will be treated as JSON and syntax-highlighted. Example:

```json
{
  "prompt": "a beautiful sunset over mountains",
  "style": "photorealistic",
  "resolution": "4k"
}
```

## API Configuration

Update the API endpoint in `src/services/api.js` with the actual Google Nano Banana Pro API endpoint.

## Data Storage

Peel Editor now uses **file-based storage** instead of browser storage. This means your data is stored in a folder in your Documents directory, making it:

- ✅ **Persistent** across browser sessions
- ✅ **Accessible** from any browser on your computer
- ✅ **Safe** - your data isn't lost when clearing browser data
- ✅ **Portable** - you can backup or move your data folder

### First-Time Setup

When you first use the app, you'll be prompted to:
1. Select a folder where your data will be stored (recommended: Documents folder)
2. The app will create a `PeelEditor/data` folder inside your selected location

### Migrating Existing Data

If you have existing data in your browser:

1. **Automatic Detection**: The app will automatically detect if you have browser-stored data
2. **Migration Prompt**: A migration dialog will appear on first load
3. **Select Folder**: Choose where you want your data stored
4. **Export Complete**: All your data (posts, images, profiles, prompts, settings) will be copied to files

**Note**: Your original browser data is **never deleted** - it's just copied to files. You can still access it in your browser if needed.

### Data Location

Your data is stored in:
```
Documents/PeelEditor/data/
├── feed_posts.json       # All feed posts
├── gallery_images.json   # Gallery image metadata
├── profiles.json         # User profiles
├── prompts.json          # Saved prompts
└── settings.json         # App settings (API key, API URL, etc.)
```

Image files are stored alongside the JSON files with descriptive names.

### Browser Compatibility

File-based storage uses the **File System Access API**, which is currently supported in:
- ✅ Chrome/Edge (Chromium-based browsers)
- ✅ Other browsers may require different approaches

If your browser doesn't support the File System Access API, the app will show an error message.

## Technologies

- React 18
- Vite
- Monaco Editor (for JSON syntax highlighting)
- React Dropzone (for file uploads)
- File System Access API (for file storage)

## License

MIT

