<script>
    (() => {
        const nativeFetch = window.fetch.bind(window);

        window.fetch = (input, init) => {
            if (typeof input === 'string' && input.startsWith('/api/')) {
                input = `/sipandu-api/${input.slice('/api/'.length)}`;
            }

            return nativeFetch(input, init);
        };
    })();
</script>
