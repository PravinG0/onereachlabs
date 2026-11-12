(() => {
  'use strict';

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function createRng(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* =========================================================================
     ONEREACH LABS RADIAL NETWORK DATA
     ========================================================================= */
  const CAPABILITY_TRACKS = [
    {
      id: 'intel',
      color: '#f59e0b',
      labels: [
        'Company intel · Tech stack & funding',
        'Account brief · 40-person agency',
        'Competitor positioning scan',
        'Market ICP mapping · Active'
      ]
    },
    {
      id: 'discovery',
      color: '#34d399',
      labels: [
        '300M+ verified B2B contacts',
        '50 dental clinics in Texas',
        'VP Sales · Series A fintech',
        'Custom scraped niche directory'
      ]
    },
    {
      id: 'signals',
      color: '#60a5fa',
      labels: [
        '41 accounts showing buying signals',
        'Downloaded pricing guide twice',
        'New leadership · Hiring spike',
        'Funding round signal detected'
      ]
    },
    {
      id: 'enrichment',
      color: '#fb7185',
      labels: [
        '99% verified contact coverage',
        'Fallback email + direct mobile',
        'LinkedIn profile + phone verified',
        'CRM record auto-enriched'
      ]
    },
    {
      id: 'drafter',
      color: '#facc15',
      labels: [
        'Message drafter · Personal hook',
        'Inbound case study matched',
        'Landing page copy aligned',
        '70% agent draft · 30% human review'
      ]
    },
    {
      id: 'sequences',
      color: '#e879f9',
      labels: [
        'LinkedIn + Email + SMS + WhatsApp',
        'No reply in 3 days · Try SMS',
        'Multi-channel timing optimized',
        'Outbound + inbound unified'
      ]
    },
    {
      id: 'followup',
      color: '#22d3ee',
      labels: [
        'Instant lead response · < 3 min',
        'Replied: "Send times for Thursday"',
        'Cold lead re-engaged on WhatsApp',
        'Objection handled by Sophia'
      ]
    },
    {
      id: 'pipeline',
      color: '#f3f4f6',
      labels: [
        'Booked 3 meetings overnight',
        'Google & Outlook calendar synced',
        '18 meetings/month average',
        '3× baseline qualified target'
      ]
    }
  ];

  /* =========================================================================
     MODULE 1: INTERACTIVE RADIAL FIBER-OPTIC BURST
     ========================================================================= */
  function initRadialBurst() {
    const stage = document.getElementById('radial-stage');
    const canvas = document.getElementById('radial-canvas');
    const crosshair = document.getElementById('radial-crosshair');
    const tooltip = document.getElementById('radial-tooltip');
    const legendButtons = Array.from(document.querySelectorAll('#industry-list .industry-item'));

    if (!stage || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rng = createRng(42071);
    const totalRays = 270;
    const rays = [];

    for (let i = 0; i < totalRays; i += 1) {
      const progress = i / (totalRays - 1);
      // Fan from -172 deg (left horizon) to -8 deg (right horizon)
      const baseAngle = lerp(-Math.PI * 0.955, -Math.PI * 0.045, progress);
      const jitterAngle = (rng() - 0.5) * 0.032;
      const trackIndex = Math.floor(rng() * CAPABILITY_TRACKS.length);
      const track = CAPABILITY_TRACKS[trackIndex];
      const radiusFactor = 0.34 + Math.pow(rng(), 0.72) * 0.65;
      const dotRadius = 1.35 + rng() * 1.85;
      const baseAlpha = 0.35 + rng() * 0.55;
      const pulsePhase = rng() * Math.PI * 2;
      const pulseSpeed = 0.8 + rng() * 1.3;
      const label = track.labels[Math.floor(rng() * track.labels.length)];

      rays.push({
        angle: baseAngle + jitterAngle,
        radiusFactor,
        dotRadius,
        baseAlpha,
        pulsePhase,
        pulseSpeed,
        trackId: track.id,
        color: track.color,
        label,
        x: 0,
        y: 0
      });
    }

    let width = 0;
    let height = 0;
    let dpr = 1;
    let originX = 0;
    let originY = 0;
    let maxRadius = 300;
    let pointerX = -9999;
    let pointerY = -9999;
    let pointerInside = false;
    let hoveredRay = null;
    let pinnedTrackId = null;
    let hoverTrackId = null;
    let isVisible = true;
    let rafId = 0;

    function updateLayout() {
      const rect = stage.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      originX = width * 0.5;
      originY = height - 10;
      maxRadius = Math.min(width * 0.47, height * 0.9);

      for (const ray of rays) {
        const dist = maxRadius * ray.radiusFactor;
        ray.x = originX + Math.cos(ray.angle) * dist;
        ray.y = originY + Math.sin(ray.angle) * dist;
      }
    }

    function updateHitTest() {
      if (!pointerInside) {
        hoveredRay = null;
        return;
      }

      const activeTrack = hoverTrackId || pinnedTrackId;
      let bestRay = null;
      let bestDistSq = 28 * 28;

      for (const ray of rays) {
        if (activeTrack && ray.trackId !== activeTrack) continue;
        const dx = ray.x - pointerX;
        const dy = ray.y - pointerY;
        const distSq = dx * dx + dy * dy;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestRay = ray;
        }
      }

      hoveredRay = bestRay;
    }

    function updateTooltipAndCursor() {
      if (crosshair) {
        if (pointerInside) {
          stage.classList.add('has-crosshair');
          crosshair.style.opacity = '1';
          crosshair.style.transform = `translate3d(${(pointerX - 9).toFixed(1)}px, ${(pointerY - 9).toFixed(1)}px, 0)`;
        } else {
          stage.classList.remove('has-crosshair');
          crosshair.style.opacity = '0';
        }
      }

      if (!tooltip) return;

      if (hoveredRay) {
        const clampedX = clamp(hoveredRay.x, 96, Math.max(96, width - 96));
        const clampedY = Math.max(42, hoveredRay.y);
        tooltip.textContent = hoveredRay.label;
        tooltip.style.setProperty('--pill-color', hoveredRay.color);
        tooltip.style.left = `${clampedX.toFixed(1)}px`;
        tooltip.style.top = `${clampedY.toFixed(1)}px`;
        tooltip.hidden = false;
      } else {
        tooltip.hidden = true;
      }
    }

    function drawFrame(nowMs) {
      const timeSec = prefersReducedMotion.matches ? 0 : nowMs * 0.001;
      const activeTrack = hoverTrackId || pinnedTrackId;

      ctx.clearRect(0, 0, width, height);

      // Soft bottom-center origin glow
      const originGlow = ctx.createRadialGradient(originX, originY, 0, originX, originY, maxRadius * 0.55);
      originGlow.addColorStop(0, 'rgba(143, 166, 255, 0.22)');
      originGlow.addColorStop(0.55, 'rgba(30, 61, 180, 0.08)');
      originGlow.addColorStop(1, 'rgba(10, 22, 56, 0)');
      ctx.fillStyle = originGlow;
      ctx.beginPath();
      ctx.arc(originX, originY, maxRadius * 0.55, Math.PI, 0);
      ctx.fill();

      for (const ray of rays) {
        const isHovered = ray === hoveredRay;
        const matchesTrack = activeTrack ? ray.trackId === activeTrack : false;
        const dimmed = activeTrack && !matchesTrack && !isHovered;

        const shimmer = 0.82 + 0.18 * Math.sin(timeSec * ray.pulseSpeed + ray.pulsePhase);
        let lineAlpha = ray.baseAlpha * 0.34 * shimmer;
        let dotAlpha = ray.baseAlpha * shimmer;

        if (dimmed) {
          lineAlpha *= 0.24;
          dotAlpha *= 0.25;
        } else if (matchesTrack || isHovered) {
          lineAlpha = isHovered ? 0.85 : 0.55;
          dotAlpha = 1;
        }

        // Subtle ray stem
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(ray.x, ray.y);
        ctx.lineWidth = isHovered ? 1.45 : matchesTrack ? 1.05 : 0.7;
        ctx.strokeStyle =
          isHovered || matchesTrack
            ? hexToRgba(ray.color, lineAlpha)
            : `rgba(143, 166, 255, ${lineAlpha.toFixed(3)})`;
        ctx.stroke();

        // Outer halo on active/hovered nodes
        if (isHovered || matchesTrack) {
          ctx.beginPath();
          ctx.arc(ray.x, ray.y, isHovered ? ray.dotRadius * 3.4 : ray.dotRadius * 2.1, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(ray.color, isHovered ? 0.34 : 0.18);
          ctx.fill();
        }

        // Terminal node dot
        ctx.beginPath();
        ctx.arc(ray.x, ray.y, isHovered ? ray.dotRadius * 1.55 : ray.dotRadius, 0, Math.PI * 2);
        ctx.fillStyle =
          isHovered || matchesTrack
            ? hexToRgba(ray.color, dotAlpha)
            : `rgba(243, 245, 251, ${dotAlpha.toFixed(3)})`;
        ctx.fill();
      }
    }

    function loop(nowMs) {
      rafId = 0;
      if (!isVisible) return;
      drawFrame(nowMs);
      if (!prefersReducedMotion.matches) {
        rafId = window.requestAnimationFrame(loop);
      }
    }

    function requestSingleOrLoop() {
      if (prefersReducedMotion.matches) {
        drawFrame(0);
      } else if (!rafId && isVisible) {
        rafId = window.requestAnimationFrame(loop);
      }
    }

    stage.addEventListener('pointermove', (event) => {
      const rect = stage.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      pointerInside = true;
      updateHitTest();
      updateTooltipAndCursor();
      if (prefersReducedMotion.matches) drawFrame(0);
    });

    stage.addEventListener('pointerleave', () => {
      pointerInside = false;
      hoveredRay = null;
      updateTooltipAndCursor();
      if (prefersReducedMotion.matches) drawFrame(0);
    });

    legendButtons.forEach((btn) => {
      const id = btn.dataset.industry;
      btn.addEventListener('mouseenter', () => {
        hoverTrackId = id || null;
        updateHitTest();
        updateTooltipAndCursor();
        if (prefersReducedMotion.matches) drawFrame(0);
      });
      btn.addEventListener('mouseleave', () => {
        hoverTrackId = null;
        updateHitTest();
        updateTooltipAndCursor();
        if (prefersReducedMotion.matches) drawFrame(0);
      });
      btn.addEventListener('click', () => {
        pinnedTrackId = pinnedTrackId === id ? null : id || null;
        legendButtons.forEach((b) => {
          b.setAttribute('aria-pressed', b.dataset.industry === pinnedTrackId ? 'true' : 'false');
        });
        updateHitTest();
        updateTooltipAndCursor();
        if (prefersReducedMotion.matches) drawFrame(0);
      });
    });

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => {
        updateLayout();
        drawFrame(performance.now());
      });
      ro.observe(stage);
    } else {
      window.addEventListener('resize', () => {
        updateLayout();
        drawFrame(performance.now());
      });
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          isVisible = entries.some((entry) => entry.isIntersecting);
          if (isVisible) requestSingleOrLoop();
        },
        { threshold: 0 }
      );
      io.observe(stage);
    }

    updateLayout();
    requestSingleOrLoop();
  }

  function hexToRgba(hex, alpha) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(3)})`;
  }

  /* =========================================================================
     MODULE 2: WHITE PORTAL SILVER SUNBURST RAYS
     ========================================================================= */
  function initPortalRays() {
    const canvas = document.getElementById('portal-rays-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rng = createRng(99173);
    const rayAngles = [];
    // Left fan + right fan matching subtle silver edges
    for (let i = 0; i < 42; i += 1) {
      const side = i % 2 === 0 ? 1 : -1;
      const spread = (rng() - 0.5) * 0.72;
      const angle = side > 0 ? spread : Math.PI + spread;
      rayAngles.push({
        angle,
        alpha: 0.04 + rng() * 0.055,
        width: 0.7 + rng() * 0.8
      });
    }

    function draw() {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.48;
      const len = Math.hypot(w, h) * 0.75;

      for (const ray of rayAngles) {
        const x1 = cx + Math.cos(ray.angle) * (w * 0.14);
        const y1 = cy + Math.sin(ray.angle) * (h * 0.08);
        const x2 = cx + Math.cos(ray.angle) * len;
        const y2 = cy + Math.sin(ray.angle) * len;

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgba(10, 22, 56, 0)');
        grad.addColorStop(0.35, `rgba(30, 61, 180, ${(ray.alpha * 1.15).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(10, 22, 56, 0.015)');

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = ray.width;
        ctx.strokeStyle = grad;
        ctx.stroke();
      }
    }

    if ('ResizeObserver' in window) {
      new ResizeObserver(draw).observe(canvas);
    } else {
      window.addEventListener('resize', draw);
    }

    draw();
  }

  /* =========================================================================
     MODULE 3: SCROLL CHOREOGRAPHY (CURTAIN -> 3D TUNNEL -> WHITE PORTAL)
     ========================================================================= */
  function initChoreography() {
    const runway = document.getElementById('choreo-runway');
    const curtainTop = document.getElementById('curtain-top');
    const curtainBottom = document.getElementById('curtain-bottom');
    const centerBeam = document.getElementById('tunnel-center-beam');
    const ringsContainer = document.getElementById('tunnel-rings');
    const lasersContainer = document.getElementById('tunnel-lasers');
    const particlesContainer = document.getElementById('tunnel-particles');
    const whitePortal = document.getElementById('white-portal');
    const formWrap = document.getElementById('campaign-form-wrap');
    const cards = Array.from(document.querySelectorAll('#tunnel-cards .tunnel-card'));
    const orbArc = document.getElementById('orb-progress-arc');
    const orbDot = document.getElementById('orb-dot-group');

    const supportsNativeScrollTimeline = CSS.supports(
      '(animation-timeline: scroll()) and (animation-range: 0% 100%)'
    );

    function updateScrollOrbFallback() {
      if (supportsNativeScrollTimeline || !orbArc || !orbDot) return;
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const ratio = clamp(window.scrollY / scrollable, 0, 1);
      const circumference = 238.76;
      orbArc.style.strokeDashoffset = (circumference * (1 - ratio)).toFixed(2);
      orbDot.style.transform = `rotate(${(ratio * 360).toFixed(2)}deg)`;
    }

    if (prefersReducedMotion.matches || !runway) {
      updateScrollOrbFallback();
      window.addEventListener('scroll', updateScrollOrbFallback, { passive: true });
      return;
    }

    // Build concentric tunnel rings
    const ringCount = 6;
    const rings = [];
    for (let i = 0; i < ringCount; i += 1) {
      const el = document.createElement('div');
      el.className = 'tunnel-ring';
      ringsContainer.appendChild(el);
      rings.push(el);
    }

    // Build cobalt perspective laser streaks
    const laserAngles = [-26, 206, 25, 155, -13, 193];
    const lasers = laserAngles.map((deg, idx) => {
      const el = document.createElement('div');
      el.className = 'tunnel-laser';
      lasersContainer.appendChild(el);
      return { el, deg, phaseOffset: idx * 0.29 };
    });

    // Build subtle floating depth dust particles
    const particleRng = createRng(1337);
    const particles = [];
    for (let i = 0; i < 26; i += 1) {
      const el = document.createElement('div');
      el.className = 'tunnel-particle';
      particlesContainer.appendChild(el);
      particles.push({
        el,
        angle: particleRng() * Math.PI * 2,
        phase: particleRng(),
        size: 1.8 + particleRng() * 2.2
      });
    }

    const cardPeaks = [0.19, 0.305, 0.42, 0.535, 0.65, 0.765];
    const cardEnterSpan = 0.17;
    const cardExitSpan = 0.11;
    const cardTotalSpan = cardEnterSpan + cardExitSpan;
    const peakT = cardEnterSpan / cardTotalSpan;

    let targetP = 0;
    let currentP = 0;
    let rafId = 0;
    let isInteractive = false;

    function computeTargetProgress() {
      const rect = runway.getBoundingClientRect();
      const scrollable = Math.max(1, runway.offsetHeight - window.innerHeight);
      targetP = clamp(-rect.top / scrollable, 0, 1);
    }

    function render(p) {
      const mobile = window.innerWidth < 640;

      // 1. Split Curtain Shutters (0.02 -> 0.17)
      const curtainT = smoothstep(0.02, 0.17, p);
      if (curtainTop && curtainBottom) {
        curtainTop.style.transform = `translate3d(0, ${(-curtainT * 106).toFixed(3)}%, 0)`;
        curtainBottom.style.transform = `translate3d(0, ${(curtainT * 106).toFixed(3)}%, 0)`;
        const curtainHidden = curtainT > 0.96;
        curtainTop.style.pointerEvents = curtainHidden ? 'none' : 'auto';
        curtainBottom.style.pointerEvents = curtainHidden ? 'none' : 'auto';
      }

      // 2. White Portal Fade Mask & Expansion (0.66 -> 0.94)
      const portalT = smoothstep(0.66, 0.94, p);
      const portalOpacity = smoothstep(0.65, 0.72, p);
      const tunnelFadeOut = smoothstep(0.79, 0.9, p);

      if (centerBeam) {
        const beamOpacity = smoothstep(0.05, 0.16, p) * (1 - smoothstep(0.74, 0.88, p));
        centerBeam.style.opacity = beamOpacity.toFixed(3);
      }

      // 3. Concentric Rounded-Pill Tunnel Rings
      const travel = Math.max(0, (p - 0.02) / 0.86) * 5.2;
      const curtainReveal = smoothstep(0.015, 0.09, p);

      for (let i = 0; i < ringCount; i += 1) {
        const u = (((travel + i / ringCount) % 1) + 1) % 1;
        const scale = 0.14 * Math.pow(20, u);
        const fadeIn = smoothstep(0.0, 0.18, u);
        const fadeOut = 1 - smoothstep(0.76, 1.0, u);
        const alpha = fadeIn * fadeOut * (1 - tunnelFadeOut) * curtainReveal;
        rings[i].style.transform = `scale(${scale.toFixed(4)})`;
        rings[i].style.opacity = alpha.toFixed(3);
      }

      // 4. Diagonal Crimson Laser Streaks
      const laserGate = smoothstep(0.08, 0.18, p) * (1 - tunnelFadeOut);
      for (const item of lasers) {
        const lu = (((travel * 1.15 + item.phaseOffset) % 1) + 1) % 1;
        const dist = lerp(120, Math.max(window.innerWidth, window.innerHeight) * 0.72, lu);
        const sx = lerp(0.45, 1.5, lu);
        const alpha = Math.sin(lu * Math.PI) * 0.88 * laserGate;
        item.el.style.transform = `rotate(${item.deg}deg) translate3d(${dist.toFixed(1)}px, 0, 0) scaleX(${sx.toFixed(3)})`;
        item.el.style.opacity = alpha.toFixed(3);
      }

      // 5. Floating Dust Particles
      const halfW = window.innerWidth * 0.56;
      const halfH = window.innerHeight * 0.56;
      for (const pt of particles) {
        const pu = (((travel * 0.65 + pt.phase) % 1) + 1) % 1;
        const r = 0.12 + pu * 0.95;
        const px = window.innerWidth * 0.5 + Math.cos(pt.angle) * halfW * r;
        const py = window.innerHeight * 0.5 + Math.sin(pt.angle) * halfH * r;
        const pa = Math.sin(pu * Math.PI) * 0.45 * curtainReveal * (1 - tunnelFadeOut);
        pt.el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${(0.5 + pu * 0.8).toFixed(2)})`;
        pt.el.style.opacity = pa.toFixed(3);
      }

      // 6. Six Z-Depth Question Cards
      cards.forEach((card, idx) => {
        const peakP = cardPeaks[idx];
        const startP = peakP - cardEnterSpan;
        const t = (p - startP) / cardTotalSpan;

        if (t <= 0 || t >= 1) {
          card.style.opacity = '0';
          card.style.visibility = 'hidden';
          return;
        }

        let scale;
        let opacity;
        if (t <= peakT) {
          const a = t / peakT;
          const z = 1.85 * (1 - a);
          scale = 1 / (1 + z);
          opacity = smoothstep(0.0, 0.36, a);
        } else {
          const b = (t - peakT) / (1 - peakT);
          const z = -0.58 * b;
          scale = 1 / (1 + z);
          opacity = 1 - smoothstep(0.18, 0.92, b);
        }

        const align = card.dataset.align;
        let baseOffsetVw = 0;
        if (!mobile) {
          if (align === 'left') baseOffsetVw = -13.5;
          else if (align === 'right') baseOffsetVw = 13.5;
          else if (align === 'left-soft') baseOffsetVw = -8.5;
        }

        // Perspective lateral fan: emerges near center and tracks out smoothly
        const xVw = baseOffsetVw * Math.min(1.18, scale);

        card.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
        card.style.opacity = opacity.toFixed(3);
        card.style.zIndex = String(Math.round(scale * 100));
        card.style.transform = `translate3d(calc(-50% + ${xVw.toFixed(2)}vw), -50%, 0) scale(${scale.toFixed(4)})`;
      });

      // 7. White Rounded Portal Reveal
      if (whitePortal) {
        let vInset;
        let hInset;
        let radius;

        if (portalT <= 0.38) {
          const k = portalT / 0.38;
          vInset = lerp(46, 41, k);
          hInset = lerp(32, 18, k);
          radius = 999;
        } else if (portalT <= 0.75) {
          const k = (portalT - 0.38) / 0.37;
          vInset = lerp(41, 14, k);
          hInset = lerp(18, 2, k);
          radius = lerp(320, 96, k);
        } else {
          const k = (portalT - 0.75) / 0.25;
          vInset = lerp(14, 0, k);
          hInset = lerp(2, 0, k);
          radius = lerp(96, 0, k);
        }

        whitePortal.style.opacity = portalOpacity.toFixed(3);
        whitePortal.style.clipPath = `inset(${vInset.toFixed(2)}% ${hInset.toFixed(2)}% ${vInset.toFixed(2)}% ${hInset.toFixed(2)}% round ${radius.toFixed(1)}px)`;

        if (formWrap) {
          const formT = smoothstep(0.32, 0.85, portalT);
          formWrap.style.opacity = formT.toFixed(3);
          formWrap.style.transform = `scale(${(0.93 + 0.07 * formT).toFixed(4)})`;
        }

        const shouldBeInteractive = portalT >= 0.86;
        if (shouldBeInteractive !== isInteractive) {
          isInteractive = shouldBeInteractive;
          whitePortal.classList.toggle('is-interactive', isInteractive);
          whitePortal.setAttribute('aria-hidden', isInteractive ? 'false' : 'true');
        }
      }
    }

    function tick() {
      rafId = 0;
      const diff = targetP - currentP;
      if (Math.abs(diff) < 0.0002) {
        currentP = targetP;
        render(currentP);
        return;
      }
      currentP += diff * 0.16;
      render(currentP);
      rafId = window.requestAnimationFrame(tick);
    }

    function onScrollOrResize() {
      computeTargetProgress();
      updateScrollOrbFallback();
      if (!rafId) {
        rafId = window.requestAnimationFrame(tick);
      }
    }

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    computeTargetProgress();
    currentP = targetP;
    render(currentP);
    updateScrollOrbFallback();
  }

  /* =========================================================================
     MODULE 4: FORM VALIDATION, ARIA SYNC & LIVE COMPLETION PROGRESS
     ========================================================================= */
  function initCampaignForm() {
    const form = document.getElementById('campaign-form');
    if (!form) return;

    const hexDots = Array.from(document.querySelectorAll('#hex-dots i'));
    const progressText = document.getElementById('form-progress-text');
    const statusBanner = document.getElementById('form-status-banner');
    const submitBtn = document.getElementById('submit-btn');

    const trackedFields = [
      document.getElementById('first-name'),
      document.getElementById('last-name'),
      document.getElementById('work-email'),
      document.getElementById('primary-need'),
      document.getElementById('consent-check')
    ].filter(Boolean);

    function updateProgressDots() {
      let filled = 0;
      for (const el of trackedFields) {
        if (el.type === 'checkbox') {
          if (el.checked) filled += 1;
        } else if (el.value.trim() !== '') {
          filled += 1;
        }
      }

      hexDots.forEach((dot, index) => {
        dot.classList.toggle('is-filled', index < filled);
      });

      if (progressText) {
        if (filled === 0) progressText.textContent = 'Not started';
        else if (filled < trackedFields.length) progressText.textContent = `${filled} of ${trackedFields.length} complete`;
        else progressText.textContent = 'Ready to book';
      }
    }

    // Link error id into aria-describedby only while invalid
    const linkError = (el, shown) => {
      const errorId = el.dataset.error;
      if (!errorId) return;
      const ids = (el.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter((id) => id && id !== errorId);
      if (shown) ids.push(errorId);
      if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
      else el.removeAttribute('aria-describedby');
    };

    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'visually-hidden';
    document.body.append(announcer);

    let announceTimer;
    let announcedField;

    const spokenText = (node) => {
      const copy = node.cloneNode(true);
      copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
      copy.querySelectorAll('[role="img"][aria-label]').forEach((n) => n.replaceWith(`${n.getAttribute('aria-label')}: `));
      return copy.textContent.replace(/\s+/g, ' ').trim();
    };

    const announceError = (el) => {
      const error = document.getElementById(el.dataset.error);
      if (!error) return;
      const label = el.labels?.[0] ? `${spokenText(el.labels[0])}: ` : '';
      window.clearTimeout(announceTimer);
      announcer.textContent = '';
      announcedField = el;
      announceTimer = window.setTimeout(() => {
        announcer.textContent = label + spokenText(error);
      }, 450);
    };

    const supportsUserInvalid = CSS.supports('selector(:user-invalid)');
    const dirtyState = new WeakMap();
    const flagged = new WeakSet();
    const announced = new WeakSet();

    const syncFieldState = (el, announce = false, forceCheck = false) => {
      if (!el.matches?.('input, select, textarea')) return;

      let invalid = false;
      if (forceCheck) {
        invalid = !el.validity.valid;
        el.classList.toggle('user-invalid-fallback', invalid);
        el.classList.toggle('user-valid-fallback', !invalid);
      } else if (supportsUserInvalid) {
        if (el.validity.valid) {
          el.classList.remove('user-invalid-fallback');
        }
        invalid = el.matches(':user-invalid') || el.classList.contains('user-invalid-fallback');
      } else {
        const state = dirtyState.get(el);
        if (state && state.hasInteracted && state.hasBlurred) {
          invalid = !el.validity.valid;
          el.classList.toggle('user-invalid-fallback', invalid);
          el.classList.toggle('user-valid-fallback', !invalid);
        }
      }

      if (invalid) {
        if (announce && !announced.has(el)) {
          announceError(el);
          announced.add(el);
        }
        el.setAttribute('aria-invalid', 'true');
        linkError(el, true);
        flagged.add(el);
      } else if (flagged.has(el) || el.getAttribute('aria-invalid') !== 'true') {
        el.setAttribute('aria-invalid', 'false');
        linkError(el, false);
        flagged.delete(el);
        announced.delete(el);
        if (announcedField === el) {
          window.clearTimeout(announceTimer);
          announcer.textContent = '';
        }
      }
    };

    form.querySelectorAll('input, select, textarea').forEach((el) => syncFieldState(el));

    form.addEventListener(
      'blur',
      (e) => {
        const target = e.target;
        if (!target.checkValidity) return;
        const state = dirtyState.get(target) || { hasInteracted: false, hasBlurred: false };
        state.hasBlurred = true;
        dirtyState.set(target, state);
        syncFieldState(target, true);
      },
      true
    );

    form.addEventListener('input', (e) => {
      const target = e.target;
      updateProgressDots();
      if (target.checkValidity) {
        const state = dirtyState.get(target) || { hasInteracted: false, hasBlurred: false };
        state.hasInteracted = true;
        dirtyState.set(target, state);
      }
      if (target.hasAttribute('aria-invalid')) {
        syncFieldState(target, false);
      }
    });

    form.addEventListener(
      'change',
      (e) => {
        const target = e.target;
        updateProgressDots();
        if (target.checkValidity) {
          const state = dirtyState.get(target) || { hasInteracted: false, hasBlurred: false };
          state.hasInteracted = true;
          state.hasBlurred = true;
          dirtyState.set(target, state);
        }
        syncFieldState(target, true);
      },
      true
    );

    form.addEventListener(
      'invalid',
      (e) => {
        const target = e.target;
        dirtyState.set(target, { hasInteracted: true, hasBlurred: true });
        announced.add(target);
        syncFieldState(target, false, true);
      },
      true
    );

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!form.checkValidity()) {
        const controls = Array.from(form.elements);
        for (const control of controls) {
          if (control.checkValidity && !control.validity.valid) {
            dirtyState.set(control, { hasInteracted: true, hasBlurred: true });
            syncFieldState(control, false, true);
          }
        }
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      const data = new FormData(form);
      const email = String(data.get('workEmail') || '').trim();
      if (statusBanner) {
        statusBanner.textContent = `Strategy call request prepared for ${email}. A OneReach Human Expert will follow up with baseline options.`;
        statusBanner.hidden = false;
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.querySelector('span').textContent = 'Request Received';
      }
    });

    updateProgressDots();
  }

  /* =========================================================================
     CROSS-PAGE QUERY TARGETS (FROM HERO.HTML)
     ========================================================================= */
  function handleIncomingNavigationParams() {
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('track');
    const jumpPortal = params.get('portal');

    if (trackId) {
      const engines = document.getElementById('engines');
      if (engines) {
        engines.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
      const btn = document.querySelector(`#industry-list .industry-item[data-industry="${trackId}"]`);
      if (btn && btn.getAttribute('aria-pressed') !== 'true') {
        window.setTimeout(() => btn.click(), 220);
      }
      return;
    }

    if (jumpPortal === '1') {
      const runway = document.getElementById('choreo-runway');
      const firstName = document.getElementById('first-name');
      if (!runway) return;
      window.setTimeout(() => {
        if (prefersReducedMotion.matches) {
          const formTarget = document.getElementById('campaign-form-wrap') || runway;
          formTarget.scrollIntoView({ behavior: 'auto', block: 'start' });
        } else {
          const scrollable = Math.max(0, runway.offsetHeight - window.innerHeight);
          const targetY = runway.offsetTop + scrollable * 0.92;
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
        if (firstName) {
          window.setTimeout(() => {
            try {
              firstName.focus({ preventScroll: true });
            } catch {
              // Ignore focus errors if element is not yet focusable
            }
          }, prefersReducedMotion.matches ? 40 : 650);
        }
      }, 120);
      return;
    }

    // Re-align hash anchors after #top expands to 520vh under .has-vortex-js
    if (window.location.hash && window.location.hash !== '#top') {
      const hashTarget = document.querySelector(window.location.hash);
      if (hashTarget) {
        window.requestAnimationFrame(() => {
          hashTarget.scrollIntoView({ behavior: 'auto', block: 'start' });
        });
      }
    }
  }

  /* =========================================================================
     HEADER NAVIGATION (navbar guide) & EXPANDABLE VIDEO HERO SECTION
     ========================================================================= */
  function initSiteHeaderAndHero() {
    if (!Object.hasOwn(HTMLElement.prototype, 'popover')) {
      import('https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover.min.js').catch(() => {});
    }

    const header = document.getElementById('site-header');
    const inner = document.getElementById('header-inner');
    const menu = document.getElementById('site-menu');
    const dropdownItem = header?.querySelector('.nav-dropdown');
    const dropdownTrigger = header?.querySelector('.dropdown-trigger');
    const submenu = document.getElementById('platform-menu');

    const heroRunway = document.getElementById('top');
    const heroStage = document.getElementById('hero-stage');
    const cardSlot = document.getElementById('hero-card-slot');
    const mediaClip = document.getElementById('hero-media-clip');
    const mediaInner = document.getElementById('hero-media-inner');
    const mediaScrim = document.getElementById('hero-media-scrim');
    const videoEl = document.getElementById('hero-reel-video');
    const canvasEl = document.getElementById('hero-placeholder-canvas');
    const badgeEl = document.getElementById('hero-placeholder-badge');
    const reelToggle = document.getElementById('hero-reel-toggle');
    const scrollOrb = document.querySelector('.scroll-orb');
    const vortexRunway = document.getElementById('vortex-top');

    // Unified global smooth jump for "Get Started / Create Customers" triggers
    document.addEventListener('click', (e) => {
      const jumpBtn = e.target.closest('[data-jump-portal="true"]');
      if (jumpBtn) {
        const choreo = document.getElementById('choreo-runway');
        const firstName = document.getElementById('first-name');
        if (!choreo) return;
        e.preventDefault();
        if (menu && menu.hasAttribute('popover') && menu.matches(':popover-open')) {
          try {
            menu.hidePopover();
          } catch {
            // Ignore popover state errors
          }
        }
        if (prefersReducedMotion.matches) {
          const target = document.getElementById('campaign-form-wrap') || choreo;
          target.scrollIntoView({ behavior: 'auto', block: 'start' });
        } else {
          const scrollable = Math.max(0, choreo.offsetHeight - window.innerHeight);
          window.scrollTo({ top: choreo.offsetTop + scrollable * 0.92, behavior: 'smooth' });
        }
        if (firstName) {
          window.setTimeout(() => {
            try {
              firstName.focus({ preventScroll: true });
            } catch {
              // Ignore focus restrictions
            }
          }, prefersReducedMotion.matches ? 40 : 750);
        }
      }
    });

    // ---------------------------------------------------------------------
    // Responsive Single-Tree Navbar (is-wide <-> native popover)
    // ---------------------------------------------------------------------
    if (header && inner && menu) {
      let lastCollapsedWidth = 0;
      let isWide = false;
      let hoverPreviewing = false;

      const syncSubmenuLayout = (wide) => {
        if (!submenu || !dropdownTrigger) return;
        if (wide) {
          submenu.setAttribute('popover', 'auto');
          submenu.hidden = false;
        } else {
          submenu.removeAttribute('popover');
          submenu.hidden = true;
        }
        dropdownTrigger.setAttribute('aria-expanded', 'false');
      };

      const updateHeaderLayout = () => {
        const headerWidth = header.getBoundingClientRect().width;
        document.documentElement.style.setProperty(
          '--header-h',
          `${Math.round(header.getBoundingClientRect().height)}px`
        );

        if (!isWide && headerWidth <= lastCollapsedWidth) {
          return;
        }

        header.classList.add('is-measuring');
        const wasMenuOpen = menu.hasAttribute('popover') && menu.matches(':popover-open');

        if (submenu && dropdownTrigger) {
          submenu.removeAttribute('popover');
          submenu.hidden = true;
        }
        menu.removeAttribute('popover');
        header.classList.add('is-wide');

        const fits = inner.scrollWidth <= inner.clientWidth + 1;
        isWide = fits;
        header.classList.toggle('is-wide', fits);
        if (!fits) {
          lastCollapsedWidth = headerWidth;
          menu.setAttribute('popover', 'auto');
          if (wasMenuOpen) {
            try {
              menu.showPopover();
            } catch {
              // Ignore if not supported or already open
            }
          }
        } else {
          lastCollapsedWidth = 0;
        }

        syncSubmenuLayout(fits);
        window.requestAnimationFrame(() => header.classList.remove('is-measuring'));
      };

      const headerRo = new ResizeObserver(updateHeaderLayout);
      headerRo.observe(header);
      headerRo.observe(menu);
      updateHeaderLayout();

      // Anchor positioning JS fallback + aria-expanded sync on native toggle
      if (submenu && dropdownTrigger) {
        const positionSubmenuFallback = () => {
          if (CSS.supports('position-area', 'block-end')) return;
          const trigRect = dropdownTrigger.getBoundingClientRect();
          const subRect = submenu.getBoundingClientRect();
          let top = trigRect.bottom + 8;
          if (top + subRect.height > window.innerHeight - 12) {
            top = Math.max(12, trigRect.top - subRect.height - 8);
          }
          const left = clamp(trigRect.left, 12, Math.max(12, window.innerWidth - subRect.width - 12));
          submenu.style.top = `${Math.round(top)}px`;
          submenu.style.left = `${Math.round(left)}px`;
        };

        submenu.addEventListener('toggle', (event) => {
          const opened = event.newState === 'open';
          dropdownTrigger.setAttribute('aria-expanded', opened ? 'true' : 'false');
          if (opened) {
            positionSubmenuFallback();
          } else {
            hoverPreviewing = false;
          }
        });

        dropdownTrigger.addEventListener('click', (event) => {
          if (isWide) {
            if (hoverPreviewing) {
              hoverPreviewing = false;
              event.preventDefault();
            }
            return;
          }
          event.preventDefault();
          const nextHidden = !submenu.hidden;
          submenu.hidden = nextHidden;
          dropdownTrigger.setAttribute('aria-expanded', nextHidden ? 'false' : 'true');
        });

        if (dropdownItem) {
          dropdownItem.addEventListener('pointerenter', (event) => {
            if (!isWide || event.pointerType === 'touch') return;
            if (!window.matchMedia('(hover: hover)').matches) return;
            if (submenu.hasAttribute('popover') && !submenu.matches(':popover-open')) {
              hoverPreviewing = true;
              try {
                submenu.showPopover({ source: dropdownTrigger });
              } catch {
                // Ignore if already open or unsupported source option
              }
            }
          });

          dropdownItem.addEventListener('pointerleave', () => {
            if (!isWide || !hoverPreviewing) return;
            if (submenu.hasAttribute('popover') && submenu.matches(':popover-open')) {
              hoverPreviewing = false;
              try {
                submenu.hidePopover();
              } catch {
                // Ignore
              }
            }
          });

          dropdownItem.addEventListener('focusout', (event) => {
            if (!isWide || !submenu.hasAttribute('popover')) return;
            const next = event.relatedTarget;
            if (next && !dropdownItem.contains(next) && submenu.matches(':popover-open')) {
              hoverPreviewing = false;
              try {
                submenu.hidePopover();
              } catch {
                // Ignore
              }
            }
          });
        }
      }

      menu.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (link && !isWide && menu.hasAttribute('popover') && menu.matches(':popover-open')) {
          try {
            menu.hidePopover();
          } catch {
            // Ignore
          }
        }
      });
    }

    // ---------------------------------------------------------------------
    // Sticky Section-Aware Header Tint & Scroll Orb Visibility
    // ---------------------------------------------------------------------
    function syncGlobalChrome() {
      const headerH = header ? header.getBoundingClientRect().height : 63;
      const heroRect = heroRunway ? heroRunway.getBoundingClientRect() : null;
      const vortexRect = vortexRunway ? vortexRunway.getBoundingClientRect() : null;

      if (header && heroRect) {
        const enteredDark = heroRect.bottom <= headerH + 8;
        header.classList.toggle('is-dark', enteredDark);
      }

      if (scrollOrb) {
        const insideHero = heroRect ? heroRect.bottom > window.innerHeight * 0.45 : false;
        const insideVortex = vortexRect ? vortexRect.bottom > window.innerHeight * 0.45 : false;
        scrollOrb.classList.toggle('is-hero-hidden', insideHero || insideVortex);
      }
    }

    window.addEventListener('scroll', syncGlobalChrome, { passive: true });
    window.addEventListener('resize', syncGlobalChrome, { passive: true });
    syncGlobalChrome();

    // ---------------------------------------------------------------------
    // Section 0 Expandable Media Hero + Animated Preview Slot
    // ---------------------------------------------------------------------
    if (!heroRunway || !heroStage || !cardSlot) return;

    const supportsSDA =
      typeof CSS !== 'undefined' &&
      CSS.supports('(animation-timeline: scroll()) and (animation-range: 0% 100%)');

    let slotGeom = { t: 44, r: 28, b: 6, l: 28, dx: 0, dy: 14, scale: 0.48 };

    const measureHeroSlot = () => {
      if (window.innerWidth <= 860 || prefersReducedMotion.matches) {
        heroRunway.classList.remove('has-hero-js', 'has-hero-fallback', 'is-expanded');
        if (mediaClip) mediaClip.style.clipPath = '';
        if (mediaInner) mediaInner.style.transform = '';
        if (mediaScrim) mediaScrim.style.opacity = '';
        return;
      }

      heroRunway.classList.add('has-hero-js');
      const stageRect = heroStage.getBoundingClientRect();
      const slotRect = cardSlot.getBoundingClientRect();
      if (stageRect.width < 1 || stageRect.height < 1 || slotRect.width < 1) return;

      const scaleW = slotRect.width / stageRect.width;
      const scaleH = slotRect.height / stageRect.height;

      slotGeom = {
        t: clamp(((slotRect.top - stageRect.top) / stageRect.height) * 100, 0, 90),
        r: clamp(((stageRect.right - slotRect.right) / stageRect.width) * 100, 0, 90),
        b: clamp(((stageRect.bottom - slotRect.bottom) / stageRect.height) * 100, 0, 90),
        l: clamp(((slotRect.left - stageRect.left) / stageRect.width) * 100, 0, 90),
        dx: (((slotRect.left + slotRect.width * 0.5) - (stageRect.left + stageRect.width * 0.5)) / stageRect.width) * 100,
        dy: (((slotRect.top + slotRect.height * 0.5) - (stageRect.top + stageRect.height * 0.5)) / stageRect.height) * 100,
        scale: clamp(Math.max(scaleW, scaleH), 0.36, 0.92)
      };

      heroRunway.style.setProperty('--slot-top', `${slotGeom.t.toFixed(2)}%`);
      heroRunway.style.setProperty('--slot-right', `${slotGeom.r.toFixed(2)}%`);
      heroRunway.style.setProperty('--slot-bottom', `${slotGeom.b.toFixed(2)}%`);
      heroRunway.style.setProperty('--slot-left', `${slotGeom.l.toFixed(2)}%`);
      heroRunway.style.setProperty('--slot-dx', `${slotGeom.dx.toFixed(2)}%`);
      heroRunway.style.setProperty('--slot-dy', `${slotGeom.dy.toFixed(2)}%`);
      heroRunway.style.setProperty('--slot-scale', slotGeom.scale.toFixed(3));

      if (!supportsSDA) {
        heroRunway.classList.add('has-hero-fallback');
        applyFallbackHeroScroll();
      }
    };

    const applyFallbackHeroScroll = () => {
      if (supportsSDA || prefersReducedMotion.matches || window.innerWidth <= 860) return;
      const scrollable = Math.max(1, heroRunway.offsetHeight - window.innerHeight);
      const raw = clamp((window.scrollY - heroRunway.offsetTop) / scrollable, 0, 1);
      const t = smoothstep(0.04, 0.72, raw);

      heroRunway.style.setProperty('--hero-p', t.toFixed(3));
      heroRunway.classList.toggle('is-expanded', t > 0.36);
      if (mediaClip) {
        mediaClip.style.clipPath = `inset(${lerp(slotGeom.t, 0, t).toFixed(2)}% ${lerp(slotGeom.r, 0, t).toFixed(2)}% ${lerp(slotGeom.b, 0, t).toFixed(2)}% ${lerp(slotGeom.l, 0, t).toFixed(2)}% round ${lerp(18, 0, t).toFixed(1)}px)`;
      }
      if (mediaInner) {
        mediaInner.style.transform = `translate3d(${lerp(slotGeom.dx, 0, t).toFixed(2)}%, ${lerp(slotGeom.dy, 0, t).toFixed(2)}%, 0) scale(${lerp(slotGeom.scale, 1, t).toFixed(3)})`;
      }
      if (mediaScrim) {
        mediaScrim.style.opacity = smoothstep(0.14, 0.60, raw).toFixed(3);
      }
    };

    const heroRo = new ResizeObserver(measureHeroSlot);
    heroRo.observe(heroStage);
    heroRo.observe(cardSlot);
    if (!supportsSDA && !prefersReducedMotion.matches) {
      window.addEventListener('scroll', applyFallbackHeroScroll, { passive: true });
    }
    measureHeroSlot();

    // Activate uploaded <video> automatically if a src is present; otherwise run animated placeholder
    const hasVideoSrc = Boolean(
      videoEl && (videoEl.getAttribute('src') || videoEl.querySelector('source[src]'))
    );
    let userPausedReel = prefersReducedMotion.matches;

    const syncPlayUI = () => {
      if (!reelToggle) return;
      reelToggle.textContent = userPausedReel ? 'Play reel' : 'Pause reel';
      reelToggle.setAttribute(
        'aria-label',
        userPausedReel ? 'Play hero video' : 'Pause hero video'
      );
    };

    if (hasVideoSrc && videoEl) {
      videoEl.hidden = false;
      if (canvasEl) canvasEl.hidden = true;
      if (badgeEl) badgeEl.hidden = true;
      if (prefersReducedMotion.matches) {
        videoEl.removeAttribute('autoplay');
        videoEl.pause();
      } else {
        videoEl.play().catch(() => {});
      }
    }

    syncPlayUI();

    if (reelToggle) {
      reelToggle.addEventListener('click', () => {
        userPausedReel = !userPausedReel;
        syncPlayUI();
        if (hasVideoSrc && videoEl) {
          if (userPausedReel) videoEl.pause();
          else videoEl.play().catch(() => {});
        }
      });
    }

    // Animated 3-scene agency montage placeholder (hidden cleanly once real video is added)
    if (!hasVideoSrc && canvasEl) {
      const ctx = canvasEl.getContext('2d');
      let cw = 960;
      let ch = 600;

      const resizePlaceholder = () => {
        const rect = canvasEl.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cw = Math.max(320, Math.floor((rect.width || 960) * dpr));
        ch = Math.max(200, Math.floor((rect.height || 600) * dpr));
        canvasEl.width = cw;
        canvasEl.height = ch;
      };
      new ResizeObserver(resizePlaceholder).observe(canvasEl);
      resizePlaceholder();

      const traceRoundedRect = (targetCtx, rx, ry, rw, rh, rad) => {
        targetCtx.beginPath();
        if (typeof targetCtx.roundRect === 'function') {
          targetCtx.roundRect(rx, ry, rw, rh, rad);
        } else {
          targetCtx.rect(rx, ry, rw, rh);
        }
      };

      const drawPlaceholderFrame = (sec) => {
        if (!ctx) return;
        const sceneLen = 3.2;
        const total = sec % (sceneLen * 3);
        const sceneIdx = Math.floor(total / sceneLen);
        const localT = (total % sceneLen) / sceneLen;
        const zoom = 1 + localT * 0.045;

        ctx.save();
        ctx.clearRect(0, 0, cw, ch);
        ctx.translate(cw * 0.5, ch * 0.5);
        ctx.scale(zoom, zoom);
        ctx.translate(-cw * 0.5, -ch * 0.5);

        if (sceneIdx === 0) {
          // Scene 0: OneReach Labs Daylight Cobalt Prism & Signal Studio
          const bg = ctx.createLinearGradient(0, 0, cw, ch);
          bg.addColorStop(0, '#f3f5fb');
          bg.addColorStop(0.55, '#eef2ff');
          bg.addColorStop(1, '#d3dcf5');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, cw, ch);

          for (let i = 0; i < 6; i += 1) {
            const bx = cw * (0.12 + i * 0.15) + Math.sin(sec * 0.9 + i) * cw * 0.015;
            const by = ch * 0.14;
            const bw = cw * 0.095;
            const bh = ch * 0.72;
            const g = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
            g.addColorStop(0, 'rgba(255, 255, 255, 0.84)');
            g.addColorStop(1, 'rgba(30, 61, 180, 0.14)');
            ctx.fillStyle = g;
            traceRoundedRect(ctx, bx, by, bw, bh, 18);
            ctx.fill();
          }

          const orb = ctx.createRadialGradient(cw * 0.52, ch * 0.48, cw * 0.02, cw * 0.52, ch * 0.48, cw * 0.24);
          orb.addColorStop(0, 'rgba(30, 61, 180, 0.72)');
          orb.addColorStop(0.55, 'rgba(143, 166, 255, 0.28)');
          orb.addColorStop(1, 'rgba(30, 61, 180, 0)');
          ctx.fillStyle = orb;
          ctx.beginPath();
          ctx.arc(cw * 0.52, ch * 0.48, cw * 0.24, 0, Math.PI * 2);
          ctx.fill();
        } else if (sceneIdx === 1) {
          // Scene 1: Midnight Navy Telemetry & Signal Flow
          const bg = ctx.createLinearGradient(0, 0, cw, ch);
          bg.addColorStop(0, '#0a1638');
          bg.addColorStop(0.6, '#172859');
          bg.addColorStop(1, '#0f1d47');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, cw, ch);

          ctx.lineWidth = Math.max(1.5, cw * 0.0022);
          for (let i = 0; i < 9; i += 1) {
            const offset = (i - 4) * ch * 0.075;
            ctx.strokeStyle = i === 4 ? 'rgba(143, 166, 255, 0.88)' : 'rgba(201, 210, 234, 0.22)';
            ctx.beginPath();
            for (let x = 0; x <= cw; x += cw / 18) {
              const u = x / cw;
              const y =
                ch * 0.5 +
                offset * (1 - Math.sin(u * Math.PI) * 0.45) +
                Math.sin(u * 5 + sec * 2.1 + i * 0.6) * ch * 0.04;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }

          const px = cw * (0.25 + localT * 0.52);
          const py = ch * 0.5 + Math.sin(px * 0.006 + sec * 2.1) * ch * 0.04;
          ctx.fillStyle = '#f08a2e';
          ctx.beginPath();
          ctx.arc(px, py, Math.max(5, cw * 0.007), 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Scene 2: Dual-Engine Outbound Cobalt & Inbound Amber Composition
          const bg = ctx.createLinearGradient(0, 0, cw, ch);
          bg.addColorStop(0, '#f3f5fb');
          bg.addColorStop(0.55, '#eef2ff');
          bg.addColorStop(1, '#fff6ee');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, cw, ch);

          const blocks = [
            { x: 0.24, y: 0.28, w: 0.14, h: 0.44, fill: '#0a1638' },
            { x: 0.42, y: 0.22, w: 0.16, h: 0.56, fill: '#1e3db4' },
            { x: 0.62, y: 0.34, w: 0.14, h: 0.38, fill: '#f08a2e' }
          ];
          blocks.forEach((b, idx) => {
            const drift = Math.sin(sec * 1.4 + idx * 1.3) * ch * 0.02;
            ctx.fillStyle = b.fill;
            traceRoundedRect(ctx, cw * b.x, ch * b.y + drift, cw * b.w, ch * b.h, Math.max(12, cw * 0.015));
            ctx.fill();
          });
        }
        ctx.restore();
      };

      if (prefersReducedMotion.matches) {
        drawPlaceholderFrame(0.6);
      } else {
        let reelTime = 0;
        let lastReelTs = performance.now();
        let reelRaf = 0;

        const reelTick = (now) => {
          reelRaf = window.requestAnimationFrame(reelTick);
          const dt = Math.min(0.05, Math.max(0, (now - lastReelTs) / 1000));
          lastReelTs = now;
          if (!userPausedReel) {
            reelTime += dt;
          }
          drawPlaceholderFrame(reelTime);
        };

        reelRaf = window.requestAnimationFrame(reelTick);
        document.addEventListener('visibilitychange', () => {
          if (document.hidden && reelRaf) {
            window.cancelAnimationFrame(reelRaf);
            reelRaf = 0;
          } else if (!document.hidden && !reelRaf) {
            lastReelTs = performance.now();
            reelRaf = window.requestAnimationFrame(reelTick);
          }
        });
      }
    }
  }

  /* =========================================================================
     SECTION 1: SWIRLING MIDNIGHT COBALT VORTEX SHADER, 5-PETAL CORE & 4-BEAT SCROLL
     ========================================================================= */
  function initAgenticVortex() {
    const runway = document.getElementById('vortex-top');
    const stage = document.getElementById('vortex-stage');
    const bgCanvas = document.getElementById('vortex-bg-canvas');
    const coreCanvas = document.getElementById('iris-core-canvas');
    const svgEl = document.getElementById('vortex-connectors');
    const beat1El = document.getElementById('vortex-beat-1');
    const beat2El = document.getElementById('vortex-beat-2');
    const beat3El = document.getElementById('vortex-beat-3');
    const beat4El = document.getElementById('vortex-beat-4');
    const operateHeadEl = document.querySelector('.vortex-display--operate');
    const stepsWrap = document.getElementById('vortex-steps');
    const stepEls = Array.from(document.querySelectorAll('#vortex-steps .vortex-step'));
    const operateCue = document.getElementById('vortex-operate-cue');
    const finaleEl = document.getElementById('vortex-finale');
    const approvalEl = document.getElementById('vortex-approval');
    const nodesWrap = document.getElementById('vortex-nodes');
    const pillEls = nodesWrap ? Array.from(nodesWrap.querySelectorAll('.vortex-pill')) : [];
    const dockEl = document.getElementById('vortex-dock');
    const motionToggle = document.getElementById('vortex-motion-toggle');

    if (!runway || !stage || !bgCanvas || !coreCanvas) return;

    // Cross-link capability pills in Vortex Section to #engines
    document.addEventListener('click', (e) => {
      const trackPill = e.target.closest('.vortex-pill[data-focus-track]');
      if (trackPill) {
        const trackId = trackPill.dataset.focusTrack;
        const engines = document.getElementById('engines');
        if (engines) {
          engines.scrollIntoView({
            behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
            block: 'start'
          });
        }
        const legendBtn = trackId
          ? document.querySelector(`#industry-list .industry-item[data-industry="${trackId}"]`)
          : null;
        if (legendBtn && legendBtn.getAttribute('aria-pressed') !== 'true') {
          window.setTimeout(() => legendBtn.click(), prefersReducedMotion.matches ? 0 : 320);
        }
      }
    });

    // Enable CSS sticky timeline only when JS runs and user allows motion
    if (!prefersReducedMotion.matches) {
      runway.classList.add('has-vortex-js');
    }

    let userPausedMotion = false;
    if (motionToggle) {
      motionToggle.addEventListener('click', () => {
        userPausedMotion = !userPausedMotion;
        motionToggle.textContent = userPausedMotion ? 'Resume motion' : 'Pause motion';
        motionToggle.setAttribute(
          'aria-label',
          userPausedMotion ? 'Resume background swirl animation' : 'Pause background swirl animation'
        );
      });
    }

    // ---------------------------------------------------------------------
    // WebGL Fluid Cobalt Vortex Shader (+ smooth 2D gradient fallback)
    // ---------------------------------------------------------------------
    let gl = null;
    let glProgram = null;
    let uTimeLoc = null;
    let uResLoc = null;
    let uScrollLoc = null;

    try {
      gl = bgCanvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' });
    } catch {
      gl = null;
    }

    if (gl) {
      const vertSrc = `
        attribute vec2 a_pos;
        void main() {
          gl_Position = vec4(a_pos, 0.0, 1.0);
        }
      `;
      const fragSrc = `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_res;
        uniform float u_scroll;

        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float amp = 0.5;
          mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
          for (int i = 0; i < 4; i++) {
            v += amp * noise(p);
            p = rot * p * 2.02;
            amp *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / max(1.0, min(u_res.x, u_res.y));
          float dist = length(uv);
          float ang = atan(uv.y, uv.x);
          float swirl = 2.55 * exp(-dist * 1.1) - u_time * 0.18 - u_scroll * 2.25;
          vec2 p = vec2(cos(ang + swirl), sin(ang + swirl)) * dist;

          float q = fbm(p * 1.65 + vec2(u_time * 0.045, -u_time * 0.035));
          float r = fbm(p * 2.05 + q * 1.55 + vec2(1.4, 7.2) - vec2(0.0, u_scroll * 1.35));
          float mist = smoothstep(0.18, 0.86, r);
          float ridge = pow(max(mist, 0.001), 2.2) * smoothstep(1.35, 0.06, dist);

          vec3 navyBase = vec3(0.039, 0.086, 0.220);
          vec3 deepCobalt = vec3(0.090, 0.180, 0.560);
          vec3 glowCobalt = vec3(0.560, 0.651, 1.000);

          vec3 col = mix(navyBase, deepCobalt, mist);
          col += glowCobalt * ridge * 0.72;
          col = mix(navyBase, col, smoothstep(1.42, 0.14, dist * 0.88));
          gl_FragColor = vec4(col, 1.0);
        }
      `;

      const compileShader = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          gl.deleteShader(s);
          return null;
        }
        return s;
      };

      const vs = compileShader(gl.VERTEX_SHADER, vertSrc);
      const fs = compileShader(gl.FRAGMENT_SHADER, fragSrc);
      if (vs && fs) {
        glProgram = gl.createProgram();
        gl.attachShader(glProgram, vs);
        gl.attachShader(glProgram, fs);
        gl.linkProgram(glProgram);
        if (gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
          const buf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
          const posLoc = gl.getAttribLocation(glProgram, 'a_pos');
          gl.enableVertexAttribArray(posLoc);
          gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
          gl.useProgram(glProgram);
          uTimeLoc = gl.getUniformLocation(glProgram, 'u_time');
          uResLoc = gl.getUniformLocation(glProgram, 'u_res');
          uScrollLoc = gl.getUniformLocation(glProgram, 'u_scroll');
        } else {
          gl = null;
        }
      } else {
        gl = null;
      }
    }

    const bg2d = gl ? null : bgCanvas.getContext('2d');
    const coreCtx = coreCanvas.getContext('2d');

    // ---------------------------------------------------------------------
    // Precompute 3D 5-Petal Parametric Particle Core + Orbital Star Dust
    // ---------------------------------------------------------------------
    const corePoints = [];
    const PETALS = 5;
    const RINGS = 7;
    const DOTS_PER_RING = 56;
    for (let k = 0; k < PETALS; k += 1) {
      const lobeAng = (k * Math.PI * 2) / PETALS - Math.PI / 2;
      const lobeCx = Math.cos(lobeAng) * 0.42;
      const lobeCy = Math.sin(lobeAng) * 0.42;
      const lobeTiltZ = (k % 2 === 0 ? 1 : -1) * 0.24;
      for (let rIdx = 0; rIdx < RINGS; rIdx += 1) {
        const ringR = 0.26 + (rIdx / (RINGS - 1)) * 0.34;
        const zDepth = (rIdx - 3) * 0.055;
        for (let d = 0; d < DOTS_PER_RING; d += 1) {
          const th = (d / DOTS_PER_RING) * Math.PI * 2 + rIdx * 0.18;
          const px = lobeCx + Math.cos(th) * ringR;
          const py = lobeCy + Math.sin(th) * ringR;
          const pz = zDepth + Math.sin(th + k) * lobeTiltZ;
          const radialDist = Math.hypot(px, py);
          const isWarmLobe = k === 2 && radialDist < 0.56;
          corePoints.push({
            x: px,
            y: py,
            z: pz,
            warm: isWarmLobe ? 1 - radialDist / 0.56 : Math.max(0, 1 - radialDist / 0.28) * 0.65,
            size: 1.05 + (1 - rIdx / RINGS) * 0.75
          });
        }
      }
    }

    const rng = createRng(7082);
    const stardust = Array.from({ length: 120 }, () => {
      const a = rng() * Math.PI * 2;
      const r = 0.28 + Math.sqrt(rng()) * 0.72;
      return {
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        phase: rng() * Math.PI * 2,
        size: 0.7 + rng() * 1.4
      };
    });

    // Setup dynamic SVG curved Bezier paths for Beat 3 (5 pills + approval -> core)
    const connectorPaths = [];
    if (svgEl) {
      const ns = 'http://www.w3.org/2000/svg';
      const defs = document.createElementNS(ns, 'defs');
      const grad = document.createElementNS(ns, 'linearGradient');
      grad.setAttribute('id', 'vortex-conn-grad');
      grad.setAttribute('x1', '0%');
      grad.setAttribute('y1', '0%');
      grad.setAttribute('x2', '0%');
      grad.setAttribute('y2', '100%');
      const stop1 = document.createElementNS(ns, 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', 'rgba(143, 166, 255, 0.85)');
      const stop2 = document.createElementNS(ns, 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', 'rgba(30, 61, 180, 0.28)');
      grad.append(stop1, stop2);
      defs.appendChild(grad);
      svgEl.appendChild(defs);

      for (let i = 0; i < 6; i += 1) {
        const pEl = document.createElementNS(ns, 'path');
        pEl.setAttribute('fill', 'none');
        pEl.setAttribute('stroke', 'url(#vortex-conn-grad)');
        pEl.setAttribute('stroke-width', i === 2 ? '1.6' : '1.1');
        svgEl.appendChild(pEl);
        connectorPaths.push(pEl);
      }
    }

    let width = stage.clientWidth || window.innerWidth;
    let height = stage.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resizeCanvases() {
      width = stage.clientWidth || window.innerWidth;
      height = stage.clientHeight || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Soft half-res WebGL buffer keeps GPU swirl silky smooth across all devices
      bgCanvas.width = Math.max(2, Math.floor(width * 0.55));
      bgCanvas.height = Math.max(2, Math.floor(height * 0.55));
      if (gl) {
        gl.viewport(0, 0, bgCanvas.width, bgCanvas.height);
      }

      coreCanvas.width = Math.max(2, Math.floor(width * dpr));
      coreCanvas.height = Math.max(2, Math.floor(height * dpr));
      if (coreCtx) {
        coreCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }

    const stageRo = new ResizeObserver(resizeCanvases);
    stageRo.observe(stage);
    resizeCanvases();

    // Piecewise window helper (returns 0..1 visibility intensity)
    const bellWindow = (p, a, b, c, d) => {
      if (p <= a || p >= d) return 0;
      if (p < b) return smoothstep(a, b, p);
      if (p > c) return 1 - smoothstep(c, d, p);
      return 1;
    };

    let currentP = 0;
    let targetP = 0;
    let animTime = 0;
    let lastTs = performance.now();
    let pointerX = 0;
    let pointerY = 0;

    stage.addEventListener('pointermove', (e) => {
      pointerX = clamp((e.clientX / Math.max(1, width) - 0.5) * 2, -1, 1);
      pointerY = clamp((e.clientY / Math.max(1, height) - 0.5) * 2, -1, 1);
    });

    stage.addEventListener('pointerleave', () => {
      pointerX = 0;
      pointerY = 0;
    });

    function computeScrollProgress() {
      const scrollable = Math.max(1, runway.offsetHeight - window.innerHeight);
      const raw = clamp((window.scrollY - runway.offsetTop) / scrollable, 0, 1);
      targetP = raw;
    }

    window.addEventListener('scroll', computeScrollProgress, { passive: true });
    computeScrollProgress();

    function drawBackground(timeSec, p) {
      if (gl && glProgram) {
        gl.uniform1f(uTimeLoc, timeSec);
        gl.uniform2f(uResLoc, bgCanvas.width, bgCanvas.height);
        gl.uniform1f(uScrollLoc, p);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else if (bg2d) {
        const bw = bgCanvas.width;
        const bh = bgCanvas.height;
        const g = bg2d.createRadialGradient(
          bw * (0.52 + Math.sin(timeSec * 0.25) * 0.06),
          bh * (0.48 + Math.cos(timeSec * 0.22) * 0.05),
          bw * 0.04,
          bw * 0.5,
          bh * 0.5,
          Math.max(bw, bh) * 0.72
        );
        g.addColorStop(0, '#1e3db4');
        g.addColorStop(0.45, '#0f1d47');
        g.addColorStop(1, '#0a1638');
        bg2d.fillStyle = g;
        bg2d.fillRect(0, 0, bw, bh);
      }
    }

    function drawCoreAndRing(timeSec, p) {
      if (!coreCtx) return;
      coreCtx.clearRect(0, 0, width, height);

      const minDim = Math.min(width, height);
      const isNarrow = width <= 820;

      // Determine core center & scale smoothly across Beats 1 -> 4
      let coreX = width * 0.5;
      let coreY = height * 0.505;
      let coreR = minDim * 0.026;
      let dustAlpha = 0;
      let orbitRingAlpha = 0;
      let progressRingAlpha = 0;

      if (p < 0.22) {
        // Beat 1: Small pulsing core emblem growing cleanly into Beat 2
        const t = smoothstep(0.12, 0.22, p);
        coreR = lerp(minDim * 0.024, minDim * 0.118, t);
        coreY = lerp(height * 0.515, height * 0.5, t);
        orbitRingAlpha = lerp(0.18, 0.42, t);
        dustAlpha = t * 0.8;
      } else if (p < 0.47) {
        // Beat 2: Full center flower inside dashed orbital ring + star dust
        const morphOut = smoothstep(0.38, 0.47, p);
        coreR = lerp(minDim * 0.118, minDim * 0.088, morphOut);
        coreY = lerp(height * 0.5, height * 0.64, morphOut);
        orbitRingAlpha = lerp(0.44, 0.0, smoothstep(0.36, 0.44, p));
        dustAlpha = (1 - morphOut) * 0.85;
      } else if (p < 0.70) {
        // Beat 3 -> 4 transition: centered under horizontal pipeline -> right-shifted large core
        const shift = smoothstep(0.62, 0.70, p);
        coreX = lerp(width * 0.5, isNarrow ? width * 0.5 : width * 0.72, shift);
        coreY = lerp(height * 0.64, isNarrow ? height * 0.44 : height * 0.52, shift);
        coreR = lerp(minDim * 0.088, isNarrow ? minDim * 0.105 : minDim * 0.155, shift);
        progressRingAlpha = shift;
      } else {
        // Beat 4 -> Finale fade out
        const fadeOut = smoothstep(0.89, 0.96, p);
        coreX = isNarrow ? width * 0.5 : width * 0.72;
        coreY = isNarrow ? height * 0.44 : height * 0.52;
        coreR = (isNarrow ? minDim * 0.105 : minDim * 0.155) * (1 - fadeOut * 0.35);
        progressRingAlpha = 1 - fadeOut;
      }

      const globalCoreAlpha = 1 - smoothstep(0.90, 0.96, p);
      if (globalCoreAlpha <= 0.01) return;

      // Ambient circular border (Beat 1 faint intro halo & Beat 2 orbital ring)
      if (orbitRingAlpha > 0.01) {
        const ringR = p < 0.22 ? lerp(minDim * 0.31, minDim * 0.34, smoothstep(0.12, 0.22, p)) : minDim * 0.34;
        coreCtx.save();
        coreCtx.strokeStyle = `rgba(143, 166, 255, ${orbitRingAlpha * 0.55})`;
        coreCtx.lineWidth = 1;
        coreCtx.beginPath();
        coreCtx.arc(coreX, coreY, ringR, 0, Math.PI * 2);
        coreCtx.stroke();

        // Small glowing orbital indicator dot on Beat 2 ring
        if (p >= 0.18 && p < 0.44) {
          const orbAng = -Math.PI * 0.5 + timeSec * 0.35;
          const ox = coreX + Math.cos(orbAng) * ringR;
          const oy = coreY + Math.sin(orbAng) * ringR;
          coreCtx.fillStyle = 'rgba(240, 138, 46, 0.92)';
          coreCtx.beginPath();
          coreCtx.arc(ox, oy, 3.2, 0, Math.PI * 2);
          coreCtx.fill();
        }
        coreCtx.restore();
      }

      // Beat 2 star dust inside orbital ring
      if (dustAlpha > 0.01) {
        const fieldR = minDim * 0.33;
        coreCtx.save();
        for (const s of stardust) {
          const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(timeSec * 1.8 + s.phase));
          coreCtx.fillStyle = `rgba(143, 166, 255, ${dustAlpha * twinkle * 0.68})`;
          coreCtx.beginPath();
          coreCtx.arc(coreX + s.x * fieldR, coreY + s.y * fieldR, s.size, 0, Math.PI * 2);
          coreCtx.fill();
        }
        coreCtx.restore();
      }

      // Beat 4 Right-side cobalt progress arc around enlarged core
      if (progressRingAlpha > 0.01) {
        const arcR = coreR * 1.48;
        const beat4Span = clamp((p - 0.68) / 0.23, 0, 1);
        coreCtx.save();
        coreCtx.strokeStyle = `rgba(143, 166, 255, ${0.2 * progressRingAlpha})`;
        coreCtx.lineWidth = 1;
        coreCtx.beginPath();
        coreCtx.arc(coreX, coreY, arcR, 0, Math.PI * 2);
        coreCtx.stroke();

        const startA = -Math.PI * 0.5;
        const endA = startA + beat4Span * Math.PI * 1.85;
        coreCtx.strokeStyle = `rgba(143, 166, 255, ${0.88 * progressRingAlpha})`;
        coreCtx.lineWidth = 1.6;
        coreCtx.beginPath();
        coreCtx.arc(coreX, coreY, arcR, startA, endA);
        coreCtx.stroke();

        // Active glowing step marker badge riding along arc
        const mx = coreX + Math.cos(endA) * arcR;
        const my = coreY + Math.sin(endA) * arcR;
        coreCtx.fillStyle = `rgba(30, 61, 180, ${progressRingAlpha})`;
        coreCtx.beginPath();
        coreCtx.arc(mx, my, 9, 0, Math.PI * 2);
        coreCtx.fill();
        coreCtx.fillStyle = `rgba(240, 138, 46, ${progressRingAlpha})`;
        coreCtx.beginPath();
        coreCtx.arc(mx, my, 3.2, 0, Math.PI * 2);
        coreCtx.fill();
        coreCtx.restore();
      }

      // Soft volumetric halo behind 5-petal flower
      coreCtx.save();
      coreCtx.globalCompositeOperation = 'lighter';
      const glow = coreCtx.createRadialGradient(coreX, coreY, coreR * 0.08, coreX, coreY, coreR * 1.65);
      glow.addColorStop(0, `rgba(143, 166, 255, ${0.28 * globalCoreAlpha})`);
      glow.addColorStop(0.5, `rgba(30, 61, 180, ${0.15 * globalCoreAlpha})`);
      glow.addColorStop(1, 'rgba(10, 22, 56, 0)');
      coreCtx.fillStyle = glow;
      coreCtx.beginPath();
      coreCtx.arc(coreX, coreY, coreR * 1.65, 0, Math.PI * 2);
      coreCtx.fill();

      // Rotate and project the 2,200+ 3D parametric petal particles
      const rotY = timeSec * 0.24 + pointerX * 0.22 + p * 1.8;
      const rotX = Math.sin(timeSec * 0.3) * 0.14 + pointerY * 0.16;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      for (const pt of corePoints) {
        const rx = pt.x * cosY - pt.z * sinY;
        const rz1 = pt.x * sinY + pt.z * cosY;
        const ry = pt.y * cosX - rz1 * sinX;
        const rz = pt.y * sinX + rz1 * cosX;

        const persp = 1 / (1 - rz * 0.35);
        const sx = coreX + rx * coreR * persp;
        const sy = coreY + ry * coreR * persp;
        const dotR = Math.max(0.45, pt.size * persp * (coreR / 95));
        const depthAlpha = clamp(0.28 + (rz + 0.5) * 0.68, 0.15, 0.95) * globalCoreAlpha;

        if (pt.warm > 0.25) {
          const wMix = Math.min(1, pt.warm);
          const r = Math.round(143 + 97 * wMix);
          const g = Math.round(166 - 28 * wMix);
          const b = Math.round(255 - 209 * wMix);
          coreCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${depthAlpha})`;
        } else {
          coreCtx.fillStyle = `rgba(143, 166, 255, ${depthAlpha})`;
        }

        coreCtx.beginPath();
        coreCtx.arc(sx, sy, dotR, 0, Math.PI * 2);
        coreCtx.fill();
      }
      coreCtx.restore();

      return { coreX, coreY, coreR };
    }

    function updateDomBeats(p, coreGeo) {
      if (prefersReducedMotion.matches) return;

      const minDim = Math.min(width, height);
      const isNarrow = width <= 820;

      // BEAT 1
      if (beat1El) {
        const a1 = 1 - smoothstep(0.12, 0.20, p);
        const scale1 = 1 + smoothstep(0.12, 0.20, p) * 0.06;
        beat1El.style.opacity = a1.toFixed(3);
        beat1El.style.transform = `translate3d(0, ${Math.round(-smoothstep(0.12, 0.20, p) * 18)}px, 0) scale(${scale1.toFixed(3)})`;
      }

      // BEAT 2 caption
      if (beat2El) {
        const a2 = bellWindow(p, 0.19, 0.25, 0.36, 0.43);
        beat2El.style.opacity = a2.toFixed(3);
        beat2El.style.transform = `translate3d(0, ${Math.round((1 - a2) * 14)}px, 0)`;
      }

      // BEAT 3 headline & micro caption
      if (beat3El) {
        const a3 = bellWindow(p, 0.44, 0.50, 0.64, 0.70);
        beat3El.style.opacity = a3.toFixed(3);
        beat3El.style.transform = `translate3d(0, ${Math.round((1 - a3) * 18)}px, 0)`;
      }

      // MORPHING 5 NODES + APPROVAL + BEZIER CONNECTORS (Beats 2 -> 3)
      const nodesAlpha = bellWindow(p, 0.18, 0.24, 0.64, 0.69);
      const morphT = smoothstep(0.37, 0.49, p);
      const cx = width * 0.5;
      const cy = height * 0.5;
      const orbitR = minDim * 0.34;
      const rowY = isNarrow ? height * 0.38 : height * 0.43;
      const rowSpread = Math.min(width - (isNarrow ? 64 : 96), 820);

      // Angles in Beat 2 orbit matching Sense(L), Perceive(Top), Decide(TR), Deliver(BR), Learn(BL)
      const orbitAngles = [
        -Math.PI * 0.9,   // SENSE (left)
        -Math.PI * 0.5,   // PERCEIVE (top)
        -Math.PI * 0.1,   // DECIDE (right)
        Math.PI * 0.28,   // DELIVER (bottom-right)
        Math.PI * 0.72    // LEARN (bottom-left)
      ];
      // Single row on desktop; 2 clean 3+3 rows on narrow viewports to avoid overlap
      const rowXs = isNarrow
        ? [cx - rowSpread * 0.34, cx, cx + rowSpread * 0.34, cx + rowSpread * 0.02, cx + rowSpread * 0.34]
        : [cx - rowSpread * 0.46, cx - rowSpread * 0.26, cx - rowSpread * 0.08, cx + rowSpread * 0.27, cx + rowSpread * 0.46];
      const rowYs = isNarrow
        ? [rowY, rowY, rowY, rowY + 42, rowY + 42]
        : [rowY, rowY, rowY, rowY, rowY];

      const pillPositions = [];
      pillEls.forEach((el, idx) => {
        if (nodesAlpha <= 0.01) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          return;
        }
        const ox = cx + Math.cos(orbitAngles[idx]) * orbitR;
        const oy = cy + Math.sin(orbitAngles[idx]) * orbitR;
        const rx = rowXs[idx];
        const ry = rowYs[idx];
        const x = lerp(ox, rx, morphT);
        const y = lerp(oy, ry, morphT);
        pillPositions.push({ x, y });
        el.style.opacity = nodesAlpha.toFixed(3);
        el.style.pointerEvents = nodesAlpha > 0.25 ? 'auto' : 'none';
        el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -50%)`;
        el.classList.toggle('is-highlighted', idx === 2);
      });

      if (approvalEl) {
        const appAlpha = bellWindow(p, 0.47, 0.51, 0.64, 0.69);
        const ax = isNarrow ? cx - rowSpread * 0.34 : cx + rowSpread * 0.10;
        const ay = isNarrow ? rowY + 42 : rowY;
        approvalEl.style.opacity = appAlpha.toFixed(3);
        approvalEl.style.transform = `translate3d(${Math.round(ax)}px, ${Math.round(ay)}px, 0) translate(-50%, -50%) scale(${(0.85 + appAlpha * 0.15).toFixed(3)})`;
        pillPositions.push({ x: ax, y: ay });
      }

      // Draw SVG curved Bezier feeder lines during Beat 3
      const connAlpha = bellWindow(p, 0.47, 0.52, 0.64, 0.68);
      if (svgEl) {
        svgEl.style.opacity = connAlpha.toFixed(3);
        if (connAlpha > 0.01 && coreGeo && pillPositions.length >= 6) {
          const targetX = coreGeo.coreX;
          const targetY = coreGeo.coreY - coreGeo.coreR * 0.25;
          pillPositions.forEach((src, i) => {
            const path = connectorPaths[i];
            if (!path) return;
            const sy = src.y + 18;
            const cy1 = lerp(sy, targetY, 0.52);
            const cy2 = lerp(sy, targetY, 0.85);
            path.setAttribute(
              'd',
              `M ${src.x.toFixed(1)} ${sy.toFixed(1)} C ${src.x.toFixed(1)} ${cy1.toFixed(1)}, ${targetX.toFixed(1)} ${cy2.toFixed(1)}, ${targetX.toFixed(1)} ${targetY.toFixed(1)}`
            );
          });
        }
      }

      // BEAT 4: "You don't run Sophia. We do." + 4 narrative steps -> Finale
      if (beat4El) {
        const a4Head = bellWindow(p, 0.68, 0.72, 0.89, 0.93);
        if (operateHeadEl) {
          operateHeadEl.style.opacity = a4Head.toFixed(3);
          operateHeadEl.style.transform = `translate3d(-50%, ${Math.round((1 - a4Head) * 14)}px, 0)`;
        }
        if (operateCue) {
          operateCue.style.opacity = a4Head.toFixed(3);
          operateCue.style.pointerEvents = a4Head > 0.25 ? 'auto' : 'none';
        }
        if (stepsWrap) {
          stepsWrap.style.opacity = a4Head.toFixed(3);
        }

        // Crossfade smoothly through 4 narrative steps between p=0.70 and p=0.90
        const stepWindows = [
          [0.68, 0.71, 0.74, 0.77],
          [0.74, 0.77, 0.79, 0.82],
          [0.79, 0.82, 0.84, 0.87],
          [0.84, 0.87, 0.89, 0.92]
        ];
        stepEls.forEach((stepEl, i) => {
          const [a, b, c, d] = stepWindows[i];
          const w = bellWindow(p, a, b, c, d);
          stepEl.style.opacity = w.toFixed(3);
          stepEl.style.transform = `translate3d(0, ${Math.round((1 - w) * 10)}px, 0)`;
        });

        // Beat 4 End Finale ("We've built this at scale before...")
        if (finaleEl) {
          const af = bellWindow(p, 0.91, 0.95, 0.985, 1.01);
          const finaleFadeOut = p > 0.96 ? 1 - smoothstep(0.96, 1.0, p) * 0.18 : 1;
          const totalFinale = af * finaleFadeOut;
          const finaleActive = totalFinale > 0.35;
          finaleEl.style.opacity = totalFinale.toFixed(3);
          finaleEl.style.transform = `translate(-50%, -50%) scale(${(0.96 + totalFinale * 0.04).toFixed(3)})`;
          finaleEl.style.pointerEvents = finaleActive ? 'auto' : 'none';
          finaleEl.classList.toggle('is-visible', finaleActive);
        }
      }

      // Dock visibility inside Section 1 Vortex runway only
      const runwayRect = runway.getBoundingClientRect();
      const insideVortexDock =
        runwayRect.top < window.innerHeight * 0.55 && runwayRect.bottom > window.innerHeight * 0.45;
      if (dockEl) {
        dockEl.classList.toggle('is-hidden', !insideVortexDock);
      }
    }

    // Continuous 60fps loop (pauses neatly when tab hidden or paused by user)
    let rafId = 0;
    function tick(now) {
      rafId = window.requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0, (now - lastTs) / 1000));
      lastTs = now;

      if (!prefersReducedMotion.matches && !userPausedMotion) {
        animTime += dt;
      }

      currentP = lerp(currentP, targetP, 0.11);
      drawBackground(animTime, currentP);
      const coreGeo = drawCoreAndRing(animTime, currentP);
      updateDomBeats(currentP, coreGeo);
    }

    if (prefersReducedMotion.matches) {
      drawBackground(0, 0.25);
      drawCoreAndRing(0, 0.25);
    } else {
      computeScrollProgress();
      currentP = targetP;
      drawBackground(0, currentP);
      const initGeo = drawCoreAndRing(0, currentP);
      updateDomBeats(currentP, initGeo);

      rafId = window.requestAnimationFrame(tick);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        } else if (!document.hidden && !rafId) {
          lastTs = performance.now();
          rafId = window.requestAnimationFrame(tick);
        }
      });
    }
  }

  /* =========================================================================
     BOOTSTRAP
     ========================================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    initSiteHeaderAndHero();
    initAgenticVortex();
    initRadialBurst();
    initPortalRays();
    initChoreography();
    initCampaignForm();
    handleIncomingNavigationParams();
  });
})();
