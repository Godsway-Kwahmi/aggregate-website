/*
 * Loads published content from Sanity and fills the matching data-sanity hooks.
 * The static text in each page stays in place as a fallback if the request fails.
 * The dataset is public and read-only, so no token belongs in this file.
 */
(function () {
    var CFG = { projectId: 'sb67qd0w', dataset: 'production', apiVersion: '2025-02-19' };

    var $ = function (s) { return document.querySelector(s); };

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }
    function img(url, w) { return url + '?w=' + w + '&auto=format&q=80'; }
    function setText(node, text) { if (node && text) node.textContent = text; }
    function fill(node, paragraphs) {
        if (!node || !paragraphs || !paragraphs.length) return;
        node.textContent = '';
        paragraphs.forEach(function (t) { node.appendChild(el('p', '', t)); });
    }

    function query(groq, params) {
        var url = 'https://' + CFG.projectId + '.apicdn.sanity.io/v' + CFG.apiVersion +
            '/data/query/' + CFG.dataset + '?query=' + encodeURIComponent(groq);
        Object.keys(params || {}).forEach(function (k) {
            url += '&%24' + k + '=' + encodeURIComponent(JSON.stringify(params[k]));
        });
        return fetch(url).then(function (r) {
            if (!r.ok) throw new Error('Sanity request failed: ' + r.status);
            return r.json();
        }).then(function (j) { return j.result; });
    }

    var SITE_QUERY = '{' +
        '"s": *[_type=="siteSettings"]|order(_updatedAt desc)[0]{email,phone,address,"hero":heroImage.asset->url},' +
        '"a": *[_type=="about"]|order(_updatedAt desc)[0]{intro,vision,mission,"leaders":leaders[]{name,role,bio,"photo":photo.asset->url}},' +
        '"services": *[_type=="service"]|order(order asc){title,description},' +
        '"projects": *[_type=="project" && defined(slug.current)]|order(order asc){title,"slug":slug.current,location,dateLabel,"image":image.asset->url}' +
        '}';

    var PROJECT_FIELDS = '{title,location,dateLabel,intro,team,"image":image.asset->url,"gallery":gallery[defined(asset)].asset->url}';

    function renderSite(d) {
        var s = d.s || {}, a = d.a || {};

        // Home
        var hero = $('[data-sanity="hero"]');
        if (hero && s.hero) hero.style.backgroundImage = 'url("' + img(s.hero, 2000) + '")';

        // Who we are
        fill($('[data-sanity="about-intro"]'), a.intro);
        setText($('[data-sanity="about-vision"]'), a.vision);
        setText($('[data-sanity="about-mission"]'), a.mission);
        var leaders = $('[data-sanity="leaders"]');
        if (leaders && a.leaders && a.leaders.length) {
            leaders.textContent = '';
            a.leaders.forEach(function (l) {
                var box = el('div', 'leader');
                if (l.photo) {
                    var im = el('img');
                    im.src = img(l.photo, 240);
                    im.alt = l.name;
                    box.appendChild(im);
                }
                var text = el('div');
                text.appendChild(el('h3', '', l.name));
                if (l.role) text.appendChild(el('span', '', l.role));
                if (l.bio) text.appendChild(el('p', '', l.bio));
                box.appendChild(text);
                leaders.appendChild(box);
            });
        }

        // What we do
        var services = $('[data-sanity="services"]');
        if (services && d.services && d.services.length) {
            services.textContent = '';
            d.services.forEach(function (x) {
                var block = el('div', 'info-block');
                block.appendChild(el('h2', '', x.title));
                if (x.description) block.appendChild(el('p', '', x.description));
                services.appendChild(block);
            });
        }

        // What we've done
        var projects = $('[data-sanity="projects"]');
        if (projects && d.projects && d.projects.length) {
            projects.textContent = '';
            d.projects.forEach(function (p) {
                var card = el('a', 'card');
                card.href = 'project.html?slug=' + encodeURIComponent(p.slug);
                var pic = el('div', 'img');
                if (p.image) pic.style.backgroundImage = 'url("' + img(p.image, 900) + '")';
                card.appendChild(pic);
                card.appendChild(el('h2', '', p.title));
                card.appendChild(el('p', '', [p.location, p.dateLabel].filter(Boolean).join(' \u00b7 ')));
                projects.appendChild(card);
            });
        }

        // Get in touch
        var email = $('[data-sanity="email"]');
        if (s.email) {
            window.SEND_TO = s.email; // read by the contact form
            if (email) {
                email.textContent = '';
                var link = el('a', '', s.email);
                link.href = 'mailto:' + s.email;
                email.appendChild(link);
            }
        }
        setText($('[data-sanity="phone"]'), s.phone);
        setText($('[data-sanity="address"]'), s.address);
    }

    function renderProject(p) {
        if (!p) {
            setText($('#p-title'), 'Project not found');
            setText($('#p-location'), '');
            setText($('#p-date'), '');
            $('#p-body').textContent = '';
            $('#p-team').textContent = '';
            return;
        }
        document.title = p.title + ' - Aggregate Construction';
        setText($('#p-title'), p.title);
        // Clear the built-in fallback text first so a project never shows another project's details
        $('#p-location').textContent = p.location || '';
        $('#p-date').textContent = p.dateLabel || '';
        $('#p-body').textContent = '';
        fill($('#p-body'), p.intro);
        renderGallery(p);
        var team = $('#p-team');
        var hasTeam = !!(p.team && p.team.length);
        var teamLabel = document.querySelector('.team-label');
        if (teamLabel) teamLabel.hidden = !hasTeam;
        if (team) team.textContent = '';
        if (team && hasTeam) {
            p.team.forEach(function (m) {
                var row = el('div');
                row.appendChild(el('span', 'bold', m.name));
                row.appendChild(document.createTextNode(' '));
                row.appendChild(el('span', 'light', m.role || ''));
                team.appendChild(row);
            });
        }
    }

    // Project page: main image first, then the gallery, with arrows / keys / swipe to click through
    function renderGallery(p) {
        var panel = $('#p-image');
        var images = [p.image].concat(p.gallery || []).filter(Boolean);
        if (!panel || !images.length) return; // no images yet: keep the built-in fallback image

        var stage = el('div', 'pslides');
        var slides = images.map(function (url) {
            var slide = el('div', 'pslide');
            slide.style.backgroundImage = 'url("' + img(url, 2000) + '")';
            stage.appendChild(slide);
            return slide;
        });
        panel.insertBefore(stage, panel.firstChild);

        var controls = $('.spatial-controls'), count = $('#pCount'), current = 0;
        function show(n) {
            current = (n + slides.length) % slides.length;
            slides.forEach(function (slide, i) { slide.classList.toggle('active', i === current); });
            if (count) count.textContent = (current + 1) + ' / ' + slides.length;
        }
        show(0);
        if (slides.length < 2 || !controls) return; // one image: no arrows

        controls.hidden = false;
        $('#pPrev').addEventListener('click', function () { show(current - 1); });
        $('#pNext').addEventListener('click', function () { show(current + 1); });
        document.addEventListener('keydown', function (e) {
            if (document.body.style.overflow === 'hidden') return; // menu is open
            if (e.key === 'ArrowLeft') show(current - 1);
            else if (e.key === 'ArrowRight') show(current + 1);
        });
        var startX = null;
        panel.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
        panel.addEventListener('touchend', function (e) {
            if (startX === null) return;
            var dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
            startX = null;
        });
    }

    // Home page hero: randomized slideshow of the most recent project images
    var HERO_LIMIT = 8; // how many of the newest projects (with an image) can appear
    var HERO_QUERY = '*[_type=="project" && defined(image.asset) && defined(slug.current)]|order(_createdAt desc)[0...' + HERO_LIMIT + ']{title,"slug":slug.current,"image":image.asset->url}';

    function shuffle(list) {
        for (var i = list.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = list[i]; list[i] = list[j]; list[j] = t;
        }
        return list;
    }

    function renderSlideshow(hero, projects) {
        if (!projects || !projects.length) return; // no project images yet: keep the static hero image
        var slides = shuffle(projects.slice());
        var stage = el('div', 'slides');
        var dots = el('div', 'slide-dots');
        var items = [], buttons = [], current = 0, timer = null;
        var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

        function show(n) {
            current = (n + slides.length) % slides.length;
            items.forEach(function (a, i) {
                var on = i === current;
                a.classList.toggle('active', on);
                a.setAttribute('aria-hidden', on ? 'false' : 'true');
                a.tabIndex = on ? 0 : -1;
            });
            buttons.forEach(function (b, i) {
                b.classList.toggle('active', i === current);
                if (i === current) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
            });
        }
        function stop() { if (timer) { clearInterval(timer); timer = null; } }
        function start() {
            stop();
            if (still || slides.length < 2) return;
            timer = setInterval(function () { show(current + 1); }, 6000);
        }

        slides.forEach(function (p, i) {
            var a = el('a', 'slide');
            a.href = 'project.html?slug=' + encodeURIComponent(p.slug);
            a.style.backgroundImage = 'url("' + img(p.image, 2000) + '")';
            a.appendChild(el('span', 'slide-title', p.title));
            stage.appendChild(a);
            items.push(a);
            if (slides.length > 1) {
                var b = el('button', 'slide-dot');
                b.type = 'button';
                b.setAttribute('aria-label', 'Show ' + p.title);
                b.addEventListener('click', function () { show(i); if (timer) start(); });
                dots.appendChild(b);
                buttons.push(b);
            }
        });

        hero.appendChild(stage);
        if (buttons.length) hero.appendChild(dots);
        show(0);
        start();

        hero.addEventListener('mouseenter', stop);
        hero.addEventListener('mouseleave', start);
        hero.addEventListener('focusin', stop);
        hero.addEventListener('focusout', start);
        hero.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') show(current + 1);
            else if (e.key === 'ArrowLeft') show(current - 1);
        });
    }

    function fail(err) { console.warn('[sanity]', err); }

    query(SITE_QUERY).then(renderSite).catch(fail);

    var heroEl = $('[data-sanity="hero"]');
    if (heroEl) query(HERO_QUERY).then(function (p) { renderSlideshow(heroEl, p); }).catch(fail);

    if ($('#p-title')) {
        var slug = new URLSearchParams(location.search).get('slug');
        var groq = slug
            ? '*[_type=="project" && slug.current==$slug][0]' + PROJECT_FIELDS
            : '*[_type=="project"]|order(order asc)[0]' + PROJECT_FIELDS;
        query(groq, slug ? { slug: slug } : {}).then(renderProject).catch(fail);
    }
})();
