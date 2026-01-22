# Backend Service for Video Editor

The backend service enables actual file deletion and folder path-based video loading.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the backend server:
```bash
npm run dev:backend
```

Or start both frontend and backend together:
```bash
npm run dev:all
```

## Usage

### Backend Mode

1. Start the backend server (runs on port 3001 by default)
2. In the Video Editor tab, enter a folder path (e.g., `C:\Videos\MyFolder`)
3. Click "Load from Backend"
4. Videos will be loaded and you can delete them (actually deletes from disk)

### Browser Mode (Fallback)

If the backend is not available, you can still use the browser file picker:
1. Click "Select Folder (Browser)"
2. Select a folder through the browser dialog
3. Videos will be loaded, but deletion only removes them from view

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/videos/list` - List videos in a folder
  - Body: `{ "folderPath": "C:\\Videos\\MyFolder" }`
- `GET /api/videos/file?filePath=...` - Stream a video file
- `DELETE /api/videos/delete` - Delete a video file
  - Body: `{ "filePath": "C:\\Videos\\MyFolder\\video.mp4" }`

## Environment Variables

- `PORT` - Backend server port (default: 3001)
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001)

## Security Note

The backend has access to your file system. Only run it in a trusted environment. The server will:
- Only access files you explicitly specify
- Only delete video files
- Validate file paths before operations
