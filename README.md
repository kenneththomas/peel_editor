# Peel — Creative Studio

A modern web UI frontend for image generation through OpenRouter, specializing in JSON-style photo generation with drag-and-drop image support.

## Workspace

Peel has a two-column creation workspace with a large image canvas, compact generation controls, and connection settings behind the header's Settings button. A shared dark theme uses a warm accent across Create, Library, Feed, and Video.

- **Generation history** saves each submitted prompt, model, seed, and reference images before generation starts. Successful results are downloaded into IndexedDB as image blobs. History includes failed, cancelled, and interrupted runs; restore inputs to retry a run or use its image as a reference.
- **Library** supports titles, collections, comma-separated tags, favorites, search, sorting, multi-image import, and undo for the most recent removal. Saving a generation again updates the same library asset while preserving its organization.
- **Local storage** keeps images and history in this browser. Clearing browser site data removes them. Existing IndexedDB images and legacy localStorage images are preserved during upgrade. If a provider URL cannot be downloaded, the canvas remains usable and shows a warning to download the image manually.
- **Video backend** requires explicit allowed folders and an access token. See [backend setup](README_BACKEND.md).

Run `npm test` for file-access restrictions, generation snapshots, storage migration, and library persistence checks. Run `npm run build` to verify the production bundle.

## Features

- 🎨 **Image Upload**: Drag & drop, paste from clipboard, or click to upload images
- 📝 **JSON Prompt Editor**: Syntax-highlighted JSON editor with real-time validation
- 🔄 **Flexible Prompts**: Supports both JSON and plain text prompts
- 🖼️ **Image Generation**: Generate images from scratch or edit existing ones
- 💾 **API Key Management**: API key stored locally in the browser
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

1. **Enter API Key**: Open Connection settings from the header and add your OpenRouter API key
2. **Upload Image** (optional): Drag, drop, paste, or click to upload an image
3. **Enter Prompt**: 
   - Use plain text for simple prompts
   - Use JSON format for structured prompts (automatically highlighted)
4. **Generate**: Click the "Generate Image" button
5. **Download**: Save your generated image

Generation defaults to `bytedance-seed/seedream-5-0-flash`. Select another available OpenRouter image generation model in Generation Settings.

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

The default endpoint is OpenRouter's unified Image API (`https://openrouter.ai/api/v1/images`) and the default model is `bytedance-seed/seedream-5-0-flash`. Generation Settings loads available image models from OpenRouter's image models catalog.

You can override either value with Vite environment variables:

```bash
VITE_OPENROUTER_API_URL=https://openrouter.ai/api/v1/images
VITE_OPENROUTER_MODEL=bytedance-seed/seedream-5-0-flash
```

The optional endpoint field in the UI overrides `VITE_OPENROUTER_API_URL`. The OpenRouter API key is stored locally in the browser and sent as a Bearer token directly to OpenRouter.

## Technologies

- React 18
- Vite
- Monaco Editor (for JSON syntax highlighting)
- React Dropzone (for file uploads)

## License

MIT
