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
        '"projects": *[_type=="project"]|order(order asc){title,"slug":slug.current,location,dateLabel,"image":image.asset->url}' +
        '}';

    var PROJECT_FIELDS = '{title,location,dateLabel,intro,team,"image":image.asset->url}';

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
        setText($('#p-location'), p.location);
        setText($('#p-date'), p.dateLabel);
        fill($('#p-body'), p.intro);
        if (p.image) $('#p-image').style.backgroundImage = 'url("' + img(p.image, 2000) + '")';
        var team = $('#p-team');
        if (team && p.team && p.team.length) {
            team.textContent = '';
            p.team.forEach(function (m) {
                var row = el('div');
                row.appendChild(el('span', 'bold', m.name));
                row.appendChild(document.createTextNode(' '));
                row.appendChild(el('span', 'light', m.role || ''));
                team.appendChild(row);
            });
        }
    }

    function fail(err) { console.warn('[sanity]', err); }

    query(SITE_QUERY).then(renderSite).catch(fail);

    if ($('#p-title')) {
        var slug = new URLSearchParams(location.search).get('slug');
        var groq = slug
            ? '*[_type=="project" && slug.current==$slug][0]' + PROJECT_FIELDS
            : '*[_type=="project"]|order(order asc)[0]' + PROJECT_FIELDS;
        query(groq, slug ? { slug: slug } : {}).then(renderProject).catch(fail);
    }
})();
