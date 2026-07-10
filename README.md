# StreamSaga 🎬

A full-stack video streaming platform powered by **Cloudflare R2**, built with:
- **Server**: Express + TypeScript → **Railway**
- **Admin**: React + Vite + TypeScript → **Vercel**
- **Client**: React + Vite + TypeScript → **Vercel**

---

## Architecture

```
Admin (Vercel) ──presigned PUT──► Cloudflare R2
     │                                  │
     │ REST API                  Public URL or
     ▼                           server proxy
Server (Railway) ◄─── Client (Vercel)
```

---

## Quick Start

### 1. Install dependencies
```bash
cd server && npm install
cd ../admin && npm install
cd ../client && npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` in each folder and fill in your values.

**Server** (`server/.env`):
```
MONGODB_URI=...
JWT_SECRET=...          # long random string
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=vid
R2_PUBLIC_URL=https://your-r2-domain.com   # set if bucket is public
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourSecurePassword!
CLIENT_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
```

**Admin** (`admin/.env`):
```
VITE_API_URL=http://localhost:5000/api
```

**Client** (`client/.env`):
```
VITE_API_URL=http://localhost:5000/api
```

### 3. Seed admin user
```bash
cd server && npm run seed
```

### 4. Start development servers
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd admin && npm run dev    # http://localhost:5174

# Terminal 3
cd client && npm run dev   # http://localhost:5173
```

---

## Deployment

### Server → Railway
1. Push `server/` to a Railway service
2. Set all env vars in Railway dashboard
3. Railway will auto-detect Node.js and run `node dist/server.js`

### Admin → Vercel
1. Connect `admin/` folder to a Vercel project
2. Set `VITE_API_URL=https://your-railway-server.up.railway.app/api`
3. Vercel will auto-run `npm run build`

### Client → Vercel
1. Connect `client/` folder to a Vercel project
2. Set `VITE_API_URL=https://your-railway-server.up.railway.app/api`

---

## Video Player Features

| Feature | Details |
|---|---|
| HLS.js streaming | Adaptive bitrate, segment-based |
| Quality selection | Auto + all HLS levels |
| Speed control | 0.25× to 2× |
| Volume slider | Smooth, with mute toggle |
| Progress bar | Click/drag seek, buffered indicator |
| Fullscreen | Native fullscreen API |
| Keyboard shortcuts | Space, K, ←, →, ↑, ↓, M, F, J, L |
| Auto-hide controls | Hides after 3s of inactivity |

---

## R2 Upload Flow (Large Files)

1. Admin selects video file in browser
2. Admin app requests presigned PUT URL from server (`GET /api/uploads/presigned-url`)
3. Browser uploads directly to R2 via PUT (no server proxy — handles any file size)
4. Admin app confirms upload (`POST /api/uploads/confirm`)
5. Admin fills in metadata → creates video record in MongoDB
6. Client fetches video list → plays via R2 public URL or server stream proxy
