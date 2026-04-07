/* loader-init.js - 100% Dynamic & Robust Version */
(function () {
    const LOADER_ID = 'universal-loader';
    const DEFAULT_LOGO = "/img/1.jpg";

    /**
     * getLoaderContents
     * Generates the dynamic HTML for the loader picking up any global config.
     */
    function getLoaderContents() {
        // Use window.SYSTEM_LOGO if defined (from firebase-config.js), otherwise fallback
        const logoSrc = window.SYSTEM_LOGO || DEFAULT_LOGO;
        
        return `
            <div class="loader-container">
                <!-- Three Dynamic Rings (Styled in loader.css) -->
                <div class="ring ring-1"></div>
                <div class="ring ring-2"></div>
                <div class="ring ring-3"></div>
                
                <!-- Center Logo Wrapper with Smart Detection -->
                <div class="logo-wrapper" id="loader-logo-wrapper">
                    <div class="logo-glow"></div>
                    <img src="${logoSrc}" alt="Logo" class="loader-logo" 
                         onerror="this.parentElement.style.display='none'">
                </div>
            </div>

            <!-- Animated Text Content -->
            <div class="loader-text-container">
                <div class="loader-title">
                    កំពុងដំណើរការ<span class="dots"><span>.</span><span>.</span><span>.</span></span>
                </div>
                <div class="loader-subtitle">សូមរង់ចាំបន្តិច</div>
            </div>
        `;
    }

    /**
     * injectLoader
     * Safely injects the loader into the document body as early as possible.
     */
    function injectLoader() {
        // If body isn't ready, wait for the next frame
        if (!document.body) {
            requestAnimationFrame(injectLoader);
            return;
        }

        // Prevent duplicate injection
        if (document.getElementById(LOADER_ID)) return;

        const loaderDiv = document.createElement('div');
        loaderDiv.id = LOADER_ID;
        loaderDiv.innerHTML = getLoaderContents();
        
        // Prepend to body to ensure it's at the top of the DOM
        document.body.prepend(loaderDiv);
        console.log("🚀 Standard Dynamic Loader Initialized");
    }

    // Start the injection process
    injectLoader();

    // --- Global Control APIs (100% Dynamic) ---

    window.showUniversalLoader = function () {
        const loader = document.getElementById(LOADER_ID);
        if (loader) loader.classList.remove('hidden');
    };

    window.hideUniversalLoader = function () {
        const loader = document.getElementById(LOADER_ID);
        if (loader) loader.classList.add('hidden');
    };

    // --- Auto-Hide Logic with Robust Readiness Check ---

    const handleAutoHide = () => {
        // Reduced delay to 500ms for faster feel, but keeps it smooth
        setTimeout(() => {
            if (window.hideUniversalLoader) window.hideUniversalLoader();
        }, 500);
    };

    // Robust Readiness Check: Target both DOMContentLoaded and Window Load
    if (document.readyState === 'complete') {
        handleAutoHide();
    } else {
        // DOMContentLoaded usually fires much faster than window.load
        document.addEventListener('DOMContentLoaded', handleAutoHide);
        window.addEventListener('load', handleAutoHide);
    }

    // Dynamic Safety Net: 
    // If the page is taking too long (e.g. slow external assets), 
    // we hide the loader to let the user see the content.
    setTimeout(() => {
        const loader = document.getElementById(LOADER_ID);
        if (loader && !loader.classList.contains('hidden')) {
            window.hideUniversalLoader();
        }
    }, 3500); // Reduced to 3.5s for better UX

})();
