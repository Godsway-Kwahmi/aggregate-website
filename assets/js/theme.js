/*
 * Dark mode. Load in <head> (before the body) so the saved theme applies before first paint.
 * Uses the visitor's saved choice, otherwise their system setting.
 */
(function () {
    var KEY = 'aggregate-theme';
    var root = document.documentElement;
    var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
    function current() { return saved() || (media && media.matches ? 'dark' : 'light'); }

    function apply(theme) {
        root.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-toggle').forEach(function (b) {
            b.textContent = theme === 'dark' ? 'light mode' : 'dark mode';
            b.setAttribute('aria-pressed', theme === 'dark');
        });
    }

    apply(current());

    if (media && media.addEventListener) {
        media.addEventListener('change', function () { if (!saved()) apply(current()); });
    }

    document.addEventListener('DOMContentLoaded', function () {
        // One toggle in the menu overlay (every page) and one in the home page sidebar
        document.querySelectorAll('#mobileMenu, .nav-links').forEach(function (host) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'theme-toggle';
            b.addEventListener('click', function () {
                var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                try { localStorage.setItem(KEY, next); } catch (e) {}
                apply(next);
            });
            host.appendChild(b);
        });
        apply(current());
    });
})();
