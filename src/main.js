// removed import for css to stop FOUC

// --- Theme Management ---
const themeToggle = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

// Function to set theme
function setTheme(isDark) {
  if (isDark) {
    htmlEl.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    htmlEl.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
}

// Initialize theme
const savedTheme = localStorage.getItem('theme');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
  setTheme(true);
} else {
  setTheme(false);
}

// Toggle listener
if(themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isCurrentlyDark = htmlEl.classList.contains('dark');
    setTheme(!isCurrentlyDark);
  });
}

// --- Search Filter Logic ---
const searchInput = document.getElementById('tool-search');
const toolCards = document.querySelectorAll('.tool-card');
const categories = document.querySelectorAll('.tool-category');

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();

    toolCards.forEach(card => {
      const title = card.querySelector('.tool-title').innerText.toLowerCase();
      const desc = card.querySelector('.tool-desc').innerText.toLowerCase();
      
      if (title.includes(query) || desc.includes(query)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });

    // Hide categories if all their tools are hidden
    categories.forEach(category => {
      const visibleCards = Array.from(category.querySelectorAll('.tool-card')).filter(card => card.style.display !== 'none');
      if (visibleCards.length === 0) {
        category.style.display = 'none';
      } else {
        category.style.display = 'block';
      }
    });
  });
}

// --- Dynamic Back Navigation ---
// Makes all links pointing to "/" trigger a history.back() instead if the referrer was the same site.
// This preserves scroll position so users return to the exact section they left.
document.addEventListener('DOMContentLoaded', () => {
  const homeLinks = document.querySelectorAll('a[href="/"]');
  homeLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // Check if the previous page was actually our own site
      if (document.referrer && document.referrer.includes(window.location.host)) {
        e.preventDefault();
        window.history.back();
      }
      // Otherwise, let the normal `<a href="/">` behavior run
    });
  });
});
