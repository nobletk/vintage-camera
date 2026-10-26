document.addEventListener('DOMContentLoaded', () => {

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    function rng(seed) {                       
        let s = seed >>> 0;
        return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    }

    // Mountain / hill line. `peaky` gives sharp summits, otherwise soft hills.
    function ridgePath(seed, W, H, base, amp, peaky) {
        const r = rng(seed);
        const p1 = r() * 6, p2 = r() * 6, p3 = r() * 6;
        const k1 = 1 / (peaky ? 230 : 330), k2 = 1 / (peaky ? 97 : 150), k3 = 1 / 41;
        let d = `M0 ${H} `;
        for (let x = 0; x <= W; x += 12) {
            const n = 0.55 * Math.sin(x * k1 + p1) + 0.3 * Math.sin(x * k2 + p2) + 0.15 * Math.sin(x * k3 + p3);
            const m = peaky ? Math.abs(n) : (n + 1) / 2;
            const y = H * base + H * amp * m + (peaky ? (r() - 0.5) * 3 : 0);
            d += `L${x} ${y.toFixed(1)} `;
        }
        return d + `L${W} ${H} Z`;
    }

    // A row of layered pine trees along the bottom edge.
    function pinesPath(seed, W, H, minH, maxH, gap) {
        const r = rng(seed);
        let d = `M0 ${H} L0 ${H - 14} `;
        let trees = '';
        for (let x = -10; x < W + 20; x += gap * (0.6 + r() * 0.9)) {
            const h = minH + r() * (maxH - minH);
            const w = h * 0.2;
            const top = H - h;
            for (let t = 0; t < 4; t++) {
                const ty = top + t * h * 0.2;
                const hw = w * (0.45 + t * 0.3);
                trees += `M${(x).toFixed(1)} ${ty.toFixed(1)} L${(x + hw).toFixed(1)} ${(ty + h * 0.3).toFixed(1)} L${(x - hw).toFixed(1)} ${(ty + h * 0.3).toFixed(1)} Z `;
            }
            trees += `M${x - 2} ${H - 14} h4 v14 h-4 Z `;
        }
        return d + `L${W} ${H - 14} L${W} ${H} Z ` + trees;
    }

    const NS = 'http://www.w3.org/2000/svg';
    function svg(viewBox, inner, slice) {
        const s = document.createElementNS(NS, 'svg');
        s.setAttribute('viewBox', viewBox);
        s.setAttribute('preserveAspectRatio', slice ? 'xMidYMax slice' : 'none');
        s.setAttribute('aria-hidden', 'true');
        s.innerHTML = inner;
        return s;
    }
    const fillPath = (d, color) => `<path d="${d}" style="fill:${color || 'var(--fill)'}"/>`;

    const RIDGES = {   // seed, base, amp, peaky
        far:    [11, 0.12, 0.55, true],
        mid:    [29, 0.22, 0.5, true],
        hills:  [47, 0.18, 0.4, false],
        ground: [83, 0.35, 0.45, false]
    };

    document.querySelectorAll('.layer.ridge').forEach((layer, i) => {
        const [seed, base, amp, peaky] = RIDGES[layer.dataset.ridge];
        // different scenes get different silhouettes
        const offset = layer.closest('.scenery-band') ? 100 : 0;
        layer.appendChild(svg('0 0 1440 400', fillPath(ridgePath(seed + offset, 1440, 400, base, amp, peaky))));
    });
    document.querySelectorAll('.layer.forest').forEach(layer => {
        const offset = layer.closest('.scenery-band') ? 7 : 0;
        layer.appendChild(svg('0 0 1440 300', fillPath(pinesPath(5 + offset, 1440, 300, 90, 210, 26))));
    });

    // Focus-lab scene: three depth planes that blur independently.
    const labFar = document.querySelector('.dof-plane.scene-far');
    const labMid = document.querySelector('.dof-plane.scene-mid');
    const labNear = document.querySelector('.dof-plane.scene-near');
    if (labFar && labMid && labNear) {
        labFar.appendChild(svg('0 0 1440 700', `
            <defs>
                <linearGradient id="labSky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#0a1612"/><stop offset=".45" stop-color="#1f4a3e"/>
                    <stop offset=".7" stop-color="#c78a52"/><stop offset="1" stop-color="#f1c185"/>
                </linearGradient>
                <radialGradient id="labSun"><stop offset="0" stop-color="#fff3d6"/><stop offset=".5" stop-color="#ffd9a0"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/></radialGradient>
            </defs>
            <rect width="1440" height="700" fill="url(#labSky)"/>
            <circle cx="980" cy="380" r="150" fill="url(#labSun)" opacity=".8"/>
            <circle cx="980" cy="380" r="46" fill="#fff3d6"/>
            ${fillPath(ridgePath(61, 1440, 700, 0.42, 0.3, true), '#3b6158')}
            ${fillPath(ridgePath(73, 1440, 700, 0.55, 0.25, true), '#2a4a43')}
        `, true));
        labMid.appendChild(svg('0 0 1440 700', `
            ${fillPath(ridgePath(91, 1440, 700, 0.6, 0.25, false), '#173229')}
            ${fillPath(pinesPath(17, 1440, 700, 150, 330, 34), '#0f221b')}
        `, true));
        labNear.appendChild(svg('0 0 1440 700', `
            ${fillPath(pinesPath(3, 400, 700, 420, 640, 90).replace(/M0 700/, 'M0 700'), '#050806')}
            <g transform="translate(1040 0)">${fillPath(pinesPath(9, 400, 700, 380, 600, 80), '#050806')}</g>
            ${fillPath(ridgePath(5, 1440, 700, 0.9, 0.1, false), '#050806')}
        `, true));
    }


    // Parallax engine
    const scenes = [...document.querySelectorAll('.scene')].map(el => ({
        el,
        anchorTop: el.id === 'hero',
        visible: el.id === 'hero',
        content: el.querySelector('.hero-content-layer'),
        layers: [...el.querySelectorAll(':scope > .layer')].map(l => ({
            el: l,
            speed: parseFloat(l.dataset.speed) || 0,
            mouse: parseFloat(l.dataset.mouse) || 0
        }))
    }));

    const sceneObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            const s = scenes.find(s => s.el === e.target);
            if (s) s.visible = e.isIntersecting;
        });
        schedule();
    }, { rootMargin: '120px 0px' });
    scenes.forEach(s => sceneObserver.observe(s.el));

    const cardsGrid = document.getElementById('cardsGrid');
    const floatCards = [...document.querySelectorAll('[data-float]')];

    let mx = 0, my = 0, cx = 0, cy = 0, ticking = false;

    window.addEventListener('mousemove', e => {
        mx = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
        my = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
        schedule();
    }, { passive: true });
    document.addEventListener('mouseleave', () => { mx = 0; my = 0; schedule(); });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    function schedule() {
        if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }

    function frame() {
        ticking = false;
        cx += (mx - cx) * 0.1;
        cy += (my - cy) * 0.1;
        render();
        if (Math.abs(mx - cx) > 0.002 || Math.abs(my - cy) > 0.002) schedule();
    }

    function render() {
        const vh = window.innerHeight;

        scenes.forEach(scene => {
            if (!scene.visible) return;
            const rect = scene.el.getBoundingClientRect();
            const delta = scene.anchorTop ? -rect.top : (vh / 2 - (rect.top + rect.height / 2));

            scene.layers.forEach(layer => {
                const y = reduceMotion ? 0 : delta * (1 - layer.speed) + cy * layer.mouse * 14;
                const x = reduceMotion ? 0 : cx * layer.mouse * 26;
                layer.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
            });

            // Hero copy 
            if (scene.content && !reduceMotion) {
                const p = clamp(-rect.top / rect.height, 0, 1);
                scene.content.style.opacity = (1 - p * 1.7).toFixed(3);
            }
        });

        if (reduceMotion) return;

        // Camera cards drift 
        if (cardsGrid) {
            const g = cardsGrid.getBoundingClientRect();
            const p = clamp(g.top + g.height / 2 - vh / 2, -vh, vh);
            floatCards.forEach(card => {
                card.style.translate = `0 ${(p * parseFloat(card.dataset.float)).toFixed(1)}px`;
                const wrap = card.querySelector('.card-image-wrapper');
                const img = wrap && wrap.querySelector('img');
                if (img) {
                    const r = wrap.getBoundingClientRect();
                    const c = r.top + r.height / 2 - vh / 2;
                    img.style.translate = `0 ${clamp(c * 0.09, -38, 38).toFixed(1)}px`;
                }
            });
        }
    }
    render();


    /* ------------------------------------------------------------------
       2. Rack-focus reveal (blur -> sharp as elements enter the view)
       ------------------------------------------------------------------ */
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const el = e.target;
            const idx = [...el.parentElement.children].filter(c => c.classList.contains('reveal')).indexOf(el);
            el.style.transitionDelay = `${Math.max(idx, 0) * 120}ms`;
            el.classList.add('in');
            setTimeout(() => { el.style.transitionDelay = ''; }, 1500);
            revealObserver.unobserve(el);
        });
    }, { threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


    /* ------------------------------------------------------------------
       3. 3D tilt cards
       ------------------------------------------------------------------ */
    document.querySelectorAll('.camera-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const rotateX = -((y - rect.height / 2) / (rect.height / 2)) * 12;
            const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 12;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

            const glare = card.querySelector('.card-glare');
            if (glare) {
                glare.style.background = `radial-gradient(circle at ${(x / rect.width) * 100}% ${(y / rect.height) * 100}%, rgba(255,255,255,0.25) 0%, transparent 70%)`;
            }
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        });
    });


    /* ------------------------------------------------------------------
       4. Focus simulator: each depth plane blurs by its distance from
          the focus point; a wider aperture shrinks the sharp zone.
       ------------------------------------------------------------------ */
    const focusRange = document.getElementById('focusRange');
    const apertureRange = document.getElementById('apertureRange');
    const bokehOverlay = document.getElementById('bokehOverlay');
    const reticle = document.getElementById('focusReticle');
    const badge = document.getElementById('focusBadge');
    const focusReadout = document.getElementById('focusReadout');
    const apertureReadout = document.getElementById('apertureReadout');
    const planes = [...document.querySelectorAll('.dof-plane')];
    const FSTOPS = ['16', '11', '8', '5.6', '4', '2.8', '2.4', '2', '1.7', '1.4'];

    function updateLensLab() {
        const focus = parseInt(focusRange.value, 10);
        const ap = parseInt(apertureRange.value, 10);
        const tolerance = (11 - ap) * 3;          // sharp zone, in focus-units
        let locked = false;

        planes.forEach(plane => {
            const diff = Math.abs(focus - parseFloat(plane.dataset.depth));
            const blur = Math.min(14, Math.max(0, diff - tolerance) * (0.04 + ap * 0.02));
            plane.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
            if (diff <= tolerance + 2) locked = true;
        });

        reticle.classList.toggle('locked', locked);
        badge.classList.toggle('locked', locked);
        badge.textContent = locked ? '● IN FOCUS' : '○ HUNTING…';
        focusReadout.textContent = focus < 33 ? 'near' : focus < 72 ? 'mid' : 'far';
        apertureReadout.textContent = `f/${FSTOPS[ap - 1]}`;
        bokehOverlay.style.boxShadow = `inset 0 0 ${30 + ap * 10}px rgba(0,0,0,${(0.45 + ap * 0.03).toFixed(2)})`;
    }
    if (focusRange && apertureRange) {
        focusRange.addEventListener('input', updateLensLab);
        apertureRange.addEventListener('input', updateLensLab);
        updateLensLab();
    }


    /* ------------------------------------------------------------------
       5. Shutter: blades close, flash, blades reopen + mechanical click
       ------------------------------------------------------------------ */
    const shutterOverlay = document.getElementById('shutterOverlay');
    const flashEl = shutterOverlay && shutterOverlay.querySelector('.shutter-flash');
    let audioCtx = null;

    function click(ctx, when, type, f0, f1, dur, vol) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f0, when);
        osc.frequency.exponentialRampToValueAtTime(f1, when + dur);
        gain.gain.setValueAtTime(vol, when);
        gain.gain.exponentialRampToValueAtTime(0.01, when + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(when);
        osc.stop(when + dur);
    }

    function playShutterSound() {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            audioCtx = audioCtx || new AC();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const t = audioCtx.currentTime;
            click(audioCtx, t + 0.08, 'triangle', 180, 40, 0.04, 0.8);   // front curtain
            click(audioCtx, t + 0.30, 'square', 260, 80, 0.06, 0.6);    // rear curtain
        } catch (e) {
            console.log('AudioContext not supported or blocked.');
        }
    }

    function fireShutter() {
        playShutterSound();
        if (shutterOverlay) {
            shutterOverlay.classList.remove('firing');
            void shutterOverlay.offsetWidth;            // restart the animation
            shutterOverlay.classList.add('firing');
        }
        const vf = document.querySelector('.viewfinder-frame');
        if (vf) {
            vf.style.borderColor = 'rgba(255, 255, 255, 0.9)';
            setTimeout(() => { vf.style.borderColor = 'rgba(8, 13, 10, 0.4)'; }, 150);
        }
    }
    if (flashEl) flashEl.addEventListener('animationend', () => shutterOverlay.classList.remove('firing'));

    ['globalShutter', 'labShutter'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', fireShutter);
    });
});
