/* ============================================================
   ABOUT DIALOG
   Tab switcher and download listing for the "Despre Legacy IDE"
   dialog. The tab bar toggles between the in-character Oficial
   page and the Despre proiect page. The download list lets the
   user pull individual source files or the whole project as a
   zip; downloads use fetch() and fall back gracefully to a
   GitLab notice when the page is opened from file://.
   ============================================================ */

(function() {
    // Files the download list offers when the page is served over HTTP.
    // Keep this list narrow to only what a reader would plausibly want
    // for archival; the full project is always available as a single
    // zip from the GitLab release page.
    var DOWNLOADABLE_FILES = [
        'index.html',
        'js/core/state.js',
        'js/core/init.js',
        'js/core/smoke.js',
        'js/core/utils.js',
        'js/editor/editor.js',
        'js/editor/highlight.js',
        'js/editor/lint.js',
        'js/editor/run.js',
        'js/editor/tabs.js',
        'js/editor/tree.js',
        'js/debugger/backend.js',
        'js/debugger/controls.js',
        'js/debugger/debugger.js',
        'js/debugger/docs.js',
        'js/debugger/vm.js',
        'js/ui/dialogs.js',
        'js/ui/dragdrop.js',
        'js/ui/layout.js',
        'js/ui/menus.js',
        'js/ui/osbanner.js',
        'js/ui/preferences.js',
        'js/ui/prompts.js',
        'js/ui/theme.js',
        'js/ui/about.js',
        'js/menu.js',
        'js/qnx/qnx.js',
        'js/shell/reverse-shell.js',
        'css/base.css',
        'css/debugger.css',
        'css/dialogs.css',
        'css/editor.css',
        'css/fonts.css',
        'css/menu.css',
        'css/qnx.css',
        'README.md'
    ];

    var RELEASES_URL = 'https://gitlab.com/window-ops-web/legacy-ide-2001/-/releases';
    var REPO_URL = 'https://gitlab.com/window-ops-web/legacy-ide-2001';

    function bindAboutTabs() {
        var tabs = Array.prototype.slice.call(document.querySelectorAll('#aboutBackdrop .about-switch-btn'));
        var pages = Array.prototype.slice.call(document.querySelectorAll('#aboutBackdrop .about-page'));
        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                var target = tab.getAttribute('data-about-tab');
                tabs.forEach(function(t) {
                    var on = t === tab;
                    t.classList.toggle('active', on);
                    t.setAttribute('aria-selected', on ? 'true' : 'false');
                });
                pages.forEach(function(p) {
                    p.classList.toggle('active', p.getAttribute('data-about-page') === target);
                });
            });
        });
    }

    // Render the downloads section. Over HTTP, each file becomes a
    // button that fetches and saves it. Over file://, fetches are
    // blocked by every major browser for sibling files, so we show
    // a GitLab notice instead of buttons that won't work.
    function renderDownloads() {
        var wrap = document.getElementById('aboutDownloads');
        if (!wrap || wrap._rendered) return;
        wrap._rendered = true;
        wrap.innerHTML = '';

        var isFile = location.protocol === 'file:';

        var notice = document.createElement('div');
        notice.className = 'about-download-notice';
        if (isFile) {
            notice.textContent = 'Descărcările individuale din IDE funcționează doar când pagina este servită pe HTTP. Pentru arhiva completă, deschideți pagina de lansări.';
            wrap.appendChild(notice);

            var row = document.createElement('div');
            row.className = 'about-row';
            var key = document.createElement('span');
            key.className = 'about-row-key';
            key.textContent = 'GitLab';
            var val = document.createElement('a');
            val.className = 'about-row-val about-row-link';
            val.target = '_blank';
            val.rel = 'noopener noreferrer';
            val.href = RELEASES_URL;
            val.textContent = 'Pagina de lansări';
            row.appendChild(key);
            row.appendChild(val);
            wrap.appendChild(row);
            return;
        }

        notice.textContent = 'Fiecare fișier poate fi descărcat individual pentru arhivare.';
        wrap.appendChild(notice);

        DOWNLOADABLE_FILES.forEach(function(path) {
            var row = document.createElement('div');
            row.className = 'about-row';
            var name = document.createElement('span');
            name.className = 'about-file-name';
            name.textContent = path;
            var btn = document.createElement('button');
            btn.className = 'about-file-btn';
            btn.textContent = 'Descarcă';
            btn.addEventListener('click', function() { downloadFile(path, btn); });
            row.appendChild(name);
            row.appendChild(btn);
            wrap.appendChild(row);
        });
    }

    function downloadFile(path, btn) {
        btn.disabled = true;
        var originalText = btn.textContent;
        btn.textContent = '...';
        fetch(path, { cache: 'no-store' })
            .then(function(resp) {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.blob();
            })
            .then(function(blob) {
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = path.split('/').pop();
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                // Release the object URL a moment later so the download can start.
                setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
                btn.textContent = originalText;
                btn.disabled = false;
            })
            .catch(function(err) {
                btn.textContent = 'Eroare';
                setTimeout(function() {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 1800);
            });
    }

    bindAboutTabs();
})();
