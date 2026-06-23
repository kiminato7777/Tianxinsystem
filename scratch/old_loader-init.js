/* loader-init.js — Standard Dynamic Loader v2.0
 * Provides 3 tiers of loading UI:
 *   1. Full-page  : showUniversalLoader() / hideUniversalLoader()
 *   2. Popup      : showPopupLoader(msg?) / hidePopupLoader()
 *   3. Button     : setButtonLoading(btn, true/false, originalHTML?)
 */
(function () {
    const LOADER_ID  = 'universal-loader';
    const POPUP_ID   = 'popup-loader-overlay';
    const DEFAULT_LOGO = '/img/1.jpg';

    // ─── 1. FULL-PAGE LOADER ────────────────────────────────────────────────

    function getLoaderContents() {
        const logoSrc = window.SYSTEM_LOGO || DEFAULT_LOGO;
        return `
            <div class="loader-container">
                <div class="ring ring-1"></div>
                <div class="ring ring-2"></div>
                <div class="ring ring-3"></div>
                <div class="logo-wrapper" id="loader-logo-wrapper">
                    <div class="logo-glow"></div>
                    <img src="${logoSrc}" alt="Logo" class="loader-logo"
                         onerror="this.parentElement.style.display='none'">
                </div>
            </div>
            <div class="loader-text-container">
                <div class="loader-title">
                    កំពុងដំណើរការ<span class="dots"><span>.</span><span>.</span><span>.</span></span>
                </div>
                <div class="loader-subtitle">សូមរង់ចាំបន្តិច</div>
            </div>
        `;
    }

    function injectLoader() {
        if (!document.body) { requestAnimationFrame(injectLoader); return; }
        if (document.getElementById(LOADER_ID)) return;
        const el = document.createElement('div');
        el.id = LOADER_ID;
        el.innerHTML = getLoaderContents();
        document.body.prepend(el);
        console.log('🚀 Standard Dynamic Loader Initialized');
    }
    injectLoader();

    window.showUniversalLoader = function () {
        const el = document.getElementById(LOADER_ID);
        if (el) el.classList.remove('hidden');
    };

    window.hideUniversalLoader = function () {
        const el = document.getElementById(LOADER_ID);
        if (el) el.classList.add('hidden');
    };

    // Auto-hide logic
    const handleAutoHide = () => setTimeout(() => { if (window.hideUniversalLoader) window.hideUniversalLoader(); }, 500);
    if (document.readyState === 'complete') {
        handleAutoHide();
    } else {
        document.addEventListener('DOMContentLoaded', handleAutoHide);
        window.addEventListener('load', handleAutoHide);
    }
    setTimeout(() => {
        const el = document.getElementById(LOADER_ID);
        if (el && !el.classList.contains('hidden')) window.hideUniversalLoader();
    }, 3500);


    // ─── 2. POPUP OVERLAY LOADER ────────────────────────────────────────────
    // Usage: window.showPopupLoader('កំពុងរក្សាទុក...')
    //        window.hidePopupLoader()

    function injectPopupLoader() {
        if (!document.body) { requestAnimationFrame(injectPopupLoader); return; }
        if (document.getElementById(POPUP_ID)) return;

        const el = document.createElement('div');
        el.id = POPUP_ID;
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('role', 'status');
        el.innerHTML = `
            <div class="popup-loader-card">
                <div class="popup-loader-spinner">
                    <svg viewBox="0 0 50 50" class="pls-svg">
                        <circle class="pls-track"  cx="25" cy="25" r="20" fill="none" stroke-width="4"/>
                        <circle class="pls-fill"   cx="25" cy="25" r="20" fill="none" stroke-width="4"
                                stroke-dasharray="126" stroke-dashoffset="126"/>
                    </svg>
                    <div class="pls-dot"></div>
                </div>
                <div class="popup-loader-msg" id="popup-loader-msg">កំពុងដំណើរការ...</div>
            </div>
        `;
        document.body.appendChild(el);
    }
    document.addEventListener('DOMContentLoaded', injectPopupLoader);

    window.showPopupLoader = function (msg) {
        let el = document.getElementById(POPUP_ID);
        if (!el) { injectPopupLoader(); el = document.getElementById(POPUP_ID); }
        const msgEl = document.getElementById('popup-loader-msg');
        if (msgEl) msgEl.textContent = msg || 'កំពុងដំណើរការ...';
        if (el) { el.classList.remove('plo-hidden'); el.classList.add('plo-visible'); }
    };

    window.hidePopupLoader = function () {
        const el = document.getElementById(POPUP_ID);
        if (el) { el.classList.remove('plo-visible'); el.classList.add('plo-hidden'); }
    };


    // ─── 3. BUTTON LOADING STATE ─────────────────────────────────────────────
    // Usage: window.setButtonLoading(btnElement, true, 'Save')
    //        window.setButtonLoading(btnElement, false)

    window.setButtonLoading = function (btn, isLoading, label) {
        if (!btn) return;
        if (isLoading) {
            btn._originalHTML = btn.innerHTML;
            btn._originalDisabled = btn.disabled;
            const txt = label || 'កំពុងដំណើរការ...';
            btn.innerHTML = `
                <span class="btn-spinner" aria-hidden="true"></span>
                <span>${txt}</span>
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
