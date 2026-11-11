/**
 * OneReach Labs — Part B Interactive Controls & Accessible Dialog Fallbacks
 * Handles:
 *  - #sophia specialist capability chips & live command preview bar
 *  - #pricing engagement preset sync with #engagement-mode
 *  - Native <dialog> Invoker Commands fallback, Safari closedby="any" light-dismiss,
 *    returnValue cleanup, and top-layer exit transition fallback
 */
(function () {
  'use strict';

  const SOPHIA_AGENTS = {
    'company-intel': {
      title: 'Company intel',
      tag: 'CSO Research Layer',
      desc: 'Maps total addressable accounts, tech stack footprints, hiring velocity, and positioning gaps before a single message is drafted.'
    },
    'contact-discovery': {
      title: 'Contact discovery',
      tag: 'Decision-Maker Graph',
      desc: 'Pinpoints economic buyers, operational champions, and buying committees across target hierarchies instead of guessing generic aliases.'
    },
    'signal-detection': {
      title: 'Signal detection',
      tag: 'Real-Time Triggers',
      desc: 'Monitors funding rounds, leadership moves, open req surges, and high-intent website revisits so outreach lands at the exact moment of need.'
    },
    'data-enrichment': {
      title: 'Data enrichment',
      tag: '99% Waterfall Verify',
      desc: 'Cross-checks emails, direct dials, and LinkedIn profiles through multi-vendor waterfalls and custom niche scraping to protect domain reputation.'
    },
    'message-drafter': {
      title: 'Message drafter',
      tag: 'CMO Copy Engine',
      desc: 'Writes role-specific outreach anchored to each account signal and offer angle, reviewed by your OneReach strategist before launch.'
    },
    'sequence-builder': {
      title: 'Sequence builder',
      tag: '4-Channel Orchestration',
      desc: 'Coordinates email, LinkedIn, phone, and SMS cadences with smart spacing so inbound and outbound touches reinforce the same narrative.'
    },
    'follow-up': {
      title: 'Follow-up',
      tag: '24/7 Response Routing',
      desc: 'Follows up persistently without sounding robotic—handling objections, forwarding context, and nudging warm replies to booked slots.'
    },
    'pipeline-manager': {
      title: 'Pipeline manager',
      tag: 'Attribution & Booking',
      desc: 'Tracks every touch from impression to calendar invite, feeding weekly A/B test learnings directly back into Sophia’s targeting model.'
    }
  };

  const SOPHIA_PROMPTS = {
    dental: {
      command: 'Find 50 dental clinics in Texas with 3+ locations',
      status: '50 clinics matched · 148 verified contacts',
      channels: 'Email + LinkedIn + SMS',
      body: 'Mapped 50 multi-location dental groups across Austin, Dallas, and Houston. Waterfall-verified 148 Operations & Owner records at 99% deliverability and drafted 4-channel sequences tailored to missed-patient intake.'
    },
    saas: {
      command: 'Target Series B SaaS VP Sales hiring 5+ SDRs',
      status: '38 accounts matched · Live hiring signal',
      channels: 'Signal trigger + Phone + LinkedIn',
      body: 'Detected 38 Series B software companies posting SDR and AE roles in the past 30 days. Enriched VP Sales direct dials and prepared signal-anchored opener copy focused on cutting ramp time without adding headcount.'
    },
    reengage: {
      command: 'Re-engage cold inbound leads who revisited pricing',
      status: '64 warm leads · High-intent revisit',
      channels: 'Inbound sync + SMS + Calendar',
      body: 'Identified 64 prior demo requests showing fresh pricing-guide activity in the last 72 hours. Excluded active CRM deals, personalized 2-step SMS and email nudges, and routed replies directly to Thursday booking slots.'
    }
  };

  function buildCustomPreview(rawCommand) {
    const lower = rawCommand.toLowerCase();

    if (/dental|clinic|health|medical|practice|texas/.test(lower)) {
      return {
        status: 'Niche segment matched · Multi-source verify',
        channels: 'Scraped directory + Email + Phone',
        body: `Running "${rawCommand}" across regional directories and 300M+ B2B records. Filtering decision-makers, running 99% waterfall verification, and preparing 4-channel sequences for strategist review.`
      };
    }

    if (/saas|series|vp|cro|sdr|b2b|software|founder/.test(lower)) {
      return {
        status: 'Signal-filtered ICP · Buying intent active',
        channels: 'Hiring & funding signals + LinkedIn + Email',
        body: `Evaluating "${rawCommand}" against live hiring velocity, tech stack, and leadership change signals. Prioritizing top-fit accounts and generating signal-referenced copy across outbound channels.`
      };
    }

    if (/cold|inbound|re-engage|reengage|pricing|crm|lead/.test(lower)) {
      return {
        status: 'CRM sync · Warm re-engagement queue',
        channels: 'Site intent + Email + SMS follow-up',
        body: `Cross-referencing "${rawCommand}" with recent site engagement and CRM stage history. Suppressing active opportunities and scheduling low-friction calendar nudges for silent prospects.`
      };
    }

    return {
      status: 'Briefing queued · 10 specialist agents ready',
      channels: 'Email + LinkedIn + Phone + SMS',
      body: `Scoped "${rawCommand}" across 300M+ B2B contacts and live buying signals. Sophia will verify reachable buyers at 99% coverage and stage 4-channel sequences for human-expert sign-off.`
    };
  }

  function initSophiaInteractions() {
    const agentButtons = Array.from(document.querySelectorAll('[data-sophia-agent]'));
    const agentTitle = document.getElementById('sophia-agent-title');
    const agentTag = document.getElementById('sophia-agent-tag');
    const agentDesc = document.getElementById('sophia-agent-desc');

    if (agentButtons.length > 0 && agentTitle && agentTag && agentDesc) {
      agentButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-sophia-agent');
          const data = key ? SOPHIA_AGENTS[key] : null;
          if (!data) return;

          agentButtons.forEach((other) => {
            other.setAttribute('aria-pressed', other === btn ? 'true' : 'false');
          });

          agentTitle.textContent = data.title;
          agentTag.textContent = data.tag;
          agentDesc.textContent = data.desc;
        });
      });
    }

    const cmdForm = document.getElementById('sophia-cmd-form');
    const cmdInput = document.getElementById('sophia-cmd-input');
    const presetButtons = Array.from(document.querySelectorAll('[data-sophia-prompt]'));
    const replyStatus = document.getElementById('sophia-reply-status');
    const replyChannels = document.getElementById('sophia-reply-channels');
    const replyBody = document.getElementById('sophia-reply-body');

    if (!cmdInput || !replyStatus || !replyChannels || !replyBody) return;

    const applyPreview = (preview, activePresetBtn) => {
      presetButtons.forEach((btn) => {
        btn.setAttribute('aria-pressed', btn === activePresetBtn ? 'true' : 'false');
      });
      replyStatus.textContent = preview.status;
      replyChannels.textContent = preview.channels;
      replyBody.textContent = preview.body;
    };

    presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-sophia-prompt');
        const preset = key ? SOPHIA_PROMPTS[key] : null;
        if (!preset) return;

        cmdInput.value = preset.command;
        applyPreview(preset, btn);
      });
    });

    cmdInput.addEventListener('input', () => {
      const val = cmdInput.value.trim().toLowerCase();
      presetButtons.forEach((btn) => {
        const key = btn.getAttribute('data-sophia-prompt');
        const preset = key ? SOPHIA_PROMPTS[key] : null;
        const matches = Boolean(preset && preset.command.toLowerCase() === val);
        btn.setAttribute('aria-pressed', matches ? 'true' : 'false');
      });
    });

    if (cmdForm) {
      cmdForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const raw = cmdInput.value.trim();
        if (!raw) {
          cmdInput.focus();
          return;
        }

        const matchedPresetBtn = presetButtons.find((btn) => {
          const key = btn.getAttribute('data-sophia-prompt');
          const preset = key ? SOPHIA_PROMPTS[key] : null;
          return preset && preset.command.toLowerCase() === raw.toLowerCase();
        });

        if (matchedPresetBtn) {
          const preset = SOPHIA_PROMPTS[matchedPresetBtn.getAttribute('data-sophia-prompt')];
          applyPreview(preset, matchedPresetBtn);
          return;
        }

        applyPreview(buildCustomPreview(raw), null);
      });
    }
  }

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

  function initPartB() {
    initSophiaInteractions();
    initEngagementPresets();
    initDialogs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPartB, { once: true });
  } else {
    initPartB();
  }
})();
