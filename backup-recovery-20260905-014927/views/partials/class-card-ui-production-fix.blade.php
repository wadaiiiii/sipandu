<style id="sipandu-class-card-ui-production-fix">
/* Production layout: keep class identity full-width and place actions below it. */
[data-sipandu-class-header-v2="true"] {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    align-items: start !important;
    gap: 1.05rem !important;
}

[data-sipandu-class-info-v2="true"] {
    width: 100% !important;
    min-width: 0 !important;
}

[data-sipandu-class-info-v2="true"] h2 {
    max-width: none !important;
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: normal !important;
    overflow-wrap: anywhere !important;
}

[data-sipandu-class-actions-v2="true"] {
    width: 100% !important;
    max-width: none !important;
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, max-content)) !important;
    justify-content: start !important;
    align-items: center !important;
    gap: .6rem !important;
    padding-top: .9rem !important;
    border-top: 1px solid #edf1f7 !important;
}

[data-sipandu-class-actions-v2="true"] > a {
    width: auto !important;
    min-width: 10.75rem !important;
}

[data-sipandu-class-action-tools-v2="true"] {
    grid-column: 1 / -1 !important;
    width: 100% !important;
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: .6rem !important;
}

[data-sipandu-class-action-tools-v2="true"] [data-sipandu-join-inline] {
    flex: 0 1 auto !important;
    width: auto !important;
    min-width: 10rem !important;
    max-width: 100% !important;
}

@media (max-width: 720px) {
    [data-sipandu-class-actions-v2="true"] {
        grid-template-columns: minmax(0, 1fr) !important;
    }

    [data-sipandu-class-actions-v2="true"] > a {
        width: 100% !important;
        min-width: 0 !important;
    }

    [data-sipandu-class-action-tools-v2="true"] [data-sipandu-join-inline] {
        flex: 1 1 100% !important;
        width: 100% !important;
        min-width: 0 !important;
    }
}
</style>
