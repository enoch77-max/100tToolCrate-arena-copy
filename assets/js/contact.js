// Contact form: submit via FormSubmit's AJAX endpoint so the visitor stays on
// this page, with the plain HTML POST as the no-JS / network-failure fallback.
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const status = document.getElementById('contact-form-status');
  const button = document.getElementById('contact-submit-btn');
  const endpoint = 'https://formsubmit.co/ajax/support@100toolcrate.com';

  function showStatus(message, type) {
    if (!status) return;
    const state = type === 'success' || type === 'info' ? type : 'error';
    status.textContent = message;
    status.className = 'form-status is-' + state;
    status.style.display = 'block';
  }

  form.addEventListener('submit', (event) => {
    // Let the native POST take over when fetch is unavailable.
    if (typeof window.fetch !== 'function') return;

    event.preventDefault();

    if (button) {
      button.disabled = true;
      button.textContent = 'Sending...';
    }

    const data = new FormData(form);
    const payload = {
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      subject: String(data.get('subject') || '').trim(),
      message: String(data.get('message') || '').trim(),
      _subject: '100ToolCrate Contact Form',
      _template: 'table',
      _captcha: 'false'
    };

    // Honeypot: bots fill hidden fields. Pretend success and never send.
    if (String(data.get('_honey') || '').trim()) {
      if (button) {
        button.disabled = false;
        button.textContent = 'Send Message';
      }
      form.reset();
      showStatus('Thanks - your message has been received.', 'success');
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then((response) => {
        if (!response.ok) throw new Error('Request failed with status ' + response.status);
        return response.json().catch(() => ({}));
      })
      .then((result) => {
        if (result && result.success === 'false') {
          throw new Error(result.message || 'FormSubmit rejected the message.');
        }
        form.reset();
        showStatus(
          'Thanks - your message has been sent. We usually reply within 24 to 48 business hours.',
          'success'
        );
      })
      .catch(() => {
        showStatus(
          'We could not send the message automatically. Please email support@100toolcrate.com directly, or try again in a moment.',
          'error'
        );
      })
      .finally(() => {
        if (button) {
          button.disabled = false;
          button.textContent = 'Send Message';
        }
      });
  });
});
