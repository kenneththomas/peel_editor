# Peel - JSON Photo Generation UI

A modern web UI frontend for the Google Nano Banana Pro API, specializing in JSON-style photo generation with drag-and-drop image support.

## Features

- 🎨 **Image Upload**: Drag & drop, paste from clipboard, or click to upload images
- 📝 **JSON Prompt Editor**: Syntax-highlighted JSON editor with real-time validation
- 🔄 **Flexible Prompts**: Supports both JSON and plain text prompts
- 🖼️ **Image Generation**: Generate images from scratch or edit existing ones
- 💾 **API Key Management**: Secure API key storage in localStorage
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

## Technologies

- React 18
- Vite
- Monaco Editor (for JSON syntax highlighting)
- React Dropzone (for file uploads)

## License

MIT

