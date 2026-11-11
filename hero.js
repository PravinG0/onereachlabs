(() => {
  'use strict';

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* =========================================================================
     0. CONDITIONAL POPOVER POLYFILL (ONLY WHEN NATIVE SUPPORT IS MISSING)
     ========================================================================= */
  if (!Object.hasOwn(HTMLElement.prototype, 'popover')) {
    import('https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover.min.js').catch(() => {});
  }

  /* =========================================================================
     1. SMOOTH PORTAL JUMP & CAPABILITY TRACK FOCUS HELPERS (SAME OR CROSS-PAGE)
     ========================================================================= */
  function jumpToBookingPortal() {
    const runway = document.getElementById('choreo-runway');
    const firstName = document.getElementById('first-name');
    if (!runway) {
      window.location.href = 'index.html?portal=1#choreo-runway';
      return;
    }

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
          // Ignore focus errors if element is not yet interactive
        }
      }, prefersReducedMotion.matches ? 40 : 750);
    }
  }

  function jumpToEngineTrack(trackId) {
    const engines = document.getElementById('engines');
    if (!engines) {
      window.location.href = trackId
        ? `index.html?track=${encodeURIComponent(trackId)}#engines`
        : 'index.html#engines';
      return;
    }

    engines.scrollIntoView({
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
      block: 'start'
    });

    if (!trackId) return;
    const btn = document.querySelector(`#industry-list .industry-item[data-industry="${trackId}"]`);
    if (btn && btn.getAttribute('aria-pressed') !== 'true') {
      window.setTimeout(() => btn.click(), prefersReducedMotion.matches ? 0 : 280);
    }
  }

  function initNavigationLinks() {
    document.addEventListener('click', (e) => {
      const portalLink = e.target.closest('[data-jump-portal="true"]');
      if (portalLink) {
        e.preventDefault();
        closeOpenHeaderPopovers();
        jumpToBookingPortal();
        return;
      }

      const trackLink = e.target.closest('[data-focus-track]');
      if (trackLink) {
        e.preventDefault();
        const trackId = trackLink.dataset.focusTrack;
        closeOpenHeaderPopovers();
        jumpToEngineTrack(trackId);
        return;
      }

      if (e.target.closest('.site-menu a')) {
        closeOpenHeaderPopovers();
      }
    });
  }

  function closeOpenHeaderPopovers() {
    const siteMenu = document.getElementById('site-menu');
    const enginesMenu = document.getElementById('engines-menu');
    for (const pop of [enginesMenu, siteMenu]) {
      if (!pop || !pop.hasAttribute('popover')) continue;
      if (pop.matches(':popover-open') || pop.classList.contains(':popover-open')) {
        try {
          pop.hidePopover();
        } catch {
          // Safe noop if already closed
        }
      }
    }
  }

  /* =========================================================================
     2. ADAPTIVE HEADER NAVIGATION + LIVE CLOCK + MARQUEE PAUSE
     ========================================================================= */
  function initHeaderNav() {
    const header = document.getElementById('site-header');
    const inner = document.getElementById('header-inner');
    const siteMenu = document.getElementById('site-menu');
    const dropdownItem = document.getElementById('engines-dropdown-item');
    const trigger = document.getElementById('engines-trigger');
    const submenu = document.getElementById('engines-menu');
    if (!header || !inner || !siteMenu || !trigger || !submenu || !dropdownItem) return;

    const isOpen = (el) => el.matches(':popover-open') || el.classList.contains(':popover-open');
    let isWide = false;
    let collapsedMeasureWidth = 0;
    let isHoverPreview = false;
    let measureFrame = 0;

    function syncLayout(forceCheck = false) {
      const currentWidth = header.clientWidth;
      if (!isWide && !forceCheck && currentWidth <= collapsedMeasureWidth) {
        return;
      }

      const menuWasOpen = !isWide && isOpen(siteMenu);
      header.classList.add('is-measuring', 'is-wide');
      siteMenu.removeAttribute('popover');

      // Reset submenu attributes before measuring inline row
      if (isOpen(submenu)) {
        try {
          submenu.hidePopover();
        } catch {
          // Ignore
        }
      }
      submenu.setAttribute('popover', 'auto');
      submenu.hidden = false;

      const fits = inner.scrollWidth <= inner.clientWidth + 1;
      isWide = fits;
      collapsedMeasureWidth = currentWidth;
      header.classList.toggle('is-wide', fits);

      if (fits) {
        siteMenu.removeAttribute('popover');
        submenu.setAttribute('popover', 'auto');
        submenu.hidden = false;
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        siteMenu.setAttribute('popover', 'auto');
        submenu.removeAttribute('popover');
        submenu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        if (menuWasOpen && typeof siteMenu.showPopover === 'function') {
          try {
            siteMenu.showPopover();
          } catch {
            // Safe fallback
          }
        }
      }

      if (measureFrame) window.cancelAnimationFrame(measureFrame);
      measureFrame = window.requestAnimationFrame(() => {
        header.classList.remove('is-measuring');
      });
    }

    // Narrow disclosure toggle when header is collapsed
    trigger.addEventListener('click', (e) => {
      if (!isWide) {
        const nextHidden = !submenu.hidden;
        submenu.hidden = nextHidden;
        trigger.setAttribute('aria-expanded', String(!nextHidden));
        return;
      }

      if (isHoverPreview) {
        isHoverPreview = false;
        e.preventDefault();
      }
    });

    // Wide popover state & non-Anchor-Positioning placement fallback
    submenu.addEventListener('toggle', (e) => {
      if (!isWide) return;
      const opening = e.newState === 'open';
      trigger.setAttribute('aria-expanded', String(opening));
      if (!opening) {
        isHoverPreview = false;
        return;
      }

      if (!CSS.supports('position-area', 'block-end')) {
        const tRect = trigger.getBoundingClientRect();
        const mRect = submenu.getBoundingClientRect();
        let top = tRect.bottom + 8;
        if (top + mRect.height > window.innerHeight - 12 && tRect.top - mRect.height - 8 > 12) {
          top = tRect.top - mRect.height - 8;
        }
        const left = clamp(tRect.left, 12, Math.max(12, window.innerWidth - mRect.width - 12));
        submenu.style.top = `${Math.round(top)}px`;
        submenu.style.left = `${Math.round(left)}px`;
      }
    });

    // Wide hover preview (desktop hover pointers only)
    const canHover = window.matchMedia('(hover: hover)');
    dropdownItem.addEventListener('pointerenter', (e) => {
      if (!isWide || !canHover.matches || e.pointerType === 'touch') return;
      if (isOpen(submenu)) return;
      isHoverPreview = true;
      try {
        submenu.showPopover({ source: trigger });
      } catch {
        try {
          submenu.showPopover();
        } catch {
          // Ignore if unsupported
        }
      }
    });

    dropdownItem.addEventListener('pointerleave', (e) => {
      if (!isWide || e.pointerType === 'touch' || !isHoverPreview) return;
      isHoverPreview = false;
      try {
        submenu.hidePopover();
      } catch {
        // Ignore
      }
    });

    dropdownItem.addEventListener('focusout', (e) => {
      if (!isWide || !isOpen(submenu)) return;
      if (e.relatedTarget && !dropdownItem.contains(e.relatedTarget)) {
        isHoverPreview = false;
        try {
          submenu.hidePopover();
        } catch {
          // Ignore
        }
      }
    });

    // Observe header & menu changes (catches resize and font load)
    const ro = new ResizeObserver(() => syncLayout(isWide));
    ro.observe(header);
    ro.observe(siteMenu);

    syncLayout(true);

    // Live Header Operational Clock
    const clockEl = document.getElementById('live-status-time');
    if (clockEl) {
      const updateClock = () => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        clockEl.textContent = `${hh}:${mm}`;
      };
      updateClock();
      window.setInterval(updateClock, 15000);
    }

    // Marquee Pause / Play Control (WCAG 2.2.2)
    const marquee = document.querySelector('.hero-marquee');
    const marqueeToggle = document.getElementById('marquee-toggle');
    if (marquee && marqueeToggle) {
      let paused = false;
      marqueeToggle.addEventListener('click', () => {
        paused = !paused;
        marquee.classList.toggle('is-paused', paused);
        marqueeToggle.textContent = paused ? 'Play' : 'Pause';
        marqueeToggle.setAttribute(
          'aria-label',
          paused ? 'Play scrolling capability ticker' : 'Pause scrolling capability ticker'
        );
      });
    }
  }

  /* =========================================================================
     3. SOPHIA KNOWLEDGE BASE & INTERACTIVE PROMPT BUBBLE
     ========================================================================= */
  const CYCLING_PROMPTS = [
    'Ask Sophia a question...',
    'How does the 3\u00d7 guarantee work?',
    'Find 50 dental clinics in Texas...',
    'What do 70% agents vs 30% humans handle?',
    'How much does Done For You cost?'
  ];

  const POKE_LINES = [
    {
      text: "Ouch! Easy on the pixels \u2014 I'm calibrating 41 live buying signals right now.",
      cta: false
    },
    {
      text: "Hi, I'm Sophia! Your AI marketing chief directing 10 specialist agents 24/7.",
      cta: false
    },
    {
      text: 'Still here! Ready to run inbound + outbound across LinkedIn, Email, SMS & WhatsApp.',
      cta: false
    },
    {
      text: 'Want to see your 3\u00d7 pipeline roadmap? Ask me below or book your 30-min call.',
      cta: true
    }
  ];

  function resolveSophiaAnswer(query) {
    const q = query.toLowerCase().trim();

    if (/guarantee|90|free|miss|refund|baseline|risk|writing|outcome/.test(q)) {
      return {
        text: 'We measure your qualified meetings per month in week one. If we do not triple that baseline within 90 days, OneReach Human Experts keep working at no cost until we do.',
        cta: true
      };
    }

    if (/price|pricing|cost|much|plan|platform|\$|100|tier|retainer/.test(q)) {
      return {
        text: 'Three ways to work with us: Done For You (custom monthly retainer with our 3\u00d7 written guarantee), Platform ($100/user/mo, free up to 2 users), or Data Only per custom list.',
        cta: true
      };
    }

    if (/data|contact|300m|enrich|scrape|scrap|signal|dental|texas|list|email|phone|99%/.test(q)) {
      return {
        text: 'I search our 300M+ contact database (99% verified email, phone & LinkedIn) plus custom scraped niche lists, then trigger sequences off live funding, hiring & site-visit signals.',
        cta: false
      };
    }

    if (/70|30|human|expert|team|pod|agent|sophia|who|split|do you/.test(q)) {
      return {
        text: 'Agents do 70% (research, enrichment, signals, drafting, sequences, follow-ups, booking). Your dedicated pod of Human Experts does 30% (strategy, offer design, creative & QA review).',
        cta: false
      };
    }

    if (/inbound|website|content|seo|ad|ads|landing|meta|google/.test(q)) {
      return {
        text: 'Our Inbound Engine builds your content, paid LinkedIn/Google/Meta ads, SEO & landing pages \u2014 and I qualify every form fill within minutes to book the call before leads go cold.',
        cta: false
      };
    }

    if (/outbound|channel|linkedin|sms|whatsapp|reply|replies|appointment|meeting|18/.test(q)) {
      return {
        text: 'I research each account first, then orchestrate personal outreach across LinkedIn, Email, SMS & WhatsApp together \u2014 averaging 18 booked meetings/month and 3\u00d7 higher reply rates.',
        cta: false
      };
    }

    if (/time|fast|long|week|start|launch|onboard|work/.test(q)) {
      return {
        text: 'About two weeks from first call to first meeting: Week 1 strategy & baseline -> Data & message build -> Launch both engines across 4 channels -> Weekly optimization.',
        cta: true
      };
    }

    if (/book|call|demo|schedule|hi|hello|hey|help/.test(q)) {
      return {
        text: 'Happy to show you! On a 30-minute strategy call we set your baseline, map your ICP across inbound & outbound, and build your 3\u00d7 roadmap.',
        cta: true
      };
    }

    return {
      text: 'OneReach Labs pairs Human Experts with my 10 AI agents to guarantee 3\u00d7 qualified meetings in 90 days. Ask me about our 300M+ data, 4-channel outbound, pricing, or guarantee!',
      cta: true
    };
  }

  /* =========================================================================
     4. INTERACTIVE 3D CUTAWAY DIORAMA (THREE.JS + 2D FALLBACK)
     ========================================================================= */
  function initHero3D() {
    const stage = document.getElementById('hero-3d-stage');
    const canvas = document.getElementById('hero-3d-canvas');
    const pokeBtn = document.getElementById('sophia-poke-btn');
    const bubble = document.getElementById('sophia-bubble');
    const bubbleText = document.getElementById('sophia-bubble-text');
    const bubbleActions = document.getElementById('sophia-bubble-actions');
    const bubbleClose = document.getElementById('sophia-bubble-close');
    const promptForm = document.getElementById('sophia-prompt-form');
    const promptInput = document.getElementById('sophia-input');

    if (!stage || !canvas) return;

    let pokeIndex = 0;
    let bubbleTimer = 0;
    let thinkTimer = 0;

    function showBubble(message, withCta = false) {
      if (!bubble || !bubbleText) return;
      window.clearTimeout(bubbleTimer);
      window.clearTimeout(thinkTimer);

      bubbleText.textContent = message;
      if (bubbleActions) {
        bubbleActions.hidden = !withCta;
      }
      bubble.hidden = false;

      bubbleTimer = window.setTimeout(() => {
        if (bubble) bubble.hidden = true;
      }, 9500);
    }

    function hideBubble() {
      window.clearTimeout(bubbleTimer);
      window.clearTimeout(thinkTimer);
      if (bubble) bubble.hidden = true;
    }

    if (bubbleClose) {
      bubbleClose.addEventListener('click', hideBubble);
    }

    // Animated cycling input placeholder
    if (promptInput && !prefersReducedMotion.matches) {
      let promptIdx = 0;
      window.setInterval(() => {
        if (document.activeElement === promptInput || promptInput.value.trim() !== '') return;
        promptIdx = (promptIdx + 1) % CYCLING_PROMPTS.length;
        promptInput.placeholder = CYCLING_PROMPTS[promptIdx];
      }, 3200);
    } else if (promptInput) {
      promptInput.placeholder = 'Ask Sophia anything about OneReach Labs...';
    }

    // Hook external triggers (keyboard button + prompt submit) into active 3D scene callbacks
    let onCharacterReact = () => {};

    if (pokeBtn) {
      pokeBtn.addEventListener('click', () => {
        const line = POKE_LINES[pokeIndex % POKE_LINES.length];
        pokeIndex += 1;
        onCharacterReact();
        showBubble(line.text, line.cta);
      });
    }

    if (promptForm && promptInput) {
      promptForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = promptInput.value.trim();
        if (!query) {
          promptInput.focus();
          return;
        }
        onCharacterReact();
        const answer = resolveSophiaAnswer(query);
        promptInput.value = '';

        if (prefersReducedMotion.matches) {
          showBubble(answer.text, answer.cta);
          return;
        }

        showBubble('Sophia is checking signals...', false);
        thinkTimer = window.setTimeout(() => {
          showBubble(answer.text, answer.cta);
        }, 230);
      });
    }

    // Greet gently 1.8s after load unless user already interacted
    window.setTimeout(() => {
      if (bubble && bubble.hidden && !prefersReducedMotion.matches) {
        showBubble("Hi! I'm Sophia \u2014 click me or ask about our 3\u00d7 guarantee below.", false);
      }
    }, 1800);

    // Try WebGL Three.js scene first; fall back cleanly to 2D isometric canvas if unavailable
    const THREE = window.THREE;
    if (!THREE) {
      initHero2DFallback(stage, canvas, bubble, () => {
        const line = POKE_LINES[pokeIndex % POKE_LINES.length];
        pokeIndex += 1;
        showBubble(line.text, line.cta);
      }, (cb) => {
        onCharacterReact = cb;
      });
      return;
    }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch {
      initHero2DFallback(stage, canvas, bubble, () => {
        const line = POKE_LINES[pokeIndex % POKE_LINES.length];
        pokeIndex += 1;
        showBubble(line.text, line.cta);
      }, (cb) => {
        onCharacterReact = cb;
      });
      return;
    }

    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
    camera.position.set(10.5, 8.1, 11.4);
    camera.lookAt(0.12, 0.92, -0.12);

    // Lightweight studio environment so PBR .glb materials (porcelain, concrete, water) reflect midnight navy & cobalt studio light
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x172859);
      const envDome = new THREE.Mesh(
        new THREE.BoxGeometry(14, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0x22336a, side: THREE.BackSide })
      );
      const envKey = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 8),
        new THREE.MeshBasicMaterial({ color: 0xeef2ff, side: THREE.DoubleSide })
      );
      envKey.position.set(4, 6, 3);
      envKey.lookAt(0, 0, 0);
      const envWarm = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 5),
        new THREE.MeshBasicMaterial({ color: 0xfff6ee, side: THREE.DoubleSide })
      );
      envWarm.position.set(-4, 4, 5);
      envWarm.lookAt(0, 0, 0);
      envScene.add(envDome, envKey, envWarm);
      scene.environment = pmrem.fromScene(envScene, 0.04).texture;
      pmrem.dispose();
    } catch {
      // Proceed cleanly with directional/hemisphere lights if PMREM is unavailable
    }

    // Crisp OneReach Studio Lighting (Cool Cobalt Key + Warm Amber Rim)
    const hemiLight = new THREE.HemisphereLight(0xeef2ff, 0x22336a, 1.0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff6ee, 1.52);
    sunLight.position.set(8.8, 13.4, 5.4);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 34;
    sunLight.shadow.camera.left = -5.2;
    sunLight.shadow.camera.right = 5.2;
    sunLight.shadow.camera.top = 5.4;
    sunLight.shadow.camera.bottom = -4.2;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x8fa6ff, 0.64);
    fillLight.position.set(-8.5, 6.0, -5.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf08a2e, 0.42);
    rimLight.position.set(-4.0, 5.2, 8.5);
    scene.add(rimLight);

    // Master Diorama Group (rotates gently with cursor + scroll)
    const worldRoot = new THREE.Group();
    scene.add(worldRoot);

    // Deterministic canvas grain + micro-relief texture generator for organic plinth & fallback monoliths
    function makeOrganicTextures(baseHex, darkHex, lightHex, {
      size = 128,
      rx = 1,
      ry = 1,
      speckles = 1100,
      streaks = false
    } = {}) {
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = size;
      colorCanvas.height = size;
      const cCtx = colorCanvas.getContext('2d');

      const bumpCanvas = document.createElement('canvas');
      bumpCanvas.width = size;
      bumpCanvas.height = size;
      const bCtx = bumpCanvas.getContext('2d');

      if (cCtx && bCtx) {
        cCtx.fillStyle = baseHex;
        cCtx.fillRect(0, 0, size, size);
        bCtx.fillStyle = '#808080';
        bCtx.fillRect(0, 0, size, size);

        let seed = 1337;
        const rand = () => {
          seed = (seed * 16807) % 2147483647;
          return (seed - 1) / 2147483646;
        };

        for (let i = 0; i < speckles; i += 1) {
          const x = rand() * size;
          const y = rand() * size;
          const r = 0.8 + rand() * 2.6;
          const isDark = rand() > 0.46;
          cCtx.globalAlpha = 0.14 + rand() * 0.28;
          cCtx.fillStyle = isDark ? darkHex : lightHex;
          cCtx.fillRect(x, y, r, r);

          bCtx.globalAlpha = 0.18 + rand() * 0.26;
          bCtx.fillStyle = isDark ? '#585858' : '#b8b8b8';
          bCtx.fillRect(x, y, r, r);
        }

        if (streaks) {
          for (let i = 0; i < 65; i += 1) {
            const x = rand() * size;
            const y = rand() * size;
            const w = 1 + rand() * 2;
            const h = 10 + rand() * 34;
            cCtx.globalAlpha = 0.09 + rand() * 0.14;
            cCtx.fillStyle = rand() > 0.5 ? darkHex : lightHex;
            cCtx.fillRect(x, y, w, h);

            bCtx.globalAlpha = 0.12;
            bCtx.fillStyle = '#606060';
            bCtx.fillRect(x, y, w, h);
          }
        }
      }

      const map = new THREE.CanvasTexture(colorCanvas);
      map.encoding = THREE.sRGBEncoding;
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(rx, ry);

      const bumpMap = new THREE.CanvasTexture(bumpCanvas);
      bumpMap.wrapS = THREE.RepeatWrapping;
      bumpMap.wrapT = THREE.RepeatWrapping;
      bumpMap.repeat.set(rx, ry);

      return { map, bumpMap };
    }

    // Erodes box vertices by shared world coordinate so edges weather softly without cracking open seams
    function chipStoneBox(geometry, amount = 0.022) {
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 1) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const keyX = Math.round(vx * 100);
        const keyY = Math.round(vy * 100);
        const keyZ = Math.round(vz * 100);
        const hash = Math.sin(keyX * 12.9898 + keyY * 78.233 + keyZ * 37.719) * 43758.5453;
        const frac = (hash - Math.floor(hash)) * 2 - 1;
        const hash2 = Math.cos(keyX * 39.346 + keyY * 11.135 + keyZ * 83.155) * 29482.137;
        const frac2 = (hash2 - Math.floor(hash2)) * 2 - 1;
        pos.setXYZ(i, vx + frac * amount, vy + frac2 * (amount * 0.45), vz - frac * amount);
      }
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
      return geometry;
    }

    const deepClayTex = makeOrganicTextures('#585458', '#38363c', '#777378', { rx: 2, ry: 1, speckles: 1400 });
    const topsoilTex = makeOrganicTextures('#2d2526', '#1c1719', '#45393a', { rx: 2, ry: 1, speckles: 1200 });
    const turfTex = makeOrganicTextures('#2b7d53', '#1a5436', '#46a372', { rx: 2, ry: 2, speckles: 1500 });
    const stoneFallbackTex = makeOrganicTextures('#a8b2c8', '#7582a1', '#d3dcf5', {
      rx: 1.4,
      ry: 2.2,
      speckles: 1300,
      streaks: true
    });

    const deepClayMat = new THREE.MeshStandardMaterial({
      map: deepClayTex.map,
      bumpMap: deepClayTex.bumpMap,
      bumpScale: 0.032,
      roughness: 0.94,
      metalness: 0.02
    });
    const topsoilMat = new THREE.MeshStandardMaterial({
      map: topsoilTex.map,
      bumpMap: topsoilTex.bumpMap,
      bumpScale: 0.04,
      roughness: 0.92,
      metalness: 0.02
    });
    const sandBedMat = new THREE.MeshStandardMaterial({
      color: 0x79849e,
      bumpMap: deepClayTex.bumpMap,
      bumpScale: 0.025,
      roughness: 0.9,
      metalness: 0.02
    });
    const turfMat = new THREE.MeshStandardMaterial({
      map: turfTex.map,
      bumpMap: turfTex.bumpMap,
      bumpScale: 0.03,
      roughness: 0.86,
      metalness: 0.02
    });
    const crackInteriorMat = new THREE.MeshStandardMaterial({ color: 0x0f1d47, roughness: 0.96, metalness: 0.04 });
    const monolithFallbackMat = new THREE.MeshStandardMaterial({
      map: stoneFallbackTex.map,
      bumpMap: stoneFallbackTex.bumpMap,
      bumpScale: 0.035,
      roughness: 0.86,
      metalness: 0.06
    });

    // 1. Deep Gravelly Clay / Bedrock Layer (Lower Strata)
    const clayBase = new THREE.Mesh(chipStoneBox(new THREE.BoxGeometry(4.4, 0.96, 4.4, 4, 2, 4), 0.012), deepClayMat);
    clayBase.position.set(0, -0.82, 0);
    clayBase.castShadow = true;
    clayBase.receiveShadow = true;
    worldRoot.add(clayBase);

    // 2. Dark Organic Topsoil Cutaway Layer (L-Shape leaving front-right corner hollowed for water basin)
    const soilBack = new THREE.Mesh(chipStoneBox(new THREE.BoxGeometry(4.4, 0.56, 2.2, 4, 2, 2), 0.014), topsoilMat);
    soilBack.position.set(0, -0.06, -1.1);
    soilBack.castShadow = true;
    soilBack.receiveShadow = true;
    worldRoot.add(soilBack);

    const soilFrontLeft = new THREE.Mesh(chipStoneBox(new THREE.BoxGeometry(2.2, 0.56, 2.2, 2, 2, 2), 0.014), topsoilMat);
    soilFrontLeft.position.set(-1.1, -0.06, 1.1);
    soilFrontLeft.castShadow = true;
    soilFrontLeft.receiveShadow = true;
    worldRoot.add(soilFrontLeft);

    // Inner cutaway sandy bed below water tank
    const basinBed = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.14, 2.18), sandBedMat);
    basinBed.position.set(1.1, -0.34, 1.1);
    basinBed.receiveShadow = true;
    worldRoot.add(basinBed);

    // Small exposed dirt clods / stones embedded along the soil cutaway strata
    const clodOffsets = [
      [-1.42, -0.45, 2.21, 0.34, 0.14, 0.05],
      [-0.65, -0.18, 2.21, 0.28, 0.12, 0.05],
      [-0.35, -0.86, 2.21, 0.42, 0.16, 0.04],
      [2.21, -0.62, -0.75, 0.05, 0.16, 0.36],
      [2.21, -0.16, -1.35, 0.04, 0.13, 0.28],
      [0.02, -0.06, 1.25, 0.04, 0.14, 0.32]
    ];
    for (const [cx, cy, cz, cw, ch, cd] of clodOffsets) {
      const clod = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cd), cy < -0.34 ? deepClayMat : topsoilMat);
      clod.position.set(cx, cy, cz);
      clod.receiveShadow = true;
      worldRoot.add(clod);
    }

    // 3. Lush Top Moss-Green Turf Cap (L-Shaped y: +0.20 .. +0.34)
    const turfBack = new THREE.Mesh(chipStoneBox(new THREE.BoxGeometry(4.44, 0.15, 2.24, 4, 1, 2), 0.008), turfMat);
    turfBack.position.set(0, 0.27, -1.1);
    turfBack.castShadow = true;
    turfBack.receiveShadow = true;
    worldRoot.add(turfBack);

    const turfFrontLeft = new THREE.Mesh(chipStoneBox(new THREE.BoxGeometry(2.24, 0.15, 2.24, 2, 1, 2), 0.008), turfMat);
    turfFrontLeft.position.set(-1.1, 0.27, 1.1);
    turfFrontLeft.castShadow = true;
    turfFrontLeft.receiveShadow = true;
    worldRoot.add(turfFrontLeft);

    // 4. Cutaway Ocean Water Basin (Front-Right x: 0.02..2.20, z: 0.02..2.20)
    const waterVolumeMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e3db4,
      transparent: true,
      opacity: 0.62,
      roughness: 0.16,
      metalness: 0.08,
      depthWrite: false
    });
    const waterVolume = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.44, 2.16), waterVolumeMat);
    waterVolume.position.set(1.11, -0.06, 1.11);
    worldRoot.add(waterVolume);

    const waterGeo = new THREE.PlaneGeometry(2.16, 2.16, 20, 20);
    waterGeo.rotateX(-Math.PI / 2);
    const waterPosAttr = waterGeo.attributes.position;
    const baseWaterY = new Float32Array(waterPosAttr.count);
    for (let i = 0; i < waterPosAttr.count; i += 1) {
      baseWaterY[i] = waterPosAttr.getY(i);
    }

    const waterSurfaceMat = new THREE.MeshPhysicalMaterial({
      color: 0x5c8aff,
      transparent: true,
      opacity: 0.8,
      roughness: 0.12,
      metalness: 0.14,
      side: THREE.DoubleSide
    });
    const waterSurface = new THREE.Mesh(waterGeo, waterSurfaceMat);
    waterSurface.position.set(1.11, 0.16, 1.11);
    waterSurface.receiveShadow = true;
    worldRoot.add(waterSurface);

    // Subtle shoreline foam highlight along inner cutaway bank (x=0.04 and z=0.04)
    const foamMat = new THREE.MeshBasicMaterial({ color: 0xeef2ff, transparent: true, opacity: 0.62 });
    const foamEdgeX = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 2.12), foamMat);
    foamEdgeX.position.set(0.05, 0.175, 1.11);
    const foamEdgeZ = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.02, 0.05), foamMat);
    foamEdgeZ.position.set(1.11, 0.175, 0.05);
    worldRoot.add(foamEdgeX, foamEdgeZ);

    // Fallback underwater pebbles (replaced/augmented when rocks.glb loads)
    const fallbackPebble1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), new THREE.MeshStandardMaterial({ color: 0x485880, roughness: 0.85 }));
    fallbackPebble1.position.set(0.65, -0.22, 0.75);
    const fallbackPebble2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), new THREE.MeshStandardMaterial({ color: 0x62739e, roughness: 0.85 }));
    fallbackPebble2.position.set(1.48, -0.24, 1.32);
    worldRoot.add(fallbackPebble1, fallbackPebble2);

    // 5. Towering Leaning Fractured Stone/Concrete Monoliths (Upgraded in-place with concrete.glb PBR material)
    const monolithMeshes = [];
    function createFracturedMonolith(x, y, z, totalScaleY, yaw = 0.08) {
      const group = new THREE.Group();
      group.position.set(x, y, z);
      // Tilt cleanly toward screen-right (+X, -Z) to mirror the architectural lean
      group.rotation.set(-0.145, yaw, -0.205);

      const lower = new THREE.Mesh(chipStoneBox(new THREE.BoxGeometry(0.66, 1.62, 0.66, 4, 6, 4), 0.024), monolithFallbackMat);
      lower.position.y = 0.81;
      lower.castShadow = true;
      lower.receiveShadow = true;

      const fractureCore = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, 0.58), crackInteriorMat);
      fractureCore.position.y = 1.63;

      const upper = new THREE.Mesh(chipStoneBox(new THREE.BoxGeometry(0.64, 1.54, 0.64, 4, 6, 4), 0.024), monolithFallbackMat);
      upper.position.set(0.015, 2.42, -0.01);
      upper.rotation.set(0.015, 0.025, -0.02);
      upper.castShadow = true;
      upper.receiveShadow = true;

      group.add(lower, fractureCore, upper);
      group.scale.y = totalScaleY;
      monolithMeshes.push(lower, upper);
      return group;
    }

    const monolithLeft = createFracturedMonolith(-0.68, 0.28, -0.34, 1.06, 0.14);
    const monolithRight = createFracturedMonolith(0.46, 0.24, -0.44, 0.98, 0.06);
    worldRoot.add(monolithLeft, monolithRight);

    // 6. Sparse Procedural Grass & Tulip Fallback Groups (hidden independently once Grab3D GLBs load)
    const grassFallbackGroup = new THREE.Group();
    const flowerFallbackGroup = new THREE.Group();
    worldRoot.add(grassFallbackGroup, flowerFallbackGroup);

    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x368c5e, roughness: 0.74 });
    const bladeCoords = [
      [-1.75, 1.62], [-1.32, 1.78], [-0.45, 1.65], [-1.85, 0.72],
      [-1.58, -0.15], [-1.62, -1.25], [-0.95, -1.55], [0.15, -1.68],
      [1.42, -1.45], [1.72, -0.62], [-0.22, 0.92]
    ];
    for (const [gx, gz] of bladeCoords) {
      const tuft = new THREE.Group();
      for (let k = 0; k < 3; k += 1) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16 + k * 0.04, 0.035), bladeMat);
        blade.position.set((k - 1) * 0.04, 0.08, (k % 2 - 0.5) * 0.03);
        blade.rotation.set((k - 1) * 0.14, k * 0.9, (k - 1) * 0.18);
        blade.castShadow = true;
        tuft.add(blade);
      }
      tuft.position.set(gx, 0.34, gz);
      grassFallbackGroup.add(tuft);
    }

    // Fallback warm amber sentinel flower beside Sophia + 2 cobalt meadow accents
    function createFallbackFlower(hexColor, emissiveHex, fx, fz) {
      const fl = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.035), bladeMat);
      stem.position.y = 0.09;
      const bud = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.09, 0.09),
        new THREE.MeshStandardMaterial({
          color: hexColor,
          emissive: emissiveHex,
          emissiveIntensity: 0.28,
          roughness: 0.4
        })
      );
      bud.position.y = 0.21;
      bud.castShadow = true;
      fl.add(stem, bud);
      fl.position.set(fx, 0.34, fz);
      flowerFallbackGroup.add(fl);
    }
    createFallbackFlower(0xf08a2e, 0xf08a2e, -0.92, 0.42);
    createFallbackFlower(0x8fa6ff, 0x1e3db4, -1.45, -1.12);
    createFallbackFlower(0x1e3db4, 0x8fa6ff, 1.18, -1.35);

    // 7. Swooping Bird (Fallback replaced by bird.glb when served over HTTP)
    const birdGroup = new THREE.Group();
    const birdFallbackRoot = new THREE.Group();
    const fallbackBirdWingMat = new THREE.MeshStandardMaterial({
      color: 0xeef2ff,
      emissive: 0x8fa6ff,
      emissiveIntensity: 0.18,
      roughness: 0.4
    });
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.08), fallbackBirdWingMat);
    wingL.position.x = -0.09;
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.08), fallbackBirdWingMat);
    wingR.position.x = 0.09;
    const birdBodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.16), fallbackBirdWingMat);
    birdFallbackRoot.add(birdBodyMesh, wingL, wingR);
    birdGroup.add(birdFallbackRoot);
    worldRoot.add(birdGroup);

    // 8. Compact Interactive "Sophia" Character standing front-left by the monoliths
    const sophiaGroup = new THREE.Group();
    sophiaGroup.position.set(-0.68, 0.34, 0.66);
    sophiaGroup.rotation.y = 0.62;
    worldRoot.add(sophiaGroup);

    const sophiaBody = new THREE.Group();
    sophiaGroup.add(sophiaBody);

    // Compact (~0.78m tall) porcelain-and-cobalt Sophia fallback so proportions match reference even on file://
    const sophiaFallbackRoot = new THREE.Group();
    sophiaFallbackRoot.scale.setScalar(0.5);
    sophiaBody.add(sophiaFallbackRoot);

    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f1d47, roughness: 0.68 });
    const porcelainMat = new THREE.MeshStandardMaterial({ color: 0xf3f5fb, roughness: 0.32, metalness: 0.1 });
    const cobaltJacketMat = new THREE.MeshStandardMaterial({
      color: 0x1e3db4,
      emissive: 0x162d90,
      emissiveIntensity: 0.24,
      roughness: 0.36,
      metalness: 0.1
    });
    const amberBeaconMat = new THREE.MeshStandardMaterial({
      color: 0xf08a2e,
      emissive: 0xf08a2e,
      emissiveIntensity: 0.45,
      roughness: 0.32
    });
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x0a1638, roughness: 0.22, metalness: 0.35 });

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.18), shoeMat);
    legL.position.set(-0.13, 0.21, 0);
    legL.castShadow = true;
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.18), shoeMat);
    legR.position.set(0.13, 0.21, 0);
    legR.castShadow = true;

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.54, 0.32), cobaltJacketMat);
    torso.position.set(0, 0.68, 0);
    torso.castShadow = true;

    const chestBadge = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.04), porcelainMat);
    chestBadge.position.set(0, 0.71, 0.17);

    const armLPivot = new THREE.Group();
    armLPivot.position.set(-0.36, 0.88, 0);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.44, 0.16), porcelainMat);
    armL.position.y = -0.19;
    armL.castShadow = true;
    armLPivot.add(armL);

    const armRPivot = new THREE.Group();
    armRPivot.position.set(0.36, 0.88, 0);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.44, 0.16), porcelainMat);
    armR.position.y = -0.19;
    armR.castShadow = true;
    armRPivot.add(armR);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.28, 0);
    const headBlock = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.56, 0.58), porcelainMat);
    headBlock.castShadow = true;
    const visorBand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.04), visorMat);
    visorBand.position.set(0, 0.03, 0.295);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x8fa6ff });
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.03), eyeMat);
    eyeL.position.set(-0.12, 0.03, 0.315);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.03), eyeMat);
    eyeR.position.set(0.12, 0.03, 0.315);

    const stemAnt = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.2, 0.045), shoeMat);
    stemAnt.position.set(0.22, 0.37, 0);
    const tipAnt = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), amberBeaconMat);
    tipAnt.position.set(0.22, 0.5, 0);

    headGroup.add(headBlock, visorBand, eyeL, eyeR, stemAnt, tipAnt);
    sophiaFallbackRoot.add(legL, legR, torso, chestBadge, armLPivot, armRPivot, headGroup);

    // Anchor above Sophia's head (~1.05m above grass) for speech bubble projection
    const headAnchor = new THREE.Object3D();
    headAnchor.position.set(0, 1.06, 0);
    sophiaBody.add(headAnchor);

    // Generous invisible raycast hit box around Sophia
    const hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 1.25, 0.92),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitMesh.position.y = 0.52;
    sophiaGroup.add(hitMesh);

    // Foot Shockwave Pulse Ring
    const shockRingGeo = new THREE.RingGeometry(0.2, 0.32, 24);
    shockRingGeo.rotateX(-Math.PI / 2);
    const shockRingMat = new THREE.MeshBasicMaterial({
      color: 0x8fa6ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const shockRing = new THREE.Mesh(shockRingGeo, shockRingMat);
    shockRing.position.set(0, 0.02, 0);
    sophiaGroup.add(shockRing);

    // Normalize any Grab3D GLTF asset to exact height, horizontally centered, grounded at min.y = 0
    function normalizeGlbRoot(root, targetHeight) {
      root.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      const scale = targetHeight / Math.max(size.y, 0.001);
      root.scale.multiplyScalar(scale);
      root.updateMatrixWorld(true);

      const scaledBox = new THREE.Box3().setFromObject(root);
      scaledBox.getCenter(center);
      root.position.x -= center.x;
      root.position.z -= center.z;
      root.position.y -= scaledBox.min.y;

      const wrapper = new THREE.Group();
      wrapper.add(root);
      return wrapper;
    }

    // Load CC0 Grab3D .glb assets asynchronously when served over HTTP/HTTPS
    let sophiaGlbLoaded = false;
    if (typeof THREE.GLTFLoader === 'function' && window.location.protocol !== 'file:') {
      const loader = new THREE.GLTFLoader();
      const loadGlb = (url, onDone) => {
        loader.load(url, (gltf) => {
          if (gltf && gltf.scene) onDone(gltf.scene);
        }, undefined, () => {
          // Retain clean procedural fallback silently if a model fails to load
        });
      };

      // 1. Concrete Barrier -> Extract real weathered PBR concrete material for twin leaning monoliths
      loadGlb('./assets/models/concrete.glb', (gltfScene) => {
        let extractedMat = null;
        gltfScene.traverse((child) => {
          if (!extractedMat && child.isMesh && child.material) {
            extractedMat = child.material.clone();
          }
        });
        if (!extractedMat) return;
        for (const mapKey of ['map', 'normalMap', 'roughnessMap', 'bumpMap']) {
          if (extractedMat[mapKey]) {
            extractedMat[mapKey] = extractedMat[mapKey].clone();
            extractedMat[mapKey].wrapS = THREE.RepeatWrapping;
            extractedMat[mapKey].wrapT = THREE.RepeatWrapping;
            extractedMat[mapKey].repeat.set(1.3, 2.2);
            extractedMat[mapKey].needsUpdate = true;
          }
        }
        extractedMat.color = new THREE.Color(0xd3dcf5);
        extractedMat.roughness = Math.max(0.75, extractedMat.roughness || 0.85);
        for (const mesh of monolithMeshes) {
          mesh.material = extractedMat;
        }
      });

      // 2. Porcelain Android -> Interactive Sophia (~0.84m scaled beside monumental pillars)
      loadGlb('./assets/models/sophia.glb', (gltfScene) => {
        const model = normalizeGlbRoot(gltfScene, 0.84);
        sophiaFallbackRoot.visible = false;
        sophiaBody.add(model);
        sophiaGlbLoaded = true;
      });

      // 3. Grass Clump -> Dense organic 3D turf carpet across L-shaped island
      loadGlb('./assets/models/grass.glb', (gltfScene) => {
        const proto = normalizeGlbRoot(gltfScene, 0.24);
        grassFallbackGroup.visible = false;
        const grassContainer = new THREE.Group();
        let seed = 4209;
        const nextRand = () => {
          seed = (seed * 16807) % 2147483647;
          return (seed - 1) / 2147483646;
        };

        for (let i = 0; i < 48; i += 1) {
          const inBackStrip = i < 30;
          const gx = inBackStrip ? -2.02 + nextRand() * 4.04 : -2.02 + nextRand() * 1.92;
          const gz = inBackStrip ? -2.02 + nextRand() * 1.92 : -0.04 + nextRand() * 2.04;
          // Keep footprints clear under monoliths and Sophia
          if (Math.hypot(gx + 0.68, gz - 0.66) < 0.34) continue;
          if (Math.hypot(gx + 0.68, gz + 0.34) < 0.42) continue;
          if (Math.hypot(gx - 0.46, gz + 0.44) < 0.42) continue;

          const clump = proto.clone(true);
          const s = 0.8 + nextRand() * 0.65;
          clump.scale.set(s * (0.9 + nextRand() * 0.3), s, s * (0.9 + nextRand() * 0.3));
          clump.rotation.set((nextRand() - 0.5) * 0.14, nextRand() * Math.PI * 2, (nextRand() - 0.5) * 0.14);
          clump.position.set(gx, 0.33, gz);
          grassContainer.add(clump);
        }
        worldRoot.add(grassContainer);
      });

      // 4. Tulip Flowers -> Amber sentinel flower by Sophia & cobalt meadow blooms
      loadGlb('./assets/models/tulip.glb', (gltfScene) => {
        const proto = normalizeGlbRoot(gltfScene, 0.34);
        flowerFallbackGroup.visible = false;
        const tulipSpots = [
          [-0.96, 0.34, 0.42, 1.0, 0.4],
          [-1.54, 0.34, -0.95, 0.85, 1.9],
          [1.26, 0.34, -1.28, 0.9, -0.8],
          [-0.18, 0.34, 1.48, 0.78, 2.5]
        ];
        const bloomColors = [0xf08a2e, 0x8fa6ff, 0x1e3db4, 0xf08a2e];
        tulipSpots.forEach(([tx, ty, tz, sc, rotY], idx) => {
          const flower = proto.clone(true);
          const accentHex = bloomColors[idx % bloomColors.length];
          flower.traverse((child) => {
            if (!child.isMesh || !child.material) return;
            const mat = child.material;
            const c = mat.color;
            const isStemGreen = c && c.g > c.r * 1.15 && c.g > c.b * 1.1;
            if (!isStemGreen && !mat.map) {
              const tinted = mat.clone();
              tinted.color = new THREE.Color(accentHex);
              tinted.emissive = new THREE.Color(accentHex);
              tinted.emissiveIntensity = 0.24;
              child.material = tinted;
            }
          });
          flower.scale.setScalar(sc);
          flower.rotation.y = rotY;
          flower.position.set(tx, ty, tz);
          worldRoot.add(flower);
        });
      });

      // 5. Small Rock Set -> Shoreline stones + submerged cutaway riverbed rocks
      loadGlb('./assets/models/rocks.glb', (gltfScene) => {
        const proto = normalizeGlbRoot(gltfScene, 0.24);
        fallbackPebble1.visible = false;
        fallbackPebble2.visible = false;
        const rockPlacements = [
          [-0.14, 0.33, 0.24, 0.9, 0.3],
          [1.36, 0.32, -0.14, 0.78, 1.7],
          [0.72, -0.27, 0.82, 1.05, 0.8],
          [1.52, -0.28, 1.38, 0.92, 2.4]
        ];
        for (const [rx, ry, rz, sc, rotY] of rockPlacements) {
          const rocks = proto.clone(true);
          rocks.scale.setScalar(sc);
          rocks.rotation.y = rotY;
          rocks.position.set(rx, ry, rz);
          worldRoot.add(rocks);
        }
      });

      // 6. Stone Blocks Stack -> Weathered architectural rubble near rear-left monolith
      loadGlb('./assets/models/blocks.glb', (gltfScene) => {
        const rubble = normalizeGlbRoot(gltfScene, 0.44);
        rubble.position.set(-1.38, 0.33, -0.82);
        rubble.rotation.y = 0.55;
        worldRoot.add(rubble);
      });

      // 7. Low-Poly Bird -> Swooping bird near the upper leaning monolith
      loadGlb('./assets/models/bird.glb', (gltfScene) => {
        const birdModel = normalizeGlbRoot(gltfScene, 0.24);
        birdFallbackRoot.visible = false;
        birdGroup.add(birdModel);
      });
    } else if (window.location.protocol === 'file:') {
      console.info(
        '[OneReach Hero] Opened via file:// — showing procedural fallback diorama. Serve over HTTP (e.g., Live Server / localhost) to load Grab3D .glb assets.'
      );
    }

    // Animation & Interaction State
    let jumpY = 0;
    let jumpVel = 0;
    let armWave = 0;
    let shockT = 1;
    let pointerX = 0;
    let pointerY = 0;
    let currentRotY = 0;
    let currentRotX = 0;
    let isHoveringSophia = false;

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const projectedVec = new THREE.Vector3();

    function triggerJumpReaction() {
      jumpVel = 0.13;
      armWave = 1;
      shockT = 0;
    }

    onCharacterReact = triggerJumpReaction;

    function updateRayPointer(e) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const xNorm = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const yNorm = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerNdc.set(xNorm, yNorm);
    }

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        pointerX = clamp(((e.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
        pointerY = clamp(((e.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
      }
      updateRayPointer(e);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObject(hitMesh, false);
      const hitNow = hits.length > 0;
      if (hitNow !== isHoveringSophia) {
        isHoveringSophia = hitNow;
        canvas.classList.toggle('is-hovering-sophia', isHoveringSophia);
      }
    });

    canvas.addEventListener('pointerleave', () => {
      pointerX = 0;
      pointerY = 0;
      isHoveringSophia = false;
      canvas.classList.remove('is-hovering-sophia');
    });

    let downPos = { x: 0, y: 0 };
    canvas.addEventListener('pointerdown', (e) => {
      downPos = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('pointerup', (e) => {
      const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (moved > 8) return;
      updateRayPointer(e);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObject(hitMesh, false);
      if (hits.length > 0) {
        triggerJumpReaction();
        const line = POKE_LINES[pokeIndex % POKE_LINES.length];
        pokeIndex += 1;
        showBubble(line.text, line.cta);
      }
    });

    function syncRendererSize() {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      const aspect = w / h;
      camera.aspect = aspect;
      if (aspect < 0.94) {
        camera.position.set(11.4, 8.7, 12.3);
      } else {
        camera.position.set(10.5, 8.1, 11.4);
      }
      camera.lookAt(0.12, 0.92, -0.12);
      camera.updateProjectionMatrix();
    }

    const stageRo = new ResizeObserver(syncRendererSize);
    stageRo.observe(stage);
    syncRendererSize();

    const clock = new THREE.Clock();

    function projectBubbleToSophia() {
      if (!bubble || bubble.hidden) return;
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (!w || !h) return;

      headAnchor.getWorldPosition(projectedVec);
      projectedVec.project(camera);

      const px = (projectedVec.x * 0.5 + 0.5) * w;
      const py = (-projectedVec.y * 0.5 + 0.5) * h;

      const bWidth = bubble.offsetWidth || 270;
      const bHeight = bubble.offsetHeight || 96;
      const clampedX = clamp(px, bWidth * 0.5 + 8, w - bWidth * 0.5 - 8);
      const clampedY = clamp(py - 12, bHeight + 12, h - 10);

      bubble.style.transform = `translate3d(${Math.round(clampedX - bWidth * 0.5)}px, ${Math.round(clampedY - bHeight)}px, 0)`;
    }

    let rafId = 0;
    function animate() {
      rafId = window.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const reduced = prefersReducedMotion.matches;

      if (!reduced) {
        // Parallax rotation toward cursor + gentle scroll response
        const scrollRatio = clamp(window.scrollY / Math.max(1, window.innerHeight), 0, 1);
        const targetRotY = pointerX * 0.14 - scrollRatio * 0.24;
        const targetRotX = pointerY * 0.05 + scrollRatio * 0.06;
        currentRotY = lerp(currentRotY, targetRotY, 0.07);
        currentRotX = lerp(currentRotX, targetRotX, 0.07);
        worldRoot.rotation.y = currentRotY;
        worldRoot.rotation.x = currentRotX;

        // Rippling translucent ocean water plane
        for (let i = 0; i < waterPosAttr.count; i += 1) {
          const vx = waterPosAttr.getX(i);
          const vz = waterPosAttr.getZ(i);
          const wave = Math.sin(vx * 3.0 + elapsed * 2.3) * 0.02 + Math.cos(vz * 2.8 - elapsed * 1.9) * 0.018;
          waterPosAttr.setY(i, baseWaterY[i] + wave);
        }
        waterPosAttr.needsUpdate = true;
        waterGeo.computeVertexNormals();

        // Bird gliding smoothly around the upper leaning monoliths
        const orbitAngle = elapsed * 0.44 + 0.35;
        birdGroup.position.set(
          0.42 + Math.cos(orbitAngle) * 1.45,
          2.68 + Math.sin(elapsed * 2.0) * 0.14,
          -0.35 + Math.sin(orbitAngle) * 1.25
        );
        birdGroup.rotation.y = -orbitAngle;
        const flap = Math.sin(elapsed * 10.5) * 0.42;
        wingL.rotation.z = flap;
        wingR.rotation.z = -flap;

        // Fallback Sophia eyes blink + head follow; whole body subtle curiosity yaw for .glb too
        if (sophiaGlbLoaded) {
          sophiaBody.rotation.y = lerp(sophiaBody.rotation.y, pointerX * 0.26, 0.08);
        } else {
          headGroup.rotation.y = lerp(headGroup.rotation.y, pointerX * 0.32, 0.08);
          headGroup.rotation.x = lerp(headGroup.rotation.x, pointerY * 0.14, 0.08);
          const blinkWindow = elapsed % 3.6;
          const eyeScaleY = blinkWindow > 3.45 ? 0.15 : 1;
          eyeL.scale.y = eyeScaleY;
          eyeR.scale.y = eyeScaleY;
        }
      }

      // Sophia bounce & squash physics on click or prompt
      if (jumpY > 0 || jumpVel !== 0) {
        jumpY += jumpVel;
        jumpVel -= 0.01;
        if (jumpY <= 0) {
          jumpY = 0;
          jumpVel = 0;
        }
      }
      const idleBob = reduced ? 0 : Math.sin(elapsed * 2.2) * 0.018;
      sophiaBody.position.y = jumpY + idleBob;

      const squash = jumpY > 0.04 ? 1 + Math.min(0.14, jumpVel * 0.85) : 1;
      sophiaBody.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));

      if (!sophiaGlbLoaded) {
        if (armWave > 0.01) {
          armWave *= 0.9;
          armLPivot.rotation.z = -armWave * 2.1;
          armRPivot.rotation.z = armWave * 2.1;
        } else {
          armLPivot.rotation.z = 0;
          armRPivot.rotation.z = 0;
        }
      }

      if (shockT < 1) {
        shockT = Math.min(1, shockT + 0.045);
        const ringScale = 1 + shockT * 2.2;
        shockRing.scale.set(ringScale, 1, ringScale);
        shockRingMat.opacity = (1 - shockT) * 0.65;
      } else {
        shockRingMat.opacity = 0;
      }

      renderer.render(scene, camera);
      projectBubbleToSophia();
    }

    animate();

    // Pause continuous loop when tab is backgrounded
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      } else if (!document.hidden && !rafId) {
        clock.getDelta();
        animate();
      }
    });
  }

  /* =========================================================================
     5. GRACEFUL 2D FALLBACK RENDERER (IF WEBGL / CDN UNAVAILABLE)
     ========================================================================= */
  function initHero2DFallback(stage, canvas, bubble, onTriggerBubble, registerReact) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let jump = 0;
    let vel = 0;
    registerReact(() => {
      vel = 9;
    });

    canvas.addEventListener('click', () => {
      vel = 9;
      onTriggerBubble();
    });

    function draw() {
      const w = stage.clientWidth || 460;
      const h = stage.clientHeight || 420;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (jump > 0 || vel !== 0) {
        jump += vel;
        vel -= 0.7;
        if (jump <= 0) {
          jump = 0;
          vel = 0;
        }
      }

      const cx = w * 0.5;
      const cy = h * 0.62;

      // Isometric diamond island base
      ctx.fillStyle = '#22336a';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 72);
      ctx.lineTo(cx + 150, cy - 8);
      ctx.lineTo(cx + 150, cy - 52);
      ctx.lineTo(cx, cy + 24);
      ctx.lineTo(cx - 150, cy - 52);
      ctx.lineTo(cx - 150, cy - 8);
      ctx.closePath();
      ctx.fill();

      // Grass top
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 115);
      ctx.lineTo(cx + 150, cy - 52);
      ctx.lineTo(cx, cy + 24);
      ctx.lineTo(cx - 150, cy - 52);
      ctx.closePath();
      ctx.fill();

      // Translucent front water corner
      ctx.fillStyle = 'rgba(143, 166, 255, 0.75)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 42);
      ctx.lineTo(cx + 115, cy - 50);
      ctx.lineTo(cx + 115, cy - 14);
      ctx.lineTo(cx, cy + 32);
      ctx.closePath();
      ctx.fill();

      // Accent meadow blooms (amber + cobalt)
      ctx.fillStyle = '#f08a2e';
      ctx.fillRect(cx - 78, cy - 54, 7, 7);
      ctx.fillStyle = '#8fa6ff';
      ctx.fillRect(cx + 42, cy - 78, 7, 7);

      // Voxel Sophia Figure
      const sx = cx - 44;
      const sy = cy - 46 - jump;
      ctx.fillStyle = '#1e3db4';
      ctx.fillRect(sx - 18, sy - 42, 36, 38);
      ctx.fillStyle = '#f3f5fb';
      ctx.fillRect(sx - 22, sy - 86, 44, 42);
      ctx.fillStyle = '#0a1638';
      ctx.fillRect(sx - 15, sy - 74, 30, 12);
      ctx.fillStyle = '#8fa6ff';
      ctx.fillRect(sx - 10, sy - 70, 6, 4);
      ctx.fillRect(sx + 4, sy - 70, 6, 4);
      ctx.fillStyle = '#f08a2e';
      ctx.beginPath();
      ctx.arc(sx + 12, sy - 95, 4, 0, Math.PI * 2);
      ctx.fill();

      if (bubble && !bubble.hidden) {
        const bw = bubble.offsetWidth || 260;
        const bh = bubble.offsetHeight || 90;
        const bx = clamp(sx, bw * 0.5 + 8, w - bw * 0.5 - 8);
        const by = clamp(sy - 102, bh + 10, h - 10);
        bubble.style.transform = `translate3d(${Math.round(bx - bw * 0.5)}px, ${Math.round(by - bh)}px, 0)`;
      }

      window.requestAnimationFrame(draw);
    }

    draw();
  }

  /* =========================================================================
     6. SCROLL ORB VISIBILITY (SHOW BELOW HERO)
     ========================================================================= */
  function initScrollOrbVisibility() {
    const orb = document.querySelector('.scroll-orb');
    if (!orb) return;

    const update = () => {
      const threshold = Math.max(220, window.innerHeight * 0.4);
      orb.classList.toggle('is-visible', window.scrollY > threshold);
    };

    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* =========================================================================
     BOOTSTRAP
     ========================================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    initNavigationLinks();
    initHeaderNav();
    initHero3D();
    initScrollOrbVisibility();
  });
})();
