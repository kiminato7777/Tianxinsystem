
/**
 * System Management Logic
 * Extracted from staff-management.js for use in registration.html
 */

// Global Variables
let masterStudyTimes = [];
let studentsInView = [];
let currentStudyTimeFilter = '';
let currentMgmtType = ''; // 'levels', 'classes', 'classrooms'
let mgmtData = [];
let mgmtSearchQuery = '';

// Initialize specific listeners when document is ready
document.addEventListener('DOMContentLoaded', function () {
    loadMasterStudyTimes();
});

/**
 * Load Master Study Times from Firebase
 */
function loadMasterStudyTimes() {
    const studyTimesRef = firebase.database().ref('settings/studyTimes');
    studyTimesRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        masterStudyTimes = Object.entries(data).map(([id, time]) => ({ id, time }));
        masterStudyTimes.sort((a, b) => a.time.localeCompare(b.time));

        // If modal is open, re-render
        if (document.getElementById('studyTimeModal') && document.getElementById('studyTimeModal').classList.contains('show')) {
            renderStudyTimeList();
        }
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
        const _sysStudentsEl = document.getElementById('studentsInTimeModal');
        if (_sysStudentsEl) bootstrap.Modal.getOrCreateInstance(_sysStudentsEl).show();

        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};

        studentsInView = Object.entries(students)
            .map(([id, data]) => ({ id, ...data }))
            .filter(s => s.studyTime === time);

        if (badge) badge.textContent = `${studentsInView.length} នាក់`;

        if (studentsInView.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted"><i class="fi fi-rr-info d-block mb-2 fa-2x"></i>មិនមានសិស្សក្នុងម៉ោងនេះទេ</td></tr>';
        } else {
            listContainer.innerHTML = studentsInView.map(s => `
                <tr>
                    <td><input type="checkbox" class="student-select-check" value="${s.id}"></td>
                    <td>
                        <div class="fw-bold">${s.lastName} ${s.firstName}</div>
                        <small class="text-muted">${s.englishName || ''}</small>
                    </td>
                    <td>${s.gender || '-'}</td>
                    <td><span class="badge bg-light text-dark border">${s.studyType === 'chinese-fulltime' ? 'ពេញម៉ោង' : 'ក្រៅម៉ោង'}</span></td>
                    <td>${s.teacherName || '-'}</td>
                </tr>
            `).join('');
        }

        // Populate move selection
        if (moveSelect) {
            moveSelect.innerHTML = '<option value="">ជ្រើសរើសម៉ោង...</option>';
            masterStudyTimes.forEach(t => {
                if (t.time !== time) {
                    const opt = document.createElement('option');
                    opt.value = t.time;
                    opt.textContent = t.time;
                    moveSelect.appendChild(opt);
                }
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
    if (!targetTime) {
        Swal.fire({ icon: 'warning', title: 'សូមជ្រើសរើសម៉ោងដែលត្រូវផ្ទេរទៅ' });
        return;
    }

    const selectedIds = [];
    document.querySelectorAll('.student-select-check:checked').forEach(cb => selectedIds.push(cb.value));

    if (selectedIds.length === 0) {
        Swal.fire({ icon: 'warning', title: 'សូមជ្រើសរើសសិស្សយ៉ាងតិចម្នាក់' });
        return;
    }

    const result = await Swal.fire({
        title: 'ប្តូរម៉ោងសិក្សា?',
        text: `តើអ្នកចង់ប្តូរសិស្សចំនួន ${selectedIds.length} នាក់ ទៅម៉ោង ${targetTime} មែនទេ?`,
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
                updates[`students/${id}/studyTime`] = targetTime;
            });

            await firebase.database().ref().update(updates);

            await Swal.fire({ icon: 'success', title: 'ជោគជ័យ', text: 'បានផ្លាស់ប្តូរម៉ោងសិក្សាសិស្សរួចរាល់។' });

            // Refresh current view
            viewStudentsInTime(currentStudyTimeFilter);

        } catch (error) {
            console.error('Error moving students bulk:', error);
            Swal.fire({ icon: 'error', title: 'បរាជ័យ', text: 'មានបញ្ហាក្នុងការផ្លាស់ប្តូរទិន្នន័យ។' });
        }
    }
}

// Management Configs (Levels, Classes, Rooms, Types)
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

    const _mgmtEl = document.getElementById('managementModal');
    if (_mgmtEl) bootstrap.Modal.getOrCreateInstance(_mgmtEl).show();
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

// Sync Functions
async function syncStudyTypesFromStudents() {
    return syncSystemSettingFromStudents('studyTypes', ['studyType', 'courseType'], 'ប្រភេទវគ្គសិក្សា');
}

async function syncLevelsFromStudents() {
    return syncSystemSettingFromStudents('levels', ['studyLevel'], 'កម្រិតសិក្សា');
}

async function syncClassesFromStudents() {
    return syncSystemSettingFromStudents('classes', ['classroom', 'grade'], 'ថ្នាក់រៀន');
}

async function syncRoomsFromStudents() {
    return syncSystemSettingFromStudents('classrooms', ['classroom'], 'បន្ទប់រៀន');
}

async function syncStudentStudyHours() {
    return syncSystemSettingFromStudents('studyTimes', ['studyTime'], 'ម៉ោងសិក្សា');
}

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
        await syncTeachersFromStudentsInner();

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


