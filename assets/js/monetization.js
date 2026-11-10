/*
 * Production AdSense loader. Google is not contacted on preview hosts or before
 * an explicit advertising choice. Ad serving requires an approved AdSense site
 * and Auto ads enabled in the publisher account.
 */
(function () {
  'use strict';

  var CONSENT_KEY = 'tc-ad-consent-v1';
  var client = window.TC_ADSENSE_CLIENT || '';
  var host = window.location.hostname.toLowerCase();
  var isProduction = host === '100toolcrate.com' || host === 'www.100toolcrate.com';
  if (!isProduction || !/^ca-pub-\d+$/.test(client)) return;

  var banner;

  function getChoice() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (error) { return null; }
  }

  function setChoice(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (error) {}
  }

  function removeBanner() {
    if (banner) banner.remove();
    banner = null;
  }

  function loadAds() {
    if (document.querySelector('script[data-tc-adsense]')) return;
    var script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.tcAdsense = 'true';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(client);
    script.onerror = function () {
      // Do not display a false ad-filled state when the network or account blocks it.
      console.warn('AdSense could not be loaded. Check account approval, Auto ads and network blocking.');
    };
    document.head.appendChild(script);
  }

  function showBanner() {
    if (banner || navigator.doNotTrack === '1') return;
    banner = document.createElement('section');
    banner.className = 'ad-consent-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Advertising preferences');
    banner.innerHTML = '<div class="ad-consent-copy"><strong>Keep the tools free</strong><p>Optional Google AdSense advertising uses cookies and may personalize ads. Essential-only mode keeps the tools working without loading AdSense. See our <a href="/privacy-policy#advertising">advertising privacy notice</a>.</p></div><div class="ad-consent-actions"><button type="button" class="ad-choice-secondary" data-ad-essential>Essential only</button><button type="button" class="ad-choice-primary" data-ad-accept>Allow ads</button></div>';
    document.body.appendChild(banner);
    banner.querySelector('[data-ad-accept]').addEventListener('click', function () {
      setChoice('accepted');
      removeBanner();
      loadAds();
    });
    banner.querySelector('[data-ad-essential]').addEventListener('click', function () {
      setChoice('essential');
      removeBanner();
    });
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest && event.target.closest('[data-ad-choices]');
    if (!trigger) return;
    event.preventDefault();
    showBanner();
  });

  var choice = getChoice();
  if (choice === 'accepted') loadAds();
  else if (choice !== 'essential') showBanner();
})();
