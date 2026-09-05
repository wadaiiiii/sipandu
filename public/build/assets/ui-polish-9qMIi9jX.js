function e(){if(document.getElementById(`sipandu-ui-polish`))return;let e=document.createElement(`style`);e.id=`sipandu-ui-polish`,e.textContent=`
        html, body { width: 100%; max-width: 100%; overflow-x: hidden; }
        *, *::before, *::after { box-sizing: border-box; }
        body[data-sipandu-layout] #app,
        body[data-sipandu-layout] main,
        body[data-sipandu-layout] section,
        body[data-sipandu-layout] article,
        body[data-sipandu-layout] header,
        body[data-sipandu-layout] aside,
        body[data-sipandu-layout] div { min-width: 0; }
        body[data-sipandu-layout] img,
        body[data-sipandu-layout] video,
        body[data-sipandu-layout] canvas { max-width: 100%; height: auto; }
        body[data-sipandu-layout] input,
        body[data-sipandu-layout] select,
        body[data-sipandu-layout] textarea,
        body[data-sipandu-layout] button { max-width: 100%; min-width: 0; }
        body[data-sipandu-layout] button,
        body[data-sipandu-layout] a { touch-action: manipulation; }
        [data-sipandu-overflow-guard="true"] { overflow-x: auto !important; overscroll-behavior-x: contain; }
        [data-sipandu-dashboard-header-inner="true"],
        [data-sipandu-dashboard-content="true"] { width: min(100%, 1500px); margin-inline: auto; }
        [data-sipandu-dashboard-content="true"] { min-height: calc(100dvh - 5rem); }
        [data-sipandu-login-identifier="true"] { text-transform: none; }
        [data-sipandu-login-hint="true"] { max-width: 34rem; }

        @media (max-width: 1023px) {
            [data-sipandu-login-shell="true"] {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) !important;
                min-height: 100dvh !important;
                align-content: start;
            }
            [data-sipandu-login-hero="true"] {
                min-height: auto !important;
                padding: 1.5rem !important;
            }
            [data-sipandu-login-hero="true"] > div:not([class*="absolute"]):first-of-type > div:nth-child(2) {
                margin-top: 2rem !important;
                max-width: 44rem;
            }
            [data-sipandu-login-hero="true"] h1 {
                max-width: 38rem !important;
                font-size: clamp(1.9rem, 6vw, 2.8rem) !important;
                line-height: 1.08 !important;
            }
            [data-sipandu-login-hero="true"] h1 + p { margin-top: 1rem !important; }
            [data-sipandu-login-hero="true"] > div:last-child { display: none !important; }
            [data-sipandu-login-form-wrap="true"] {
                align-items: flex-start !important;
                padding: 2rem 1.5rem 2.5rem !important;
            }
            [data-sipandu-dashboard-header-inner="true"],
            [data-sipandu-dashboard-content="true"] { width: 100%; }
        }

        @media (max-width: 767px) {
            body[data-sipandu-layout] input,
            body[data-sipandu-layout] select,
            body[data-sipandu-layout] textarea { font-size: 16px !important; }
            [data-sipandu-dashboard-content="true"] { padding-inline: 1rem !important; padding-top: 1.25rem !important; }
            [data-sipandu-dashboard-header-inner="true"] { padding-inline: 1rem !important; }
            [data-sipandu-login-form-wrap="true"] { padding-inline: 1rem !important; }
        }

        @media (max-height: 620px) and (min-width: 640px) {
            [data-sipandu-login-hero="true"] { padding-block: 1.25rem !important; }
            [data-sipandu-login-hero="true"] > div:not([class*="absolute"]):first-of-type > div:nth-child(2) { margin-top: 1.25rem !important; }
            [data-sipandu-login-form-wrap="true"] { padding-block: 1.5rem !important; }
        }
    `,document.head.appendChild(e)}function t(e,t){let n=Array.from(e.childNodes).find(e=>e.nodeType===Node.TEXT_NODE);if(n){n.textContent=t;return}e.insertBefore(document.createTextNode(t),e.firstChild)}function n(){let e=Array.from(document.querySelectorAll(`h2`)).find(e=>e.textContent?.trim()===`Masuk ke SiPANDU`),n=e?.closest(`form`);if(!n)return;n.dataset.sipanduLoginForm=`true`;let r=n.closest(`main`)?.firstElementChild;r&&(r.dataset.sipanduLoginShell=`true`);let i=n.parentElement;i&&(i.dataset.sipanduLoginFormWrap=`true`);let a=r?.firstElementChild;a&&a!==i&&(a.dataset.sipanduLoginHero=`true`);let o=n.querySelector(`input[type="email"], input[data-sipandu-login-identifier]`);if(o){o.dataset.sipanduLoginIdentifier=`true`,o.type=`text`,o.autocomplete=`username`,o.inputMode=`text`,o.placeholder=`D0223123 atau nama@unsulbar.ac.id`,o.setAttribute(`aria-label`,`NIM atau email`);let e=o.closest(`label`);if(e&&(t(e,`NIM / Email`),!e.querySelector(`[data-sipandu-login-hint]`))){let t=document.createElement(`span`);t.dataset.sipanduLoginHint=`true`,t.className=`mt-2 block text-xs font-normal leading-5 text-slate-400`,t.textContent=`Mahasiswa dapat menggunakan NIM. Dosen dan pengelola dapat menggunakan email.`,e.appendChild(t)}}let s=n.querySelector(`input[type="password"]`);s&&(s.autocomplete=`current-password`,s.placeholder=`Masukkan kata sandi`);let c=e?.nextElementSibling;c&&!c.dataset.sipanduLoginDescription&&(c.dataset.sipanduLoginDescription=`true`,c.textContent=`Masuk menggunakan NIM atau email yang telah terdaftar.`)}function r(){let e=document.querySelector(`body[data-sipandu-layout="dashboard"] #app main`);if(!e)return;let t=Array.from(e.children).find(e=>e.querySelector(`header`)),n=t?.querySelector(`:scope > header`),r=n?.nextElementSibling,i=n?.firstElementChild;t&&(t.dataset.sipanduDashboardShell=`true`),n&&(n.dataset.sipanduDashboardHeader=`true`),i&&(i.dataset.sipanduDashboardHeaderInner=`true`),r&&(r.dataset.sipanduDashboardContent=`true`),document.querySelectorAll(`article, section`).forEach(e=>{e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX===`visible`&&(e.dataset.sipanduOverflowGuard=`true`)})}var i=!1,a=()=>{i||(i=!0,window.requestAnimationFrame(()=>{i=!1,e(),n(),r()}))};a(),window.addEventListener(`resize`,a,{passive:!0}),window.addEventListener(`sipandu:dashboard-ready`,a),new MutationObserver(a).observe(document.body,{childList:!0,subtree:!0});