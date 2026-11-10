document.addEventListener('DOMContentLoaded', () => {
  // Sidebar Drawer Toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebarDrawer = document.getElementById('sidebarDrawer');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebarClose = document.getElementById('sidebarClose');

  function sidebarFocusable() {
    if (!sidebarDrawer) return [];
    return Array.from(sidebarDrawer.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.getClientRects().length > 0);
  }

  function openSidebar() {
    if (!sidebarDrawer) return;
    sidebarDrawer.removeAttribute('inert');
    sidebarDrawer.setAttribute('aria-hidden', 'false');
    sidebarDrawer.classList.add('active');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'true');

    if (sidebarClose) {
      sidebarClose.focus();
    } else {
      const focusable = sidebarFocusable();
      if (focusable.length) focusable[0].focus();
    }
  }

  function closeSidebar(returnFocus) {
    if (!sidebarDrawer) return;
    const wasOpen = sidebarDrawer.classList.contains('active');
    sidebarDrawer.classList.remove('active');
    sidebarDrawer.setAttribute('inert', '');
    sidebarDrawer.setAttribute('aria-hidden', 'true');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');

    if (returnFocus !== false && wasOpen && menuToggle) {
      menuToggle.focus();
    }
  }

  if (sidebarDrawer && !sidebarDrawer.hasAttribute('aria-hidden')) {
    sidebarDrawer.setAttribute('aria-hidden', 'true');
  }

  if (menuToggle) {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = sidebarDrawer && sidebarDrawer.classList.contains('active');
      if (isOpen) closeSidebar(); else openSidebar();
    });
  }

  if (sidebarClose) sidebarClose.addEventListener('click', () => closeSidebar());
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => closeSidebar());

  // Keyboard support for the drawer: Escape closes it and Tab stays inside.
  document.addEventListener('keydown', (e) => {
    if (!sidebarDrawer || !sidebarDrawer.classList.contains('active')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeSidebar();
      return;
    }

    if (e.key !== 'Tab') return;
    const focusable = sidebarFocusable();
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Category Dropdown Toggle with Hover Grace Period
  const dropdowns = document.querySelectorAll('.nav-dropdown');

  function closeDropdown(dropdown, returnFocus) {
    const trigger = dropdown.querySelector('.nav-dropdown-trigger');
    dropdown.classList.remove('open', 'hover-open');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
      if (returnFocus) trigger.focus();
    }
  }

  dropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector('.nav-dropdown-trigger');
    const menu = dropdown.querySelector('.nav-dropdown-content');
    let closeTimer = null;

    function setExpanded(expanded) {
      if (trigger) trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    function openFromKeyboard() {
      dropdown.classList.add('open');
      setExpanded(true);
      if (menu) {
        const firstLink = menu.querySelector('a[href]');
        if (firstLink) firstLink.focus();
      }
    }

    dropdown.addEventListener('mouseenter', () => {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      dropdown.classList.add('hover-open');
      setExpanded(true);
    });

    dropdown.addEventListener('mouseleave', () => {
      closeTimer = setTimeout(() => {
        dropdown.classList.remove('hover-open');
        if (!dropdown.classList.contains('open') && !dropdown.contains(document.activeElement)) {
          setExpanded(false);
        }
      }, 400); // 400ms grace period so the menu never disappears while moving the cursor
    });

    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const willOpen = !dropdown.classList.contains('open');
        dropdown.classList.toggle('open', willOpen);
        setExpanded(willOpen);
        if (willOpen && e.detail === 0 && menu) {
          const firstLink = menu.querySelector('a[href]');
          if (firstLink) firstLink.focus();
        }
      });

      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeDropdown(dropdown, true);
        } else if (e.key === 'ArrowDown' || e.key === 'Down') {
          e.preventDefault();
          openFromKeyboard();
        }
      });
    }

    dropdown.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown(dropdown, true);
      }
    });

    // Close the click-opened menu when focus leaves the dropdown entirely.
    dropdown.addEventListener('focusout', (e) => {
      if (!dropdown.contains(e.relatedTarget) && !dropdown.matches(':hover')) {
        closeDropdown(dropdown, false);
      }
    });
  });

  document.addEventListener('click', (e) => {
    dropdowns.forEach((dropdown) => {
      if (!dropdown.contains(e.target)) closeDropdown(dropdown, false);
    });
  });

  // Theme Toggle
  const themeToggle = document.getElementById('themeToggle');
  const moonIcon = '<svg fill="none" width="20" height="20" style="width: 20px; height: 20px;" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>';
  const sunIcon = '<svg fill="none" width="20" height="20" style="width: 20px; height: 20px;" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>';

  function updateThemeUI() {
    if (!themeToggle) return;
    const isDark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      themeToggle.innerHTML = sunIcon;
      themeToggle.setAttribute('aria-label', 'Toggle Light Mode');
    } else {
      themeToggle.innerHTML = moonIcon;
      themeToggle.setAttribute('aria-label', 'Toggle Dark Mode');
    }
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isDark ? '#0B0E14' : '#F6F7F9');
    }
  }

  function persistTheme(theme) {
    try {
      localStorage.setItem('theme', theme);
    } catch (err) {
      // Private browsing or blocked storage: the theme still applies for this page.
    }
  }

  updateThemeUI();

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.documentElement.classList.add('disable-transitions');
      const isDark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        persistTheme('light');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        persistTheme('dark');
      }
      updateThemeUI();
      window.requestAnimationFrame(() => {
        setTimeout(() => {
          document.documentElement.classList.remove('disable-transitions');
        }, 50);
      });
    });
  }

  // Browser-Native Back Button Handler
  const backBtn = document.getElementById('nav-back-btn');
  if (backBtn) {
    const rawPath = window.location.pathname;
    const currentPath = (rawPath.length > 1 && rawPath.endsWith('/')) ? rawPath.slice(0, -1) : rawPath;

    // Top-level hub pages (Home, Tools root, Blog root, About, Contact, policies) never show a Back button
    const isTopHub = (
      currentPath === '/' || currentPath === '/index.html' || currentPath === '' ||
      currentPath === '/tools.html' || currentPath === '/tools' ||
      currentPath === '/blog' || currentPath === '/blog/' || currentPath === '/blog/index.html' ||
      currentPath === '/about' || currentPath === '/about.html' ||
      currentPath === '/contact' || currentPath === '/contact.html' ||
      currentPath === '/privacy-policy' || currentPath === '/privacy-policy.html' ||
      currentPath === '/terms' || currentPath === '/terms.html' ||
      currentPath === '/disclaimer' || currentPath === '/disclaimer.html'
    );

    if (isTopHub) {
      backBtn.style.display = 'none';
    } else {
      backBtn.style.display = 'inline-flex';
      const textSpan = backBtn.querySelector('.back-text');
      if (textSpan) {
        textSpan.textContent = 'Back';
      }

      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        let hasInternalReferrer = false;
        try {
          if (document.referrer) {
            const refUrl = new URL(document.referrer);
            if (refUrl.origin === window.location.origin) {
              hasInternalReferrer = true;
            }
          }
        } catch (_err) {}

        if (hasInternalReferrer && window.history.length > 1) {
          window.history.back();
        } else if (currentPath.startsWith('/blog/')) {
          window.location.href = '/blog';
        } else {
          window.location.href = '/';
        }
      });
    }
  }
});
