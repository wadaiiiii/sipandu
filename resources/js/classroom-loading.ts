export {};

function ensureStyles(): void {
    if (document.getElementById('sipandu-classroom-loading-style')) return;
    const style = document.createElement('style');
    style.id = 'sipandu-classroom-loading-style';
    style.textContent = `
      @keyframes sipandu-loader-spin{to{transform:rotate(360deg)}}
      .sipandu-classroom-loading-shell{min-height:100dvh!important;background:#f6f8fd!important;color:#0f172a!important;padding:1rem!important}
      .sipandu-classroom-loading-card{display:flex;align-items:center;gap:.85rem;width:min(92vw,25rem);border:1px solid #dbeafe;border-radius:1.2rem;background:#fff;padding:1rem 1.1rem;box-shadow:0 18px 42px rgba(30,64,175,.1)}
      .sipandu-classroom-loading-spinner{width:1.6rem;height:1.6rem;flex:0 0 auto;border:3px solid #dbeafe;border-top-color:#2563eb;border-radius:999px;animation:sipandu-loader-spin .75s linear infinite}
      .sipandu-classroom-loading-title{font:800 .92rem/1.25 system-ui,sans-serif;color:#0f172a}.sipandu-classroom-loading-copy{margin-top:.18rem;font:500 .75rem/1.45 system-ui,sans-serif;color:#64748b}
    `;
    document.head.appendChild(style);
}

function enhanceLoadingState(): void {
    const loading = Array.from(document.querySelectorAll<HTMLElement>('body *')).find((element) => {
        if (element.dataset.sipanduClassroomLoading === 'true' || element.children.length > 0) return false;
        const text = element.textContent?.trim();
        return text === 'Memuat ruang kelas…' || text === 'Memuat ruang kelas...';
    });
    if (!loading) return;

    loading.dataset.sipanduClassroomLoading = 'true';
    loading.className = 'sipandu-classroom-loading-shell grid place-items-center';
    loading.innerHTML = `<section class="sipandu-classroom-loading-card" role="status" aria-live="polite"><span class="sipandu-classroom-loading-spinner" aria-hidden="true"></span><div><div class="sipandu-classroom-loading-title">Data kelas sedang diproses…</div><div class="sipandu-classroom-loading-copy">Mohon tunggu sebentar.</div></div></section>`;
}

ensureStyles();
enhanceLoadingState();
const observer = new MutationObserver(enhanceLoadingState);
observer.observe(document.body, { childList: true, subtree: true });
