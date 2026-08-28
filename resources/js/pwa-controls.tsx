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

function PwaControls() {
    const [theme, setTheme] = useState<Theme>(() => currentTheme());
    const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
    const [installed, setInstalled] = useState(
        () => window.matchMedia?.('(display-mode: standalone)').matches ?? false,
    );

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

        window.addEventListener('beforeinstallprompt', beforeInstall);
        window.addEventListener('appinstalled', appInstalled);
        window.addEventListener('storage', storage);

        return () => {
            window.removeEventListener('beforeinstallprompt', beforeInstall);
            window.removeEventListener('appinstalled', appInstalled);
            window.removeEventListener('storage', storage);
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

    return (
        <div className={`fixed bottom-4 z-[90] flex items-center gap-2 sm:bottom-6 ${dashboardLayout ? 'left-4 xl:left-[18.5rem]' : 'left-4 sm:left-6'}`}>
            {!installed && installPrompt && (
                <button
                    type="button"
                    onClick={() => void install()}
                    title="Pasang SiPANDU sebagai aplikasi"
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200 bg-white px-3.5 text-xs font-bold text-blue-700 shadow-xl shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                    <Download size={16} />
                    <span className="hidden sm:inline">Pasang App</span>
                </button>
            )}
            <button
                type="button"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Gunakan mode terang' : 'Gunakan mode gelap'}
                aria-label={theme === 'dark' ? 'Gunakan mode terang' : 'Gunakan mode gelap'}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200 bg-white px-3.5 text-xs font-bold text-blue-700 shadow-xl shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
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
