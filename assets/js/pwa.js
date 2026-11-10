/**
 * PWA install experience.
 *
 * - Captures Chrome/Edge/Android's beforeinstallprompt and offers it through a
 *   dismissible banner and the footer "Install app" link.
 * - Explains the Share > Add to Home Screen flow on iOS, where the browser has
 *   no programmatic install prompt.
 * - Registers the service worker so the installed app opens offline.
 *
 * The small __pwaInstall hook at the bottom exists for automated QA only.
 */
(function () {
  'use strict';

  var DISMISS_KEY = '100toolcrate-pwa-dismissed-at';
  var INSTALLED_KEY = '100toolcrate-pwa-installed';
  var DISMISS_DAYS = 14;
  var AUTO_SHOW_DELAY = 4000;

  var deferredPrompt = null;
  var banner = null;
  var sheetLayer = null;
  var lastFocused = null;
  var autoShowTimer = null;
  var toastTimer = null;

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      // Private mode and embedded webviews can block storage. The prompt still
      // works for the current visit.
    }
  }

  function isStandalone() {
    var displayMode = window.matchMedia && window.matchMedia('(display-mode: standalone)');
    return (displayMode && displayMode.matches) || window.navigator.standalone === true;
  }

  function wasInstalled() {
    if (isStandalone()) return true;
    return readStorage(INSTALLED_KEY) === '1';
  }

  function dismissedRecently() {
    var stamp = Number(readStorage(DISMISS_KEY) || 0);
    if (!stamp) return false;
    return Date.now() - stamp < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  }

  function currentPlatform() {
    var ua = window.navigator.userAgent || '';
    var isIPadOS = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
    if (/iPad|iPhone|iPod/i.test(ua) || isIPadOS) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
  }

  function isIOSSafari() {
    var ua = window.navigator.userAgent || '';
    if (currentPlatform() !== 'ios') return false;
    return !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua);
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function showToast(message, type) {
    var container = document.querySelector('.toast-container');
    if (!container) {
      container = element('div', 'toast-container');
      document.body.appendChild(container);
    }

    var toast = element('div', 'toast-banner toast-' + (type || 'success'));
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    var icon = element('span', 'material-symbols-outlined toast-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = type === 'error' ? 'error' : 'check_circle';
    toast.appendChild(icon);
    toast.appendChild(element('div', 'toast-message', message));

    container.appendChild(toast);
    window.requestAnimationFrame(function () {
      toast.classList.add('toast-show');
    });

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('toast-show');
      toast.classList.add('toast-hiding');
      window.setTimeout(function () {
        toast.remove();
      }, 260);
    }, 4200);
  }

  function buildBanner() {
    if (banner) return banner;

    banner = element('aside', 'pwa-banner');
    banner.id = 'pwa-install-banner';
    banner.setAttribute('aria-label', 'Install the 100ToolCrate app');
    banner.hidden = true;

    var icon = element('img', 'pwa-banner-icon');
    icon.src = '/assets/pwa/icon-192.png';
    icon.width = 48;
    icon.height = 48;
    icon.alt = '';
    icon.decoding = 'async';

    var copy = element('div', 'pwa-banner-text');
    var title = element('p', 'pwa-banner-title', 'Install 100ToolCrate');
    var subtitle = element(
      'p',
      'pwa-banner-sub',
      'Free tools that work offline, one tap from your home screen.'
    );
    copy.appendChild(title);
    copy.appendChild(subtitle);

    var actions = element('div', 'pwa-banner-actions');
    var accept = element('button', 'pwa-btn pwa-btn-primary', 'Install');
    accept.type = 'button';
    accept.id = 'pwa-install-accept';
    var dismiss = element('button', 'pwa-btn pwa-btn-ghost', 'Not now');
    dismiss.type = 'button';
    dismiss.id = 'pwa-install-dismiss';
    actions.appendChild(accept);
    actions.appendChild(dismiss);

    banner.appendChild(icon);
    banner.appendChild(copy);
    banner.appendChild(actions);

    accept.addEventListener('click', function () {
      if (deferredPrompt) {
        runInstallPrompt();
      } else if (currentPlatform() === 'ios') {
        openHelp('ios');
      } else {
        openHelp();
      }
    });

    dismiss.addEventListener('click', function () {
      writeStorage(DISMISS_KEY, String(Date.now()));
      hideBanner();
    });

    document.body.appendChild(banner);
    return banner;
  }

  function showBanner(options) {
    var settings = options || {};
    if (isStandalone()) return;
    var node = buildBanner();

    var title = node.querySelector('.pwa-banner-title');
    var subtitle = node.querySelector('.pwa-banner-sub');
    var accept = node.querySelector('#pwa-install-accept');
    var platform = settings.platform || currentPlatform();

    if (platform === 'ios') {
      title.textContent = 'Add 100ToolCrate to your home screen';
      subtitle.textContent = 'Tap Share, then Add to Home Screen. It works offline like an app.';
      accept.textContent = 'How to install';
    } else {
      title.textContent = 'Install 100ToolCrate';
      subtitle.textContent = deferredPrompt
        ? 'Free tools that work offline, one tap from your home screen.'
        : 'Add the app to your home screen for a full-screen, offline-ready experience.';
      accept.textContent = deferredPrompt ? 'Install' : 'How to install';
    }

    node.hidden = false;
    window.requestAnimationFrame(function () {
      node.classList.add('is-visible');
    });
  }

  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('is-visible');
    window.setTimeout(function () {
      if (!banner.classList.contains('is-visible')) banner.hidden = true;
    }, 360);
  }

  function installSteps(platform) {
    if (platform === 'ios') {
      return [
        isIOSSafari()
          ? 'Use this page in Safari to see the standard Add to Home Screen action.'
          : 'If Add to Home Screen is missing in your current browser, open 100toolcrate.com in Safari.',
        'Tap the Share button in the toolbar.',
        'Scroll down, tap "Add to Home Screen", then tap Add.'
      ];
    }
    if (platform === 'android') {
      return [
        'Open the browser menu (the three dots).',
        'Tap "Install app" or "Add to Home screen".',
        'Confirm by tapping Install.'
      ];
    }
    return [
      'Click the install icon in the address bar, or open the browser menu.',
      'Choose "Install 100ToolCrate".',
      'Launch it from your desktop or dock.'
    ];
  }

  function buildSheet() {
    if (sheetLayer) return sheetLayer;

    sheetLayer = element('div', 'pwa-sheet-layer');
    sheetLayer.id = 'pwa-install-sheet';
    sheetLayer.hidden = true;

    var backdrop = element('div', 'pwa-sheet-backdrop');
    backdrop.setAttribute('data-pwa-close', '');

    var sheet = element('div', 'pwa-sheet');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'pwa-sheet-title');
    sheet.setAttribute('aria-describedby', 'pwa-sheet-lead');

    var close = element('button', 'pwa-sheet-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close install instructions');
    close.innerHTML = '&times;';

    var icon = element('img', 'pwa-sheet-icon');
    icon.src = '/assets/pwa/icon-192.png';
    icon.width = 56;
    icon.height = 56;
    icon.alt = '';
    icon.decoding = 'async';

    var title = element('h2', 'pwa-sheet-title', 'Install 100ToolCrate');
    title.id = 'pwa-sheet-title';

    var lead = element('p', 'pwa-sheet-lead', '');
    lead.id = 'pwa-sheet-lead';

    var steps = element('ol', 'pwa-steps');

    var done = element('button', 'pwa-btn pwa-btn-primary pwa-sheet-done', 'Got it');
    done.type = 'button';
    done.setAttribute('data-pwa-close', '');

    sheet.appendChild(close);
    sheet.appendChild(icon);
    sheet.appendChild(title);
    sheet.appendChild(lead);
    sheet.appendChild(steps);
    sheet.appendChild(done);
    sheetLayer.appendChild(backdrop);
    sheetLayer.appendChild(sheet);
    document.body.appendChild(sheetLayer);

    sheetLayer.addEventListener('click', function (event) {
      if (event.target.closest('[data-pwa-close]')) closeHelp();
    });

    sheetLayer.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeHelp();
        return;
      }
      if (event.key !== 'Tab') return;

      var focusable = sheet.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    return sheetLayer;
  }

  function openHelp(platformOverride) {
    // The bottom banner and the instruction sheet must not compete for the
    // small mobile viewport. Hide the banner while instructions are open.
    hideBanner();
    var layer = buildSheet();
    var platform = platformOverride || currentPlatform();
    var steps = installSteps(platform);
    var lead = layer.querySelector('.pwa-sheet-lead');
    var list = layer.querySelector('.pwa-steps');
    var title = layer.querySelector('.pwa-sheet-title');

    title.textContent = platform === 'ios' ? 'Add to your home screen' : 'Install the app';
    lead.textContent =
      platform === 'ios'
        ? 'iPhone and iPad install web apps through Safari. It takes about ten seconds.'
        : 'Install 100ToolCrate for a full-screen app with an icon, offline support and no browser bars.';

    list.textContent = '';
    steps.forEach(function (step) {
      list.appendChild(element('li', '', step));
    });

    lastFocused = document.activeElement;
    layer.hidden = false;
    document.documentElement.classList.add('pwa-sheet-open');
    window.requestAnimationFrame(function () {
      layer.classList.add('is-open');
    });
    var close = layer.querySelector('.pwa-sheet-close');
    if (close) close.focus();
  }

  function closeHelp() {
    if (!sheetLayer || sheetLayer.hidden) return;
    sheetLayer.classList.remove('is-open');
    document.documentElement.classList.remove('pwa-sheet-open');
    window.setTimeout(function () {
      if (!sheetLayer.classList.contains('is-open')) sheetLayer.hidden = true;
    }, 240);
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
    lastFocused = null;
  }

  function runInstallPrompt() {
    if (!deferredPrompt) return;
    var promptEvent = deferredPrompt;
    deferredPrompt = null;

    hideBanner();
    promptEvent.prompt();
    var choice = promptEvent.userChoice || Promise.resolve({ outcome: 'dismissed' });
    choice
      .then(function (result) {
        if (result && result.outcome === 'accepted') {
          showToast('Installing 100ToolCrate. Check your home screen.');
        } else {
          writeStorage(DISMISS_KEY, String(Date.now()));
        }
      })
      .catch(function () {
        writeStorage(DISMISS_KEY, String(Date.now()));
      });
  }

  function scheduleBanner() {
    if (isStandalone() || wasInstalled() || dismissedRecently()) return;
    if (autoShowTimer) return;
    autoShowTimer = window.setTimeout(function () {
      autoShowTimer = null;
      if (isStandalone() || wasInstalled() || dismissedRecently()) return;
      showBanner();
    }, AUTO_SHOW_DELAY);
  }

  function bindManualTriggers() {
    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-pwa-install]');
      if (!trigger) return;
      event.preventDefault();

      if (isStandalone() || wasInstalled()) {
        showToast('100ToolCrate is already installed on this device.');
        return;
      }
      if (deferredPrompt) {
        runInstallPrompt();
        return;
      }
      openHelp();
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(function (registration) {
          window.__pwaSWRegistration = registration;
          // Check for a new app shell on every fresh visit. The worker itself
          // handles old-cache cleanup during activation.
          registration.update().catch(function () {});
        })
        .catch(function (err) {
          console.warn('Service worker registration failed:', err);
        });
    }, { once: true });
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
    scheduleBanner();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    writeStorage(INSTALLED_KEY, '1');
    writeStorage(DISMISS_KEY, '');
    hideBanner();
    showToast('100ToolCrate is installed. Open it from your home screen.');
  });

  if (window.matchMedia) {
    var standaloneQuery = window.matchMedia('(display-mode: standalone)');
    var onStandalone = function (event) {
      if (event.matches) hideBanner();
      else if (deferredPrompt) scheduleBanner();
    };
    if (standaloneQuery.addEventListener) standaloneQuery.addEventListener('change', onStandalone);
    else if (standaloneQuery.addListener) standaloneQuery.addListener(onStandalone);
  }

  function init() {
    bindManualTriggers();
    if (isStandalone()) {
      document.documentElement.classList.add('pwa-standalone');
      return;
    }
    // Mobile browsers that support beforeinstallprompt will show the native
    // prompt. Others still receive a useful Add to Home Screen explanation.
    if (['ios', 'android'].includes(currentPlatform()) && !wasInstalled() && !dismissedRecently()) {
      scheduleBanner();
      var onFirstInteraction = function () {
        scheduleBanner();
        window.removeEventListener('pointerdown', onFirstInteraction);
        window.removeEventListener('keydown', onFirstInteraction);
      };
      window.addEventListener('pointerdown', onFirstInteraction, { once: true });
      window.addEventListener('keydown', onFirstInteraction, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  registerServiceWorker();

  // QA hook: lets the automated PWA test drive the real UI without guessing at
  // browser install state. Not used by the site itself.
  window.__pwaInstall = {
    showBanner: showBanner,
    hideBanner: hideBanner,
    openHelp: openHelp,
    closeHelp: closeHelp,
    triggerInstall: runInstallPrompt,
    resetPrompt: function () {
      deferredPrompt = null;
    },
    canPrompt: function () {
      return Boolean(deferredPrompt);
    },
    swRegistration: function () {
      return window.__pwaSWRegistration || null;
    },
    standalone: isStandalone,
    platform: currentPlatform
  };
})();
