# Peel - JSON Photo Generation UI

A modern web UI frontend for Nano Banana 2 through OpenRouter, specializing in JSON-style photo generation with drag-and-drop image support.

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

1. **Enter API Key**: Add your OpenRouter API key at the top of the page
2. **Upload Image** (optional): Drag, drop, paste, or click to upload an image
3. **Enter Prompt**: 
   - Use plain text for simple prompts
   - Use JSON format for structured prompts (automatically highlighted)
4. **Generate**: Click the "Generate Image" button
5. **Download**: Save your generated image

Enable **Use Nano Banana 2 Lite** in Generation Settings to switch a request to `google/gemini-3.1-flash-lite-image`.

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

The default endpoint is OpenRouter's unified Image API (`https://openrouter.ai/api/v1/images`) and the default model is the stable Nano Banana 2 release (`google/gemini-3.1-flash-image`).

You can override either value with Vite environment variables:

```bash
VITE_OPENROUTER_API_URL=https://openrouter.ai/api/v1/images
VITE_OPENROUTER_MODEL=google/gemini-3.1-flash-image
```

The optional endpoint field in the UI overrides `VITE_OPENROUTER_API_URL`. The OpenRouter API key is stored locally in the browser and sent as a Bearer token directly to OpenRouter.

## Technologies

- React 18
- Vite
- Monaco Editor (for JSON syntax highlighting)
- React Dropzone (for file uploads)

## License

MIT
