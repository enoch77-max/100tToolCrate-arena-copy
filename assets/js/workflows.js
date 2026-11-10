/* Workflow discovery, sharing and persistent progress. No account or network required. */
(function () {
  'use strict';

  var STORAGE_KEY = 'tc-workflow-progress-v1';

  function readProgress() {
    try {
      var value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (error) {
      return {};
    }
  }

  function writeProgress(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function completedFor(progress, slug, total) {
    var items = Array.isArray(progress[slug]) ? progress[slug] : [];
    return items.filter(function (item, index) {
      return Number.isInteger(item) && item >= 0 && item < total && items.indexOf(item) === index;
    });
  }

  function initIndex() {
    var grid = document.querySelector('[data-workflow-grid]');
    if (!grid) return;

    var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-workflow-card]'));
    var input = document.getElementById('workflow-search');
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-workflow-filter]'));
    var empty = document.getElementById('workflow-no-results');
    var count = document.getElementById('workflow-result-count');
    var active = 'all';
    var progress = readProgress();

    cards.forEach(function (card) {
      var slug = card.getAttribute('data-workflow-card');
      var total = Number(card.getAttribute('data-step-count')) || 0;
      var done = completedFor(progress, slug, total).length;
      var label = card.querySelector('[data-card-progress]');
      if (label && done) label.textContent = done + ' of ' + total + ' steps complete';
    });

    function update() {
      var query = (input && input.value || '').trim().toLowerCase();
      var visible = 0;
      cards.forEach(function (card) {
        var category = card.getAttribute('data-category') || '';
        var matchesCategory = active === 'all' || category === active;
        var matchesQuery = !query || (card.textContent || '').toLowerCase().indexOf(query) !== -1;
        var show = matchesCategory && matchesQuery;
        card.hidden = !show;
        if (show) visible += 1;
      });
      if (empty) empty.hidden = visible !== 0;
      if (count) count.textContent = visible + (visible === 1 ? ' workflow' : ' workflows');
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        active = button.getAttribute('data-workflow-filter') || 'all';
        buttons.forEach(function (other) {
          var selected = other === button;
          other.classList.toggle('active', selected);
          other.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        update();
      });
    });
    if (input) input.addEventListener('input', update);
    update();
  }

  function initDetail() {
    var root = document.querySelector('[data-workflow-slug]');
    if (!root) return;

    var slug = root.getAttribute('data-workflow-slug');
    var checks = Array.prototype.slice.call(root.querySelectorAll('[data-workflow-step]'));
    var total = checks.length;
    var progress = readProgress();
    var saved = completedFor(progress, slug, total);
    var bar = document.getElementById('workflow-progress-bar');
    var text = document.getElementById('workflow-progress-text');
    var status = document.getElementById('workflow-save-status');
    var reset = document.getElementById('workflow-reset');

    checks.forEach(function (check, index) {
      check.checked = saved.indexOf(index) !== -1;
      check.addEventListener('change', function () {
        var current = readProgress();
        var done = checks.reduce(function (items, item, itemIndex) {
          if (item.checked) items.push(itemIndex);
          return items;
        }, []);
        current[slug] = done;
        var stored = writeProgress(current);
        if (status) status.textContent = stored ? 'Progress saved on this device' : 'Progress kept for this visit only';
        update();
      });
    });

    function update() {
      var done = checks.filter(function (check) { return check.checked; }).length;
      var percent = total ? Math.round(done / total * 100) : 0;
      if (bar) {
        bar.style.width = percent + '%';
        bar.parentElement.setAttribute('aria-valuenow', String(percent));
      }
      if (text) text.textContent = done + ' of ' + total + ' steps complete';
      root.classList.toggle('workflow-complete', done === total && total > 0);
    }

    if (reset) {
      reset.addEventListener('click', function () {
        checks.forEach(function (check) { check.checked = false; });
        var current = readProgress();
        delete current[slug];
        writeProgress(current);
        if (status) status.textContent = 'Progress reset on this device';
        update();
        checks[0] && checks[0].focus();
      });
    }

    var share = document.querySelector('[data-share-workflow]');
    if (share) {
      share.addEventListener('click', function () {
        var label = share.querySelector('[data-share-label]');
        function copied() {
          if (label) label.textContent = 'Link copied';
          window.setTimeout(function () { if (label) label.textContent = 'Share workflow'; }, 1800);
        }
        if (navigator.share) {
          navigator.share({ title: document.title, url: window.location.href }).then(copied).catch(function () {});
        } else if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(window.location.href).then(copied).catch(function () {});
        } else {
          var field = document.createElement('textarea');
          field.value = window.location.href;
          field.style.position = 'fixed';
          field.style.opacity = '0';
          document.body.appendChild(field);
          field.select();
          try { document.execCommand('copy'); copied(); } catch (error) {}
          field.remove();
        }
      });
    }
    update();
  }

  function init() {
    initIndex();
    initDetail();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
