<style id="sipandu-class-management-ui-v2-style">
[data-sipandu-class-card-v2="true"] {
    border: 1px solid #dbe4f0 !important;
    border-radius: 1.65rem !important;
    background: #fff !important;
    box-shadow: 0 10px 30px rgba(15, 42, 94, .055) !important;
}
[data-sipandu-class-card-v2="true"] > div:nth-child(2) {
    padding: 1.45rem !important;
}
[data-sipandu-class-header-v2="true"] {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) minmax(20rem, 24rem) !important;
    align-items: start !important;
    gap: 1.5rem !important;
}
[data-sipandu-class-info-v2="true"] {
    min-width: 0 !important;
    padding-top: .05rem !important;
}
[data-sipandu-class-info-v2="true"] > div:first-child {
    display: flex !important;
    min-height: 2rem !important;
    align-items: center !important;
    gap: .7rem !important;
}
[data-sipandu-class-info-v2="true"] > div:first-child > span:first-child {
    display: inline-flex !important;
    height: 2rem !important;
    align-items: center !important;
    border-radius: 999px !important;
    padding: 0 .85rem !important;
    font-size: .72rem !important;
    line-height: 1 !important;
    letter-spacing: .045em !important;
}
[data-sipandu-class-info-v2="true"] h2 {
    margin-top: .78rem !important;
    max-width: 34rem !important;
    font-size: 1.28rem !important;
    line-height: 1.28 !important;
    letter-spacing: -.02em !important;
}
[data-sipandu-class-info-v2="true"] h2 + p {
    margin-top: .48rem !important;
    font-size: .9rem !important;
    line-height: 1.35 !important;
}
[data-sipandu-class-actions-v2="true"] {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
    align-items: center !important;
    gap: .65rem !important;
}
[data-sipandu-class-actions-v2="true"] > a {
    display: inline-flex !important;
    width: 100% !important;
    height: 2.8rem !important;
    min-height: 2.8rem !important;
    align-items: center !important;
    justify-content: center !important;
    gap: .5rem !important;
    border-radius: .95rem !important;
    padding: 0 .9rem !important;
    font-size: .82rem !important;
    line-height: 1 !important;
    white-space: nowrap !important;
}
[data-sipandu-class-action-tools-v2="true"] {
    grid-column: 1 / -1 !important;
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: .6rem !important;
}
[data-sipandu-class-action-tools-v2="true"] [data-sipandu-join-inline] {
    display: inline-flex !important;
    height: 2.8rem !important;
    min-height: 2.8rem !important;
    min-width: 0 !important;
    flex: 1 1 auto !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: .95rem !important;
    padding: 0 .85rem !important;
    gap: .55rem !important;
    white-space: nowrap !important;
}
[data-sipandu-class-action-tools-v2="true"] [data-sipandu-code-edit],
[data-sipandu-class-action-tools-v2="true"] [data-sipandu-delete-class] {
    display: grid !important;
    width: 2.8rem !important;
    height: 2.8rem !important;
    min-width: 2.8rem !important;
    min-height: 2.8rem !important;
    flex: 0 0 2.8rem !important;
    place-items: center !important;
    border-radius: .95rem !important;
    padding: 0 !important;
    line-height: 1 !important;
}
[data-sipandu-class-action-tools-v2="true"] [data-sipandu-code-edit] {
    font-size: 0 !important;
}
[data-sipandu-class-action-tools-v2="true"] [data-sipandu-code-edit]::before {
    content: '✎';
    display: block;
    font: 800 .98rem/1 system-ui, sans-serif;
}
[data-sipandu-participant-panel-v2="true"] {
    margin-top: 1.4rem !important;
    border: 1px solid #edf1f7 !important;
    border-radius: 1.35rem !important;
    background: #f6f8fc !important;
    padding: 1.15rem !important;
}
[data-sipandu-participant-heading-v2="true"] {
    display: flex !important;
    min-height: 2.1rem !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 1rem !important;
}
[data-sipandu-participant-heading-v2="true"] h3 {
    font-size: .92rem !important;
    line-height: 1.2 !important;
}
[data-sipandu-participant-heading-v2="true"] span {
    display: inline-flex !important;
    height: 2rem !important;
    align-items: center !important;
    justify-content: center !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 999px !important;
    padding: 0 .8rem !important;
    line-height: 1 !important;
}
[data-sipandu-participant-add-v2="true"] {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    align-items: stretch !important;
    gap: .7rem !important;
    margin-top: .85rem !important;
}
[data-sipandu-participant-add-v2="true"] input,
[data-sipandu-participant-add-v2="true"] button {
    height: 3rem !important;
    min-height: 3rem !important;
    border-radius: 1rem !important;
    line-height: 1 !important;
}
[data-sipandu-participant-add-v2="true"] input {
    padding: 0 1rem !important;
    font-size: .9rem !important;
}
[data-sipandu-participant-add-v2="true"] button {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: .5rem !important;
    padding: 0 1rem !important;
    font-size: .86rem !important;
    white-space: nowrap !important;
}
[data-sipandu-participant-list-v2="true"] {
    margin-top: .8rem !important;
    max-height: 13rem !important;
    scrollbar-width: thin;
}
[data-sipandu-participant-row-v2="true"] {
    display: flex !important;
    min-height: 3.9rem !important;
    align-items: center !important;
    border: 1px solid #e8edf5 !important;
    border-radius: 1rem !important;
    padding: .65rem .8rem !important;
    box-shadow: 0 1px 2px rgba(15, 23, 42, .03) !important;
}
[data-sipandu-participant-row-v2="true"] > div:first-child {
    align-items: center !important;
    gap: .8rem !important;
}
[data-sipandu-participant-row-v2="true"] > button {
    display: grid !important;
    width: 2.35rem !important;
    height: 2.35rem !important;
    min-width: 2.35rem !important;
    place-items: center !important;
    border-radius: .78rem !important;
    padding: 0 !important;
}

@media (max-width: 1180px) {
    [data-sipandu-class-header-v2="true"] {
        grid-template-columns: minmax(0, 1fr) !important;
    }
    [data-sipandu-class-actions-v2="true"] {
        max-width: 34rem !important;
    }
    [data-sipandu-class-action-tools-v2="true"] {
        justify-content: flex-start !important;
    }
}

@media (max-width: 640px) {
    [data-sipandu-class-card-v2="true"] > div:nth-child(2) {
        padding: 1.05rem !important;
    }
    [data-sipandu-class-info-v2="true"] h2 {
        font-size: 1.12rem !important;
    }
    [data-sipandu-class-actions-v2="true"] {
        grid-template-columns: minmax(0, 1fr) !important;
    }
    [data-sipandu-class-action-tools-v2="true"] {
        flex-wrap: wrap !important;
    }
    [data-sipandu-class-action-tools-v2="true"] [data-sipandu-join-inline] {
        width: 100% !important;
        flex-basis: 100% !important;
    }
    [data-sipandu-participant-add-v2="true"] {
        grid-template-columns: minmax(0, 1fr) !important;
    }
    [data-sipandu-participant-add-v2="true"] button {
        width: 100% !important;
    }
}
</style>
<script id="sipandu-class-management-ui-v2-script">
(() => {
    if (window.__sipanduClassManagementUiV2) return;
    window.__sipanduClassManagementUiV2 = true;

    const basePath = (() => {
        const value = document.querySelector('meta[name="app-base-path"]')?.getAttribute('content')?.trim() || '';
        if (!value || value === '/') return '';
        return `/${value.replace(/^\/+|\/+$/g, '')}`;
    })();

    const appPath = (path) => {
        if (!path || !path.startsWith('/') || path.startsWith('//')) return path;
        if (basePath && (path === basePath || path.startsWith(`${basePath}/`))) return path;
        if (basePath && path.startsWith('/akademik/')) return path;
        return `${basePath}${path}` || path;
    };

    const normalizeLink = (link) => {
        const raw = link.getAttribute('href');
        if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return;
        if (!/^\/(kelas(?:\/|$)|pengguna(?:\/|$)|sso(?:\/|$))/.test(raw)) return;
        const next = appPath(raw);
        if (next !== raw) link.setAttribute('href', next);
    };

    const mark = () => {
        document.querySelectorAll('#app a[href]').forEach(normalizeLink);

        document.querySelectorAll('#app article').forEach((card) => {
            const participantHeading = Array.from(card.querySelectorAll('h3')).find((heading) => heading.textContent?.trim() === 'Peserta mahasiswa');
            if (!participantHeading) return;

            card.dataset.sipanduClassCardV2 = 'true';
            const body = card.children[1];
            if (!(body instanceof HTMLElement)) return;

            const header = Array.from(body.children).find((child) => child instanceof HTMLElement && child.querySelector('h2'));
            if (header instanceof HTMLElement) {
                header.dataset.sipanduClassHeaderV2 = 'true';
                const info = Array.from(header.children).find((child) => child instanceof HTMLElement && child.querySelector('h2'));
                if (info instanceof HTMLElement) info.dataset.sipanduClassInfoV2 = 'true';

                const actions = Array.from(header.children).find((child) => child instanceof HTMLElement && child.querySelectorAll('a[href]').length >= 2);
                if (actions instanceof HTMLElement) {
                    actions.dataset.sipanduClassActionsV2 = 'true';
                    const dynamicTools = Array.from(actions.children).filter((child) => child instanceof HTMLElement && (child.matches('[data-sipandu-join-inline]') || child.matches('[data-sipandu-code-edit]') || child.matches('[data-sipandu-delete-class]')));
                    if (dynamicTools.length) {
                        let toolRow = actions.querySelector('[data-sipandu-class-action-tools-v2="true"]');
                        if (!(toolRow instanceof HTMLElement)) {
                            toolRow = document.createElement('div');
                            toolRow.dataset.sipanduClassActionToolsV2 = 'true';
                            actions.appendChild(toolRow);
                        }
                        dynamicTools.forEach((tool) => toolRow.appendChild(tool));
                    }
                }
            }

            const panel = participantHeading.parentElement?.parentElement;
            if (!(panel instanceof HTMLElement)) return;
            panel.dataset.sipanduParticipantPanelV2 = 'true';
            participantHeading.parentElement?.setAttribute('data-sipandu-participant-heading-v2', 'true');

            const addRow = Array.from(panel.children).find((child) => child instanceof HTMLElement && child.querySelector('input[type="email"]'));
            if (addRow instanceof HTMLElement) addRow.dataset.sipanduParticipantAddV2 = 'true';

            const list = Array.from(panel.children).find((child) => child instanceof HTMLElement && child.classList.contains('overflow-auto'));
            if (list instanceof HTMLElement) {
                list.dataset.sipanduParticipantListV2 = 'true';
                Array.from(list.children).forEach((row) => {
                    if (row instanceof HTMLElement && row.querySelector('p')) row.dataset.sipanduParticipantRowV2 = 'true';
                });
            }
        });
    };

    let scheduled = false;
    const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            mark();
        });
    };

    document.addEventListener('click', (event) => {
        const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
        if (!(link instanceof HTMLAnchorElement)) return;
        const raw = link.getAttribute('href');
        if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return;
        if (!/^\/(kelas(?:\/|$)|pengguna(?:\/|$)|sso(?:\/|$))/.test(raw)) return;
        const next = appPath(raw);
        if (next !== raw) {
            event.preventDefault();
            window.location.assign(next);
        }
    }, true);

    mark();
    const root = document.getElementById('app');
    if (root) new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
})();
</script>
