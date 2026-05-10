# Memory Hack - Client

Frontend dari game **Memory Hack**, dibangun dengan Next.js 15 dan React 19. Tampil sebagai aplikasi web yang responsif dengan tema dark mode dan animasi menggunakan Framer Motion.

---

## Tech Stack

| Teknologi | Keterangan |
|-----------|------------|
| Next.js 15 (App Router) | Framework React utama |
| React 19 | Library UI |
| TypeScript | Bahasa utama |
| Tailwind CSS v4 | Styling utama |
| Vanilla CSS (Custom Properties) | Token warna dan efek kustom |
| Framer Motion | Animasi dan transisi halaman |
| @dnd-kit/core | Mekanik drag & drop |
| socket.io-client | Koneksi real-time ke backend |

---

## Struktur Folder

```
client/
├── src/
│   ├── app/
│   │   ├── page.tsx          # halaman utama (home screen + modal setting room)
│   │   ├── layout.tsx        # root layout
│   │   └── globals.css       # CSS global dan token warna
│   ├── components/
│   │   ├── Lobby.tsx         # komponen ruang tunggu
│   │   └── GameBoard.tsx     # komponen papan game (memorize + answer phase)
│   ├── hooks/
│   │   └── useGameLogic.ts   # hook utama, handle semua event socket dan state game
│   └── lib/
│       └── socket.ts         # inisialisasi koneksi socket.io
├── public/                   # aset statis
├── .env.example              # contoh environment variables
└── package.json
```

---

## Cara Setup dan Jalankan

### Prasyarat
- Node.js v18 atau lebih baru
- Backend server sudah berjalan (lihat `../server/README.md`)

### Install dependensi
```bash
npm install
```

### Konfigurasi environment
Salin `.env.example` menjadi `.env.local` lalu isi sesuai kebutuhan:
```bash
cp .env.example .env.local
```

Isi variabel berikut:
```env
# URL backend socket server, default ke localhost:3001 kalau tidak diisi
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Jalankan development server
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### Build production
```bash
npm run build
npm start
```

---

## Environment Variables

| Variable | Keterangan | Default |
|----------|------------|---------|
| `NEXT_PUBLIC_SOCKET_URL` | URL backend socket server | `http://localhost:3001` |

---

## Alur Aplikasi

```
Home Screen
├── Tab "Buat"   → isi nama → klik "Buat Room" → modal Setting Room → konfirmasi → Lobby
├── Tab "Gabung" → isi nama + kode room → langsung masuk Lobby
└── Tab "Publik" → pilih room dari daftar → langsung masuk Lobby

Lobby (Ruang Tunggu)
├── Host: menunggu semua player ready, lalu klik "Mulai Permainan"
└── Player: klik "Siap" untuk menandakan siap bermain

Game Board
├── Fase Memorize: lihat dan hafal posisi emoji di grid
└── Fase Answer: drag & drop emoji ke posisi yang benar sebelum waktu habis

Layar Akhir (Game Over)
└── Leaderboard akhir + tombol kembali ke home
```

---

## Deploy ke Vercel

1. Hubungkan repository ke Vercel
2. Set **Root Directory** ke folder `client`
3. Framework preset otomatis terdeteksi sebagai Next.js
4. Tambahkan environment variable:
   - `NEXT_PUBLIC_SOCKET_URL` → URL backend Railway (contoh: `https://memory-hack-server.up.railway.app`)
5. Deploy

---

## Catatan Development

- File `globals.css` mendefinisikan semua CSS custom properties (warna, efek glow, class `btn-3d`, `glass-card`, dll.)
- Socket diinisialisasi sekali di `lib/socket.ts` dan diakses via `getSocket()` — singleton pattern supaya tidak ada multiple connection
- `useGameLogic.ts` adalah pusat state management game, semua socket event dihandle di sini
