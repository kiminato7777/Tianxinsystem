/**
 * theme-mode.js
 * Manages Light/Dark theme switching with persistence.
 */
(function() {
    const THEME_KEY = 'school_system_theme';
    const THEME_DARK = 'dark';
    const THEME_LIGHT = 'light';

    function getTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved) return saved;
        // Auto-detect based on system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEME_DARK : THEME_LIGHT;
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        updateToggleIcons(theme);
        
        // Custom events for components that might need re-styling
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }

    function updateToggleIcons(theme) {
        const buttons = document.querySelectorAll('.theme-toggle-btn');
        buttons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                if (theme === THEME_DARK) {
                    icon.className = 'fi fi-rr-sun';
                    btn.setAttribute('title', 'ប្តូរទៅ Light Mode');
                } else {
                    icon.className = 'fi fi-rr-moon';
                    btn.setAttribute('title', 'ប្តូរទៅ Dark Mode');
                }
            }
        });
    }

    // Toggle Function (Global)
    window.toggleTheme = function() {
        const current = document.documentElement.getAttribute('data-theme') || THEME_LIGHT;
        const next = current === THEME_DARK ? THEME_LIGHT : THEME_DARK;
        setTheme(next);
    };

    // Initial Apply (Run immediately to avoid flicker if loaded in head)
    const initialTheme = getTheme();
    document.documentElement.setAttribute('data-theme', initialTheme);

    // After DOM loaded, update icons
    document.addEventListener('DOMContentLoaded', () => {
        updateToggleIcons(initialTheme);
    });
})();
