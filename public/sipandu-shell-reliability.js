(() => {
    'use strict';

    const LOGO_URL = 'https://akademik.unsulbar.ac.id/images/logo-unsulbar.png';
    let loggingOut = false;

    const basePath = () => String(window.__SIPANDU_BASE_PATH__ || '').replace(/\/+$/, '');
    const appUrl = (path) => {
        const clean = '/' + String(path || '').replace(/^\/+/, '');
        const base = basePath();
        return base && !clean.startsWith(base + '/') ? base + clean : clean;
    };
    const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    const makeLogo = () => {
        const image = document.createElement('img');
        image.src = LOGO_URL;
        image.alt = 'Logo Universitas Sulawesi Barat';
        image.loading = 'eager';
        image.decoding = 'async';
        Object.assign(image.style, {
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
        });
        return image;
    };

    const replaceBrandLogos = () => {
        document.querySelectorAll('p').forEach((label) => {
            if ((label.textContent || '').trim() !== 'SiPANDU') return;
            const brandRow = label.parentElement?.parentElement;
            const logoBox = brandRow?.firstElementChild;
            if (!(logoBox instanceof HTMLElement) || logoBox.querySelector('img[data-sipandu-unsulbar-logo]')) return;
            const image = makeLogo();
            image.dataset.sipanduUnsulbarLogo = 'true';
            logoBox.replaceChildren(image);
            logoBox.style.padding = '6px';
            logoBox.style.overflow = 'hidden';
            logoBox.style.background = '#fff';
        });

        document.querySelectorAll('p').forEach((label) => {
            if (!(label.textContent || '').includes('Memuat SiPANDU')) return;
            const logoBox = label.previousElementSibling;
            if (!(logoBox instanceof HTMLElement) || logoBox.querySelector('img[data-sipandu-unsulbar-logo]')) return;
            const image = makeLogo();
            image.dataset.sipanduUnsulbarLogo = 'true';
            logoBox.replaceChildren(image);
            logoBox.style.padding = '8px';
            logoBox.style.overflow = 'hidden';
            logoBox.style.background = '#fff';
        });
    };

    const closeDetachedViews = () => {
        window.dispatchEvent(new Event('sipandu:assessment-center-close'));
        document.body.removeAttribute('data-sipandu-assessment-open');
        document.documentElement.style.removeProperty('overflow');
        document.body.style.removeProperty('overflow');

        const assessmentRoot = document.getElementById('sipandu-assessment-center-root');
        if (assessmentRoot) assessmentRoot.replaceChildren();
    };

    const redirectHome = (() => {
        let redirected = false;
        return () => {
            if (redirected) return;
            redirected = true;
            window.location.replace(appUrl('/'));
        };
    })();

    document.addEventListener('click', (event) => {
        const control = event.target instanceof Element ? event.target.closest('button, a') : null;
        if (!control || (control.textContent || '').trim() !== 'Keluar' || loggingOut) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        loggingOut = true;
        closeDetachedViews();

        if (control instanceof HTMLButtonElement) control.disabled = true;
        control.setAttribute('aria-busy', 'true');

        const fallback = window.setTimeout(redirectHome, 550);
        fetch(appUrl('/logout'), {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
            keepalive: true,
            headers: {
                'X-CSRF-TOKEN': csrf(),
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).catch(() => undefined).finally(() => {
            window.clearTimeout(fallback);
            redirectHome();
        });
    }, true);

    replaceBrandLogos();
    new MutationObserver(replaceBrandLogos).observe(document.documentElement, { childList: true, subtree: true });
})();