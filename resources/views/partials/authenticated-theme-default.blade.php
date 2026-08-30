<script id="sipandu-authenticated-theme-default">
(() => {
    const SESSION_KEY = 'sipandu.auth-theme-initialized';

    const applyLight = () => {
        document.documentElement.dataset.theme = 'light';
        document.documentElement.style.colorScheme = 'light';
        try {
            localStorage.setItem('sipandu.theme', 'light');
            sessionStorage.setItem(SESSION_KEY, '1');
        } catch {
            // Tetap gunakan mode terang meski storage tidak tersedia.
        }

        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) themeMeta.setAttribute('content', '#071b56');

        try {
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'sipandu.theme',
                newValue: 'light',
            }));
        } catch {
            // StorageEvent tidak kritis untuk tampilan utama.
        }
    };

    const sync = () => {
        const authenticated = !!document.querySelector('#app button[aria-label="Notifikasi"]');
        const loginPage = Array.from(document.querySelectorAll('#app h1, #app h2')).some(
            (node) => node.textContent?.trim() === 'Masuk ke SiPANDU',
        );

        if (loginPage) {
            try { sessionStorage.removeItem(SESSION_KEY); } catch {}
            return;
        }

        if (!authenticated) return;

        let initialized = false;
        try { initialized = sessionStorage.getItem(SESSION_KEY) === '1'; } catch {}
        if (!initialized) applyLight();
    };

    sync();
    const root = document.getElementById('app');
    if (root) {
        const observer = new MutationObserver(() => window.requestAnimationFrame(sync));
        observer.observe(root, { childList: true, subtree: true });
    }
})();
</script>
