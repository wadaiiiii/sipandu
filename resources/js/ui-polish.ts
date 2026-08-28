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

    const shell = Array.from(main.children).find((child) => child.querySelector?.('header')) as HTMLElement | undefined;
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
        polishLogin();
        polishDashboard();
    });
};

run();
window.addEventListener('resize', run, { passive: true });
window.addEventListener('sipandu:dashboard-ready', run);

const observer = new MutationObserver(run);
observer.observe(document.body, { childList: true, subtree: true });
