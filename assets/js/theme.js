// Synchronize dark class and data-theme attribute on load without transition lag
(function() {
  document.documentElement.classList.add('disable-transitions');

  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem('theme');
  } catch (err) {
    // Storage can be blocked (private mode, embedded webviews). Fall back to dark.
  }

  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', savedTheme === 'light' ? '#F6F7F9' : '#0B0E14');
  }

  window.requestAnimationFrame(() => {
    setTimeout(() => {
      document.documentElement.classList.remove('disable-transitions');
    }, 50);
  });
})();
