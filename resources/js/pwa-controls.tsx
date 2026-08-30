import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

function currentTheme(): Theme {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function appBasePath(): string {
    const value = document.querySelector<HTMLMetaElement>('meta[name="app-base-path"]')?.content?.trim() ?? '';
    if (!value || value === '/') return '';
    return `/${value.replace(/^\/+|\/+$/g, '')}`;
}

function applyTheme(theme: Theme): void {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('sipandu.theme', theme);

    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = theme === 'dark' ? '#020817' : '#071b56';
}

function PwaControls() {
    const [theme, setTheme] = useState<Theme>(() => currentTheme());

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            const register = () => {
                const basePath = appBasePath();
                const workerUrl = `${basePath}/sw.js`;
                const scope = `${basePath}/`;
                void navigator.serviceWorker.register(workerUrl, { scope }).catch(() => undefined);
            };

            if (document.readyState === 'complete') register();
            else window.addEventListener('load', register, { once: true });
        }

        const storage = (event: StorageEvent) => {
            if (event.key !== 'sipandu.theme') return;
            const nextTheme = event.newValue === 'dark' ? 'dark' : 'light';
            document.documentElement.dataset.theme = nextTheme;
            document.documentElement.style.colorScheme = nextTheme;
            setTheme(nextTheme);
        };

        window.addEventListener('storage', storage);
        return () => window.removeEventListener('storage', storage);
    }, []);

    const toggleTheme = () => {
        const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        setTheme(nextTheme);
    };

    return (
        <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Gunakan mode terang' : 'Gunakan mode gelap'}
            aria-label={theme === 'dark' ? 'Gunakan mode terang' : 'Gunakan mode gelap'}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
            {theme === 'dark' ? <Sun size={18} strokeWidth={1.9} /> : <Moon size={18} strokeWidth={1.9} />}
        </button>
    );
}

let root = document.getElementById('pwa-controls-root');
if (!root) {
    root = document.createElement('div');
    root.id = 'pwa-controls-root';
}
root.className = 'flex shrink-0 items-center';

const placeThemeRoot = () => {
    const bell = document.querySelector<HTMLButtonElement>('button[aria-label="Notifikasi"]');
    const bellWrapper = bell?.parentElement;
    const toolbar = bellWrapper?.parentElement;

    if (!bellWrapper || !toolbar) {
        if (root?.isConnected) root.remove();
        return;
    }

    if (root?.parentElement !== toolbar || root.nextElementSibling !== bellWrapper) {
        bellWrapper.insertAdjacentElement('beforebegin', root);
    }
};

placeThemeRoot();
const placementObserver = new MutationObserver(placeThemeRoot);
placementObserver.observe(document.body, { childList: true, subtree: true });

createRoot(root).render(<PwaControls />);
