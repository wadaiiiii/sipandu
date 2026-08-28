import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';
type Position = { top: number; left: number };

function currentTheme(): Theme {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
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
    const [position, setPosition] = useState<Position | null>(null);
    const dashboardLayout = document.body.dataset.sipanduLayout === 'dashboard';

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            const register = () => {
                void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
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

    useEffect(() => {
        if (!dashboardLayout) return;

        const locate = () => {
            const bell = document.querySelector<HTMLButtonElement>('button[aria-label="Notifikasi"]');
            if (!bell) {
                setPosition(null);
                return false;
            }

            const rect = bell.getBoundingClientRect();
            setPosition({
                top: rect.top,
                left: Math.max(8, rect.left - 48),
            });
            return true;
        };

        locate();

        const observer = new MutationObserver(() => {
            if (locate()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        const refreshPosition = () => { locate(); };
        window.addEventListener('resize', refreshPosition);
        window.addEventListener('scroll', refreshPosition, { passive: true });

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', refreshPosition);
            window.removeEventListener('scroll', refreshPosition);
        };
    }, [dashboardLayout]);

    const toggleTheme = () => {
        const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        setTheme(nextTheme);
    };

    if (!dashboardLayout || !position) return null;

    return (
        <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Gunakan mode terang' : 'Gunakan mode gelap'}
            aria-label={theme === 'dark' ? 'Gunakan mode terang' : 'Gunakan mode gelap'}
            className="fixed z-[90] grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            style={{ top: position.top, left: position.left }}
        >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
}

let root = document.getElementById('pwa-controls-root');
if (!root) {
    root = document.createElement('div');
    root.id = 'pwa-controls-root';
    document.body.appendChild(root);
}
createRoot(root).render(<PwaControls />);
