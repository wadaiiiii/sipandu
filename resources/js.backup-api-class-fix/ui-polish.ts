export {};

function ensurePolishStyles(): void {
    if (document.getElementById('sipandu-ui-polish')) return;

    const style = document.createElement('style');
    style.id = 'sipandu-ui-polish';
    style.textContent = `
        html, body { width: 100%; max-width: 100%; overflow-x: hidden; }
        *, *::before, *::after { box-sizing: border-box; }
        body[data-sipandu-layout] #app,
        body[data-sipandu-layout] main,
        body[data-sipandu-layout] section,
        body[data-sipandu-layout] article,
        body[data-sipandu-layout] header,
        body[data-sipandu-layout] aside,
        body[data-sipandu-layout] div { min-width: 0; }
        body[data-sipandu-layout] img,
        body[data-sipandu-layout] video,
        body[data-sipandu-layout] canvas { max-width: 100%; height: auto; }
        body[data-sipandu-layout] input,
        body[data-sipandu-layout] select,
        body[data-sipandu-layout] textarea,
        body[data-sipandu-layout] button { max-width: 100%; min-width: 0; }
        body[data-sipandu-layout] button,
        body[data-sipandu-layout] a { touch-action: manipulation; }
        [data-sipandu-overflow-guard="true"] { overflow-x: auto !important; overscroll-behavior-x: contain; }
        [data-sipandu-dashboard-header-inner="true"],
        [data-sipandu-dashboard-content="true"] { width: min(100%, 1500px); margin-inline: auto; }
        [data-sipandu-dashboard-content="true"] { min-height: calc(100dvh - 5rem); }
        [data-sipandu-login-identifier="true"] { text-transform: none; }
        [data-sipandu-login-hint="true"] { max-width: 34rem; }

        @media (max-width: 1023px) {
            [data-sipandu-login-shell="true"] {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) !important;
                min-height: 100dvh !important;
                align-content: start;
            }
            [data-sipandu-login-hero="true"] {
                min-height: auto !important;
                padding: 1.5rem !important;
            }
            [data-sipandu-login-hero="true"] > div:not([class*="absolute"]):first-of-type > div:nth-child(2) {
                margin-top: 2rem !important;
                max-width: 44rem;
            }
            [data-sipandu-login-hero="true"] h1 {
                max-width: 38rem !important;
                font-size: clamp(1.9rem, 6vw, 2.8rem) !important;
                line-height: 1.08 !important;
            }
            [data-sipandu-login-hero="true"] h1 + p { margin-top: 1rem !important; }
            [data-sipandu-login-hero="true"] > div:last-child { display: none !important; }
            [data-sipandu-login-form-wrap="true"] {
                align-items: flex-start !important;
                padding: 2rem 1.5rem 2.5rem !important;
            }
            [data-sipandu-dashboard-header-inner="true"],
            [data-sipandu-dashboard-content="true"] { width: 100%; }
        }

        @media (max-width: 767px) {
            body[data-sipandu-layout] input,
            body[data-sipandu-layout] select,
            body[data-sipandu-layout] textarea { font-size: 16px !important; }
            [data-sipandu-dashboard-content="true"] { padding-inline: 1rem !important; padding-top: 1.25rem !important; }
            [data-sipandu-dashboard-header-inner="true"] { padding-inline: 1rem !important; }
            [data-sipandu-login-form-wrap="true"] { padding-inline: 1rem !important; }
        }

        @media (max-height: 620px) and (min-width: 640px) {
            [data-sipandu-login-hero="true"] { padding-block: 1.25rem !important; }
            [data-sipandu-login-hero="true"] > div:not([class*="absolute"]):first-of-type > div:nth-child(2) { margin-top: 1.25rem !important; }
            [data-sipandu-login-form-wrap="true"] { padding-block: 1.5rem !important; }
        }
    `;
    document.head.appendChild(style);
}

function setLeadingLabelText(label: HTMLLabelElement, text: string): void {
    const first = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    if (first) {
        first.textContent = text;
        return;
    }

    label.insertBefore(document.createTextNode(text), label.firstChild);
}

function polishLogin(): void {
    const heading = Array.from(document.querySelectorAll<HTMLHeadingElement>('h2'))
        .find((item) => item.textContent?.trim() === 'Masuk ke SiPANDU');
    const form = heading?.closest('form');
    if (!form) return;

    form.dataset.sipanduLoginForm = 'true';

    const shell = form.closest('main')?.firstElementChild as HTMLElement | null;
    if (shell) shell.dataset.sipanduLoginShell = 'true';

    const formWrap = form.parentElement;
    if (formWrap) formWrap.dataset.sipanduLoginFormWrap = 'true';

    const hero = shell?.firstElementChild as HTMLElement | null;
    if (hero && hero !== formWrap) hero.dataset.sipanduLoginHero = 'true';

    const identifier = form.querySelector<HTMLInputElement>('input[type="email"], input[data-sipandu-login-identifier]');
    if (identifier) {
        identifier.dataset.sipanduLoginIdentifier = 'true';
        identifier.type = 'text';
        identifier.autocomplete = 'username';
        identifier.inputMode = 'text';
        identifier.placeholder = 'D0223123 atau nama@unsulbar.ac.id';
        identifier.setAttribute('aria-label', 'NIM atau email');

        const label = identifier.closest('label');
        if (label) {
            setLeadingLabelText(label, 'NIM / Email');

            if (!label.querySelector('[data-sipandu-login-hint]')) {
                const hint = document.createElement('span');
                hint.dataset.sipanduLoginHint = 'true';
                hint.className = 'mt-2 block text-xs font-normal leading-5 text-slate-400';
                hint.textContent = 'Mahasiswa dapat menggunakan NIM. Dosen dan pengelola dapat menggunakan email.';
                label.appendChild(hint);
            }
        }
    }

    const password = form.querySelector<HTMLInputElement>('input[type="password"]');
    if (password) {
        password.autocomplete = 'current-password';
        password.placeholder = 'Masukkan kata sandi';
    }

    const description = heading?.nextElementSibling as HTMLElement | null;
    if (description && !description.dataset.sipanduLoginDescription) {
        description.dataset.sipanduLoginDescription = 'true';
        description.textContent = 'Masuk menggunakan NIM atau email yang telah terdaftar.';
    }
}

function polishDashboard(): void {
    const main = document.querySelector<HTMLElement>('body[data-sipandu-layout="dashboard"] #app main');
    if (!main) return;

    const shell = Array.from(main.children).find((child) => child.querySelector('header')) as HTMLElement | undefined;
    const header = shell?.querySelector<HTMLElement>(':scope > header');
    const content = header?.nextElementSibling as HTMLElement | null;
    const headerInner = header?.firstElementChild as HTMLElement | null;

    if (shell) shell.dataset.sipanduDashboardShell = 'true';
    if (header) header.dataset.sipanduDashboardHeader = 'true';
    if (headerInner) headerInner.dataset.sipanduDashboardHeaderInner = 'true';
    if (content) content.dataset.sipanduDashboardContent = 'true';

    document.querySelectorAll<HTMLElement>('article, section').forEach((element) => {
        if (element.scrollWidth > element.clientWidth + 2 && getComputedStyle(element).overflowX === 'visible') {
            element.dataset.sipanduOverflowGuard = 'true';
        }
    });
}

let scheduled = false;
const run = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
        scheduled = false;
        ensurePolishStyles();
        polishLogin();
        polishDashboard();
    });
};

run();
window.addEventListener('resize', run, { passive: true });
window.addEventListener('sipandu:dashboard-ready', run);

const observer = new MutationObserver(run);
observer.observe(document.body, { childList: true, subtree: true });

