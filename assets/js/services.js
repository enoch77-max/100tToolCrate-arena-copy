/* Productized service configurator. Prices are estimates for a written quote; no payment is simulated. */
(function () {
  'use strict';
  var root = document.querySelector('[data-services-catalog]');
  if (!root) return;
  var services;
  try { services = JSON.parse(document.getElementById('services-data').textContent); } catch (error) { return; }
  var select = document.getElementById('service-select');
  var addons = document.getElementById('service-addons');
  var estimate = document.getElementById('service-estimate');
  var summary = document.getElementById('service-summary');
  var hiddenService = document.querySelector('input[name="selected_service"]');
  var hiddenEstimate = document.querySelector('input[name="scope_estimate"]');
  var hiddenAddons = document.querySelector('input[name="selected_addons"]');
  var storageKey = 'tc-service-selection-v1';

  function current() { return services.find(function (service) { return service.slug === select.value; }) || services[0]; }
  function money(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value); }

  function updateEstimate() {
    var service = current();
    var chosen = Array.prototype.slice.call(addons.querySelectorAll('input:checked')).map(function (input) {
      return service.addons.find(function (addon) { return addon.id === input.value; });
    }).filter(Boolean);
    var total = service.price + chosen.reduce(function (sum, addon) { return sum + addon.price; }, 0);
    estimate.textContent = money(total) + ' USD estimated scope';
    summary.textContent = service.delivery + '. Final scope, price, schedule and data-transfer terms are confirmed in writing before work starts.';
    hiddenService.value = service.name;
    hiddenEstimate.value = money(total) + ' USD (unverified customer estimate; owner must confirm)';
    hiddenAddons.value = chosen.length ? chosen.map(function (addon) { return addon.label; }).join('; ') : 'None';
    try { localStorage.setItem(storageKey, JSON.stringify({ service: service.slug, addons: chosen.map(function (addon) { return addon.id; }) })); } catch (error) {}
  }

  function renderAddons(preserved) {
    var service = current();
    addons.innerHTML = '';
    var title = document.createElement('span');
    title.className = 'workflow-eyebrow';
    title.textContent = 'Optional scope additions';
    addons.appendChild(title);
    service.addons.forEach(function (addon) {
      var label = document.createElement('label');
      label.className = 'service-addon';
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.value = addon.id;
      input.checked = preserved.indexOf(addon.id) !== -1;
      input.addEventListener('change', updateEstimate);
      var copy = document.createElement('span');
      copy.textContent = addon.label + ' — +' + money(addon.price);
      label.appendChild(input);
      label.appendChild(copy);
      addons.appendChild(label);
    });
    summary.textContent = service.summary;
    updateEstimate();
  }

  services.forEach(function (service) {
    var option = document.createElement('option');
    option.value = service.slug;
    option.textContent = service.name + ' — from ' + money(service.price);
    select.appendChild(option);
  });

  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (error) {}
  var requested = new URLSearchParams(window.location.search).get('service');
  if (services.some(function (service) { return service.slug === requested; })) select.value = requested;
  else if (services.some(function (service) { return service.slug === saved.service; })) select.value = saved.service;
  select.addEventListener('change', function () { renderAddons([]); });
  document.querySelectorAll('[data-select-service]').forEach(function (button) {
    button.addEventListener('click', function () {
      select.value = button.getAttribute('data-select-service');
      renderAddons([]);
      document.getElementById('service-inquiry').scrollIntoView({ behavior: 'smooth', block: 'start' });
      select.focus({ preventScroll: true });
    });
  });
  renderAddons(Array.isArray(saved.addons) ? saved.addons : []);
})();
