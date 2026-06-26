/**
 * teacher-portal-script.js
 * Manages the Teacher Portal Logic with Real-time Updates & Smart Editing
 */

let currentTeacher = null;
let currentTeacherData = null; // Store full teacher object
let allMyStudents = [];
let availableTeachers = [];
let addScoreModal = null;
let studentsUnsubscribe = null;
let currentStudentKey = null;
let historyModal = null;
let settingsModal = null;
let isSessionChecked = false;
let isRankingView = false;
let gradeChart = null;

// Periods State (Editable by user)
let scoringPeriods = [
    { code: '01', name: 'ខែធ្នូ', note: '1' },
    { code: '02', name: 'ខែមករា', note: '1' },
    { code: '03', name: 'ខែកុម្ភៈ', note: '1' },
    { code: '04', name: 'ខែឧសភា', note: '2' },
    { code: '05', name: 'ខែមិថុនា', note: '2' },
    { code: '06', name: 'ខែកក្កដា', note: '2' },
    { code: '07', name: 'ឆមាសទី១', note: '1' },
    { code: '08', name: 'ឆមាសទី២', note: '2' },
    { code: '09', name: 'ប្រចាំឆ្នាំសិក្សា', note: '2' },
    { code: '10', name: 'តេស្តដើមឆ្នាំ', note: '1' },
    { code: '11', name: 'តេស្តចុងឆ្នាំ', note: '2' }
];
let activePeriodIndex = 0; // Default to first period

// Initialize on Load
const khmerMonthNames = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const toKhmerDigits = (num) => {
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return num.toString().split('').map(digit => khmerDigits[digit] || digit).join('');
};

document.addEventListener('DOMContentLoaded', () => {
    const _addScoreEl = document.getElementById('addScoreModal');
    const _historyEl = document.getElementById('historyModal');
    const _settingsEl = document.getElementById('settingsModal');
    if (_addScoreEl) addScoreModal = bootstrap.Modal.getOrCreateInstance(_addScoreEl);
    if (_historyEl) historyModal = bootstrap.Modal.getOrCreateInstance(_historyEl);
    if (_settingsEl) settingsModal = bootstrap.Modal.getOrCreateInstance(_settingsEl);
    
    setupAutoCalculations();

    // Smart Date Picker Listener (New selects)
    const triggerCheck = () => {
        const m = document.getElementById('scoreMonthSelect').value;
        const y = document.getElementById('scoreYearSelect').value;
        const monthStr = `${y}-${m.padStart(2, '0')}`;
        document.getElementById('scoreMonth').value = monthStr;
        if (currentStudentKey) checkForExistingScore(currentStudentKey, monthStr);
    };

    if (document.getElementById('scoreMonthSelect')) {
        document.getElementById('scoreMonthSelect').addEventListener('change', triggerCheck);
    }
    if (document.getElementById('scoreYearSelect')) {
        document.getElementById('scoreYearSelect').addEventListener('change', triggerCheck);
    }
    if (document.getElementById('programLoginSelect')) {
        document.getElementById('programLoginSelect').addEventListener('change', filterTeachersByProgramLogin);
    }

    // Wait for Auth state to resolve before requesting database data
    let isInitialized = false;
    firebase.auth().onAuthStateChanged((user) => {
        if (isInitialized) return;
        isInitialized = true;

        // Subscribe to Settings from Firebase
        subscribeToSettings();

        // Check for existing session
        checkTeacherSession();
        
        loadTeachers();
    });
});

function updateProgramDisplay() {
    if (!currentTeacherData || !currentTeacherData.program) return;
    
    let programName = '-';
    if (currentTeacherData.program === 'chinese') programName = 'ចិនពេញម៉ោង';
    else if (currentTeacherData.program === 'general') programName = 'ចំណេះដឹងទូទៅ';
    else if (currentTeacherData.program === 'all') programName = 'គ្រប់កម្មវិធី';

    const menuDisplay = document.getElementById('selectedProgramNameMenu');
    const portalDisplay = document.getElementById('selectedProgramNamePortal');
    const statsDisplay = document.getElementById('selectedProgramNameStats');
    const titleDisplay = document.getElementById('selectedProgramNameTitle');
    
    if (menuDisplay) menuDisplay.innerText = programName;
    if (portalDisplay) portalDisplay.innerText = programName;
    if (statsDisplay) statsDisplay.innerText = programName;
    if (titleDisplay) titleDisplay.innerText = programName;
}

// Session Management
function checkTeacherSession() {
    const session = localStorage.getItem('teacher_session');
    if (session) {
        try {
            const data = JSON.parse(session);
            currentTeacher = data.name;
            currentTeacherData = data;
            
            // Auto-login
            document.getElementById('loggedInTeacherName').innerText = currentTeacher;
            const nameMenu = document.getElementById('loggedInTeacherNameMenu');
            if (nameMenu) nameMenu.innerText = currentTeacher;

            document.getElementById('loginSection').classList.add('d-none');
            document.getElementById('menuSection').classList.remove('d-none');
            
            // Set Active Period in Menu
            updateMenuPeriodDisplay();

            // Wait for teachers to load to get full data
            setTimeout(() => {
                const fullData = availableTeachers.find(t => t.nameKhmer === currentTeacher);
                if (fullData) {
                    currentTeacherData = { ...currentTeacherData, ...fullData };
                    updateTeacherProfileUI();
                }
            }, 2000);

            updateProgramDisplay();
            subscribeToMyStudents();
        } catch (e) {
            console.error("Session error", e);
            localStorage.removeItem('teacher_session');
        }
    }
    isSessionChecked = true;
}

// Check if current user is admin/superadmin to bypass redirect
async function checkIsAdmin() {
    return new Promise((resolve) => {
        const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
            unsubscribe(); // Clean up listener immediately
            if (!user) {
                resolve(false);
                return;
            }
            try {
                const adminEmail = window.ADMIN_EMAIL || 'admin@school.com';
                const superAdminEmails = window.SUPER_ADMIN_EMAILS || [adminEmail];
                if (superAdminEmails.includes(user.email)) {
                    resolve(true);
                    return;
                }
                
                const snapshot = await firebase.database().ref('users/' + user.uid).once('value');
                const userData = snapshot.val() || {};
                const userRole = (userData.role || '').toLowerCase();
                const isAdmin = userRole === 'admin' || userData.isAdmin === true;
                resolve(isAdmin);
            } catch (e) {
                console.error("Error checking admin role:", e);
                resolve(false);
            }
        });
    });
}

// 1. Load Teachers for Login Dropdown
async function loadTeachers() {
    try {
        const snapshot = await firebase.database().ref('staff').once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            const staffList = Object.values(data);

            // Filter only teachers and store them globally
            availableTeachers = staffList.filter(s => {
                const pos = (s.position || s.positionName || '').toString().toLowerCase();
                const isTeacher = pos.includes('គ្រូ') || pos.includes('teacher');
                return isTeacher;
            }).sort((a, b) => (a.nameKhmer || '').localeCompare(b.nameKhmer || ''));
            
            // Initial population
            filterTeachersByProgramLogin();
        }
    } catch (error) {
        console.error("Error loading teachers:", error);
        if (error.message.includes('permission_denied')) {
            const isAdmin = await checkIsAdmin();
            if (isAdmin) {
                console.warn("Permission denied for admin. Bypassing Swal block.");
                return;
            }
            
            Swal.fire({
                title: 'ការចូលប្រើត្រូវបានបដិសេធ',
                text: 'សូមចូលប្រើប្រាស់គណនីបុគ្គលិកជាមុនសិន ទើបអាចប្រើប្រាស់ផ្នែកនេះបាន។',
                icon: 'lock',
                confirmButtonText: 'ទៅកាន់ទំព័រ Login',
                showCancelButton: true
            }).then((result) => {
                if (result.isConfirmed) window.location.href = '/login.html';
            });
        } else {
            Swal.fire('បញ្ហា', 'បរាជ័យក្នុងការទាញយកឈ្មោះគ្រូ', 'error');
        }
    }
}

function filterTeachersByProgramLogin() {
    const selectedProgram = document.getElementById('programLoginSelect').value;
    const teacherSelect = document.getElementById('teacherSelect');
    if (!teacherSelect) return;
    
    teacherSelect.innerHTML = '<option value="" disabled selected>ជ្រើសរើសឈ្មោះ (Select Name)</option>';

    const filtered = availableTeachers.filter(t => {
        if (selectedProgram === 'all') return true;
        
        const pos = (t.position || t.positionName || '').toString().toLowerCase();
        const desc = (t.remarks || t.details || '').toString().toLowerCase();
        
        const isCh = pos.includes('ចិន') || pos.includes('chinese') || desc.includes('ចិន') || desc.includes('chinese');
        
        if (selectedProgram === 'chinese') return isCh;
        if (selectedProgram === 'general') return !isCh;
        return true;
    });

    filtered.forEach(t => {
        const option = document.createElement('option');
        option.value = t.nameKhmer;
        option.textContent = `${t.nameKhmer} ${t.nameChinese ? '(' + t.nameChinese + ')' : ''}`;
        teacherSelect.appendChild(option);
    });
}

// 2. Handle Login
function handleLogin(e) {
    e.preventDefault();
    const name = document.getElementById('teacherSelect').value;
    const pin = document.getElementById('teacherPin').value;

    if (!name || !pin) {
        return Swal.fire('ការរំលឹក', 'សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់', 'warning');
    }

    // Verify PIN against teacher's profile
    const teacherProfile = availableTeachers.find(t => t.nameKhmer === name);
    if (!teacherProfile) {
        return Swal.fire('បញ្ហា', 'រកមិនឃើញឈ្មោះគ្រូនេះទេ', 'error');
    }
    
    const correctPin = teacherProfile.pin || '2024';

    if (pin !== correctPin) {
        return Swal.fire('បញ្ហា', 'លេខកូដសម្ងាត់មិនត្រឹមត្រូវ', 'error');
    }

    currentTeacher = name;
    currentTeacherData = { ...teacherProfile, program: document.getElementById('programLoginSelect').value };
    
    // Save session
    localStorage.setItem('teacher_session', JSON.stringify({
        name: name,
        id: teacherProfile.staffId || '',
        program: document.getElementById('programLoginSelect').value,
        loginTime: new Date().toISOString()
    }));

    document.getElementById('loggedInTeacherName').innerText = name;
    const nameMenu = document.getElementById('loggedInTeacherNameMenu');
    if (nameMenu) nameMenu.innerText = name;

    // Switch Views to MENU first
    document.getElementById('loginSection').classList.add('d-none');
    document.getElementById('menuSection').classList.remove('d-none');
    document.getElementById('menuSection').classList.add('animate__animated', 'animate__fadeIn');
    
    // Set Active Period in Menu
    updateMenuPeriodDisplay();

    // Load Data Real-time
    subscribeToMyStudents();
    
    // Update Profile Image in Navbar if exists
    updateTeacherProfileUI();
    updateProgramDisplay();
    
    Swal.fire({
        icon: 'success',
        title: 'ស្វាគមន៍',
        text: `សួស្តី លោកគ្រូ/អ្នកគ្រូ ${name}`,
        timer: 1500,
        showConfirmButton: false
    });
}

function logout() {
    Swal.fire({
        title: 'ចាកចេញ?',
        text: "តើអ្នកពិតជាចង់ចាកចេញមែនទេ?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ចាកចេញ',
        cancelButtonText: 'បោះបង់'
    }).then((result) => {
        if (result.isConfirmed) {
            // Detach listener
            if (studentsUnsubscribe) {
                firebase.database().ref('students').off('value', studentsUnsubscribe);
            }
            
            localStorage.removeItem('teacher_session');
            currentTeacher = null;
            currentTeacherData = null;
            allMyStudents = [];
            
            if (gradeChart) {
                gradeChart.destroy();
                gradeChart = null;
            }
            
            document.getElementById('loginForm').reset();
            document.getElementById('portalSection').classList.add('d-none');
            document.getElementById('menuSection').classList.add('d-none');
            document.getElementById('loginSection').classList.remove('d-none');
        }
    });
}

// 2.5 Menu Navigation
window.showMenu = () => {
    document.getElementById('portalSection').classList.add('d-none');
    document.getElementById('menuSection').classList.remove('d-none');
    document.getElementById('menuSection').classList.add('animate__animated', 'animate__fadeIn');
    window.scrollTo({top: 0, behavior: 'smooth'});
}

window.showStudentList = () => {
    document.getElementById('menuSection').classList.add('d-none');
    document.getElementById('portalSection').classList.remove('d-none');
    document.getElementById('portalSection').classList.add('animate__animated', 'animate__fadeIn');
    
    // Show stats and list, hide ranking
    document.getElementById('inputScoreView').classList.remove('d-none');
    document.getElementById('studentListView').classList.remove('d-none');
    document.getElementById('topStudentsSection').classList.add('d-none');
    isRankingView = false;
    
    // Update breadcrumb
    const breadcrumbActive = document.querySelector('.breadcrumb-item.active');
    if (breadcrumbActive) breadcrumbActive.innerText = 'បញ្ចូលពិន្ទុសិស្ស';

    // Auto-select correct month in portal if applicable
    syncPortalMonthWithSettings();
    
    window.scrollTo({top: 0, behavior: 'smooth'});
}

window.showRanking = () => {
    // Check if we have top students first
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    
    const topStudents = allMyStudents.filter(s => {
        if (!s.academicRecords) return false;
        const record = s.academicRecords.find(r => r.year == year && r.month == month);
        return record && record.rank && parseInt(record.rank) >= 1 && parseInt(record.rank) <= 5;
    });

    if (topStudents.length === 0) {
        return Swal.fire({
            icon: 'info',
            title: 'មិនទាន់មានទិន្នន័យ',
            text: 'មិនទាន់មានទិន្នន័យចំណាត់ថ្នាក់សម្រាប់ខែនេះនៅឡើយទេ សូមបញ្ចូលពិន្ទុសិស្សជាមុនសិន។',
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#8a0e5b'
        });
    }

    // Show portal section first
    document.getElementById('menuSection').classList.add('d-none');
    document.getElementById('portalSection').classList.remove('d-none');
    document.getElementById('portalSection').classList.add('animate__animated', 'animate__fadeIn');
    
    // Hide stats and list, show ranking only
    document.getElementById('inputScoreView').classList.add('d-none');
    document.getElementById('studentListView').classList.add('d-none');
    document.getElementById('topStudentsSection').classList.remove('d-none');
    isRankingView = true;
    
    // Refresh ranking data
    updateTopStudents(year, month);
    
    // Update breadcrumb
    const breadcrumbActive = document.querySelector('.breadcrumb-item.active');
    if (breadcrumbActive) breadcrumbActive.innerText = 'ចំណាត់ថ្នាក់សិស្សឆ្នើម';

    window.scrollTo({top: 0, behavior: 'smooth'});
}

// 2.6 Settings Functions (Firebase Dynamic)
function subscribeToSettings() {
    firebase.database().ref('settings/teacherPortal').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            scoringPeriods = data.periods || scoringPeriods;
            activePeriodIndex = data.activeIndex !== undefined ? data.activeIndex : activePeriodIndex;
            
            // Update UI immediately
            updateMenuPeriodDisplay();
            if (settingsModal && document.getElementById('settingsModal').classList.contains('show')) {
                renderSettingsTable();
            }
        }
    }, (error) => {
        console.error("Settings Sync Error:", error);
    });
}

function updateMenuPeriodDisplay() {
    const monthDisplay = document.getElementById('currentMonthDisplay');
    if (monthDisplay && scoringPeriods[activePeriodIndex]) {
        monthDisplay.innerText = scoringPeriods[activePeriodIndex].name;
    }
}

function syncPortalMonthWithSettings() {
    if (!scoringPeriods[activePeriodIndex]) return;
    const activeP = scoringPeriods[activePeriodIndex];
    // Map period name to month number
    const monthIdx = khmerMonthNames.findIndex(m => activeP.name.includes(m));
    if (monthIdx !== -1) {
        const monthSelect = document.getElementById('scoreMonthSelect');
        if (monthSelect) monthSelect.value = (monthIdx + 1).toString();
    }
}

window.openSettings = () => {
    renderSettingsTable();
    settingsModal.show();
}

function renderSettingsTable() {
    const tbody = document.querySelector('#settingsPeriodTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    scoringPeriods.forEach((p, index) => {
        const isActive = index === activePeriodIndex;
        const row = document.createElement('tr');
        row.className = `settings-row ${isActive ? 'active' : ''}`;
        
        row.innerHTML = `
            <td class="ps-4 py-3 align-middle">
                <span class="period-code-badge">${p.code}</span>
            </td>
            <td class="py-2 align-middle">
                <input type="text" class="period-input-standard fw-bold" 
                       value="${p.name}" onchange="updateLocalPeriodValue(${index}, 'name', this.value)"
                       placeholder="ឈ្មោះខែ ឬវគ្គប្រឡង...">
            </td>
            <td class="text-center py-2 align-middle">
                <select class="form-select form-select-sm border-0 bg-light mx-auto" style="width: 75px; border-radius: 8px;"
                        onchange="updateLocalPeriodValue(${index}, 'note', this.value)">
                    <option value="1" ${p.note == '1' ? 'selected' : ''}>1</option>
                    <option value="2" ${p.note == '2' ? 'selected' : ''}>2</option>
                </select>
            </td>
            <td class="text-end pe-4 py-2 align-middle">
                <div class="d-flex justify-content-end align-items-center gap-2">
                    ${isActive ? 
                        `<span class="period-active-badge"><i class="fi fi-rr-check-circle"></i> សកម្ម</span>` : 
                        `<button class="btn btn-sm btn-outline-success rounded-pill px-3 py-1" style="font-size: 0.75rem;"
                                 onclick="activatePeriod(${index})">ជ្រើសរើស</button>`
                    }
                    <button class="btn btn-sm btn-light rounded-circle text-danger ms-2" 
                            style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;"
                            onclick="deletePeriod(${index})" title="លុប">
                        <i class="fi fi-rr-trash" style="font-size: 0.8rem;"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.updateLocalPeriodValue = (index, key, value) => {
    scoringPeriods[index][key] = value;
}

window.activatePeriod = (index) => {
    activePeriodIndex = index;
    renderSettingsTable();
}

window.addNewPeriod = () => {
    const nextCode = (scoringPeriods.length + 1).toString().padStart(2, '0');
    scoringPeriods.push({ code: nextCode, name: 'ខែថ្មី', note: '1' });
    renderSettingsTable();
}

window.deletePeriod = (index) => {
    if (scoringPeriods.length <= 1) return;
    scoringPeriods.splice(index, 1);
    if (activePeriodIndex >= scoringPeriods.length) activePeriodIndex = 0;
    renderSettingsTable();
}

window.saveActivePeriod = async () => {
    try {
        await firebase.database().ref('settings/teacherPortal').set({
            periods: scoringPeriods,
            activeIndex: activePeriodIndex,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP,
            updatedBy: currentTeacher
        });
        
        settingsModal.hide();
        
        Swal.fire({
            icon: 'success',
            title: 'រក្សាទុកបានជោគជ័យ',
            text: 'ការកំណត់ត្រូវបានធ្វើបច្ចុប្បន្នភាពសម្រាប់គ្រប់គ្រូទាំងអស់',
            timer: 1500,
            showConfirmButton: false
        });
    } catch (error) {
        console.error("Save settings error", error);
        Swal.fire('បញ្ហា', 'មិនអាចរក្សាទុកការកំណត់បានទេ: ' + error.message, 'error');
    }
}

// 3. Load & Filter Students (Real-time)
function subscribeToMyStudents() {
    const container = document.getElementById('studentListContainer');
    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-pink-dark"></div>
            <div class="mt-2 text-muted">កំពុងទាញយកទិន្នន័យសិស្ស...</div>
        </div>
    `;

    // Use .on() for real-time updates
    const studentsRef = firebase.database().ref('students');
    studentsUnsubscribe = studentsRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            allMyStudents = [];
            renderStudents();
            return;
        }

        const data = snapshot.val();
        // Convert to array and filter by teacher name
        allMyStudents = Object.entries(data).map(([key, s]) => ({ ...s, key }))
            .filter(s => s.teacherName === currentTeacher);

        // Update Filters & UI
        populateTimeFilter();
        renderStudents();
        updateDashboardStats();
        
        // Update Footer Timestamp
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const lastUpdateEl = document.getElementById('last-update-time');
        if (lastUpdateEl) lastUpdateEl.innerText = timeStr;
        
    }, (error) => {
        console.error("Error loading students:", error);
        container.innerHTML = `<div class="col-12 text-center text-danger">មានបញ្ហាក្នុងការទាញយកទិន្នន័យ</div>`;
    });
}

function updateTeacherProfileUI() {
    const btn = document.getElementById('navUserDropdownBtn');
    if (!btn) return;

    if (currentTeacherData && currentTeacherData.imageUrl) {
        btn.innerHTML = `<img src="${currentTeacherData.imageUrl}" class="rounded-circle" style="width: 38px; height: 38px; object-fit: cover; border: 2px solid white;">`;
        btn.classList.remove('p-1');
        btn.classList.add('p-0');
    } else {
        btn.innerHTML = `<i class="fi fi-rr-user text-primary p-2 d-block"></i>`;
        btn.classList.remove('p-0');
        btn.classList.add('p-1');
    }
}

function populateTimeFilter() {
    const currentSelection = document.getElementById('filterTime').value;
    const times = [...new Set(allMyStudents.map(s => s.studyTime).filter(Boolean))].sort();
    const select = document.getElementById('filterTime');
    select.innerHTML = '<option value="">ម៉ោងសិក្សាទាំងអស់</option>';
    times.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        select.appendChild(opt);
    });
    if (times.includes(currentSelection)) select.value = currentSelection;
}

// 4. Render Student List
function renderStudents() {
    const container = document.getElementById('studentListContainer');
    const searchTerm = document.getElementById('searchStudent').value.toLowerCase();
    const filterTime = document.getElementById('filterTime').value;
    const filterStatus = document.getElementById('filterStatus').value;
    const filterProgram = document.getElementById('filterProgram').value;

    const filtered = allMyStudents.filter(s => {
        const searchMatch = (
            (s.firstName || '').toLowerCase().includes(searchTerm) ||
            (s.lastName || '').toLowerCase().includes(searchTerm) ||
            (s.englishFirstName || '').toLowerCase().includes(searchTerm) ||
            (s.englishLastName || '').toLowerCase().includes(searchTerm) ||
            (s.displayId || '').includes(searchTerm)
        );
        const timeMatch = !filterTime || s.studyTime === filterTime;
        const isActive = s.enrollmentStatus !== 'dropout' && s.enrollmentStatus !== 'suspend';
        
        let statusMatch = true;
        if (filterStatus === 'active') statusMatch = isActive;
        else if (filterStatus === 'dropout') statusMatch = !isActive;
        else if (filterStatus === 'top5') {
            const today = new Date();
            const curY = today.getFullYear();
            const curM = today.getMonth() + 1;
            const record = s.academicRecords && s.academicRecords.find(r => r.year == curY && r.month == curM);
            const rankNum = record ? parseInt(record.rank) : 0;
            statusMatch = rankNum >= 1 && rankNum <= 5;
        }

        // Program Filter Logic
        const prog = (s.studyType || s.courseType || '').toLowerCase();
        const p_isChineseFullTime = prog.includes('chinese-fulltime') || prog.includes('cfulltime') || prog.includes('ចិនពេញម៉ោង');
        const p_type = p_isChineseFullTime ? 'chinese-fulltime' : 'general';
        const programMatch = filterProgram === 'all' || p_type === filterProgram;

        return searchMatch && timeMatch && statusMatch && programMatch;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="opacity-25 mb-3" style="font-size: 5rem;"><i class="fi fi-rr-search"></i></div>
                <h5 class="text-muted">រកមិនឃើញសិស្ស (No Students Found)</h5>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(s => {
        const isDropout = s.enrollmentStatus === 'dropout';
        const isSuspended = s.enrollmentStatus === 'suspend';
        const today = new Date();
        const curY = today.getFullYear();
        const curM = today.getMonth() + 1;

        let latestRank = '-';
        if (s.academicRecords && Array.isArray(s.academicRecords) && s.academicRecords.length > 0) {
            const sorted = [...s.academicRecords].sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });
            latestRank = sorted[0].rank || '-';
        }

        const isScored = s.academicRecords && Array.isArray(s.academicRecords) &&
            s.academicRecords.some(r => r.year == curY && r.month == curM);

        return `
        <div class="col-md-6 col-lg-4 animate-fade-in-up">
            <div class="student-item-card h-100 ${isScored ? 'bg-light border-success border-opacity-10' : ''}">
                <div class="d-flex align-items-center mb-4">
                    <div class="flex-shrink-0 me-3">
                        ${s.imageUrl ? 
                            `<img src="${s.imageUrl}" class="student-avatar" alt="Student">` : 
                            `<div class="student-avatar bg-gradient-primary text-white d-flex align-items-center justify-content-center fw-bold" style="background: var(--primary-gradient); font-size: 1.2rem;">${(s.lastName || '?')[0]}${(s.firstName || '')[0] || ''}</div>`
                        }
                    </div>
                    <div class="flex-grow-1 overflow-hidden">
                        <h6 class="khmer-muol text-primary mb-0 text-truncate">${s.lastName || ''} ${s.firstName || ''}</h6>
                        <div class="text-muted small text-truncate fw-medium">${s.englishLastName || ''} ${s.englishFirstName || ''}</div>
                    </div>
                    <div class="text-end">
                        <span class="status-badge ${isDropout ? 'dropout' : 'active'}">
                            ${isDropout ? 'ឈប់រៀន' : 'កំពុងរៀន'}
                        </span>
                    </div>
                </div>

                <div class="row g-2 mb-4">
                    <div class="col-6">
                        <div class="bg-light p-2 rounded-3 text-center">
                            <div class="small text-muted opacity-75" style="font-size: 0.65rem;">ម៉ោងសិក្សា</div>
                            <div class="small fw-bold text-dark">${s.studyTime || '-'}</div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="bg-light p-2 rounded-3 text-center">
                            <div class="small text-muted opacity-75" style="font-size: 0.65rem;">ចំណាត់ថ្នាក់</div>
                            <div class="small fw-bold text-warning">${latestRank}</div>
                        </div>
                    </div>
                </div>

                <div class="d-flex align-items-center justify-content-between pt-3 border-top">
                    <div>
                        ${isScored
                ? '<div class="scored-badge yes"><i class="fi fi-rr-check-circle"></i> ដាក់រួចហើយ</div>'
                : '<div class="scored-badge no"><i class="fi fi-rr-clock"></i> នៅសល់</div>'}
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-light btn-sm rounded-pill px-3 fw-bold" onclick="viewStudentHistory('${s.key}')">
                            <i class="fi fi-rr-list-check me-1"></i> ប្រវត្តិ
                        </button>
                        <button class="btn ${isScored ? 'btn-outline-primary' : 'btn-primary'} btn-sm rounded-pill px-3 fw-bold" 
                            onclick="openScoreModal('${s.key}')" ${(isDropout || isSuspended) ? 'disabled' : ''}>
                            <i class="fi ${isScored ? 'fi-rr-refresh' : 'fi-rr-edit-alt'}"></i> ${isScored ? 'កែប្រែ' : 'ដាក់ពិន្ទុ'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function filterStudents() {
    renderStudents();
}

function updateDashboardStats() {
    const total = allMyStudents.length;
    animateCounter('totalStudentsCount', total);

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    // Update Dashboard Label with Khmer Month
    const progressLabel = document.querySelector('#portalSection p.text-muted.small.mb-0');
    if (progressLabel) {
        progressLabel.innerHTML = `ការដាក់ពិន្ទុសម្រាប់ខែ <span class="text-primary fw-bold">${khmerMonthNames[currentMonth - 1]}</span> ឆ្នាំ <span class="text-primary fw-bold">${toKhmerDigits(currentYear)}</span>`;
    }

    let scored = 0;
    allMyStudents.forEach(s => {
        if (s.academicRecords && Array.isArray(s.academicRecords)) {
            const hasScore = s.academicRecords.some(r => r.year == currentYear && r.month == currentMonth);
            if (hasScore) scored++;
        }
    });

    const remaining = total - scored;
    const percent = total > 0 ? Math.round((scored / total) * 100) : 0;

    animateCounter('scoredCount', scored);
    animateCounter('remainingCount', remaining);
    
    const percentEl = document.getElementById('scoredPercent');
    if (percentEl) {
        percentEl.innerText = percent + '%';
    }

    const progressBar = document.getElementById('scoringProgressBar');
    if (progressBar) {
        progressBar.style.width = percent + '%';
        // Change color based on progress
        if (percent >= 100) progressBar.className = "progress-bar bg-success progress-bar-striped progress-bar-animated";
        else if (percent >= 50) progressBar.className = "progress-bar bg-primary progress-bar-striped progress-bar-animated";
        else progressBar.className = "progress-bar bg-warning progress-bar-striped progress-bar-animated";
    }

    updateTopStudents(currentYear, currentMonth);

    // Calculate Grade Distribution
    let gradeCounts = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0 };
    allMyStudents.forEach(s => {
        if (s.academicRecords && Array.isArray(s.academicRecords)) {
            const record = s.academicRecords.find(r => r.year == currentYear && r.month == currentMonth);
            if (record && record.grade) {
                const g = (record.grade || 'F').toString().toUpperCase();
                if (gradeCounts[g] !== undefined) {
                    gradeCounts[g]++;
                }
            }
        }
    });
    updateGradeDistributionChart(gradeCounts);
}

function updateGradeDistributionChart(gradeCounts) {
    const ctx = document.getElementById('gradeDistributionChart');
    if (!ctx) return;

    const dataValues = [
        gradeCounts['A'],
        gradeCounts['B'],
        gradeCounts['C'],
        gradeCounts['D'],
        gradeCounts['E'],
        gradeCounts['F']
    ];

    // If chart instance exists, just update its data values
    if (gradeChart) {
        gradeChart.data.datasets[0].data = dataValues;
        gradeChart.update();
        return;
    }

    // Create a new Chart.js bar chart
    gradeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['A', 'B', 'C', 'D', 'E', 'F'],
            datasets: [{
                label: 'ចំនួនសិស្ស (Students)',
                data: dataValues,
                backgroundColor: [
                    'rgba(40, 167, 69, 0.75)',  // A - Green
                    'rgba(40, 167, 69, 0.55)',  // B - Light Green
                    'rgba(0, 123, 255, 0.75)',  // C - Blue
                    'rgba(0, 123, 255, 0.55)',  // D - Light Blue
                    'rgba(255, 193, 7, 0.75)',   // E - Yellow
                    'rgba(220, 53, 69, 0.75)'    // F - Red
                ],
                borderColor: [
                    '#28a745',
                    'rgba(40, 167, 69, 0.8)',
                    '#007bff',
                    'rgba(0, 123, 255, 0.8)',
                    '#ffc107',
                    '#dc3545'
                ],
                borderWidth: 1.5,
                borderRadius: 4,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` សិស្ស: ${context.parsed.y} នាក់`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        color: '#64748b',
                        font: { size: 9 }
                    },
                    grid: { color: 'rgba(0,0,0,0.03)' }
                },
                x: {
                    ticks: {
                        color: '#475569',
                        font: { size: 10, weight: 'bold' }
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

function updateTopStudents(year, month) {
    const topGrid = document.getElementById('honorRollContent');
    const topSection = document.getElementById('topStudentsSection');
    const container = document.getElementById('honorRollContainer');
    if (!topGrid || !topSection) return;

    // Update Ranking Background Image based on Program
    if (container && currentTeacherData) {
        const program = currentTeacherData.program;
        const position = (currentTeacherData.position || '').toLowerCase();
        const studyType = (currentTeacherData.studyType || '').toLowerCase();
        
        // Detect if General program
        const isGeneral = program === 'general' ||
                          position.includes('ទូទៅ') ||
                          position.includes('general') ||
                          studyType.includes('general') ||
                          studyType.includes('three-languages');

        if (isGeneral) {
            container.style.backgroundImage = "url('/img/General Knowledge.png')";
        } else {
            // Default to Chinese Full-time as the primary program background
            container.style.backgroundImage = "url('/img/Chinese Full-time.png')";
        }
    }

    // Find students with rank 1-5 in the specified month
    const topStudents = allMyStudents.filter(s => {
        if (!s.academicRecords) return false;
        const record = s.academicRecords.find(r => r.year == year && r.month == month);
        if (!record || !record.rank) return false;
        const rankNum = parseInt(record.rank);
        return rankNum >= 1 && rankNum <= 5;
    }).map(s => {
        const record = s.academicRecords.find(r => r.year == year && r.month == month);
        return { ...s, currentRank: parseInt(record.rank), currentAvg: record.averageScore };
    }).sort((a, b) => a.currentRank - b.currentRank);

    if (topStudents.length === 0) {
        topSection.classList.add('d-none');
        return;
    }

    if (isRankingView) {
        topSection.classList.remove('d-none');
    }
    topGrid.innerHTML = topStudents.map(s => `
        <div class="honor-student-slot slot-rank-${s.currentRank} animate__animated animate__zoomIn" style="animation-delay: ${s.currentRank * 0.1}s">
            <div class="position-relative w-100 h-100">
                ${s.imageUrl ? 
                    `<img src="${s.imageUrl}" class="honor-student-photo" alt="Student">` : 
                    `<div class="honor-student-photo d-flex align-items-center justify-content-center fw-bold text-primary bg-white" style="font-size: 1rem;">${(s.lastName || '?')[0]}${(s.firstName || '')[0] || ''}</div>`
                }
                <div class="honor-student-info">
                    <p class="honor-student-name">${s.lastName} ${s.firstName}</p>
                    <span class="honor-student-score">${Number(s.currentAvg).toFixed(2)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

window.downloadHonorRoll = () => {
    const element = document.getElementById('honorRollContainer');
    if (!element) return;
    
    Swal.fire({
        title: 'កំពុងរៀបចំទាញយក...',
        text: 'សូមរង់ចាំមួយភ្លែត',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // We use a simple trick to print/save as image if html2canvas is not available
    // For now, let's just suggest using the browser's save image or print.
    // Ideally we would use html2canvas, but I'll check if it's imported.
    setTimeout(() => {
        Swal.fire({
            icon: 'info',
            title: 'របៀបទាញយក',
            text: 'សូមចុចកណ្តុរខាងស្តាំលើរូបភាព ហើយជ្រើសរើស "Save Image As" ឬប្រើមុខងារ Print របស់ Browser។',
            confirmButtonText: 'យល់ព្រម'
        });
    }, 1500);
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    
    const start = parseInt(el.innerText) || 0;
    const duration = 1000;
    let startTime = null;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const current = Math.floor(progress * (target - start) + start);
        el.innerText = current;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            el.innerText = target;
        }
    }
    window.requestAnimationFrame(step);
}

// 5. Score Logic
function openScoreModal(key) {
    currentStudentKey = key;
    const s = allMyStudents.find(st => st.key === key);
    if (!s) return;

    document.getElementById('modalStudentName').innerText = `${s.lastName || ''} ${s.firstName || ''}`;
    document.getElementById('modalStudentId').innerText = `អត្តលេខ: ${toKhmerDigits(s.displayId)}`;
    document.getElementById('modalStudentKey').value = key;

    // Update avatar in modal
    const avatarContainer = document.getElementById('modalStudentAvatarContainer');
    if (s.imageUrl) {
        avatarContainer.innerHTML = `<img src="${s.imageUrl}" class="student-avatar" style="width: 80px; height: 80px;">`;
    } else {
        avatarContainer.innerHTML = `
            <div class="bg-white p-3 rounded-circle shadow-sm">
                <i class="fi fi-rr-user text-primary fs-2"></i>
            </div>
        `;
    }

    // Default to current month
    const today = new Date();
    const curY = today.getFullYear();
    const curM = today.getMonth() + 1;

    document.getElementById('scoreMonthSelect').value = curM;
    document.getElementById('scoreYearSelect').value = curY;

    const monthStr = `${curY}-${String(curM).padStart(2, '0')}`;
    document.getElementById('scoreMonth').value = monthStr;

    // Detect Program Type for calculation logic
    const program = (s.studyType || s.courseType || '').toLowerCase();
    const isChineseFullTime = program.includes('chinese-fulltime') || program.includes('cfulltime') || program.includes('ចិនពេញម៉ោង');
    
    // Subject Mapping
    const chineseLabels = ["សប្តាហ៍១", "សប្តាហ៍២", "ប្រចាំខែ", "ស្តាប់", "និយាយ", "អាន", "សុជីវធម៌", "អវត្តមាន", "កិច្ចការផ្ទះ", "ច្រៀង", "HSK", "", ""];
    const generalLabels = [
        "សរសេរតាមអាន (Dictation)", "សមត្ថភាពសរសេរ (Writing)", "សមត្ថភាពអាន (Reading)", "សមត្ថភាពនិយាយ (Speaking)", 
        "ចំនួន (Numbers)", "រង្វាស់រង្វាល់ (Measurement)", "ធរណីមាត្រ (Geometry)", "ពិជគណិត (Algebra)", 
        "វិទ្យាសាស្ត្រ (Science)", "សិក្សាសង្គម (Social Studies)", "អប់រំកាយ-កីឡា (PE-Sports)", "សុខភាព-អនាម័យ (Health-Hygiene)", "សិល្បៈ (Arts)"
    ];
    
    const subjectKeysCH = ['scoreWeek01','scoreWeek02','scoreMonthly','scoreListening','scoreSpeaking','scoreReading','scoreEthics','scoreAttendance','scoreHomework','scoreSinging','scoreHSK'];
    const subjectKeysGK = ['scoreWeek01','scoreWeek02','scoreMonthly','scoreListening','scoreSpeaking','scoreReading','scoreEthics','scoreAttendance','scoreHomework','scoreSinging','scoreHSK','scoreExtra01','scoreExtra02'];
    
    const subjectIds = ['scoreWeek01','scoreWeek02','scoreMonthly','scoreListening','scoreSpeaking','scoreReading','scoreEthics','scoreAttendance','scoreHomework','scoreSinging','scoreHSK','scoreExtra01','scoreExtra02'];
    
    // Apply Labels & Visibility
    subjectIds.forEach((id, index) => {
        const input = document.getElementById(id);
        const container = input.closest('.col-6') || input.parentElement;
        const label = container.querySelector('.score-input-label');
        
        if (isChineseFullTime) {
            const chName = chineseLabels[index];
            if (chName) {
                label.innerText = chName;
                container.style.display = 'block';
                input.disabled = false;
            } else {
                container.style.display = 'none';
                input.value = 0;
                input.disabled = true;
            }
        } else {
            const genName = generalLabels[index];
            if (genName) {
                label.innerText = genName;
                container.style.display = 'block';
                input.disabled = false;
            } else {
                container.style.display = 'none';
                input.value = 0;
                input.disabled = true;
            }
        }
    });

    const modalElement = document.getElementById('addScoreModal');
    modalElement.setAttribute('data-student-program', isChineseFullTime ? 'chinese-fulltime' : 'general');

    checkForExistingScore(key, monthStr);
    addScoreModal.show();
}

function checkForExistingScore(studentKey, monthStr) {
    const student = allMyStudents.find(s => s.key === studentKey);
    const [yearStr, monthStrVal] = monthStr.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStrVal);

    if (!student || !student.academicRecords || !Array.isArray(student.academicRecords)) {
        resetScoreForm();
        return;
    }

    const existingRecord = student.academicRecords.find(r => r.year == year && r.month == month);

    if (existingRecord) {
        document.getElementById('scoreHSK').value = existingRecord.hsk || 0;
        
        // Handle GK specific keys or mapping
        if (existingRecord.gk_kh_dict !== undefined) {
            // If saved with new keys
            document.getElementById('scoreWeek01').value = existingRecord.gk_kh_dict || 0;
            document.getElementById('scoreWeek02').value = existingRecord.gk_kh_write || 0;
            document.getElementById('scoreMonthly').value = existingRecord.gk_kh_read || 0;
            document.getElementById('scoreListening').value = existingRecord.gk_kh_speak || 0;
            document.getElementById('scoreSpeaking').value = existingRecord.gk_math_num || 0;
            document.getElementById('scoreReading').value = existingRecord.gk_math_meas || 0;
            document.getElementById('scoreEthics').value = existingRecord.gk_math_geo || 0;
            document.getElementById('scoreAttendance').value = existingRecord.gk_math_alg || 0;
            document.getElementById('scoreHomework').value = existingRecord.gk_science || 0;
            document.getElementById('scoreSinging').value = existingRecord.gk_social || 0;
            document.getElementById('scoreHSK').value = existingRecord.gk_pe_sports || 0;
            document.getElementById('scoreExtra01').value = existingRecord.gk_pe_health || 0;
            document.getElementById('scoreExtra02').value = existingRecord.gk_arts || 0;
        } else {
            // Legacy or Chinese
            document.getElementById('scoreWeek01').value = existingRecord.week01 || 0;
            document.getElementById('scoreWeek02').value = existingRecord.week02 || 0;
            document.getElementById('scoreMonthly').value = existingRecord.monthly || 0;
            document.getElementById('scoreListening').value = existingRecord.listening || 0;
            document.getElementById('scoreSpeaking').value = existingRecord.speaking || 0;
            document.getElementById('scoreReading').value = existingRecord.reading || 0;
            document.getElementById('scoreEthics').value = existingRecord.ethics || 0;
            document.getElementById('scoreAttendance').value = existingRecord.attendance || 0;
            document.getElementById('scoreHomework').value = existingRecord.homework || 0;
            document.getElementById('scoreSinging').value = existingRecord.singing || 0;
            document.getElementById('scoreHSK').value = existingRecord.hsk || 0;
            document.getElementById('scoreExtra01').value = existingRecord.extra1 || 0;
            document.getElementById('scoreExtra02').value = existingRecord.extra2 || 0;
        }
        document.getElementById('scoreRank').value = existingRecord.rank || '';

        const submitBtn = document.querySelector('#addScoreModal .btn-premium');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fi fi-rr-refresh me-2"></i>កែប្រែពិន្ទុ (Update Score)';
            submitBtn.classList.add('btn-warning', 'text-dark');
        }

        updateTotals();
    } else {
        resetScoreForm();
    }
}

function resetScoreForm() {
    const fields = [
        'scoreWeek01', 'scoreWeek02', 'scoreMonthly',
        'scoreListening', 'scoreSpeaking', 'scoreReading',
        'scoreEthics', 'scoreAttendance', 'scoreHomework',
        'scoreSinging', 'scoreHSK', 'scoreExtra01', 'scoreExtra02', 'scoreRank'
    ];
    fields.forEach(id => document.getElementById(id).value = '');
    updateTotals();

    const submitBtn = document.querySelector('#addScoreModal .btn-premium');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fi fi-rr-disk me-2"></i>រក្សាទុក (Save Score)';
        submitBtn.classList.remove('btn-warning', 'text-dark');
    }
}

function setupAutoCalculations() {
    const inputs = [
        'scoreWeek01', 'scoreWeek02', 'scoreMonthly',
        'scoreListening', 'scoreSpeaking', 'scoreReading',
        'scoreEthics', 'scoreAttendance', 'scoreHomework',
        'scoreSinging', 'scoreHSK', 'scoreExtra01', 'scoreExtra02'
    ];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateTotals);
    });
    document.getElementById('scoreRank').addEventListener('input', () => {
        document.getElementById('displayRank').innerText = document.getElementById('scoreRank').value || '-';
    });
}

function updateTotals() {
    const val = (id) => parseFloat(document.getElementById(id).value) || 0;

    const w1 = val('scoreWeek01');
    const w2 = val('scoreWeek02');
    const m = val('scoreMonthly');
    const l = val('scoreListening');
    const s = val('scoreSpeaking');
    const r = val('scoreReading');
    const e = val('scoreEthics');
    const a = val('scoreAttendance');
    const h = val('scoreHomework');
    const sg = val('scoreSinging');
    const hsk = val('scoreHSK');
    const e1 = val('scoreExtra01');
    const e2 = val('scoreExtra02');

    const modalElement = document.getElementById('addScoreModal');
    const program = modalElement.getAttribute('data-student-program') || 'chinese-fulltime';
    
    let total = 0;
    let divider = 11;
    
    if (program === 'chinese-fulltime') {
        total = w1 + w2 + m + l + s + r + e + a + h + sg + hsk;
        divider = 11;
    } else {
        total = w1 + w2 + m + l + s + r + e + a + h + sg + hsk + e1 + e2;
        divider = 13;
    }

    const avg = total / divider;

    let grade = 'F';
    let themeClass = 'bg-soft-danger text-danger';

    if (avg >= 9) { grade = 'A'; themeClass = 'bg-soft-success text-success'; }
    else if (avg >= 8) { grade = 'B'; themeClass = 'bg-soft-success text-success'; }
    else if (avg >= 7) { grade = 'C'; themeClass = 'bg-soft-primary text-primary'; }
    else if (avg >= 6) { grade = 'D'; themeClass = 'bg-soft-primary text-primary'; }
    else if (avg >= 5) { grade = 'E'; themeClass = 'bg-soft-warning text-warning'; }

    document.getElementById('displayTotal').innerText = total.toFixed(2);
    document.getElementById('displayAvg').innerText = avg.toFixed(2);
    
    const gradeDisplay = document.getElementById('displayGrade');
    gradeDisplay.innerText = grade;
    
    const gradePill = gradeDisplay.closest('.summary-pill');
    if (gradePill) {
        gradePill.className = `summary-pill border border-opacity-10 ${themeClass}`;
    }

    const rank = document.getElementById('scoreRank').value || '-';
    document.getElementById('displayRank').innerText = rank;
}

window.autoCalculateRank = () => {
    const avg = parseFloat(document.getElementById('displayAvg').innerText);
    const monthVal = document.getElementById('scoreMonth').value;
    if (!monthVal || isNaN(avg)) return Swal.fire('បញ្ហា', 'សូមបំពេញពិន្ទុជាមុនសិន', 'error');

    const [year, month] = monthVal.split('-').map(Number);
    
    const modalElement = document.getElementById('addScoreModal');
    const myProgram = modalElement.getAttribute('data-student-program') || 'chinese-fulltime';
    
    const studentGroup = allMyStudents.filter(s => {
        const prog = (s.studyType || s.courseType || '').toLowerCase();
        const p_isChineseFullTime = prog.includes('chinese-fulltime') || prog.includes('cfulltime') || prog.includes('ចិនពេញម៉ោង');
        const p_type = p_isChineseFullTime ? 'chinese-fulltime' : 'general';
        return p_type === myProgram;
    });

    const scores = [];
    studentGroup.forEach(s => {
        if (s.academicRecords && Array.isArray(s.academicRecords)) {
            const rec = s.academicRecords.find(r => r.year == year && r.month == month);
            if (rec) scores.push(rec.averageScore || 0);
        }
    });

    scores.push(avg);
    const uniqueScores = [...new Set(scores)].sort((a, b) => b - a);
    const rank = uniqueScores.indexOf(avg) + 1;

    document.getElementById('scoreRank').value = rank;
    document.getElementById('displayRank').innerText = rank;

    Swal.fire({
        icon: 'success',
        title: 'បានគណនា',
        text: `ចំណាត់ថ្នាក់ដែលរកឃើញគឺលេខ: ${rank}`,
        timer: 1000,
        showConfirmButton: false
    });
};

async function saveScore() {
    const key = document.getElementById('modalStudentKey').value;
    const monthVal = document.getElementById('scoreMonth').value;

    if (!key || !monthVal) return;

    const [year, month] = monthVal.split('-').map(Number);
    const val = (id) => parseFloat(document.getElementById(id).value) || 0;

    const w1 = val('scoreWeek01');
    const w2 = val('scoreWeek02');
    const m = val('scoreMonthly');
    const l = val('scoreListening');
    const s = val('scoreSpeaking');
    const r = val('scoreReading');
    const e = val('scoreEthics');
    const a = val('scoreAttendance');
    const h = val('scoreHomework');
    const sg = val('scoreSinging');
    const hsk = val('scoreHSK');
    const e1 = val('scoreExtra01');
    const e2 = val('scoreExtra02');
    const rank = document.getElementById('scoreRank').value || '-';

    const total = parseFloat(document.getElementById('displayTotal').innerText);
    const avg = parseFloat(document.getElementById('displayAvg').innerText);
    const grade = document.getElementById('displayGrade').innerText;

    if (total === 0) {
        const confirm = await Swal.fire({
            title: 'ពិន្ទុសូន្យ?',
            text: "អ្នកមិនទាន់បានបញ្ចូលពិន្ទុទេ។ តើអ្នកចង់បន្តទេ?",
            icon: 'question',
            showCancelButton: true
        });
        if (!confirm.isConfirmed) return;
    }

    try {
        Swal.showLoading();
        const student = allMyStudents.find(s => s.key === key);
        let records = [];
        if (student && student.academicRecords && Array.isArray(student.academicRecords)) {
            records = [...student.academicRecords];
        }

        const modalElement = document.getElementById('addScoreModal');
        const pType = modalElement.getAttribute('data-student-program') || 'chinese-fulltime';

        const newRecord = {
            month, year,
            totalScore: total, averageScore: avg, grade, rank,
            createdAt: new Date().toISOString(),
            createdBy: currentTeacher,
            details: `Via Teacher Portal`
        };

        if (pType === 'chinese-fulltime') {
            newRecord.week01 = w1; newRecord.week02 = w2; newRecord.monthly = m;
            newRecord.listening = l; newRecord.speaking = s; newRecord.reading = r;
            newRecord.ethics = e; newRecord.attendance = a; newRecord.homework = h;
            newRecord.singing = sg; newRecord.hsk = hsk;
        } else {
            newRecord.gk_kh_dict = w1; newRecord.gk_kh_write = w2; newRecord.gk_kh_read = m;
            newRecord.gk_kh_speak = l; newRecord.gk_math_num = s; newRecord.gk_math_meas = r;
            newRecord.gk_math_geo = e; newRecord.gk_math_alg = a; newRecord.gk_science = h;
            newRecord.gk_social = sg; newRecord.gk_pe_sports = hsk; newRecord.gk_pe_health = e1;
            newRecord.gk_arts = e2;
        }

        const existingIndex = records.findIndex(r => r.year == year && r.month == month);
        if (existingIndex >= 0) {
            records[existingIndex] = { ...records[existingIndex], ...newRecord };
        } else {
            records.push(newRecord);
        }

        await firebase.database().ref(`students/${key}/academicRecords`).set(records);
        addScoreModal.hide();

        Swal.fire({
            icon: 'success',
            title: 'បានរក្សាទុក',
            text: `ពិន្ទុសម្រាប់ខែ ${khmerMonthNames[month - 1]} ឆ្នាំ ${toKhmerDigits(year)} ត្រូវបានរក្សាទុកជោគជ័យ`,
            timer: 1500,
            showConfirmButton: false
        });
    } catch (error) {
        console.error(error);
        Swal.fire('បញ្ហា', 'បរាជ័យក្នុងការរក្សាទុក', 'error');
    }
}

window.viewStudentHistory = (key) => {
    const s = allMyStudents.find(st => st.key === key);
    if (!s) return;

    const container = document.getElementById('historyModalContent');
    if (!s.academicRecords || !Array.isArray(s.academicRecords) || s.academicRecords.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="mb-3 text-muted opacity-25" style="font-size: 4rem;"><i class="fi fi-rr-search"></i></div>
                <h5 class="text-muted">មិនទាន់មានប្រវត្តិពិន្ទុនៅឡើយទេ</h5>
                <p class="small text-secondary">មិនមានទិន្នន័យសម្រាប់សិស្សម្នាក់នេះទេ។</p>
            </div>
        `;
    } else {
        const sorted = [...s.academicRecords].sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });

        const totalMonths = sorted.length;
        const avgScoreOverall = (sorted.reduce((acc, r) => acc + Number(r.averageScore || 0), 0) / totalMonths).toFixed(2);
        const bestRank = Math.min(...sorted.filter(r => r.rank && !isNaN(r.rank)).map(r => Number(r.rank))) || '-';

        let summaryHtml = `
            <div class="row g-2 mb-4">
                <div class="col-4">
                    <div class="p-3 rounded-4 bg-soft-primary text-center border h-100">
                        <div class="small text-muted mb-1 text-uppercase ls-1" style="font-size: 0.6rem;">ចំនួនខែសរុប</div>
                        <h4 class="fw-bold mb-0 text-primary">${totalMonths} ខែ</h4>
                    </div>
                </div>
                <div class="col-4">
                    <div class="p-3 rounded-4 bg-soft-success text-center border h-100">
                        <div class="small text-muted mb-1 text-uppercase ls-1" style="font-size: 0.6rem;">មធ្យមភាគរួម</div>
                        <h4 class="fw-bold mb-0 text-success">${avgScoreOverall}</h4>
                    </div>
                </div>
                <div class="col-4">
                    <div class="p-3 rounded-4 bg-soft-warning text-center border h-100">
                        <div class="small text-muted mb-1 text-uppercase ls-1" style="font-size: 0.6rem;">ចំណាត់ថ្នាក់ល្អបំផុត</div>
                        <h4 class="fw-bold mb-0 text-warning">${bestRank === Infinity ? '-' : bestRank}</h4>
                    </div>
                </div>
            </div>
        `;

        let html = summaryHtml + `
            <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                <table class="table table-hover align-middle border-0">
                    <thead class="bg-light sticky-top" style="z-index: 1;">
                        <tr class="text-secondary small shadow-sm">
                            <th class="ps-3 py-3 border-0">ព័ត៌មានលម្អិត <br><span class="opacity-50" style="font-size: 0.6rem;">月份/详情</span></th>
                            <th class="text-center border-0">សរុប/មធ្យម <br><span class="opacity-50" style="font-size: 0.6rem;">总分/平均</span></th>
                            <th class="text-center border-0">និទេស <br><span class="opacity-50" style="font-size: 0.6rem;">等级</span></th>
                            <th class="text-center pe-3 border-0">ចំណាត់ថ្នាក់ <br><span class="opacity-50" style="font-size: 0.6rem;">排名</span></th>
                        </tr>
                    </thead>
                    <tbody class="border-0">
        `;

        sorted.forEach((rec, index) => {
            let trendHtml = '';
            if (index < sorted.length - 1) {
                const prevRec = sorted[index + 1];
                const diff = Number(rec.totalScore) - Number(prevRec.totalScore);
                if (diff > 0) trendHtml = `<span class="text-success ms-1 small" title="ពិន្ទុកើនឡើង"><i class="fi fi-rr-arrow-small-up"></i></span>`;
                else if (diff < 0) trendHtml = `<span class="text-danger ms-1 small" title="ពិន្ទុធ្លាក់ចុះ"><i class="fi fi-rr-arrow-small-down"></i></span>`;
            }

            let subjects = '';
            const isGK = rec.gk_kh_dict !== undefined;

            if (isGK) {
                subjects = `
                    <div class="row g-2 text-start mt-2 bg-light p-2 rounded-3 border border-light" style="font-size: 0.65rem; color: #555;">
                        <div class="col-4 col-md-3 border-end">សរសេរតាមអាន: <strong class="text-dark">${rec.gk_kh_dict || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">សរសេរ: <strong class="text-dark">${rec.gk_kh_write || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">អាន: <strong class="text-dark">${rec.gk_kh_read || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">និយាយ: <strong class="text-dark">${rec.gk_kh_speak || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">ចំនួន: <strong class="text-dark">${rec.gk_math_num || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">រង្វាស់រង្វាល់: <strong class="text-dark">${rec.gk_math_meas || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">ធរណីមាត្រ: <strong class="text-dark">${rec.gk_math_geo || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">ពិជគណិត: <strong class="text-dark">${rec.gk_math_alg || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">វិទ្យាសាស្ត្រ: <strong class="text-dark">${rec.gk_science || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">សិក្សាសង្គម: <strong class="text-dark">${rec.gk_social || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">អប់រំកាយ: <strong class="text-dark">${rec.gk_pe_sports || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">សុខភាព: <strong class="text-dark">${rec.gk_pe_health || 0}</strong></div>
                        <div class="col-4 col-md-3">សិល្បៈ: <strong class="text-dark">${rec.gk_arts || 0}</strong></div>
                    </div>
                `;
            } else {
                subjects = `
                    <div class="row g-2 text-start mt-2 bg-light p-2 rounded-3 border border-light" style="font-size: 0.65rem; color: #555;">
                        <div class="col-4 col-md-3 border-end">សបា្តហ៍01: <strong class="text-dark">${rec.week01 || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">សបា្តហ៍02: <strong class="text-dark">${rec.week02 || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">ប្រចាំខែ: <strong class="text-dark">${rec.monthly || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">ស្តាប់: <strong class="text-dark">${rec.listening || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">និយាយ: <strong class="text-dark">${rec.speaking || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">អាន: <strong class="text-dark">${rec.reading || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">សុជីវធម៌: <strong class="text-dark">${rec.ethics || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">អវត្តមាន: <strong class="text-dark">${rec.attendance || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">កិច្ចការផ្ទះ: <strong class="text-dark">${rec.homework || 0}</strong></div>
                        <div class="col-4 col-md-3 border-end">ច្រៀង: <strong class="text-dark">${rec.singing || 0}</strong></div>
                        <div class="col-4 col-md-3">HSK: <strong class="text-dark">${rec.hsk || 0}</strong></div>
                    </div>
                `;
            }

            html += `
                <tr class="border-bottom-0">
                    <td class="ps-3 py-3" style="min-width: 250px;">
                        <div class="fw-bold text-pink-dark d-flex align-items-center mb-1">
                            <i class="fi fi-rr-calendar me-2"></i> ${khmerMonthNames[rec.month - 1]} ឆ្នាំ ${toKhmerDigits(rec.year)}
                        </div>
                        ${subjects}
                    </td>
                    <td class="text-center">
                        <div class="fw-bold text-primary" style="font-size: 1.1rem;">${Number(rec.totalScore).toFixed(2)}${trendHtml}</div>
                        <div class="small text-muted" style="font-size: 0.7rem;">មធ្យមភាគ: ${Number(rec.averageScore).toFixed(2)}</div>
                    </td>
                    <td class="text-center">
                        <span class="badge ${rec.grade === 'A' || rec.grade === 'B' ? 'bg-success' : (rec.grade === 'C' ? 'bg-info' : 'bg-danger')}" style="padding: 0.5em 1.2em; border-radius: 8px;">${rec.grade}</span>
                    </td>
                    <td class="text-center pe-3">
                        <div class="badge bg-soft-warning text-warning border border-warning border-opacity-25" style="border-radius: 50px; padding: 0.5em 1.2em; font-size: 0.9rem;">
                           <i class="fi fi-rr-trophy me-1"></i> ${rec.rank || '-'}
                        </div>
                    </td>
                </tr>
                <tr><td colspan="4" style="height: 8px; border:none; background-color: transparent;"></td></tr>
            `;
        });

        html += `</tbody></table></div>`;
        container.innerHTML = html;
    }

    historyModal.show();
};

window.logout = logout;
