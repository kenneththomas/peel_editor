# Local video backend

The backend loads, streams, deletes, and stitches videos from explicitly configured folders. It binds to `127.0.0.1` and denies file access until both a folder allowlist and an access token are configured.

## Start on Windows

In PowerShell, choose the folders that Peel may access and a long random token:

```powershell
$env:PEEL_VIDEO_ROOTS = 'C:\Videos;D:\Creative\Clips'
$env:PEEL_API_TOKEN = [guid]::NewGuid().ToString('N')
# Copy this token into Peel's Video tab; do not share it.
$env:PEEL_API_TOKEN
npm run dev:backend
```

Start the frontend with `npm run dev` in another terminal. In the Video tab, enter the backend token and an absolute folder path inside one of the allowed roots. The token stays in memory and must be entered again after a page reload.

Only configure folders you intend Peel to manage. Video deletion still permanently deletes the original file after the UI confirmation. The library's Undo applies to saved images, not disk video files.

## Configuration

- `PEEL_VIDEO_ROOTS`: absolute existing directories separated by `;` on Windows (`:` on Unix). Symlinks and junctions escaping these directories are rejected. Recursive listing skips links.
- `PEEL_API_TOKEN`: required Bearer token for listing, deleting, and stitching.
- `PORT`: backend port, default `3001`.
- `VITE_API_URL`: frontend backend URL, default `http://localhost:3001`.
- `PEEL_UI_ORIGINS`: optional comma-separated trusted frontend origins. Defaults to localhost and 127.0.0.1 on ports 3000 and 5173. CORS is supplemented with token authorization.

FFmpeg must be installed and available on PATH for stitching. Peel runs it directly without a shell, retries with re-encoding when stream-copy fails, and cleans up temporary output files.

## API

- `GET /api/health`: readiness and configuration status, without credentials or folder paths.
- `POST /api/videos/list`: authorized request with `{ "folderPath": "C:\\Videos" }`.
- `GET /api/videos/file?id=…`: expiring, unguessable streaming capability issued by an authorized listing. Supports byte ranges for seeking. Raw file paths are not accepted. Reload the folder after a backend restart or after 24 hours.
- `DELETE /api/videos/delete`: authorized request with `{ "filePath": "C:\\Videos\\clip.mp4" }`.
- `POST /api/videos/stitch`: authorized request with `{ "filePaths": ["…", "…"] }` (2–100 clips). All paths are checked against canonical allowed roots.

Use `Authorization: Bearer <token>` for authorized requests. Never put the backend token in a URL.
