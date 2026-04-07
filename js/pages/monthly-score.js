/**
 * monthly-score.js
 * Bulk Score Entry Logic for Teachers and Staff
 */

let allStudents = [];
let filteredStudents = [];
let teachersList = [];
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();

const subjectKeys = [
    'week01', 'week02', 'monthly', 'listening', 'speaking', 
    'reading', 'ethics', 'attendance', 'homework', 'singing', 'hsk'
];

const khmerMonthNames = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];

// 1. Initial Load
document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    loadTeachers();
    loadStudents();
    
    // Global Listeners for filters
    document.getElementById('scoreMonthSelect').addEventListener('change', (e) => {
        currentMonth = parseInt(e.target.value);
        renderTable();
    });
    
    document.getElementById('scoreYearSelect').addEventListener('change', (e) => {
        currentYear = parseInt(e.target.value);
        renderTable();
    });
    
    document.getElementById('filterTeacher').addEventListener('change', renderTable);
    document.getElementById('filterTime').addEventListener('change', renderTable);

    // Auto-select on focus for faster typing
    document.body.addEventListener('focus', (e) => {
        if (e.target.classList.contains('score-input')) {
            setTimeout(() => e.target.select(), 0);
        }
    }, true);
});

// 2. Initialize Filter UI
function initFilters() {
    // Populate Year Select (2024 to 2035)
    const yearSelect = document.getElementById('scoreYearSelect');
    const startY = 2024;
    const endY = 2035;
    for (let y = startY; y <= endY; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = toKhmerDigits(y);
        yearSelect.appendChild(opt);
    }
    
    // Set current values
    document.getElementById('scoreMonthSelect').value = currentMonth;
    document.getElementById('scoreYearSelect').value = currentYear;
}

// 3. Load Teachers
async function loadTeachers() {
    try {
        const snapshot = await firebase.database().ref('staff').once('value');
        const select = document.getElementById('filterTeacher');
        if (snapshot.exists()) {
            const data = Object.values(snapshot.val());
            teachersList = data.filter(s => {
                const pos = (s.position || '').toLowerCase();
                return pos.includes('គ្រូ') || pos.includes('teacher');
            }).sort((a, b) => (a.nameKhmer || '').localeCompare(b.nameKhmer || ''));
            
            teachersList.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.nameKhmer;
                opt.textContent = t.nameKhmer;
                select.appendChild(opt);
            });
            
            // If logged in as specific teacher (check sessionStorage/localStorage from teacher portal login)
            // But usually this page is for admins too.
        }
    } catch (e) { console.error("Error loading teachers", e); }
}

// 4. Load Students Real-time
function loadStudents() {
    const studentsRef = firebase.database().ref('students');
    studentsRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            allStudents = [];
            renderTable();
            return;
        }
        
        const data = snapshot.val();
        allStudents = Object.entries(data).map(([key, s]) => ({ ...s, key }))
            .filter(s => s.enrollmentStatus !== 'dropout' && s.enrollmentStatus !== 'graduated');
        
        // Populate Time Filter
        populateTimeFilter();
        renderTable();
    });
}

function populateTimeFilter() {
    const timeSelect = document.getElementById('filterTime');
    const currentTime = timeSelect.value;
    const times = [...new Set(allStudents.map(s => s.studyTime).filter(Boolean))].sort();
    
    timeSelect.innerHTML = '<option value="all">គ្រប់ម៉ោង</option>';
    times.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        timeSelect.appendChild(opt);
    });
    if (times.includes(currentTime)) timeSelect.value = currentTime;
}

// 4. Calculate Global Ranks for the current view
function calculateRanksForProgram(programType) {
    const studentsInProg = allStudents.filter(s => {
        const prog = (s.studyType || s.courseType || '').toLowerCase();
        const p_isChineseFullTime = prog.includes('chinese-fulltime') || prog.includes('cfulltime') || prog.includes('ចិនពេញម៉ោង');
        const p_type = p_isChineseFullTime ? 'chinese-fulltime' : 'general';
        return p_type === programType;
    });

    const averages = [];
    studentsInProg.forEach(s => {
        const record = (s.academicRecords || []).find(r => r.month == currentMonth && r.year == currentYear);
        if (record && record.averageScore > 0) {
            averages.push({ key: s.key, avg: record.averageScore });
        }
    });

    averages.sort((a, b) => b.avg - a.avg);
    
    const rankings = {};
    let currentRank = 1;
    for (let i = 0; i < averages.length; i++) {
        if (i > 0 && averages[i].avg < averages[i-1].avg) {
            currentRank = i + 1;
        }
        rankings[averages[i].key] = currentRank;
    }
    return rankings;
}

// 4. Render Table
function renderTable() {
    const body = document.getElementById('scoreTableBody');
    const teacherFilter = document.getElementById('filterTeacher').value;
    const timeFilter = document.getElementById('filterTime').value;
    const programFilter = document.getElementById('filterProgram').value;
    const searchFilter = (document.getElementById('searchStudent').value || '').toLowerCase();
    
    // 1. Calculate GLOBAL ranks for the month BEFORE rendering
    // Rank should be calculated within the SAME program type
    const calculateRanksForProgram = (progType) => {
        const studentsInProg = allStudents.filter(s => {
            const p = (s.studyType || s.courseType || '').toLowerCase();
            const isCh = p.includes('chinese-fulltime') || p.includes('cfulltime') || p.includes('ចិនពេញម៉ោង');
            const type = isCh ? 'chinese-fulltime' : 'general';
            return type === progType;
        });

        const scoresData = studentsInProg.map(s => {
            const record = (s.academicRecords || []).find(r => r.month == currentMonth && r.year == currentYear) || {};
            
            // Check if student has a row currently in the DOM
            const cachedAvg = document.getElementById(`avg-${s.key}`);
            if (cachedAvg) return { key: s.key, avg: parseFloat(cachedAvg.innerText) || 0 };
            
            return { key: s.key, avg: record.averageScore || 0 };
        }).filter(d => d.avg > 0);

        const uniqueScores = [...new Set(scoresData.map(d => d.avg))].sort((a, b) => b - a);
        const ranks = {};
        scoresData.forEach(d => { ranks[d.key] = uniqueScores.indexOf(d.avg) + 1; });
        return ranks;
    };

    const globalRanksCH = calculateRanksForProgram('chinese-fulltime');
    const globalRanksGEN = calculateRanksForProgram('general');

    // Subject Mapping Labels
    const chineseLabels = ["សប្តាហ៍១", "សប្តាហ៍២", "ប្រចាំខែ", "ស្តាប់", "និយាយ", "អាន", "សុជីវធម៌", "អវត្តមាន", "កិច្ចការ", "ច្រៀង", "HSK"];
    const generalLabels = ["ភាសាខ្មែរ", "គណិតវិទ្យា", "វិទ្យាសាស្ត្រ", "ភូមិវិទ្យា", "ប្រវត្តិវិទ្យា", "សីសធម៌ពលរដ្ឋ", "អប់រំសិស្បៈ", "បំណិនជីវិត", "អប់រំកាយ", "-", "-"];

    const isGeneralOnly = programFilter === 'general';
    const isChineseOnly = programFilter === 'chinese-fulltime';
    
    // Update Table Headers
    const headerRow = document.querySelector('#scoreEntryTable thead tr');
    if (headerRow) {
        const headers = headerRow.querySelectorAll('th');
        // skip first one (info), last 5 (total, avg, grade, rank, date)
        for (let i = 1; i <= 11; i++) {
            const label = isGeneralOnly ? generalLabels[i-1] : chineseLabels[i-1];
            headers[i].innerText = label;
            headers[i].title = label; // tooltip
        }
    }

    if (filteredStudents.length === 0) {
        body.innerHTML = `<tr><td colspan="17" class="text-center py-5">
            <div class="animate__animated animate__fadeIn">
                <i class="fi fi-rr-search-alt text-muted opacity-25" style="font-size: 4rem;"></i>
                <h4 class="khmer-muol text-muted mt-3">មិនមានសិស្សក្នុងបញ្ជីឡើយ</h4>
                <p class="text-muted small">សូមពិនិត្យមើលការកំណត់គ្រូ ឬ ម៉ោងសិក្សាឡើងវិញ</p>
            </div>
        </td></tr>`;
        updateStats(0, 0);
        return;
    }

    let completedCount = 0;
    
    body.innerHTML = filteredStudents.map((s, idx) => {
        const prog = (s.studyType || s.courseType || '').toLowerCase();
        const isCh = prog.includes('chinese-fulltime') || prog.includes('cfulltime') || prog.includes('ចិនពេញម៉ោង');
        const pType = isCh ? 'chinese-fulltime' : 'general';
        
        const record = (s.academicRecords || []).find(r => r.month == currentMonth && r.year == currentYear) || {};
        const isCompleted = record.totalScore > 0;
        if (isCompleted) completedCount++;

        const currentRank = (pType === 'chinese-fulltime' ? globalRanksCH[s.key] : globalRanksGEN[s.key]) || '-';

        return `
            <tr data-key="${s.key}" data-program="${pType}" class="${isCompleted ? 'completed' : ''}">
                <td class="student-info-cell">
                    <div class="d-flex align-items-center">
                        <div class="fw-bold text-slate-400 me-2" style="font-size: 0.7rem;">${idx + 1}.</div>
                        <div>
                            <div class="d-flex align-items-center gap-2">
                                <div class="fw-bold text-dark" style="font-size: 0.85rem;">${s.lastName || ''} ${s.firstName || ''}</div>
                                ${s.chineseName ? `<div class="badge bg-warning bg-opacity-10 text-dark border-warning border-opacity-25 px-2 py-0" style="font-size: 0.7rem; font-weight: 700;">${s.chineseName}</div>` : ''}
                            </div>
                            <div class="text-muted" style="font-size: 0.65rem;">ID: ${s.displayId || '---'} | ${s.studyTime || '-'}</div>
                        </div>
                    </div>
                </td>
                ${subjectKeys.map((key, kIdx) => {
                    const isHSKDisabled = pType === 'general' && kIdx >= 9;
                    return `
                    <td>
                        <input type="number" step="0.01" min="0" max="10" 
                            class="score-input input-${key}" 
                            data-key="${key}" 
                            value="${record[key] !== undefined ? record[key] : (isHSKDisabled ? 0 : '')}"
                            ${isHSKDisabled ? 'disabled style="opacity: 0.1;"' : ''}
                            oninput="handleInputChange(this)"
                            onkeydown="handleKeyNavigation(event, this)">
                    </td>
                    `;
                }).join('')}
                <td><span class="badge-score badge-total" id="total-${s.key}">${(record.totalScore || 0).toFixed(2)}</span></td>
                <td><span class="badge-score badge-avg" id="avg-${s.key}">${(record.averageScore || 0).toFixed(2)}</span></td>
                <td><span class="badge-score badge-grade" id="grade-${s.key}">${record.grade || '-'}</span></td>
                <td><span class="badge-score badge-rank" id="rank-${s.key}">${currentRank}</span></td>
                <td><span class="small text-muted" id="date-${s.key}" style="font-size: 0.65rem;">${record.updatedAt ? formatPremiumDate(record.updatedAt) : '-'}</span></td>
            </tr>
        `;
    }).join('');
    
    updateStats(filteredStudents.length, completedCount);
}

/**
 * Standardize Date to DD-MMM-YYYY
 * Handle ISO Strings, D/M/YYYY, etc.
 */
function formatPremiumDate(dateStr) {
    if (!dateStr || ['N/A', '', 'មិនមាន', 'null', 'undefined'].includes(dateStr)) return '-';
    
    let d = new Date(dateStr);
    
    // If invalid, attempt custom parse (for 7/12/2025 etc)
    if (isNaN(d.getTime())) {
        d = parseAnyDate(dateStr);
    }
    
    if (!d || isNaN(d.getTime())) return dateStr;

    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
}

function parseAnyDate(dateStr) {
    if (typeof dateStr !== 'string') return null;
    
    // Try D/M/YYYY
    const parts = dateStr.split(/[-\/.\s]/).filter(p => p.trim() !== '');
    if (parts.length === 3) {
        let d = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let y = parseInt(parts[2]);
        
        // Basic heuristic: check if parts[0] is year or parts[2] is year
        if (y < 100) y += 2000;
        if (d > 1000) { let tmp = d; d = y; y = tmp; } // YYYY-MM-DD
        
        const date = new Date(y, m - 1, d);
        if (!isNaN(date.getTime())) return date;
    }
    return null;
}

// 6. Live Calculations
function handleInputChange(input) {
    const tr = input.closest('tr');
    const key = tr.getAttribute('data-key');
    
    // Validate min/max
    let val = parseFloat(input.value);
    if (val > 10) input.value = 10;
    if (val < 0) input.value = 0;
    
    recalculateRow(tr);
    calculateAllRanks();
}

function recalculateRow(tr) {
    const key = tr.getAttribute('data-key');
    const pType = tr.getAttribute('data-program') || 'chinese-fulltime';
    const inputs = tr.querySelectorAll('.score-input');
    
    let total = 0;
    inputs.forEach(inp => {
        total += parseFloat(inp.value) || 0;
    });
    
    // Dynamic Divider: 11 for Chinese, 9 for General Knowledge
    const divider = pType === 'chinese-fulltime' ? 11 : 9;
    const avg = total / divider;
    
    let grade = 'F';
    if (avg >= 9) grade = 'A';
    else if (avg >= 8) grade = 'B';
    else if (avg >= 7) grade = 'C';
    else if (avg >= 6) grade = 'D';
    else if (avg >= 5) grade = 'E';

    document.getElementById(`total-${key}`).innerText = total.toFixed(2);
    document.getElementById(`avg-${key}`).innerText = avg.toFixed(2);
    
    const gradeEl = document.getElementById(`grade-${key}`);
    gradeEl.innerText = grade;
    
    // Style Grade
    gradeEl.className = 'badge-score badge-grade ' + (
        (grade === 'A' || grade === 'B') ? 'bg-success text-white' :
        (grade === 'C' || grade === 'D') ? 'bg-primary text-white' :
        (grade === 'E') ? 'bg-warning text-dark' : 'bg-danger text-white'
    );
}

function calculateAllRanks() {
    // 1. Calculate for Chinese
    const ranksCH = calculateRanksSpecific('chinese-fulltime');
    // 2. Calculate for General
    const ranksGEN = calculateRanksSpecific('general');
    
    // 3. Update DOM
    const visibleRows = document.querySelectorAll('#scoreTableBody tr[data-key]');
    visibleRows.forEach(row => {
        const key = row.getAttribute('data-key');
        const pType = row.getAttribute('data-program') || 'chinese-fulltime';
        const rank = pType === 'chinese-fulltime' ? (ranksCH[key] || '-') : (ranksGEN[key] || '-');
        document.getElementById(`rank-${key}`).innerText = rank;
    });
}

function calculateRanksSpecific(progType) {
    const monthScoresData = allStudents.map(s => {
        const p = (s.studyType || s.courseType || '').toLowerCase();
        const isCh = p.includes('chinese-fulltime') || p.includes('cfulltime') || p.includes('ចិនពេញម៉ោង');
        const type = isCh ? 'chinese-fulltime' : 'general';
        if (type !== progType) return null;

        const record = (s.academicRecords || []).find(r => r.month == currentMonth && r.year == currentYear) || {};
        const tr = document.querySelector(`tr[data-key="${s.key}"]`);
        if (tr) {
            const avg = parseFloat(document.getElementById(`avg-${s.key}`).innerText) || 0;
            return { key: s.key, avg };
        }
        return { key: s.key, avg: record.averageScore || 0 };
    }).filter(d => d && d.avg > 0);
    
    const uniqueScores = [...new Set(monthScoresData.map(d => d.avg))].sort((a, b) => b - a);
    const ranks = {};
    monthScoresData.forEach(d => {
        ranks[d.key] = uniqueScores.indexOf(d.avg) + 1;
    });
    return ranks;
}

// 7. Keyboard Navigation (Professional Standard)
function handleKeyNavigation(e, input) {
    const tr = input.closest('tr');
    const td = input.closest('td');
    const inputsInRow = Array.from(tr.querySelectorAll('.score-input'));
    const currentColIdx = inputsInRow.indexOf(input);
    
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        const nextTr = tr.nextElementSibling;
        if (nextTr) {
            const target = nextTr.querySelectorAll('.score-input')[currentColIdx];
            if (target) {
                target.focus();
                target.select();
            }
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevTr = tr.previousElementSibling;
        if (prevTr) {
            const target = prevTr.querySelectorAll('.score-input')[currentColIdx];
            if (target) {
                target.focus();
                target.select();
            }
        }
    } else if (e.key === 'ArrowRight') {
        // Only move if at the end of input or nothing selected
        if (input.selectionEnd === input.value.length || input.value === '') {
            const nextInput = inputsInRow[currentColIdx + 1];
            if (nextInput) {
                e.preventDefault();
                nextInput.focus();
                nextInput.select();
            }
        }
    } else if (e.key === 'ArrowLeft') {
        // Only move if at the start of input or nothing selected
        if (input.selectionStart === 0 || input.value === '') {
            const prevInput = inputsInRow[currentColIdx - 1];
            if (prevInput) {
                e.preventDefault();
                prevInput.focus();
                prevInput.select();
            }
        }
    }
}

// 8. Stats Update
function updateStats(total, completed) {
    document.getElementById('statTotalStudents').innerText = total;
    document.getElementById('statCompleted').innerText = completed;
    document.getElementById('statRemaining').innerText = total - completed;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById('statPercent').innerText = percent + '%';
}

// 9. Save All Logic
async function saveAllScores() {
    const rows = document.querySelectorAll('#scoreTableBody tr[data-key]');
    if (rows.length === 0) return;

    const confirm = await Swal.fire({
        title: 'បញ្ជាក់ការរក្សាទុក',
        text: `តើអ្នកចង់រក្សាទុកពិន្ទុសិស្សទាំង ${rows.length} នាក់សម្រាប់ខែ ${khmerMonthNames[currentMonth-1]} មែនទេ?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'បាទ/ចាស រក្សាទុក',
        cancelButtonText: 'បោះបង់'
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({
        title: 'កំពុងរក្សាទុក...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const updates = {};
        for (const row of rows) {
            const key = row.getAttribute('data-key');
            const student = allStudents.find(s => s.key === key);
            if (!student) continue;

            let records = Array.isArray(student.academicRecords) ? [...student.academicRecords] : [];
            
            const totalScore = parseFloat(document.getElementById(`total-${key}`).innerText);
            const averageScore = parseFloat(document.getElementById(`avg-${key}`).innerText);
            const grade = document.getElementById(`grade-${key}`).innerText;
            const rankStr = document.getElementById(`rank-${key}`).innerText;
            const rank = rankStr === '-' ? null : parseInt(rankStr);

            const recordData = {
                month: currentMonth,
                monthName: khmerMonthNames[currentMonth-1],
                year: currentYear,
                totalScore: totalScore,
                averageScore: averageScore,
                grade: grade,
                rank: rank,
                updatedAt: new Date().toISOString(),
                updatedBy: 'Bulk Entry System'
            };

            // Get component scores
            subjectKeys.forEach(sKey => {
                const val = parseFloat(row.querySelector(`.input-${sKey}`).value);
                recordData[sKey] = !isNaN(val) ? val : 0;
            });

            // Update or Add
            const existingIdx = records.findIndex(r => r.month == currentMonth && r.year == currentYear);
            if (existingIdx >= 0) {
                records[existingIdx] = { ...records[existingIdx], ...recordData };
            } else {
                records.push(recordData);
            }

            // Also update top-level summary for quick access
            updates[`/students/${key}/academicRecords`] = records;
            updates[`/students/${key}/lastAverageScore`] = averageScore;
            updates[`/students/${key}/lastGrade`] = grade;
            updates[`/students/${key}/lastRank`] = rank;
            updates[`/students/${key}/lastScoreUpdate`] = new Date().toISOString();
        }

        await firebase.database().ref().update(updates);
        
        Swal.fire({
            icon: 'success',
            title: 'រក្សាទុកជោគជ័យ',
            text: `ពិន្ទុសិស្សសម្រាប់ខែ ${khmerMonthNames[currentMonth-1]} ត្រូវបានរក្សាទុកក្នុងប្រព័ន្ធរួចរាល់!`,
            timer: 3000
        });

    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'បរាជ័យក្នុងការរក្សាទុកទិន្នន័យ', 'error');
    }
}

// 10. Helper: Khmer Digits
function toKhmerDigits(num) {
    if (!num) return '០';
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return num.toString().split('').map(digit => khmerDigits[digit] || digit).join('');
}

// 11. Excel Export (Professional Standard with SheetJS)
function exportToExcel() {
    // We create the data manually because table_to_book doesn't always pick up input values accurately
    const data = [];
    const headers = [
        "ល.រ (No.)", "ឈ្មោះសិស្ស (Student Name)", "ID", "ម៉ោងសិក្សា", 
        "សប្តាហ៍១", "សប្តាហ៍២", "ប្រចាំខែ", "ស្តាប់", "និយាយ", "អាន", "សុជីវធម៌", "អវត្តមាន", "កិច្ចការ", "ច្រៀង", "HSK",
        "សរុប", "មធ្យម", "និទ្ទេស", "ចំណាត់ថ្នាក់"
    ];
    data.push(headers);

    const rows = document.querySelectorAll('#scoreTableBody tr[data-key]');
    rows.forEach((row, idx) => {
        const key = row.getAttribute('data-key');
        const student = allStudents.find(s => s.key === key);
        const name = `${student.lastName || ''} ${student.firstName || ''}`;
        
        const rowData = [
            idx + 1,
            name,
            student.displayId || student.id || '',
            student.studyTime || '',
            ...subjectKeys.map(k => row.querySelector(`.input-${k}`).value || '0'),
            document.getElementById(`total-${key}`).innerText,
            document.getElementById(`avg-${key}`).innerText,
            document.getElementById(`grade-${key}`).innerText,
            document.getElementById(`rank-${key}`).innerText
        ];
        data.push(rowData);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Scores");
    
    // Auto-width columns
    const wscols = headers.map(h => ({ wch: h.length + 10 }));
    worksheet['!cols'] = wscols;

    const fileName = `Monthly_Score_Report_${khmerMonthNames[currentMonth-1]}_${currentYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}
