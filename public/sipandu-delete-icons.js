(() => {
    'use strict';

    const trashIcon = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>';

    const apply = () => {
        document.querySelectorAll('button').forEach((button) => {
            const label = (button.textContent || '').replace(/\s+/g, ' ').trim();
            if (label !== 'Hapus tugas' && label !== 'Hapus kuis') return;
            button.innerHTML = trashIcon;
            button.title = label;
            button.setAttribute('aria-label', label);
            button.dataset.sipanduDeleteIcon = 'true';
            Object.assign(button.style, {
                display: 'grid',
                placeItems: 'center',
                width: '44px',
                minWidth: '44px',
                height: '44px',
                minHeight: '44px',
                padding: '0',
                borderRadius: '14px',
            });
        });
    };

    apply();
    new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
})();