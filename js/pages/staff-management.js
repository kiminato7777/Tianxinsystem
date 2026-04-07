/**
 * Staff Management System
 * Handles CRUD operations for staff members
 */

let staffData = {};
let currentStaffId = null;
let masterStudyTimes = [];
let masterLevels = [];
let masterClasses = []; // Homeroom Classes
let masterClassrooms = []; // Study Rooms

/**
 * Cambodian Mobile Network Prefix Detection
 */
function getCarrierName(phone) {
    if (!phone || phone === 'មិនមាន') return '';
    const cleanPhone = phone.toString().replace(/\D/g, '');
    if (!cleanPhone) return '';
    let p = cleanPhone;
    if (p.startsWith('855')) p = '0' + p.substring(3);
    if (!p.startsWith('0')) p = '0' + p;
    const prefix = p.substring(0, 3);
    const carrierMapping = {
        'Smart': ['010', '015', '016', '069', '070', '081', '086', '087', '093', '096', '098'],
        'Cellcard': ['011', '012', '014', '017', '061', '076', '077', '078', '079', '085', '089', '092', '095', '099'],
        'Metfone': ['031', '038', '060', '066', '067', '068', '071', '088', '090', '097'],
        'Seatel': ['018'],
        'Cootel': ['038']
    };
    for (const [name, prefixes] of Object.entries(carrierMapping)) {
        if (prefixes.includes(prefix)) return name;
    }
    return '';
}

function formatPhoneWithCarrier(phone) {
    if (!phone || phone === 'មិនមាន') return 'មិនមាន';
    const carrier = getCarrierName(phone);
    if (!carrier) return phone;
    const carrierColors = {
        'Smart': '#a4cc39',
        'Cellcard': '#f37021',
        'Metfone': '#ed1c24',
        'Seatel': '#00a0e9',
        'Cootel': '#fbb03b'
    };
    const color = carrierColors[carrier] || '#888';
    return `${phone} <span class="badge rounded-pill ms-1" style="background-color: ${color}; font-size: 0.65rem; padding: 2px 8px; vertical-align: middle; color: white;">${carrier}</span>`;
}
// currentMgmtType and mgmtData are declared later in the Standard Universal Management Section

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    loadUserProfile();
    loadAllStaff();
    loadMasterStudyTimes();
    populateStaffSelects(); // Load Levels & Classes for form
    setupSearchFunctionality();
    setupFormSubmit();

    const staffPhone = document.getElementById('staff-phone');
    if (staffPhone) {
        staffPhone.addEventListener('input', function () {
            updateStaffCarrierDisplay(this);
        });
    }
});

function updateStaffCarrierDisplay(input) {
    if (!input) return;
    const inputId = input.id;
    const label = document.querySelector(`label[for="${inputId}"]`);
    if (!label) return;

    let carrierDisplay = label.querySelector('.carrier-badge');
    if (!carrierDisplay) {
        carrierDisplay = document.createElement('span');
        carrierDisplay.className = 'carrier-badge badge rounded-pill ms-2';
        carrierDisplay.style.fontSize = '0.7rem';
        carrierDisplay.style.padding = '2px 8px';
        carrierDisplay.style.display = 'none';
        label.appendChild(carrierDisplay);
    }

    const carrier = getCarrierName(input.value);
    if (carrier) {
        const carrierColors = {
            'Smart': '#a4cc39',
            'Cellcard': '#f37021',
            'Metfone': '#ed1c24',
            'Seatel': '#00a0e9',
            'Cootel': '#fbb03b'
        };
        carrierDisplay.textContent = carrier;
        carrierDisplay.style.backgroundColor = carrierColors[carrier] || '#888';
        carrierDisplay.style.color = 'white';
        carrierDisplay.style.display = 'inline-block';
    } else {
        carrierDisplay.style.display = 'none';
    }
}

/**
 * Toggle custom position input field
 */
function toggleCustomPosition(value) {
    const container = document.getElementById('custom-position-container');
    const customInput = document.getElementById('staff-position-custom');
    if (value === 'ផ្សេងៗ') {
        container.classList.remove('d-none');
        customInput.setAttribute('required', 'true');
    } else {
        container.classList.add('d-none');
        customInput.removeAttribute('required');
        customInput.value = '';
    }
}

/**
 * Load user profile information
 */
function loadUserProfile() {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // Get user data from database
            firebase.database().ref('users/' + user.uid).once('value').then((snapshot) => {
                const userData = snapshot.val();
                if (userData) {
                    document.getElementById('user-display-name').textContent = userData.name || user.email;
                    document.getElementById('user-display-email').textContent = user.email;
                    document.getElementById('user-role-badge').textContent = userData.role || 'User';
                }
            });
        }
    });
}

/**
 * Handle logout
 */
function handleLogout(event) {
    event.preventDefault();
    firebase.auth().signOut().then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}

/**
 * Load all staff from Firebase
 */
function loadAllStaff() {
    const staffRef = firebase.database().ref('staff');

    staffRef.on('value', (snapshot) => {
        staffData = snapshot.val() || {};
        // renderStaffList(); // Removed right panel
        // updateStaffCount(); // Removed right panel
        renderDashboard(); // Update Dashboard
    });
}

/**
 * Render staff list in sidebar
 */
/**
 * Render staff list (Disabled as Right Panel was removed)
 */
function renderStaffList(filterText = '') {
    // Function disabled as Right Panel was removed
    return;
}

/**
 * Get initials from name
 */
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

/**
 * Get status class
 */
function getStatusClass(status) {
    const statusMap = {
        'active': 'status-active',
        'inactive': 'status-inactive',
        'on-leave': 'status-on-leave'
    };
    return statusMap[status] || 'status-inactive';
}

/**
 * Get status text in Khmer
 */
function getStatusText(status) {
    const statusMap = {
        'active': 'កំពុងធ្វើការ',
        'inactive': 'ឈប់ធ្វើការ',
        'on-leave': 'សម្រាក'
    };
    return statusMap[status] || 'មិនដឹង';
}

/**
 * Update staff count
 */
/**
 * Update staff count
 */
function updateStaffCount() {
    // Function disabled as Right Panel was removed
}

/**
 * Setup search functionality
 */
function setupSearchFunctionality() {
    // Function disabled as Right Panel search was removed
}

/**
 * Select a staff member to view details
 */
function selectStaff(staffId) {
    currentStaffId = staffId;
    const staff = staffData[staffId];

    if (!staff) return;

    // Display staff details
    displayStaffDetails(staff, staffId);
}

/**
 * Render Dashboard with Stats and Lists
 */
/**
 * Render Dashboard with Stats and Lists
 */
let compositionChart = null;
let currentDashboardFilter = 'all'; // all, teacher, admin
let currentDashboardSearch = '';

function renderDashboard() {
    const staffArray = Object.entries(staffData).map(([id, data]) => ({ id, ...data }));

    // 1. Calculate Stats
    const totalStaff = staffArray.length;
    // Filter generic teachers and explicitly "homeroom" or "class" teachers if identified
    const teachers = staffArray.filter(s => {
        const pos = (s.position || '').toLowerCase();
        return pos.includes('គ្រូ') || pos.includes('teacher');
    });

    const femaleStaff = staffArray.filter(s => (s.gender || '').toLowerCase() === 'female' || (s.gender || '') === 'ស្រី' || (s.gender || '') === 'female');
    const maleStaff = staffArray.filter(s => (s.gender || '').toLowerCase() === 'male' || (s.gender || '') === 'ប្រុស' || (s.gender || '') === 'male');
    const inactiveStaff = staffArray.filter(s => s.status !== 'active');

    // Count for specific categories based on Position OR Study Type
    const khmerTeachers = staffArray.filter(s =>
        (s.position || '') === 'គ្រូភាសាខ្មែរ' ||
        (s.studyType || '') === 'ភាសាខ្មែរ'
    );
    const chineseTeachers = staffArray.filter(s =>
        (s.position || '') === 'គ្រូភាសាចិនពេញម៉ោង' ||
        (s.position || '') === 'គ្រូភាសាចិន' ||
        (s.studyType || '') === 'ថ្នាក់ភាសាចិនពេញម៉ោង'
    );
    const chineseParttimeTeachers = staffArray.filter(s =>
        (s.position || '') === 'គ្រូភាសាចិនក្រៅម៉ោង' ||
        (s.studyType || '') === 'ថ្នាក់ភាសាចិនក្រៅម៉ោង'
    );

    const khmerTeacherIds = new Set(khmerTeachers.map(t => t.id));
    const chineseTeacherIds = new Set(chineseTeachers.map(t => t.id));
    const chineseParttimeTeacherIds = new Set(chineseParttimeTeachers.map(t => t.id));

    const officeStaff = staffArray.filter(s =>
        !khmerTeacherIds.has(s.id) &&
        !chineseTeacherIds.has(s.id) &&
        !chineseParttimeTeacherIds.has(s.id)
    );

    // 2. Update Cards
    if (document.getElementById('dash-total-staff')) document.getElementById('dash-total-staff').textContent = totalStaff;
    if (document.getElementById('dash-khmer-teachers')) document.getElementById('dash-khmer-teachers').textContent = khmerTeachers.length;
    if (document.getElementById('dash-chinese-teachers')) document.getElementById('dash-chinese-teachers').textContent = chineseTeachers.length;
    if (document.getElementById('dash-chinese-parttime-teachers')) document.getElementById('dash-chinese-parttime-teachers').textContent = chineseParttimeTeachers.length;
    if (document.getElementById('dash-office-staff')) document.getElementById('dash-office-staff').textContent = officeStaff.length;

    // Update Progress Bars
    if (totalStaff > 0) {
        const khmerBar = document.getElementById('khmer-bar');
        const chineseBar = document.getElementById('chinese-bar');
        const chineseParttimeBar = document.getElementById('chinese-parttime-bar');
        const officeBar = document.getElementById('office-bar');
        if (khmerBar) khmerBar.style.width = (khmerTeachers.length / totalStaff * 100) + '%';
        if (chineseBar) chineseBar.style.width = (chineseTeachers.length / totalStaff * 100) + '%';
        if (chineseParttimeBar) chineseParttimeBar.style.width = (chineseParttimeTeachers.length / totalStaff * 100) + '%';
        if (officeBar) officeBar.style.width = (officeStaff.length / totalStaff * 100) + '%';
    }

    // Update Tab Counts
    if (document.getElementById('count-all')) document.getElementById('count-all').textContent = totalStaff;
    if (document.getElementById('count-khmer-teachers')) document.getElementById('count-khmer-teachers').textContent = khmerTeachers.length;
    if (document.getElementById('count-chinese-teachers')) document.getElementById('count-chinese-teachers').textContent = chineseTeachers.length;
    if (document.getElementById('count-chinese-parttime-teachers')) document.getElementById('count-chinese-parttime-teachers').textContent = chineseParttimeTeachers.length;
    if (document.getElementById('count-office-staff')) document.getElementById('count-office-staff').textContent = officeStaff.length;

    // 4. Render Staff List Table based on Filter
    filterDashboardList(currentDashboardFilter);
}

window.handleDashboardSearch = (val) => {
    currentDashboardSearch = val.trim().toLowerCase();
    filterDashboardList(currentDashboardFilter);
};

window.filterDashboardList = (filterType) => {
    currentDashboardFilter = filterType;
    const tbody = document.getElementById('dashboard-staff-table-body');
    if (!tbody) return;

    let displayStaff = Object.entries(staffData).map(([id, data]) => ({ id, ...data }));

    // Type Filtering
    if (filterType === 'khmer_teacher') {
        displayStaff = displayStaff.filter(s => (s.position || '') === 'គ្រូភាសាខ្មែរ');
    } else if (filterType === 'chinese_teacher') {
        displayStaff = displayStaff.filter(s => (s.position || '') === 'គ្រូភាសាចិនពេញម៉ោង' || (s.position || '') === 'គ្រូភាសាចិន');
    } else if (filterType === 'chinese_parttime_teacher') {
        displayStaff = displayStaff.filter(s => (s.position || '') === 'គ្រូភាសាចិនក្រៅម៉ោង');
    } else if (filterType === 'office_staff') {
        displayStaff = displayStaff.filter(s =>
            (s.position || '') !== 'គ្រូភាសាខ្មែរ' &&
            (s.position || '') !== 'គ្រូភាសាចិនពេញម៉ោង' &&
            (s.position || '') !== 'គ្រូភាសាចិន' &&
            (s.position || '') !== 'គ្រូភាសាចិនក្រៅម៉ោង'
        );
    }

    // Search Filtering
    if (currentDashboardSearch) {
        displayStaff = displayStaff.filter(s =>
            (s.nameKhmer || '').toLowerCase().includes(currentDashboardSearch) ||
            (s.nameChinese || '').toLowerCase().includes(currentDashboardSearch) ||
            (s.position || '').toLowerCase().includes(currentDashboardSearch) ||
            (s.phone || '').includes(currentDashboardSearch) ||
            (s.homeroomClass || '').toLowerCase().includes(currentDashboardSearch) ||
            (s.level || '').toLowerCase().includes(currentDashboardSearch)
        );
    }

    if (displayStaff.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5 text-muted">
                    <i class="fi fi-rr-search-alt mb-2 fa-2x"></i><br>
                    មិនមានទិន្នន័យ
                </td>
            </tr>`;
        return;
    }

    // Sort: Teachers with Homeroom first, then by name
    displayStaff.sort((a, b) => {
        if (filterType === 'khmer_teacher' || filterType === 'chinese_teacher') {
            const aLink = a.homeroomClass ? 1 : 0;
            const bLink = b.homeroomClass ? 1 : 0;
            if (bLink !== aLink) return bLink - aLink; // Has class first
        }
        return (a.nameKhmer || '').localeCompare(b.nameKhmer || '');
    });

    tbody.innerHTML = displayStaff.map(t => {
        const initials = getInitials(t.nameKhmer);
        const hasHomeroom = t.homeroomClass && t.homeroomClass.trim().length > 0;

        return `
        <tr class="align-middle animate__animated animate__fadeIn">
            <td class="ps-4">
                <div class="d-flex align-items-center" onclick="selectStaff('${t.id}')" style="cursor: pointer;">
                    <div class="rounded-circle ${hasHomeroom ? 'bg-gradient-warning' : 'bg-pink-primary'} text-white d-flex align-items-center justify-content-center me-3 shadow-sm" 
                         style="width: 40px; height: 40px; font-size: 0.9rem; border: 2px solid white; ${hasHomeroom ? 'background: linear-gradient(135deg, #ffc107, #fd7e14);' : ''}">
                         ${initials}
                    </div>
                    <div>
                        <div class="fw-bold text-dark text-nowrap hover-text-primary">${t.nameKhmer || 'N/A'}</div>
                        <div class="small text-muted" style="font-size: 0.8rem;">${t.nameChinese || ''}</div>
                    </div>
                </div>
            </td>
            <td>${t.gender || '-'}</td>
            <td><span class="badge bg-light text-dark border shadow-sm">${t.position || 'Employee'}</span></td>
            <td>
                ${t.studyType ?
                `<span class="badge bg-premium-purple text-white shadow-sm mb-1 d-block"><i class="fi fi-rr-apps me-1"></i>${t.studyType}</span>` :
                ''}
                ${t.level ?
                `<span class="badge bg-info text-dark shadow-sm mb-1 d-block"><i class="fi fi-rr-layers me-1"></i>${t.level}</span>` :
                ''}
                ${hasHomeroom ?
                `<span class="badge bg-warning text-dark shadow-sm"><i class="fi fi-rr-chalkboard-user me-1"></i>${t.homeroomClass}</span>` :
                `<span class="text-muted small">-</span>`}
            </td>
            <td>${formatPhoneWithCarrier(t.phone)}</td>
            <td><span class="small text-secondary"><i class="fi fi-rr-calendar me-1"></i>${t.hireDate ? formatDate(t.hireDate) : '-'}</span></td>
            <td>
                <span class="badge ${t.status === 'active' ? 'bg-success' : 'bg-secondary'} rounded-pill px-3">
                    ${getStatusText(t.status)}
                </span>
            </td>
            <td class="text-end pe-4">
                <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-sm btn-link text-warning p-0" onclick="editStaff('${t.id}')">
                        <i class="fi fi-rr-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteStaff('${t.id}', '${t.nameKhmer}')">
                        <i class="fi fi-rr-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-light text-primary rounded-circle shadow-sm" style="width: 32px; height: 32px;" onclick="selectStaff('${t.id}')">
                        <i class="fi fi-rr-angle-right"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
};

/**
 * Show Dashboard View
 */
function showDashboard() {
    document.getElementById('dashboard-view').classList.remove('d-none');
    document.getElementById('staff-details-view').classList.add('d-none');
    currentStaffId = null;

    // Update sidebar active state skipped as Right Panel was removed
}

/**
 * Display staff details in main content area
 */
/**
 * Display staff details in main content area
 */
async function displayStaffDetails(staff, staffId) {
    // Hide Dashboard, Show Details
    document.getElementById('dashboard-view').classList.add('d-none');
    document.getElementById('staff-details-view').classList.remove('d-none');

    /* មុខងារឆែកស្ថានភាពបង់ប្រាក់ - រក្សាទុកក្នុង Line 357 (ឬ Line ដែលត្រូវគ្នា) */
    const getPaymentStatus = (student) => {
        if (!student) return { text: 'មិនមាន', badge: 'status-pending', status: 'pending', daysRemaining: 0 };

        // ១. ឆែកករណីបង់ផ្តាច់ (៤៨ ខែ ឬ ស្ថានភាពបង់ផ្ដាច់)
        const isFullPaid = (parseInt(student.paymentMonths) || 0) === 48 ||
            (student.nextPaymentDate && (student.nextPaymentDate === 'Completed' || student.nextPaymentDate === '01-01-100' || student.nextPaymentDate.includes('បង់ផ្តាច់'))) ||
            (student.enrollmentStatus === 'paidOff' || student.enrollmentStatus === 'graduated');

        if (isFullPaid) {
            return { text: '✅ បង់រួច', badge: 'status-paid', status: 'paid', daysRemaining: 0 };
        }

        let daysDiff = 0;
        const nextDate = student.nextPaymentDate;
        let hasValidDate = false;

        if (nextDate && !['មិនមាន', ''].includes(nextDate)) {
            const engDate = convertToEnglishDate(nextDate);
            if (engDate) {
                const parts = engDate.split('/');
                const nextDueDate = new Date(parts[2], parts[0] - 1, parts[1]);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (!isNaN(nextDueDate.getTime())) {
                    hasValidDate = true;
                    daysDiff = Math.ceil((nextDueDate - today) / (1000 * 60 * 60 * 24));

                    if (nextDueDate.getDate() === today.getDate() &&
                        nextDueDate.getMonth() === today.getMonth() &&
                        nextDueDate.getFullYear() === today.getFullYear()) {
                        daysDiff = 0;
                    }
                }
            }
        }

    // ២. ឆែកមើល "ពន្យារពេល" (Delay) ជាអាទិភាព
    if (student.paymentStatus === 'Delay' || student.paymentStatus === 'Postponed' || student.paymentStatus === 'ពន្យា' || student.paymentStatus === 'ពន្យារពេល') {
        return { text: '⏳ ពន្យារពេលបង់', badge: 'status-warning', status: 'delay', daysRemaining: daysDiff };
    }

    // ៣. ឆែកការជំណាក់ (Debt / Installment / Pending) ជាអាទិភាពមុននឹងឆែកថ្ងៃកំណត់
    // ប្រសិនបើមានទឹកប្រាក់ជំណាក់នៅសល់លើសពី 0.01$ ត្រូវតែបង្ហាញថាជំណាក់
    const remaining = calculateRemainingAmount(student);
    if (remaining > 0.01) {
        const totalPaid = calculateTotalPaid(student);
        if (totalPaid > 0) {
            return { text: '⚠️ នៅជំណាក់ (Debt)', badge: 'status-warning', status: 'installment', daysRemaining: daysDiff };
        }
        return { text: '❌ មិនទាន់បង់', badge: 'status-pending', status: 'pending', daysRemaining: daysDiff };
    }

    // ៤. ឆែកថ្ងៃកំណត់បង់ (សម្រាប់អ្នកដែលបង់រួចរាល់តាមដំណើរកាល ប៉ុន្តែដល់ពេលត្រូវបង់បន្ត)
    if (hasValidDate) {
        // ត្រូវបង់ថ្ងៃនេះ
        if (daysDiff === 0) return { text: '📅 ត្រូវបង់ថ្ងៃនេះ', badge: 'status-today', status: 'today', daysRemaining: 0 };
        // ហួសកំណត់ (ចាបាំងលឿង -1 ចុះ)
        if (daysDiff < 0) return { text: `❌ ហួសកំណត់ (${Math.abs(daysDiff)} ថ្ងៃ)`, badge: 'status-overdue', status: 'overdue', daysRemaining: daysDiff };
        // ជិតដល់ថ្ងៃ (ចន្លោះ 1 ដល់ 10 ថ្ងៃ)
        if (daysDiff > 0 && daysDiff <= 10) return { text: `⏳ ជិតដល់ថ្ងៃ (${daysDiff} ថ្ងៃ)`, badge: 'status-warning', status: 'warning', daysRemaining: daysDiff };
    }

    // ៥. ករណីបង់រួចរាល់ (គ្មានទឹកប្រាក់ជំពាក់)
    return { text: '✅ បង់រួច', badge: 'status-paid', status: 'paid', daysRemaining: daysDiff };
    };

    const detailsContent = document.getElementById('staff-details-content');
    const initials = getInitials(staff.nameKhmer);
    const statusClass = getStatusClass(staff.status);
    const statusText = getStatusText(staff.status);

    detailsContent.innerHTML = `
        <div class="staff-details-card animate__animated animate__fadeIn">
            <div class="staff-details-header">
                <div class="staff-details-avatar">${initials}</div>
                <div class="staff-details-info flex-grow-1">
                    <h3 class="mb-1">${staff.nameKhmer || 'មិនមាន'}</h3>
                    <p class="mb-1"><strong>${staff.position || 'មិនមាន'}</strong></p>
                    ${staff.nameChinese ? `<p class="text-muted small mb-2">${staff.nameChinese}</p>` : ''}
                    <span class="badge ${staff.status === 'active' ? 'bg-success' : 'bg-secondary'} rounded-pill px-3">${statusText}</span>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-primary shadow-sm rounded-pill" onclick="editStaff('${staffId}')">
                        <i class="fi fi-rr-edit me-1"></i> កែប្រែ
                    </button>
                    <button class="btn btn-outline-danger shadow-sm rounded-pill" onclick="deleteStaff('${staffId}', '${staff.nameKhmer}')">
                        <i class="fi fi-rr-trash me-1"></i> លុប
                    </button>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-user"></i> ឈ្មោះភាសាខ្មែរ</div>
                    <div class="info-value text-pink-dark fw-bold">${staff.nameKhmer || 'មិនមាន'}</div>
                </div>

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-user"></i> ឈ្មោះចិន</div>
                    <div class="info-value">${staff.nameChinese || 'មិនមាន'}</div>
                </div>

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-briefcase"></i> មុខតំណែង</div>
                    <div class="info-value"><span class="badge bg-light text-dark border">${staff.position || 'មិនមាន'}</span></div>
                </div>

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-venus-mars"></i> ភេទ</div>
                    <div class="info-value">${staff.gender || 'មិនមាន'}</div>
                </div>

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-calendar"></i> ថ្ងៃខែឆ្នាំកំណើត</div>
                    <div class="info-value">${staff.dob ? formatDate(staff.dob) : 'មិនមាន'}</div>
                </div>

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-calendar-check"></i> ថ្ងៃចូលធ្វើការ</div>
                    <div class="info-value">${staff.hireDate ? formatDate(staff.hireDate) : 'មិនមាន'}</div>
                </div>

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-phone-call"></i> លេខទូរស័ព្ទ</div>
                    <div class="info-value">${formatPhoneWithCarrier(staff.phone)}</div>
                </div>

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-marker"></i> អាសយដ្ឋាន</div>
                    <div class="info-value">${staff.address || 'មិនមាន'}</div>
                </div>

                ${staff.level ? `
                    <div class="info-item">
                        <div class="info-label"><i class="fi fi-rr-layers"></i> កម្រិតបង្រៀន</div>
                        <div class="info-value"><span class="badge bg-info text-dark">${staff.level}</span></div>
                    </div>
                ` : ''}

                ${staff.studyType ? `
                    <div class="info-item">
                        <div class="info-label"><i class="fi fi-rr-apps text-danger"></i> ប្រភេទវគ្គសិក្សា</div>
                        <div class="info-value"><span class="badge bg-danger text-white">${staff.studyType}</span></div>
                    </div>
                ` : ''}

                ${staff.homeroomClass ? `
                    <div class="info-item">
                        <div class="info-label"><i class="fi fi-rr-chalkboard-user"></i> ថ្នាក់បន្ទុក</div>
                        <div class="info-value"><span class="badge bg-warning text-dark">${staff.homeroomClass}</span></div>
                    </div>
                ` : ''}

                ${staff.teachingHours ? `
                    <div class="info-item">
                        <div class="info-label"><i class="fi fi-rr-clock"></i> ម៉ោងបង្រៀន</div>
                        <div class="info-value"><span class="badge bg-info text-dark">${staff.teachingHours}</span></div>
                    </div>
                ` : ''}

                ${staff.contract ? `
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <div class="info-label"><i class="fi fi-rr-document"></i> កុងត្រា</div>
                        <div class="info-value">${staff.contract}</div>
                    </div>
                ` : ''}

                ${staff.notes ? `
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <div class="info-label"><i class="fi fi-rr-document"></i> កំណត់ចំណាំ</div>
                        <div class="info-value">${staff.notes}</div>
                    </div>
                ` : ''}
            </div>

            <!-- Assigned Students Section -->
            <div id="assigned-students-container" class="assigned-students-section">
                <div class="assigned-students-title">
                    <i class="fi fi-rr-users"></i> សិស្សទទួលបន្ទុក
                </div>
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-2 text-muted">កំពុងទាញយកទិន្នន័យសិស្ស...</p>
                </div>
            </div>
        </div>
    `;

    // Fetch assigned students asynchronously
    try {
        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};
        const staffName = (staff.nameKhmer || '').trim().toLowerCase();

        const assignedStudents = Object.values(students).filter(s => {
            const sTeacher = (s.teacherName || '').trim().toLowerCase();
            const sHomeroom = (s.homeroomTeacher || '').trim().toLowerCase();
            return sTeacher === staffName || sHomeroom === staffName;
        });

        const container = document.getElementById('assigned-students-container');
        if (!container) return;

        if (assignedStudents.length > 0) {
            container.innerHTML = `
                <div class="assigned-students-title justify-content-between">
                    <div class="d-flex align-items-center">
                        <i class="fi fi-rr-users"></i> សិស្សទទួលបន្ទុក
                        <span class="badge bg-pink-primary rounded-pill ms-2" style="background-color: #8a0e5b !important;">${assignedStudents.length} នាក់</span>
                    </div>
                    <button class="btn btn-sm btn-warning rounded-pill text-white px-3 fw-bold shadow-sm" onclick="transferStudents('${staff.nameKhmer}')">
                        <i class="fi fi-rr-shuffle me-1"></i> ផ្ទេរសិស្ស
                    </button>
                </div>
                <div class="student-chip-grid">
                    ${assignedStudents.map(s => {
                const sName = `${s.lastName || ''} ${s.firstName || ''}`.trim();
                const sInitials = getInitials(sName);
                const sClass = s.classroom || s.grade || 'N/A';
                const sId = s.displayId || 'ID-?';
                const isDropout = s.enrollmentStatus === 'dropout' || s.status === 'dropout' || s.isDropout === true;

                const pStatus = getPaymentStatus(s);

                return `
                            <div class="student-chip ${isDropout ? 'opacity-75 grayscale' : ''}">
                                <div class="student-chip-avatar" style="background: ${isDropout ? '#f1f1f1' : 'linear-gradient(135deg, #fff, #f8f9fa)'}">
                                    ${sInitials}
                                </div>
                                <div class="student-chip-info">
                                    <div class="student-chip-name text-nowrap" title="${sName}">${sName}</div>
                                    <div class="student-chip-class">
                                        <span class="badge bg-light text-dark border-0 p-0 me-1" style="font-size: 0.7rem;">${sId}</span>
                                        <i class="fi fi-rr-graduation-cap small"></i> ${sClass}
                                        ${s.studyTime ? `<span class="badge bg-info text-dark ms-1" style="font-size: 0.65rem; padding: 2px 6px;"><i class="fi fi-rr-clock small me-1"></i>${s.studyTime}</span>` : ''}
                                        <span class="ms-1 badge ${pStatus.badge}" style="font-size: 0.65rem; padding: 2px 6px;">${pStatus.text}</span>
                                    </div>
                                </div>
                                ${isDropout ? '<span class="badge bg-danger p-1 rounded-circle ms-auto" title="Dropout" style="width:8px; height:8px; display:inline-block;"></span>' : ''}
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="assigned-students-title">
                    <i class="fi fi-rr-users"></i> សិស្សទទួលបន្ទុក
                </div>
                <div class="text-center py-5 bg-light rounded-4 border border-dashed">
                    <i class="fi fi-rr-info text-muted fa-2x mb-2 opacity-50"></i>
                    <p class="text-muted mb-0">មិនមានសិស្សទទួលបន្ទុកទេសម្រាប់គ្រូនេះ</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error loading assigned students:", error);
        container.innerHTML = `<div class="alert alert-danger">មានកំហុសក្នុងការទាញយកទិន្នន័យសិស្ស</div>`;
    }
}

/**
 * Convert numbers to Khmer numerals
 */
function toKhmerNum(num) {
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return String(num).split('').map(d => khmerDigits[d] || d).join('');
}

/**
 * Format date to readable format with Khmer months and numerals
 * Format: ថ្ងៃ[ឈ្មោះថ្ងៃ] ទី[លេខថ្ងៃ] ខែ[ឈ្មោះខែ] ឆ្នាំ[លេខឆ្នាំ]
 */
const khmerDays = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];

function formatDate(dateString) {
    if (!dateString || ['N/A', '', 'មិនមាន', 'null', 'undefined'].includes(dateString)) return 'មិនមាន';
    
    let d = new Date(dateString);
    
    // If not a standard machine date, try to parse it
    if (isNaN(d.getTime())) {
        const engDate = convertToEnglishDate(dateString);
        if (engDate) d = new Date(engDate);
    }
    
    if (isNaN(d.getTime())) return dateString;

    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
}



// ----------------------------------------------------
// Student Payment Status Helper Functions
// ----------------------------------------------------

const parseCurrency = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const str = val.toString().replace(/[^0-9.-]/g, '');
    return parseFloat(str) || 0;
};

const calculateTotalAmount = (student) => {
    if (!student) return 0;
    const tuitionFee = parseCurrency(student.tuitionFee);
    const materialFee = parseCurrency(student.materialFee);
    const adminFee = parseCurrency(student.adminFee);
    const discount = parseCurrency(student.discount);
    const totalAmount = tuitionFee + materialFee + adminFee - discount;
    return totalAmount > 0 ? totalAmount : 0;
};

const calculateTotalPaid = (student) => {
    if (!student) return 0;
    let totalPaid = parseCurrency(student.initialPayment);
    if (student.installments) {
        const installments = Array.isArray(student.installments) ? student.installments : Object.values(student.installments);
        installments.forEach(inst => {
            if (inst.paid === true || inst.status === 'paid') {
                totalPaid += parseCurrency(inst.paidAmount || inst.amount);
            } else if (inst.status === 'partial' && inst.paidAmount) {
                totalPaid += parseCurrency(inst.paidAmount);
            }
        });
    }
    return totalPaid;
};

const calculateRemainingAmount = (student) => {
    if (!student) return 0;
    if ((parseInt(student.paymentMonths) || 0) === 48) return 0;
    return Math.max(0, calculateTotalAmount(student) - calculateTotalPaid(student));
};

const convertToEnglishDate = (dateStr) => {
    if (!dateStr || ['មិនមាន', 'N/A', '', 'undefined', 'null'].includes(dateStr)) return null;

    if (typeof dateStr !== 'string') return null;

    // Standardize input
    let cleanStr = dateStr.replace(/ថ្ងៃទី|កាលបរិច្ឆេទ|ថ្ងៃ|ខែ|ឆ្នាំ/g, ' ').replace(/\s+/g, ' ').trim();

    // A. Check for standard ISO or YYYY-MM-DD
    if (cleanStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const d = new Date(cleanStr);
        if (!isNaN(d.getTime())) {
            return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        }
    }

    // B. Split and analyze parts
    const parts = cleanStr.split(/[-\/.\s]/).filter(p => p.trim() !== '');
    if (parts.length < 3) return null;

    let day = NaN, month = NaN, year = NaN;

    // Detect month (Khmer or English)
    const KHMER_MONTHS_LOCAL = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
    const ENG_MONTHS_LOCAL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Try finding month in parts[1] (Standard DD-MM-YYYY or DD-MMM-YYYY)
    let mIdx = -1;
    
    // Check Part 1 (Middle)
    mIdx = KHMER_MONTHS_LOCAL.findIndex(m => parts[1].includes(m));
    if (mIdx === -1) {
        mIdx = ENG_MONTHS_LOCAL.findIndex(m => parts[1].toLowerCase().includes(m.toLowerCase()));
    }
    
    if (mIdx !== -1) {
        day = parseInt(parts[0]);
        month = mIdx + 1;
        year = parseInt(parts[2]);
    } else {
        // Try finding month in parts[0] (Standard MM-DD-YYYY)
        mIdx = KHMER_MONTHS_LOCAL.findIndex(m => parts[0].includes(m));
        if (mIdx === -1) {
            mIdx = ENG_MONTHS_LOCAL.findIndex(m => parts[0].toLowerCase().includes(m.toLowerCase()));
        }
        
        if (mIdx !== -1) {
            month = mIdx + 1;
            day = parseInt(parts[1]);
            year = parseInt(parts[2]);
        } else {
            // Numeric fallback (DD-MM-YYYY)
            day = parseInt(parts[0]);
            month = parseInt(parts[1]);
            year = parseInt(parts[2]);
        }
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

    return `${month}/${day}/${year}`;
};

/**
 * Open modal to add new staff
 */
function openAddStaffModal() {
    document.getElementById('staffModalTitle').innerHTML = '<i class="fi fi-rr-user-add"></i> បន្ថែមបុគ្គលិកថ្មី';
    document.getElementById('staffForm').reset();
    document.getElementById('staff-id').value = '';

    // Set default hire date to today
    document.getElementById('staff-hire-date').valueAsDate = new Date();
    document.getElementById('staff-status').value = 'active';
    document.getElementById('staff-level').value = '';
    document.getElementById('staff-homeroom').value = '';
    document.getElementById('staff-notes').value = '';

    // Reset custom position
    document.getElementById('custom-position-container').classList.add('d-none');
    document.getElementById('staff-position-custom').value = '';
    document.getElementById('staff-position-custom').removeAttribute('required');

    // Reset teaching hours checkboxes
    renderTeachingHoursCheckboxes();

    const modalElement = document.getElementById('staffModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    updateStaffCarrierDisplay(document.getElementById('staff-phone'));
    modal.show();
}

/**
 * Edit existing staff
 */
function editStaff(staffId) {
    const staff = staffData[staffId];
    if (!staff) return;

    document.getElementById('staffModalTitle').innerHTML = '<i class="fi fi-rr-edit"></i> កែប្រែព័ត៌មានបុគ្គលិក';
    document.getElementById('staff-id').value = staffId;
    document.getElementById('staff-name-khmer').value = staff.nameKhmer || '';
    document.getElementById('staff-name-chinese').value = staff.nameChinese || '';

    // Handle Position selection
    const positionSelect = document.getElementById('staff-position');
    const customContainer = document.getElementById('custom-position-container');
    const customInput = document.getElementById('staff-position-custom');

    const standardPositions = ['នាយក', 'អនុនាយក', 'គ្រូភាសាខ្មែរ', 'គ្រូភាសាចិន', 'គ្រូភាសាអង់គ្លេស', 'បុគ្គលិកការិយាល័យ', 'បណ្ណារក្ស', 'គណនេយ្យករ', 'អ្នកសំអាត', 'សន្តិសុខ'];

    if (staff.position && standardPositions.includes(staff.position)) {
        positionSelect.value = staff.position;
        customContainer.classList.add('d-none');
        customInput.value = '';
        customInput.removeAttribute('required');
    } else if (staff.position) {
        positionSelect.value = 'ផ្សេងៗ';
        customContainer.classList.remove('d-none');
        customInput.value = staff.position;
        customInput.setAttribute('required', 'true');
    } else {
        positionSelect.value = '';
        customContainer.classList.add('d-none');
        customInput.value = '';
        customInput.removeAttribute('required');
    }

    document.getElementById('staff-gender').value = staff.gender || '';
    document.getElementById('staff-dob').value = staff.dob || '';
    document.getElementById('staff-hire-date').value = staff.hireDate || '';
    document.getElementById('staff-contract').value = staff.contract || '';
    document.getElementById('staff-address').value = staff.address || '';
    document.getElementById('staff-status').value = staff.status || 'active';
    document.getElementById('staff-phone').value = staff.phone || '';
    document.getElementById('staff-level').value = staff.level || '';
    document.getElementById('staff-study-type').value = staff.studyType || '';
    document.getElementById('staff-homeroom').value = staff.homeroomClass || '';
    document.getElementById('staff-notes').value = staff.notes || '';

    // Handle teaching hours checkboxes
    renderTeachingHoursCheckboxes(staff.teachingHours || '');

    const modalElement = document.getElementById('staffModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    updateStaffCarrierDisplay(document.getElementById('staff-phone'));
    modal.show();
}

/**
 * Setup form submit handler
 */
function setupFormSubmit() {
    const form = document.getElementById('staffForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveStaff();
    });
}

/**
 * Save staff data to Firebase
 */
async function saveStaff() {
    const staffId = document.getElementById('staff-id').value;
    const isEdit = staffId !== '';

    let finalPosition = document.getElementById('staff-position').value;
    if (finalPosition === 'ផ្សេងៗ') {
        finalPosition = document.getElementById('staff-position-custom').value.trim();
    }

    // Collect selected teaching hours
    const selectedHours = [];
    document.querySelectorAll('.teaching-hour-checkbox:checked').forEach(cb => {
        selectedHours.push(cb.value);
    });

    const customHours = document.getElementById('staff-custom-hours').value.trim();
    if (customHours) {
        customHours.split(',').forEach(h => {
            const trimmed = h.trim();
            if (trimmed && !selectedHours.includes(trimmed)) {
                selectedHours.push(trimmed);
            }
        });
    }

    const dataToSave = {
        nameKhmer: document.getElementById('staff-name-khmer').value.trim(),
        nameChinese: document.getElementById('staff-name-chinese').value.trim(),
        position: finalPosition,
        gender: document.getElementById('staff-gender').value,
        dob: document.getElementById('staff-dob').value,
        hireDate: document.getElementById('staff-hire-date').value,
        contract: document.getElementById('staff-contract').value.trim(),
        address: document.getElementById('staff-address').value.trim(),
        status: document.getElementById('staff-status').value,
        phone: document.getElementById('staff-phone').value.trim(),
        level: document.getElementById('staff-level').value,
        studyType: document.getElementById('staff-study-type').value,
        homeroomClass: document.getElementById('staff-homeroom').value,
        teachingHours: selectedHours.join(', '),
        notes: document.getElementById('staff-notes').value.trim(),
        updatedAt: new Date().toISOString()
    };

    if (isEdit) {
        // Preserve fields that are not in the form but exist in DB
        const existingStaff = staffData[staffId] || {};
        if (existingStaff.createdAt) {
            dataToSave.createdAt = existingStaff.createdAt;
        }
        if (existingStaff.createdAt) {
            dataToSave.createdAt = existingStaff.createdAt;
        }
        // Removed preserve teachingHours since it's now in the form
    } else {
        dataToSave.createdAt = new Date().toISOString();
    }

    try {
        const ref = firebase.database().ref('staff');
        const key = isEdit ? staffId : ref.push().key;

        await ref.child(key).set(dataToSave);

        Swal.fire({
            icon: 'success',
            title: isEdit ? 'កែប្រែបានជោគជ័យ!' : 'បន្ថែមបានជោគជ័យ!',
            text: `ព័ត៌មានបុគ្គលិក ${dataToSave.nameKhmer} ត្រូវបានរក្សាទុក`,
            confirmButtonColor: '#8a0e5b',
            timer: 2000
        });

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('staffModal'));
        modal.hide();

        // Select the newly added/edited staff
        if (!isEdit) {
            setTimeout(() => selectStaff(key), 500);
        } else {
            selectStaff(key);
        }

    } catch (error) {
        console.error('Error saving staff:', error);
        Swal.fire({
            icon: 'error',
            title: 'កំហុស!',
            text: 'មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ',
            confirmButtonColor: '#8a0e5b'
        });
    }
}

/**
 * Delete staff member
 */
async function deleteStaff(staffId, staffName) {
    const result = await Swal.fire({
        title: 'តើអ្នកប្រាកដទេ?',
        text: `តើអ្នកចង់លុបបុគ្គលិក ${staffName} មែនទេ?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'បាទ/ចាស លុប',
        cancelButtonText: 'បោះបង់'
    });

    if (result.isConfirmed) {
        try {
            await firebase.database().ref('staff').child(staffId).remove();

            Swal.fire({
                icon: 'success',
                title: 'លុបបានជោគជ័យ!',
                text: `បុគ្គលិក ${staffName} ត្រូវបានលុបចេញ`,
                confirmButtonColor: '#8a0e5b',
                timer: 2000
            });

            // Clear details section and go back to dashboard
            currentStaffId = null;
            const detailsContainer = document.getElementById('staff-details-content');
            if (detailsContainer) {
                detailsContainer.innerHTML = '';
            }
            showDashboard();

        } catch (error) {
            console.error('Error deleting staff:', error);
            Swal.fire({
                icon: 'error',
                title: 'កំហុស!',
                text: 'មានបញ្ហាក្នុងការលុបទិន្នន័យ',
                confirmButtonColor: '#8a0e5b'
            });
        }
    }
}

/**
 * Export staff data to Excel
 */
function exportStaffData() {
    const staffArray = Object.entries(staffData).map(([id, data]) => ({
        'ឈ្មោះភាសាខ្មែរ': data.nameKhmer || '',
        'ឈ្មោះចិន': data.nameChinese || '',
        'មុខតំណែង': data.position || '',
        'ភេទ': data.gender || '',
        'លេខទូរស័ព្ទ': data.phone || '',
        'ថ្ងៃចូលធ្វើការ': data.hireDate ? formatDate(data.hireDate) : '',
        'ថ្ងៃខែឆ្នាំកំណើត': data.dob ? formatDate(data.dob) : '',
        'ស្ថានភាព': getStatusText(data.status),
        'ថ្នាក់បន្ទុក': data.homeroomClass || '',
        'ម៉ោងបង្រៀន': data.teachingHours || '',
        'អាសយដ្ឋាន': data.address || '',
        'កុងត្រា': data.contract || ''
    }));

    if (staffArray.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'មិនមានទិន្នន័យ',
            text: 'មិនមានបុគ្គលិកដើម្បីនាំចេញ',
            confirmButtonColor: '#8a0e5b'
        });
        return;
    }

    // Convert to CSV
    const headers = Object.keys(staffArray[0]);
    const csvContent = [
        headers.join(','),
        ...staffArray.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `staff_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire({
        icon: 'success',
        title: 'នាំចេញបានជោគជ័យ!',
        text: 'ទិន្នន័យបុគ្គលិកត្រូវបាននាំចេញជា CSV',
        confirmButtonColor: '#8a0e5b',
        timer: 2000
    });
}

/**
 * Toggle navigation sidebar on desktop
 */
function toggleDesktopSidebar() {
    document.body.classList.toggle('sidebar-collapsed');
}

/**
 * Toggle browser full screen
 */
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

/**
 * Toggle navigation sidebar on mobile
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('show');
}

// Close sidebars when clicking outside on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');

    // Close navigation sidebar
    if (sidebar && window.innerWidth <= 1200 &&
        sidebar.classList.contains('show') &&
        !sidebar.contains(e.target) &&
        sidebarToggle && !sidebarToggle.contains(e.target)) {
        sidebar.classList.remove('show');
    }
});

/**
 * Sync teachers from student data records
 */
async function syncTeachersFromStudents() {
    const result = await Swal.fire({
        title: 'ទាញយកឈ្មោះគ្រូ?',
        text: "ប្រព័ន្ធនឹងស្វែងរកឈ្មោះគ្រូបន្ទុកថ្នាក់ពីបញ្ជីសិស្ស ហើយបន្ថែមចូលក្នុងបញ្ជីបុគ្គលិក។",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ffc107',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'បាទ/ចាស ទាញយក',
        cancelButtonText: 'បោះបង់'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'កំពុងដំណើរការ...',
        text: 'កំពុងវិភាគទិន្នន័យសិស្ស...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // 1. Fetch all students
        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};

        // 2. Identify Teachers and their Classes
        // 2. Identify Teachers and their Classes
        // 2. Identify Teachers and their Classes
        const teacherMap = {}; // LowerName -> { name: String, classes: Set(), studyTimes: Set() }

        Object.values(students).forEach(s => {
            // Helper to add to map
            const addToMap = (rawName) => {
                if (!rawName || typeof rawName !== 'string' || !rawName.trim()) return;
                const name = rawName.trim();
                const lowerName = name.toLowerCase();

                if (!teacherMap[lowerName]) {
                    teacherMap[lowerName] = { name: name, classes: new Set(), studyTimes: new Set(), levels: new Set() };
                }

                if (s.classroom) teacherMap[lowerName].classes.add(s.classroom);
                // Also add grade if available, useful for identification
                if (s.grade) teacherMap[lowerName].classes.add(s.grade);

                // Capture study time
                if (s.studyTime) teacherMap[lowerName].studyTimes.add(s.studyTime);

                // Capture study level
                if (s.studyLevel) teacherMap[lowerName].levels.add(s.studyLevel);
            };

            // Check teacherName (legacy/primary field)
            addToMap(s.teacherName);

            // Check homeroomTeacher (secondary field if exists)
            addToMap(s.homeroomTeacher);
        });

        // 3. Process Updates
        const staffRef = firebase.database().ref('staff');
        const staffSnapshot = await staffRef.once('value');
        const currentStaff = staffSnapshot.val() || {};

        // Helper to find existing staff by Khmer name
        const findStaffKey = (name) => {
            return Object.keys(currentStaff).find(key =>
                (currentStaff[key].nameKhmer || '').toLowerCase() === name.toLowerCase()
            );
        };

        let newCount = 0;
        let updatedCount = 0;
        const updates = {};

        for (const { name: tName, classes: classesSet, studyTimes: timesSet, levels: levelsSet } of Object.values(teacherMap)) {
            // Filter empty classes and join unique ones
            const classesList = Array.from(classesSet).filter(c => c && c.trim()).join(', ');
            const studyTimesList = Array.from(timesSet).filter(t => t && t.trim()).join(', ');
            const levelsList = Array.from(levelsSet).filter(l => l && l.trim()).join(', ');

            const existingKey = findStaffKey(tName);

            if (existingKey) {
                // Update existing staff to include class info if missing or different
                let needsUpdate = false;

                if (classesList && currentStaff[existingKey].homeroomClass !== classesList) {
                    updates[`${existingKey}/homeroomClass`] = classesList;
                    needsUpdate = true;
                }

                // Update teaching levels
                if (levelsList && currentStaff[existingKey].level !== levelsList) {
                    updates[`${existingKey}/level`] = levelsList;
                    needsUpdate = true;
                }

                // Update teaching hours/study times
                if (studyTimesList && currentStaff[existingKey].teachingHours !== studyTimesList) {
                    updates[`${existingKey}/teachingHours`] = studyTimesList;
                    needsUpdate = true;
                }

                // Also ensure position is set to Teacher if generic
                if (!currentStaff[existingKey].position || currentStaff[existingKey].position === 'ផ្សេងៗ') {
                    updates[`${existingKey}/position`] = 'គ្រូបង្រៀន';
                    needsUpdate = true;
                }

                if (needsUpdate) updatedCount++;

            } else {
                // Create new staff
                const newKey = staffRef.push().key;
                updates[newKey] = {
                    nameKhmer: tName,
                    nameChinese: '',
                    position: 'គ្រូបង្រៀន', // Default Position: Teacher
                    homeroomClass: classesList, // Assign identified classes
                    level: levelsList, // Assign identified levels
                    teachingHours: studyTimesList, // Assign identified study times
                    gender: '',
                    status: 'active',
                    hireDate: new Date().toISOString().split('T')[0],
                    createdAt: new Date().toISOString(),
                    notes: 'ទាញយកស្វ័យប្រវត្តិពីទិន្នន័យសិស្ស'
                };
                newCount++;
            }
        }

        if (Object.keys(updates).length > 0) {
            await staffRef.update(updates);

            Swal.fire({
                icon: 'success',
                title: 'ជោគជ័យ!',
                html: `
                    បានបន្ថែមគ្រូថ្មី: <b>${newCount}</b> នាក់<br>
                    បានកែប្រែព័ត៌មានគ្រូ: <b>${updatedCount}</b> នាក់<br>
                    <small class="text-muted">ឈ្មោះគ្រូ និងថ្នាក់ត្រូវបានធ្វើបច្ចុប្បន្នភាព</small>
                `,
                confirmButtonColor: '#8a0e5b'
            });
        } else {
            Swal.fire({
                icon: 'info',
                title: 'រួចរាល់',
                text: 'ព័ត៌មានគ្រូទាំងអស់មានបច្ចុប្បន្នភាពល្អហើយ។',
                confirmButtonColor: '#8a0e5b'
            });
        }

    } catch (error) {
        console.error('Sync error:', error);
        Swal.fire({
            icon: 'error',
            title: 'បរាជ័យ',
            text: 'មានបញ្ហាក្នុងការទាញយកទិន្នន័យ: ' + error.message,
            confirmButtonColor: '#dc3545'
        });
    }
}

/**
 * Sync ONLY study hours (teaching hours) from student data for existing staff
 */
async function syncStudentStudyHours() {
    const result = await Swal.fire({
        title: 'ទាញយកម៉ោងសិក្សាសិស្ស?',
        text: "ប្រព័ន្ធនឹងធ្វើបច្ចុប្បន្នភាពម៉ោងបង្រៀនរបស់គ្រូ ដោយផ្អែកលើម៉ោងសិក្សារបស់សិស្ស។",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0dcaf0',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'បាទ/ចាស ទាញយក',
        cancelButtonText: 'បោះបង់'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'កំពុងដំណើរការ...',
        text: 'កំពុងគណនាម៉ោងសិក្សារបស់សិស្ស...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // 1. Fetch all students
        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};

        // 2. Map Teachers to Data
        const teacherDataMap = {}; // LowerName -> { levels: Set, classes: Set, times: Set }

        Object.values(students).forEach(s => {
            const collectData = (rawName) => {
                if (!rawName || typeof rawName !== 'string' || !rawName.trim()) return;
                const lowerName = rawName.trim().toLowerCase();

                if (!teacherDataMap[lowerName]) {
                    teacherDataMap[lowerName] = {
                        levels: new Set(),
                        classes: new Set(),
                        times: new Set()
                    };
                }
                if (s.studyLevel) teacherDataMap[lowerName].levels.add(s.studyLevel);
                if (s.classroom) teacherDataMap[lowerName].classes.add(s.classroom);
                if (s.grade) teacherDataMap[lowerName].classes.add(s.grade);
                if (s.studyTime) teacherDataMap[lowerName].times.add(s.studyTime);
            };

            collectData(s.teacherName);
            collectData(s.homeroomTeacher);
        });

        // 2b. Add missing times to master list (settings/studyTimes)
        const allUniqueStudyTimes = new Set();
        Object.values(students).forEach(s => {
            if (s.studyTime && s.studyTime.trim()) allUniqueStudyTimes.add(s.studyTime.trim());
        });

        const existingTimes = masterStudyTimes.map(t => t.time);
        for (const time of allUniqueStudyTimes) {
            if (!existingTimes.includes(time)) {
                await firebase.database().ref('settings/studyTimes').push(time);
            }
        }

        // 3. Update Existing Staff Only
        const staffRef = firebase.database().ref('staff');
        const staffSnapshot = await staffRef.once('value');
        const currentStaff = staffSnapshot.val() || {};

        let updatedCount = 0;
        const updates = {};
        const staffKeys = Object.keys(currentStaff);

        staffKeys.forEach(key => {
            const staff = currentStaff[key];
            const nameKhmer = (staff.nameKhmer || '').trim();
            const lowerName = nameKhmer.toLowerCase();

            if (teacherDataMap[lowerName]) {
                const { levels, classes, times } = teacherDataMap[lowerName];
                const levelsList = Array.from(levels).filter(l => l && l.trim()).join(', ');
                const classesList = Array.from(classes).filter(c => c && c.trim()).join(', ');
                const studyTimesList = Array.from(times).filter(t => t && t.trim()).join(', ');

                let needsUpdate = false;

                // Update if different
                if (levelsList && staff.level !== levelsList) {
                    updates[`${key}/level`] = levelsList;
                    needsUpdate = true;
                }
                if (classesList && staff.homeroomClass !== classesList) {
                    updates[`${key}/homeroomClass`] = classesList;
                    needsUpdate = true;
                }
                if (studyTimesList && staff.teachingHours !== studyTimesList) {
                    updates[`${key}/teachingHours`] = studyTimesList;
                    needsUpdate = true;
                }

                if (needsUpdate) updatedCount++;
            }
        });

        if (Object.keys(updates).length > 0) {
            await staffRef.update(updates);

            // Refund dashboard/list (if necessary, though real-time listener should handle it)
            // But we reload logic mostly relies on listener "on value" in loadAllStaff

            Swal.fire({
                icon: 'success',
                title: 'ជោគជ័យ!',
                text: `បានធ្វើបច្ចុប្បន្នភាពម៉ោងបង្រៀនសម្រាប់គ្រូចំនួន ${updatedCount} នាក់។`,
                confirmButtonColor: '#8a0e5b'
            });
        } else {
            Swal.fire({
                icon: 'info',
                title: 'រួចរាល់',
                text: 'ម៉ោងបង្រៀនរបស់គ្រូទាំងអស់គឺត្រឹមត្រូវហើយ។',
                confirmButtonColor: '#8a0e5b'
            });
        }

    } catch (error) {
        console.error('Study Hours Sync error:', error);
        Swal.fire({
            icon: 'error',
            title: 'បរាជ័យ',
            text: 'មានបញ្ហាក្នុងការទាញយកទិន្នន័យ: ' + error.message,
            confirmButtonColor: '#dc3545'
        });
    }
}

/**
 * Transfer all assigned students from one teacher to another
 */
async function transferStudents(fromTeacherName) {
    if (!fromTeacherName) return;

    // Get list of other teachers for the dropdown
    const teachers = Object.values(staffData)
        .filter(s => {
            const name = (s.nameKhmer || '').trim();
            const pos = (s.position || '').toLowerCase();
            return name !== '' && name !== fromTeacherName &&
                (pos.includes('គ្រូ') || pos.includes('teacher') || pos === '' || pos === 'ផ្សេងៗ');
        })
        .sort((a, b) => (a.nameKhmer || '').localeCompare(b.nameKhmer || ''));

    if (teachers.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'មិនអាចផ្ទេរបាន',
            text: 'មិនមានគ្រូផ្សេងទៀតដើម្បីផ្ទេរសិស្សទៅឱ្យឡើយ។',
            confirmButtonColor: '#8a0e5b'
        });
        return;
    }

    const teacherOptions = {};
    teachers.forEach(t => {
        teacherOptions[t.nameKhmer] = t.nameKhmer + (t.nameChinese ? ` (${t.nameChinese})` : '');
    });

    const { value: toTeacherName } = await Swal.fire({
        title: 'ផ្ទេរសិស្សទៅគ្រូថ្មី',
        text: `ជ្រើសរើសគ្រូដែលត្រូវទទួលបន្ទុកបន្តពី ${fromTeacherName}៖`,
        input: 'select',
        inputOptions: teacherOptions,
        inputPlaceholder: 'ជ្រើសរើសគ្រូទទួលបន្ទុក...',
        showCancelButton: true,
        confirmButtonColor: '#8a0e5b',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'បន្តការផ្ទេរ',
        cancelButtonText: 'បោះបង់',
        inputValidator: (value) => {
            return new Promise((resolve) => {
                if (value) resolve();
                else resolve('សូមជ្រើសរើសគ្រូម្នាក់');
            });
        }
    });

    if (toTeacherName) {
        try {
            Swal.fire({
                title: 'កំពុងផ្ទេរ...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const snapshot = await firebase.database().ref('students').once('value');
            const students = snapshot.val() || {};
            const sourceName = fromTeacherName.trim().toLowerCase();
            const updates = {};
            let count = 0;

            Object.entries(students).forEach(([key, s]) => {
                let updated = false;
                const sTeacher = (s.teacherName || '').trim().toLowerCase();
                const sHomeroom = (s.homeroomTeacher || '').trim().toLowerCase();

                if (sTeacher === sourceName) {
                    updates[`${key}/teacherName`] = toTeacherName;
                    updated = true;
                }
                if (sHomeroom === sourceName) {
                    updates[`${key}/homeroomTeacher`] = toTeacherName;
                    updated = true;
                }

                if (updated) count++;
            });

            if (count > 0) {
                await firebase.database().ref('students').update(updates);

                await Swal.fire({
                    icon: 'success',
                    title: 'ផ្ទេរបានជោគជ័យ!',
                    text: `បានផ្ទេរសិស្សចំនួន ${count} នាក់ ពី ${fromTeacherName} ទៅឱ្យ ${toTeacherName}។`,
                    confirmButtonColor: '#8a0e5b'
                });

                // Refresh details view if still on the same staff
                if (currentStaffId) {
                    selectStaff(currentStaffId);
                }
            } else {
                Swal.fire({
                    icon: 'info',
                    title: 'គ្មានទិន្នន័យ',
                    text: 'មិនមានសិស្សដែលត្រូវផ្ទេរឡើយ។',
                    confirmButtonColor: '#8a0e5b'
                });
            }
        } catch (error) {
            console.error("Error transferring students:", error);
            Swal.fire({
                icon: 'error',
                title: 'កំហុស!',
                text: 'មានបញ្ហាក្នុងការផ្ទេរទិន្នន័យ',
                confirmButtonColor: '#d33'
            });
        }
    }
}
/**
 * Load Master Study Times from Firebase
 */
function loadMasterStudyTimes() {
    const studyTimesRef = firebase.database().ref('settings/studyTimes');
    studyTimesRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        masterStudyTimes = Object.entries(data).map(([id, time]) => ({ id, time }));
        masterStudyTimes.sort((a, b) => a.time.localeCompare(b.time));
    });
}

/**
 * Open Study Time Management Modal
 */
function openStudyTimeModal() {
    renderStudyTimeList();
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('studyTimeModal'));
    modal.show();
}

/**
 * Render Study Time List in Settings Modal
 */
function renderStudyTimeList() {
    const container = document.getElementById('study-time-list');
    if (!container) return;

    if (masterStudyTimes.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-muted"><i class="fi fi-rr-box-open d-block mb-2 fa-2x"></i>មិនទាន់មានទិន្នន័យ</div>';
        return;
    }

    container.innerHTML = masterStudyTimes.map(item => `
        <div class="list-group-item d-flex justify-content-between align-items-center py-3">
            <div class="d-flex align-items-center">
                <div class="rounded-circle bg-light d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px; color: #6f42c1;">
                    <i class="fi fi-rr-clock"></i>
                </div>
                <div>
                    <span class="fw-bold d-block text-dark">${item.time}</span>
                </div>
            </div>
            <div class="btn-group shadow-sm rounded">
                <button class="btn btn-sm btn-white text-info" title="មើលសិស្ស" onclick="viewStudentsInTime('${item.time}')">
                    <i class="fi fi-rr-users"></i>
                </button>
                <button class="btn btn-sm btn-white text-warning" title="កែប្រែ" onclick="editStudyTime('${item.id}', '${item.time}')">
                    <i class="fi fi-rr-edit"></i>
                </button>
                <button class="btn btn-sm btn-white text-danger" title="លុប" onclick="deleteStudyTime('${item.id}', '${item.time}')">
                    <i class="fi fi-rr-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Add New Study Time
 */
async function addStudyTime() {
    const input = document.getElementById('new-study-time');
    const time = input.value.trim();

    if (!time) {
        Swal.fire({ icon: 'warning', title: 'សូមបញ្ចូលម៉ោងសិក្សា' });
        return;
    }

    // Check if duplicate
    if (masterStudyTimes.some(t => t.time === time)) {
        Swal.fire({ icon: 'warning', title: 'ម៉ោងសិក្សានេះមានរួចហើយ' });
        return;
    }

    try {
        await firebase.database().ref('settings/studyTimes').push(time);
        input.value = '';
        renderStudyTimeList();
        Swal.fire({ icon: 'success', title: 'បានបន្ថែមដោយជោគជ័យ', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    } catch (error) {
        console.error('Error adding study time:', error);
    }
}

/**
 * Edit Study Time (Updates settings, staff, and students)
 */
async function editStudyTime(id, oldTime) {
    const { value: newTime } = await Swal.fire({
        title: 'កែប្រែម៉ោងសិក្សា',
        input: 'text',
        inputValue: oldTime,
        inputLabel: 'បញ្ចូលម៉ោងថ្មី',
        showCancelButton: true,
        confirmButtonText: 'រក្សាទុក',
        cancelButtonText: 'បោះបង់',
        inputValidator: (value) => {
            if (!value) return 'សូមបញ្ចូលម៉ោងសិក្សា';
            if (value === oldTime) return 'ម៉ោងសិក្សាមិនមានការផ្លាស់ប្តូរឡើយ';
            if (masterStudyTimes.some(t => t.time === value)) return 'ម៉ោងសិក្សានេះមានរួចហើយ';
        }
    });

    if (newTime) {
        Swal.fire({ title: 'កំពុងធ្វើបច្ចុប្បន្នភាព...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const updates = {};
            // 1. Update Master List
            updates[`settings/studyTimes/${id}`] = newTime;

            // 2. Prepare Staff Updates
            const staffSnapshot = await firebase.database().ref('staff').once('value');
            const staffs = staffSnapshot.val() || {};
            Object.entries(staffs).forEach(([sKey, sData]) => {
                if (sData.teachingHours && sData.teachingHours.includes(oldTime)) {
                    const updatedHours = sData.teachingHours.split(', ').map(h => h.trim() === oldTime ? newTime : h).join(', ');
                    updates[`staff/${sKey}/teachingHours`] = updatedHours;
                }
            });

            // 3. Prepare Student Updates
            const studentSnapshot = await firebase.database().ref('students').once('value');
            const students = studentSnapshot.val() || {};
            Object.entries(students).forEach(([stKey, stData]) => {
                if (stData.studyTime === oldTime) {
                    updates[`students/${stKey}/studyTime`] = newTime;
                }
            });

            await firebase.database().ref().update(updates);

            Swal.fire({ icon: 'success', title: 'បានកែប្រែជោគជ័យ', text: 'បានធ្វើបច្ចុប្បន្នភាពម៉ោងក្នុងបញ្ជី បុគ្គលិក និងសិស្សរួចរាល់។' });
            renderStudyTimeList();
        } catch (error) {
            console.error('Error editing study time:', error);
            Swal.fire({ icon: 'error', title: 'បរាជ័យ', text: 'មិនអាចកែប្រែទិន្នន័យបាន។' });
        }
    }
}

/**
 * Delete Study Time
 */
async function deleteStudyTime(id, time) {
    const result = await Swal.fire({
        title: 'លុបម៉ោងសិក្សា?',
        text: `តើអ្នកចង់លុបម៉ោង ${time} មែនទេ?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'លុប',
        cancelButtonText: 'បោះបង់'
    });

    if (result.isConfirmed) {
        try {
            await firebase.database().ref('settings/studyTimes').child(id).remove();
            renderStudyTimeList();
        } catch (error) {
            console.error('Error deleting study time:', error);
        }
    }
}

/**
 * Render Checkboxes for Teaching Hours in Staff Form
 */
function renderTeachingHoursCheckboxes(selectedHoursStr = '') {
    const container = document.getElementById('staff-teaching-hours-container');
    const customInput = document.getElementById('staff-custom-hours');
    if (!container) return;

    if (customInput) customInput.value = '';

    const selectedHours = selectedHoursStr.split(',').map(h => h.trim()).filter(h => h !== '');
    const masterTimes = masterStudyTimes.map(t => t.time);

    // Populate custom input with hours not in master list
    const customOnes = selectedHours.filter(h => !masterTimes.includes(h));
    if (customInput && customOnes.length > 0) {
        customInput.value = customOnes.join(', ');
    }

    if (masterStudyTimes.length === 0) {
        container.innerHTML = '<small class="text-muted">មិនទាន់មានម៉ោងសិក្សា (សូមបន្ថែមក្នុង "គ្រប់គ្រងម៉ោងសិក្សា")</small>';
        return;
    }

    container.innerHTML = masterStudyTimes.map(item => `
        <div class="form-check">
            <input class="form-check-input teaching-hour-checkbox" type="checkbox" value="${item.time}" id="hour-${item.id}" 
                ${selectedHours.includes(item.time) ? 'checked' : ''}>
            <label class="form-check-label small" for="hour-${item.id}">
                ${item.time}
            </label>
        </div>
    `).join('');
}

// Ensure masterStudyTimes load triggers re-render of list if modal is open
firebase.database().ref('settings/studyTimes').on('value', () => {
    if (document.getElementById('studyTimeModal').classList.contains('show')) {
        renderStudyTimeList();
    }
});

/**
 * Global Variable to hold students belonging to active view
 */
let studentsInView = [];
let currentStudyTimeFilter = '';

/**
 * View Students in specific target time
 */
async function viewStudentsInTime(time) {
    currentStudyTimeFilter = time;
    const label = document.getElementById('view-time-label');
    if (label) label.textContent = time;

    const listContainer = document.getElementById('students-in-time-list');
    const badge = document.getElementById('student-count-badge');
    const moveSelect = document.getElementById('move-to-time-select');

    if (listContainer) listContainer.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">កំពុងទាញយក...</td></tr>';
    if (badge) badge.textContent = '0 នាក់';

    try {
        // Hide parent modal
        bootstrap.Modal.getOrCreateInstance(document.getElementById('studyTimeModal')).hide();

        // Show target modal
        const _staffStudentsEl = document.getElementById('studentsInTimeModal');
        if (_staffStudentsEl) bootstrap.Modal.getOrCreateInstance(_staffStudentsEl).show();

        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};

        studentsInView = Object.entries(students)
            .map(([id, data]) => ({ id, ...data }))
            .filter(s => s.studyTime === time);

        if (badge) badge.textContent = `${studentsInView.length} នាក់`;

        if (studentsInView.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted"><i class="fi fi-rr-info d-block mb-2 fa-2x"></i>មិនមានសិស្សក្នុងម៉ោងនេះទេ</td></tr>';
        } else {
            listContainer.innerHTML = studentsInView.map(s => `
                <tr>
                    <td><input type="checkbox" class="student-select-check" value="${s.id}"></td>
                    <td>
                        <div class="fw-bold text-dark">${s.lastName} ${s.firstName}</div>
                        <small class="text-muted">${s.englishName || ''}</small>
                    </td>
                    <td class="text-center">${s.gender === 'Female' ? 'ស្រី' : 'ប្រុស'}</td>
                    <td><span class="badge bg-light text-dark border">${s.studyLevel || '-'}</span></td>
                    <td><span class="badge bg-light text-primary border">${s.classroom || '-'}</span></td>
                    <td><span class="badge bg-light text-success border">${s.studyType === 'chinese-fulltime' ? 'ពេញម៉ោង' : 'ក្រៅម៉ោង'}</span></td>
                    <td class="small">${s.teacherName || '-'}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-success rounded-pill px-3" onclick="markAsGraduated('${s.id}')" title="បញ្ចប់ការសិក្សាសិស្សនេះ">
                            <i class="fi fi-rr-graduation-cap me-1"></i> បញ្ចប់
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        // Populate move selections
        const selects = {
            time: document.getElementById('move-to-time-select'),
            room: document.getElementById('move-to-room-select'),
            level: document.getElementById('move-to-level-select'),
            teacher: document.getElementById('move-to-teacher-select')
        };

        if (selects.time) {
            selects.time.innerHTML = '<option value="">(មិនប្តូរ)</option>';
            masterStudyTimes.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.time;
                opt.textContent = t.time;
                selects.time.appendChild(opt);
            });
        }

        if (selects.room) {
            selects.room.innerHTML = '<option value="">(មិនប្តូរ)</option>';
            masterClassrooms.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.textContent = r;
                selects.room.appendChild(opt);
            });
        }

        if (selects.level) {
            selects.level.innerHTML = '<option value="">(មិនប្តូរ)</option>';
            masterLevels.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l;
                opt.textContent = l;
                selects.level.appendChild(opt);
            });
        }

        if (selects.teacher) {
            selects.teacher.innerHTML = '<option value="">(មិនប្តូរ)</option>';
            // Get teachers from staffData
            const teachers = Object.values(staffData)
                .filter(s => {
                    const name = (s.nameKhmer || '').trim();
                    const pos = (s.position || '').toLowerCase();
                    return name !== '' && (pos.includes('គ្រូ') || pos.includes('teacher') || pos === '' || pos === 'ផ្សេងៗ');
                })
                .sort((a, b) => (a.nameKhmer || '').localeCompare(b.nameKhmer || ''));

            teachers.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.nameKhmer;
                opt.textContent = t.nameKhmer;
                selects.teacher.appendChild(opt);
            });
        }

    } catch (error) {
        console.error('Error viewing students in time:', error);
    }
}

function closeStudentsInTimeModal() {
    bootstrap.Modal.getOrCreateInstance(document.getElementById('studentsInTimeModal')).hide();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('studyTimeModal')).show();
}

/**
 * Toggle Select All Students
 */
function toggleSelectAllStudentsInTime(parent) {
    document.querySelectorAll('.student-select-check').forEach(cb => {
        cb.checked = parent.checked;
    });
}

/**
 * Move Selected Students to New Time Slot
 */
async function moveStudentsBulk() {
    const targetTime = document.getElementById('move-to-time-select').value;
    const targetRoom = document.getElementById('move-to-room-select').value;
    const targetLevel = document.getElementById('move-to-level-select').value;
    const targetTeacher = document.getElementById('move-to-teacher-select').value;

    if (!targetTime && !targetRoom && !targetLevel && !targetTeacher) {
        Swal.fire({ icon: 'warning', title: 'សូមជ្រើសរើសព័ត៌មានយ៉ាងតិចមួយដើម្បីប្តូរ' });
        return;
    }

    const selectedIds = [];
    document.querySelectorAll('.student-select-check:checked').forEach(cb => selectedIds.push(cb.value));

    if (selectedIds.length === 0) {
        Swal.fire({ icon: 'warning', title: 'សូមជ្រើសរើសសិស្សយ៉ាងតិចម្នាក់' });
        return;
    }

    const result = await Swal.fire({
        title: 'ផ្ទេរព័ត៌មានសិស្ស?',
        text: `តើអ្នកចង់ប្តូរព័ត៌មានសិស្សចំនួន ${selectedIds.length} នាក់ មែនទេ?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'បាទ/ចាស ប្តូរ',
        cancelButtonText: 'បោះបង់',
        confirmButtonColor: '#ffc107'
    });

    if (result.isConfirmed) {
        Swal.fire({ title: 'កំពុងផ្លាស់ប្តូរ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const updates = {};
            selectedIds.forEach(id => {
                if (targetTime) updates[`students/${id}/studyTime`] = targetTime;
                if (targetRoom) updates[`students/${id}/classroom`] = targetRoom;
                if (targetLevel) updates[`students/${id}/studyLevel`] = targetLevel;
                if (targetTeacher) updates[`students/${id}/teacherName`] = targetTeacher;

                updates[`students/${id}/updatedAt`] = new Date().toISOString();
            });

            await firebase.database().ref().update(updates);

            await Swal.fire({ icon: 'success', title: 'ជោគជ័យ', text: 'បានផ្លាស់ប្តូរទិន្នន័យសិស្សរួចរាល់។' });

            // Refresh current view
            viewStudentsInTime(currentStudyTimeFilter);

        } catch (error) {
            console.error('Error moving students bulk:', error);
            Swal.fire({ icon: 'error', title: 'បរាជ័យ', text: 'មានបញ្ហាក្នុងការផ្លាស់ប្តូរទិន្នន័យ។' });
        }
    }
}

/**
 * Standard Universal Management System
 * Handles Levels, Classes, and Classrooms
 */
/**
 * Standard Universal Management System
 * Handles Levels, Classes, and Classrooms
 */
let currentMgmtType = ''; // 'levels', 'classes', 'classrooms'
let mgmtData = [];
let mgmtSearchQuery = '';

const mgmtConfigs = {
    levels: {
        title: 'គ្រប់គ្រងកម្រិតសិក្សា',
        icon: 'fi-rr-layers',
        ref: 'settings/levels',
        bg: 'linear-gradient(135deg, #28a745, #1e7e34)',
        inputLabel: 'បន្ថែមនាំកម្រិតថ្មី',
        inputIcon: 'fi-rr-layer-plus',
        syncFunction: syncLevelsFromStudents
    },
    classes: {
        title: 'គ្រប់គ្រងថ្នាក់រៀន',
        icon: 'fi-rr-book-open-reader',
        ref: 'settings/classes',
        bg: 'linear-gradient(135deg, #17a2b8, #117a8b)',
        inputLabel: 'បន្ថែមថ្នាក់ថ្មី',
        inputIcon: 'fi-rr-book-medical',
        syncFunction: syncClassesFromStudents
    },
    classrooms: {
        title: 'គ្រប់គ្រងបន្ទប់រៀន',
        icon: 'fi-rr-door-open',
        ref: 'settings/classrooms',
        bg: 'linear-gradient(135deg, #fd7e14, #d96d00)',
        inputLabel: 'បន្ថែមបន្ទប់ថ្មី',
        inputIcon: 'fi-rr-door-closed',
        syncFunction: syncRoomsFromStudents
    },
    studyTypes: {
        title: 'គ្រប់គ្រងប្រភេទវគ្គសិក្សា',
        icon: 'fi-rr-apps',
        ref: 'settings/studyTypes',
        bg: 'linear-gradient(135deg, #dc3545, #b02a37)',
        inputLabel: 'បន្ថែមប្រភេទវគ្គថ្មី',
        inputIcon: 'fi-rr-add',
        syncFunction: syncStudyTypesFromStudents
    }
};

function openLevelModal() { openManagementModal('levels'); }
function openClassModal() { openManagementModal('classes'); }
function openRoomModal() { openManagementModal('classrooms'); }
function openStudyTypeModal() { openManagementModal('studyTypes'); }

function openManagementModal(type) {
    currentMgmtType = type;
    const config = mgmtConfigs[type];

    // Update UI
    document.getElementById('mgmt-title').textContent = config.title;
    document.getElementById('mgmt-icon').className = `fi ${config.icon} me-2`;
    document.getElementById('mgmt-header').style.background = config.bg;
    document.getElementById('mgmt-input-label').textContent = config.inputLabel;
    document.getElementById('mgmt-input-icon').className = `fi ${config.inputIcon}`;
    document.getElementById('mgmt-input').value = '';
    document.getElementById('mgmt-search').value = '';
    mgmtSearchQuery = '';

    const addBtn = document.getElementById('mgmt-add-btn');
    addBtn.onclick = () => addToManagement();
    addBtn.style.background = config.bg.split(',')[0].replace('linear-gradient(135deg, ', '');
    addBtn.style.borderColor = addBtn.style.background;

    // Set sync button action
    const syncBtn = document.getElementById('mgmt-sync-btn');
    if (config.syncFunction) {
        syncBtn.style.display = 'block';
        syncBtn.onclick = async () => {
            await config.syncFunction();
            // loadManagementData is already handled by the .on('value') listener
        };
    } else {
        syncBtn.style.display = 'none';
    }

    // Load Data
    loadManagementData(type);

    const _staffMgmtEl = document.getElementById('managementModal');
    if (_staffMgmtEl) bootstrap.Modal.getOrCreateInstance(_staffMgmtEl).show();
}

function loadManagementData(type) {
    const config = mgmtConfigs[type];
    const mgmtRef = firebase.database().ref(config.ref);

    mgmtRef.off(); // Prevent multiple listeners
    mgmtRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        mgmtData = Object.entries(data).map(([id, value]) => ({ id, value }));
        mgmtData.sort((a, b) => a.value.localeCompare(b.value));
        renderManagementList();
    });
}

function filterManagementList(query) {
    mgmtSearchQuery = query.toLowerCase();
    renderManagementList();
}

function renderManagementList() {
    const list = document.getElementById('mgmt-list');
    if (!list) return;

    let filteredData = mgmtData;
    if (mgmtSearchQuery) {
        filteredData = mgmtData.filter(item => item.value.toLowerCase().includes(mgmtSearchQuery));
    }

    if (filteredData.length === 0) {
        list.innerHTML = `<div class="text-center py-5 text-muted">
            <i class="fi fi-rr-box-open d-block mb-2 fa-2x"></i>
            ${mgmtSearchQuery ? 'មិនមានលទ្ធផលស្វែងរក' : 'មិនទាន់មានទិន្នន័យ'}
        </div>`;
        return;
    }

    list.innerHTML = filteredData.map(item => `
        <div class="list-group-item d-flex justify-content-between align-items-center py-3">
            <span class="fw-bold text-dark">${item.value}</span>
            <div class="btn-group">
                <button class="btn btn-sm btn-outline-warning border-0" onclick="editManagementItem('${item.id}', '${item.value}')">
                    <i class="fi fi-rr-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteManagementItem('${item.id}', '${item.value}')">
                    <i class="fi fi-rr-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function addToManagement() {
    const input = document.getElementById('mgmt-input');
    const value = input.value.trim();

    if (!value) {
        Swal.fire({ icon: 'warning', title: 'សូមបញ្ចូលព័ត៌មាន' });
        return;
    }

    if (mgmtData.some(d => d.value === value)) {
        Swal.fire({ icon: 'warning', title: 'ទិន្នន័យនេះមានរួចហើយ' });
        return;
    }

    try {
        const config = mgmtConfigs[currentMgmtType];
        await firebase.database().ref(config.ref).push(value);
        input.value = '';
        Swal.fire({ icon: 'success', title: 'បន្ថែមបានជោគជ័យ', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    } catch (error) {
        console.error('Error adding to management:', error);
    }
}

async function editManagementItem(id, oldValue) {
    const { value: newValue } = await Swal.fire({
        title: 'កែប្រែទិន្នន័យ',
        input: 'text',
        inputValue: oldValue,
        showCancelButton: true,
        confirmButtonText: 'រក្សាទុក',
        cancelButtonText: 'បោះបង់'
    });

    if (newValue && newValue !== oldValue) {
        try {
            const config = mgmtConfigs[currentMgmtType];
            await firebase.database().ref(config.ref).child(id).set(newValue);
            Swal.fire({ icon: 'success', title: 'កែប្រែជោគជ័យ', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (error) {
            console.error('Error editing item:', error);
        }
    }
}

async function deleteManagementItem(id, value) {
    const result = await Swal.fire({
        title: 'លុបទិន្នន័យ?',
        text: `តើអ្នកចង់លុប "${value}" មែនទេ?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'លុប',
        cancelButtonText: 'បោះបង់'
    });

    if (result.isConfirmed) {
        try {
            const config = mgmtConfigs[currentMgmtType];
            await firebase.database().ref(config.ref).child(id).remove();
            Swal.fire({ icon: 'success', title: 'លុបបានជោគជ័យ', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    }
}

/**
 * Populate Level and Homeroom Class selects from Master Settings
 */
function populateStaffSelects() {
    const levelSelect = document.getElementById('staff-level');
    const classSelect = document.getElementById('staff-homeroom');
    const studyTypeSelect = document.getElementById('staff-study-type');

    // Load Levels
    firebase.database().ref('settings/levels').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        masterLevels = Object.values(data).sort();
        if (levelSelect) {
            const currentVal = levelSelect.value;
            levelSelect.innerHTML = '<option value="">ជ្រើសរើសកម្រិត...</option>';
            masterLevels.forEach(lvl => {
                const opt = document.createElement('option');
                opt.value = lvl;
                opt.textContent = lvl;
                levelSelect.appendChild(opt);
            });
            levelSelect.value = currentVal;
        }
    });

    // Load Classes (Homerooms)
    firebase.database().ref('settings/classes').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        masterClasses = Object.values(data).sort();
        if (classSelect) {
            const currentVal = classSelect.value;
            classSelect.innerHTML = '<option value="">ជ្រើសរើសថ្នាក់...</option>';
            masterClasses.forEach(cls => {
                const opt = document.createElement('option');
                opt.value = cls;
                opt.textContent = cls;
                classSelect.appendChild(opt);
            });
            classSelect.value = currentVal;
        }
    });

    // Load Classrooms (Rooms)
    firebase.database().ref('settings/classrooms').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        masterClassrooms = Object.values(data).sort();
    });

    // Load Study Types
    if (studyTypeSelect) {
        firebase.database().ref('settings/studyTypes').on('value', (snapshot) => {
            const data = snapshot.val() || {};
            const types = Object.values(data).sort();
            const currentVal = studyTypeSelect.value;
            studyTypeSelect.innerHTML = '<option value="">ជ្រើសរើសប្រភេទវគ្គ...</option>';
            types.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;

                const translationMap = {
                    'chinese-fulltime': 'ថ្នាក់ភាសាចិនពេញម៉ោង',
                    'chinese-parttime': 'ថ្នាក់ភាសាចិនក្រៅម៉ោង',
                    'three-languages': 'ថ្នាក់ចំណះដឹងទូទៅ',
                    'one-language': 'ថ្នាក់ភាសា (១ភាសា)',
                    'two-languages': 'ថ្នាក់ភាសា (២ភាសា)',
                    'cFullTime': 'ថ្នាក់ភាសាចិនពេញម៉ោង',
                    'cPartTime': 'ថ្នាក់ភាសាចិនក្រៅម៉ោង'
                };

                opt.textContent = translationMap[t] || t;
                studyTypeSelect.appendChild(opt);
            });
            studyTypeSelect.value = currentVal;
        });
    }
}
/**
 * Sync Study Types from Students data (data-tracking.html source)
 */
async function syncStudyTypesFromStudents() {
    return syncSystemSettingFromStudents('studyTypes', ['studyType', 'courseType'], 'ប្រភេទវគ្គសិក្សា');
}

/**
 * Sync Levels from Students data
 */
async function syncLevelsFromStudents() {
    return syncSystemSettingFromStudents('levels', ['studyLevel'], 'កម្រិតសិក្សា');
}

/**
 * Sync Classes from Students data
 */
async function syncClassesFromStudents() {
    // In this system, 'classes' usually refers to Homeroom Classes which often match the student's classroom or grade
    return syncSystemSettingFromStudents('classes', ['classroom', 'grade'], 'ថ្នាក់រៀន');
}

/**
 * Sync Classrooms from Students data
 */
async function syncRoomsFromStudents() {
    return syncSystemSettingFromStudents('classrooms', ['classroom'], 'បន្ទប់រៀន');
}

/**
 * Sync Study Hours (Times) from Students data
 */
async function syncStudentStudyHours() {
    return syncSystemSettingFromStudents('studyTimes', ['studyTime'], 'ម៉ោងសិក្សា');
}

/**
 * Generic Helper to sync any system setting from student data fields
 * @param {string} settingsPath - The subpath in settings/ (e.g., 'levels')
 * @param {string[]} studentFields - Array of field names to check in student object
 * @param {string} label - Display label for the alert
 */
async function syncSystemSettingFromStudents(settingsPath, studentFields, label) {
    Swal.fire({
        title: `កំពុងទាញយក${label}...`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};

        const uniqueValues = new Set();
        Object.values(students).forEach(s => {
            studentFields.forEach(field => {
                const val = s[field];
                if (val && !['all', 'N/A', '', 'មិនមាន', '-'].includes(val)) {
                    // If it's a comma-separated list (like some fields might be), split it
                    if (typeof val === 'string' && val.includes(',')) {
                        val.split(',').forEach(v => {
                            const trimmed = v.trim();
                            if (trimmed) uniqueValues.add(trimmed);
                        });
                    } else {
                        uniqueValues.add(val.toString().trim());
                    }
                }
            });
        });

        // Get current master data
        const masterSnap = await firebase.database().ref(`settings/${settingsPath}`).once('value');
        const masterData = masterSnap.val() || {};

        // Handle both simple array-like objects and objects with {id: time}
        const masterValues = Object.values(masterData).map(v =>
            (typeof v === 'object' && v !== null && v.time) ? v.time : v
        );

        const newValues = Array.from(uniqueValues).filter(v => !masterValues.includes(v));

        // Translation mapping for common English values from students data
        const translationMap = {
            'chinese-fulltime': 'ថ្នាក់ភាសាចិនពេញម៉ោង',
            'chinese-parttime': 'ថ្នាក់ភាសាចិនក្រៅម៉ោង',
            'three-languages': 'ថ្នាក់ចំណះដឹងទូទៅ',
            'one-language': 'ថ្នាក់ភាសា (១ភាសា)',
            'two-languages': 'ថ្នាក់ភាសា (២ភាសា)',
            'cFullTime': 'ថ្នាក់ភាសាចិនពេញម៉ោង',
            'cPartTime': 'ថ្នាក់ភាសាចិនក្រៅម៉ោង',
            'Full-time': 'ពេញម៉ោង',
            'Part-time': 'ក្រៅម៉ោង'
        };

        const finalNewValues = newValues.map(v => translationMap[v] || v);
        // Deduplicate again after translation
        const uniqueFinalValues = Array.from(new Set(finalNewValues)).filter(v => !masterValues.includes(v));

        if (uniqueFinalValues.length === 0) {
            Swal.fire({
                icon: 'info',
                title: `គ្មាន${label}ថ្មីទេ`,
                text: `ទិន្នន័យ${label}បានបច្ចុប្បន្នភាពជាមួយទិន្នន័យសិស្សរួចរាល់ហើយ។`
            });
            return 0;
        }

        const promises = uniqueFinalValues.map(v => firebase.database().ref(`settings/${settingsPath}`).push(v));
        await Promise.all(promises);

        Swal.fire({
            icon: 'success',
            title: `ទាញយក${label}បានជោគជ័យ`,
            text: `បានបន្ថែម${label}ថ្មីចំនួន ${uniqueFinalValues.length} ចូលក្នុងប្រព័ន្ធ។`
        });

        return uniqueFinalValues.length;
    } catch (err) {
        console.error(`Error syncing ${settingsPath}:`, err);
        Swal.fire({ icon: 'error', title: 'បរាជ័យ', text: `មិនអាចទាញយកទិន្នន័យ${label}បានទេ` });
        return 0;
    }
}

/**
 * Sync All System Settings and Teachers from Students
 */
async function syncAllFromStudents() {
    const result = await Swal.fire({
        title: 'ធ្វើបច្ចុប្បន្នភាពទិន្នន័យពីសិស្ស?',
        text: "ប្រព័ន្ធនឹងទាញយក ឈ្មោះគ្រូ ម៉ោងសិក្សា កម្រិត ថ្នាក់ និងបន្ទប់ ពីទិន្នន័យសិស្សទាំងអស់។",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#8a0e5b',
        confirmButtonText: 'បាទ/ចាស ទាញយកទាំងអស់',
        cancelButtonText: 'បោះបង់'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'កំពុងទាញយកទិន្នន័យសរុប...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        // Sync Teachers first (as it has a more complex logic)
        await syncTeachersFromStudentsInner();

        // Sync other settings
        const results = await Promise.all([
            syncSystemSettingFromStudentsSilent('studyTimes', ['studyTime']),
            syncSystemSettingFromStudentsSilent('levels', ['studyLevel']),
            syncSystemSettingFromStudentsSilent('classes', ['classroom', 'grade']),
            syncSystemSettingFromStudentsSilent('classrooms', ['classroom']),
            syncSystemSettingFromStudentsSilent('studyTypes', ['studyType', 'courseType'])
        ]);

        const totalAdded = results.reduce((a, b) => a + b, 0);

        Swal.fire({
            icon: 'success',
            title: 'បច្ចុប្បន្នភាពជោគជ័យ',
            text: `រាល់ទិន្នន័យការកំណត់ប្រព័ន្ធត្រូវបានទាញយក និងធ្វើបច្ចុប្បន្នភាពរួចរាល់។ បានបន្ថែមសរុប ${totalAdded} ទិន្នន័យថ្មី។`,
            confirmButtonColor: '#8a0e5b'
        });
    } catch (error) {
        console.error("Error in syncAll:", error);
        Swal.fire({ icon: 'error', title: 'កំហុស', text: 'មានបញ្ហាក្នុងការទាញយកទិន្នន័យមួយចំនួន' });
    }
}

/**
 * Silent version for bulk sync
 */
async function syncSystemSettingFromStudentsSilent(settingsPath, studentFields) {
    try {
        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};
        const uniqueValues = new Set();
        Object.values(students).forEach(s => {
            studentFields.forEach(field => {
                const val = s[field];
                if (val && !['all', 'N/A', '', 'មិនមាន', '-'].includes(val)) {
                    if (typeof val === 'string' && val.includes(',')) {
                        val.split(',').forEach(v => { const trimmed = v.trim(); if (trimmed) uniqueValues.add(trimmed); });
                    } else { uniqueValues.add(val.toString().trim()); }
                }
            });
        });
        const masterSnap = await firebase.database().ref(`settings/${settingsPath}`).once('value');
        const masterData = masterSnap.val() || {};
        const masterValues = Object.values(masterData).map(v => (typeof v === 'object' && v !== null && v.time) ? v.time : v);
        const newValues = Array.from(uniqueValues).filter(v => !masterValues.includes(v));
        if (newValues.length > 0) {
            const promises = newValues.map(v => firebase.database().ref(`settings/${settingsPath}`).push(v));
            await Promise.all(promises);
        }
        return newValues.length;
    } catch (e) { return 0; }
}

/**
 * Internal version of syncTeachersFromStudents without UI blockers
 */
async function syncTeachersFromStudentsInner() {
    try {
        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};
        const teacherMap = {};

        Object.values(students).forEach(s => {
            const addToMap = (rawName) => {
                if (!rawName || typeof rawName !== 'string' || !rawName.trim()) return;
                const name = rawName.trim();
                const lowerName = name.toLowerCase();
                if (!teacherMap[lowerName]) {
                    teacherMap[lowerName] = { name: name, classes: new Set(), studyTimes: new Set(), levels: new Set() };
                }
                if (s.classroom) teacherMap[lowerName].classes.add(s.classroom);
                if (s.grade) teacherMap[lowerName].classes.add(s.grade);
                if (s.studyTime) teacherMap[lowerName].studyTimes.add(s.studyTime);
                if (s.studyLevel) teacherMap[lowerName].levels.add(s.studyLevel);
            };
            addToMap(s.teacherName);
            addToMap(s.homeroomTeacher);
        });

        const staffRef = firebase.database().ref('staff');
        const staffSnapshot = await staffRef.once('value');
        const currentStaff = staffSnapshot.val() || {};

        const findStaffKey = (name) => {
            return Object.keys(currentStaff).find(key =>
                (currentStaff[key].nameKhmer || '').toLowerCase() === name.toLowerCase()
            );
        };

        const updates = {};
        for (const { name: tName, classes: classesSet, studyTimes: timesSet, levels: levelsSet } of Object.values(teacherMap)) {
            const classesList = Array.from(classesSet).filter(c => c && c.trim()).join(', ');
            const studyTimesList = Array.from(timesSet).filter(t => t && t.trim()).join(', ');
            const levelsList = Array.from(levelsSet).filter(l => l && l.trim()).join(', ');

            const existingKey = findStaffKey(tName);
            if (existingKey) {
                let needsUp = false;
                if (classesList && currentStaff[existingKey].homeroomClass !== classesList) { updates[`${existingKey}/homeroomClass`] = classesList; needsUp = true; }
                if (levelsList && currentStaff[existingKey].level !== levelsList) { updates[`${existingKey}/level`] = levelsList; needsUp = true; }
                if (studyTimesList && currentStaff[existingKey].teachingHours !== studyTimesList) { updates[`${existingKey}/teachingHours`] = studyTimesList; needsUp = true; }
                if (needsUp) { } // Just marking
            } else {
                const newKey = staffRef.push().key;
                updates[newKey] = {
                    nameKhmer: tName,
                    position: 'គ្រូបង្រៀន',
                    homeroomClass: classesList,
                    level: levelsList,
                    teachingHours: studyTimesList,
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    notes: 'ទាញយកស្វ័យប្រវត្តិពីទិន្នន័យសិស្ស'
                };
            }
        }
        if (Object.keys(updates).length > 0) await staffRef.update(updates);
    } catch (e) { console.error(e); }
}

/**
 * Mark Student as Graduated (Copied from Data Tracking logic for consistency)
 */
window.markAsGraduated = async (key) => {
    // We need to fetch the student name for the modal
    try {
        const snap = await firebase.database().ref(`students/${key}`).once('value');
        const s = snap.val();
        if (!s) return;

        Swal.fire({
            title: '<h3 class="fw-bold mb-0">បញ្ចប់ការសិក្សា (Graduation)</h3>',
            html: `
                <div class="text-start p-2">
                    <p class="text-muted small mb-3">សូមបញ្ជាក់ព័ត៌មានលម្អិតសម្រាប់ការបញ្ចប់ការសិក្សារបស់សិស្ស <b>${s.lastName} ${s.firstName}</b></p>
                    <div class="mb-3">
                        <label class="form-label fw-bold small"><i class="fi fi-rr-calendar me-1"></i>កាលបរិច្ឆេទបញ្ចប់ (Graduation Date)</label>
                        <input type="date" id="gradDate" class="form-control form-control-lg rounded-3" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="mb-0">
                        <label class="form-label fw-bold small"><i class="fi fi-rr-comment-alt me-1"></i>កំណត់សម្គាល់ (Note/Remark)</label>
                        <textarea id="gradNote" class="form-control rounded-3" rows="3" placeholder="បញ្ចូលព័ត៌មានបន្ថែម ប្រសិនបើមាន..."></textarea>
                    </div>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fi fi-rr-check-circle me-2"></i>យល់ព្រមបញ្ចប់',
            cancelButtonText: 'បោះបង់',
            customClass: {
                popup: 'rounded-4 border-0 shadow-lg',
                title: 'text-success'
            },
            focusConfirm: false,
            preConfirm: () => {
                const date = document.getElementById('gradDate').value;
                const note = document.getElementById('gradNote').value;
                if (!date) {
                    Swal.showValidationMessage('សូមជ្រើសរើសកាលបរិច្ឆេទ!');
                    return false;
                }
                return { date, note };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'កំពុងរក្សាទុក...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });

                const { date, note } = result.value;
                const updates = {
                    enrollmentStatus: 'graduated',
                    graduatedDate: date,
                    graduationNote: note || '',
                    lastUpdated: new Date().toISOString()
                };

                // Also update remark if note is provided
                if (note) {
                    const oldRemark = s.remark || '';
                    updates.remark = (oldRemark ? oldRemark + '\n' : '') + `[បញ្ចប់ការសិក្សា ${date}]: ` + note;
                }

                firebase.database().ref(`students/${key}`).update(updates).then(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'ជោគជ័យ',
                        text: 'សិស្សត្រូវបានកំណត់ថាបានបញ្ចប់ការសិក្សារួចរាល់!',
                        timer: 2000,
                        showConfirmButton: false,
                        customClass: { popup: 'rounded-4' }
                    });

                    // Refresh current view if we're in the modal
                    if (typeof currentStudyTimeFilter !== 'undefined') {
                        viewStudentsInTime(currentStudyTimeFilter);
                    }
                }).catch((error) => {
                    Swal.fire('Error', error.message, 'error');
                });
            }
        });
    } catch (e) {
        console.error(e);
    }
};



