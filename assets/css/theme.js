/*
 * Dark mode. Load in <head> (before the body) so the saved theme applies before first paint.
 * Dark is the default. A visitor's saved choice (via the toggle) overrides it.
 */
(function () {
    var KEY = 'aggregate-theme';
    var root = document.documentElement;

    function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
    function current() { return saved() || 'dark'; }

    function apply(theme) {
        root.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-toggle').forEach(function (b) {
            b.textContent = theme === 'dark' ? 'light mode' : 'dark mode';
            b.setAttribute('aria-pressed', theme === 'dark');
        });
    }

    apply(current());

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
