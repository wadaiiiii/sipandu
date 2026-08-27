# Arsitektur SiPANDU

## Prinsip inti

SiPANDU adalah LMS berbasis OBE yang **mandiri secara operasional**. SiMatRPS dapat menjadi sumber RPS, tetapi bukan dependency wajib.

### Batas domain

- SiPANDU memiliki database, autentikasi, kelas, mahasiswa, aktivitas, nilai, dan data ketercapaian OBE sendiri.
- Sumber RPS didesain melalui empat mode: `manual`, `file`, `simatrps`, dan `external`.
- RPS yang masuk ke kelas disimpan sebagai **snapshot lokal** (`rps_snapshots`).
- Snapshot menyimpan payload dan metadata sumber; tidak ada foreign key ke database SiMatRPS atau sistem eksternal.
- Pergantian sumber RPS tidak menghapus snapshot lama. Hanya satu snapshot yang ditandai `is_current` untuk suatu kelas.

## Siklus target

Kurikulum/RPS → Kelas SiPANDU → Pertemuan → Aktivitas/Asesmen → Submission → Nilai → Sub-CPMK → CPMK → Evaluasi OBE.

## Integrasi portal

SiPANDU disiapkan untuk ditempatkan di ekosistem Portal Akademik `matematika.unsulbar.ac.id/akademik`, dengan SSO ditambahkan sebagai lapisan identitas di tahap integrasi portal.
