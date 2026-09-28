/* M.Sc. Physics Practicals — shared page toolkit (window.MSC).
   Tabs, section nav, canvas fitting, SVG symbol library, draw-along engine,
   flowchart generator, viva cards, tables and record-sheet helpers. */
(function (global) {
    'use strict';

    const MSC = global.MSC = {};
    const SVGNS = 'http://www.w3.org/2000/svg';

    // ---------------------------------------------------------------- utils
    const $ = MSC.$ = (sel, root) => (typeof sel === 'string' ? (root || document).querySelector(sel) : sel);
    MSC.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
    MSC.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    MSC.hex = (n, digits) => (n >>> 0).toString(16).toUpperCase().padStart(digits || 2, '0');
    MSC.bin = (n, bits) => (n >>> 0).toString(2).padStart(bits || 8, '0');
    MSC.round = (v, dp) => { const f = Math.pow(10, dp); return Math.round(v * f) / f; };
    MSC.fix = (v, dp) => (Math.abs(v) < 1e-12 ? 0 : v).toFixed(dp);

    const esc = MSC.esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    /* Tiny markup for labels: _{sub} or _x, ^{sup}, !{overline}. */
    function fmtSVG(str) {
        let s = esc(str);
        s = s.replace(/!\{([^}]*)\}/g, '<tspan style="text-decoration:overline">$1</tspan>');
        s = s.replace(/_\{([^}]*)\}/g, '<tspan baseline-shift="sub" font-size="72%">$1</tspan>');
        s = s.replace(/\^\{([^}]*)\}/g, '<tspan baseline-shift="super" font-size="72%">$1</tspan>');
        s = s.replace(/_([A-Za-z0-9])/g, '<tspan baseline-shift="sub" font-size="72%">$1</tspan>');
        return s;
    }
    function fmtHTML(str) {
        let s = esc(str);
        s = s.replace(/!\{([^}]*)\}/g, '<span style="text-decoration:overline">$1</span>');
        s = s.replace(/_\{([^}]*)\}/g, '<sub>$1</sub>');
        s = s.replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>');
        s = s.replace(/_([A-Za-z0-9])/g, '<sub>$1</sub>');
        return s;
    }
    MSC.fmtSVG = fmtSVG;
    MSC.fmtHTML = fmtHTML;

    MSC.store = {
        get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    };

    MSC.el = function (tag, attrs, html) {
        const e = document.createElement(tag);
        if (attrs) Object.keys(attrs).forEach(k => {
            if (k === 'class') e.className = attrs[k];
            else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
            else e.setAttribute(k, attrs[k]);
        });
        if (html !== undefined) e.innerHTML = html;
        return e;
    };

    // ---------------------------------------------------------------- tabs
    const tabBars = {};
    function initTabs(scope) {
        (scope || document).querySelectorAll('[data-tabs]').forEach(bar => {
            if (bar._mscTabs) return;
            bar._mscTabs = true;
            const group = bar.dataset.tabs;
            const btns = Array.from(bar.querySelectorAll('.tab-btn[data-tab]'));
            const show = (tab) => {
                btns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
                document.querySelectorAll('.tab-panel[data-group="' + group + '"]').forEach(p =>
                    p.classList.toggle('active', p.dataset.panel === tab));
                tabBars[group].current = tab;
                document.dispatchEvent(new CustomEvent('msc:tab', { detail: { group, tab } }));
            };
            tabBars[group] = { show, current: null };
            btns.forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
            const initial = btns.find(b => b.classList.contains('active')) || btns[0];
            if (initial) show(initial.dataset.tab);
        });
    }
    MSC.initTabs = initTabs;
    MSC.showTab = (group, tab) => tabBars[group] && tabBars[group].show(tab);
    MSC.activeTab = (group) => (tabBars[group] ? tabBars[group].current : null);
    MSC.onTab = (group, fn) => document.addEventListener('msc:tab', e => { if (e.detail.group === group) fn(e.detail.tab); });

    // ---------------------------------------------------------------- section nav
    function initSectionNav() {
        const nav = document.querySelector('.section-nav');
        if (!nav || !('IntersectionObserver' in global)) return;
        const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
        const map = new Map();
        links.forEach(a => { const s = document.getElementById(a.getAttribute('href').slice(1)); if (s) map.set(s, a); });
        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    links.forEach(l => l.classList.remove('active'));
                    const a = map.get(en.target);
                    if (a) a.classList.add('active');
                }
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        map.forEach((a, s) => io.observe(s));
    }

    // ---------------------------------------------------------------- canvas
    /* Fits a canvas to its container width, keeping a W×H logical space. */
    MSC.canvas = function (canvas, W, H) {
        const ctx = canvas.getContext('2d');
        const api = { ctx, W, H, scale: 1 };
        function fit() {
            const w = canvas.parentElement.clientWidth;
            if (!w) return;
            const dpr = Math.min(global.devicePixelRatio || 1, 2);
            canvas.style.width = w + 'px';
            canvas.style.height = Math.round(w * H / W) + 'px';
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(w * H / W * dpr);
            api.scale = canvas.width / W;
        }
        api.fit = fit;
        api.begin = () => { ctx.setTransform(api.scale, 0, 0, api.scale, 0, 0); };
        api.pt = (e) => {
            const r = canvas.getBoundingClientRect();
            return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
        };
        if ('ResizeObserver' in global) new ResizeObserver(fit).observe(canvas.parentElement);
        else global.addEventListener('resize', fit);
        fit();
        return api;
    };

    /* requestAnimationFrame loop with a clamped dt (seconds). */
    MSC.loop = function (fn) {
        let last = performance.now();
        function frame(now) {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            fn(dt, now / 1000);
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    };

    // ---------------------------------------------------------------- SVG symbols
    const S = MSC.sym = {};
    const n2 = (v) => Math.round(v * 100) / 100;
    const cls = (c) => (c ? ' class="' + c + '"' : '');

    S.fmt = fmtSVG;
    S.text = function (x, y, str, o) {
        o = o || {};
        const a = ' text-anchor="' + (o.anchor || 'middle') + '" dominant-baseline="' + (o.baseline || 'central') + '"';
        const size = o.size ? ' font-size="' + o.size + '"' : '';
        const w = o.weight ? ' font-weight="' + o.weight + '"' : '';
        const it = o.italic ? ' font-style="italic"' : '';
        const rot = o.rotate ? ' transform="rotate(' + o.rotate + ' ' + x + ' ' + y + ')"' : '';
        return '<text x="' + n2(x) + '" y="' + n2(y) + '"' + a + size + w + it + rot + cls(o.cls) + '>' + fmtSVG(str) + '</text>';
    };
    S.line = (x1, y1, x2, y2, c) => '<line x1="' + n2(x1) + '" y1="' + n2(y1) + '" x2="' + n2(x2) + '" y2="' + n2(y2) + '"' + cls(c) + '/>';
    S.wire = (pts, c) => '<polyline points="' + pts.map(p => n2(p[0]) + ',' + n2(p[1])).join(' ') + '"' + cls(c) + '/>';
    S.path = (d, c) => '<path d="' + d + '"' + cls(c) + '/>';
    S.rect = (x, y, w, h, o) => { o = o || {}; return '<rect x="' + n2(x) + '" y="' + n2(y) + '" width="' + n2(w) + '" height="' + n2(h) + '"' + (o.rx ? ' rx="' + o.rx + '"' : '') + cls(o.cls) + '/>'; };
    S.circle = (cx, cy, r, c) => '<circle cx="' + n2(cx) + '" cy="' + n2(cy) + '" r="' + n2(r) + '"' + cls(c) + '/>';
    S.dot = (x, y, r) => '<circle cx="' + n2(x) + '" cy="' + n2(y) + '" r="' + (r || 3.6) + '" class="solid" stroke="none"/>';
    S.poly = (pts, c) => '<polygon points="' + pts.map(p => n2(p[0]) + ',' + n2(p[1])).join(' ') + '"' + cls(c) + '/>';

    S.arrowHead = function (x, y, ang, size, c) {
        size = size || 9;
        const a1 = ang + Math.PI * 0.85, a2 = ang - Math.PI * 0.85;
        return S.poly([[x, y], [x + Math.cos(a1) * size, y + Math.sin(a1) * size], [x + Math.cos(a2) * size, y + Math.sin(a2) * size]], 'solid ' + (c || ''));
    };
    S.arrow = function (x1, y1, x2, y2, o) {
        o = o || {};
        const size = o.size || 9;
        const ang = Math.atan2(y2 - y1, x2 - x1);
        const ex = x2 - Math.cos(ang) * size * 0.7, ey = y2 - Math.sin(ang) * size * 0.7;
        let s = S.line(x1, y1, ex, ey, o.cls) + S.arrowHead(x2, y2, ang, size, o.cls);
        if (o.both) s += S.arrowHead(x1, y1, ang + Math.PI, size, o.cls);
        return s;
    };
    /* Arrowhead placed in the middle of a straight wire, pointing along it. */
    S.midArrow = function (x1, y1, x2, y2, size) {
        const ang = Math.atan2(y2 - y1, x2 - x1);
        return S.arrowHead((x1 + x2) / 2 + Math.cos(ang) * 4, (y1 + y2) / 2 + Math.sin(ang) * 4, ang, size || 8);
    };

    /* Zig-zag resistor between two points (leads included). */
    S.resistor = function (x1, y1, x2, y2, o) {
        o = o || {};
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
        const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
        const bl = Math.min(o.len || 40, L * 0.75), s0 = (L - bl) / 2, amp = o.amp || 6, zig = o.zig || 6;
        const pts = [[x1, y1], [x1 + ux * s0, y1 + uy * s0]];
        for (let k = 1; k < zig * 2; k++) {
            const t = s0 + bl * k / (zig * 2);
            const side = (k % 2 ? 1 : -1) * amp;
            pts.push([x1 + ux * t + nx * side, y1 + uy * t + ny * side]);
        }
        pts.push([x1 + ux * (s0 + bl), y1 + uy * (s0 + bl)], [x2, y2]);
        let s = S.wire(pts, o.cls);
        if (o.label) {
            const side = o.side || 1, off = amp + (o.labelOffset || 13);
            const mx = (x1 + x2) / 2 + nx * off * side, my = (y1 + y2) / 2 + ny * off * side;
            s += S.text(mx, my, o.label, { size: o.size || 13, cls: o.labelCls });
        }
        return s;
    };

    S.capacitor = function (x1, y1, x2, y2, o) {
        o = o || {};
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
        const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
        const gap = o.gap || 8, pl = (o.plate || 24) / 2;
        const m1 = L / 2 - gap / 2, m2 = L / 2 + gap / 2;
        const a = [x1 + ux * m1, y1 + uy * m1], b = [x1 + ux * m2, y1 + uy * m2];
        let s = S.line(x1, y1, a[0], a[1]) + S.line(b[0], b[1], x2, y2);
        s += S.line(a[0] + nx * pl, a[1] + ny * pl, a[0] - nx * pl, a[1] - ny * pl, 'thick');
        s += S.line(b[0] + nx * pl, b[1] + ny * pl, b[0] - nx * pl, b[1] - ny * pl, 'thick');
        if (o.label) {
            const side = o.side || 1;
            s += S.text((x1 + x2) / 2 + nx * (pl + 14) * side, (y1 + y2) / 2 + ny * (pl + 14) * side, o.label, { size: 13 });
        }
        return s;
    };

    S.ground = function (x, y, o) {
        o = o || {};
        const lead = o.lead === undefined ? 10 : o.lead;
        return S.line(x, y, x, y + lead) + S.line(x - 13, y + lead, x + 13, y + lead) +
            S.line(x - 8, y + lead + 5, x + 8, y + lead + 5) + S.line(x - 3, y + lead + 10, x + 3, y + lead + 10);
    };

    S.vsource = function (x, y, o) {
        o = o || {};
        const r = o.r || 16;
        let s = S.circle(x, y, r) + S.text(x, y - r * 0.42, '+', { size: 13 }) + S.text(x, y + r * 0.45, '−', { size: 13 });
        if (o.label) s += S.text(x + (o.labelDx || -r - 8), y, o.label, { anchor: o.labelAnchor || 'end', size: 13 });
        return s;
    };

    /* Cell/battery: long (+) and short (−) plates, vertical by default, (x,y) = centre. */
    S.battery = function (x, y, o) {
        o = o || {};
        const g = 6;
        let s = S.line(x - 14, y - g, x + 14, y - g) + S.line(x - 8, y + g, x + 8, y + g, 'thick');
        s += S.line(x, y - g, x, y - g - (o.lead || 12)) + S.line(x, y + g, x, y + g + (o.lead || 12));
        if (o.label) s += S.text(x + 20, y, o.label, { anchor: 'start', size: 13 });
        return s;
    };

    /* SPDT switch. Pivot at (x,y); throws at (x+len, y∓gap). up=true selects the top throw. */
    S.spdtPins = (x, y, o) => { o = o || {}; const len = o.len || 34, gap = o.gap || 14; return { com: [x, y], top: [x + len, y - gap], bot: [x + len, y + gap] }; };
    S.spdt = function (x, y, o) {
        o = o || {};
        const p = S.spdtPins(x, y, o), t = o.up ? p.top : p.bot;
        return S.dot(x, y, 3.2) + S.circle(p.top[0], p.top[1], 3.2, 'paper') + S.circle(p.bot[0], p.bot[1], 3.2, 'paper') +
            S.line(x, y, t[0] - 1, t[1] + (o.up ? 1 : -1), 'thick' + (o.hot ? ' hot' : ''));
    };

    /* Op-amp. (x,y) = middle of the left (input) edge. */
    S.opampPins = function (x, y, o) {
        o = o || {};
        const w = o.w || 96, h = o.h || 84, flip = !!o.flip;
        const top = [x, y - h / 4], bot = [x, y + h / 4];
        return {
            inv: flip ? bot : top, non: flip ? top : bot, out: [x + w, y],
            vp: [x + w * 0.42, y - h / 2 - 16], vn: [x + w * 0.42, y + h / 2 + 16],
        };
    };
    S.opamp = function (x, y, o) {
        o = o || {};
        const w = o.w || 96, h = o.h || 84, flip = !!o.flip, pins = o.pins || { inv: '2', non: '3', out: '6', vp: '7', vn: '4' };
        const P = S.opampPins(x, y, o);
        let s = '';
        if (o.only !== 'power') {
            s += S.poly([[x, y - h / 2], [x, y + h / 2], [x + w, y]]);
            s += S.text(x + 13, P.inv[1], '−', { size: 18 }) + S.text(x + 13, P.non[1], '+', { size: 16 });
            if (o.label !== false) s += S.text(x + w * 0.4, y, o.label || '741', { size: 12, cls: 'soft' });
            if (pins.inv) s += S.text(x - 7, P.inv[1] - 9, pins.inv, { size: 10, cls: 'soft', anchor: 'end' });
            if (pins.non) s += S.text(x - 7, P.non[1] - 9, pins.non, { size: 10, cls: 'soft', anchor: 'end' });
            if (pins.out) s += S.text(x + w + 4, y - 10, pins.out, { size: 10, cls: 'soft', anchor: 'start' });
        }
        if (o.power !== false || o.only === 'power') {
            const ex = x + w * 0.42, eyTop = y - h / 2 + 0.42 * h / 2, eyBot = y + h / 2 - 0.42 * h / 2;
            s += S.line(ex, eyTop, ex, P.vp[1]) + S.line(ex, eyBot, ex, P.vn[1]);
            s += S.text(ex + 5, P.vp[1] - 8, (o.vpLabel || '+V_{CC}') + (pins.vp ? ' (' + pins.vp + ')' : ''), { size: 11, anchor: 'start' });
            s += S.text(ex + 5, P.vn[1] + 9, (o.vnLabel || '−V_{EE}') + (pins.vn ? ' (' + pins.vn + ')' : ''), { size: 11, anchor: 'start' });
        }
        return s;
    };

    /* Logic gates. (x,y) = top-left of the body; w = body width, h = height. */
    const bubbled = (t) => /^(NAND|NOR|NOT|XNOR)$/.test(t);
    S.gatePins = function (type, x, y, o) {
        o = o || {};
        const w = o.w || 60, h = o.h || 46, n = type === 'NOT' || type === 'BUF' ? 1 : (o.n || 2), lead = o.lead === undefined ? 14 : o.lead;
        const shift = /^X/.test(type) ? 8 : 0;
        let outX = x + w + shift + (bubbled(type) ? 10 : 0);
        const ins = [];
        for (let i = 0; i < n; i++) {
            const yi = n === 1 ? y + h / 2 : y + h * (i + 1) / (n + 1);
            ins.push([x - lead, yi]);
        }
        return { in: ins, out: [outX + lead, y + h / 2] };
    };
    S.gate = function (type, x, y, o) {
        o = o || {};
        const w = o.w || 60, h = o.h || 46, lead = o.lead === undefined ? 14 : o.lead;
        const P = S.gatePins(type, x, y, o);
        const t = type.toUpperCase();
        const shift = /^X/.test(t) ? 8 : 0;
        const bx = x + shift; // body start
        let body = '', backX = (yi) => bx;
        if (t === 'AND' || t === 'NAND') {
            const r = h / 2, flat = w - r;
            body = S.path('M' + n2(bx) + ',' + n2(y) + ' H' + n2(bx + flat) + ' A' + r + ',' + r + ' 0 0 1 ' + n2(bx + flat) + ',' + n2(y + h) + ' H' + n2(bx) + ' Z', o.cls);
        } else if (t === 'OR' || t === 'NOR' || t === 'XOR' || t === 'XNOR') {
            body = S.path('M' + n2(bx) + ',' + n2(y) + ' Q' + n2(bx + w * 0.3) + ',' + n2(y + h / 2) + ' ' + n2(bx) + ',' + n2(y + h) +
                ' Q' + n2(bx + w * 0.62) + ',' + n2(y + h) + ' ' + n2(bx + w) + ',' + n2(y + h / 2) +
                ' Q' + n2(bx + w * 0.62) + ',' + n2(y) + ' ' + n2(bx) + ',' + n2(y) + ' Z', o.cls);
            backX = (yi) => { const tt = (yi - y) / h; return bx + 0.6 * w * tt * (1 - tt); };
            if (shift) body += S.path('M' + n2(x) + ',' + n2(y) + ' Q' + n2(x + w * 0.3) + ',' + n2(y + h / 2) + ' ' + n2(x) + ',' + n2(y + h), o.cls);
        } else { // NOT / BUF
            body = S.poly([[bx, y + h * 0.08], [bx, y + h * 0.92], [bx + w, y + h / 2]], o.cls);
        }
        let s = body;
        if (bubbled(t)) s += S.circle(bx + w + 5, y + h / 2, 5, 'paper ' + (o.cls || ''));
        P.in.forEach(p => { s += S.line(p[0], p[1], backX(p[1]) + (shift && t !== 'NOT' ? 0 : 0), p[1], o.leadCls || o.cls); });
        const outBody = bx + w + (bubbled(t) ? 10 : 0);
        s += S.line(outBody, P.out[1], P.out[0], P.out[1], o.outCls || o.cls);
        if (o.label) s += S.text(bx + w * 0.42, y + h / 2, o.label, { size: 10, cls: 'soft' });
        return s;
    };

    /* Generic IC / flip-flop box with labelled pins on each side.
       sides: left/right/top/bottom arrays of pin labels ('' to skip a label). clk: index on left side drawn with ">". */
    S.chipPins = function (x, y, o) {
        o = o || {};
        const w = o.w || 90, h = o.h || 100, lead = o.lead === undefined ? 18 : o.lead;
        const spread = (arr, a, b) => arr.map((_, i) => a + (b - a) * (i + 1) / (arr.length + 1));
        const L = o.left || [], R = o.right || [], T = o.top || [], B = o.bottom || [];
        return {
            left: spread(L, y, y + h).map(v => [x - lead, v]),
            right: spread(R, y, y + h).map(v => [x + w + lead, v]),
            top: spread(T, x, x + w).map(v => [v, y - lead]),
            bottom: spread(B, x, x + w).map(v => [v, y + h + lead]),
        };
    };
    S.chip = function (x, y, o) {
        o = o || {};
        const w = o.w || 90, h = o.h || 100, lead = o.lead === undefined ? 18 : o.lead;
        const P = S.chipPins(x, y, o), fs = o.pinSize || 12;
        let s = S.rect(x, y, w, h, { rx: 3, cls: o.cls });
        if (o.title) s += S.text(x + w / 2, o.titleY !== undefined ? o.titleY : y + h / 2, o.title, { size: o.titleSize || 13, cls: o.titleCls });
        const nums = o.pinNums || {};
        (o.left || []).forEach((lab, i) => {
            const p = P.left[i];
            s += S.line(p[0], p[1], x, p[1]);
            if (o.clk === i) s += S.wire([[x, p[1] - 6], [x + 9, p[1]], [x, p[1] + 6]]);
            if (lab) s += S.text(x + (o.clk === i ? 14 : 6), p[1], lab, { anchor: 'start', size: fs });
            if (nums.left && nums.left[i] !== undefined) s += S.text(x - 4, p[1] - 8, String(nums.left[i]), { anchor: 'end', size: 10, cls: 'soft' });
        });
        (o.right || []).forEach((lab, i) => {
            const p = P.right[i];
            s += S.line(x + w, p[1], p[0], p[1]);
            if (lab) s += S.text(x + w - 6, p[1], lab, { anchor: 'end', size: fs });
            if (nums.right && nums.right[i] !== undefined) s += S.text(x + w + 4, p[1] - 8, String(nums.right[i]), { anchor: 'start', size: 10, cls: 'soft' });
        });
        (o.top || []).forEach((lab, i) => {
            const p = P.top[i];
            s += S.line(p[0], p[1], p[0], y);
            if (lab) s += S.text(p[0], y + 11, lab, { size: fs });
            if (nums.top && nums.top[i] !== undefined) s += S.text(p[0] + 4, y - 7, String(nums.top[i]), { anchor: 'start', size: 10, cls: 'soft' });
        });
        (o.bottom || []).forEach((lab, i) => {
            const p = P.bottom[i];
            s += S.line(p[0], y + h, p[0], p[1]);
            if (lab) s += S.text(p[0], y + h - 11, lab, { size: fs });
            if (nums.bottom && nums.bottom[i] !== undefined) s += S.text(p[0] + 4, y + h + 8, String(nums.bottom[i]), { anchor: 'start', size: 10, cls: 'soft' });
        });
        return s;
    };

    /* D flip-flop symbol: D and CLK on the left, Q and Q̄ on the right, optional PR̄/CLR̄. */
    S.dffPins = (x, y, o) => S.chipPins(x, y, Object.assign({ w: 70, h: 92, left: ['D', ''], right: ['Q', '!{Q}'], top: o && o.pr ? ['PR'] : [], bottom: o && o.clr ? ['CLR'] : [] }, o));
    S.dff = (x, y, o) => S.chip(x, y, Object.assign({ w: 70, h: 92, left: ['D', 'CLK'], right: ['Q', '!{Q}'], clk: 1, top: o && o.pr ? ['!{PR}'] : [], bottom: o && o.clr ? ['!{CLR}'] : [] }, o));

    /* DIP pin diagram. labels[i] is the name of pin i+1. (x,y) = top-left of the body.
       o.only = 'body' | 'pins' | 'labels' draws just that part (for step-by-step drawing). */
    S.dip = function (x, y, o) {
        o = o || {};
        const n = o.n || 14, half = n / 2, pitch = o.pitch || 26, w = o.w || 110, h = pitch * half + 16, stub = 16;
        const labels = o.labels || [], part = o.only;
        let s = '';
        if (!part || part === 'body') {
            s += S.rect(x, y, w, h, { rx: 4 });
            s += S.path('M' + n2(x + w / 2 - 11) + ',' + n2(y) + ' A11,11 0 0 0 ' + n2(x + w / 2 + 11) + ',' + n2(y));
            if (o.title) s += S.text(x + w / 2, y + h / 2, o.title, { size: 15, rotate: -90, weight: 800 });
        }
        for (let i = 0; i < half; i++) {
            const py = y + 8 + pitch * (i + 0.5), j = n - 1 - i;
            if (!part || part === 'pins') {
                s += S.rect(x - stub, py - 5, stub, 10, { cls: 'paper' });
                s += S.text(x + 9, py, String(i + 1), { anchor: 'start', size: 11 });
                s += S.rect(x + w, py - 5, stub, 10, { cls: 'paper' });
                s += S.text(x + w - 9, py, String(j + 1), { anchor: 'end', size: 11 });
            }
            if (!part || part === 'labels') {
                if (labels[i]) s += S.text(x - stub - 6, py, labels[i], { anchor: 'end', size: o.labelSize || 12 });
                if (labels[j]) s += S.text(x + w + stub + 6, py, labels[j], { anchor: 'start', size: o.labelSize || 12 });
            }
        }
        return s;
    };
    S.dipHeight = (o) => (o.pitch || 26) * ((o.n || 14) / 2) + 16;

    /* Graph axes with arrows. (x0,y0) = origin; w,h = extents; neg = also draw negative y. */
    S.axes = function (x0, y0, w, h, o) {
        o = o || {};
        let s = S.arrow(x0, y0 + (o.negY || 0), x0, y0 - h, { size: 8 }) + S.arrow(x0 - (o.negX || 0), y0, x0 + w, y0, { size: 8 });
        if (o.xlabel) s += S.text(x0 + w, y0 + 20, o.xlabel, { anchor: 'end', size: 13 });
        if (o.ylabel) s += S.text(x0 - 10, y0 - h + 2, o.ylabel, { anchor: 'end', size: 13 });
        if (o.origin !== false) s += S.text(x0 - 8, y0 + 12, 'O', { size: 12, anchor: 'end' });
        return s;
    };

    // ---------------------------------------------------------------- draw-along engine
    const diagrams = MSC.diagrams = {};
    const DRAWABLE = 'path,line,polyline,polygon,rect,circle,ellipse';

    function hasStroke(el) {
        const st = global.getComputedStyle(el);
        return st.stroke && st.stroke !== 'none' && parseFloat(st.strokeWidth) > 0 && st.visibility !== 'hidden';
    }
    function lengthOf(el) {
        try { return el.getTotalLength(); } catch (e) { return 60; }
    }
    function sleep(ms, tok) { return new Promise(res => { const t = setTimeout(res, ms); tok.timers.push(t); }); }
    function tween(ms, fn, tok) {
        return new Promise(res => {
            const t0 = performance.now();
            function f(now) {
                if (tok.cancelled) return res();
                const t = Math.min((now - t0) / ms, 1);
                fn(t);
                if (t < 1) requestAnimationFrame(f); else res();
            }
            requestAnimationFrame(f);
        });
    }

    MSC.drawAlong = function (root, opts) {
        opts = opts || {};
        const svg = root.querySelector('svg');
        const all = Array.from(svg.querySelectorAll('[data-step]')).filter(g => !g.parentElement.closest('[data-step]'));
        const steps = all.map((g, i) => ({ g, n: Number(g.dataset.step) || i + 1, caption: g.dataset.caption || '' }))
            .sort((a, b) => a.n - b.n);
        const total = steps.length;
        const pen = document.createElementNS(SVGNS, 'circle');
        pen.setAttribute('r', '5'); pen.setAttribute('class', 'draw-pen-dot'); pen.style.display = 'none';
        svg.appendChild(pen);

        let shown = 0, playing = false, animating = false, tok = { cancelled: false, timers: [] }, speed = opts.speed || 1;

        const bar = MSC.el('div', { class: 'draw-bar' });
        bar.innerHTML =
            '<button class="btn btn-sm" data-a="restart" title="Start again">⟲</button>' +
            '<button class="btn btn-sm" data-a="prev" title="Previous step">◀</button>' +
            '<button class="btn btn-sm btn-primary" data-a="play">▶ Draw</button>' +
            '<button class="btn btn-sm" data-a="next" title="Next step">Step ▶</button>' +
            '<button class="btn btn-sm" data-a="all">Show all</button>' +
            '<select class="field" data-a="speed" title="Drawing speed"><option value="0.5">Slow</option><option value="1" selected>Normal</option><option value="2">Fast</option></select>' +
            '<div class="draw-caption"></div>';
        root.appendChild(bar);
        const list = MSC.el('details', { class: 'draw-steps' });
        list.innerHTML = '<summary>How to draw it — all ' + total + ' steps</summary><ol>' +
            steps.map(s => '<li>' + fmtHTML(s.caption) + '</li>').join('') + '</ol>';
        root.appendChild(list);
        const cap = bar.querySelector('.draw-caption');
        const playBtn = bar.querySelector('[data-a="play"]');
        const items = Array.from(list.querySelectorAll('li'));

        function setVis(step, vis) { step.g.style.visibility = vis ? 'visible' : 'hidden'; }
        function clean(step) {
            step.g.querySelectorAll('*').forEach(el => { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; el.style.opacity = ''; el.style.fillOpacity = ''; });
        }
        function caption(idx) {
            if (idx < 0) { cap.innerHTML = 'Press <b>▶ Draw</b> to watch it drawn step by step (' + total + ' steps).'; }
            else cap.innerHTML = '<span class="step-no">Step ' + (idx + 1) + '/' + total + '</span>' + fmtHTML(steps[idx].caption);
            items.forEach((li, i) => { li.classList.toggle('done', i < shown); li.classList.toggle('cur', i === idx); });
        }
        function render() {
            steps.forEach((s, i) => { clean(s); setVis(s, i < shown); });
            pen.style.display = 'none';
            caption(shown - 1);
        }
        function cancel() {
            tok.cancelled = true; tok.timers.forEach(clearTimeout);
            tok = { cancelled: false, timers: [] };
            animating = false;
        }
        function setPlaying(p) { playing = p; playBtn.textContent = p ? '⏸ Pause' : (shown >= total ? '⟲ Again' : '▶ Draw'); }

        async function animateStep(i) {
            const st = steps[i], my = tok;
            animating = true;
            caption(i);
            const els = Array.from(st.g.querySelectorAll('*'));
            const strokes = [], fades = [];
            els.forEach(el => {
                if (el.matches(DRAWABLE) && hasStroke(el) && !el.classList.contains('solid')) strokes.push(el);
                else if (el.matches(DRAWABLE + ',text,image,foreignObject')) fades.push(el);
            });
            strokes.forEach(el => { const L = lengthOf(el); el._len = L; el.style.strokeDasharray = L + ' ' + L; el.style.strokeDashoffset = L; el.style.fillOpacity = '0'; });
            fades.forEach(el => { el.style.opacity = '0'; });
            setVis(st, true);
            for (const el of strokes) {
                if (my.cancelled) return;
                const L = el._len, dur = MSC.clamp(L / (0.42 * speed), 140 / speed, 1500 / speed);
                pen.style.display = '';
                await tween(dur, t => {
                    el.style.strokeDashoffset = L * (1 - t);
                    try {
                        const p = el.getPointAtLength(L * t);
                        const m = svg.getScreenCTM().inverse().multiply(el.getScreenCTM());
                        const q = p.matrixTransform(m);
                        pen.setAttribute('cx', q.x); pen.setAttribute('cy', q.y);
                    } catch (e) { /* element not measurable */ }
                }, my);
                el.style.fillOpacity = '';
            }
            pen.style.display = 'none';
            if (fades.length && !my.cancelled) await tween(260 / speed, t => fades.forEach(el => { el.style.opacity = t; }), my);
            if (my.cancelled) return;
            clean(st);
            animating = false;
        }
        async function play() {
            if (shown >= total) { shown = 0; render(); }
            setPlaying(true);
            while (playing && shown < total) {
                const my = tok;
                await animateStep(shown);
                if (my.cancelled) return;
                shown++;
                caption(shown - 1);
                if (shown < total) await sleep(380 / speed, my);
                if (my.cancelled) return;
            }
            setPlaying(false);
        }
        async function next() {
            if (animating) { cancel(); shown++; setPlaying(false); render(); return; }
            if (shown >= total) return;
            setPlaying(false);
            const my = tok;
            await animateStep(shown);
            if (my.cancelled) return;
            shown++;
            caption(shown - 1);
            setPlaying(false);
        }
        bar.addEventListener('click', e => {
            const b = e.target.closest('[data-a]');
            if (!b || b.tagName === 'SELECT') return;
            const a = b.dataset.a;
            if (a === 'play') { if (playing) { cancel(); setPlaying(false); render(); } else { cancel(); play(); } }
            else if (a === 'next') next();
            else if (a === 'prev') { cancel(); setPlaying(false); shown = Math.max(0, shown - 1); render(); }
            else if (a === 'restart') { cancel(); setPlaying(false); shown = 0; render(); }
            else if (a === 'all') { cancel(); setPlaying(false); shown = total; render(); }
        });
        bar.querySelector('[data-a="speed"]').addEventListener('change', e => { speed = Number(e.target.value); });
        items.forEach((li, i) => li.addEventListener('click', () => { cancel(); setPlaying(false); shown = i + 1; render(); }));

        shown = opts.startComplete ? total : 0;
        render();
        setPlaying(false);
        return { showAll() { cancel(); shown = total; render(); }, restart() { cancel(); shown = 0; render(); }, get total() { return total; }, get shown() { return shown; } };
    };

    /* Build a draw-along diagram from step definitions.
       def = { name, title, viewBox, steps: [{ c: 'caption', s: '<svg markup>' }], height } */
    MSC.diagram = function (target, def) {
        const host = $(target);
        const root = MSC.el('div', { class: 'draw-along' });
        const body = def.steps.map((st, i) => '<g data-step="' + (i + 1) + '" data-caption="' + esc(st.c).replace(/"/g, '&quot;') + '">' + st.s + '</g>').join('');
        root.innerHTML = '<div class="draw-canvas"><svg class="pen" viewBox="' + def.viewBox + '" xmlns="' + SVGNS + '"' +
            (def.maxHeight ? ' style="max-height:' + def.maxHeight + 'px"' : '') + '>' + (def.backdrop || '') + body + '</svg></div>';
        host.appendChild(root);
        const ctl = MSC.drawAlong(root, def);
        diagrams[def.name || ('d' + Object.keys(diagrams).length)] = { root, def, ctl };
        if (def.name) fillRecordDiagram(def.name);
        return ctl;
    };

    /* Static, fully drawn copy of a diagram (for the record sheet). */
    MSC.staticSVG = function (name) {
        const d = diagrams[name];
        if (!d) return null;
        const svg = d.root.querySelector('svg').cloneNode(true);
        svg.querySelectorAll('.draw-pen-dot').forEach(p => p.remove());
        svg.querySelectorAll('[data-step]').forEach(g => { g.style.visibility = 'visible'; });
        svg.querySelectorAll('*').forEach(el => { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; el.style.opacity = ''; el.style.fillOpacity = ''; });
        return svg;
    };
    function fillRecordDiagram(name) {
        document.querySelectorAll('.rec-diagram[data-diagram="' + name + '"]').forEach(slot => {
            const svg = MSC.staticSVG(name);
            if (!svg) return;
            slot.innerHTML = '';
            slot.appendChild(svg);
            const t = slot.dataset.caption || diagrams[name].def.title;
            if (t) slot.appendChild(MSC.el('div', { class: 'rec-cap' }, fmtHTML(t)));
        });
    }
    MSC.fillRecordDiagram = fillRecordDiagram;

    // ---------------------------------------------------------------- flowchart generator
    /* spec = { cx, top, nodes: [ { id, type: 'term'|'proc'|'io'|'dec', text: 'line1\nline2',
                 branch: { to: id, label: 'Yes', side: 'right'|'left', lane: 0 }, downLabel: 'No',
                 caption } ] }
       Returns { viewBox, steps } ready for MSC.diagram. Loop-back edges are drawn with the decision;
       forward (skip) edges are drawn with their target node. */
    MSC.flowchart = function (spec) {
        const cx = spec.cx || 300, gap = spec.gap || 30, fs = spec.fontSize || 13;
        const lineH = fs + 4;
        let y = spec.top || 20;
        const nodes = spec.nodes.map(n => Object.assign({}, n));
        const byId = {};
        nodes.forEach(n => {
            const lines = String(n.text).split('\n');
            const longest = Math.max.apply(null, lines.map(l => l.replace(/_\{|\}|!\{|\^\{/g, '').length));
            n.lines = lines;
            n.w = n.type === 'dec' ? Math.max(170, longest * fs * 0.62 + 70) : Math.max(n.type === 'term' ? 110 : 150, longest * fs * 0.6 + 34);
            n.h = n.type === 'dec' ? Math.max(70, lines.length * lineH + 44) : Math.max(n.type === 'term' ? 36 : 40, lines.length * lineH + 18);
            n.y = y; n.cy = y + n.h / 2;
            y += n.h + gap;
            byId[n.id] = n;
        });
        const maxW = Math.max.apply(null, nodes.map(n => n.w));
        const laneX = (side, lane) => cx + (side === 'left' ? -1 : 1) * (maxW / 2 + 30 + (lane || 0) * 26);
        const steps = [];
        const extra = {}; // forward edges attached to target
        nodes.forEach((n, i) => {
            let s = '';
            const x0 = cx - n.w / 2, x1 = cx + n.w / 2;
            if (n.type === 'term') s += S.rect(x0, n.y, n.w, n.h, { rx: n.h / 2 });
            else if (n.type === 'proc') s += S.rect(x0, n.y, n.w, n.h);
            else if (n.type === 'io') s += S.poly([[x0 + 12, n.y], [x1 + 12, n.y], [x1 - 12, n.y + n.h], [x0 - 12, n.y + n.h]]);
            else if (n.type === 'dec') s += S.poly([[cx, n.y], [x1, n.cy], [cx, n.y + n.h], [x0, n.cy]]);
            const startY = n.cy - (n.lines.length - 1) * lineH / 2;
            n.lines.forEach((l, k) => { s += S.text(cx, startY + k * lineH, l, { size: fs }); });
            // arrow from previous node
            if (i > 0 && !nodes[i - 1].end) {
                const p = nodes[i - 1];
                s = S.arrow(cx, p.y + p.h, cx, n.y, { size: 8 }) + (p.downLabel ? S.text(cx + 8, p.y + p.h + gap / 2, p.downLabel, { anchor: 'start', size: 12 }) : '') + s;
            }
            // branch
            if (n.branch) {
                const b = n.branch, t = byId[b.to], side = b.side || 'right';
                const vx = side === 'left' ? cx - n.w / 2 : cx + n.w / 2;
                const lx = laneX(side, b.lane);
                const tx = side === 'left' ? cx - t.w / 2 - (t.type === 'io' ? 6 : 0) : cx + t.w / 2 + (t.type === 'io' ? 6 : 0);
                const ty = t.cy;
                let e = S.wire([[vx, n.cy], [lx, n.cy], [lx, ty]]) + S.arrow(lx, ty, tx, ty, { size: 8 });
                e += S.text(side === 'left' ? vx - 6 : vx + 6, n.cy - 10, b.label || 'Yes', { anchor: side === 'left' ? 'end' : 'start', size: 12 });
                if (t.y < n.y) s += e; else (extra[b.to] = extra[b.to] || []).push(e);
            }
            steps.push({ c: n.caption || ('Draw the ' + ({ term: 'terminal', proc: 'process box', io: 'input/output box', dec: 'decision diamond' }[n.type]) + ': ' + n.lines.join(' ')), s, id: n.id });
        });
        steps.forEach(st => { if (extra[st.id]) st.s += extra[st.id].join(''); });
        const lanes = nodes.filter(n => n.branch).map(n => Math.abs(laneX(n.branch.side || 'right', n.branch.lane) - cx));
        const half = Math.max(maxW / 2, ...lanes) + 40;
        return { viewBox: (cx - half) + ' 0 ' + (half * 2) + ' ' + (y + 10 - gap), steps };
    };

    // ---------------------------------------------------------------- viva
    MSC.viva = function (target, items) {
        const host = $(target);
        const tools = MSC.el('div', { class: 'viva-tools' }, '<button class="btn btn-sm">Show all answers</button>');
        const list = MSC.el('div', { class: 'viva-list' });
        list.innerHTML = items.map((it, i) =>
            '<details class="viva-item"><summary><span class="qn">Q' + (i + 1) + '.</span><span>' + fmtHTML(it.q) + '</span></summary><div class="ans">' + it.a + '</div></details>').join('');
        host.appendChild(tools);
        host.appendChild(list);
        let open = false;
        tools.querySelector('button').addEventListener('click', e => {
            open = !open;
            list.querySelectorAll('details').forEach(d => { d.open = open; });
            e.target.textContent = open ? 'Hide all answers' : 'Show all answers';
        });
    };

    // ---------------------------------------------------------------- tables
    /* head: array of header rows; each cell is a string or {t, colspan, rowspan}. rows: array of arrays. */
    MSC.table = function (head, rows, o) {
        o = o || {};
        const cell = (tag, c) => {
            if (c === null || c === undefined) c = '';
            if (typeof c !== 'object') c = { t: c };
            return '<' + tag + (c.colspan ? ' colspan="' + c.colspan + '"' : '') + (c.rowspan ? ' rowspan="' + c.rowspan + '"' : '') +
                (c.cls ? ' class="' + c.cls + '"' : '') + '>' + (c.raw ? c.t : fmtHTML(c.t)) + '</' + tag + '>';
        };
        const hl = o.highlight === undefined ? -1 : o.highlight;
        return '<div class="table-wrap"><table class="obs ' + (o.cls || '') + '">' +
            (head && head.length ? '<thead>' + head.map(r => '<tr>' + r.map(c => cell('th', c)).join('') + '</tr>').join('') + '</thead>' : '') +
            '<tbody>' + rows.map((r, i) => '<tr' + (i === hl ? ' class="hl"' : '') + '>' + r.map(c => cell('td', c)).join('') + '</tr>').join('') + '</tbody></table></div>';
    };

    // ---------------------------------------------------------------- record sheet
    MSC.initRecord = function () {
        document.querySelectorAll('[data-print-record]').forEach(b => b.addEventListener('click', () => {
            Object.keys(diagrams).forEach(fillRecordDiagram);
            global.print();
        }));
        document.querySelectorAll('[data-refresh-record]').forEach(b => b.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('msc:record'));
        }));
    };

    // ---------------------------------------------------------------- boot
    function boot() {
        initTabs();
        initSectionNav();
        MSC.initRecord();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})(window);
