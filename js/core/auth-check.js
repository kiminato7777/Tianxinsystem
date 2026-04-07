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
            const setProfileUI = (name, email) => {
                if (nameEl) nameEl.textContent = name;
                if (emailEl) {
                    emailEl.textContent = email;
                    emailEl.title = email;
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
            if (isSuperAdmin) {
                setProfileUI('Admin (អ្នកគ្រប់គ្រង)', user.email);
                if (roleEl) {
                    roleEl.textContent = 'Admin (អ្នកគ្រប់គ្រង)';
                    roleEl.className = 'badge bg-dark border border-warning text-warning mt-1 fw-normal shadow-sm';
                }
                // Admin gets everything
                applyPermissions({}, 'admin');
            } else {
                firebase.database().ref('users/' + user.uid).on('value', snapshot => {
                    const userData = snapshot.val();

                    if (!userData) {
                        // User exists in Auth but NOT in Database
                        // This happens when: (1) user just created but DB write failed
                        // or (2) user was deleted from DB by admin
                        // Strategy: give them BASIC staff access to dashboard only,
                        // so they are not permanently locked out from a rules issue
                        console.warn("⚠️ User exists in Auth but NOT in Database. Granting basic fallback access.");
                        setProfileUI(user.email.split('@')[0], user.email);
                        if (roleEl) {
                            roleEl.textContent = 'Staff (Limited)';
                            roleEl.className = 'badge bg-secondary mt-1 fw-normal';
                        }
                        // Give basic dashboard access as fallback
                        applyPermissions({ dashboard: true, registration: true, data: true }, 'staff');
                        return;
                    }

                    // Cache permissions for sidebar refresh
                    localStorage.setItem('userPermissionsCache', JSON.stringify({
                        permissions: userData.permissions,
                        role: userData.role
                    }));

                    const userRole = (userData.role || 'staff').toLowerCase();
                    const isAdmin = userRole === 'admin';
                    const displayName = isAdmin ? 'Admin (អ្នកគ្រប់គ្រង)' : (userData.name ? userData.name : user.email.split('@')[0]);
                    setProfileUI(displayName, user.email);

                    // Dynamic Role Badge
                    if (roleEl) {
                        const userRole = (userData.role || 'staff').toLowerCase();
                        if (userRole === 'admin') {
                            roleEl.textContent = 'Admin (អ្នកគ្រប់គ្រង)';
                            roleEl.className = 'badge bg-warning text-dark mt-1 fw-normal';
                        } else {
                            roleEl.textContent = 'Staff (បុគ្គលិក)';
                            roleEl.className = 'badge bg-info mt-1 fw-normal';
                        }
                    }

                    applyPermissions(userData.permissions, userData.role);
                }, err => {
                    console.error("Error fetching user data:", err);
                    
                    // IF PERMISSION DENIED -> The rules are blocking this user from reading their own profile
                    // Instead of signing them out, give basic fallback access and log the issue
                    if (err.message && err.message.includes("permission_denied")) {
                        console.warn("🚨 Firebase Rules blocked profile read. Attempting graceful fallback...");
                        // Try localStorage cache first
                        const cached = localStorage.getItem('userPermissionsCache');
                        if (cached) {
                            try {
                                const { permissions, role } = JSON.parse(cached);
                                console.log("✅ Using cached permissions as fallback.");
                                setProfileUI(user.email.split('@')[0], user.email);
                                if (roleEl) {
                                    roleEl.textContent = role === 'admin' ? 'Admin' : 'Staff';
                                    roleEl.className = role === 'admin' 
                                        ? 'badge bg-warning text-dark mt-1 fw-normal'
                                        : 'badge bg-info mt-1 fw-normal';
                                }
                                applyPermissions(permissions, role);
                                return;
                            } catch(e) {
                                console.warn("Cache parse failed:", e);
                            }
                        }
                        // Final fallback: give basic access so user is not permanently locked
                        console.warn("⚠️ No cache found. Giving minimal fallback access.");
                        setProfileUI(user.email.split('@')[0], user.email);
                        if (roleEl) {
                            roleEl.textContent = 'Staff (Limited)';
                            roleEl.className = 'badge bg-secondary mt-1 fw-normal';
                        }
                        applyPermissions({ dashboard: true, registration: true, data: true }, 'staff');
                    }
                });
            }

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
