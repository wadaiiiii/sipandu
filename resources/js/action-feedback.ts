export {};

declare global {
    interface Window {
        __sipanduActionFeedbackInstalled?: boolean;
    }
}

if (!window.__sipanduActionFeedbackInstalled) {
    window.__sipanduActionFeedbackInstalled = true;

    const style = document.createElement('style');
    style.textContent = `
        #sipandu-action-feedback{position:fixed;left:50%;top:1rem;z-index:99999;display:flex;align-items:center;gap:.6rem;max-width:min(92vw,28rem);transform:translate(-50%,-140%);opacity:0;pointer-events:none;border:1px solid #dbeafe;border-radius:999px;background:rgba(255,255,255,.97);padding:.65rem .9rem;box-shadow:0 14px 36px rgba(15,23,42,.16);font:600 13px/1.25 system-ui,sans-serif;color:#1e3a8a;transition:transform .18s ease,opacity .18s ease}.sipandu-action-feedback--show{transform:translate(-50%,0)!important;opacity:1!important}.sipandu-action-feedback--error{border-color:#fecdd3!important;color:#be123c!important}.sipandu-action-feedback--success{border-color:#bbf7d0!important;color:#047857!important}.sipandu-action-spinner{width:16px;height:16px;flex:0 0 auto;border:2px solid currentColor;border-right-color:transparent;border-radius:999px;animation:sipandu-spin .7s linear infinite}button[data-sipandu-pending="true"]{cursor:wait!important}button[data-sipandu-pending="true"]::after{content:"";width:14px;height:14px;display:inline-block;flex:0 0 auto;margin-left:.25rem;border:2px solid currentColor;border-right-color:transparent;border-radius:999px;animation:sipandu-spin .7s linear infinite}button[data-sipandu-pending="true"]:has(.animate-spin)::after{display:none}@keyframes sipandu-spin{to{transform:rotate(360deg)}}
    `;
    document.head.appendChild(style);

    const feedback = document.createElement('div');
    feedback.id = 'sipandu-action-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    feedback.innerHTML = '<span class="sipandu-action-spinner" aria-hidden="true"></span><span data-sipandu-feedback-text>Sedang memproses…</span>';
    document.body.appendChild(feedback);

    const text = feedback.querySelector<HTMLElement>('[data-sipandu-feedback-text]')!;
    const spinner = feedback.querySelector<HTMLElement>('.sipandu-action-spinner')!;
    const pendingButtons = new Set<HTMLButtonElement>();
    let lastClickedButton: HTMLButtonElement | null = null;
    let lastClickedAt = 0;
    let activeMutations = 0;
    let finishTimer: number | null = null;
    let lastMutationOk = true;

    const setFeedback = (message: string, state: 'loading' | 'success' | 'error') => {
        text.textContent = message;
        spinner.style.display = state === 'loading' ? '' : 'none';
        feedback.classList.toggle('sipandu-action-feedback--success', state === 'success');
        feedback.classList.toggle('sipandu-action-feedback--error', state === 'error');
        feedback.classList.add('sipandu-action-feedback--show');
    };

    const markButton = (button: HTMLButtonElement | null) => {
        if (!button || button.disabled || pendingButtons.has(button)) return;
        button.dataset.sipanduPending = 'true';
        button.dataset.sipanduWasDisabled = button.disabled ? 'true' : 'false';
        button.setAttribute('aria-busy', 'true');
        button.disabled = true;
        pendingButtons.add(button);
    };

    const releaseButtons = () => {
        pendingButtons.forEach((button) => {
            button.removeAttribute('aria-busy');
            delete button.dataset.sipanduPending;
            if (button.dataset.sipanduWasDisabled !== 'true') button.disabled = false;
            delete button.dataset.sipanduWasDisabled;
        });
        pendingButtons.clear();
    };

    document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target.closest('button') : null;
        if (!(target instanceof HTMLButtonElement) || target.disabled) return;
        lastClickedButton = target;
        lastClickedAt = Date.now();
    }, true);

    document.addEventListener('submit', (event) => {
        const submitter = (event as SubmitEvent).submitter;
        if (submitter instanceof HTMLButtonElement) {
            lastClickedButton = submitter;
            lastClickedAt = Date.now();
        }
    }, true);

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const inferredMethod = input instanceof Request ? input.method : 'GET';
        const method = String(init?.method ?? inferredMethod ?? 'GET').toUpperCase();
        const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);

        if (!isMutation) return originalFetch(input, init);

        if (finishTimer !== null) {
            window.clearTimeout(finishTimer);
            finishTimer = null;
        }

        if (lastClickedButton && Date.now() - lastClickedAt < 1500) {
            markButton(lastClickedButton);
        }
        lastClickedButton = null;
        activeMutations += 1;
        lastMutationOk = true;
        setFeedback('Sedang memproses…', 'loading');

        try {
            const response = await originalFetch(input, init);
            if (!response.ok) lastMutationOk = false;
            return response;
        } catch (error) {
            lastMutationOk = false;
            throw error;
        } finally {
            activeMutations = Math.max(0, activeMutations - 1);
            if (activeMutations === 0) {
                finishTimer = window.setTimeout(() => {
                    releaseButtons();
                    setFeedback(lastMutationOk ? 'Berhasil diproses.' : 'Proses belum berhasil.', lastMutationOk ? 'success' : 'error');
                    window.setTimeout(() => feedback.classList.remove('sipandu-action-feedback--show'), lastMutationOk ? 900 : 1800);
                    finishTimer = null;
                }, 320);
            }
        }
    };
}
