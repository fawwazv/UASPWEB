# Memory Hack - Server

Backend dari game **Memory Hack**. Dibangun dengan Node.js, Express, dan Socket.IO untuk menangani koneksi real-time antar pemain. State game disimpan di Redis untuk mendukung multi-instance deployment.

---

## Tech Stack

| Teknologi | Keterangan |
|-----------|------------|
| Node.js | Runtime JavaScript |
| TypeScript | Bahasa utama |
| Express.js v5 | HTTP server dan health check endpoint |
| Socket.IO v4 | Komunikasi real-time WebSocket |
| Redis (ioredis) | Penyimpanan state game antar instance |
| @socket.io/redis-adapter | Adapter untuk multi-instance Socket.IO |
| nodemon | Auto-restart saat development |
| ts-node | Jalankan TypeScript langsung tanpa build |

---

## Struktur Folder

```
server/
├── src/
│   ├── index.ts              # entry point, setup Express + Socket.IO + Redis
│   ├── redis.ts              # konfigurasi koneksi Redis
│   ├── game/
│   │   ├── GameRoom.ts       # class GameRoom, logika satu room game
│   │   └── GameManager.ts    # class GameManager, manage semua room
│   └── socket/
│       └── index.ts          # semua event handler Socket.IO
├── dist/                     # hasil build TypeScript (untuk production)
├── .env.example              # contoh environment variables
├── tsconfig.json
└── package.json
```

---

## Cara Setup dan Jalankan

### Prasyarat
- Node.js v18 atau lebih baru
- Redis (opsional, kalau tidak ada pakai in-memory)

### Install dependensi
```bash
npm install
```

### Konfigurasi environment
Salin `.env.example` menjadi `.env` lalu isi:
```bash
cp .env.example .env
```

```env
PORT=3001
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000
```

### Jalankan saat development

Dengan auto-restart (nodemon):
```bash
npm run dev
```

Tanpa auto-restart, langsung pakai ts-node:
```bash
npm run dev:direct
```

Server berjalan di `http://localhost:3001`.

### Build dan jalankan production
```bash
npm run build
node dist/index.js
```

---

## Environment Variables

| Variable | Keterangan | Default |
|----------|------------|---------|
| `PORT` | Port server | `3001` |
| `REDIS_URL` | URL koneksi Redis | - (in-memory jika kosong) |
| `CORS_ORIGIN` | Allowed origin untuk CORS | `*` |
| `CLIENT_URL` | Alias untuk CORS_ORIGIN | - |

---

## Socket Events

### Events yang diterima server (dari client)

| Event | Payload | Keterangan |
|-------|---------|------------|
| `create_room` | `{ maxLevel, maxPlayers, hostIsSpectator, isPrivate }` | Host buat room baru dengan settings |
| `join_room` | `{ roomId, playerName }` | Player masuk ke room |
| `player_ready` | `{ roomId }` | Player toggle status siap |
| `game_start` | `{ roomId }` | Host mulai game |
| `submit_answer` | `{ roomId, placedItems, timeRemaining }` | Player kirim jawaban |
| `leave_room` | `{ roomId }` | Player keluar room |
| `delete_room` | `{ roomId }` | Host hapus room |
| `get_public_rooms` | - | Minta daftar room publik (callback) |

### Events yang dikirim server (ke client)

| Event | Payload | Keterangan |
|-------|---------|------------|
| `room_state` | `{ roomId, status, players, hostId, maxLevel, maxPlayers, hostIsSpectator }` | Update state room |
| `public_rooms_updated` | `PublicRoomInfo[]` | Daftar room publik berubah |
| `game_countdown` | `{ count }` | Countdown sebelum game mulai |
| `level_start` | `{ level, gridSize, items, memorizeTime, answerTime }` | Level baru dimulai |
| `phase_sync` | `{ phase, timeRemaining }` | Sinkronisasi waktu tiap detik |
| `answer_result` | `{ correctCount, totalCells, scoreGain, timeBonus }` | Hasil jawaban player |
| `leaderboard_update` | `{ players }` | Update skor semua player |
| `level_complete` | `{ level, nextLevel }` | Level selesai |
| `game_over` | `{ finalLeaderboard }` | Game selesai |
| `room_deleted` | - | Room dibubarkan host |
| `opponent_left` | `{ playerId }` | Ada lawan yang keluar saat game |

---

## Arsitektur Game State

```
GameManager
└── Map<roomId, GameRoom>   ← satu GameRoom per room

GameRoom
├── players: Map<id, Player>
├── settings: maxLevel, maxPlayers, hostIsSpectator, isPrivate
├── status: lobby | countdown | playing | ended
└── phase: memorize | answer
```

State setiap room disimpan ke Redis sebagai JSON dengan TTL 2 jam. Kalau Redis tidak ada, state disimpan di memory lokal proses Node.js (tidak cocok untuk multi-instance).

---

## Deploy ke Railway

1. Buat project baru di Railway, hubungkan repository
2. Set **Root Directory** ke folder `server` (atau deploy dari root dan Railway akan detect `package.json`)
3. Railway otomatis jalankan `npm run build` dan `npm start`
4. Tambahkan environment variables:
   - `CORS_ORIGIN` → URL frontend Vercel (contoh: `https://memory-hack.vercel.app`)
   - `REDIS_URL` → URL Redis dari plugin Railway (opsional tapi direkomendasikan)
5. PORT diatur otomatis oleh Railway

### Menambahkan Redis di Railway
1. Di dashboard project, klik **+ New** → pilih **Redis**
2. Railway akan otomatis inject `REDIS_URL` ke semua service dalam project yang sama
