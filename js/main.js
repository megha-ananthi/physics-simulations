/* ============================================
   Physics Simulations Suite - Hub Page JS
   Particle background + Fun facts rotator
   ============================================ */

(function () {
    'use strict';

    // --- Particle Background ---
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const COLORS = [
        'rgba(74, 144, 217, 0.35)',   // magnetic blue
        'rgba(232, 104, 48, 0.30)',    // heating orange
        'rgba(76, 175, 80, 0.30)',     // chemical green
        'rgba(107, 63, 160, 0.25)',    // purple accent
    ];

    let particles = [];
    let width, height;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function createParticles() {
        const count = width < 768 ? 25 : 50;
        particles = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 3 + 1.5,
                dx: (Math.random() - 0.5) * 0.6,
                dy: (Math.random() - 0.5) * 0.6,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
            });
        }
    }

    function drawParticles() {
        ctx.clearRect(0, 0, width, height);
        for (const p of particles) {
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
            if (p.y < -10) p.y = height + 10;
            if (p.y > height + 10) p.y = -10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }
    }

    function animateParticles() {
        drawParticles();
        requestAnimationFrame(animateParticles);
    }

    resize();
    createParticles();
    if (!reducedMotion) {
        animateParticles();
    } else {
        drawParticles(); // draw once, static
    }

    window.addEventListener('resize', () => {
        resize();
        createParticles();
        if (reducedMotion) drawParticles();
    });

    // --- Fun Facts Rotator ---
    const facts = [
        "\u{1F4A1} A bolt of lightning is about 5 times hotter than the surface of the Sun!",
        "\u{1F9F2} Hans Christian \u00D8rsted discovered that electricity creates magnetism in 1820 \u2014 by accident!",
        "\u{26A1} Electric current travels through copper wire at close to the speed of light!",
        "\u{1F34B} You would need about 5,000 lemons to charge a smartphone battery!",
        "\u{1F525} Nichrome wire is used in toasters and hair dryers because it gets hot without melting!",
        "\u{1F9EA} The first battery was invented by Alessandro Volta in 1800 using zinc and copper discs!",
        "\u{1F50B} Electric eels can produce shocks of up to 860 volts \u2014 that\u2019s like 570 AA batteries!",
        "\u{2744}\uFE0F Superconductors can carry electricity with zero resistance when cooled to extreme temperatures!",
    ];

    const factEl = document.getElementById('fact-text');
    if (factEl) {
        let factIndex = Math.floor(Math.random() * facts.length);

        function showFact() {
            factEl.style.opacity = '0';
            setTimeout(() => {
                factEl.innerHTML = '<span class="fact-icon">\u{26A1}</span> ' + facts[factIndex];
                factEl.style.opacity = '1';
                factIndex = (factIndex + 1) % facts.length;
            }, 400);
        }

        showFact();
        setInterval(showFact, 5000);
    }
})();
