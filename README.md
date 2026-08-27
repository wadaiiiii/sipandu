# SiPANDU

**SiPANDU — LMS Berbasis OBE** untuk Program Studi S1 Matematika FMIPA Universitas Sulawesi Barat.

SiPANDU adalah aplikasi terpisah dari SiMatRPS. Integrasi RPS bersifat opsional dan menggunakan snapshot lokal agar kegiatan pembelajaran tetap berjalan apabila kebijakan atau sistem sumber RPS berubah.

## Sumber RPS

- Input Manual
- Import File
- SiMatRPS
- Sistem Eksternal/fakultas

## Menjalankan lokal

1. `composer install`
2. `cp .env.example .env`
3. `php artisan key:generate`
4. `touch database/database.sqlite`
5. `php artisan migrate --seed`
6. `npm install && npm run build`
7. `php artisan serve`

Lihat `ARCHITECTURE.md` untuk prinsip pemisahan sistem dan snapshot RPS.
