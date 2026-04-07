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
                <div class="bg-white rounded-circle d-inline-flex align-items-center justify-content-center mb-2 shadow-sm"
                    style="width: 50px; height: 50px;">
                    <i class="fi fi-rr-user-circle text-primary fa-2x"></i>
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
