/* loader-init.js — Unified Premium Loader System v4.0
 * Provides 3 tiers of loading UI:
 *   1. Full-page  : showUniversalLoader() / hideUniversalLoader() (with Logo and Orbiting Rings)
 *   2. Popup      : showPopupLoader(msg?) / hidePopupLoader() (Glass Card Spinner)
 *   3. Button     : setButtonLoading(btn, true/false, originalHTML?) (Inline Spinner)
 */
(function () {
    const LOADER_ID  = 'universal-loader';
    const POPUP_ID   = 'popup-loader-overlay';
    const DEFAULT_LOGO = '/img/1.jpg';

    // ─── 1. FULL-PAGE LOADER (Now aliased to Popup Loader for standardization) ───

    window.showUniversalLoader = function (msg) {
        if (window.showPopupLoader) {
            window.showPopupLoader(msg || 'កំពុងដំណើរការ...');
        }
    };

    window.hideUniversalLoader = function () {
        if (window.hidePopupLoader) {
            window.hidePopupLoader();
        }
    };

    // Auto-hide full-page loader logic on page load
    const handleAutoHide = () => setTimeout(() => { 
        if (window.hideUniversalLoader) window.hideUniversalLoader(); 
    }, 600);

    if (document.readyState === 'complete') {
        handleAutoHide();
    } else {
        document.addEventListener('DOMContentLoaded', handleAutoHide);
        window.addEventListener('load', handleAutoHide);
    }

    // Safety timeout to ensure loader doesn't get stuck forever
    setTimeout(() => {
        window.hideUniversalLoader();
    }, 4000);


    // ─── 2. POPUP OVERLAY LOADER ────────────────────────────────────────────
    // Usage: window.showPopupLoader('កំពុងរក្សាទុក...')
    //        window.hidePopupLoader()

    function injectPopupLoader() {
        if (!document.body) { requestAnimationFrame(injectPopupLoader); return; }
        if (document.getElementById(POPUP_ID)) return;

        const logoSrc = window.SYSTEM_LOGO || DEFAULT_LOGO;
        const el = document.createElement('div');
        el.id = POPUP_ID;
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('role', 'status');
        el.innerHTML = `
            <div class="popup-loader-card">
                <div class="popup-loader-spinner">
                    <svg viewBox="0 0 50 50" class="pls-svg">
                        <circle class="pls-track" cx="25" cy="25" r="20" fill="none" stroke-width="4"/>
                        <circle class="pls-fill"  cx="25" cy="25" r="20" fill="none" stroke-width="4"
                                stroke-dasharray="126" stroke-dashoffset="126"/>
                    </svg>
                    <div class="popup-loader-logo-wrapper">
                        <img src="${logoSrc}" alt="Logo" class="popup-loader-logo"
                             onerror="this.parentElement.style.display='none'">
                    </div>
                </div>
                <div class="popup-loader-msg" id="popup-loader-msg">កំពុងដំណើរការ...</div>
            </div>
        `;
        document.body.appendChild(el);
        console.log('✅ Unified Popup Loader Initialized');
    }

    // Inject popup loader
    if (document.body) {
        injectPopupLoader();
    } else {
        document.addEventListener('DOMContentLoaded', injectPopupLoader);
    }

    window.showPopupLoader = function (msg) {
        let el = document.getElementById(POPUP_ID);
        if (!el) { injectPopupLoader(); el = document.getElementById(POPUP_ID); }
        
        // Dynamic Logo update
        const logoImg = el ? el.querySelector('.popup-loader-logo') : null;
        if (logoImg) {
            logoImg.src = window.SYSTEM_LOGO || DEFAULT_LOGO;
        }

        const msgEl = document.getElementById('popup-loader-msg');
        if (msgEl) msgEl.textContent = msg || 'កំពុងដំណើរការ...';
        if (el) { el.classList.remove('plo-hidden'); el.classList.add('plo-visible'); }
    };

    window.hidePopupLoader = function () {
        const el = document.getElementById(POPUP_ID);
        if (el) { el.classList.remove('plo-visible'); el.classList.add('plo-hidden'); }
    };


    // ─── 3. BUTTON LOADING STATE ─────────────────────────────────────────────
    // Usage: window.setButtonLoading(btnElement, true, 'Saving...')
    //        window.setButtonLoading(btnElement, false)

    window.setButtonLoading = function (btn, isLoading, label) {
        if (!btn) return;
        if (isLoading) {
            btn._originalHTML     = btn.innerHTML;
            btn._originalDisabled = btn.disabled;
            btn.innerHTML = `
                <span class="btn-spinner" aria-hidden="true"></span>
                <span>${label || 'កំពុងដំណើរការ...'}</span>
            `;
            btn.disabled = true;
            btn.classList.add('btn-loading');
        } else {
            if (btn._originalHTML !== undefined) btn.innerHTML = btn._originalHTML;
            btn.disabled = btn._originalDisabled || false;
            btn.classList.remove('btn-loading');
        }
    };

})();
