(function () {
    'use strict';

    var logoUrl = 'https://akademik.unsulbar.ac.id/images/logo-unsulbar.png';
    var queued = false;

    function normalized(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function syncBrand() {
        queued = false;
        document.querySelectorAll('p').forEach(function (name) {
            if (normalized(name.textContent) !== 'SiPANDU') return;
            var brand = name.parentElement && name.parentElement.parentElement;
            if (!brand || brand.querySelector('img[data-sipandu-unsulbar-logo]')) return;
            var iconBox = brand.firstElementChild;
            if (!(iconBox instanceof HTMLElement) || iconBox === name.parentElement) return;
            iconBox.innerHTML = '';
            iconBox.style.padding = '6px';
            iconBox.style.background = '#ffffff';
            var image = document.createElement('img');
            image.src = logoUrl;
            image.alt = 'Logo Universitas Sulawesi Barat';
            image.setAttribute('data-sipandu-unsulbar-logo', 'true');
            image.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain';
            iconBox.appendChild(image);
        });
    }

    function schedule() {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(syncBrand);
    }

    function boot() {
        var root = document.getElementById('app') || document.body;
        new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
        schedule();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
}());
