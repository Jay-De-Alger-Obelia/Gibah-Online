# 🚀 Panduan Setup — Gibah Online Discord → Website

Panduan lengkap untuk menghubungkan Discord ke galeri website.
Estimasi waktu: **30–45 menit** (semua layanan gratis).

---

## Gambaran Besar

```
Discord #galeri  →  Bot Node.js  →  Cloudinary (foto)
                              ↘  Supabase (metadata)
                                        ↓
                              galeri-lengkap.html
                          (auto-update tanpa refresh!)
```

---

## LANGKAH 1 — Buat Discord Bot

### 1.1 Buat Aplikasi Bot
1. Buka https://discord.com/developers/applications
2. Klik **"New Application"** → beri nama "Gibah Bot"
3. Masuk ke tab **"Bot"** → klik **"Add Bot"**
4. Di bawah **"Privileged Gateway Intents"**, aktifkan:
   - ✅ **Message Content Intent**
   - ✅ **Server Members Intent**
5. Klik **"Reset Token"** → copy token-nya (simpan baik-baik!)

### 1.2 Invite Bot ke Server Discord
1. Masih di halaman yang sama, buka tab **"OAuth2"** → **"URL Generator"**
2. Centang scope: `bot`
3. Centang permissions:
   - ✅ Read Messages/View Channels
   - ✅ Send Messages
   - ✅ Add Reactions
   - ✅ Read Message History
4. Copy URL yang muncul → buka di browser → pilih server → Authorize

### 1.3 Cari ID Channel Discord
1. Di Discord, buka **Settings** → **Advanced** → aktifkan **Developer Mode**
2. Klik kanan channel `#galeri` → **"Copy Channel ID"**
3. Simpan ID ini untuk dimasukkan ke `.env`

---

## LANGKAH 2 — Setup Cloudinary (tempat simpan foto)

1. Daftar gratis di https://cloudinary.com
2. Masuk ke **Dashboard**
3. Catat 3 nilai ini:
   - **Cloud name** (contoh: `dxyz123abc`)
   - **API Key** (12 digit angka)
   - **API Secret** (string panjang)
4. Semua ada di bagian "API Keys" di dashboard

> **Quota gratis:** 25 GB storage + 25 GB bandwidth/bulan — lebih dari cukup!

---

## LANGKAH 3 — Setup Supabase (database)

### 3.1 Buat Project
1. Daftar gratis di https://supabase.com
2. Klik **"New project"** → beri nama "gibah-online"
3. Pilih region terdekat (Singapore)
4. Tunggu project selesai dibuat (~1-2 menit)

### 3.2 Buat Tabel Photos
1. Buka **SQL Editor** di sidebar kiri
2. Paste dan jalankan SQL berikut:

```sql
-- Buat tabel photos
CREATE TABLE photos (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'random',
  image_url       TEXT NOT NULL,
  cloudinary_id   TEXT,
  width           INTEGER,
  height          INTEGER,
  likes           INTEGER DEFAULT 0,
  uploaded_by     TEXT,
  discord_msg_id  TEXT,
  discord_channel TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Aktifkan Row Level Security
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Policy: semua orang boleh baca (untuk website)
CREATE POLICY "Anyone can read photos"
  ON photos FOR SELECT
  USING (true);

-- Policy: hanya service_role yang boleh insert/update (untuk bot)
CREATE POLICY "Service role can insert"
  ON photos FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update"
  ON photos FOR UPDATE
  TO service_role
  USING (true);

-- Aktifkan Realtime untuk tabel ini
ALTER PUBLICATION supabase_realtime ADD TABLE photos;
```

3. Klik **"Run"** — harus muncul "Success"

### 3.3 Ambil API Keys
1. Buka **Settings** → **API**
2. Catat dua hal ini:
   - **Project URL** (contoh: `https://abcdefgh.supabase.co`)
   - **anon public** key (untuk website — read only)
   - **service_role secret** key (untuk bot — read+write)

---

## LANGKAH 4 — Setup & Jalankan Bot

### 4.1 Install Node.js
Download dari https://nodejs.org (pilih versi LTS)

### 4.2 Setup folder bot
```bash
# Buka terminal / command prompt
cd /lokasi/folder/gibah-bot

# Install dependencies
npm install
```

### 4.3 Buat file .env
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Buka `.env` dan isi semua nilai:
```env
DISCORD_BOT_TOKEN=token_dari_langkah_1
DISCORD_CHANNEL_IDS=id_channel_dari_langkah_1
CLOUDINARY_CLOUD_NAME=nama_cloud_kamu
CLOUDINARY_API_KEY=api_key_kamu
CLOUDINARY_API_SECRET=api_secret_kamu
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_KEY=eyJhbG...
WEBSITE_URL=https://website-kamu.com
```

### 4.4 Jalankan bot
```bash
npm start
```

Kalau berhasil, terminal akan menampilkan:
```
✅ Bot aktif sebagai: GibahBot#1234
📡 Memantau channel: 123456789012345678
──────────────────────────────────────
```

### 4.5 Test: Upload foto di Discord
1. Buka channel `#galeri` di Discord
2. Upload sebuah foto (boleh drag & drop)
3. Bot akan membalas dengan konfirmasi ✅
4. Buka `galeri-lengkap.html` → foto langsung muncul!

---

## LANGKAH 5 — Update galeri-lengkap.html

Buka file `galeri-lengkap.html`, cari bagian ini di dalam `<script>`:

```javascript
var SUPABASE_URL  = 'https://XXXXXXXXXXXX.supabase.co';   // <-- ganti ini
var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI...';    // <-- ganti ini
```

Ganti dengan URL dan anon key dari Supabase-mu (langkah 3.3).

---

## LANGKAH 6 (Opsional) — Jalankan Bot 24/7

Bot harus terus berjalan agar bisa mendeteksi foto baru.
Pilihan hosting gratis:

### Opsi A: Railway (termudah)
1. Daftar di https://railway.app
2. Connect ke GitHub repo yang berisi folder bot
3. Set environment variables di dashboard Railway
4. Deploy → bot jalan 24/7 gratis

### Opsi B: Render
1. Daftar di https://render.com
2. New → Background Worker
3. Connect repo → set env vars → Deploy

### Opsi C: Jalankan di PC sendiri
Kalau PC selalu nyala, cukup jalankan `npm start` dan biarkan terminal terbuka.

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Bot tidak merespons foto | Pastikan `Message Content Intent` aktif di Discord Developer Portal |
| Error "Invalid token" | Reset token bot dan update `.env` |
| Foto tidak muncul di website | Cek SUPABASE_URL dan SUPABASE_ANON di `galeri-lengkap.html` |
| Error Cloudinary | Pastikan cloud_name, api_key, api_secret sudah benar |
| RLS error di Supabase | Pastikan SQL langkah 3.2 sudah dijalankan semua |
| Bot crash | Jalankan `npm run dev` untuk auto-restart saat error |

---

## Struktur Kategori Channel

Tambahkan mapping di `bot.js` jika kamu punya channel berbeda:

```javascript
const CATEGORY_MAP = {
  'galeri-sumbing'  : 'sumbing',
  'galeri-hangout'  : 'hangout',
  'galeri-random'   : 'random',
  'foto-gaming'     : 'random',   // contoh tambahan
  'foto-trip'       : 'sumbing',  // contoh tambahan
};
```

---

## Fitur yang Sudah Ada di Website

- ✅ Auto-load foto dari Supabase saat halaman dibuka
- ✅ **Realtime** — foto baru muncul tanpa refresh halaman
- ✅ Toast notifikasi saat foto baru masuk dari Discord
- ✅ Filter per kategori (Sumbing / Hangout / Random)
- ✅ Like disimpan ke Supabase (bukan hanya localStorage)
- ✅ Tampilkan nama uploader (Discord username)
- ✅ Skeleton loading saat foto sedang dimuat
- ✅ Lightbox dengan navigasi keyboard & swipe
- ✅ Layout toggle: masonry ↔ grid

---

*Dibuat untuk Gibah Online — komunitas gaming yang nyata.*
