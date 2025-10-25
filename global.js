// PICTURE IN PICTURE ERROR HANDLER
try { navigator.mediaSession?.setActionHandler('enterpictureinpicture', null); } catch (e) { }

// AUTOMATIC NAV
function $$(selector) {
  return Array.from(document.querySelectorAll(selector));
}

// DARK MODE - Move this to execute immediately
(function () {
  // Apply saved scheme immediately if it exists
  if ('colorScheme' in localStorage) {
    const savedScheme = localStorage.colorScheme;
    if (savedScheme === 'light' || savedScheme === 'dark') {
      document.documentElement.setAttribute('color-scheme', savedScheme);
    }
  }
})();

document.addEventListener('DOMContentLoaded', function () {
  const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "/"
    : "https://musubi3.github.io/dsc106-portfolio/";

  let pages = [
    { url: 'index.html', title: 'Home' },
    { url: 'resume/index.html', title: 'Resume' },
    { url: 'projects/index.html', title: 'Projects' },
    { url: 'contact/index.html', title: 'Contact' },
    { url: 'https://github.com/musubi3', title: 'GitHub' },
    { url: 'https://www.linkedin.com/in/justin-lee-634719352/', title: 'LinkedIn' }
  ];

  // Create nav wrapper
  let navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';

  // Create menu toggle button
  let toggle = document.createElement('button');
  toggle.className = 'menu-toggle';
  toggle.setAttribute('aria-label', 'Toggle menu');
  toggle.textContent = '☰';

  // Create nav element with ID
  let nav = document.createElement('nav');
  nav.id = 'main-nav';

  // Add links to navigation
  for (let p of pages) {
    let url = p.url;
    let title = p.title;

    // Handle URL construction
    if (!url.startsWith('http')) {
      url = BASE_PATH + url;
    }

    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;

    if ((a.host === location.host && a.pathname === location.pathname) || (p.title === 'Home' && window.location.pathname === '/')) {
      a.classList.add('current');
    }

    // Open external links in new tab
    if (a.host !== location.host) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }

    nav.appendChild(a);
  }

  // Assemble the navigation structure
  navWrapper.appendChild(toggle);
  navWrapper.appendChild(nav);
  document.body.prepend(navWrapper);

  // MOBILE NAV
  function updateIcon() {
    toggle.innerHTML = nav.classList.contains('active') ? '✕' : '☰';
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    nav.classList.toggle('active');
    updateIcon();
  });

  // Close menu when clicking on a link
  document.querySelectorAll('#main-nav a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('active');
      updateIcon();
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', function (event) {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) {
      nav.classList.remove('active');
      updateIcon();
    }
  });

  // DARK MODE
  addDarkModeSwitcher();
});

function addDarkModeSwitcher() {
  document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <div class="theme-switcher">
      <label class="switch">
        <input type="checkbox" id="theme-toggle">
        <span class="slider"></span>
      </label>
      <span class="theme-label">Dark Mode</span>
    </div>`
  );

  const toggle = document.querySelector('#theme-toggle');
  const label = document.querySelector('.theme-label');

  // Load saved preference
  if ('colorScheme' in localStorage) {
    const savedScheme = localStorage.colorScheme;
    if (savedScheme === 'dark') {
      toggle.checked = true;
      label.textContent = 'Dark Mode';
      applyColorScheme('dark');
    } else if (savedScheme === 'light') {
      toggle.checked = false;
      label.textContent = 'Light Mode';
      applyColorScheme('light');
    } else {
      // Auto mode
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      toggle.checked = isDark;
      label.textContent = isDark ? 'Dark Mode' : 'Light Mode';
    }
  } else {
    // Default to auto
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    toggle.checked = isDark;
    label.textContent = isDark ? 'Dark Mode' : 'Light Mode';
  }

  toggle.addEventListener('change', function () {
    const scheme = this.checked ? 'dark' : 'light';
    applyColorScheme(scheme);
    localStorage.colorScheme = scheme;
    label.textContent = scheme === 'dark' ? 'Dark Mode' : 'Light Mode';

    // Update all external links with current theme
    updateExternalLinks(scheme);
  });

  // Initialize external links with current theme
  const currentScheme = localStorage.colorScheme || 'auto';
  if (currentScheme !== 'auto') {
    updateExternalLinks(currentScheme);
  }

  function applyColorScheme(scheme) {
    const html = document.documentElement;
    if (scheme === 'auto') {
      html.removeAttribute('color-scheme');
      html.style.removeProperty('color-scheme');
    } else {
      html.setAttribute('color-scheme', scheme);
      html.style.setProperty('color-scheme', scheme);
    }
  }

  function updateExternalLinks(theme) {
    // Update all external project links with theme parameter
    document.querySelectorAll('a[href*="github.io"]').forEach(link => {
      if (link.hostname !== window.location.hostname) {
        const url = new URL(link.href);
        url.searchParams.set('theme', theme);
        link.href = url.toString();
      }
    });
  }
}

/**
 * Fetches JSON data from a given URL.
 * @param {string} url - The URL to fetch the JSON data from.
 * @returns {Promise<Object>} A promise that resolves to the JSON data.
 */
 export async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
        return null;
    }
}

/**
 * Renders an array of projects into a specified container element.
 * @param {Array<Object>} projects - The array of project objects to render.
 * @param {HTMLElement} containerElement - The container to render the projects in.
 * @param {string} headingLevel - The heading level (e.g., 'h3') for project titles.
 */
export function renderProjects(projects, containerElement, headingLevel = 'h3') {
  containerElement.innerHTML = '';

  for (const project of projects) {
    const link = document.createElement('a');
    link.href = project.link;

    link.innerHTML = `
      <article class="card project-card">
        <${headingLevel}>${project.title}</${headingLevel}>
        <div class="project-image-container">
          <img src="${project.image}" alt="Screenshot of ${project.title}" class="project-image">
        </div>
        <p>${project.description}</p>
      </article>
    `;

    // Append the complete link (with the article inside) to the container
    containerElement.appendChild(link);
  }
}

/**
 * Fetches public data for a GitHub user.
 * @param {string} username - The GitHub username to look up.
 * @returns {Promise<Object>} A promise that resolves to the user's data.
 */
export async function fetchGitHubData(username='musubi3') {
  return fetchJSON(`https://api.github.com/users/${username}`);
}