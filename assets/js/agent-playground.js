/* Live public API explorer. Every result comes from the execution endpoint. */
(function () {
  'use strict';
  var root = document.querySelector('[data-agent-playground]');
  if (!root) return;
  var select = document.getElementById('agent-tool-select');
  var input = document.getElementById('agent-tool-input');
  var output = document.getElementById('agent-tool-output');
  var schema = document.getElementById('agent-tool-schema');
  var description = document.getElementById('agent-tool-description');
  var execute = document.getElementById('agent-tool-execute');
  var status = document.getElementById('agent-tool-status');
  var examples = {
    'word-counter': { text: 'Count the words and characters in this short paragraph.', wordsPerMinute: 250 },
    'character-counter': { text: 'A👨‍👩‍👧‍👦é' },
    'case-converter': { text: 'make this a useful headline', mode: 'title' },
    'slug-generator': { text: 'Crème brûlée & JSON, 2026!', separator: '-' },
    'url-encoder': { text: 'subject=Hello world&lang=en', operation: 'encode' },
    'base64-encoder': { text: 'Hello 世界', operation: 'encode' },
    'json-formatter': { json: '{"name":"example","active":true}', indent: 2 },
    'json-validator': { json: '{"name":"example","items":[1,2,3]}' },
    'json-minifier': { json: '{ "name": "example", "active": true }' },
    'json-to-csv': { json: '[{"name":"Ada","role":"Engineer"},{"name":"Grace","role":"Scientist"}]', protectFormulas: true },
    'hash-generator': { text: 'example', algorithm: 'sha256' },
    'uuid-generator': { count: 3 },
    'unix-timestamp-converter': { value: '2026-01-01T00:00:00Z' },
    'date-diff': { start: '2026-01-01', end: '2026-02-01' },
    'percentage-calculator': { operation: 'percentOf', a: 20, b: 150 },
    'discount-calculator': { price: 100, discountPercent: 20, taxPercent: 10 },
    'profit-margin': { revenue: 200, cost: 50 },
    'read-time-calculator': { text: 'Paste the document whose reading time you want to estimate here.', wordsPerMinute: 225 }
  };
  var catalog = [];

  function setStatus(message, error) {
    status.textContent = message;
    status.classList.toggle('service-error', Boolean(error));
  }
  function choose(id) {
    var tool = catalog.find(function (item) { return item.id === id; }) || catalog[0];
    if (!tool) return;
    select.value = tool.id;
    description.textContent = tool.description;
    schema.textContent = JSON.stringify(tool.inputSchema, null, 2);
    input.value = JSON.stringify(examples[tool.id] || {}, null, 2);
    output.textContent = 'Run the tool to see a real server response.';
    if (window.history.replaceState) window.history.replaceState(null, '', '#' + tool.id);
  }

  fetch('/api/v1/tools', { headers: { accept: 'application/json' } })
    .then(function (response) { if (!response.ok) throw new Error('Catalog returned HTTP ' + response.status); return response.json(); })
    .then(function (body) {
      catalog = body.tools || [];
      catalog.forEach(function (tool) {
        var option = document.createElement('option');
        option.value = tool.id;
        option.textContent = tool.title;
        select.appendChild(option);
      });
      setStatus(catalog.length + ' executable tools available. ' + (body.browserOnlyTools || []).length + ' browser-only tools are intentionally excluded.');
      choose(window.location.hash.slice(1) || catalog[0].id);
    })
    .catch(function (error) {
      select.disabled = true;
      execute.disabled = true;
      setStatus('Live execution is unavailable here. The static preview has no backend; deploy the Node server and try again. ' + error.message, true);
    });

  select.addEventListener('change', function () { choose(select.value); });
  execute.addEventListener('click', function () {
    var args;
    try { args = JSON.parse(input.value); }
    catch (error) { setStatus('Arguments must be valid JSON: ' + error.message, true); input.focus(); return; }
    execute.disabled = true;
    setStatus('Executing ' + select.value + '…');
    fetch('/api/v1/tools/' + encodeURIComponent(select.value) + '/execute', {
      method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(args)
    }).then(function (response) {
      return response.json().then(function (body) { return { response: response, body: body }; });
    }).then(function (result) {
      output.textContent = JSON.stringify(result.body, null, 2);
      setStatus(result.response.ok ? 'Completed with HTTP ' + result.response.status + '. Input was not persisted by the endpoint.' : 'Rejected with HTTP ' + result.response.status + '. Review the validation message.', !result.response.ok);
    }).catch(function (error) {
      setStatus('Execution failed: ' + error.message, true);
    }).finally(function () { execute.disabled = false; });
  });
})();
