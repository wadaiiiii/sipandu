export {};

function ensureStyles(): void {
    if (document.getElementById('sipandu-classroom-loading-style')) return;

    const style = document.createElement('style');
    style.id = 'sipandu-classroom-loading-style';
    style.textContent = `
        @keyframes sipandu-loader-spin{to{transform:rotate(360deg)}}
        @keyframes sipandu-loader-pulse{0%,100%{opacity:.45;transform:scale(.96)}50%{opacity:1;transform:scale(1)}}
        @keyframes sipandu-loader-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .sipandu-classroom-loading-shell{min-height:100dvh!important;background:radial-gradient(circle at 20% 15%,#dbeafe 0,transparent 28%),radial-gradient(circle at 85% 75%,#e0e7ff 0,transparent 24%),#f6f8fd!important;color:#0f172a!important;padding:1.25rem!important}
        .sipandu-classroom-loading-card{width:min(92vw,31rem);border:1px solid rgba(191,219,254,.9);border-radius:2rem;background:rgba(255,255,255,.92);padding:2rem;box-shadow:0 28px 70px rgba(30,64,175,.12);backdrop-filter:blur(18px);text-align:center}
        .sipandu-classroom-loading-icon{position:relative;margin:0 auto;display:grid;height:4.5rem;width:4.5rem;place-items:center;border-radius:1.5rem;background:linear-gradient(145deg,#1d4ed8,#2563eb);color:#fff;box-shadow:0 16px 32px rgba(37,99,235,.24)}
        .sipandu-classroom-loading-ring{position:absolute;inset:-.48rem;border-radius:1.85rem;border:2px solid transparent;border-top-color:#60a5fa;border-right-color:#bfdbfe;animation:sipandu-loader-spin 1.05s linear infinite}
        .sipandu-classroom-loading-title{margin-top:1.35rem;font:800 clamp(1.15rem,3vw,1.45rem)/1.2 system-ui,sans-serif;color:#0f172a}
        .sipandu-classroom-loading-copy{margin:.55rem auto 0;max-width:24rem;font:500 .82rem/1.65 system-ui,sans-serif;color:#64748b}
        .sipandu-classroom-loading-status{margin-top:1.15rem;display:inline-flex;align-items:center;gap:.5rem;border-radius:999px;background:#eff6ff;padding:.48rem .75rem;font:700 .72rem/1 system-ui,sans-serif;color:#1d4ed8}
        .sipandu-classroom-loading-dot{height:.45rem;width:.45rem;border-radius:999px;background:#2563eb;animation:sipandu-loader-pulse 1.1s ease-in-out infinite}
        .sipandu-classroom-loading-bars{margin-top:1.35rem;display:grid;gap:.55rem;text-align:left}
        .sipandu-classroom-loading-bar{height:.58rem;border-radius:999px;background:linear-gradient(90deg,#eff6ff 25%,#dbeafe 50%,#eff6ff 75%);background-size:200% 100%;animation:sipandu-loader-shimmer 1.35s linear infinite}
        .sipandu-classroom-loading-bar:nth-child(2){width:84%;animation-delay:.12s}.sipandu-classroom-loading-bar:nth-child(3){width:66%;animation-delay:.24s}
        @media(max-width:520px){.sipandu-classroom-loading-card{padding:1.55rem;border-radius:1.55rem}.sipandu-classroom-loading-icon{height:4rem;width:4rem;border-radius:1.3rem}}
    `;
    document.head.appendChild(style);
}

function enhanceLoadingState(): void {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('body *'));
    const loading = candidates.find((element) => {
        if (element.dataset.sipanduClassroomLoading === 'true') return false;
        if (element.children.length > 0) return false;
        return element.textContent?.trim() === 'Memuat ruang kelas…'
            || element.textContent?.trim() === 'Memuat ruang kelas...';
    });

    if (!loading) return;

    loading.dataset.sipanduClassroomLoading = 'true';
    loading.className = 'sipandu-classroom-loading-shell grid place-items-center';
    loading.innerHTML = `
        <section class="sipandu-classroom-loading-card" role="status" aria-live="polite" aria-label="Menyiapkan Ruang Kelas">
            <div class="sipandu-classroom-loading-icon" aria-hidden="true">
                <span class="sipandu-classroom-loading-ring"></span>
                <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path>
                </svg>
            </div>
            <h2 class="sipandu-classroom-loading-title">Menyiapkan Ruang Kelas</h2>
            <p class="sipandu-classroom-loading-copy">Sedang menyelaraskan pertemuan, materi, tugas, presensi, peserta, dan capaian OBE.</p>
            <div class="sipandu-classroom-loading-status"><span class="sipandu-classroom-loading-dot"></span> Mengambil data kelas</div>
            <div class="sipandu-classroom-loading-bars" aria-hidden="true"><span class="sipandu-classroom-loading-bar"></span><span class="sipandu-classroom-loading-bar"></span><span class="sipandu-classroom-loading-bar"></span></div>
        </section>
    `;
}

ensureStyles();
enhanceLoadingState();

const observer = new MutationObserver(enhanceLoadingState);
observer.observe(document.body, { childList: true, subtree: true });
