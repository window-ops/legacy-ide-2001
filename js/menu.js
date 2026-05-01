(function() {
    'use strict';

    function openPopoverUnderButton(popover, button, prefWidth) {
        if (!popover || !button) return;
        var gap = 6;
        var pad = 8;
        var rect = button.getBoundingClientRect();

        popover.style.visibility = 'hidden';
        popover.classList.add('open');
        var h = Math.max(120, popover.offsetHeight || 120);
        popover.classList.remove('open');
        popover.style.visibility = '';

        // Pin to the right edge with a fixed 5 px gutter, the way real
        // app menus anchor under their hamburger / overflow button. We
        // clear left so the right anchor is what the browser uses.
        var top = rect.bottom + gap;
        if (top + h > window.innerHeight - pad) top = window.innerHeight - h - pad;
        top = Math.max(pad, top);

        popover.style.left = '';
        popover.style.right = '5px';
        popover.style.top = top + 'px';
        popover.classList.add('open');
    }

    function closeMainMenu() {
        $('mainMenu').classList.remove('open');
    }

    $('btnMenu').addEventListener('click', function(e) {
        e.stopPropagation();
        var menu = $('mainMenu');
        if (menu.classList.contains('open')) {
            closeMainMenu();
            return;
        }
        openPopoverUnderButton(menu, this, 248);
        var first = menu.querySelector('.popover-item');
        if (first) first.focus();
    });

    document.querySelectorAll('#mainMenu .popover-item').forEach(function(el) {
        el.addEventListener('click', function() {
            closeMainMenu();
            var act = this.getAttribute('data-action');
            if (act === 'run') runCode();
            else if (act === 'clear') {
                $('output').innerHTML = '<span class="empty">&gt; Consola a fost curățată.</span>';
                $('outputStatus').textContent = '';
                switchOutputTab('console');
            } else if (act === 'curriculum') {
                if (typeof renderCurriculumDialog === 'function') renderCurriculumDialog();
                openDialog('curriculumBackdrop');
            }
            else if (act === 'prefs') openDialog('prefsBackdrop');
            else if (act === 'debugger') openDebugger();
            else if (act === 'about') openDialog('aboutBackdrop');
            else if (act === 'download-project') downloadProjectZip();
        });
    });

    document.addEventListener('keydown', function(e) {
        var menu = $('mainMenu');
        if (!menu.classList.contains('open')) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeMainMenu();
            $('btnMenu').focus();
            return;
        }
        var items = Array.prototype.slice.call(menu.querySelectorAll('.popover-item'));
        if (!items.length) return;
        var idx = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            items[(idx + 1 + items.length) % items.length].focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            items[(idx - 1 + items.length) % items.length].focus();
        } else if (e.key === 'Enter' && idx >= 0) {
            e.preventDefault();
            items[idx].click();
        }
    });
})();
