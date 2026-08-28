import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Download, Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

type InstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

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

function hasAuthenticatedDashboard(): boolean {
    return document.querySelector('aside.fixed.inset-y-0') !== null;
}

function PwaControls() {
    const [theme, setTheme] = useState<Theme>(() => currentTheme());
    const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
    const [installed, setInstalled] = useState(
        () => window.matchMedia?.('(display-mode: standalone)').matches ?? false,
    );
    const [dashboardAuthenticated, setDashboardAuthenticated] = useState(() => hasAuthenticatedDashboard());

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            const register = () => {
                void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
            };
            if (document.readyState === 'complete') register();
            else window.addEventListener('load', register, { once: true });
        }

        const beforeInstall = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as InstallPromptEvent);
        };
        const appInstalled = () => {
            setInstalled(true);
            setInstallPrompt(null);
        };
        const storage = (event: StorageEvent) => {
            if (event.key !== 'sipandu.theme') return;
            const nextTheme = event.newValue === 'dark' ? 'dark' : 'light';
            document.documentElement.dataset.theme = nextTheme;
            document.documentElement.style.colorScheme = nextTheme;
            setTheme(nextTheme);
        };

        const layoutObserver = new MutationObserver(() => {
            setDashboardAuthenticated(hasAuthenticatedDashboard());
        });
        layoutObserver.observe(document.body, { childList: true, subtree: true });
        setDashboardAuthenticated(hasAuthenticatedDashboard());

        window.addEventListener('beforeinstallprompt', beforeInstall);
        window.addEventListener('appinstalled', appInstalled);
        window.addEventListener('storage', storage);

        return () => {
            window.removeEventListener('beforeinstallprompt', beforeInstall);
            window.removeEventListener('appinstalled', appInstalled);
            window.removeEventListener('storage', storage);
            layoutObserver.disconnect();
        };
    }, []);

    const toggleTheme = () => {
        const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        setTheme(nextTheme);
    };

    const install = async () => {
        if (!installPrompt) return;
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === 'accepted') setInstallPrompt(null);
    };

    const dashboardLayout = document.body.dataset.sipanduLayout === 'dashboard';
    const positionClass = dashboardLayout
        ? dashboardAuthenticated
            ? 'bottom-20 left-4 sm:left-5'
            : 'right-4 top-4 sm:right-6 sm:top-6'
        : 'bottom-4 left-4 sm:bottom-6 sm:left-6';

    return (
        <div className={`fixed z-[90] flex items-center gap-2 ${positionClass}`}>
            {!installed && installPrompt && (
                <button
                    type="button"
                    onClick={() => void install()}
                    title="Pasang SiPANDU sebagai aplikasi"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                    <Download size={15} />
                    <span className="hidden sm:inline">Pasang App</span>
                </button>
            )}
            <button
                type="button"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Gunakan mode terang' : 'Gunakan mode gelap'}
                aria-label={theme === 'dark' ? 'Gunakan mode terang' : 'Gunakan mode gelap'}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                <span className="hidden sm:inline">{theme === 'dark' ? 'Terang' : 'Gelap'}</span>
            </button>
        </div>
    );
}

let root = document.getElementById('pwa-controls-root');
if (!root) {
    root = document.createElement('div');
    root.id = 'pwa-controls-root';
    document.body.appendChild(root);
}
createRoot(root).render(<PwaControls />);
