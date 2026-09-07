(function () {
    'use strict';

    var payload = null;
    var queued = false;

    function basePath() {
        return String(window.__SIPANDU_BASE_PATH__ || '').replace(/\/+$/, '');
    }

    function apiUrl(path) {
        return basePath() + (path.charAt(0) === '/' ? path : '/' + path);
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char];
        });
    }

    function icon(name) {
        var paths = {
            class: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
            chart: '<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/>',
            people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
            check: '<path d="M9 11l3 3L22 4"/><path d="M21 12a9 9 0 1 1-5.3-8.2"/>'
        };
        return '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths[name] + '</svg>';
    }

    function action(url, label, primary) {
        return '<a class="sdi-action' + (primary ? ' is-primary' : '') + '" href="' + escapeHtml(apiUrl(url)) + '">' +
            escapeHtml(label) + '<span aria-hidden="true">→</span></a>';
    }

    function lecturerCard(item, index) {
        return '<article class="sdi-class-card">' +
            '<div class="sdi-rank">' + (index === 0 ? 'Paling aktif' : 'Kelas') + '</div>' +
            '<h3>' + escapeHtml(item.class_name) + '</h3>' +
            '<div class="sdi-metrics">' +
                '<div><strong>' + Number(item.interactions || 0) + '</strong><span>Aktivitas tercatat</span></div>' +
                '<div><strong>' + Number(item.ungraded || 0) + '</strong><span>Belum dinilai</span></div>' +
                '<div><strong>' + Number(item.students || 0) + '</strong><span>Mahasiswa</span></div>' +
            '</div>' +
            '<div class="sdi-actions">' + action(item.class_url, 'Buka kelas', true) + action(item.journal_url, 'Rekap', false) + '</div>' +
        '</article>';
    }

    function studentCard(item) {
        var remaining = Number(item.remaining_materials || 0) + Number(item.remaining_assignments || 0);
        return '<article class="sdi-class-card is-student">' +
            '<div class="sdi-progress-head"><span>Progres kelas</span><strong>' + Number(item.overall_percent || 0) + '%</strong></div>' +
            '<div class="sdi-progress"><i style="width:' + Math.max(0, Math.min(100, Number(item.overall_percent || 0))) + '%"></i></div>' +
            '<h3>' + escapeHtml(item.class_name) + '</h3>' +
            '<p>' + (remaining ? remaining + ' aktivitas masih perlu diselesaikan' : 'Semua aktivitas yang tersedia sudah selesai') + '</p>' +
            '<div class="sdi-actions">' + action(item.class_url, 'Lanjutkan', true) + '</div>' +
        '</article>';
    }

    function findTarget() {
        return Array.from(document.querySelectorAll('h2')).map(function (heading) {
            return { heading: heading, text: String(heading.textContent || '').trim().toLowerCase() };
        }).filter(function (item) {
            return item.text === 'kelas terbaru';
        }).map(function (item) {
            return item.heading.closest('section');
        })[0] || null;
    }

    function render() {
        queued = false;
        if (!payload || !payload.insights) return;
        var insight = payload.insights;
        if (insight.role !== 'lecturer' && insight.role !== 'student') return;
        var section = findTarget();
        if (!section || section.dataset.sipanduInsights === 'true') return;
        var classes = Array.isArray(insight.classes) ? insight.classes : [];
        var summary = insight.summary || {};
        var summaryHtml = insight.role === 'lecturer'
            ? '<div class="sdi-summary">' +
                '<div>' + icon('chart') + '<span><strong>' + Number(summary.interactions || 0) + '</strong>Aktivitas tercatat</span></div>' +
                '<div>' + icon('check') + '<span><strong>' + Number(summary.ungraded || 0) + '</strong>Perlu dinilai</span></div>' +
                '<div>' + icon('people') + '<span><strong>' + Number(summary.students || 0) + '</strong>Peserta aktif</span></div>' +
              '</div>'
            : '<div class="sdi-overall"><span>Progres keseluruhan</span><strong>' + Number(insight.overall_percent || 0) + '%</strong></div>';
        var cards = classes.map(function (item, index) {
            return insight.role === 'lecturer' ? lecturerCard(item, index) : studentCard(item);
        }).join('');
        section.dataset.sipanduInsights = 'true';
        section.className = 'sdi-section';
        section.innerHTML = '<div class="sdi-heading"><div><span class="sdi-kicker">' +
            (insight.role === 'lecturer' ? 'PUSAT KENDALI DOSEN' : 'PRIORITAS BELAJAR') +
            '</span><h2>' + escapeHtml(insight.title) + '</h2><p>' + escapeHtml(insight.description) +
            '</p></div>' + summaryHtml + '</div><div class="sdi-grid">' +
            (cards || '<div class="sdi-empty">' + icon('class') + '<strong>Belum ada kelas untuk diringkas</strong><span>Daftar kelas akan tampil setelah tersedia.</span></div>') +
            '</div>';
    }

    function schedule() {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(render);
    }

    function addStyle() {
        if (document.getElementById('sipandu-dashboard-insights-style')) return;
        var style = document.createElement('style');
        style.id = 'sipandu-dashboard-insights-style';
        style.textContent = `
.sdi-section{margin-top:28px;border:1px solid #dbe5f3;border-radius:28px;background:#fff;padding:28px;box-shadow:0 14px 38px rgba(15,42,91,.06)}
.sdi-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:22px}
.sdi-kicker{display:block;color:#145dff;font-size:12px;font-weight:800;letter-spacing:.16em;margin-bottom:7px}
.sdi-heading h2{margin:0;color:#0b1739;font-size:clamp(24px,2vw,32px);line-height:1.15}
.sdi-heading p{margin:7px 0 0;color:#60708f;font-size:15px}
.sdi-summary{display:flex;gap:10px}
.sdi-summary>div{min-width:132px;display:flex;align-items:center;gap:10px;padding:11px 13px;background:#f6f9fe;border:1px solid #e4ebf5;border-radius:15px;color:#145dff}
.sdi-summary svg,.sdi-empty svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8}
.sdi-summary span{color:#6b7892;font-size:11px;line-height:1.25}.sdi-summary strong{display:block;color:#101a35;font-size:18px}
.sdi-overall{min-width:180px;padding:12px 16px;border-radius:16px;background:#edf4ff;color:#64748b;font-size:12px}
.sdi-overall strong{display:block;color:#145dff;font-size:25px;margin-top:2px}
.sdi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.sdi-class-card{position:relative;min-width:0;padding:20px;border:1px solid #dfe7f2;border-radius:20px;background:linear-gradient(145deg,#fff,#fbfdff)}
.sdi-rank{display:inline-flex;padding:5px 9px;border-radius:99px;background:#edf4ff;color:#145dff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
.sdi-class-card h3{margin:13px 0 15px;color:#10182f;font-size:18px;line-height:1.3;white-space:normal;overflow-wrap:anywhere}
.sdi-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 0;border-top:1px solid #edf1f7;border-bottom:1px solid #edf1f7}
.sdi-metrics div{min-width:0}.sdi-metrics strong{display:block;color:#0f1d41;font-size:20px}.sdi-metrics span{display:block;color:#72809a;font-size:11px;line-height:1.25}
.sdi-actions{display:flex;gap:9px;margin-top:15px}.sdi-action{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;border:1px solid #cfe0ff;border-radius:13px;color:#145dff;font-size:13px;font-weight:750;text-decoration:none}.sdi-action.is-primary{background:#145dff;border-color:#145dff;color:#fff;box-shadow:0 7px 15px rgba(20,93,255,.18)}
.sdi-progress-head{display:flex;justify-content:space-between;color:#63718d;font-size:12px}.sdi-progress-head strong{color:#145dff;font-size:18px}
.sdi-progress{height:8px;margin:8px 0 17px;border-radius:99px;background:#e8effa;overflow:hidden}.sdi-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#145dff,#55a0ff)}
.sdi-class-card.is-student p{margin:-7px 0 0;color:#64748b;font-size:13px}
.sdi-empty{grid-column:1/-1;min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;border:1px dashed #cbd8ea;border-radius:20px;color:#8290a8}.sdi-empty strong{color:#24304a}
@media(max-width:900px){.sdi-heading{align-items:flex-start;flex-direction:column}.sdi-summary{width:100%;overflow-x:auto}.sdi-summary>div{min-width:125px}.sdi-grid{grid-template-columns:1fr}}
@media(max-width:560px){.sdi-section{padding:20px;border-radius:22px}.sdi-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.sdi-summary>div{min-width:0;display:block;padding:10px}.sdi-summary svg{margin-bottom:5px}.sdi-metrics span{font-size:10px}.sdi-actions{width:100%}.sdi-action{flex:1}}
`;
        document.head.appendChild(style);
    }

    function load() {
        fetch(apiUrl('/sipandu-api/dashboard'), { credentials: 'same-origin', headers: { Accept: 'application/json' } })
            .then(function (response) {
                if (!response.ok) throw new Error('Dashboard tidak dapat dimuat.');
                return response.json();
            })
            .then(function (data) { payload = data; schedule(); })
            .catch(function () {});
    }

    function boot() {
        addStyle();
        var root = document.getElementById('app') || document.body;
        new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
        load();
        window.addEventListener('focus', load);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
}());
