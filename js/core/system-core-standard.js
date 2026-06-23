/* system-core-standard.js — Unified Enterprise Management Standard v1.0
 * ឯកសារស្តង់ដាររួមសម្រាប់ប្រព័ន្ធគ្រប់គ្រងសាលាអន្តរជាតិ
 * ធានាភាពស្របគ្នា និងដំណើរការស្តង់ដារលើគ្រប់ទំព័រទាំងអស់ (Pages)
 */

(function () {
    console.log('🛡️ System Core Standard Initializing...');

    // ─── 1. AUTO INJECT KHMER TYPOGRAPHY ──────────────────────────────────────
    function ensureStandardFonts() {
        if (document.getElementById('system-standard-fonts')) return;
        const fontStyle = document.createElement('style');
        fontStyle.id = 'system-standard-fonts';
        fontStyle.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Kantumruy+Pro:ital,wght@0,100..900;1,100..900&family=Moul&display=swap');
            body, button, input, select, textarea, .tooltip, .popover {
                font-family: 'Kantumruy Pro', sans-serif !important;
            }
            .moul-font {
                font-family: 'Moul', cursive !important;
            }
        `;
        document.head.appendChild(fontStyle);
    }

    // ─── 2. STANDARDIZE LOADERS ──────────────────────────────────────────────
    function setupStandardLoaders() {
        if (typeof window.showPopupLoader !== 'function') {
            console.warn('⚠️ Popup Loader មិនទាន់មាន ដូច្នេះទាញយក loader-init.js...');
            const script = document.createElement('script');
            script.src = '/js/core/loader-init.js';
            document.head.appendChild(script);
        }

        // Global override for ALL loading functions to use the SINGLE standard dynamic popup
        window.showLoading = function(show, msg) {
            if (show) {
                if (window.showPopupLoader) window.showPopupLoader(msg || 'កំពុងដំណើរការ...');
            } else {
                if (window.hidePopupLoader) window.hidePopupLoader();
            }
        };

        // Override Swal (SweetAlert) loaders to use the standard dynamic popup instead of SweetAlert spinners
        const patchSwal = setInterval(() => {
            if (window.Swal && !window.Swal._isPatchedForLoaders) {
                const originalFire = window.Swal.fire;
                window.Swal.fire = function(...args) {
                    const config = args[0] || {};
                    const isLoader = (config.didOpen && config.didOpen.toString().includes('showLoading')) || 
                                     (config.title && typeof config.title === 'string' && config.title.includes('កំពុង') && config.allowOutsideClick === false);
                    
                    if (isLoader) {
                        if (window.showPopupLoader) {
                            window.showPopupLoader(config.title || 'កំពុងដំណើរការ...');
                            // Return a dummy promise since this is a loading overlay not a real modal
                            return Promise.resolve({ isConfirmed: false, isDismissed: true });
                        }
                    }
                    return originalFire.apply(this, args);
                };
                
                const originalClose = window.Swal.close;
                window.Swal.close = function(...args) {
                    if (window.hidePopupLoader) window.hidePopupLoader();
                    return originalClose.apply(this, args);
                };
                
                // Also patch direct Swal.showLoading / Swal.hideLoading
                window.Swal.showLoading = function() {
                    if (window.showPopupLoader) window.showPopupLoader('កំពុងដំណើរការ...');
                };
                window.Swal.hideLoading = function() {
                    if (window.hidePopupLoader) window.hidePopupLoader();
                };

                window.Swal._isPatchedForLoaders = true;
                clearInterval(patchSwal);
            }
        }, 100);
        setTimeout(() => clearInterval(patchSwal), 10000); // Stop checking after 10s
    }

    // ─── 3. GLOBAL NAVIGATION CONTROLS ───────────────────────────────────────
    window.toggleDesktopSidebar = function () {
        if (document.body) {
            document.body.classList.toggle('sidebar-collapsed');
            // រក្សាទុកស្ថានភាព Sidebar
            const isCollapsed = document.body.classList.contains('sidebar-collapsed');
            localStorage.setItem('tianxin_sidebar_state', isCollapsed ? 'collapsed' : 'expanded');
        }
    };

    window.toggleFullScreen = function () {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`មិនអាចបើកពេញអេក្រង់បានទេ: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // ─── 4. KHMER DATE & TIME FORMATTER ──────────────────────────────────────
    window.formatStandardKhmerDate = function (date) {
        if (!date) date = new Date();
        const days = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
        const dayName  = days[date.getDay()];
        const dayNum   = date.getDate().toString().padStart(2, '0');
        const monthNum = (date.getMonth() + 1).toString().padStart(2, '0');
        const year     = date.getFullYear();
        return `ថ្ងៃ${dayName} ${dayNum}-${monthNum}-${year}`;
    };

    window.startStandardClock = function (dateId, timeId) {
        const update = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            const dEl = document.getElementById(dateId);
            const tEl = document.getElementById(timeId);
            if (dEl) dEl.textContent = window.formatStandardKhmerDate(now);
            if (tEl) tEl.innerHTML = `<i class="fi fi-rr-clock me-1"></i> ${timeStr}`;
        };
        setInterval(update, 1000);
        update();
    };

    // ─── 5. USER SESSION RECOVERY ────────────────────────────────────────────
    window.standardizeWelcomeUser = function (elementId) {
        try {
            const el = document.getElementById(elementId);
            if (!el) return;
            // ព្យាយាមទាញយកពី LocalStorage
            const sessionData = localStorage.getItem('userSession');
            if (sessionData) {
                const user = JSON.parse(sessionData);
                const name = user.name || user.email?.split('@')[0] || 'អ្នកប្រើប្រាស់';
                el.textContent = name;
            }
        } catch (e) {
            console.error('Session Parsing Error', e);
        }
    };

    // ─── 6. SYSTEM UPDATE LOCK ───────────────────────────────────────────────
    window.showSystemUpdateLock = function () {
        const triggerLock = () => {
            if (window.Swal) {
                window.Swal.fire({
                    icon: 'warning',
                    title: 'ប្រព័ន្ធមានបញ្ហា!',
                    html: '<h4 style="color: #ef4444; margin-top: 10px; font-family: \'Kantumruy Pro\', sans-serif;">សូមធ្វើការ Update ប្រព័ន្ធជាបន្ទាន់</h4><p style="font-family: \'Kantumruy Pro\', sans-serif;">បច្ចុប្បន្នប្រព័ន្ធមិនអាចដំណើរការបានទេ ដោយសារតម្រូវឲ្យមានការ Update ថ្មី។<br>សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ។</p>',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    showCancelButton: false,
                    backdrop: `rgba(15, 23, 42, 0.95)`
                });
            } else {
                const lockDiv = document.createElement('div');
                lockDiv.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.98);z-index:9999999;display:flex;align-items:center;justify-content:center;color:white;font-family:"Kantumruy Pro", sans-serif;text-align:center;padding:20px;';
                lockDiv.innerHTML = '<div><div style="font-size: 60px; margin-bottom: 20px;">⚠️</div><h1 style="color:#ef4444;font-size:32px;margin-bottom:15px;">ប្រព័ន្ធមានបញ្ហា!</h1><h3 style="margin-bottom:15px;">សូមធ្វើការ Update ប្រព័ន្ធជាបន្ទាន់</h3><p style="color: #cbd5e1; font-size: 16px;">បច្ចុប្បន្នប្រព័ន្ធមិនអាចដំណើរការបានទេ ដោយសារតម្រូវឲ្យមានការ Update ថ្មី។<br>សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ។</p></div>';
                document.body.appendChild(lockDiv);
            }
        };
        setTimeout(triggerLock, 100);
    };

    // ─── 7. TELEGRAM NOTIFICATION SYSTEM ──────────────────────────────────────
    window.sendTelegramNotification = async function (message, buttons = null) {
        // You can set these in firebase-config.js or another config file
        const botToken = window.TELEGRAM_BOT_TOKEN || ''; 
        const chatId = window.TELEGRAM_CHAT_ID || '';
        
        if (!botToken || !chatId) {
            console.warn('Telegram Bot Token or Chat ID is missing. Cannot send notification.');
            return;
        }

        try {
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            const payload = {
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            };
            
            if (buttons && buttons.length > 0) {
                payload.reply_markup = {
                    inline_keyboard: [buttons] // Array of button arrays
                };
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!result.ok) {
                console.error('Telegram API Error:', result.description);
            } else {
                console.log('Telegram notification sent successfully!');
            }
        } catch (error) {
            console.error('Failed to send Telegram notification:', error);
        }
    };

    /**
     * 100% Dynamic Telegram Notification Builder
     * @param {Object} options 
     * @param {string} options.title - The title of the message
     * @param {Object} options.data - Key-value pairs of data to display
     * @param {Array} options.buttons - Array of inline buttons
     * @param {string} options.footer - Footer text
     */
    window.buildAndSendTelegramMessage = async function(options) {
        const title = options.title || 'Notification';
        const footer = options.footer || 'System Notification';
        const data = options.data || {};
        const buttons = options.buttons || null;
        
        let message = `<b>${title}</b>\n--------------------------------\n`;
        
        for (const [key, value] of Object.entries(data)) {
            // Only add if value is not undefined/null
            if (value !== undefined && value !== null && value !== '') {
                message += `<b>${key}:</b> ${value}\n`;
            }
        }
        
        message += `--------------------------------\n<i>${footer}</i>`;
        
        return await window.sendTelegramNotification(message, buttons);
    };

    // ─── INIT EXECUTION ──────────────────────────────────────────────────────
    function initializeStandard() {
        ensureStandardFonts();
        setupStandardLoaders();

        // ស្ដារស្ថានភាព Sidebar ពីមុន
        const savedState = localStorage.getItem('tianxin_sidebar_state');
        if (savedState === 'collapsed') {
            document.body.classList.add('sidebar-collapsed');
        }

        // ស្វែងរក និងចាប់ផ្តើមនាឡិកាប្រសិនបើមាន
        if (document.getElementById('current-date-display') && document.getElementById('current-time-display')) {
            window.startStandardClock('current-date-display', 'current-time-display');
        }
        if (document.getElementById('welcome-user-name')) {
            window.standardizeWelcomeUser('welcome-user-name');
        }

        // ─── GLOBAL MODAL FOCUS FIX (Bootstrap aria-hidden warning) ─────────
        document.addEventListener('hide.bs.modal', function () {
            if (document.activeElement) {
                document.activeElement.blur();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeStandard);
    } else {
        initializeStandard();
    }

})();
