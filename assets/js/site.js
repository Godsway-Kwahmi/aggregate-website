(function () {
    var btn = document.getElementById('hamburgerToggle');
    var menu = document.getElementById('mobileMenu');
    if (!btn || !menu) return;

    function setOpen(open) {
        btn.classList.toggle('active', open);
        menu.classList.toggle('active', open);
        btn.setAttribute('aria-expanded', open);
        document.body.style.overflow = open ? 'hidden' : '';
    }

    btn.addEventListener('click', function () { setOpen(!menu.classList.contains('active')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });

    var page = location.pathname.split('/').pop() || 'index.html';
    menu.querySelectorAll('a').forEach(function (a) {
        if (a.getAttribute('href') === page) a.classList.add('current');
    });
})();
