export {};

const bootStartedAt = Date.now();
let sawBusyState = false;
let scheduled = false;

function ensureStyles(): void {
    if (document.getElementById('sipandu-class-card-ready-style')) return;

    const style = document.createElement('style');
    style.id = 'sipandu-class-card-ready-style';
    style.textContent = `
        @keyframes sipandu-class-card-pulse{0%,100%{opacity:.55}50%{opacity:1}}
        [data-sipandu-class-card-section="true"] [data-sipandu-class-card-grid="true"]{position:relative}
        [data-sipandu-class-card-section="true"][data-loading="true"] [data-sipandu-class-card-grid="true"]{display:none!important}
        .sipandu-class-card-loading{margin-top:1.25rem;display:grid;gap:1rem}
        @media(min-width:1024px){.sipandu-class-card-loading{grid-template-columns:repeat(2,minmax(0,1fr))}}
        .sipandu-class-card-skeleton{overflow:hidden;border:1px solid #e2e8f0;border-radius:1.4rem;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.04)}
        .sipandu-class-card-skeleton-bar{height:.45rem;background:linear-gradient(90deg,#dbeafe,#bfdbfe,#dbeafe);animation:sipandu-class-card-pulse 1.15s ease-in-out infinite}
        .sipandu-class-card-skeleton-body{padding:1.25rem}
        .sipandu-class-card-skeleton-row{display:flex;align-items:center;justify-content:space-between;gap:.75rem}
        .sipandu-class-card-skeleton-icon{width:2.75rem;height:2.75rem;border-radius:1rem;background:#eff6ff;animation:sipandu-class-card-pulse 1.15s ease-in-out infinite}
        .sipandu-class-card-skeleton-line{height:.72rem;border-radius:999px;background:#eaf0f8;animation:sipandu-class-card-pulse 1.15s ease-in-out infinite}
        .sipandu-class-card-skeleton-actions{display:flex;gap:.5rem;margin-top:1rem;padding-top:.9rem;border-top:1px solid #f1f5f9}
        .sipandu-class-card-skeleton-button{height:2rem;width:6rem;border-radius:.75rem;background:#eaf0f8;animation:sipandu-class-card-pulse 1.15s ease-in-out infinite}
        .sipandu-class-card-loading-note{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:.55rem;color:#64748b;font:600 12px/1.4 system-ui,sans-serif}
        .sipandu-class-card-loading-spinner{width:1rem;height:1rem;border:2px solid #dbeafe;border-top-color:#2563eb;border-radius:999px;animation:sipandu-class-card-spin .7s linear infinite}
        @keyframes sipandu-class-card-spin{to{transform:rotate(360deg)}}
        [data-sipandu-card-ready="false"]{position:relative;opacity:.72}
        [data-sipandu-card-ready="false"] a[href]{pointer-events:none!important;cursor:wait!important;filter:saturate(.4)}
        .sipandu-card-waiting-chip{display:inline-flex;align-items:center;gap:.35rem;margin-top:.7rem;border-radius:999px;background:#f8fafc;padding:.35rem .55rem;color:#64748b;font:600 10px/1 system-ui,sans-serif}
        .sipandu-card-waiting-chip::before{content:'';width:.7rem;height:.7rem;border:2px solid #cbd5e1;border-top-color:#2563eb;border-radius:999px;animation:sipandu-class-card-spin .7s linear infinite}
    `;
    document.head.appendChild(style);
}

function findSection(): HTMLElement | null {
    const heading = Array.from(document.querySelectorAll<HTMLHeadingElement>('h2'))
        .find((item) => item.textContent?.trim() === 'Kelas terbaru');
    return (heading?.closest('section') as HTMLElement | null) ?? null;
}

function findGrid(section: HTMLElement): HTMLElement | null {
    return Array.from(section.querySelectorAll<HTMLElement>('div')).find((item) => {
        const directArticles = item.querySelectorAll(':scope > article').length;
        const hasEmptyState = (item.textContent ?? '').includes('Belum ada kelas');
        return directArticles > 0 || (item.classList.contains('grid') && hasEmptyState);
    }) ?? null;
}

function cardIsComplete(card: HTMLElement): boolean {
    const text = (card.textContent ?? '').replace(/\s+/g, ' ').trim();
    const heading = card.querySelector<HTMLHeadingElement>('h3')?.textContent?.trim() ?? '';
    const links = Array.from(card.querySelectorAll<HTMLAnchorElement>('a[href]'));
    const continueLink = links.find((link) => link.textContent?.trim() === 'Lanjutkan');
    const recapLink = links.find((link) => /Rekap Pembelajaran/i.test(link.textContent ?? ''));

    const continueReady = Boolean(continueLink && /^\/kelas\/\d+$/.test(new URL(continueLink.href, window.location.origin).pathname));
    const recapReady = Boolean(recapLink && /^\/kelas\/\d+\/jurnal$/.test(new URL(recapLink.href, window.location.origin).pathname));
    const hasCodeAndCredits = /\b\S+\s*·\s*\d+\s*SKS\b/i.test(text);
    const hasClassName = heading.length > 2 && /—\s*Kelas\s+\S+/i.test(heading);
    const hasPlaceholder = /Memuat|Menyiapkan|(^|\s)…(\s|$)/i.test(text);

    return continueReady && recapReady && hasCodeAndCredits && hasClassName && !hasPlaceholder;
}

function setLinkGuard(link: HTMLAnchorElement, guarded: boolean): void {
    if (guarded) {
        if (!link.dataset.sipanduOriginalTabindex) {
            link.dataset.sipanduOriginalTabindex = link.getAttribute('tabindex') ?? '';
        }
        link.setAttribute('aria-disabled', 'true');
        link.setAttribute('tabindex', '-1');
        link.dataset.sipanduClassGuarded = 'true';
        return;
    }

    if (link.dataset.sipanduClassGuarded !== 'true') return;
    link.removeAttribute('aria-disabled');
    const previous = link.dataset.sipanduOriginalTabindex ?? '';
    if (previous) link.setAttribute('tabindex', previous);
    else link.removeAttribute('tabindex');
    delete link.dataset.sipanduOriginalTabindex;
    delete link.dataset.sipanduClassGuarded;
}

function decorateCards(grid: HTMLElement, forceGuard: boolean): void {
    grid.querySelectorAll<HTMLElement>(':scope > article').forEach((card) => {
        const ready = !forceGuard && cardIsComplete(card);
        card.dataset.sipanduCardReady = ready ? 'true' : 'false';
        card.setAttribute('aria-busy', ready ? 'false' : 'true');
        card.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => setLinkGuard(link, !ready));

        let chip = card.querySelector<HTMLElement>('.sipandu-card-waiting-chip');
        if (!ready && !chip) {
            chip = document.createElement('span');
            chip.className = 'sipandu-card-waiting-chip';
            chip.textContent = 'Menyiapkan data kelas';
            const body = card.querySelector<HTMLElement>('.p-5') ?? card;
            body.appendChild(chip);
        }
        if (ready) chip?.remove();
    });
}

function ensureLoadingPlaceholder(section: HTMLElement): HTMLElement {
    let placeholder = section.querySelector<HTMLElement>('[data-sipandu-class-loading-placeholder="true"]');
    if (placeholder) return placeholder;

    placeholder = document.createElement('div');
    placeholder.dataset.sipanduClassLoadingPlaceholder = 'true';
    placeholder.className = 'sipandu-class-card-loading';
    placeholder.setAttribute('role', 'status');
    placeholder.setAttribute('aria-live', 'polite');
    placeholder.innerHTML = `${[0, 1].map(() => `
        <article class="sipandu-class-card-skeleton" aria-hidden="true">
            <div class="sipandu-class-card-skeleton-bar"></div>
            <div class="sipandu-class-card-skeleton-body">
                <div class="sipandu-class-card-skeleton-row"><span class="sipandu-class-card-skeleton-icon"></span><span class="sipandu-class-card-skeleton-line" style="width:1.15rem"></span></div>
                <div class="sipandu-class-card-skeleton-line" style="width:34%;margin-top:1.25rem"></div>
                <div class="sipandu-class-card-skeleton-line" style="width:72%;margin-top:.7rem;height:.9rem"></div>
                <div class="sipandu-class-card-skeleton-actions"><span class="sipandu-class-card-skeleton-button"></span><span class="sipandu-class-card-skeleton-button" style="width:8.2rem"></span></div>
            </div>
        </article>`).join('')}
        <div class="sipandu-class-card-loading-note"><span class="sipandu-class-card-loading-spinner" aria-hidden="true"></span><span>Menyiapkan informasi kelas…</span></div>`;

    const grid = findGrid(section);
    if (grid) section.insertBefore(placeholder, grid);
    else section.appendChild(placeholder);
    return placeholder;
}

function enhance(): void {
    const section = findSection();
    if (!section) return;
    section.dataset.sipanduClassCardSection = 'true';

    const grid = findGrid(section);
    if (!grid) return;
    grid.dataset.sipanduClassCardGrid = 'true';

    const spinning = Boolean(section.querySelector('svg.animate-spin'));
    if (spinning) sawBusyState = true;

    const cards = grid.querySelectorAll(':scope > article');
    const emptyState = (grid.textContent ?? '').includes('Belum ada kelas');
    const initialUnresolved = !sawBusyState && cards.length === 0 && emptyState && Date.now() - bootStartedAt < 1600;
    const loading = spinning || initialUnresolved;

    section.dataset.loading = loading ? 'true' : 'false';
    decorateCards(grid, loading);

    const placeholder = ensureLoadingPlaceholder(section);
    placeholder.style.display = loading ? 'grid' : 'none';
}

ensureStyles();

function scheduleEnhance(): void {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
        scheduled = false;
        enhance();
    });
}

scheduleEnhance();
const app = document.getElementById('app');
if (app) {
    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
}

document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-sipandu-class-guarded="true"]') : null;
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
}, true);
