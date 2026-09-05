var e=`sipandu-header-utilities-style`;if(!document.getElementById(e)){let t=document.createElement(`style`);t.id=e,t.textContent=`
        #pwa-controls-root,
        #sipandu-class-access-root {
            display: flex;
            flex: 0 0 auto;
            align-items: center;
        }

        #pwa-controls-root > button {
            position: static !important;
            top: auto !important;
            left: auto !important;
        }

        #sipandu-class-access-root > button {
            position: static !important;
            inset: auto !important;
            width: 2.5rem !important;
            height: 2.5rem !important;
            padding: 0 !important;
            gap: 0 !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 1rem !important;
            background: var(--sipandu-card) !important;
            color: var(--sipandu-muted) !important;
            box-shadow: 0 1px 2px rgb(15 23 42 / 6%) !important;
            transform: none !important;
        }

        #sipandu-class-access-root > button:hover {
            border-color: #bfdbfe !important;
            background: var(--sipandu-brand-50) !important;
            color: var(--sipandu-brand-700) !important;
        }

        #sipandu-class-access-root > button > span {
            display: none !important;
        }

        @media (max-width: 639px) {
            #pwa-controls-root > button,
            #calendar-panel-root > button,
            #sipandu-class-access-root > button {
                width: 2.25rem !important;
                height: 2.25rem !important;
                border-radius: 0.85rem !important;
            }
        }
    `,document.head.appendChild(t)}function t(){let e=document.querySelector(`button[aria-label="Notifikasi"]`)?.parentElement,t=e?.parentElement,n=document.getElementById(`pwa-controls-root`),r=document.getElementById(`calendar-panel-root`),i=document.getElementById(`sipandu-class-access-root`);if(!e||!t){n&&(n.style.display=`none`),i&&(i.style.display=`none`);return}if(n&&(n.style.removeProperty(`display`),(n.parentElement!==t||n.nextElementSibling!==e)&&t.insertBefore(n,e)),i){i.style.removeProperty(`display`);let n=r?.parentElement===t?r:e;(i.parentElement!==t||i.previousElementSibling!==n)&&n.insertAdjacentElement(`afterend`,i)}}t(),new MutationObserver(t).observe(document.body,{childList:!0,subtree:!0}),window.addEventListener(`resize`,t),window.addEventListener(`focus`,t);