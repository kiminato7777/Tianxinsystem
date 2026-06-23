/**
 * daily-attendance-script.js
 * Handles student attendance entry, stats calculation, and reporting.
 */

let allStudents = {};
let allAttendanceForMonth = {};
let currentTeacher = "";
let currentStudyTime = "";
let currentDate = new Date().toISOString().split('T')[0];

const khmerDays = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];
const khmerMonths = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const khmerNumbers = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

let currentFilteredStudentsList = []; // Store current filtered class for searching

// Initialize
document.addEventListener('DOMContentLoaded', async function () {
    updateDateDisplay();
    setupEventListeners();
    await loadInitialData();

    // Start Clock
    setInterval(updateClock, 1000);
});

function updateClock() {
    const timeDisplay = document.getElementById('current-time-display');
    if (!timeDisplay) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    timeDisplay.innerText = timeStr;
}

function setupEventListeners() {
    const dateInput = document.getElementById('attendanceDate');
    const timeSelect = document.getElementById('studyTimeSelect');
    const teacherSelect = document.getElementById('teacherSelect');
    const classroomSelect = document.getElementById('classroomSelect');
    const studentSearch = document.getElementById('studentSearch');
    const manualToggle = document.getElementById('manualEntryToggle');
    const studyManual = document.getElementById('studyTimeManual');
    const teacherManual = document.getElementById('teacherManual');
    const subjectInput = document.getElementById('setupSubjectInput');

    // New Setup Modal Stats Inputs
    const setupTotal = document.getElementById('setupTotalStudents');
    const setupPresent = document.getElementById('setupPresentStudents');
    const setupBefore = document.getElementById('setupBeforeStudents');
    const setupCompensated = document.getElementById('setupCompensatedStudents');
    const setupAbsent = document.getElementById('setupAbsentStudents');

    if (dateInput) {
        dateInput.value = currentDate;
        dateInput.addEventListener('change', async (e) => {
            currentDate = e.target.value;
            updateDateDisplay();
            const dateDisplay = document.getElementById('display-date');
            if (dateDisplay) dateDisplay.innerText = currentDate;
            await generateEntryId();
        });
    }

    if (timeSelect) {
        timeSelect.addEventListener('change', async (e) => {
            currentStudyTime = e.target.value;
            const timeDisplay = document.getElementById('display-study-time');
            if (timeDisplay) timeDisplay.innerText = currentStudyTime || "សូមជ្រើសរើស...";
            await generateEntryId();
        });
    }

    if (teacherSelect) {
        teacherSelect.addEventListener('change', (e) => {
            currentTeacher = e.target.value;
            const teacherDisplay = document.getElementById('display-teacher');
            if (teacherDisplay) teacherDisplay.innerText = currentTeacher || "សូមជ្រើសរើស...";
        });
    }

    if (classroomSelect) {
        classroomSelect.addEventListener('change', (e) => {
            const roomDisplay = document.getElementById('display-classroom');
            if (roomDisplay) roomDisplay.innerText = e.target.value || "សូមជ្រើសរើស...";
        });
    }

    if (studentSearch) {
        studentSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            filterTableRows(query);
        });
    }

    if (manualToggle) {
        manualToggle.addEventListener('change', (e) => {
            const isManual = e.target.checked;
            const sGroup = document.getElementById('studyTimeSelectGroup');
            const sInput = document.getElementById('studyTimeInputGroup');
            const tGroup = document.getElementById('teacherSelectGroup');
            const tInput = document.getElementById('teacherInputGroup');

            if (sGroup) sGroup.classList.toggle('d-none', isManual);
            if (sInput) sInput.classList.toggle('d-none', !isManual);
            if (tGroup) tGroup.classList.toggle('d-none', isManual);
            if (tInput) tInput.classList.toggle('d-none', !isManual);

            if (isManual) {
                currentStudyTime = studyManual ? studyManual.value : "";
                currentTeacher = teacherManual ? teacherManual.value : "";
            } else {
                currentStudyTime = timeSelect ? timeSelect.value : "";
                currentTeacher = teacherSelect ? teacherSelect.value : "";
            }

            const timeDisplay = document.getElementById('display-study-time');
            if (timeDisplay) timeDisplay.innerText = currentStudyTime || "សូមជ្រើសរើស...";
            const teacherDisplay = document.getElementById('display-teacher');
            if (teacherDisplay) teacherDisplay.innerText = currentTeacher || "សូមជ្រើសរើស...";

            generateEntryId();
        });
    }

    if (studyManual) {
        studyManual.addEventListener('input', (e) => {
            if (manualToggle && manualToggle.checked) {
                currentStudyTime = e.target.value;
                const timeDisplay = document.getElementById('display-study-time');
                if (timeDisplay) timeDisplay.innerText = currentStudyTime || "សូមជ្រើសរើស...";
                generateEntryId();
            }
        });
    }

    if (teacherManual) {
        teacherManual.addEventListener('input', (e) => {
            if (manualToggle && manualToggle.checked) {
                currentTeacher = e.target.value;
                const teacherDisplay = document.getElementById('display-teacher');
                if (teacherDisplay) teacherDisplay.innerText = currentTeacher || "សូមជ្រើសរើស...";
                generateEntryId();
            }
        });
    }

    if (subjectInput) {
        subjectInput.addEventListener('input', (e) => {
            const subjectDisplay = document.getElementById('display-subject');
            if (subjectDisplay) subjectDisplay.innerText = e.target.value || "-";
        });
    }

    // Sync Setup Modal Stats to Main UI
    const syncSetupStats = () => {
        updateStats(
            parseInt(setupTotal.value || 0),
            parseInt(setupPresent.value || 0),
            parseInt(setupBefore.value || 0),
            parseInt(setupCompensated.value || 0),
            parseInt(setupAbsent.value || 0)
        );
    };

    [setupTotal, setupPresent, setupBefore, setupCompensated, setupAbsent].forEach(input => {
        if (input) input.addEventListener('input', syncSetupStats);
    });

    // Modal Student Search Logic
    const modalSearch = document.getElementById('modalStudentSearch');
    const modalResults = document.getElementById('modalSearchResults');

    if (modalSearch && modalResults) {
        modalSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                modalResults.style.display = 'none';
                return;
            }

            const results = Object.entries(allStudents)
                .filter(([id, s]) => {
                    const name = `${s.lastName || ''} ${s.firstName || ''}`.toLowerCase();
                    return name.includes(query) && s.enrollmentStatus !== 'graduated' && s.enrollmentStatus !== 'dropout';
                })
                .slice(0, 10); // Limit to 10 results

            if (results.length > 0) {
                modalResults.innerHTML = results.map(([id, s]) => {
                    const fullName = `${s.lastName || ''} ${s.firstName || ''}`;
                    return `<button type="button" class="dropdown-item py-2 border-bottom text-pink-dark fw-bold" onclick="handleModalSearchSelect('${id}', '${fullName}')">
                        ${fullName}
                    </button>`;
                }).join('');
                modalResults.style.display = 'block';
            } else {
                modalResults.innerHTML = `<div class="p-3 text-center text-muted small">មិនឃើញសិស្សឈ្មោះនេះទេ</div>`;
                modalResults.style.display = 'block';
            }
        });

        // Hide results on outside click
        document.addEventListener('click', (e) => {
            if (!modalSearch.contains(e.target) && !modalResults.contains(e.target)) {
                modalResults.style.display = 'none';
            }
        });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveAttendance();
        }
    });
}

function handleModalSearchSelect(id, name) {
    const searchInput = document.getElementById('modalStudentSearch');
    const searchResults = document.getElementById('modalSearchResults');
    if (searchInput) searchInput.value = name;
    if (searchResults) searchResults.style.display = 'none';

    // 1. Check if the student is already in the filtered table
    const row = document.querySelector(`tr[data-student-id="${id}"]`);
    if (row) {
        // Close setup modal
        const setupModal = bootstrap.Modal.getInstance(document.getElementById('setupClassModal'));
        if (setupModal) setupModal.hide();

        // Scroll to row
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('bg-warning-subtle');

        // Persist the name in the reason field if not already there
        const reasonInput = row.querySelector('input[type="text"]');
        if (reasonInput && !reasonInput.value.includes(name)) {
            reasonInput.value = (reasonInput.value ? reasonInput.value + " | " : "") + name;
        }

        setTimeout(() => row.classList.remove('bg-warning-subtle'), 3000);

        // Open their attendance modal
        const index = Array.from(row.parentNode.children).indexOf(row) + 1;
        const mCount = parseInt(row.querySelector('.absence-count-badge')?.innerText || 0);
        const totalS = document.querySelectorAll('#attendanceTableBody tr[data-student-id]').length;
        openAttendanceModal(id, index, name, mCount, totalS);
    } else {
        // 2. If student is not in current view, alert user
        Swal.fire({
            title: 'សិស្សមិនស្ថិតក្នុងថ្នាក់នេះទេ',
            text: `តើអ្នកចង់ប្តូរទៅកាន់ថ្នាក់របស់ ${name} ដែរឬទេ?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ប្តូរថ្នាក់',
            cancelButtonText: 'ទេ'
        }).then((result) => {
            if (result.isConfirmed) {
                const s = allStudents[id];
                if (s && s.studyTime && s.teacherName) {
                    document.getElementById('studyTimeSelect').value = s.studyTime;
                    currentStudyTime = s.studyTime;
                    document.getElementById('teacherSelect').value = s.teacherName;
                    currentTeacher = s.teacherName;

                    // Sync main display
                    document.getElementById('display-study-time').innerText = s.studyTime;
                    document.getElementById('display-teacher').innerText = s.teacherName;

                    loadAttendanceData();
                }
            }
        });
    }
}

function filterTableRows(query) {
    const rows = document.querySelectorAll('#attendanceTableBody tr[data-student-id]');
    rows.forEach(row => {
        const studentName = row.cells[5]?.innerText.toLowerCase() || "";
        if (studentName.includes(query)) {
            row.classList.remove('d-none');
        } else {
            row.classList.add('d-none');
        }
    });
    calculateCurrentStats();
}

async function generateEntryId() {
    const noField = document.getElementById('entryIdField');
    if (!noField) return;

    try {
        // Fetch all attendance for the current date to count them
        const snapshot = await firebase.database().ref(`attendance/${currentDate}`).once('value');
        const data = snapshot.val() || {};

        // Count entries (each teacher/time slot is an entry)
        let count = 0;
        Object.values(data).forEach(timeSlot => {
            count += Object.keys(timeSlot).length;
        });

        // Set the next number (increment by 1, start at 1 if 0)
        noField.value = count + 1;

    } catch (error) {
        console.error("Error generating sequential ID:", error);
        noField.value = "1"; // Fallback to 1
    }

    // Update setup display date if exists
    const setupDate = document.getElementById('display-date');
    if (setupDate) setupDate.innerText = currentDate;
}

function updateDateDisplay() {
    const date = new Date(currentDate);
    const dayName = khmerDays[date.getDay()];
    const day = date.getDate();
    const monthName = khmerMonths[date.getMonth()];
    const year = date.getFullYear();

    const khmerDateStr = `ថ្ងៃ${dayName} ទី${toKhmerNum(day)} ខែ${monthName} ឆ្នាំ${toKhmerNum(year)}`;
    const englishDateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    document.getElementById('current-khmer-date').innerText = khmerDateStr;
    document.getElementById('current-english-date').innerText = englishDateStr;
}

function toKhmerNum(num) {
    return String(num).split('').map(d => khmerNumbers[d] || d).join('');
}

async function loadInitialData() {
    try {
        // Load Study Times
        const timesSnapshot = await firebase.database().ref('settings/studyTimes').once('value');
        const timesData = timesSnapshot.val() || {};
        const timeSelect = document.getElementById('studyTimeSelect');

        Object.values(timesData).forEach(item => {
            const time = typeof item === 'object' ? item.time : item;
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            timeSelect.appendChild(option);
        });

        // Load Teachers from staff
        const staffSnapshot = await firebase.database().ref('staff').once('value');
        const staffData = staffSnapshot.val() || {};
        const teacherSelect = document.getElementById('teacherSelect');

        Object.values(staffData).forEach(staff => {
            if (staff.nameKhmer && (staff.position || '').includes('គ្រូ')) {
                const option = document.createElement('option');
                option.value = staff.nameKhmer;
                option.textContent = staff.nameKhmer;
                teacherSelect.appendChild(option);
            }
        });

        // Load Classrooms
        const roomsSnapshot = await firebase.database().ref('settings/classrooms').once('value');
        const roomsData = roomsSnapshot.val() || {};
        const classroomSelect = document.getElementById('classroomSelect');

        Object.values(roomsData).forEach(room => {
            const name = typeof room === 'object' ? room.name : room;
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            classroomSelect.appendChild(option);
        });

        // Load all active students
        const studentsSnapshot = await firebase.database().ref('students').once('value');
        allStudents = studentsSnapshot.val() || {};

        // Initial Table State
        renderAttendanceTable([]);

        // Populate initial entry ID and display context
        generateEntryId();
        updateStats(0, 0, 0, 0, 0);
    } catch (error) {
        console.error("Error loading initial data:", error);
    }
}

async function loadAttendanceData() {
    if (!currentStudyTime || !currentTeacher) {
        renderAttendanceTable([]);
        updateStats(0, 0, 0, 0, 0);

        // Reset companion displays
        const displays = ['stat-total-display', 'stat-present-display', 'stat-before-display', 'stat-compensated-display', 'stat-absent-display'];
        displays.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = '0';
        });
        return;
    }

    const tableBody = document.getElementById('attendanceTableBody');
    const tableTitle = document.getElementById('dynamic-table-title');
    const roomEl = document.getElementById('classroomSelect');
    const subjectEl = document.getElementById('setupSubjectInput');
    const room = roomEl ? roomEl.value : "";
    const subject = subjectEl ? subjectEl.value : "";

    if (tableTitle) {
        let titleText = `${currentStudyTime} - ${currentTeacher}`;
        if (room && room !== 'All') titleText += ` (${room})`;
        if (subject) titleText += ` - ${subject}`;

        tableTitle.innerText = titleText;
        tableTitle.classList.remove('text-muted');
        tableTitle.classList.add('text-pink-primary');
    }

    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="10" class="py-5 text-center text-muted"><div class="spinner-border text-pink-primary mb-3"></div><div>កំពុងទាញយក...</div></td></tr>`;
    }

    try {
        // 1. Get filtered students
        const classroomFilter = (document.getElementById('classroomSelect')?.value || '').trim();
        const curTime = (currentStudyTime || '').trim();
        const curTeacher = (currentTeacher || '').trim();

        const filteredStudents = Object.entries(allStudents)
            .filter(([id, s]) => {
                const sTime = (s.studyTime || '').trim();
                const sTeacher = (s.teacherName || '').trim();
                const sRoom = (s.classroom || '').trim();
                const status = (s.enrollmentStatus || 'active').toLowerCase();

                // Core filters
                let match = sTime === curTime && sTeacher === curTeacher && status === 'active';

                // Optional classroom filter
                if (match && classroomFilter && classroomFilter !== 'All') {
                    match = sRoom === classroomFilter;
                }

                return match;
            })
            .map(([id, s]) => ({ id, ...s }));

        currentFilteredStudentsList = filteredStudents;

        // 2. Get existing attendance for this date
        const attendanceSnapshot = await firebase.database().ref(`attendance/${currentDate}/${currentStudyTime}/${currentTeacher}`).once('value');
        const attendanceRecord = attendanceSnapshot.val() || {};

        // Extract student records and metadata
        const existingAttendance = {};
        if (attendanceRecord.students) {
            Object.assign(existingAttendance, attendanceRecord.students);
        } else {
            // Legacy support: if the node itself contains student IDs directly
            Object.assign(existingAttendance, attendanceRecord);
        }

        // Load metadata to UI
        const subjectDisplay = document.getElementById('display-subject');
        if (attendanceRecord.metadata) {
            const subjectVal = attendanceRecord.metadata.subject || '';
            document.getElementById('setupSubjectInput').value = subjectVal;
            if (subjectDisplay) subjectDisplay.innerText = subjectVal || "-";

            if (document.getElementById('setupClassNotes')) {
                document.getElementById('setupClassNotes').value = attendanceRecord.metadata.notes || '';
            }
            if (attendanceRecord.metadata.classroom && !classroomFilter) {
                document.getElementById('classroomSelect').value = attendanceRecord.metadata.classroom;
                const roomDisplay = document.getElementById('display-classroom');
                if (roomDisplay) roomDisplay.innerText = attendanceRecord.metadata.classroom;
            }
        } else {
            document.getElementById('setupSubjectInput').value = '';
            if (subjectDisplay) subjectDisplay.innerText = "-";
            if (document.getElementById('setupClassNotes')) {
                document.getElementById('setupClassNotes').value = '';
            }
        }

        // 3. Get monthly counts for these specific students
        const currentMonth = currentDate.substring(0, 7); // YYYY-MM
        const monthlyCounts = {};

        // Fetch attendance for the month (optimized)
        const monthQuery = await firebase.database().ref('attendance')
            .orderByKey()
            .startAt(currentMonth)
            .endAt(currentMonth + "\uf8ff")
            .once('value');

        const monthData = monthQuery.val() || {};

        Object.values(monthData).forEach(dayData => {
            Object.values(dayData).forEach(timeData => {
                Object.values(timeData).forEach(teacherData => {
                    const studentsNode = teacherData.students || teacherData;
                    if (typeof studentsNode === 'object') {
                        Object.entries(studentsNode).forEach(([sid, record]) => {
                            if (record && record.status === 'A') {
                                monthlyCounts[sid] = (monthlyCounts[sid] || 0) + 1;
                            }
                        });
                    }
                });
            });
        });

        renderAttendanceTable(filteredStudents, existingAttendance, monthlyCounts);
        calculateCurrentStats();
    } catch (error) {
        console.error("Error loading attendance data:", error);
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="8" class="py-5 text-center text-danger">មានកំហុសក្នុងការទាញយកទិន្នន័យ: ${error.message}</td></tr>`;
    }
}

function renderAttendanceTable(students, existing = {}, monthlyCounts = {}) {
    const tableBody = document.getElementById('attendanceTableBody');
    const totalStudentsCount = students.length;

    if (students.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="py-5 text-center text-muted">មិនមានទិន្នន័យសិស្សសម្រាប់ម៉ោង និងគ្រូនេះទេ</td></tr>`;
        updateStats(0, 0, 0, 0, 0);
        return;
    }

    tableBody.innerHTML = students.map((s, index) => {
        const record = existing[s.id] || { status: 'P', reason: '' };
        const mCount = monthlyCounts[s.id] || 0;
        const badgeClass = mCount === 0 ? 'badge-none' : (mCount < 3 ? 'badge-low' : 'badge-high');
        const fullName = `${s.lastName || ''} ${s.firstName || ''}`;

        let rowClass = 'row-present';
        if (record.status === 'B') rowClass = 'row-before';
        else if (record.status === 'S') rowClass = 'row-compensated';
        else if (record.status === 'A') rowClass = 'row-absent';

        return `
            <tr data-student-id="${s.id}" class="animate__animated animate__fadeIn align-middle ${rowClass}">
                <td class="text-center fw-bold">
                    <span class="me-1 opacity-50">${index + 1}</span>
                    <i class="fi fi-rr-edit text-muted pointer hover-pink small" onclick="openAttendanceModal('${s.id}', ${index + 1}, '${fullName}', ${mCount}, ${totalStudentsCount})"></i>
                </td>
                <td class="small fw-medium">${currentStudyTime || '-'}</td>
                <td class="text-pink-primary fw-medium small">${currentTeacher || '-'}</td>
                <td class="text-center text-primary fw-bold">${totalStudentsCount}</td>
                <td class="text-center">
                    <div class="status-radio-group">
                        <label class="status-radio-btn">
                            <input type="radio" name="status_${s.id}" value="P" ${record.status === 'P' ? 'checked' : ''} onchange="calculateCurrentStats(this)">
                            <div class="status-btn">P</div>
                        </label>
                        <label class="status-radio-btn">
                            <input type="radio" name="status_${s.id}" value="B" ${record.status === 'B' ? 'checked' : ''} onchange="calculateCurrentStats(this)">
                            <div class="status-btn">B</div>
                        </label>
                        <label class="status-radio-btn">
                            <input type="radio" name="status_${s.id}" value="S" ${record.status === 'S' ? 'checked' : ''} onchange="calculateCurrentStats(this)">
                            <div class="status-btn">S</div>
                        </label>
                        <label class="status-radio-btn">
                            <input type="radio" name="status_${s.id}" value="A" ${record.status === 'A' ? 'checked' : ''} onchange="calculateCurrentStats(this)">
                            <div class="status-btn">A</div>
                        </label>
                    </div>
                </td>
                <td class="fw-bold text-pink-dark pointer hover-underline" onclick="openAttendanceModal('${s.id}', ${index + 1}, '${fullName}', ${mCount}, ${totalStudentsCount})">${fullName}</td>
                <td>
                    <input type="text" class="form-control form-control-premium py-1 small" placeholder="មូលហេតុ..." value="${record.reason || ''}">
                </td>
                <td class="text-center">
                    <div class="absence-count-badge ${badgeClass}">${mCount}</div>
                </td>
            </tr>
        `;
    }).join('');

    calculateCurrentStats(); // Call to update progress and rows
}

function markAllPresent() {
    const radios = document.querySelectorAll('input[value="P"]');
    radios.forEach(r => r.checked = true);
    calculateCurrentStats();
}

function calculateCurrentStats() {
    const rows = document.querySelectorAll('#attendanceTableBody tr[data-student-id]');
    let total = rows.length;
    let present = 0;
    let before = 0;
    let compensated = 0;
    let absent = 0;
    let markedCount = 0;

    rows.forEach(row => {
        const studentId = row.getAttribute('data-student-id');
        const checked = row.querySelector(`input[name="status_${studentId}"]:checked`);

        // Remove all status classes
        row.classList.remove('row-present', 'row-before', 'row-compensated', 'row-absent');

        if (checked) {
            markedCount++;
            const status = checked.value;
            if (status === 'P') {
                present++;
                row.classList.add('row-present');
            } else if (status === 'B') {
                before++;
                row.classList.add('row-before');
            } else if (status === 'S') {
                compensated++;
                row.classList.add('row-compensated');
            } else if (status === 'A') {
                absent++;
                row.classList.add('row-absent');
            }
        }
    });

    // Update Progress
    const progressPercent = total > 0 ? Math.round((markedCount / total) * 100) : 0;
    const progressBar = document.getElementById('attendance-progress');
    const progressText = document.getElementById('completion-text');
    const floatingProgress = document.getElementById('floating-progress');

    if (progressBar) progressBar.style.width = `${progressPercent}%`;
    if (progressText) progressText.innerText = `កត់បាន: ${progressPercent}%`;
    if (floatingProgress) floatingProgress.innerText = `${progressPercent}%`;

    // Smart Stats Update: Preserve manual overrides if they exist
    const currentTotalInput = document.getElementById('stat-total');
    const existingTotal = parseInt(currentTotalInput ? currentTotalInput.value : 0);

    // If existing total is 0 or it matches the row count, we update it
    let finalTotal = total;
    if (existingTotal > 0 && existingTotal !== total) {
        // Respect the manual override but ensure it's not smaller than actually marked students
        finalTotal = Math.max(existingTotal, markedCount);
    }

    updateStats(finalTotal, present, before, compensated, absent);
}

function updateStats(total, present, before, compensated, absent) {
    // Update all occurrences of stats (Main UI and both Modals)
    const setStat = (id, val) => {
        const elements = [
            document.getElementById(id), // Main card input
            document.getElementById('setup' + id.charAt(0).toUpperCase() + id.slice(1) + 'Students'), // Setup Modal input
            id === 'stat-total' ? document.getElementById('modalTotalInput') : null, // Attendance Modal Total
            id === 'stat-present' ? document.getElementById('modalPresentInput') : null // Attendance Modal Present
        ].filter(el => el !== null);

        elements.forEach(el => {
            const oldVal = el.tagName === 'INPUT' ? el.value : el.innerText;
            const newVal = val || 0;

            if (el.tagName === 'INPUT') el.value = newVal;
            else el.innerText = newVal;

            if (oldVal.toString() !== newVal.toString()) {
                el.classList.remove('animate__animated', 'animate__pulse');
                void el.offsetWidth;
                el.classList.add('animate__animated', 'animate__pulse');
            }
        });
    };

    setStat('stat-total', total);
    setStat('stat-present', present);
    setStat('stat-before', before);
    setStat('stat-compensated', compensated);
    setStat('stat-absent', absent);

    // Sync Floating Badge
    const fTotal = document.getElementById('floating-total');
    const fPresent = document.getElementById('floating-present');
    const fAbsent = document.getElementById('floating-absent');
    if (fTotal) fTotal.innerText = total;
    if (fPresent) fPresent.innerText = present;
    if (fAbsent) fAbsent.innerText = absent;
}

async function saveAttendance() {
    if (!currentStudyTime || !currentTeacher) {
        Swal.fire('សូមជ្រើសរើស!', 'សូមជ្រើសរើសម៉ោងសិក្សា និងឈ្មោះគ្រូមុននឹងរក្សាទុក។', 'warning');
        return;
    }

    const rows = document.querySelectorAll('#attendanceTableBody tr[data-student-id]');
    if (rows.length === 0) return;

    Swal.fire({
        title: 'កំពុងរក្សាទុក...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    const attendanceData = {
        students: {},
        metadata: {
            teacher: currentTeacher,
            studyTime: currentStudyTime,
            classroom: document.getElementById('classroomSelect').value,
            subject: document.getElementById('setupSubjectInput').value,
            notes: document.getElementById('setupClassNotes') ? document.getElementById('setupClassNotes').value : '',
            lastSaved: firebase.database.ServerValue.TIMESTAMP,
            stats: {
                total: parseInt(document.getElementById('stat-total').value || 0),
                present: parseInt(document.getElementById('stat-present').value || 0),
                before: parseInt(document.getElementById('stat-before').value || 0),
                compensated: parseInt(document.getElementById('stat-compensated').value || 0),
                absent: parseInt(document.getElementById('stat-absent').value || 0)
            }
        }
    };

    rows.forEach(row => {
        const studentId = row.getAttribute('data-student-id');
        const status = row.querySelector(`input[name="status_${studentId}"]:checked`).value;
        const reason = row.querySelector('input[type="text"]').value;

        attendanceData.students[studentId] = {
            status: status,
            reason: reason
        };
    });

    try {
        // Save to attendance node
        await firebase.database().ref(`attendance/${currentDate}/${currentStudyTime}/${currentTeacher}`).set(attendanceData);

        Swal.fire({
            title: 'រក្សាទុកជោគជ័យ!',
            text: 'ទិន្នន័យអវត្តមានត្រូវបានកត់ត្រាចូលក្នុងប្រព័ន្ធ។',
            icon: 'success',
            timer: 2000
        });

        // Refresh to update monthly counts if needed (though usually it's better to just update UI)
        loadAttendanceData();
    } catch (error) {
        console.error("Error saving attendance:", error);
        Swal.fire('បរាជ័យ!', 'មានកំហុសក្នុងការរក្សាទុកទិន្នន័យ។', 'error');
    }
}

// Export Functions
function exportToExcel() {
    const rows = document.querySelectorAll('#attendanceTableBody tr[data-student-id]');
    if (rows.length === 0) {
        Swal.fire('មិនមានទិន្នន័យ!', 'សូមជ្រើសរើសទិន្នន័យមុននឹងនាំចេញ។', 'info');
        return;
    }

    const date = new Date(currentDate);
    const dateFormatted = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

    const subject = document.getElementById('setupSubjectInput').value || 'N/A';
    const classroom = document.getElementById('classroomSelect').value || 'N/A';
    const notes = document.getElementById('setupClassNotes') ? document.getElementById('setupClassNotes').value : '';

    const data = [
        ["សាលាអន្តរជាតិ ធាន ស៊ីន (Tian Xin International School)"],
        ["របាយការណ៍អវត្តមានសិស្សប្រចាំថ្ងៃ"],
        [`កាលបរិច្ឆេទ: ${currentDate}`, `ម៉ោងសិក្សា: ${currentStudyTime}`, `គ្រូបន្ទុក: ${currentTeacher}`],
        [`បន្ទប់រៀន: ${classroom}`, `សម្គាល់: ${notes}`],
        [],
        ["ល.រ", "ម៉ោងសិក្សា", "ឈ្មោះគ្រូ", "សិស្សសរុប", "ស្ថានភាពវត្តមាន (Status)", "ឈ្មោះសិស្ស", "មូលហេតុ", "អវត្តមាន/ខែ"]
    ];

    const totalStudents = document.getElementById('stat-total') ? document.getElementById('stat-total').value : rows.length;
    
    rows.forEach((row, index) => {
        if (row.classList.contains('d-none')) return;
        const studentId = row.getAttribute('data-student-id');
        const checked = row.querySelector(`input[name="status_${studentId}"]:checked`);
        const status = checked ? checked.value : 'P';
        let statusString = "មករៀន (P)";
        if (status === 'B') statusString = "ច្បាប់មុន (B)";
        else if (status === 'S') statusString = "ច្បាប់សង (S)";
        else if (status === 'A') statusString = "អត់ call (A)";

        const name = row.cells[5]?.innerText || '';
        const reasonInput = row.querySelector('input[type="text"]');
        const reason = reasonInput ? reasonInput.value : '';
        const mCountBadge = row.querySelector('.absence-count-badge');
        const mCount = mCountBadge ? mCountBadge.innerText : '0';

        data.push([
            index + 1,
            currentStudyTime,
            currentTeacher,
            totalStudents,
            statusString,
            name,
            reason,
            mCount
        ]);
    });

    // Add Stats Summary
    data.push([]);
    data.push(["", "", "សរុបរួម:",
        totalStudents,
        `មករៀន: ${document.getElementById('stat-present')?.value || 0}`,
        `ច្បាប់មុន: ${document.getElementById('stat-before')?.value || 0}`,
        `ច្បាប់សង: ${document.getElementById('stat-compensated')?.value || 0}`,
        `អត់call: ${document.getElementById('stat-absent')?.value || 0}`
    ]);

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    const wscols = [
        { wch: 6 },  // ល.រ
        { wch: 15 }, // ម៉ោងសិក្សា
        { wch: 15 }, // ឈ្មោះគ្រូ
        { wch: 10 }, // សិស្សសរុប
        { wch: 20 }, // ស្ថានភាព
        { wch: 25 }, // ឈ្មោះសិស្ស
        { wch: 30 }, // មូលហេតុ
        { wch: 12 }  // អវត្តមាន/ខែ
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    XLSX.writeFile(wb, `Daily_Attendance_${currentDate}_${currentStudyTime}.xlsx`);
}

function exportToPDF() {
    if (typeof khmerFontBase64 === 'undefined') {
        Swal.fire('Error', 'Khmer font data not found!', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // Register Khmer font
    doc.addFileToVFS("KhmerOS.ttf", khmerFontBase64);
    doc.addFont("KhmerOS.ttf", "KhmerOS", "normal");
    doc.setFont("KhmerOS");

    const date = new Date(currentDate);
    const dateKhmer = `ថ្ងៃ${khmerDays[date.getDay()]} ទី${toKhmerNum(date.getDate())} ខែ${khmerMonths[date.getMonth()]} ឆ្នាំ${toKhmerNum(date.getFullYear())}`;
    const selectedRoom = document.getElementById('classroomSelect')?.value || '-';
    // Get entry ID from modal or card
    const entryIdEl = document.getElementById('entryIdField');
    const entryId = entryIdEl ? entryIdEl.value : '-';

    // School Header (Premium Style)
    doc.setFontSize(20);
    doc.setTextColor(138, 14, 91); // Pink primary
    doc.text("សាលាអន្តរជាតិ ធាន ស៊ីន", 105, 15, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text("របាយការណ៍អវត្តមានសិស្សប្រចាំថ្ងៃ", 105, 23, { align: "center" });
    doc.setFontSize(10);
    doc.text(`លេខកូដ៖ ${entryId}`, 105, 28, { align: "center" });

    // Official Info Section
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 32, 195, 32);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`ម៉ោងសិក្សា: ${currentStudyTime || '-'}`, 15, 38);
    doc.text(`ឈ្មោះគ្រូ: ${currentTeacher || '-'}`, 15, 44);
    doc.text(`បន្ទប់រៀន: ${selectedRoom}`, 15, 50);

    doc.text(`កាលបរិច្ឆេទ: ${dateKhmer}`, 195, 38, { align: 'right' });
    doc.text(`បោះពុម្ពដោយ: Admin`, 195, 44, { align: 'right' });

    const rows = document.querySelectorAll('#attendanceTableBody tr[data-student-id]');
    const data = [];

    const totalStudentsCount = document.getElementById('stat-total') ? parseInt(document.getElementById('stat-total').value) : rows.length;
    
    rows.forEach((row, index) => {
        if (row.classList.contains('d-none')) return;

        const studentId = row.getAttribute('data-student-id');
        const checked = row.querySelector(`input[name="status_${studentId}"]:checked`);
        const status = checked ? checked.value : 'P';
        let statusString = "មករៀន (P)";
        if (status === 'B') statusString = "ច្បាប់មុន (B)";
        else if (status === 'S') statusString = "ច្បាប់សង (S)";
        else if (status === 'A') statusString = "អត់ call (A)";

        const name = row.cells[5]?.innerText || 'N/A';
        const reasonInput = row.querySelector('input[type="text"]');
        const reason = reasonInput ? reasonInput.value : '';
        const mCountBadge = row.querySelector('.absence-count-badge');
        const mCount = mCountBadge ? mCountBadge.innerText : '0';

        data.push([
            toKhmerNum(index + 1),
            currentStudyTime,
            currentTeacher,
            toKhmerNum(totalStudentsCount),
            statusString,
            name,
            reason || '',
            toKhmerNum(mCount)
        ]);
    });

    doc.autoTable({
        head: [['ល.រ', 'ម៉ោងសិក្សា', 'ឈ្មោះគ្រូ', 'សិស្សសរុប', 'ស្ថានភាពវត្តមាន (Status)', 'ឈ្មោះសិស្ស', 'មូលហេតុ', 'អវត្តមាន/ខែ']],
        body: data,
        startY: 55,
        theme: 'grid',
        headStyles: {
            fillColor: [138, 14, 91],
            textColor: 255,
            font: "KhmerOS",
            fontSize: 9,
            fontStyle: 'normal',
            halign: 'center'
        },
        styles: {
            font: "KhmerOS",
            fontSize: 9,
            cellPadding: 2
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { cellWidth: 15 },
            2: { cellWidth: 25 },
            3: { halign: 'center', cellWidth: 15 },
            4: { halign: 'center', cellWidth: 35 },
            5: { cellWidth: 35 },
            6: { cellWidth: 'auto' },
            7: { halign: 'center', cellWidth: 20 }
        }
    });

    // Summary at Bottom
    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(10);
    doc.setTextColor(138, 14, 91);

    const sPresent = document.getElementById('stat-present');
    const sBefore = document.getElementById('stat-before');
    const sComp = document.getElementById('stat-compensated');
    const sAbsent = document.getElementById('stat-absent');

    const presentVal = toKhmerNum(sPresent ? (sPresent.value || sPresent.innerText || 0) : 0);
    const beforeVal = toKhmerNum(sBefore ? (sBefore.value || sBefore.innerText || 0) : 0);
    const compensatedVal = toKhmerNum(sComp ? (sComp.value || sComp.innerText || 0) : 0);
    const absentVal = toKhmerNum(sAbsent ? (sAbsent.value || sAbsent.innerText || 0) : 0);

    doc.text(`សរុប៖ មករៀន: ${presentVal} | ច្បាប់មុន: ${beforeVal} | ច្បាប់សង: ${compensatedVal} | អត់ call: ${absentVal}`, 15, finalY);

    const footerY = 270;
    doc.setTextColor(50, 50, 50);
    doc.text("ហត្ថលេខាគ្រូបន្ទុកថ្នាក់", 40, footerY, { align: 'center' });
    doc.text("ហត្ថលេខាប្រធានសាលា", 160, footerY, { align: 'center' });

    doc.save(`Attendance_${currentDate}_${currentStudyTime}.pdf`);
}

function openAttendanceModal(studentId, index, name, monthlyCount, totalCount) {
    const modalEl = document.getElementById('attendanceModal');
    if (!modalEl) return;

    document.getElementById('modalStudentId').value = studentId;
    document.getElementById('modalTime').innerText = currentStudyTime || '-';
    document.getElementById('modalTeacher').innerText = currentTeacher || '-';

    // Set numeric inputs for Total/Present in modal
    const totalIn = document.getElementById('modalTotalInput');
    const presentIn = document.getElementById('modalPresentInput');
    if (totalIn) totalIn.value = document.getElementById('stat-total').value || totalCount;
    if (presentIn) presentIn.value = document.getElementById('stat-present').value || 0;

    document.getElementById('modalName').value = name;
    document.getElementById('modalMonthlyCount').innerText = `${monthlyCount} ដង`;

    // Sync with table data
    const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
    if (row) {
        const checkedRadio = row.querySelector(`input[name="status_${studentId}"]:checked`);
        const status = checkedRadio ? checkedRadio.value : 'P';
        const reasonInput = row.querySelector('input[type="text"]');
        const reason = reasonInput ? reasonInput.value : '';

        const modalRadio = document.querySelector(`input[name="modalStatus"][value="${status}"]`);
        if (modalRadio) modalRadio.checked = true;
        document.getElementById('modalReason').value = reason;
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function saveModalAttendance() {
    const studentId = document.getElementById('modalStudentId').value;
    const checkedStatus = document.querySelector('input[name="modalStatus"]:checked');
    const status = checkedStatus ? checkedStatus.value : 'P';
    const reason = document.getElementById('modalReason').value;

    // Sync manual numeric overrides if any
    const mt = document.getElementById('modalTotalInput');
    const mp = document.getElementById('modalPresentInput');
    if (mt || mp) {
        updateStats(
            parseInt(mt ? mt.value : 0),
            parseInt(mp ? mp.value : 0),
            parseInt(document.getElementById('stat-before').value || 0),
            parseInt(document.getElementById('stat-compensated').value || 0),
            parseInt(document.getElementById('stat-absent').value || 0)
        );
    }

    const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
    if (row) {
        // Update table row
        const tableRadio = row.querySelector(`input[name="status_${studentId}"][value="${status}"]`);
        if (tableRadio) tableRadio.checked = true;

        const tableReasonInput = row.querySelector('input[type="text"]');
        if (tableReasonInput) tableReasonInput.value = reason;

        // Recalculate stats
        calculateCurrentStats();

        // Close modal
        const modalEl = document.getElementById('attendanceModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        // Toast success
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
        Toast.fire({
            icon: 'success',
            title: 'រក្សាទុកបានជោគជ័យ'
        });
    }
}

function openSearchModal() {
    const studentsLoaded = document.querySelectorAll('#attendanceTableBody tr[data-student-id]').length;

    if (studentsLoaded === 0) {
        Swal.fire({
            icon: 'info',
            title: 'សូមបញ្ចូលវត្តមានជាមុន',
            text: 'សូមជ្រើសរើសម៉ោងសិក្សា និងឈ្មោះគ្រូជាមុនសិន ដើម្បីបើកទម្រង់បញ្ចូលវត្តមានសិស្ស។',
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#8a0e5b'
        });
        return;
    }

    // Guide the user to select from the list
    const searchInput = document.getElementById('studentSearch');
    if (searchInput) {
        searchInput.focus();
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
        Toast.fire({
            icon: 'info',
            title: 'សូមស្វែងរកឈ្មោះសិស្ស រួចចុចលើសិស្សនោះដើម្បីបើក Popup'
        });
    }
}


