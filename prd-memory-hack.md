# Product Requirements Document (PRD) - Memory Hack

## 1. Ikhtisar Proyek (Project Overview)
**Nama Proyek:** Memory Hack
**Deskripsi Singkat:** Memory Hack adalah game memori *multiplayer* berbasis web yang dimainkan secara *real-time*. Pemain akan berlomba menemukan pasangan kartu yang sama secepat mungkin. Game ini didesain murni untuk menguji ketangkasan mental dan daya ingat kompetitif, sehingga pengalaman bermain difokuskan pada kecepatan dan akurasi tanpa adanya sistem sabotase antar pemain.

## 2. Arsitektur & Teknologi (Tech Stack)
Aplikasi ini menggunakan arsitektur *Client-Server* yang terpisah untuk memastikan skalabilitas dan performa *real-time* yang optimal.

### Frontend (Client)
* **Framework:** Next.js dengan App Router (`src/app`).
* **Bahasa:** TypeScript.
* **Komponen Utama:**
    * `GameBoard.tsx`: Menangani antarmuka utama permainan, merender grid kartu, dan interaksi klik pemain.
    * `Lobby.tsx`: Antarmuka untuk membuat atau bergabung ke dalam ruangan permainan (room).
* **Logika Klien:** Dikelola melalui *custom hook* `useGameLogic.ts` untuk memisahkan logika presentasi dan bisnis.
* **Komunikasi Klien:** Menggunakan Socket.IO client (`lib/socket.ts`).

### Backend (Server)
* **Environment:** Node.js.
* **Bahasa:** TypeScript.
* **Logika Server:**
    * `GameManager.ts`: Mengelola daftar *room* yang aktif dan mendistribusikan pemain ke *room* yang tepat.
    * `GameRoom.ts`: Mengelola *state* spesifik di dalam satu pertandingan, seperti giliran, status kartu, dan skor.
* **Komunikasi Server:** Socket.IO server (`socket/index.ts`) untuk menangani koneksi masuk, pemutusan koneksi, dan *broadcasting* *event* game.

## 3. Fitur Utama (Core Features)

### 3.1. Sistem Lobby & Matchmaking
* **Join Room:** Pemain dapat membuat ruangan baru atau bergabung ke ruangan yang sudah ada menggunakan kode ruangan.
* **Ready State:** Permainan hanya akan dimulai ketika jumlah pemain dalam satu ruangan sudah memenuhi syarat dan semua berstatus "Ready".

### 3.2. Gameplay Mekanik
* **Grid Kartu:** Kumpulan kartu tertutup yang disajikan dalam bentuk grid.
* **Giliran (Turn-based / Concurrent):** Pemain membalikkan maksimal 2 kartu dalam satu waktu.
* **Pencocokan:** 
    * Jika 2 kartu yang dibalik memiliki gambar/nilai yang sama, pemain mendapatkan poin dan kartu tetap terbuka.
    * Jika berbeda, kartu akan tertutup kembali setelah jeda singkat.
* **Fokus Kompetitif Murni:** Tidak ada item bantuan atau sistem sabotase untuk mengganggu lawan. Kemenangan ditentukan murni oleh daya ingat.

### 3.3. Real-Time Sinkronisasi
* Setiap aksi (membalik kartu) harus dikirim ke server dan di-*broadcast* ke pemain lain dengan latensi minimal.
* *State* kartu (terbuka/tertutup/berhasil dicocokkan) harus selalu sinkron antara `GameRoom.ts` (Server) dan `useGameLogic.ts` (Client).

## 4. Panduan Eksekusi AI (AI Agent Guidelines)
Dokumen ini berfungsi sebagai acuan bagi AI Agent dalam melakukan iterasi pengembangan. Saat mengimplementasikan fitur baru, AI Agent **wajib**:
1.  **Mempertahankan Struktur:** Jangan mengubah pemisahan tanggung jawab antara `Client` dan `Server`.
2.  **Modifikasi State Terpusat:** Segala perubahan aturan permainan (misal: perubahan cara skor dihitung) harus divalidasi di `GameRoom.ts` sebelum diperbarui di sisi *client*.
3.  **Event Socket:** Jika menambahkan interaksi baru, definisikan secara eksplisit *event listener* dan *emitter* yang baru di `socket/index.ts` dan `lib/socket.ts`.
4.  **Menjaga Kemurnian Game:** Jangan menyarankan atau mengimplementasikan mekanisme *power-up* atau jebakan/sabotase, tetap fokus pada stabilitas *real-time multiplayer*.

## 5. Deployment & Configuration
Karena aplikasi ini akan di-deploy ke **Railway (Backend)** dan **Vercel (Frontend)**, AI Agent harus memastikan konfigurasi berikut:

### 5.1. Backend (Railway)
* **Environment Variables:**
    * `PORT`: Railway secara otomatis memberikan port melalui variabel ini. Pastikan `server/src/index.ts` menggunakan `process.env.PORT || 3001`.
    * `CORS_ORIGIN`: URL dari frontend yang dideploy di Vercel untuk mengizinkan koneksi socket.
* **Procfile/Start Script:** Pastikan `package.json` di folder server memiliki script `"start": "node dist/index.js"` dan `"build": "tsc"`.

### 5.2. Frontend (Vercel)
* **Environment Variables:**
    * `NEXT_PUBLIC_SOCKET_URL`: URL backend yang diberikan oleh Railway (contoh: `https://your-backend.railway.app`).
* **CORS Handling:** Pastikan inisialisasi socket di `client/src/lib/socket.ts` menggunakan variabel environment tersebut.

### 5.3. Keamanan & Koneksi
* Pastikan server menggunakan integrasi CORS yang tepat agar Vercel dapat berkomunikasi dengan Railway.
* Gunakan HTTPS secara default untuk komunikasi Socket.IO di lingkungan produksi.

## 6. Pedoman UI/UX (Desain Visual & Interaksi)
Untuk memastikan pengalaman bermain yang seru dan *engaging*, antarmuka (UI) harus mengadaptasi gaya visual yang *playful* dan *gamified* seperti **Quizizz (mode Playground)**. AI Agent harus memperhatikan aspek desain berikut:

### 6.1. Gaya Visual (Visual Style)
* **Tema Warna:** Gunakan palet warna yang *vibrant* dan berani (seperti ungu terang, kuning mustard, tosca, atau pink coral). Latar belakang sebaiknya menggunakan warna solid yang bersih agar elemen permainan tetap menjadi fokus utama.
* **Tipografi:** Gunakan *font sans-serif* yang tebal (bold), modern, dan *rounded* (misalnya: *Nunito*, *Quicksand*, atau *Baloo*) agar terkesan *friendly* dan kasual.
* **Bentuk Elemen:** Tombol, kontainer, dan elemen kartu harus memiliki sudut yang sangat membulat (*large border-radius*) dan diberikan *soft drop-shadows* (bayangan) di bagian bawah agar terlihat seperti tombol fisik 3D yang bisa ditekan.

### 6.2. Interaksi & Animasi (Micro-interactions)
* **Feedback Drag & Drop:** 
    * Saat elemen ditarik (*onDrag*), elemen harus sedikit membesar (*scale up*) dan miring sedikit untuk memberi kesan sedang dipegang.
    * Saat dilepas (*onDrop*), berikan efek pantulan (*bouncy/spring effect*).
* **Feedback Benar/Salah:**
    * **Benar:** Berikan animasi *glow* (bercahaya) hijau cerah, efek konfeti/partikel kecil, dan suara *pop* (jika ada audio).
    * **Salah:** Elemen harus bergetar cepat (*shake animation*) dengan border merah, lalu kembali melayang secara otomatis ke posisi awalnya.
* **Transisi Halus:** Perpindahan dari *Lobby* ke *GameBoard*, atau kemunculan modal/pop-up pemenang harus menggunakan animasi transisi yang mulus (*fade-in* atau *slide-up*).