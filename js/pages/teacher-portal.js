/**
 * teacher-portal-script.js
 * Manages the Teacher Portal Logic with Real-time Updates & Smart Editing
 */

let currentTeacher = null;
let allMyStudents = [];
let availableTeachers = [];
let addScoreModal = null;
let studentsUnsubscribe = null;
let currentStudentKey = null;
let historyModal = null;

// Initialize on Load
const khmerMonthNames = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const toKhmerDigits = (num) => {
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return num.toString().split('').map(digit => khmerDigits[digit] || digit).join('');
};

document.addEventListener('DOMContentLoaded', () => {
    const _addScoreEl = document.getElementById('addScoreModal');
    const _historyEl = document.getElementById('historyModal');
    if (_addScoreEl) addScoreModal = bootstrap.Modal.getOrCreateInstance(_addScoreEl);
    if (_historyEl) historyModal = bootstrap.Modal.getOrCreateInstance(_historyEl);
    loadTeachers();
    setupAutoCalculations();

    // Smart Date Picker Listener (New selects)
    const triggerCheck = () => {
        const m = document.getElementById('scoreMonthSelect').value;
        const y = document.getElementById('scoreYearSelect').value;
        const monthStr = `${y}-${m.padStart(2, '0')}`;
        document.getElementById('scoreMonth').value = monthStr;
        if (currentStudentKey) checkForExistingScore(currentStudentKey, monthStr);
    };

    document.getElementById('scoreMonthSelect').addEventListener('change', triggerCheck);
    document.getElementById('scoreYearSelect').addEventListener('change', triggerCheck);
    document.getElementById('programLoginSelect').addEventListener('change', filterTeachersByProgramLogin);
});

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
        Swal.fire('បញ្ហា', 'បរាជ័យក្នុងការទាញយកឈ្មោះគ្រូ', 'error');
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
    const correctPin = teacherProfile ? (teacherProfile.pin || '2024') : '2024';

    if (pin !== correctPin) {
        return Swal.fire('បញ្ហា', 'លេខកូដសម្ងាត់មិនត្រឹមត្រូវ', 'error');
    }

    currentTeacher = name;
    document.getElementById('loggedInTeacherName').innerText = name;

    // Switch Views
    document.getElementById('loginSection').classList.add('d-none');
    document.getElementById('portalSection').classList.remove('d-none');
    document.getElementById('portalSection').classList.add('animate__animated', 'animate__fadeIn');

    // Load Data Real-time
    subscribeToMyStudents();
}

function logout() {
    // Detach listener
    if (studentsUnsubscribe) {
        firebase.database().ref('students').off('value', studentsUnsubscribe);
    }
    currentTeacher = null;
    allMyStudents = [];
    document.getElementById('loginForm').reset();
    document.getElementById('portalSection').classList.add('d-none');
    document.getElementById('loginSection').classList.remove('d-none');
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
        // Note: student.teacherName stores the Khmer name typically
        allMyStudents = Object.entries(data).map(([key, s]) => ({ ...s, key }))
            .filter(s => s.teacherName === currentTeacher);

        // Update Filters & UI
        populateTimeFilter();
        renderStudents();
        updateDashboardStats();
    }, (error) => {
        console.error("Error loading students:", error);
        container.innerHTML = `<div class="col-12 text-center text-danger">មានបញ្ហាក្នុងការទាញយកទិន្នន័យ</div>`;
    });
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
        const statusMatch = filterStatus === 'all' ? true : (filterStatus === 'active' ? isActive : !isActive);
        
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
                        <img src="${s.imageUrl || '/img/1.jpg'}" class="student-avatar" alt="Student">
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
    document.getElementById('totalStudentsCount').innerText = total;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    // Update Dashboard Label with Khmer Month
    const progressLabel = document.querySelector('#portalSection p.text-muted.small.mb-0');
    if (progressLabel) {
        progressLabel.innerText = `ការដាក់ពិន្ទុសម្រាប់ខែ ${khmerMonthNames[currentMonth - 1]} ឆ្នាំ ${toKhmerDigits(currentYear)}`;
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

    document.getElementById('scoredCount').innerText = scored;
    document.getElementById('remainingCount').innerText = remaining;
    document.getElementById('scoredPercent').innerText = percent + '%';

    const progressBar = document.getElementById('scoringProgressBar');
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
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
    const chineseLabels = ["សប្តាហ៍ទី១", "សប្តាហ៍ទី២", "ប្រចាំខែ", "ស្តាប់", "និយាយ", "អាន", "សុជីវធម៌", "អវត្តមាន", "កិច្ចការផ្ទះ", "ច្រៀង", "HSK"];
    const generalLabels = ["ភាសាខ្មែរ", "គណិតវិទ្យា", "វិទ្យាសាស្ត្រ", "ភូមិវិទ្យា", "ប្រវត្តិវិទ្យា", "សីលធម៌ពលរដ្ឋ", "អប់រំសិល្បៈ", "បំណិនជីវិត", "អប់រំកាយ", "", ""];
    
    const subjectKeys = ['scoreWeek01','scoreWeek02','scoreMonthly','scoreListening','scoreSpeaking','scoreReading','scoreEthics','scoreAttendance','scoreHomework','scoreSinging','scoreHSK'];
    
    // Apply Labels & Visibility
    subjectKeys.forEach((id, index) => {
        const input = document.getElementById(id);
        const container = input.closest('.col-6') || input.parentElement;
        const label = container.querySelector('.score-input-label');
        
        if (isChineseFullTime) {
            label.innerText = chineseLabels[index];
            container.style.display = 'block';
            input.disabled = false;
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

    // Store type in modal attribute for updateTotals
    const modalElement = document.getElementById('addScoreModal');
    modalElement.setAttribute('data-student-program', isChineseFullTime ? 'chinese-fulltime' : 'general');

    // Check if score exists for this month
    checkForExistingScore(key, monthStr);

    addScoreModal.show();
}

function checkForExistingScore(studentKey, monthStr) {
    const student = allMyStudents.find(s => s.key === studentKey);
    // Parse YYYY-MM
    const [yearStr, monthStrVal] = monthStr.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStrVal);

    if (!student || !student.academicRecords || !Array.isArray(student.academicRecords)) {
        resetScoreForm();
        return;
    }

    // Find record in array
    const existingRecord = student.academicRecords.find(r => r.year == year && r.month == month);

    if (existingRecord) {
        // Populate
        // Populate 11 subjects
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
        document.getElementById('scoreRank').value = existingRecord.rank || '';

        // Show status
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
        'scoreSinging', 'scoreHSK', 'scoreRank'
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
        'scoreSinging', 'scoreHSK'
    ];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateTotals);
    });
    document.getElementById('scoreRank').addEventListener('input', () => {
        document.getElementById('displayRank').innerText = document.getElementById('scoreRank').value || '-';
    });
}

// 5. Real-time Calculation Display
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

    const total = w1 + w2 + m + l + s + r + e + a + h + sg + hsk;

    // Dynamic Divider: 11 for Chinese Full-Time, 9 for General Knowledge
    const modalElement = document.getElementById('addScoreModal');
    const program = modalElement.getAttribute('data-student-program') || 'chinese-fulltime';
    const divider = program === 'chinese-fulltime' ? 11 : 9;

    const avg = total / divider;

    // Determine Grade & Color
    let grade = 'F';
    let themeClass = 'bg-soft-danger text-danger';

    if (avg >= 9) { grade = 'A'; themeClass = 'bg-soft-success text-success'; }
    else if (avg >= 8) { grade = 'B'; themeClass = 'bg-soft-success text-success'; }
    else if (avg >= 7) { grade = 'C'; themeClass = 'bg-soft-primary text-primary'; }
    else if (avg >= 6) { grade = 'D'; themeClass = 'bg-soft-primary text-primary'; }
    else if (avg >= 5) { grade = 'E'; themeClass = 'bg-soft-warning text-warning'; }

    // Update Scores
    document.getElementById('displayTotal').innerText = total.toFixed(2);
    document.getElementById('displayAvg').innerText = avg.toFixed(2);
    
    // Update Grade Display
    const gradeDisplay = document.getElementById('displayGrade');
    gradeDisplay.innerText = grade;
    
    // Style the parent pill for Grade
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
    
    // Filter the group to only include students of the SAME program (Chinese vs General)
    const modalElement = document.getElementById('addScoreModal');
    const myProgram = modalElement.getAttribute('data-student-program') || 'chinese-fulltime';
    
    const studentGroup = allMyStudents.filter(s => {
        const prog = (s.studyType || s.courseType || '').toLowerCase();
        const p_isChineseFullTime = prog.includes('chinese-fulltime') || prog.includes('cfulltime') || prog.includes('ចិនពេញម៉ោង');
        const p_type = p_isChineseFullTime ? 'chinese-fulltime' : 'general';
        return p_type === myProgram;
    });

    // Collect averages of all students in THIS program for THIS month
    const scores = [];
    studentGroup.forEach(s => {
        if (s.academicRecords && Array.isArray(s.academicRecords)) {
            const rec = s.academicRecords.find(r => r.year == year && r.month == month);
            if (rec) scores.push(rec.averageScore || 0);
        }
    });

    // Add current student's average if not already in list
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

// 6. Save Score
async function saveScore() {
    const key = document.getElementById('modalStudentKey').value;
    const monthVal = document.getElementById('scoreMonth').value; // YYYY-MM

    if (!key || !monthVal) return;

    const [year, month] = monthVal.split('-').map(Number); // Parse for integer storage

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
    const rank = document.getElementById('scoreRank').value || '-';

    const total = parseFloat(document.getElementById('displayTotal').innerText);
    const avg = parseFloat(document.getElementById('displayAvg').innerText);
    const grade = document.getElementById('displayGrade').innerText;

    // Check zero
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

        // Find existing student records
        const student = allMyStudents.find(s => s.key === key);
        let records = [];
        if (student && student.academicRecords && Array.isArray(student.academicRecords)) {
            records = [...student.academicRecords]; // Clone array
        }

        // Construct Record Object (Matches data-tracking-script.js schema)
        const newRecord = {
            month: month,
            year: year,
            week01: w1,
            week02: w2,
            monthly: m,
            listening: l,
            speaking: s,
            reading: r,
            ethics: e,
            attendance: a,
            homework: h,
            singing: sg,
            hsk: hsk,
            totalScore: total,
            averageScore: avg,
            grade: grade,
            rank: rank,
            createdAt: new Date().toISOString(),
            createdBy: currentTeacher,
            details: `Via Teacher Portal`
        };

        // Check if updating existing
        const existingIndex = records.findIndex(r => r.year == year && r.month == month);

        if (existingIndex >= 0) {
            // Update existng
            records[existingIndex] = { ...records[existingIndex], ...newRecord };
        } else {
            // Add new
            records.push(newRecord);
        }

        // Write entire array back to 'academicRecords' node
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
// 7. View History
// 7. View History
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

        // Calculate Stats Summary
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
            // Trend Indicator (Compare with previous record in time)
            let trendHtml = '';
            if (index < sorted.length - 1) {
                const prevRec = sorted[index + 1];
                const diff = Number(rec.totalScore) - Number(prevRec.totalScore);
                if (diff > 0) trendHtml = `<span class="text-success ms-1 small" title="ពិន្ទុកើនឡើង"><i class="fi fi-rr-arrow-small-up"></i></span>`;
                else if (diff < 0) trendHtml = `<span class="text-danger ms-1 small" title="ពិន្ទុធ្លាក់ចុះ"><i class="fi fi-rr-arrow-small-down"></i></span>`;
            }

            const subjects = `
                <div class="row g-2 text-start mt-2 bg-light p-2 rounded-3 border border-light" style="font-size: 0.65rem; color: #555;">
                    <div class="col-4 col-md-3 border-end">សបា្តហ៍01 (第一周): <strong class="text-dark">${rec.week01 || 0}</strong></div>
                    <div class="col-4 col-md-3 border-end">សបា្តហ៍02 (第二周): <strong class="text-dark">${rec.week02 || 0}</strong></div>
                    <div class="col-4 col-md-3 border-end">ប្រចាំខែ (月考): <strong class="text-dark">${rec.monthly || 0}</strong></div>
                    <div class="col-4 col-md-3 border-end">ស្តាប់ (听力): <strong class="text-dark">${rec.listening || 0}</strong></div>
                    <div class="col-4 col-md-3 border-end">និយាយ (口语): <strong class="text-dark">${rec.speaking || 0}</strong></div>
                    <div class="col-4 col-md-3 border-end">អាន (阅读): <strong class="text-dark">${rec.reading || 0}</strong></div>
                    <div class="col-4 col-md-3 border-end">សុជីវធម៌ (品德): <strong class="text-dark">${rec.ethics || 0}</strong></div>
                    <div class="col-4 col-md-3 border-end">អវត្តមាន (考勤): <strong class="text-dark">${rec.attendance || 0}</strong></div>
                    <div class="col-4 col-md-3 border-end">កិច្ចការផ្ទះ (作业): <strong class="text-dark">${rec.homework || 0}</strong></div>
                    <div class="col-4 col-md-3 border-end">ច្រៀង (唱歌): <strong class="text-dark">${rec.singing || 0}</strong></div>
                    <div class="col-4 col-md-3">HSK: <strong class="text-dark">${rec.hsk || 0}</strong></div>
                </div>
            `;

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


