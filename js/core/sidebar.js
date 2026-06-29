/**
 * sidebar.js
 * Dynamically handles sidebar injection, active state, and global image previews.
 */

// Inject Sidebar CSS
(function initSidebarStyles() {
    document.head.insertAdjacentHTML('beforeend', `
    <style>
        #sidebar {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            height: 100vh !important;
        }
        .sidebar-nav-container {
            flex-grow: 1;
            overflow-y: auto;
            overflow-x: hidden;
        }
        .sidebar-nav-container::-webkit-scrollbar {
            width: 4px;
        }
        .sidebar-nav-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 4px;
        }
        .sidebar-footer {
            padding: 16px;
            background: rgba(0, 0, 0, 0.2);
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            position: relative;
            flex-shrink: 0;
            margin-top: auto;
            backdrop-filter: blur(5px);
        }
        .sidebar-user-trigger {
            outline: none !important;
            cursor: pointer;
            transition: opacity 0.2s ease;
        }
        .sidebar-user-trigger:hover {
            opacity: 0.85;
        }
        .sidebar-user-info {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
            flex-grow: 1;
        }
        .sidebar-user-avatar {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.4);
            overflow: hidden;
            flex-shrink: 0;
            background: white;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        .sidebar-user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .sidebar-user-details {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            min-width: 0;
            gap: 4px;
        }
        .sidebar-user-name {
            font-size: 0.9rem;
            font-weight: 700;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            letter-spacing: 0.3px;
        }
        .sidebar-user-role {
            font-size: 0.65rem;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .profile-caret {
            font-size: 1.2rem;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .sidebar-footer.show .profile-caret {
            transform: rotate(180deg);
        }
        .custom-sidebar-profile-menu {
            position: absolute !important;
            bottom: calc(100% + 10px) !important;
            left: 10px !important;
            width: calc(100% - 20px) !important;
            min-width: 200px !important;
            background: rgba(60, 5, 40, 0.95) !important; 
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            border-radius: 16px !important;
            padding: 8px !important;
            margin: 0 !important;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset !important;
            z-index: 1050 !important;
            transform-origin: bottom center;
            animation: profileMenuPop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes profileMenuPop {
            0% { opacity: 0; transform: translateY(10px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .custom-sidebar-profile-menu .dropdown-item {
            color: rgba(255, 255, 255, 0.85) !important;
            border-radius: 10px !important;
            margin: 2px 4px !important;
            font-size: 0.85rem !important;
            font-weight: 600 !important;
            padding: 8px 12px !important;
            transition: all 0.2s ease !important;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .custom-sidebar-profile-menu .dropdown-item i {
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.5) !important;
        }
        .custom-sidebar-profile-menu .dropdown-item:hover {
            background: rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
        }
        .custom-sidebar-profile-menu .dropdown-item:hover i {
            color: #ffffff !important;
        }
        .custom-sidebar-profile-menu .dropdown-item.text-danger:hover {
            background: #dc3545 !important;
            color: #ffffff !important;
        }
        .custom-sidebar-profile-menu .dropdown-item.text-danger:hover i {
            color: #ffffff !important;
        }

        /* Collapsed overrides */
        body.sidebar-collapsed .sidebar-user-details,
        body.sidebar-collapsed .profile-caret {
            display: none !important;
        }
        body.sidebar-collapsed .sidebar-footer {
            padding: 15px 0;
            display: flex;
            justify-content: center;
        }
        body.sidebar-collapsed .sidebar-user-trigger {
            display: flex !important;
            justify-content: center !important;
        }
        body.sidebar-collapsed .sidebar-user-info {
            justify-content: center;
        }
        body.sidebar-collapsed .custom-sidebar-profile-menu {
            position: fixed !important;
            left: 75px !important;
            bottom: 15px !important;
            width: 200px !important;
        }
    </style>
    `);
})();

function injectSidebar() {
    const sidebarContainer = document.getElementById('sidebar');
    if (!sidebarContainer) return;

    const items = window.SYSTEM_MODULES || [];
    const currentFileName = window.location.pathname.split('/').pop() || 'index.html';
    const logo = window.SYSTEM_LOGO || "/img/1.jpg";

    const navItems = items.map(item => {
        const isActive = currentFileName === item.href;
        return `
        ${item.sectionBefore ? `<div class="sidebar-section-title px-4 mt-3 mb-2 text-white-50 text-uppercase fw-bold" style="font-size: 0.7rem; letter-spacing: 1px;">${item.sectionBefore}</div>` : ''}
        <a class="nav-link ${isActive ? 'active' : ''}" href="/${item.href}" id="nav-${item.key}">
            <i class="fi ${item.icon}"></i> <span>${item.label}</span>
        </a>
    `}).join('');

    sidebarContainer.innerHTML = `
        <div class="sidebar-header" id="sidebar-logo-container">
            <a href="/index.html">
                <img src="${logo}" alt="Logo" id="sidebar-logo" onerror="this.closest('.sidebar-header').style.display='none'">
            </a>
        </div>
        <div class="sidebar-nav-container">
            <nav class="nav flex-column">${navItems}</nav>
        </div>
        <div class="sidebar-footer dropdown">
            <button class="sidebar-user-trigger w-100 border-0 bg-transparent text-start p-0 m-0 d-flex align-items-center justify-content-between" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <div class="sidebar-user-info">
                    <div class="sidebar-user-avatar">
                        <img id="sidebar-user-avatar" src="https://ui-avatars.com/api/?name=User&background=ff69b4&color=fff" alt="Profile">
                    </div>
                    <div class="sidebar-user-details">
                        <span class="sidebar-user-name" id="sidebar-user-name">User</span>
                        <span class="sidebar-user-role badge bg-warning text-dark fw-bold rounded-pill" id="sidebar-user-role" style="font-size: 0.65rem; padding: 2px 6px;">Admin</span>
                    </div>
                </div>
                <i class="fi fi-rr-angle-small-down profile-caret text-white-50"></i>
            </button>
            <div class="dropdown-menu custom-sidebar-profile-menu shadow-lg">
                <a class="dropdown-item py-2 d-flex align-items-center gap-2" href="/profile.html">
                    <i class="fi fi-rr-user text-muted"></i> My Profile
                </a>
                <a class="dropdown-item py-2 d-flex align-items-center gap-2" href="/settings.html">
                    <i class="fi fi-rr-settings text-muted"></i> Account Settings
                </a>
                <div class="dropdown-divider border-secondary" style="opacity: 0.15;"></div>
                <a class="dropdown-item py-2 d-flex align-items-center gap-2 text-danger fw-bold" href="#" onclick="handleLogout(event)">
                    <i class="fi fi-rr-sign-out-alt"></i> Log Out
                </a>
            </div>
        </div>
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

    const appendContainer = () => document.body.appendChild(container);
    if (document.body) {
        appendContainer();
    } else {
        document.addEventListener('DOMContentLoaded', appendContainer);
    }

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
