/**
 * sidebar.js
 * Dynamically handles sidebar injection and active state across all pages.
 */

function injectSidebar() {
    const sidebarItems = window.SYSTEM_MODULES || [];
    const sidebarContainer = document.getElementById('sidebar');
    if (!sidebarContainer) return;

    const currentPath = window.location.pathname;
    // Normalize path for comparison (handle root / and .html)
    const normalizedCurrentPath = currentPath === '/' ? '/index.html' : currentPath;

    const logoPath = window.SYSTEM_LOGO || "/img/1.jpg";
    let html = `
        <div class="sidebar-header" id="sidebar-logo-container">
            <a href="/index.html">
                <img src="${logoPath}" alt="Logo" id="sidebar-logo" 
                     onerror="document.getElementById('sidebar-logo-container').style.display='none'">
            </a>
        </div>

        <nav class="nav flex-column">
    `;

    sidebarItems.forEach(item => {
        // Add a section header if defined in configuration
        if (item.sectionBefore) {
            html += `
                <div class="sidebar-section-title px-4 mt-3 mb-2 text-white-50 text-uppercase fw-bold" style="font-size: 0.7rem; letter-spacing: 1px;">
                    ${item.sectionBefore}
                </div>
            `;
        }

        const isActive = normalizedCurrentPath === item.href ? 'active' : '';
        html += `
            <a class="nav-link ${isActive}" href="${item.href}" id="nav-${item.key}">
                <i class="fi ${item.icon}"></i> <span>${item.label}</span>
            </a>
        `;
    });

    html += `
        </nav>

        <hr class="sidebar-divider my-2 mx-3" style="border-top: 1px solid rgba(255,255,255,0.3);">

        <!-- User Profile Section -->
        <div class="px-3 py-3 text-white border-top border-bottom border-white-10 sidebar-user-profile"
            style="background: rgba(0,0,0,0.05);">
            <div class="text-center">
                <div id="user-display-image-container" class="bg-white rounded-circle d-inline-flex align-items-center justify-content-center mb-2 shadow-sm overflow-hidden"
                    style="width: 60px; height: 60px; min-width: 60px;">
                    <i class="fi fi-rr-user-circle text-primary fa-2x" id="user-display-placeholder"></i>
                </div>
                <div style="font-size: 0.85rem;">
                    <div class="fw-bold text-truncate mb-1" id="user-display-name" style="font-size: 1rem;">...</div>
                    <div class="text-white-50 text-truncate mb-2" id="user-display-email" style="font-size: 0.75rem;">...</div>
                    <div class="badge bg-warning text-dark fw-normal" id="user-role-badge">...</div>
                </div>
            </div>
        </div>

        <a href="#" class="nav-link text-warning mt-1" onclick="handleLogout(event)">
            <i class="fi fi-rr-sign-out-alt"></i> <span>ចាកចេញ</span>
        </a>
    `;

    sidebarContainer.innerHTML = html;
    
    // Refresh permissions after injection to ensure links are correctly hidden/shown
    if (typeof window.refreshSidebarPermissions === 'function') {
        window.refreshSidebarPermissions();
    }
}

// Run injection immediately if script is loaded at the end of body, 
// or on DOMContentLoaded if loaded in head.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSidebar);
} else {
    injectSidebar();
}

(function() {
    // Inject Enhanced CSS for Premium Preview
    const style = document.createElement('style');
    style.textContent = `
        .img-hover-preview-container {
            position: fixed;
            z-index: 999999;
            pointer-events: none;
            display: none;
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(12px) saturate(180%);
            -webkit-backdrop-filter: blur(12px) saturate(180%);
            border: 2px solid rgba(138, 14, 91, 0.4);
            border-radius: 24px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.25), 
                        0 0 0 1px rgba(255,255,255,0.5) inset;
            padding: 8px;
            max-width: 400px;
            max-height: 500px;
            overflow: hidden;
            animation: previewPopOut 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .img-hover-preview-container.loading::after {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            width: 30px;
            height: 30px;
            margin: -15px 0 0 -15px;
            border: 3px solid rgba(138, 14, 91, 0.1);
            border-top-color: #8a0e5b;
            border-radius: 50%;
            animation: previewSpinner 0.8s linear infinite;
        }

        .img-hover-preview-container img {
            width: 100%;
            height: auto;
            max-height: 480px;
            display: block;
            border-radius: 16px;
            object-fit: contain;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .img-hover-preview-container img.loaded {
            opacity: 1;
        }

        @keyframes previewPopOut {
            from { opacity: 0; transform: scale(0.8) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes previewSpinner {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    const previewContainer = document.createElement('div');
    previewContainer.className = 'img-hover-preview-container';
    document.body.appendChild(previewContainer);

    let currentImgSrc = '';

    document.addEventListener('mouseover', function(e) {
        const img = e.target.closest('img');
        if (!img) return;

        const src = img.getAttribute('src');
        if (!src || src.length < 5 || src === currentImgSrc) return;

        // Optimized Skip Detection
        const rect = img.getBoundingClientRect();
        if (rect.width < 25 || rect.height < 25) return;
        
        const isExcluded = img.classList.contains('sidebar-logo') || 
                           img.classList.contains('login-logo') || 
                           img.classList.contains('loader-logo') ||
                           src.includes('favicon') ||
                           img.closest('.nav-link') ||
                           img.closest('button.btn-close');

        if (isExcluded) return;

        currentImgSrc = src;
        showPreview(src, e);
    });

    function showPreview(src, e) {
        previewContainer.innerHTML = '';
        previewContainer.classList.add('loading');
        previewContainer.style.display = 'block';

        const previewImg = new Image();
        previewImg.onload = function() {
            previewContainer.classList.remove('loading');
            previewImg.classList.add('loaded');
            // Re-position after image loads to handle size changes
            positionPreview(e);
        };
        previewImg.onerror = function() {
            hidePreview();
        };
        previewImg.src = src;
        previewContainer.appendChild(previewImg);

        positionPreview(e);
    }

    document.addEventListener('mousemove', function(e) {
        if (previewContainer.style.display === 'block') {
            positionPreview(e);
        }
    });

    document.addEventListener('mouseout', function(e) {
        const img = e.target.closest('img');
        if (img) {
            hidePreview();
        }
    });

    function hidePreview() {
        previewContainer.style.display = 'none';
        previewContainer.innerHTML = '';
        currentImgSrc = '';
    }

    function positionPreview(e) {
        if (previewContainer.style.display === 'none') return;

        const offset = 25;
        const rect = previewContainer.getBoundingClientRect();
        
        let x = e.clientX + offset;
        let y = e.clientY + offset;

        // Screen Collision Detection (100% Dynamic)
        if (x + rect.width > window.innerWidth) {
            x = e.clientX - rect.width - offset;
        }
        
        if (y + rect.height > window.innerHeight) {
            y = window.innerHeight - rect.height - 15;
        }

        // Keep away from the very edges
        x = Math.max(15, Math.min(x, window.innerWidth - rect.width - 15));
        y = Math.max(15, Math.min(y, window.innerHeight - rect.height - 15));

        previewContainer.style.left = `${x}px`;
        previewContainer.style.top = `${y}px`;
    }
})();
