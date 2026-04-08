/**
 * user-management.js
 * Handles user creation, listing, and permission management.
 */

const usersRef = firebase.database().ref('users');

let currentViewedPassword = '';

// Global Image State
let newUserImageFile = null;
let editUserImageFile = null;
let currentEditUserImageUrl = '';

// Store the currently logged-in creator name globally
window._currentCreatorName = 'Unknown';
window._currentCreatorEmail = '';

// Capture creator info once auth state is known
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        const adminEmail = window.ADMIN_EMAIL || 'admin@school.com';
        const superAdminEmails = window.SUPER_ADMIN_EMAILS || [adminEmail];
        if (superAdminEmails.includes(user.email)) {
            window._currentCreatorName = 'Admin (អ្នកគ្រប់គ្រង)';
            window._currentCreatorEmail = user.email;
        } else {
            window._currentCreatorEmail = user.email;
            // Try to get name from database
            firebase.database().ref('users/' + user.uid + '/name').once('value').then(snap => {
                window._currentCreatorName = snap.val() || user.email.split('@')[0];
            }).catch(() => {
                window._currentCreatorName = user.email.split('@')[0];
            });
        }
    }
});

// --- DYNAMIC PERMISSION CONFIGURATION ---
// Derived from centralized window.SYSTEM_MODULES in firebase-config.js
const PERMISSION_CONFIG = window.SYSTEM_MODULES || [];

document.addEventListener('DOMContentLoaded', () => {
    // Generate Permission Cards
    renderPermissionCards('createPermissionContainer', 'perm');
    renderPermissionCards('editPermissionContainer', 'editPerm');

    loadUsers();

    // Role Change Listener to auto-toggle permissions
    const newUserRole = document.getElementById('newUserRole');
    if (newUserRole) {
        newUserRole.addEventListener('change', (e) => handleRolePermissionLock(e.target.value, 'perm'));
    }

    const editUserRole = document.getElementById('editUserRole');
    if (editUserRole) {
        editUserRole.addEventListener('change', (e) => handleRolePermissionLock(e.target.value, 'editPerm'));
    }

    // Modals are initialized on demand using getOrCreateInstance


    firebase.auth().onAuthStateChanged(user => {
        const adminEmail = window.ADMIN_EMAIL || 'admin@school.com';
        const superAdminEmails = window.SUPER_ADMIN_EMAILS || [adminEmail];
        if (!user || !superAdminEmails.includes(user.email)) {
            // Handled by auth-check.js
        }
    });

    // Handle Create User Form
    const createUserForm = document.getElementById('createUserForm');
    if (createUserForm) {
        createUserForm.addEventListener('submit', handleCreateUser);
    }

    // Handle Edit User Form
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', handleUpdateUser);
    }

    // Image Upload Listeners
    setupImageUpload('newUserImageInput', 'newUserImagePreview', (file) => newUserImageFile = file);
    setupImageUpload('editUserImageInput', 'editUserImagePreview', (file) => editUserImageFile = file);
});

function setupImageUpload(inputId, previewId, callback) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            callback(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" class="w-100 h-100" style="object-fit: cover;">`;
            };
            reader.readAsDataURL(file);
        }
    });
}

/**
 * Dynamically renders permission cards into a container
 */
function renderPermissionCards(containerId, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = PERMISSION_CONFIG.map(p => `
        <div class="permission-card p-2 border rounded-3 d-flex align-items-center justify-content-between hover-shadow-sm transition-all flex-shrink-0"
             style="min-width: 140px; cursor: pointer; background: white;"
             onclick="document.getElementById('${prefix}${capitalize(p.key)}').click()">
            <div class="d-flex align-items-center">
                <i class="${p.icon} ${p.colorClass} fs-5 me-2"></i>
                <span class="fw-bold text-dark small">${p.label}</span>
            </div>
            <div class="form-check form-switch pointer-events-none ms-2">
                <input class="form-check-input" type="checkbox" id="${prefix}${capitalize(p.key)}" ${p.defaultChecked && prefix === 'perm' ? 'checked' : ''}>
            </div>
        </div>
    `).join('');
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Helper to safely get Bootstrap Modal instance
 */
function getModalInstance(id) {
    const el = document.getElementById(id);
    if (el && typeof bootstrap !== 'undefined') {
        return bootstrap.Modal.getOrCreateInstance(el);
    }
    return null;
}

/**
 * Automatically checks and disables/enables permission checkboxes based on role
 */
function handleRolePermissionLock(role, prefix) {
    const isAdmin = role === 'admin';
    PERMISSION_CONFIG.forEach(config => {
        const el = document.getElementById(`${prefix}${capitalize(config.key)}`);
        if (el) {
            if (isAdmin) {
                el.checked = true;
                el.disabled = true;
                // Add a visual indicator that it's locked
                el.closest('.permission-card').style.opacity = '0.7';
                el.closest('.permission-card').style.cursor = 'not-allowed';
            } else {
                el.disabled = false;
                el.closest('.permission-card').style.opacity = '1';
                el.closest('.permission-card').style.cursor = 'pointer';
            }
        }
    });
}

/**
 * Loads and displays users from Firebase Realtime Database
 */
/**
 * Loads and displays users from Firebase Realtime Database
 */
function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    const countBadge = document.getElementById('userCountBadge');

    // Show Modern Skeleton Loader
    tbody.innerHTML = `
        <tr><td colspan="6"><div class="skeleton-row"></div></td></tr>
        <tr><td colspan="6"><div class="skeleton-row"></div></td></tr>
        <tr><td colspan="6"><div class="skeleton-row"></div></td></tr>
    `;

    usersRef.on('value', snapshot => {
        const users = snapshot.val() || {};
        tbody.innerHTML = '';

        // Convert object to array for easier manipulation
        let userArray = [];
        const adminEmail = window.ADMIN_EMAIL || 'admin@school.com';
        const superAdminEmails = window.SUPER_ADMIN_EMAILS || [adminEmail];
        let adminFound = false;

        if (users) {
            userArray = Object.keys(users).map(key => {
                const u = users[key];
                // Skip if null (happens if data is array-like with gaps)
                if (!u) return null;

                if (superAdminEmails.includes(u.email)) adminFound = true;
                return { uid: key, ...u };
            }).filter(u => u !== null);
        }

        // If generic admin not found in DB, add virtual one for display
        if (!adminFound) {
            userArray.unshift({
                uid: 'virtual_system_admin',
                name: 'Admin (អ្នកគ្រប់គ្រង)',
                email: adminEmail,
                role: 'admin',
                permissions: { dashboard: true, registration: true, data: true, inventory: true, incomeExpense: true, staffManagement: true, teacherPortal: true, studentCard: true, userManagement: true },
                createdAt: new Date().toISOString(),
                isVirtual: true
            });
        }

        if (userArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">មិនទាន់មានអ្នកប្រើប្រាស់នៅឡើយ</td></tr>';
            if (countBadge) countBadge.textContent = '0 Users';
            return;
        }

        const uniqueRoles = new Set(['admin', 'staff']); // Default roles
        let totalUsers = userArray.length;

        // Sort: Super Admins first, then by name
        userArray.sort((a, b) => {
            if (superAdminEmails.includes(a.email)) return -1;
            if (superAdminEmails.includes(b.email)) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        userArray.forEach(user => {
            const key = user.uid;
            if (user.role) uniqueRoles.add(user.role.toLowerCase());

            const userEmail = (user.email && user.email !== 'undefined' && user.email !== 'null') ? user.email : 'N/A';
            const isTargetAdmin = superAdminEmails.includes(userEmail);
            const userRole = (user.role && user.role !== 'undefined' && user.role !== 'null') ? user.role : (isTargetAdmin ? 'admin' : 'staff');
            const userName = isTargetAdmin ? 'Admin (អ្នកគ្រប់គ្រង)' : ((user.name && user.name !== 'undefined' && user.name !== 'null') ? user.name : '-');

            // Encode permissions to pass to function safely (escape quotes)
            const permsJson = JSON.stringify(user.permissions || {}).replace(/"/g, '&quot;');
            // Also pass other data for VIEW function
            const userJson = JSON.stringify(user).replace(/"/g, '&quot;');

            const permissionsBadges = getPermissionBadgesJSON(user.permissions, userRole);

            // Role Badge Logics
            let roleBadgeClass = 'bg-info';
            let roleLabel = userRole;
            if (isTargetAdmin) {
                roleBadgeClass = 'bg-dark border border-warning text-warning';
                roleLabel = 'Super Admin';
            } else if (userRole === 'admin') {
                roleBadgeClass = 'bg-warning text-dark';
                roleLabel = 'Admin';
            } else if (userRole === 'staff') {
                roleBadgeClass = 'bg-primary';
                roleLabel = 'Staff';
            } else {
                roleBadgeClass = 'bg-secondary'; // Custom roles
                roleLabel = capitalize(userRole);
            }

            const tr = document.createElement('tr');
            if (isTargetAdmin) tr.className = 'table-light-primary';

            // Allow Edit only if not Super Admin and not virtual
            // UPDATE: Allow Edit for everyone now to support Image Upload for Admin too
            const editButton = (!user.isVirtual) ? `
                <button class="btn btn-sm btn-outline-warning me-2 shadow-sm" onclick='openEditModal("${key}", "${userName}", "${userEmail}", ${permsJson}, "${userRole}")'>
                    <i class="fi fi-rr-edit"></i> កែប្រែ
                </button>` : `
                <button class="btn btn-sm btn-outline-warning me-2 shadow-sm" onclick='createRealAdminFromVirtual("${userEmail}")'>
                    <i class="fi fi-rr-user-add"></i> បង្កើតគណនីពិត
                </button>`;

            const resetPassButton = (!isTargetAdmin && !user.isVirtual && userEmail !== 'N/A') ? `
                <button class="btn btn-sm btn-outline-primary me-2 shadow-sm" onclick="sendResetPasswordEmail('${userEmail}')" title="Send Password Reset Email">
                    <i class="fi fi-rr-key"></i> Reset Pass
                </button>` : ``;

            // Delete logic
            const deleteButton = (!isTargetAdmin && !user.isVirtual) ? `
                <button class="btn btn-sm btn-outline-danger shadow-sm" onclick="deleteUser('${key}', '${userEmail}')">
                    <i class="fi fi-rr-trash"></i> លុប
                </button>
            ` : (isTargetAdmin ? '<span class="badge bg-dark text-warning border border-warning ms-1"><i class="fi fi-rr-shield-check me-1"></i>Protected Admin</span>' : '');

            // Last login display logic
            let lastLoginStr = 'Never';
            if (user.lastLogin && user.lastLogin !== 'undefined' && user.lastLogin !== 'null') {
                try {
                    const date = new Date(user.lastLogin);
                    if (!isNaN(date.getTime())) {
                        lastLoginStr = date.toLocaleDateString();
                    }
                } catch (e) {
                    lastLoginStr = 'Invalid Date';
                }
            }

            // CreatedBy display
            const createdByDisplay = user.isVirtual
                ? '<span class="text-muted fst-italic small">System</span>'
                : (user.createdBy && user.createdBy !== 'undefined'
                    ? `<span class="fw-bold text-dark small">${user.createdBy}</span>${user.createdByEmail ? `<div class="text-muted" style="font-size:0.7rem;">${user.createdByEmail}</div>` : ''}`
                    : '<span class="text-muted fst-italic small">—</span>');

            tr.innerHTML = `
                <td class="ps-4">
                    <div class="d-flex align-items-center gap-3">
                        ${user.imageUrl ? 
                            `<div class="bg-white rounded-circle d-inline-flex align-items-center justify-content-center shadow-sm border" style="width: 50px; height: 50px; min-width: 50px; overflow: hidden;">
                                <img src="${user.imageUrl}" class="w-100 h-100" style="object-fit: cover;">
                             </div>` : 
                            `<div class="bg-white rounded-circle d-inline-flex align-items-center justify-content-center mb-2 shadow-sm" style="width: 50px; height: 50px;">
                                <i class="fi fi-rr-user-circle text-primary fa-2x"></i>
                             </div>`
                        }
                        <div>
                            <div class="fw-bold text-dark">${userName}</div>
                            ${user.isVirtual ? '<span class="badge bg-warning-subtle text-warning font-size-xs px-2 py-1">Virtual</span>' : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="text-primary fw-bold">${userEmail}</div>
                    <div class="text-muted small" style="font-size: 0.75rem;">
                        <i class="fi fi-rr-clock me-1"></i>Last: ${lastLoginStr}
                    </div>
                </td>
                <td><span class="badge ${roleBadgeClass} text-uppercase shadow-sm px-3">${roleLabel}</span></td>
                <td>${permissionsBadges}</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <input type="password" class="form-control form-control-sm border-0 bg-light text-center fw-bold" 
                            value="${user.password && user.password !== 'undefined' && user.password !== 'null' ? user.password : "NoPassword"}" readonly id="pass-${key}" 
                            style="width: 100px; font-size: 0.85rem; border-radius: 6px; ${!user.password ? 'color: #ccc;' : ''}">
                        ${user.password && user.password !== 'undefined' && user.password !== 'null' ? `
                            <button class="btn btn-sm btn-link text-decoration-none p-0 text-muted" 
                                onclick="toggleTablePassword('${key}', this)" title="បង្ហាញ/លាក់">
                                <i class="fi fi-rr-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-link text-decoration-none p-0 text-info" 
                                onclick="copyToClipboard('${user.password}')" title="ចម្លង">
                                <i class="fi fi-rr-copy"></i>
                            </button>
                        ` : `
                            <span class="badge bg-light text-muted border small" style="font-size: 0.65rem;" title="សូម Edit រួចដាក់ Password ថ្មីដើម្បីមើលបាន">តម្រូវឱ្យកែប្រែ</span>
                        `}
                    </div>
                </td>
                <td>${createdByDisplay}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-info me-2 shadow-sm" onclick='openViewModal("${key}", ${userJson})' title="View Details">
                        <i class="fi fi-rr-eye"></i> មើល
                    </button>
                    ${resetPassButton}
                    ${editButton}
                    ${deleteButton}
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (countBadge) countBadge.textContent = `${totalUsers} Users`;

        // Update Dropdowns with collected roles
        updateRoleDropdowns(Array.from(uniqueRoles));

        // Update footer time
        const lastUpdateEl = document.getElementById('last-update-time');
        if (lastUpdateEl) {
            lastUpdateEl.textContent = new Date().toLocaleString('en-GB');
        }

        // Re-apply filter if search input has value
        filterUsers();
    }, err => {
        console.error("Error loading users:", err);
        const tbody = document.getElementById('usersTableBody');
        if (tbody && err.message && err.message.includes("permission_denied")) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-danger"><i class="fi fi-rr-ban me-2"></i> អ្នកមិនមានសិទ្ធមើលបញ្ជីអ្នកប្រើប្រាស់ទេ (Permission Denied)</td></tr>';
        }
    });
}

/**
 * Filter users based on search input (Optimized with Debounce for speed)
 */
let searchTimeout;
function filterUsers() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const input = document.getElementById('searchInput');
        const filter = input.value.toLowerCase();
        const table = document.getElementById('usersTable');
        const tr = table.getElementsByTagName('tr');

        // Start from 1 to skip header
        for (let i = 1; i < tr.length; i++) {
            // Efficiency: skip if it's a skeleton or empty row
            if (tr[i].classList.contains('no-result')) continue;

            const tdName = tr[i].getElementsByTagName('td')[0];
            const tdEmail = tr[i].getElementsByTagName('td')[1];

            if (tdName || tdEmail) {
                const txtName = tdName.textContent || tdName.innerText;
                const txtEmail = tdEmail.textContent || tdEmail.innerText;

                if (txtName.toLowerCase().indexOf(filter) > -1 || txtEmail.toLowerCase().indexOf(filter) > -1) {
                    tr[i].style.display = "";
                } else {
                    tr[i].style.display = "none";
                }
            }
        }
    }, 150); // 150ms delay for smoothness
}

function updateRoleDropdowns(roles) {
    const selects = ['newUserRole', 'editUserRole'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        const currentVal = select.value;
        // Keep "admin" and "staff" at top, then sort others
        const sortedRoles = roles.sort((a, b) => {
            if (a === 'admin') return -1;
            if (b === 'admin') return 1;
            if (a === 'staff') return -1;
            if (b === 'staff') return 1;
            return a.localeCompare(b);
        });

        select.innerHTML = sortedRoles.map(r =>
            `<option value="${r}" ${r === 'staff' ? 'selected' : ''}>${r.charAt(0).toUpperCase() + r.slice(1)}</option>`
        ).join('');

        // Restore previous selection if still exists, otherwise default
        if (roles.includes(currentVal)) {
            select.value = currentVal;
        }
    });
}

function promptNewRole(selectId) {
    const roleName = prompt("សូមបញ្ចូលឈ្មោះតួនាទីថ្មី (Enter new Role name):");
    if (roleName && roleName.trim() !== "") {
        const cleanRole = roleName.trim().toLowerCase();
        const select = document.getElementById(selectId);

        // Check if exists
        let exists = false;
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === cleanRole) {
                exists = true;
                select.options[i].selected = true;
                break;
            }
        }

        if (!exists) {
            const option = document.createElement("option");
            option.value = cleanRole;
            option.text = cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1) + " (New)";
            option.selected = true;
            select.add(option);
        }
    }
}

function getPermissionBadgesJSON(perms, role) {
    const isAdmin = role === 'admin';
    if (!perms && !isAdmin) return '<span class="text-muted small">មិនទាន់មានសិទ្ធិ</span>';

    const activePerms = PERMISSION_CONFIG.filter(p => isAdmin || (perms && (perms[p.key] === true || perms[p.key] === 'true')));
    const maxVisible = 2;

    let html = activePerms.slice(0, maxVisible).map(p =>
        `<span class="badge ${p.badgeColor} me-1 mb-1 shadow-sm" style="font-size: 0.75rem;">${p.label}</span>`
    ).join('');

    if (activePerms.length > maxVisible) {
        html += `<span class="badge bg-secondary me-1 mb-1 shadow-sm" style="font-size: 0.75rem;">+${activePerms.length - maxVisible} ទៀត</span>`;
    }

    return html || '<span class="text-muted small">មិនទាន់មានសិទ្ធិ</span>';
}

/**
 * Opens the Edit Modal and populates data
 */
function openEditModal(uid, name, email, perms, role) {
    document.getElementById('editUserUid').value = uid || '';
    document.getElementById('editUserName').value = name || '';
    document.getElementById('editUserEmail').value = email || '';
    document.getElementById('editUserRole').value = role || 'staff';
    document.getElementById('editUserPassword').value = ''; // Reset password field
    
    // Reset image state
    editUserImageFile = null;
    currentEditUserImageUrl = '';
    const preview = document.getElementById('editUserImagePreview');
    
    firebase.database().ref(`users/${uid}/imageUrl`).once('value').then(snap => {
        const url = snap.val();
        currentEditUserImageUrl = url || '';
        if (url) {
            preview.innerHTML = `<img src="${url}" class="w-100 h-100" style="object-fit: cover;">`;
        } else {
            preview.innerHTML = `<i class="fi fi-rr-user-circle text-primary" style="font-size: 5rem;"></i>`;
        }
    });

    // Set checkboxes dynamically
    const p = (perms && typeof perms === 'string') ? JSON.parse(perms) : (perms || {});

    PERMISSION_CONFIG.forEach(config => {
        const el = document.getElementById(`editPerm${capitalize(config.key)}`);
        if (el) el.checked = !!p[config.key];
    });

    const modal = getModalInstance('editUserModal');
    if (modal) {
        modal.show();
        // After showing, handle locks
        handleRolePermissionLock(role, 'editPerm');
    }
}

/**
 * Opens the View Modal to show full details
 */
function openViewModal(uid, user) {
    if (!user) return;
    // Populate Modal
    document.getElementById('viewUserName').textContent = user.name || 'Unknown Name';
    document.getElementById('viewUserEmail').textContent = user.email || 'N/A';

    // Show Image
    const imgContainer = document.getElementById('viewUserImageContainer');
    if (imgContainer) {
        if (user.imageUrl) {
            imgContainer.innerHTML = `<img src="${user.imageUrl}" class="w-100 h-100" style="object-fit: cover;">`;
        } else {
            imgContainer.innerHTML = `<i class="fi fi-rr-user text-secondary" style="font-size: 3rem;"></i>`;
        }
    }

    // Setup Password View
    currentViewedPassword = (user.password && user.password !== 'undefined') ? user.password : '******';
    const passDisplay = document.getElementById('viewUserPassword');
    passDisplay.textContent = '******';
    passDisplay.dataset.visible = 'false';
    const toggleIcon = document.querySelector('#btnToggleViewPass i');
    if (toggleIcon) toggleIcon.className = 'fi fi-rr-eye';

    // Role Badge
    const roleEl = document.getElementById('viewUserRole');
    if (roleEl) {
        roleEl.textContent = capitalize(user.role || 'staff');
        roleEl.className = 'badge px-3 py-2 rounded-pill shadow-sm ' +
            (user.role === 'admin' ? 'bg-warning text-dark' : 'bg-primary');
    }

    // Dates
    const createdDate = (user.createdAt && user.createdAt !== 'undefined') ? new Date(user.createdAt).toLocaleDateString() + ' ' + new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
    const lastLoginDate = (user.lastLogin && user.lastLogin !== 'undefined') ? new Date(user.lastLogin).toLocaleDateString() + ' ' + new Date(user.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never';

    document.getElementById('viewUserCreated').textContent = createdDate;
    document.getElementById('viewUserLastLogin').textContent = lastLoginDate;

    // Created By
    const createdByEl = document.getElementById('viewUserCreatedBy');
    if (createdByEl) {
        if (user.createdBy && user.createdBy !== 'undefined') {
            createdByEl.textContent = user.createdBy + (user.createdByEmail ? ` (${user.createdByEmail})` : '');
        } else if (user.isVirtual) {
            createdByEl.textContent = 'System';
        } else {
            createdByEl.textContent = '— មិនមានព័ត៌មាន';
        }
    }

    // Permissions
    const permContainer = document.getElementById('viewUserPermissions');
    if (permContainer) {
        permContainer.innerHTML = '';

        const isAdmin = user.role === 'admin';
        PERMISSION_CONFIG.forEach(p => {
            if (isAdmin || (user.permissions && (user.permissions[p.key] === true || user.permissions[p.key] === 'true'))) {
                const badge = document.createElement('div');
                badge.className = `badge ${p.badgeColor} py-2 px-3 rounded-pill d-flex align-items-center mb-1`;
                badge.innerHTML = `<i class="${p.icon} me-2"></i> ${p.label}`;
                permContainer.appendChild(badge);
            }
        });

        // If no permissions found but object exists (edge case)
        if (permContainer.children.length === 0) {
            permContainer.innerHTML = '<span class="text-muted fst-italic">No active permissions</span>';
        }
    }

    const modal = getModalInstance('viewUserModal');
    if (modal) modal.show();
}

/**
 * Update User Permissions
 */
function handleUpdateUser(e) {
    e.preventDefault();

    const uid = document.getElementById('editUserUid').value;
    const name = document.getElementById('editUserName').value.trim();
    const role = document.getElementById('editUserRole').value;
    const newPassword = document.getElementById('editUserPassword').value;

    const permissions = {};
    PERMISSION_CONFIG.forEach(config => {
        const el = document.getElementById(`editPerm${capitalize(config.key)}`);
        permissions[config.key] = el ? el.checked : false;
    });

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fi fi-rr-refresh fa-spin"></i> កំពុងរក្សាទុក...';
    btn.disabled = true;

    // Base update data
    const updateData = {
        name: name,
        role: role,
        permissions: permissions
    };

    const handleActualSave = async () => {
        try {
            // Upload image if selected
            if (editUserImageFile) {
                const url = await uploadImageToR2(editUserImageFile, `user_${name}`, "Teacher");
                if (url) updateData.imageUrl = url;
            }

            await usersRef.child(uid).update(updateData);
            showAlertPremium("✅ ទិន្នន័យត្រូវបានកែប្រែជោគជ័យ!", 'success');
            const modal = getModalInstance('editUserModal');
            if (modal) modal.hide();
        } catch (error) {
            showAlertPremium("❌ បរាជ័យ: " + error.message, 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    // Also update password if provided
    if (newPassword) {
        updateData.password = newPassword;
    }

    handleActualSave();
    return; // Stop the old .then logic
}

/**
 * Creates a new user using a secondary Firebase App instance.
 */
function handleCreateUser(e) {
    e.preventDefault();

    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;

    const permissions = {};
    PERMISSION_CONFIG.forEach(config => {
        const el = document.getElementById(`perm${capitalize(config.key)}`);
        permissions[config.key] = el ? el.checked : false;
    });

    if (!name || !email || !password) return showAlertPremium("សូមបញ្ចូលឈ្មោះ អ៊ីមែល និងពាក្យសម្ងាត់!", 'error');

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fi fi-rr-refresh fa-spin"></i> កំពុងបង្កើត...';
    btn.disabled = true;

    // Use a secondary app to create user - Check if exists first to avoid duplicate app error
    let secondaryApp;
    try {
        secondaryApp = firebase.app("SecondaryApp");
    } catch (e) {
        secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryApp");
    }

    secondaryApp.auth().createUserWithEmailAndPassword(email, password)
        .then(async (userCredential) => {
            const uid = userCredential.user.uid;
            
            let imageUrl = '';
            if (newUserImageFile) {
                imageUrl = await uploadImageToR2(newUserImageFile, `user_${name}`, "Teacher");
            }

            return usersRef.child(uid).set({
                name: name,
                email: email,
                password: password, // Store password to allow admin viewing
                role: role,
                imageUrl: imageUrl,
                permissions: permissions,
                createdAt: new Date().toISOString(),
                createdBy: window._currentCreatorName || 'Unknown',
                createdByEmail: window._currentCreatorEmail || ''
            });
        })
        .then(() => {
            showAlertPremium("✅ បង្កើតអ្នកប្រើប្រាស់ជោគជ័យ!", 'success');
            document.getElementById('createUserForm').reset();

            // Reset checkboxes
            PERMISSION_CONFIG.forEach(config => {
                const el = document.getElementById(`perm${capitalize(config.key)}`);
                if (el) el.checked = !!config.defaultChecked;
            });

            const modal = getModalInstance('addUserModal');
            if (modal) modal.hide();
            secondaryApp.delete();
        })
        .catch((error) => {
            console.error(error);
            showAlertPremium("❌ បរាជ័យ: " + error.message, 'error');
            secondaryApp.delete();
        })
        .finally(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
}

function deleteUser(uid, email) {
    const superAdminEmails = window.SUPER_ADMIN_EMAILS || [window.ADMIN_EMAIL || 'admin@school.com'];
    
    if (superAdminEmails.includes(email)) {
        return showAlertPremium("❌ កំហុស៖ អ្នកមិនអាចលុបគណនី Super Admin (IT-DEV) បានទេ!", 'error');
    }
    
    if (confirm(`តើអ្នកពិតជាចង់លុបអ្នកប្រើប្រាស់ ${email} ពីប្រព័ន្ធមែនទេ? \n(ចំណាំ៖ វានឹងលុបតែទិន្នន័យពី Database ហើយគណនីនេះនឹងមិនអាចចូលប្រើប្រាស់បានទៀតទេ ដោយសារប្រព័ន្ធនឹង Block ដោយស្វ័យប្រវត្តិ)`)) {
        usersRef.child(uid).remove()
            .then(() => showAlertPremium("✅ បានលុបនិងបិទគណនីជោគជ័យ。", 'success'))
            .catch(err => showAlertPremium("កំហុស៖ " + err.message, 'error'));
    }
}

function sendResetPasswordEmail(email) {
    if (confirm(`តើអ្នកចង់ផ្ញើអ៊ីមែលសម្រាប់កំណត់ពាក្យសម្ងាត់ថ្មីទៅកាន់ ${email} មែនទេ?`)) {
        firebase.auth().sendPasswordResetEmail(email)
            .then(() => {
                showAlertPremium("✅ អ៊ីមែលត្រូវបានផ្ញើជោគជ័យ! សូមពិនិត្យមើលប្រអប់សំបុត្រ។", 'success');
            })
            .catch((error) => {
                console.error(error);
                showAlertPremium("❌ បរាជ័យ: " + error.message, 'error');
            });
    }
}

// Helper to toggle password outside DOMContentLoaded to be global
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === "password") {
        input.type = "text";
        icon.className = "fi fi-rr-eye-crossed";
    } else {
        input.type = "password";
        icon.className = "fi fi-rr-eye";
    }
}

function toggleTablePassword(key, btn) {
    const input = document.getElementById(`pass-${key}`);
    const icon = btn.querySelector('i');
    if (input.type === "password") {
        input.type = "text";
        icon.className = "fi fi-rr-eye-crossed";
    } else {
        input.type = "password";
        icon.className = "fi fi-rr-eye";
    }
}

function copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        showAlertPremium("✅ បានចម្លងពាក្យសម្ងាត់រួចរាល់!", 'success');
    });
}

function toggleViewPass() {
    const passDisplay = document.getElementById('viewUserPassword');
    const icon = document.querySelector('#btnToggleViewPass i');
    const isVisible = passDisplay.dataset.visible === 'true';

    if (isVisible) {
        passDisplay.textContent = '******';
        passDisplay.dataset.visible = 'false';
        icon.className = 'fi fi-rr-eye';
    } else {
        passDisplay.textContent = currentViewedPassword;
        passDisplay.dataset.visible = 'true';
        icon.className = 'fi fi-rr-eye-crossed';
    }
}

function copyViewPass() {
    copyToClipboard(currentViewedPassword);
}



