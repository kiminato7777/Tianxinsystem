/**
 * sidebar.js
 * Dynamically handles sidebar injection, active state, and global image previews.
 */

function injectSidebar() {
    const sidebarContainer = document.getElementById('sidebar');
    if (!sidebarContainer) return;

    const items = window.SYSTEM_MODULES || [];
    const path = window.location.pathname === '/' ? '/index.html' : window.location.pathname;
    const logo = window.SYSTEM_LOGO || "/img/1.jpg";

    const navItems = items.map(item => `
        ${item.sectionBefore ? `<div class="sidebar-section-title px-4 mt-3 mb-2 text-white-50 text-uppercase fw-bold" style="font-size: 0.7rem; letter-spacing: 1px;">${item.sectionBefore}</div>` : ''}
        <a class="nav-link ${path === item.href ? 'active' : ''}" href="${item.href}" id="nav-${item.key}">
            <i class="fi ${item.icon}"></i> <span>${item.label}</span>
        </a>
    `).join('');

    sidebarContainer.innerHTML = `
        <div class="sidebar-header" id="sidebar-logo-container">
            <a href="/index.html">
                <img src="${logo}" alt="Logo" id="sidebar-logo" onerror="this.closest('.sidebar-header').style.display='none'">
            </a>
        </div>
        <nav class="nav flex-column">${navItems}</nav>
    `;

    if (typeof window.refreshSidebarPermissions === 'function') window.refreshSidebarPermissions();
    if (typeof window.refreshSidebarProfile === 'function') window.refreshSidebarProfile();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSidebar);
} else {
    injectSidebar();
}

// Global Image Hover Preview Setup
(function initImagePreview() {
    if (window.location.pathname.includes('teacher-portal.html')) return;

    document.head.insertAdjacentHTML('beforeend', `<style>
        .img-hover-preview-container {
            position: fixed; z-index: 999999; pointer-events: none; display: none;
            background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px) saturate(180%);
            -webkit-backdrop-filter: blur(12px) saturate(180%);
            border: 2px solid rgba(138, 14, 91, 0.4); border-radius: 24px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.5) inset;
            padding: 8px; max-width: 400px; max-height: 500px; overflow: hidden;
            animation: previewPopOut 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            transition: opacity 0.2s ease;
        }
        .img-hover-preview-container.loading::after {
            content: ""; position: absolute; top: 50%; left: 50%; width: 30px; height: 30px;
            margin: -15px 0 0 -15px; border: 3px solid rgba(138, 14, 91, 0.1); border-top-color: #8a0e5b;
            border-radius: 50%; animation: previewSpinner 0.8s linear infinite;
        }
        .img-hover-preview-container img {
            width: 100%; height: auto; max-height: 480px; display: block; border-radius: 16px;
            object-fit: contain; opacity: 0; transition: opacity 0.3s ease;
        }
        .img-hover-preview-container img.loaded { opacity: 1; }
        @keyframes previewPopOut { from { opacity: 0; transform: scale(0.8) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes previewSpinner { to { transform: rotate(360deg); } }
    </style>`);

    const container = document.createElement('div');
    container.className = 'img-hover-preview-container';
    document.body.appendChild(container);

    let currentSrc = '';

    const position = (e) => {
        if (!currentSrc) return;
        const rect = container.getBoundingClientRect();
        const offset = 25;
        let x = e.clientX + offset;
        let y = e.clientY + offset;

        if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - offset;
        if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 15;

        x = Math.max(15, Math.min(x, window.innerWidth - rect.width - 15));
        y = Math.max(15, Math.min(y, window.innerHeight - rect.height - 15));

        container.style.left = `${x}px`;
        container.style.top = `${y}px`;
    };

    document.addEventListener('mouseover', e => {
        const img = e.target.closest('img');
        if (!img || !img.src || img.src === currentSrc) return;

        const rect = img.getBoundingClientRect();
        if (rect.width < 25 || rect.height < 25) return;

        const isExcluded = ['sidebar-logo', 'login-logo', 'loader-logo'].some(c => img.classList.contains(c)) || 
                           img.src.includes('favicon') || img.closest('.nav-link') || img.closest('button.btn-close');
        
        if (isExcluded) return;

        currentSrc = img.src;
        container.innerHTML = '';
        container.className = 'img-hover-preview-container loading';
        container.style.display = 'block';

        const previewImg = new Image();
        previewImg.onload = () => {
            container.classList.remove('loading');
            previewImg.classList.add('loaded');
            position(e);
        };
        previewImg.onerror = hide;
        previewImg.src = currentSrc;
        container.appendChild(previewImg);
        position(e);
    });

    document.addEventListener('mousemove', position);

    const hide = () => {
        container.style.display = 'none';
        container.innerHTML = '';
        currentSrc = '';
    };

    document.addEventListener('mouseout', e => {
        if (e.target.closest('img')) hide();
    });
})();
