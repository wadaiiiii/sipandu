<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Setup SiPANDU</title>
    <style>
        body{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8fafc;color:#0f172a;margin:0}.wrap{max-width:680px;margin:0 auto;padding:56px 24px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:28px;box-shadow:0 10px 30px rgba(15,23,42,.05)}h1{margin:0;font-size:28px}.muted{color:#64748b;line-height:1.7}.ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#047857;padding:14px;border-radius:12px}.err{background:#fff1f2;border:1px solid #fecdd3;color:#be123c;padding:14px;border-radius:12px;margin:16px 0}label{display:block;font-weight:600;margin-top:20px}input{width:100%;box-sizing:border-box;margin-top:8px;border:1px solid #cbd5e1;border-radius:10px;padding:12px 14px;font-size:15px}button{margin-top:18px;border:0;border-radius:10px;background:#0f172a;color:#fff;padding:12px 16px;font-weight:700;cursor:pointer}.note{margin-top:22px;padding-top:18px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b;line-height:1.6}
    </style>
</head>
<body>
<div class="wrap">
    <div class="card">
        <h1>Setup Produksi SiPANDU</h1>
        <p class="muted">Halaman ini hanya aktif sementara untuk menjalankan migrasi database dan membuat akun Admin Prodi pertama.</p>

        @if ($completed)
            <div class="ok"><strong>Setup berhasil.</strong><br>Migration dan database seeder telah dijalankan. Silakan nonaktifkan <code>SIPANDU_SETUP_ENABLED</code> pada environment production, lalu buka halaman utama SiPANDU.</div>
        @else
            @if ($errors->any())
                <div class="err">{{ $errors->first() }}</div>
            @endif

            <form method="post" action="{{ route('setup.run') }}">
                @csrf
                <label for="setup_token">Token Setup</label>
                <input id="setup_token" name="setup_token" type="password" required autocomplete="off" placeholder="Masukkan SIPANDU_SETUP_TOKEN">
                <button type="submit">Jalankan Migration & Buat Admin</button>
            </form>
        @endif

        <div class="note">Keamanan: setelah setup berhasil, ubah <code>SIPANDU_SETUP_ENABLED</code> menjadi <code>false</code> atau hapus variabel tersebut. Halaman ini kemudian otomatis menjadi 404.</div>
    </div>
</div>
</body>
</html>