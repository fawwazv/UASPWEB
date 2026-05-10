# Memory Hack

Game multiplayer berbasis web untuk menguji daya ingat. Pemain menghafal posisi emoji di sebuah grid, lalu menempatkannya kembali dengan drag & drop sebelum waktu habis. Siapa yang paling banyak benar dan paling cepat, dialah pemenangnya.

---

## Fitur

- **Real-time multiplayer** via Socket.IO — semua pemain terhubung langsung
- **Setting room** — host bisa atur level maksimal, batas pemain, mode spectate/bermain, dan visibilitas room
- **Drag & drop** menggunakan `@dnd-kit/core`
- **Sistem level dinamis** — grid makin besar dan waktu makin ketat seiring level naik (2×2 di level 1-2, hingga 5×5 di level 9-10)
- **Leaderboard real-time** — skor diupdate tiap kali level selesai
- **Room publik & private** — room publik bisa ditemukan di lobby, private hanya bisa diakses lewat kode
- **Mode spectate untuk host** — host bisa memilih hanya mengawasi tanpa ikut bersaing
- **Responsif** — bisa dimainkan di HP maupun desktop

---

## Struktur Proyek

```
memory-hack/
├── client/          # frontend Next.js (deploy ke Vercel)
└── server/          # backend Node.js + Socket.IO (deploy ke Railway)
```

Masing-masing folder punya README tersendiri dengan penjelasan lebih detail:
- [client/README.md](./client/README.md)
- [server/README.md](./server/README.md)

---

## Tech Stack

### Frontend
- Next.js 15 (App Router) + React 19
- TypeScript
- Tailwind CSS v4 + Vanilla CSS
- Framer Motion (animasi)
- @dnd-kit/core (drag & drop)
- socket.io-client

### Backend
- Node.js + TypeScript
- Express.js v5
- Socket.IO v4
- Redis (state persistence, opsional)

---

## Cara Menjalankan Lokal

Pastikan Node.js v18+ sudah terinstal.

### 1. Backend (Server)

```bash
cd server
npm install
cp .env.example .env   # isi PORT, REDIS_URL, CORS_ORIGIN sesuai kebutuhan
npm run dev            # pakai nodemon, auto-restart saat ada perubahan
```

Atau tanpa nodemon (langsung ts-node):
```bash
npm run dev:direct
```

Server berjalan di `http://localhost:3001`.

### 2. Frontend (Client)

Buka terminal baru:
```bash
cd client
npm install
cp .env.example .env.local   # isi NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## Cara Bermain

1. **Buat atau Gabung Room** — masukkan nama, lalu pilih buat room baru atau gabung lewat kode
2. **Setting Room** (khusus host) — atur batas level (5/8/10), batas pemain, mode host, dan visibilitas
3. **Ruang Tunggu** — semua pemain klik "Siap", host klik "Mulai Permainan"
4. **Fase Menghafal** — perhatikan posisi tiap emoji di grid (waktu terbatas)
5. **Fase Menjawab** — drag emoji dari pool ke kotak grid sesuai yang kamu ingat, sebelum waktu habis
6. **Skor** — poin dari jumlah jawaban benar ditambah bonus kecepatan, dikali nomor level
7. Game selesai saat mencapai level maksimal yang dipilih host

---

## Deploy

| Layanan | Folder | Keterangan |
|---------|--------|------------|
| **Vercel** | `client/` | Frontend Next.js, auto-detect framework |
| **Railway** | `server/` | Backend Node.js, auto build + start |

### Environment Variables Production

**Client (Vercel):**
```
NEXT_PUBLIC_SOCKET_URL=https://your-backend.up.railway.app
```

**Server (Railway):**
```
CORS_ORIGIN=https://your-app.vercel.app
REDIS_URL=redis://... (dari plugin Redis Railway)
```

Lihat panduan lengkap di README masing-masing folder.

---

## Sistem Leveling

| Level | Grid | Waktu Hafal | Waktu Jawab |
|-------|------|-------------|-------------|
| 1–2   | 2×2  | 8 detik     | 20 detik    |
| 3–5   | 3×3  | 10–16 dtk   | 30–40 dtk   |
| 6–8   | 4×4  | 20–30 dtk   | 50–66 dtk   |
| 9–10  | 5×5  | 35–40 dtk   | 75–85 dtk   |

Skor per level = (jawaban benar × 10 + bonus waktu) × nomor level
