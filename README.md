# 🧠 Memory Hack

**Memory Hack** adalah game *multiplayer real-time* yang menguji ketangkasan dan daya ingat pemain. Berbasis web dengan desain UI cyberpunk/neon yang responsif (layar desktop dan mobile), game ini memungkinkan seorang *host* membuat *room*, mengundang pemain lain, dan bersaing menjadi yang terbaik dalam mengingat posisi emoji.

---

## 🚀 Fitur Utama

- **Real-time Multiplayer:** Didukung oleh Socket.IO untuk pengalaman bermain tanpa *lag*.
- **Drag & Drop Interaktif:** Mekanik permainan intuitif menggunakan `@dnd-kit/core`.
- **Desain UI/UX Modern:** Tema *dark mode* dengan aksen *vibrant*, *glassmorphism*, dan animasi menggunakan Framer Motion.
- **Sistem Leveling & Waktu Dinamis:** Tingkat kesulitan bertambah seiring level (ukuran grid membesar dari 2x2 hingga 5x5) dan batas waktu yang bervariasi.
- **Papan Skor Langsung (Leaderboard):** Menampilkan skor pemain secara *real-time* dengan animasi urutan juara.
- **Responsif:** Sepenuhnya dapat dimainkan dan diakses melalui perangkat handphone maupun komputer.

---

## 🛠️ Teknologi yang Digunakan

### Frontend (Client)
- **Framework:** Next.js 15 (React 19)
- **Styling:** Tailwind CSS v4 & Vanilla CSS (Custom Properties)
- **Animation:** Framer Motion
- **Drag & Drop:** `@dnd-kit/core`
- **Real-time Engine:** `socket.io-client`

### Backend (Server)
- **Runtime:** Node.js
- **Framework:** Express.js
- **WebSocket:** Socket.IO v4
- **Language:** TypeScript

---

## 💻 Cara Menjalankan Secara Lokal (Development)

Pastikan **Node.js** (v18+) sudah terinstal di komputer Anda. Repositori ini menggunakan struktur *monorepo* terpisah untuk klien dan server.

### 1. Menjalankan Backend (Server)
Buka terminal dan jalankan perintah berikut:
```bash
cd server
npm install
npm run dev
```
Server akan berjalan secara otomatis di `http://localhost:3001`.

### 2. Menjalankan Frontend (Client)
Buka tab terminal baru dan jalankan perintah berikut:
```bash
cd client
npm install
npm run dev
```
Frontend akan berjalan di `http://localhost:3000`. Buka URL tersebut di browser Anda.

---

## 🌐 Panduan Deploy (Production)

Proyek ini telah dikonfigurasi agar siap di-deploy ke **Vercel** (untuk Frontend) dan **Railway** (untuk Backend).

### Deploy Backend ke Railway
1. Buat proyek baru di Railway dan hubungkan *repository* GitHub Anda (atur *root directory* ke folder `/server` jika memungkinkan, atau *deploy* spesifik untuk folder server).
2. Railway akan otomatis mendeteksi konfigurasi Node.js dan menjalankan `npm run build` serta `npm start`.
3. **Environment Variables (Opsional):**
   - `PORT`: (Diatur otomatis oleh Railway)
   - `CORS_ORIGIN`: Isi dengan URL frontend Anda (misal: `https://memory-hack.vercel.app`) untuk meningkatkan keamanan, atau biarkan kosong/`*` untuk mengizinkan semua *origin*.
4. Salin URL publik backend yang diberikan Railway (contoh: `https://memory-hack-server.up.railway.app`).

### Deploy Frontend ke Vercel
1. Buat proyek baru di Vercel dan hubungkan dengan *repository* GitHub Anda.
2. Atur **Framework Preset** ke `Next.js` dan **Root Directory** ke folder `client`.
3. Tambahkan **Environment Variable** berikut sebelum melakukan *build*:
   - `NEXT_PUBLIC_SOCKET_URL`: Isi dengan URL publik backend Railway Anda (contoh: `https://memory-hack-server.up.railway.app`).
4. Klik **Deploy**. Vercel akan otomatis melakukan proses kompilasi bebas *error*.

---

## 🎮 Cara Bermain

1. **Buat atau Gabung:** Masukkan nama Anda. Anda dapat membuat *Room* baru (sebagai *Host*) atau bergabung ke *Room* teman dengan memasukkan **Kode Room**.
2. **Ruang Tunggu:** *Host* harus menunggu pemain lain menekan tombol "Siap". Setelah semua siap, *Host* bisa memulai game.
3. **Fase Menghafal (Memorize):** Perhatikan baik-baik posisi semua emoji yang muncul di layar (contoh: 8 detik).
4. **Fase Menjawab (Answer):** Tarik (*drag*) emoji dari *pool* di bawah dan letakkan (*drop*) ke kotak grid sesuai dengan posisi awal yang Anda ingat sebelum waktu habis.
5. **Skor:** Dapatkan poin tertinggi dari ketepatan posisi dan seberapa cepat Anda menjawab!

---

*Dibuat untuk kebutuhan keseruan bermain game asah memori bersama teman!* 🎉
