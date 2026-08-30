# Deploy SiPANDU di matematika.unsulbar.ac.id/akademik/sipandu

Target sementara:

```text
https://matematika.unsulbar.ac.id/
└── akademik/
    ├── sipandu/
    ├── simatrps/
    └── simetri/
```

Dokumen ini khusus tahap pertama: **SiPANDU**. Database tetap memakai Neon PostgreSQL agar migrasi hosting dan database tidak dilakukan bersamaan.

## 1. Kebutuhan hosting

- PHP 8.3 atau lebih baru.
- Extension: `pdo_pgsql`, `mbstring`, `openssl`, `fileinfo`, `tokenizer`, `ctype`.
- Composer 2.
- Apache `mod_rewrite` atau rewrite setara.
- HTTPS aktif.
- Koneksi outbound ke Neon PostgreSQL.
- Folder `storage/` dan `bootstrap/cache/` writable oleh PHP.

Node.js tidak harus berjalan terus di server. Node hanya diperlukan saat menghasilkan aset Vite dengan `npm run build`.

## 2. Environment production

Gunakan nilai berikut sebagai dasar `.env` production. Jangan commit nilai rahasia ke Git.

```dotenv
APP_NAME=SiPANDU
APP_ENV=production
APP_DEBUG=false
APP_URL=https://matematika.unsulbar.ac.id/akademik/sipandu
APP_BASE_PATH=/akademik/sipandu
ASSET_URL=https://matematika.unsulbar.ac.id/akademik/sipandu
APP_TIMEZONE=Asia/Makassar
APP_LOCALE=id

DB_CONNECTION=pgsql
DATABASE_URL=<NEON_POSTGRES_URL>

SESSION_DRIVER=file
SESSION_COOKIE=sipandu_session
SESSION_PATH=/akademik/sipandu
SESSION_SECURE_COOKIE=true
CACHE_STORE=file
QUEUE_CONNECTION=sync

SIPANDU_FILE_STORAGE=local_private

SIMATRPS_BASE_URL=https://simatrps.vercel.app
SIMATRPS_SSO_REDIRECT_URI=
```

`SESSION_PATH` membatasi cookie SiPANDU hanya pada `/akademik/sipandu`, sehingga tidak bentrok dengan website Prodi, SiMatRPS, atau SIMETRI pada domain yang sama.

`SIPANDU_FILE_STORAGE=local_private` menyimpan upload baru di `storage/app/private/sipandu/classes/...`. File tidak diekspos langsung oleh Apache; unduhan tetap melalui endpoint SiPANDU yang memeriksa hak akses kelas.

File lama yang sudah tersimpan di Vercel Blob tetap dapat dibaca jika kredensial Blob lama masih disediakan pada environment hosting. Migrasi file lama ke storage lokal dapat dilakukan sebagai tahap terpisah setelah cut-over stabil.

`SIMATRPS_SSO_REDIRECT_URI` boleh kosong. SiPANDU akan membentuk callback otomatis menjadi:

```text
https://matematika.unsulbar.ac.id/akademik/sipandu/sso/callback
```

Callback tersebut perlu didaftarkan/diizinkan pada SiMatRPS sebelum SSO production dialihkan sepenuhnya.

## 3. Build aplikasi

Di mesin build atau server yang memiliki Node dan Composer:

```bash
composer install --no-dev --prefer-dist --optimize-autoloader
npm install --no-audit --no-fund
npm run build
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Jangan menjalankan `npm run dev` pada production.

## 4. Struktur shared hosting yang disarankan

Source Laravel sebaiknya berada di luar `public_html` jika hosting mengizinkan:

```text
/home/USER/apps/sipandu/          <- source Laravel
/home/USER/public_html/
└── akademik/
    └── sipandu/                  <- isi folder public/ SiPANDU
```

Hanya file dari folder `public/` yang boleh terekspos ke web. Jika `public/` dipisahkan dari source Laravel, `index.php` pada folder publik harus diarahkan ke lokasi `vendor/autoload.php` dan `bootstrap/app.php` yang benar. Path final baru ditetapkan setelah struktur cPanel/hosting diketahui.

Jika hosting memberi SSH dan memungkinkan document-root/subdirectory mapping, gunakan mapping ke folder `public/` secara langsung karena itu paling aman.

## 5. Hak akses storage

Pastikan PHP dapat menulis ke:

```text
storage/framework/cache
storage/framework/sessions
storage/framework/views
storage/logs
storage/app/private
bootstrap/cache
```

Tidak perlu menjalankan `php artisan storage:link` untuk file kelas karena driver `local_private` memang sengaja tidak menyimpan lampiran di public storage.

## 6. Migration database

Database Neon yang sekarang dipertahankan. Setelah `.env` production benar:

```bash
php artisan migrate --force
```

Jangan membuat database baru atau mengimpor ulang Neon pada tahap hosting pertama.

## 7. Pemeriksaan setelah deploy

Wajib cek berurutan:

1. `/akademik/sipandu/` membuka login SiPANDU.
2. Login email/NIM berfungsi dan cookie sesi bertahan hanya pada path SiPANDU.
3. `/sipandu-api/*` tidak bocor ke root domain, melainkan tetap di bawah `/akademik/sipandu/sipandu-api/*`.
4. Kelas dosen dan mahasiswa terbuka.
5. Materi, tugas, diskusi, presensi, nilai, dan Kuis/Ujian dapat dibaca/ditulis.
6. Upload/download lampiran baru bekerja melalui `local_private`.
7. File lama Vercel Blob, jika ada, masih dapat dibaca selama kredensial Blob dipertahankan.
8. PWA memakai scope `/akademik/sipandu/`, bukan `/`.
9. SSO SiMatRPS kembali ke `/akademik/sipandu/sso/callback`.
10. `APP_DEBUG=false`.
11. Website Prodi pada `/` tidak terganggu.

## 8. Strategi cut-over

Jangan matikan Vercel sebelum versi UNSULBAR lolos pemeriksaan. Selama transisi:

- Vercel = fallback sementara.
- `matematika.unsulbar.ac.id/akademik/sipandu` = target production baru.
- Database = Neon PostgreSQL yang sama.
- Upload baru di UNSULBAR = private local storage.

Setelah hosting UNSULBAR stabil, barulah endpoint/tautan resmi diarahkan ke URL kampus dan Vercel dapat dijadikan fallback nonaktif atau dihentikan.
