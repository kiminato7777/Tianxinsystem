/**
 * auth-check.js
 * Protects pages from unauthorized access.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Determine if we are on the login page
    const isLoginPage = window.location.pathname.endsWith("/login.html") || window.location.pathname.endsWith("/login") || window.location.pathname === "/";

    // Check for local file execution
    if (window.location.protocol === 'file:') {
        const warning = document.createElement('div');
        warning.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:#dc3545;color:white;text-align:center;padding:15px;z-index:99999;font-weight:bold;font-size:16px;box-shadow:0 2px 10px rgba(0,0,0,0.2);';
        warning.innerHTML = `
            ⛔ សូមកុំបើកឯកសារដោយផ្ទាល់ (Do not open files directly)!<br>
            ប្រព័ន្ធនេះត្រូវការដំណើរការលើ Server។ សូមដំណើរការ <code>start_server.cmd</code> ជាមុនសិន។<br>
            System requires a local server. Please run <code>start_server.cmd</code> first.
        `;
        document.body.appendChild(warning);
        return; // Stop execution
    }

    // Auto-redirect 127.0.0.1 to localhost to avoid Firebase OAuth errors
    if (window.location.hostname === '127.0.0.1') {
        window.location.hostname = 'localhost';
        return;
    }

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            if (isLoginPage) {
                console.log("Logged in user found on login page. Redirecting to dashboard...");
                window.location.href = "/index.html";
                return;
            }

            // UI Elements
            const nameEl = document.getElementById('user-display-name');
            const emailEl = document.getElementById('user-display-email');
            const roleEl = document.getElementById('user-role-badge');
            const imgContainer = document.getElementById('user-display-image-container');

            const adminEmail = window.ADMIN_EMAIL || 'admin@school.com';
            // Support multiple super admin emails (centralized in firebase-config.js)
            const superAdminEmails = window.SUPER_ADMIN_EMAILS || [adminEmail];
            const isSuperAdmin = superAdminEmails.includes(user.email);

            /**
             * applyPermissions
             * Hides sidebar links and redirects if user doesn't have access to the current page.
             */
            const applyPermissions = (perms, role) => {
                const isAdmin = role === 'admin' || isSuperAdmin;
                const modules = window.SYSTEM_MODULES || [];

                // 1. Build the permission object (p)
                const p = perms || {};
                
                // 2. Build the links mapping and page mapping
                const links = {};
                const pagePermissionMap = {};

                modules.forEach(m => {
                    const hasAccess = isAdmin || p[m.key] === true || p[m.key] === "true";
                    links[m.href] = hasAccess;
                    pagePermissionMap[m.href] = m.key;

                    // Handle sub-pages
                    if (m.key === 'data') {
                        links['dropout-students.html'] = isAdmin || p.dropoutStudents === true || p.dropoutStudents === "true";
                        links['paid-students.html'] = isAdmin || p.paidStudents === true || p.paidStudents === "true";
                        links['graduated-students.html'] = isAdmin || p.graduatedStudents === true || p.graduatedStudents === "true";
                    }
                });

                // 3. Apply Visibility to sidebar links
                // Use a broader selector to ensure we catch all nav-links
                document.querySelectorAll('.nav-link').forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && links.hasOwnProperty(href)) {
                        link.style.setProperty('display', links[href] ? 'block' : 'none', 'important');
                    } else if (isAdmin) {
                        // If it's an admin, show it even if not in modules (e.g. index.html)
                        link.style.setProperty('display', 'block', 'important');
                    }
                });

                // 4. Redirect if unauthorized
                const path = window.location.pathname;
                const currentPage = path.split('/').pop() || 'index.html';
                
                // Bypass redirect for admins
                if (isAdmin) return;

                // Check for sub-pages first
                const subpageKey = getSubpageKey(currentPage);
                if (subpageKey) {
                    if (!p[subpageKey]) {
                        window.location.href = "/index.html";
                    }
                    return;
                }

                const requiredPerm = pagePermissionMap[currentPage];
                if (requiredPerm && !p[requiredPerm]) {
                    const fallback = modules.find(m => p[m.key]);
                    if (fallback) window.location.href = fallback.href;
                    else {
                        // Try to find ANY permission before forcing logout
                        const anyPerm = Object.keys(p).find(k => p[k] === true);
                        if (!anyPerm) {
                             console.warn("No permissions found. Access denied.");
                             alert("គណនីរបស់អ្នកមិនមានសិទ្ធិប្រើប្រាស់ប្រព័ន្ធទេ។ សូមទាក់ទង Admin។");
                             firebase.auth().signOut();
                        } else {
                             window.location.href = "/index.html";
                        }
                    }
                }
            };
            
            const getSubpageKey = (page) => {
                if (page === 'dropout-students.html') return 'dropoutStudents';
                if (page === 'paid-students.html') return 'paidStudents';
                if (page === 'graduated-students.html') return 'graduatedStudents';
                return null;
            };

            // Function to set profile UI
            const setProfileUI = (name, email, imageUrl) => {
                if (nameEl) nameEl.textContent = name;
                if (emailEl) {
                    emailEl.textContent = email;
                    emailEl.title = email;
                }
                
                if (imgContainer) {
                    if (imageUrl && imageUrl !== 'undefined' && imageUrl !== 'null') {
                        imgContainer.innerHTML = `<img src="${imageUrl}" class="w-100 h-100" style="object-fit: cover;" onerror="this.src='/img/1.jpg'">`;
                    } else {
                        imgContainer.innerHTML = `<i class="fi fi-rr-user-circle text-primary fa-2x" id="user-display-placeholder"></i>`;
                    }
                }
            };

            // Store globally for refresh
            window.refreshSidebarPermissions = () => {
                if (isSuperAdmin) {
                    applyPermissions({}, 'admin');
                } else {
                    // Fetch from local state if available to avoid DB hit
                    const cached = localStorage.getItem('userPermissionsCache');
                    if (cached) {
                        try {
                            const { permissions, role } = JSON.parse(cached);
                            applyPermissions(permissions, role);
                        } catch(e) {}
                    }
                }
            };

            // Logic Flow
            // Logic Flow: Always fetch from database to sync profile info (name, image)
            // But permissions are still determined by isSuperAdmin
            firebase.database().ref('users/' + user.uid).on('value', snapshot => {
                const userData = snapshot.val() || {};

                // 1. Sync Profile UI
                const userRole = (userData.role || (isSuperAdmin ? 'admin' : 'staff')).toLowerCase();
                const isAdmin = userRole === 'admin' || isSuperAdmin;
                
                // Name Priority: DB Name > isSuperAdmin Hardcoded > Email Prefix
                const displayName = userData.name || (isSuperAdmin ? 'Admin (អ្នកគ្រប់គ្រង)' : user.email.split('@')[0]);
                setProfileUI(displayName, user.email, userData.imageUrl);

                // 2. Sync Role Badge
                if (roleEl) {
                    if (isAdmin) {
                        roleEl.textContent = 'Admin (អ្នកគ្រប់គ្រង)';
                        roleEl.className = 'badge bg-warning text-dark mt-1 fw-normal shadow-sm';
                    } else {
                        roleEl.textContent = 'Staff (បុគ្លិក)';
                        roleEl.className = 'badge bg-info mt-1 fw-normal';
                    }
                }

                // 3. Cache and Apply Permissions
                localStorage.setItem('userPermissionsCache', JSON.stringify({
                    permissions: userData.permissions || {},
                    role: userRole
                }));

                applyPermissions(userData.permissions, userRole);

            }, err => {
                console.error("Error fetching user data:", err);
                // Fallback for permission denied
                if (isSuperAdmin) {
                    setProfileUI('Admin (អ្នកគ្រប់គ្រង)', user.email, null);
                    applyPermissions({}, 'admin');
                }
            });
        } else {
            console.log("Auth state initialized: No user found.");
            if (!isLoginPage) {
                console.log("Redirecting to login page...");
                window.location.href = "/login.html";
            }
        }
    });
});

/**
 * Handle Logout
 * Signs out the updated user and redirects to login page.
 */
function handleLogout(event) {
    if (event) event.preventDefault();

    if (confirm("តើអ្នកពិតជាចង់ចាកចេញមែនទេ?")) {
        firebase.auth().signOut().then(() => {
            console.log("User signed out.");
            window.location.href = "/login.html";
        }).catch((error) => {
            console.error("Logout Error:", error);
            alert("មានបញ្ហាក្នុងការចាកចេញ។");
        });
    }
}
