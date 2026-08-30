export {};

function ensureStyles(): void {
    if (document.getElementById('sipandu-ux-performance-style')) return;
    const style = document.createElement('style');
    style.id = 'sipandu-ux-performance-style';
    style.textContent = `
      [data-sipandu-today-list] > a{padding-top:.8rem!important;padding-bottom:.8rem!important}
      [data-sipandu-today-list] > a p:nth-of-type(2){display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden}
      .sipandu-today-more{display:flex;width:100%;align-items:center;justify-content:center;border:0;border-top:1px solid #f1f5f9;background:#f8fafc;padding:.7rem 1rem;color:#2563eb;font:800 12px/1 system-ui,sans-serif;cursor:pointer}.sipandu-today-more:hover{background:#eff6ff}
      .sipandu-nav-processing{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(248,250,252,.88);backdrop-filter:blur(5px)}
      .sipandu-nav-processing-card{display:flex;align-items:center;gap:.8rem;border:1px solid #dbeafe;border-radius:1rem;background:#fff;padding:.9rem 1.1rem;box-shadow:0 18px 45px rgba(15,42,94,.14);color:#0f172a;font:800 13px/1.3 system-ui,sans-serif}
      .sipandu-nav-spinner{width:1.25rem;height:1.25rem;border:2px solid #bfdbfe;border-top-color:#2563eb;border-radius:999px;animation:sipandu-nav-spin .75s linear infinite}@keyframes sipandu-nav-spin{to{transform:rotate(360deg)}}
    `;
    document.head.appendChild(style);
}

function compactToday(): void {
    const heading = Array.from(document.querySelectorAll<HTMLHeadingElement>('h2')).find((item) => item.textContent?.trim() === 'Apa yang perlu diperhatikan?');
    const section = heading?.closest('section');
    if (!section) return;
    const list = Array.from(section.querySelectorAll<HTMLElement>('div')).find((item) => item.classList.contains('divide-y') && item.querySelectorAll(':scope > a').length > 0);
    if (!list || list.dataset.sipanduTodayList === 'true') return;

    const items = Array.from(list.querySelectorAll<HTMLAnchorElement>(':scope > a'));
    list.dataset.sipanduTodayList = 'true';
    if (items.length <= 4) return;

    let expanded = false;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sipandu-today-more';

    const render = () => {
        items.forEach((item, index) => { item.style.display = expanded || index < 4 ? '' : 'none'; });
        button.textContent = expanded ? 'Ringkas aktivitas' : `Tampilkan ${items.length - 4} aktivitas lainnya`;
    };
    button.addEventListener('click', () => { expanded = !expanded; render(); });
    list.insertAdjacentElement('afterend', button);
    render();
}

function showNavigationProcessing(): void {
    if (document.querySelector('.sipandu-nav-processing')) return;
    const overlay = document.createElement('div');
    overlay.className = 'sipandu-nav-processing';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = '<div class="sipandu-nav-processing-card"><span class="sipandu-nav-spinner" aria-hidden="true"></span><span>Data kelas sedang diproses…</span></div>';
    document.body.appendChild(overlay);
}

function installNavigationFeedback(): void {
    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
        if (!target || target.target === '_blank' || target.hasAttribute('download')) return;
        const url = new URL(target.href, window.location.origin);
        if (url.origin !== window.location.origin || !/^\/kelas\/\d+$/.test(url.pathname)) return;

        event.preventDefault();
        showNavigationProcessing();
        window.setTimeout(() => { window.location.href = url.href; }, 40);
    }, true);
}

ensureStyles();
compactToday();
installNavigationFeedback();

const root = document.getElementById('app');
if (root) {
    let scheduled = false;
    const observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(() => { scheduled = false; compactToday(); });
    });
    observer.observe(root, { childList: true, subtree: true });
}
