@php
    $requestBasePath = trim((string) request()->getBaseUrl(), '/');
    $configuredBasePath = trim((string) config('sipandu.base_path', ''), '/');

    $sipanduBasePath = $requestBasePath !== ''
        ? $requestBasePath
        : $configuredBasePath;

    $sipanduBasePath = $sipanduBasePath !== ''
        ? '/'.$sipanduBasePath
        : '';
@endphp

<meta name="app-base-path" content="{{ $sipanduBasePath }}">
<script>
    (() => {
        const basePath = @json($sipanduBasePath);
        const nativeFetch = window.fetch.bind(window);

        const normalizeMalformedApiUrl = (value) => {
            if (typeof value !== 'string') return value;

            // Some previously built bundles can emit protocol-relative or
            // absolute URLs such as //sipandu-api/bootstrap. The browser
            // interprets sipandu-api as a hostname, causing ERR_NAME_NOT_RESOLVED.
            if (value.startsWith('//sipandu-api/')) {
                return value.slice(1);
            }

            if (value.startsWith('http://sipandu-api/') || value.startsWith('https://sipandu-api/')) {
                try {
                    const url = new URL(value);
                    return `${url.pathname}${url.search}${url.hash}`;
                } catch {
                    return value;
                }
            }

            return value;
        };

        const appPath = (value) => {
            value = normalizeMalformedApiUrl(value);

            if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
                return value;
            }

            if (basePath && (value === basePath || value.startsWith(`${basePath}/`))) {
                return value;
            }

            // Aplikasi akademik lain berada sejajar dengan SiPANDU.
            // Jangan ubah /akademik/simatrps, /akademik/simetri, dan sibling lainnya.
            if (basePath && value.startsWith('/akademik/')) {
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
            } else if (input instanceof URL) {
                if (input.hostname === 'sipandu-api') {
                    const nextPath = appPath(input.pathname);
                    input = new URL(`${nextPath}${input.search}${input.hash}`, window.location.origin);
                } else if (input.origin === window.location.origin) {
                    const nextPath = appPath(input.pathname);
                    if (nextPath !== input.pathname) {
                        input = new URL(`${nextPath}${input.search}${input.hash}`, window.location.origin);
                    }
                }
            } else if (input instanceof Request) {
                const requestUrl = new URL(input.url);
                if (requestUrl.hostname === 'sipandu-api') {
                    const nextPath = appPath(requestUrl.pathname);
                    requestUrl.pathname = nextPath;
                    requestUrl.hostname = window.location.hostname;
                    requestUrl.protocol = window.location.protocol;
                    requestUrl.port = window.location.port;
                    input = new Request(requestUrl.toString(), input);
                } else if (requestUrl.origin === window.location.origin) {
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

            const rewrite = (target, name) => {
                const value = target.getAttribute(name);
                if (!value) return;
                const next = appPath(value);
                if (next !== value) target.setAttribute(name, next);
            };

            if (element.matches('a[href]')) rewrite(element, 'href');
            if (element.matches('form[action]')) rewrite(element, 'action');

            element.querySelectorAll?.('a[href], form[action]').forEach((child) => {
                if (child.matches('a[href]')) rewrite(child, 'href');
                if (child.matches('form[action]')) rewrite(child, 'action');
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
