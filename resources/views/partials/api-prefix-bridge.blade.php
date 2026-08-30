@php
    $requestBasePath = trim((string) request()->getBaseUrl());
    $configuredBasePath = trim((string) config('sipandu.base_path', ''));
    $sipanduBasePath = $requestBasePath !== '' ? $requestBasePath : $configuredBasePath;
    $sipanduBasePath = $sipanduBasePath === '/' ? '' : '/'.trim($sipanduBasePath, '/');
@endphp
<meta name="app-base-path" content="{{ $sipanduBasePath }}">
<script>
    (() => {
        const basePath = @json($sipanduBasePath);
        const nativeFetch = window.fetch.bind(window);

        const appPath = (value) => {
            if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
                return value;
            }

            if (basePath && (value === basePath || value.startsWith(`${basePath}/`))) {
                return value;
            }

            let path = value;
            if (path.startsWith('/api/')) {
                path = `/sipandu-api/${path.slice('/api/'.length)}`;
            }

            return `${basePath}${path}` || path;
        };

        window.__SIPANDU_BASE_PATH__ = basePath;
        window.sipanduUrl = appPath;

        window.fetch = (input, init) => {
            if (typeof input === 'string') {
                input = appPath(input);
            } else if (input instanceof URL && input.origin === window.location.origin) {
                const nextPath = appPath(input.pathname);
                if (nextPath !== input.pathname) {
                    input = new URL(`${nextPath}${input.search}${input.hash}`, window.location.origin);
                }
            } else if (input instanceof Request) {
                const requestUrl = new URL(input.url);
                if (requestUrl.origin === window.location.origin) {
                    const nextPath = appPath(requestUrl.pathname);
                    if (nextPath !== requestUrl.pathname) {
                        requestUrl.pathname = nextPath;
                        input = new Request(requestUrl.toString(), input);
                    }
                }
            }

            return nativeFetch(input, init);
        };

        const rewriteElement = (element) => {
            if (!(element instanceof Element)) return;

            const rewriteAttribute = (name) => {
                const value = element.getAttribute(name);
                if (!value || !value.startsWith('/') || value.startsWith('//')) return;
                const next = appPath(value);
                if (next !== value) element.setAttribute(name, next);
            };

            if (element.matches('a[href]')) rewriteAttribute('href');
            if (element.matches('form[action]')) rewriteAttribute('action');

            element.querySelectorAll?.('a[href], form[action]').forEach((child) => {
                if (child.matches('a[href]')) {
                    const href = child.getAttribute('href');
                    if (href?.startsWith('/') && !href.startsWith('//')) child.setAttribute('href', appPath(href));
                }
                if (child.matches('form[action]')) {
                    const action = child.getAttribute('action');
                    if (action?.startsWith('/') && !action.startsWith('//')) child.setAttribute('action', appPath(action));
                }
            });
        };

        const startObserver = () => {
            rewriteElement(document.documentElement);
            const observer = new MutationObserver((records) => {
                for (const record of records) {
                    if (record.type === 'attributes') {
                        rewriteElement(record.target);
                        continue;
                    }
                    record.addedNodes.forEach((node) => rewriteElement(node));
                }
            });
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['href', 'action'],
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserver, { once: true });
        } else {
            startObserver();
        }
    })();
</script>
