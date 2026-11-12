/**
 * OneReach Labs — Part B Interactive Controls & Accessible Dialog Fallbacks
 * Handles:
 *  - #sophia specialist capability chips & live command preview bar
 *  - #inbound-outbound & #data scroll-driven progressive fallbacks
 *  - #pricing engagement preset sync with #engagement-mode
 *  - Native <dialog> Invoker Commands fallback, Safari closedby="any" light-dismiss,
 *    returnValue cleanup, and top-layer exit transition fallback
 */
(function () {
  'use strict';

  function initEngagementPresets() {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-engagement-preset]');
      if (!trigger) return;

      const value = trigger.getAttribute('data-engagement-preset');
      const select = document.getElementById('engagement-mode');
      if (!value || !(select instanceof HTMLSelectElement)) return;

      const hasOption = Array.from(select.options).some((opt) => opt.value === value);
      if (!hasOption) return;

      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  let supportsDisplayTransition;
  function canTransitionDisplay() {
    if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
    if (!window.CSS || typeof window.CSS.supports !== 'function' || !window.CSS.supports('transition-behavior', 'allow-discrete') || !document.body) {
      supportsDisplayTransition = false;
      return false;
    }
    const probe = document.createElement('div');
    probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
    document.body.appendChild(probe);
    window.getComputedStyle(probe).display;
    probe.style.display = 'none';
    supportsDisplayTransition = window.getComputedStyle(probe).display === 'block';
    probe.remove();
    return supportsDisplayTransition;
  }

  function supportsTopLayerExit() {
    return Boolean(window.CSS && typeof window.CSS.supports === 'function' && window.CSS.supports('overlay', 'auto') && canTransitionDisplay());
  }

  async function closeTopLayerDialog(dialog) {
    if (!(dialog instanceof HTMLDialogElement) || !dialog.open) return;

    if (!supportsTopLayerExit()) {
      dialog.setAttribute('data-closing', '');
      const animations = typeof dialog.getAnimations === 'function' ? dialog.getAnimations({ subtree: true }) : [];
      if (animations.length > 0) {
        await Promise.race([
          Promise.allSettled(animations.map((anim) => anim.finished)),
          new Promise((resolve) => window.setTimeout(resolve, 600))
        ]);
      }
      if (!dialog.hasAttribute('data-closing')) return;
      dialog.removeAttribute('data-closing');
    }

    if (dialog.open) {
      dialog.close();
    }
  }

  function initDialogs() {
    const supportsInvokers =
      typeof HTMLButtonElement !== 'undefined' &&
      'commandForElement' in HTMLButtonElement.prototype;

    const supportsClosedBy =
      typeof HTMLDialogElement !== 'undefined' &&
      'closedBy' in HTMLDialogElement.prototype;

    // 1. Open/close fallback for [data-open-dialog] & non-invoker browsers
    document.addEventListener('click', (event) => {
      const parentCloser = event.target.closest('[data-close-parent-dialog="true"]');
      if (parentCloser) {
        const parentDialog = parentCloser.closest('dialog');
        if (parentDialog instanceof HTMLDialogElement && parentDialog.open) {
          parentDialog.removeAttribute('data-closing');
          parentDialog.close();
        }
        return;
      }

      const openTrigger = event.target.closest('[data-open-dialog]');
      if (openTrigger) {
        const isNativeInvoker =
          supportsInvokers &&
          openTrigger instanceof HTMLButtonElement &&
          openTrigger.getAttribute('command') === 'show-modal' &&
          openTrigger.hasAttribute('commandfor');

        if (!isNativeInvoker) {
          const dialogId = openTrigger.getAttribute('data-open-dialog');
          const dialog = dialogId ? document.getElementById(dialogId) : null;
          if (dialog instanceof HTMLDialogElement && typeof dialog.showModal === 'function') {
            event.preventDefault();
            if (!dialog.open) {
              dialog.removeAttribute('data-closing');
              dialog.showModal();
            }
          }
        }
        return;
      }

      if (!supportsInvokers) {
        const cmdBtn = event.target.closest('button[command][commandfor]');
        if (!cmdBtn) return;

        const command = cmdBtn.getAttribute('command');
        const targetId = cmdBtn.getAttribute('commandfor');
        const target = targetId ? document.getElementById(targetId) : null;
        if (!(target instanceof HTMLDialogElement)) return;

        if (command === 'show-modal') {
          event.preventDefault();
          if (!target.open) {
            target.removeAttribute('data-closing');
            target.showModal();
          }
        } else if (command === 'close' || command === 'request-close') {
          event.preventDefault();
          closeTopLayerDialog(target);
        }
      }
    });

    // 2. Per-dialog lifecycle: returnValue reset, closedby="any" Safari fallback, exit transition fallback
    const dialogs = Array.from(document.querySelectorAll('dialog.orl-dialog'));
    const isOutsideDialog = (event, dialog) => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      );
    };

    dialogs.forEach((dialog) => {
      dialog.addEventListener('close', () => {
        dialog.removeAttribute('data-closing');
        dialog.returnValue = '';
      });

      dialog.addEventListener('cancel', (event) => {
        if (!supportsTopLayerExit()) {
          event.preventDefault();
          closeTopLayerDialog(dialog);
        }
      });

      dialog.addEventListener('submit', (event) => {
        const form = event.target;
        if (form instanceof HTMLFormElement && form.getAttribute('method') === 'dialog' && !supportsTopLayerExit()) {
          event.preventDefault();
          closeTopLayerDialog(dialog);
        }
      });

      if (!supportsClosedBy && dialog.getAttribute('closedby') === 'any') {
        let pressedOutside = false;

        dialog.addEventListener('pointerdown', (event) => {
          pressedOutside = dialog.open && isOutsideDialog(event, dialog);
        });

        dialog.addEventListener('pointerup', (event) => {
          if (pressedOutside && dialog.open && isOutsideDialog(event, dialog)) {
            closeTopLayerDialog(dialog);
          }
          pressedOutside = false;
        });
      }
    });
  }

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  function setupScrollFallback(sectionEl, { onUpdate, onClear }) {
    if (!sectionEl) return;

    const supportsSDA =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('(animation-timeline: scroll()) and (animation-range: 0% 100%)');

    // Use native CSS Scroll-Driven Animations wherever supported
    if (supportsSDA) return;

    const motionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const desktopQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(min-width: 901px)')
        : null;

    let rafId = 0;
    let isNearViewport = true;

    function updateFrame() {
      rafId = 0;
      const canAnimate =
        (!motionQuery || !motionQuery.matches) &&
        (!desktopQuery || desktopQuery.matches);

      if (!canAnimate) {
        sectionEl.classList.remove('scroll-fallback');
        onClear();
        return;
      }

      sectionEl.classList.add('scroll-fallback');
      const rect = sectionEl.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel > 0 ? clamp01(-rect.top / travel) : 1;
      onUpdate(p);
    }

    function scheduleUpdate() {
      if (!isNearViewport || rafId) return;
      rafId = window.requestAnimationFrame(updateFrame);
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          isNearViewport = Boolean(entries[0]?.isIntersecting);
          if (isNearViewport) scheduleUpdate();
        },
        { rootMargin: '400px 0px' }
      );
      io.observe(sectionEl);
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    if (motionQuery && typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', scheduleUpdate);
    }
    if (desktopQuery && typeof desktopQuery.addEventListener === 'function') {
      desktopQuery.addEventListener('change', scheduleUpdate);
    }

    updateFrame();
  }

  function initDataDeckFallback() {
    const dataSection = document.getElementById('data');
    if (!dataSection) return;

    const cards = Array.from(dataSection.querySelectorAll('.orl-data-card'));
    const windows = [
      [0.02, 0.27],
      [0.21, 0.47],
      [0.41, 0.67],
      [0.61, 0.87]
    ];

    setupScrollFallback(dataSection, {
      onClear() {
        dataSection.style.removeProperty('--head-p');
        cards.forEach((card) => card.style.removeProperty('--card-p'));
      },
      onUpdate(p) {
        dataSection.style.setProperty('--head-p', clamp01((p - 0.06) / 0.52).toFixed(4));
        cards.forEach((card, index) => {
          const range = windows[index] || [0, 1];
          const cardP = clamp01((p - range[0]) / (range[1] - range[0]));
          card.style.setProperty('--card-p', cardP.toFixed(4));
        });
      }
    });
  }

  function initEnginesMarqueeFallback() {
    const enginesSection = document.getElementById('inbound-outbound');
    if (!enginesSection) return;

    const cards = Array.from(enginesSection.querySelectorAll('.orl-cap-card'));
    const focusRanges = [
      [0.0, 0.3],
      [0.1, 0.46],
      [0.26, 0.62],
      [0.42, 0.78],
      [0.58, 0.92],
      [0.7, 1.0]
    ];

    setupScrollFallback(enginesSection, {
      onClear() {
        enginesSection.style.removeProperty('--engines-p');
        cards.forEach((card) => card.style.removeProperty('--cap-accent'));
      },
      onUpdate(p) {
        const trackP = clamp01((p - 0.04) / 0.92);
        enginesSection.style.setProperty('--engines-p', trackP.toFixed(4));
        cards.forEach((card, index) => {
          const [start, end] = focusRanges[index] || [0, 1];
          const local = clamp01((p - start) / (end - start));
          const accent = local < 0.32 ? 0.25 + (local / 0.32) * 0.75 : local > 0.68 ? 1 - ((local - 0.68) / 0.32) * 0.65 : 1;
          card.style.setProperty('--cap-accent', accent.toFixed(3));
        });
      }
    });
  }

  function initPricingMotionFallback() {
    const pricingSection = document.getElementById('pricing');
    if (!pricingSection) return;

    const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const desktopQuery = window.matchMedia ? window.matchMedia('(min-width: 961px)') : null;
    const supportsNativeViewTimeline =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('animation-timeline: view()') &&
      CSS.supports('animation-range: 0% 100%');

    if (supportsNativeViewTimeline) return;

    let rafId = 0;

    function syncPricingReveal() {
      rafId = 0;
      const reduced = Boolean(motionQuery && motionQuery.matches);
      const desktop = !desktopQuery || desktopQuery.matches;
      if (reduced || !desktop) {
        pricingSection.classList.remove('scroll-fallback');
        pricingSection.style.removeProperty('--pricing-p');
        return;
      }

      const grid = pricingSection.querySelector('.orl-pricing-grid');
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;
      const progress = clamp01((vh - rect.top) / (vh * 0.65));

      pricingSection.classList.add('scroll-fallback');
      pricingSection.style.setProperty('--pricing-p', progress.toFixed(4));
    }

    function scheduleSync() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(syncPricingReveal);
    }

    window.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', scheduleSync, { passive: true });
    syncPricingReveal();
  }

  function initPartB() {
    initDataDeckFallback();
    initEnginesMarqueeFallback();
    initPricingMotionFallback();
    initEngagementPresets();
    initDialogs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPartB, { once: true });
  } else {
    initPartB();
  }
})();
