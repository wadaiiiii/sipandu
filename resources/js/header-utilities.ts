const STYLE_ID = 'sipandu-header-utilities-style';

if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        #pwa-controls-root,
        #sipandu-class-access-root {
            display: flex;
            flex: 0 0 auto;
            align-items: center;
        }

        #pwa-controls-root > button {
            position: static !important;
            top: auto !important;
            left: auto !important;
        }

        #sipandu-class-access-root > button {
            position: static !important;
            inset: auto !important;
            width: 2.5rem !important;
            height: 2.5rem !important;
            padding: 0 !important;
            gap: 0 !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 1rem !important;
            background: var(--sipandu-card) !important;
            color: var(--sipandu-muted) !important;
            box-shadow: 0 1px 2px rgb(15 23 42 / 6%) !important;
            transform: none !important;
        }

        #sipandu-class-access-root > button:hover {
            border-color: #bfdbfe !important;
            background: var(--sipandu-brand-50) !important;
            color: var(--sipandu-brand-700) !important;
        }

        #sipandu-class-access-root > button > span {
            display: none !important;
        }

        @media (max-width: 639px) {
            #pwa-controls-root > button,
            #calendar-panel-root > button,
            #sipandu-class-access-root > button {
                width: 2.25rem !important;
                height: 2.25rem !important;
                border-radius: 0.85rem !important;
            }
        }
    `;
    document.head.appendChild(style);
}

function syncHeaderUtilities(): void {
    const bell = document.querySelector<HTMLButtonElement>('button[aria-label="Notifikasi"]');
    const bellWrapper = bell?.parentElement;
    const toolbar = bellWrapper?.parentElement;
    const themeRoot = document.getElementById('pwa-controls-root');
    const calendarRoot = document.getElementById('calendar-panel-root');
    const accessRoot = document.getElementById('sipandu-class-access-root');

    if (!bellWrapper || !toolbar) {
        if (themeRoot) themeRoot.style.display = 'none';
        if (accessRoot) accessRoot.style.display = 'none';
        return;
    }

    if (themeRoot) {
        themeRoot.style.removeProperty('display');
        if (themeRoot.parentElement !== toolbar || themeRoot.nextElementSibling !== bellWrapper) {
            toolbar.insertBefore(themeRoot, bellWrapper);
        }
    }

    if (accessRoot) {
        accessRoot.style.removeProperty('display');
        const anchor = calendarRoot?.parentElement === toolbar ? calendarRoot : bellWrapper;
        if (accessRoot.parentElement !== toolbar || accessRoot.previousElementSibling !== anchor) {
            anchor.insertAdjacentElement('afterend', accessRoot);
        }
    }
}

syncHeaderUtilities();

const observer = new MutationObserver(syncHeaderUtilities);
observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('resize', syncHeaderUtilities);
window.addEventListener('focus', syncHeaderUtilities);
