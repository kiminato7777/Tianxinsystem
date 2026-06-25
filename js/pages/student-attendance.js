// Register custom fonts in pdfMake if available
if (typeof pdfMake !== 'undefined') {
    // 1. Register Khmer OS if available
    if (typeof khmerFontBase64 !== 'undefined') {
        pdfMake.vfs['KhmerOSBattambang.ttf'] = khmerFontBase64;
    }
    // 2. Register Kantumruy if available
    if (typeof kantumruyRegularBase64 !== 'undefined' && typeof kantumruyBoldBase64 !== 'undefined') {
        pdfMake.vfs['Kantumruy-Regular.ttf'] = kantumruyRegularBase64;
        pdfMake.vfs['Kantumruy-Bold.ttf'] = kantumruyBoldBase64;
    }

    pdfMake.fonts = {
        Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-MediumItalic.ttf'
        },
        KhmerOS: {
            normal: 'KhmerOSBattambang.ttf',
            bold: 'KhmerOSBattambang.ttf',
            italics: 'KhmerOSBattambang.ttf',
            bolditalics: 'KhmerOSBattambang.ttf'
        },
        Kantumruy: {
            normal: 'Kantumruy-Regular.ttf',
            bold: 'Kantumruy-Bold.ttf',
            italics: 'Kantumruy-Regular.ttf',
            bolditalics: 'Kantumruy-Bold.ttf'
        }
    };
}
// Sanitization helper for Firebase keys
function sanitizeFirebaseKey(key) {
    if (!key) return '';
    return key.replace(/[\.\#\$\/\[\]]/g, '-');
}

// Robust helper to parse stacked student name strings into Khmer Name, Chinese Name, and Student ID
function parseStudentNameDetails(fullNameStr) {
    if (!fullNameStr) return { khmerName: '', chineseName: '', studentId: '' };
    
    let studentId = '';
    const idMatch = fullNameStr.match(/\(([^)]+)\)/);
    if (idMatch) {
        studentId = idMatch[1].trim();
        fullNameStr = fullNameStr.replace(/\(([^)]+)\)/, '');
    }
    
    const chineseRegex = /[\u4e00-\u9fa5\u3400-\u4dbf\s]+/g;
    let chineseName = '';
    let khmerName = fullNameStr;
    
    const matches = fullNameStr.match(chineseRegex);
    if (matches) {
        let bestMatch = '';
        for (let m of matches) {
            if (m.trim() && /[\u4e00-\u9fa5\u3400-\u4dbf]/.test(m)) {
                bestMatch = m.trim();
            }
        }
        if (bestMatch) {
            chineseName = bestMatch;
            const chineseIndex = fullNameStr.indexOf(bestMatch);
            if (chineseIndex !== -1) {
                khmerName = fullNameStr.substring(0, chineseIndex).trim();
            }
        }
    }
    
    khmerName = khmerName.trim();
    
    return {
        khmerName: khmerName || fullNameStr.trim(),
        chineseName: chineseName || '',
        studentId: studentId
    };
}

// Robust helper to convert DD/MM/YYYY or YYYY-MM-DD to YYYY-MM-DD
function getYYYYMMDD(dateStr) {
    if (!dateStr) return '';
    const cleaned = dateStr.replace(/\s+/g, '').replace(/\//g, '-');
    const parts = cleaned.split('-');
    if (parts.length !== 3) return '';
    if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1]}-${parts[2]}`; // YYYY-MM-DD
    }
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert DD-MM-YYYY to YYYY-MM-DD
}

// Loading overlay helper
function showLoading(isLoading, msg) {
    if (isLoading) {
        if (window.showPopupLoader) window.showPopupLoader(msg || 'កំពុងដំណើរការ...');
        else if (window.showUniversalLoader) window.showUniversalLoader();
    } else {
        if (window.hidePopupLoader) window.hidePopupLoader();
        if (window.hideUniversalLoader) window.hideUniversalLoader();
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('attendanceForm');
    const totalStudents = document.getElementById('att_totalStudents');
    const presentStudents = document.getElementById('att_presentStudents');
    const absentStudents = document.getElementById('att_absentStudents');
    const btnResetForm = document.getElementById('btnResetForm');

    // Store students in memory for dynamic filtering
    window.allStudentsData = [];

    // Initialize Select2 with dropdownParent for modal
    if ($('.select2-student').length) {
        $('.select2-student').select2({
            theme: 'bootstrap-5',
            placeholder: '-- ជ្រើសរើសសិស្ស --',
            allowClear: true,
            dropdownParent: $('#attendanceModal'),
            multiple: true, // Enabled multiple selection
            tags: true,     // User អាចបញ្ចូលឈ្មោះសិស្សថ្មីបាន បើរកមិនឃើញ
            tokenSeparators: [','] // Allow separating custom names with comma
        });
    }

    // Allow user to manually edit the numbers if they want
    function calcPresentFromTotalAndAbsent() {
        const total = parseInt(totalStudents.value) || 0;
        const absent = parseInt(absentStudents.value) || 0;
        const present = total - absent;
        presentStudents.value = present >= 0 ? present : 0;
    }

    if (totalStudents) totalStudents.addEventListener('input', calcPresentFromTotalAndAbsent);
    if (absentStudents) absentStudents.addEventListener('input', calcPresentFromTotalAndAbsent);

    // Auto calculate absent when selecting from dropdown
    function calcAbsentFromSelection() {
        const total = parseInt(totalStudents.value) || 0;
        const selectedStudents = $('#att_studentName').val() || [];
        const absent = selectedStudents.length;

        absentStudents.value = absent;
        const present = total - absent;
        presentStudents.value = present >= 0 ? present : 0;
    }

    // Helper to dynamically style student leave dropdowns based on their value
    window.styleLeaveSelect = function(selectEl) {
        if (!selectEl) return;
        const val = selectEl.value;
        selectEl.classList.remove('status-bought', 'status-called', 'status-none');
        if (val === 'B') {
            selectEl.classList.add('status-bought');
        } else if (val === 'S') {
            selectEl.classList.add('status-called');
        } else if (val === 'A') {
            selectEl.classList.add('status-none');
        }
    };

    // Dynamically build and render rows for each selected student
    function renderDynamicStudentRows() {
        const selectedKeys = $('#att_studentName').val() || [];
        const container = document.getElementById('dynamicStudentsList');
        const placeholder = document.getElementById('noStudentSelectedPlaceholder');
        const section = document.getElementById('dynamicStudentSection');
        
        if (!container) return;

        // Save current states of existing rows to prevent losing user inputs
        const currentStates = {};
        container.querySelectorAll('.student-attendance-card').forEach(card => {
            const key = card.getAttribute('data-student-key');
            const statusSelect = card.querySelector('.student-leave-type');
            const reasonInput = card.querySelector('.student-reason');
            if (key && statusSelect && reasonInput) {
                currentStates[key] = { 
                    status: statusSelect.value, 
                    reason: reasonInput.value 
                };
            }
        });

        // Clear and rebuild the rows
        container.innerHTML = '';

        if (selectedKeys.length === 0) {
            if (placeholder) placeholder.classList.remove('d-none');
            if (section) section.classList.add('d-none');
            return;
        }

        if (placeholder) placeholder.classList.add('d-none');
        if (section) section.classList.remove('d-none');

        // Create the table structure
        let tableHtml = `
            <div class="table-responsive rounded-4 border bg-white shadow-sm overflow-hidden" style="border-color: rgba(0,0,0,0.08) !important;">
                <table class="table table-hover align-middle mb-0" style="font-size: 14px;">
                    <thead style="background: rgba(138, 14, 91, 0.04); border-bottom: 1.5px solid rgba(0,0,0,0.05);">
                        <tr>
                            <th class="ps-3 py-3 text-start" style="width: 25%; color: var(--bs-pink-dark); font-weight: 700;">ឈ្មោះសិស្ស (Student Name)</th>
                            <th class="py-3 text-start" style="width: 20%; color: var(--bs-pink-dark); font-weight: 700;">ឈ្មោះចិន (Chinese Name)</th>
                            <th class="py-3 text-start" style="width: 10%; color: var(--bs-pink-dark); font-weight: 700;">ភេទ (Gender)</th>
                            <th class="py-3 text-start" style="width: 23%; color: var(--bs-pink-dark); font-weight: 700;">ប្រភេទច្បាប់ (Leave Type)</th>
                            <th class="pe-3 py-3 text-start" style="width: 22%; color: var(--bs-pink-dark); font-weight: 700;">មូលហេតុ (Reason)</th>
                        </tr>
                    </thead>
                    <tbody id="dynamicStudentsTableBody">
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = tableHtml;
        const tbody = document.getElementById('dynamicStudentsTableBody');

        selectedKeys.forEach((key, index) => {
            const student = window.allStudentsData.find(s => s.key === key);
            const displayName = student ? (student.khmerName || student.fullName) : key;
            const chineseName = student ? (student.chineseName || '-') : '-';
            
            // Get gender
            const gender = student ? (student.gender || '') : '';
            const genderKhmer = (gender === 'Male' || gender === 'ប្រុស') ? 'ប្រុស' : ((gender === 'Female' || gender === 'ស្រី') ? 'ស្រី' : '-');
            const genderClass = genderKhmer === 'ប្រុស' ? 'text-primary fw-bold' : (genderKhmer === 'ស្រី' ? 'text-danger fw-bold' : 'text-muted');

            // Get previous state if it exists, otherwise default to "A" (No permission)
            const status = currentStates[key] ? currentStates[key].status : 'A';
            const reason = currentStates[key] ? currentStates[key].reason : '';

            // Class for coloring
            const selectClass = status === 'B' ? 'status-bought' : (status === 'S' ? 'status-called' : 'status-none');

            const rowHtml = `
                <tr class="student-attendance-card align-middle" data-student-key="${key}">
                    <!-- Student Info -->
                    <td class="ps-3 py-3 text-start">
                        <div class="d-flex align-items-center gap-2.5">
                            <div class="row-number-circle" style="width: 34px; height: 34px; border-radius: 50%; background: rgba(138, 14, 91, 0.08); color: var(--bs-pink-dark); display: flex; align-items: center; justify-content: center; font-weight: bold; border: 1px solid rgba(138, 14, 91, 0.12); flex-shrink: 0; font-size: 14px;">
                                ${index + 1}
                            </div>
                            <div style="text-align: left; min-width: 0; line-height: 1.25;">
                                <div class="fw-bold text-dark student-display-name text-truncate" style="font-size: 14px;" title="${displayName}">${displayName}</div>
                            </div>
                        </div>
                    </td>
                    
                    <!-- Chinese Name -->
                    <td class="py-3 text-start fw-bold text-success" style="font-size: 14px;">${chineseName}</td>
                    
                    <!-- Gender -->
                    <td class="py-3 text-start ${genderClass}" style="font-size: 14px;">${genderKhmer}</td>
                    
                    <!-- Leave Type Selection -->
                    <td class="py-3">
                        <select class="form-select form-select-sm student-leave-type leave-select-styled ${selectClass}" 
                                style="border-radius: 8px; font-size: 14px; padding: 6px 12px;"
                                onchange="styleLeaveSelect(this)">
                            <option value="B" class="text-dark" ${status === 'B' ? 'selected' : ''}>សិស្សទិញច្បាប់មុន (Leave Bought)</option>
                            <option value="S" class="text-dark" ${status === 'S' ? 'selected' : ''}>សិស្សខលសុំច្បាប់មុន (Leave Called)</option>
                            <option value="A" class="text-dark" ${status === 'A' ? 'selected' : ''}>សិស្សអត់មានច្បាប់ (No Permission)</option>
                        </select>
                    </td>
                    
                    <!-- Individual Reason -->
                    <td class="pe-3 py-3">
                        <input type="text" class="form-control form-control-sm student-reason" placeholder="បញ្ជាក់មូលហេតុ (បើមាន)" value="${reason}" style="border-radius: 8px; font-size: 14px; padding: 6px 12px;">
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', rowHtml);
        });
    }

    // When the user selects or deselects a student
    $('#att_studentName').on('change', function () {
        calcAbsentFromSelection();
        renderDynamicStudentRows();
    });

    // Dynamic Filtering Logic
    function filterStudents() {
        const studyTimeSelect = document.getElementById('att_studyTime');
        const teacherSelect = document.getElementById('att_teacher');

        const selectedTime = studyTimeSelect.options[studyTimeSelect.selectedIndex]?.text || '';
        const selectedTeacher = teacherSelect.options[teacherSelect.selectedIndex]?.text || '';

        const hasTime = selectedTime && !selectedTime.includes('--');
        const hasTeacher = selectedTeacher && !selectedTeacher.includes('--');

        if (!hasTeacher) {
            // បើមិនទាន់រើសគ្រូទេ មិនបាច់បង្ហាញឈ្មោះសិស្ស
            $('#att_studentName').empty();
            totalStudents.value = 0;
            calcAbsentFromSelection();
            return;
        }

        // Filter students matching teacher (and time if selected)
        const filteredStudents = window.allStudentsData.filter(student => {
            const matchTeacher = (student.teacherName === selectedTeacher || student.homeroomTeacher === selectedTeacher);
            const matchTime = hasTime ? (student.studyTime === selectedTime) : true;
            const notExcluded = !student.attendanceExcluded;  // skip soft-excluded students
            return matchTeacher && matchTime && notExcluded;
        });

        // Set Total Students
        totalStudents.value = filteredStudents.length;

        // Populate Select2
        const studentSelect = document.getElementById('att_studentName');
        $(studentSelect).empty(); // clear existing

        filteredStudents.forEach(student => {
            const opt = document.createElement('option');
            opt.value = student.key; // using student key as value to link history
            opt.textContent = student.fullName;
            studentSelect.appendChild(opt);
        });

        // Trigger change to update Select2 UI and recalculate
        $(studentSelect).trigger('change');
    }
    // Make filterStudents globally accessible for real-time listener
    window._attFilterStudents = filterStudents;

    const stTimeEl = document.getElementById('att_studyTime');
    const teacherEl = document.getElementById('att_teacher');
    if (stTimeEl) stTimeEl.addEventListener('change', filterStudents);
    if (teacherEl) teacherEl.addEventListener('change', filterStudents);

    // Save Data
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            showLoading(true, 'កំពុងរក្សាទុកទិន្នន័យ...');

            // Getting student keys from Select2 (Multiple selection)
            const selectedKeys = $('#att_studentName').val() || [];

            // Compile studentDetails list from the dynamic DOM cards
            const studentDetails = [];
            const leaveTypesSet = new Set();
            const reasonParts = [];

            selectedKeys.forEach(key => {
                const card = Array.from(document.querySelectorAll('.student-attendance-card')).find(c => c.getAttribute('data-student-key') === key);
                let status = 'A'; // Default to unexcused/no permission
                let reason = '';
                if (card) {
                    const statusSelect = card.querySelector('.student-leave-type');
                    const reasonInput = card.querySelector('.student-reason');
                    if (statusSelect) status = statusSelect.value;
                    if (reasonInput) reason = reasonInput.value.trim();
                }

                // Map key back to full name
                const student = window.allStudentsData.find(st => st.key === key);
                const fullName = student ? student.fullName : key;

                studentDetails.push({
                    studentKey: key,
                    studentName: fullName,
                    chineseName: student ? (student.chineseName || '') : '', // Save Chinese name explicitly
                    status: status,
                    reason: reason,
                    gender: student ? (student.gender || '') : '' // Save gender
                });

                // Add to leaveTypes set
                if (status === 'B') leaveTypesSet.add("ទិញច្បាប់មុន");
                else if (status === 'S') leaveTypesSet.add("ខលសុំច្បាប់មុន");
                else leaveTypesSet.add("អត់មានច្បាប់");

                // Add to consolidated reason parts
                const nameKH = student ? (student.fullName.split(" ")[0] || student.fullName) : key;
                let statusText = 'អត់ច្បាប់';
                if (status === 'B') statusText = 'ទិញច្បាប់';
                else if (status === 'S') statusText = 'ខលសុំច្បាប់';
                
                reasonParts.push(`${nameKH} (${statusText}${reason ? ': ' + reason : ''})`);
            });

            // Fallback unique leaveTypes text representation
            let leaveTypesStr = "";
            if (selectedKeys.length > 0) {
                leaveTypesStr = Array.from(leaveTypesSet).join(", ");
            }

            const consolidatedReason = reasonParts.join(", ") || "";

            // Map selected keys back to fullNames for saving in flat student_attendance record
            const selectedNames = selectedKeys.map(key => {
                const s = window.allStudentsData.find(st => st.key === key);
                return s ? s.fullName : key; // Fallback if custom tag is added
            });
            const studentNameStr = selectedNames.join(", ");

            // Getting text from Teacher select
            const teacherSelect = document.getElementById('att_teacher');
            const teacherStr = teacherSelect.options[teacherSelect.selectedIndex] ? teacherSelect.options[teacherSelect.selectedIndex].text : '';

            // Getting text from Study Time select
            const studyTimeSelect = document.getElementById('att_studyTime');
            const studyTimeStr = studyTimeSelect.options[studyTimeSelect.selectedIndex] ? studyTimeSelect.options[studyTimeSelect.selectedIndex].text : '';

            // If no students are absent but they are saving, that means 100% attendance!
            const finalStudentNameStr = studentNameStr || "អត់មានអ្នកអវត្តមាន";

            const isEditing = !!form.dataset.editKey;
            let editDate = new Date().toLocaleDateString('en-GB'); // default to today
            if (isEditing) {
                editDate = form.dataset.editDate;
                try {
                    const snap = await firebase.database().ref('student_attendance/' + form.dataset.editKey).once('value');
                    if (snap.exists()) {
                        const oldRec = snap.val();
                        const oldYmd = getYYYYMMDD(oldRec.date);
                        if (oldYmd) {
                            const oldSafeTime = sanitizeFirebaseKey(oldRec.studyTime);
                            const oldSafeTeach = sanitizeFirebaseKey(oldRec.teacher);
                            await firebase.database().ref(`attendance/${oldYmd}/${oldSafeTime}/${oldSafeTeach}`).remove();
                        }
                    }
                } catch (err) {
                    console.warn("Failed to clean up old attendance records:", err);
                }
            }

            const data = {
                studyTime: studyTimeStr,
                teacher: teacherStr,
                totalStudents: parseInt(totalStudents.value) || 0,
                presentStudents: parseInt(presentStudents.value) || 0,
                absentStudents: parseInt(absentStudents.value) || 0,
                studentName: finalStudentNameStr,
                reason: consolidatedReason,
                leaveTypes: leaveTypesStr,
                studentDetails: studentDetails, // Saved detailed array
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                date: editDate // Keep original date if editing, otherwise today's date
            };

            try {
                // Save class record
                if (isEditing) {
                    await firebase.database().ref('student_attendance/' + form.dataset.editKey).set(data);
                } else {
                    const newRef = firebase.database().ref('student_attendance').push();
                    await newRef.set(data);
                }

                // Re-filter to get the exact class list
                const selectedTime = studyTimeSelect.options[studyTimeSelect.selectedIndex]?.text || '';
                const selectedTeacher = teacherSelect.options[teacherSelect.selectedIndex]?.text || '';
                const hasTime = selectedTime && !selectedTime.includes('--');
                const classStudents = window.allStudentsData.filter(student => {
                    const matchTeacher = (student.teacherName === selectedTeacher || student.homeroomTeacher === selectedTeacher);
                    const matchTime = hasTime ? (student.studyTime === selectedTime) : true;
                    return matchTeacher && matchTime;
                });

                // Build individual student attendance updates
                const attendanceUpdates = {};

                const yyyy_mm_dd = getYYYYMMDD(editDate);
                const safeTime = sanitizeFirebaseKey(studyTimeStr);
                const safeTeach = sanitizeFirebaseKey(teacherStr);

                classStudents.forEach(student => {
                    const isAbsent = selectedKeys.includes(student.key);
                    let sStatus = 'P';
                    let sReason = '';

                    if (isAbsent) {
                        const detail = studentDetails.find(d => d.studentKey === student.key);
                        if (detail) {
                            sStatus = detail.status;
                            sReason = detail.reason;
                        }
                    }

                    attendanceUpdates[`attendance/${yyyy_mm_dd}/${safeTime}/${safeTeach}/students/${student.key}`] = {
                        status: sStatus,
                        reason: sReason
                    };
                });

                if (Object.keys(attendanceUpdates).length > 0) {
                    await firebase.database().ref().update(attendanceUpdates);
                }

                // Hide Modal
                const modalEl = document.getElementById('attendanceModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) {
                    modal.hide();
                }

                showLoading(false);

                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'ជោគជ័យ!',
                        text: 'បានរក្សាទុកទិន្នន័យអវត្តមានដោយជោគជ័យ!',
                        confirmButtonColor: '#8a0e5b',
                        confirmButtonText: 'យល់ព្រម',
                        timer: 2000,
                        timerProgressBar: true
                    });

                } else if (window.showAlertPremium) {
                    window.showAlertPremium('បានរក្សាទុកទិន្នន័យអវត្តមានដោយជោគជ័យ!', 'success');
                } else {
                    alert('បានរក្សាទុកទិន្នន័យអវត្តមានដោយជោគជ័យ!');
                }
                form.reset();
                if ($('.select2-student').length) {
                    $('.select2-student').val(null).trigger('change');
                }
                calcAbsentFromSelection();
                if (typeof updateLeaveCardState === 'function') {
                    updateLeaveCardState();
                }
            } catch (error) {
                showLoading(false);
                console.error(error);
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'មានកំហុស!',
                        text: 'បរាជ័យក្នុងការរក្សាទុក: ' + error.message,
                        confirmButtonColor: '#8a0e5b',
                        confirmButtonText: 'យល់ព្រម'
                    });
                } else if (window.showAlertPremium) {
                    window.showAlertPremium('បរាជ័យក្នុងការរក្សាទុក: ' + error.message, 'error');
                } else {
                    alert('បរាជ័យក្នុងការរក្សាទុក: ' + error.message);
                }
            }
        });
    }

    if(btnResetForm) {
        btnResetForm.addEventListener('click', function () {
            form.reset();
            if ($('.select2-student').length) {
                $('.select2-student').val(null).trigger('change');
            }
            calcAbsentFromSelection();
            if (typeof updateLeaveCardState === 'function') {
                updateLeaveCardState();
            }
        });
    }

    // Reset form when modal is hidden
    const attendanceModalEl = document.getElementById('attendanceModal');
    if (attendanceModalEl) {
        attendanceModalEl.addEventListener('hidden.bs.modal', function () {
            form.reset();
            delete form.dataset.editKey;
            delete form.dataset.editDate;
            document.getElementById('attendanceModalLabel').innerHTML = '<i class="fi fi-rr-edit me-2"></i>ទម្រង់បញ្ចូលអវត្តមាន';
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fi fi-rr-disk me-1"></i> រក្សាទុកទិន្នន័យ';
            }
            if ($('.select2-student').length) {
                $('.select2-student').val(null).trigger('change');
            }
            calcAbsentFromSelection();
            if (typeof updateLeaveCardState === 'function') {
                updateLeaveCardState();
            }
        });
    }

    // -------------------------------------------------------------
    // Premium Leave Types Card Logic
    // -------------------------------------------------------------
    function updateLeaveCardState() {
        const bought = document.getElementById('att_leaveBought');
        const called = document.getElementById('att_leaveCalled');
        const none = document.getElementById('att_leaveNone');

        const cardBought = document.getElementById('card_leaveBought');
        const cardCalled = document.getElementById('card_leaveCalled');
        const cardNone = document.getElementById('card_leaveNone');

        if (cardBought) {
            if (bought && bought.checked) cardBought.classList.add('active-bought');
            else cardBought.classList.remove('active-bought');
        }
        if (cardCalled) {
            if (called && called.checked) cardCalled.classList.add('active-called');
            else cardCalled.classList.remove('active-called');
        }
        if (cardNone) {
            if (none && none.checked) cardNone.classList.add('active-none');
            else cardNone.classList.remove('active-none');
        }
    }

    // Expose globally so edit mode can call it
    window.updateLeaveCardState = updateLeaveCardState;

    $('#att_leaveBought, #att_leaveCalled, #att_leaveNone').on('change', updateLeaveCardState);

    $('#card_leaveBought').on('click', function() {
        const cb = document.getElementById('att_leaveBought');
        if (cb) {
            cb.checked = !cb.checked;
            $(cb).trigger('change');
        }
    });

    $('#card_leaveCalled').on('click', function() {
        const cb = document.getElementById('att_leaveCalled');
        if (cb) {
            cb.checked = !cb.checked;
            $(cb).trigger('change');
        }
    });

    $('#card_leaveNone').on('click', function() {
        const cb = document.getElementById('att_leaveNone');
        if (cb) {
            cb.checked = !cb.checked;
            $(cb).trigger('change');
        }
    });

    // 1. Instant Cache Load: try to load cached students and attendance records instantly first
    getIndexedDBCache('tx_cachedAllStudentsData', (cachedStudents) => {
        if (cachedStudents) {
            populateStudentMapsFromData(cachedStudents);
            
            // Now load attendance from cache instantly
            getIndexedDBCache('tx_cachedAttendanceData', (cachedAttendance) => {
                if (cachedAttendance && Array.isArray(cachedAttendance)) {
                    renderAttendanceTable(cachedAttendance);
                    // Turn off loading spinner since data is visible!
                    showLoading(false);
                    isInitialLoadComplete = true;
                }
            });
        }
    });

    // 2. Background Live Sync: Load latest dropdowns (teachers/times/students) and latest attendance records
    loadDropdownData().then(() => {
        loadAttendanceData();
    }).catch(err => {
        console.error("Failed to load dropdown data:", err);
        loadAttendanceData();
    });
});

// Cache Configuration for Offline & Instant Loading
const CACHE_DB_NAME = 'tx_school_db_v2';
const CACHE_STORE_NAME = 'cache_store';

function getIndexedDBCache(key, callback) {
    try {
        const request = indexedDB.open(CACHE_DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
                db.createObjectStore(CACHE_STORE_NAME);
            }
        };
        request.onsuccess = (e) => {
            const db = e.target.result;
            try {
                const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
                const store = tx.objectStore(CACHE_STORE_NAME);
                const getReq = store.get(key);
                getReq.onsuccess = () => callback(getReq.result || null);
                getReq.onerror = () => callback(null);
            } catch (err) {
                callback(null);
            }
        };
        request.onerror = () => callback(null);
    } catch (e) {
        callback(null);
    }
}

function setIndexedDBCache(key, data) {
    try {
        const request = indexedDB.open(CACHE_DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
                db.createObjectStore(CACHE_STORE_NAME);
            }
        };
        request.onsuccess = (e) => {
            const db = e.target.result;
            try {
                const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
                const store = tx.objectStore(CACHE_STORE_NAME);
                store.put(data, key);
            } catch (err) { console.warn('IDB put error', err); }
        };
    } catch (e) { console.warn('IDB open error', e); }
}

// Populate student maps from raw Firebase key-value format (from IndexedDB cache or live database)
function populateStudentMapsFromData(studentsData) {
    window.allStudentsData = [];
    window.studentMap = {};
    window.studentByNameMap = {};
    
    Object.keys(studentsData).forEach(key => {
        const student = studentsData[key];
        const sKey = student.key || key;
        const nameKH = student.khmerName || `${student.lastName || ''} ${student.firstName || ''}`.trim() || student.name || student.studentName || '';
        const nameZH = student.chineseName || `${student.chineseLastName || ''} ${student.chineseFirstName || ''}`.trim();
        const displayId = student.displayId || student.studentDisplayId || sKey;
        const fullName = `${nameKH} ${nameZH} (${displayId})`.trim();

        const studentObj = {
            key: sKey,
            fullName: fullName,
            displayId: displayId,
            khmerName: nameKH,
            chineseName: nameZH,
            studyTime: student.studyTime || '',
            teacherName: student.teacherName || '',
            homeroomTeacher: student.homeroomTeacher || '',
            gender: student.gender || '',
            attendanceExcluded: student.attendanceExcluded === true  // soft-exclude flag
        };

        window.allStudentsData.push(studentObj);
        window.studentMap[sKey] = studentObj;
        window.studentByNameMap[nameKH] = studentObj;
    });
}

async function loadDropdownData() {
    try {
        // Fetch Study Times, Staff (Teachers), and Students in parallel (simultaneously) for 2x+ faster loading speed
        const [timesSnap, staffSnap, studentsSnap] = await Promise.all([
            firebase.database().ref('settings/studyTimes').once('value'),
            firebase.database().ref('staff').once('value'),
            firebase.database().ref('students').once('value')
        ]);

        // 1. Process Study Times
        const studyTimeSelect = document.getElementById('att_studyTime');
        if (timesSnap.exists() && studyTimeSelect) {
            timesSnap.forEach(child => {
                const val = child.val();
                const timeStr = typeof val === 'object' ? val.time : val;
                if (timeStr) {
                    const opt = document.createElement('option');
                    opt.value = timeStr;
                    opt.textContent = timeStr;
                    studyTimeSelect.appendChild(opt);
                }
            });
        } else if (studyTimeSelect) {
            // Fallback unique study times from students if settings/studyTimes is empty (reusing already fetched studentsSnap)
            if (studentsSnap.exists()) {
                const timesSet = new Set();
                studentsSnap.forEach(child => {
                    const st = child.val().studyTime;
                    if (st && st !== 'មិនមាន') timesSet.add(st);
                });
                timesSet.forEach(time => {
                    const opt = document.createElement('option');
                    opt.value = time;
                    opt.textContent = time;
                    studyTimeSelect.appendChild(opt);
                });
            }
        }

        // 2. Process Teachers (from 'staff')
        const teacherSelect = document.getElementById('att_teacher');
        if (staffSnap.exists() && teacherSelect) {
            staffSnap.forEach(child => {
                const staff = child.val();
                const name = staff.nameKhmer || staff.name || staff.englishName || '';
                if (name) {
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name;
                    teacherSelect.appendChild(opt);
                }
            });
        }

        // Cache students data in IndexedDB and populate maps
        if (studentsSnap.exists()) {
            const studentsVal = studentsSnap.val();
            setIndexedDBCache('tx_cachedAllStudentsData', studentsVal);
            populateStudentMapsFromData(studentsVal);
        }

        // Initially clear the student dropdown until Teacher & Time are selected
        $('#att_studentName').empty();

        // ─── Real-time listener: auto-refresh student maps when data changes ───
        // This makes attendance exclude/include dynamic without page reload
        firebase.database().ref('students').on('value', (snap) => {
            if (snap.exists()) {
                const updatedData = snap.val();
                setIndexedDBCache('tx_cachedAllStudentsData', updatedData);
                populateStudentMapsFromData(updatedData);

                // Auto-refresh the student dropdown if teacher is already selected
                if (typeof window._attFilterStudents === 'function') {
                    window._attFilterStudents();
                }
            }
        });

    } catch (error) {
        console.error("Error loading dropdown data:", error);
    }
}

let attendanceDataTable;
let isInitialLoadComplete = false;

function renderAttendanceTable(items) {
    const tableBody = document.getElementById('attendanceDataBody');
    if (!tableBody) return;

    if (attendanceDataTable) {
        attendanceDataTable.destroy();
    }

    tableBody.innerHTML = '';

    let totalAbsent = 0;
    let totalLeave = 0;
    let totalNoLeave = 0;

    const todayStr = new Date().toLocaleDateString('en-GB');
    let rows = '';

    // Store current items in window for PDF report generation access
    window.currentAttendanceItems = items;

    items.forEach((data) => {
        // Dashboard Calculations (Only count for today's date)
        if (data.date === todayStr) {
            const count = parseInt(data.absentStudents) || 0;
            totalAbsent += count;
            if (data.studentDetails && Array.isArray(data.studentDetails)) {
                data.studentDetails.forEach(detail => {
                    if (detail.status === 'B' || detail.status === 'S') {
                        totalLeave += 1;
                    } else if (detail.status === 'A') {
                        totalNoLeave += 1;
                    }
                });
            } else {
                // Fallback for old format
                if (data.leaveTypes && data.leaveTypes.includes('អត់មានច្បាប់')) {
                    totalNoLeave += count;
                } else if (data.leaveTypes && data.leaveTypes.trim() !== '') {
                    // Only count as leave if it's not "អត់មានច្បាប់" and it's not empty
                    totalLeave += count;
                }
            }
        }

        const absentTextClass = data.absentStudents > 0 ? 'text-danger fw-bold' : 'text-muted';

        // Helper to generate a single table row HTML string
        const makeRowHtml = (studentNameHtml, chineseNameHtml, genderHtml, badgeHtml, reasonHtml) => {
            return `<tr data-key="${data.key}">
                <td>${data.date || '-'}</td>
                <td><span class="badge bg-light text-secondary border px-2.5 py-1.5 rounded-pill">${data.studyTime || '-'}</span></td>
                <td><i class="fi fi-rr-chalkboard-user text-primary me-1"></i> ${data.teacher || '-'}</td>
                <td><span class="text-secondary fw-bold">${data.totalStudents}</span></td>
                <td><span class="text-success fw-bold">${data.presentStudents}</span></td>
                <td><span class="${absentTextClass}">${data.absentStudents}</span></td>
                <td class="text-center">${studentNameHtml}</td>
                <td class="text-center">${chineseNameHtml}</td>
                <td class="text-center">${genderHtml}</td>
                <td class="text-center">${badgeHtml}</td>
                <td class="text-center">${reasonHtml}</td>
                <td>
                    <div class="d-flex gap-2 align-items-center justify-content-center">
                        <button class="btn btn-sm border-0 rounded-circle d-flex align-items-center justify-content-center" style="width: 35px; height: 35px; background: rgba(13, 110, 253, 0.08); color: #0d6efd; transition: all 0.2s;" onclick="viewAttendance('${data.key}')" title="មើលលម្អិត (View)"><i class="fi fi-rr-eye"></i></button>
                        <button class="btn btn-sm border-0 rounded-circle d-flex align-items-center justify-content-center" style="width: 35px; height: 35px; background: rgba(245, 124, 0, 0.08); color: #f57c00; transition: all 0.2s;" onclick="editAttendance('${data.key}')" title="កែប្រែ (Edit)"><i class="fi fi-rr-edit"></i></button>
                        <button class="btn btn-sm border-0 rounded-circle d-flex align-items-center justify-content-center" style="width: 35px; height: 35px; background: rgba(220, 53, 69, 0.08); color: #dc3545; transition: all 0.2s;" onclick="deleteAttendance('${data.key}')" title="លុប (Delete)"><i class="fi fi-rr-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        };

        if (data.absentStudents === 0) {
            const studentNameHtml = `<span class="text-muted" style="font-style: italic;">អត់មានអ្នកអវត្តមាន</span>`;
            const chineseNameHtml = `<span class="text-muted">-</span>`;
            const genderHtml = `<span class="text-muted">-</span>`;
            const badgeHtml = `<span class="badge badge-presence"><i class="fi fi-rr-checkbox me-1"></i>វត្តមាន ១០០%</span>`;
            const reasonHtml = `<span class="text-muted">-</span>`;
            rows += makeRowHtml(studentNameHtml, chineseNameHtml, genderHtml, badgeHtml, reasonHtml);
        } else if (data.studentDetails && Array.isArray(data.studentDetails) && data.studentDetails.length > 0) {
            data.studentDetails.forEach(detail => {
                let khName = detail.studentName || '';
                let zhName = detail.chineseName || '';
                
                if (khName.startsWith('-') && khName.length >= 15) {
                    const student = window.studentMap[khName];
                    if (student) {
                        khName = student.khmerName;
                        zhName = student.chineseName;
                    }
                } else if (detail.studentKey) {
                    const student = window.studentMap[detail.studentKey];
                    if (student) {
                        khName = student.khmerName;
                        zhName = student.chineseName || zhName;
                    } else {
                        const parsed = parseStudentNameDetails(khName);
                        khName = parsed.khmerName;
                        if (!zhName) zhName = parsed.chineseName;
                    }
                } else {
                    const parsed = parseStudentNameDetails(khName);
                    khName = parsed.khmerName;
                    if (!zhName) zhName = parsed.chineseName;
                }
                
                const studentLink = detail.studentKey ? `data-tracking.html?studentKey=${detail.studentKey}&tab=attendance` : '#';
                const studentNameHtml = detail.studentKey ? `<div class="text-truncate fw-bold d-flex align-items-center justify-content-center" title="ចុចដើម្បីមើលព័ត៌មានលម្អិត និងបង់ប្រាក់"><i class="fi fi-rr-user text-muted me-1.5"></i><a href="${studentLink}" class="student-link-premium">${khName}</a></div>` : `<div class="text-truncate fw-bold text-pink-dark d-flex align-items-center justify-content-center" title="${khName}"><i class="fi fi-rr-user text-muted me-1.5"></i>${khName}</div>`;
                const chineseNameHtml = `<div class="text-truncate fw-bold text-success d-flex align-items-center justify-content-center" title="${zhName}">${zhName || '-'}</div>`;
                
                // Look up gender from detail, then fallback to window.studentMap
                let genderVal = detail.gender || '';
                if (!genderVal) {
                    const student = window.studentMap[detail.studentKey];
                    if (student) genderVal = student.gender || '';
                }
                const genderKhmer = (genderVal === 'Male' || genderVal === 'ប្រុស') ? 'ប្រុស' : ((genderVal === 'Female' || genderVal === 'ស្រី') ? 'ស្រី' : '-');
                const genderClass = genderKhmer === 'ប្រុស' ? 'text-primary fw-bold' : (genderKhmer === 'ស្រី' ? 'text-danger fw-bold' : 'text-muted');
                const genderHtml = `<span class="${genderClass}">${genderKhmer}</span>`;

                let badgeHtml = '';
                if (detail.status === 'B') {
                    badgeHtml = `<span class="badge badge-excused d-inline-flex align-items-center justify-content-center"><i class="fi fi-rr-envelope-open-text me-1"></i>ទិញច្បាប់</span>`;
                } else if (detail.status === 'S') {
                    badgeHtml = `<span class="badge badge-excused d-inline-flex align-items-center justify-content-center" style="color: #06b6d4 !important; border-color: rgba(6, 182, 212, 0.15) !important; background-color: rgba(6, 182, 212, 0.08) !important;"><i class="fi fi-rr-phone-call me-1"></i>ខលសុំច្បាប់</span>`;
                } else if (detail.status === 'A') {
                    badgeHtml = `<span class="badge badge-unexcused d-inline-flex align-items-center justify-content-center"><i class="fi fi-rr-ban me-1"></i>អត់ច្បាប់</span>`;
                } else {
                    badgeHtml = `<span class="badge badge-presence d-inline-flex align-items-center justify-content-center"><i class="fi fi-rr-checkbox me-1"></i>វត្តមាន</span>`;
                }
                
                const reasonHtml = `<span class="text-secondary text-truncate d-flex align-items-center justify-content-center" style="font-style: italic;" title="${detail.reason || '-'}">${detail.reason || '-'}</span>`;
                
                rows += makeRowHtml(studentNameHtml, chineseNameHtml, genderHtml, badgeHtml, reasonHtml);
            });
        } else {
            // Fallback for older records using string parsing
            const names = (data.studentName || '').split(', ');
            const leaveTypesStr = data.leaveTypes || '';
            const reasonStr = data.reason || '';

            names.forEach(n => {
                if (!n || n === "អត់មានអ្នកអវត្តមាន") return;
                
                const parsed = parseStudentNameDetails(n);
                let khName = parsed.khmerName;
                let zhName = parsed.chineseName;
                
                if (khName.startsWith('-') && khName.length >= 15) {
                    const student = window.studentMap[khName];
                    if (student) {
                        khName = student.khmerName;
                        zhName = student.chineseName;
                    }
                }
                
                // Look up student from window.studentMap or window.studentByNameMap
                const student = window.studentMap[khName] || window.studentByNameMap[khName] || window.allStudentsData.find(st => st.fullName.includes(khName) || st.key === khName);
                const sKey = student ? student.key : '';
                const studentLink = sKey ? `data-tracking.html?studentKey=${sKey}&tab=attendance` : '#';
                const studentNameHtml = sKey ? `<div class="text-truncate fw-bold d-flex align-items-center justify-content-center" title="ចុចដើម្បីមើលព័ត៌មានលម្អិត និងបង់ប្រាក់"><i class="fi fi-rr-user text-muted me-1.5"></i><a href="${studentLink}" class="student-link-premium">${khName}</a></div>` : `<div class="text-truncate fw-bold text-pink-dark d-flex align-items-center justify-content-center" title="${khName}"><i class="fi fi-rr-user text-muted me-1.5"></i>${khName}</div>`;
                const chineseNameHtml = `<div class="text-truncate fw-bold text-success d-flex align-items-center justify-content-center" title="${zhName}">${zhName || '-'}</div>`;
                
                // Look up gender from window.studentMap or window.studentByNameMap
                const genderVal = student ? (student.gender || '') : '';
                const genderKhmer = (genderVal === 'Male' || genderVal === 'ប្រុស') ? 'ប្រុស' : ((genderVal === 'Female' || genderVal === 'ស្រី') ? 'ស្រី' : '-');
                const genderClass = genderKhmer === 'ប្រុស' ? 'text-primary fw-bold' : (genderKhmer === 'ស្រី' ? 'text-danger fw-bold' : 'text-muted');
                const genderHtml = `<span class="${genderClass}">${genderKhmer}</span>`;

                let badgeHtml = '';
                if (leaveTypesStr.includes('អត់មានច្បាប់')) {
                    badgeHtml = `<span class="badge badge-unexcused"><i class="fi fi-rr-ban me-1"></i>អត់ច្បាប់</span>`;
                } else if (leaveTypesStr.includes('ទិញច្បាប់')) {
                    badgeHtml = `<span class="badge badge-excused"><i class="fi fi-rr-envelope-open-text me-1"></i>ទិញច្បាប់</span>`;
                } else if (leaveTypesStr.includes('ខលសុំច្បាប់')) {
                    badgeHtml = `<span class="badge badge-excused" style="color: #06b6d4 !important; border-color: rgba(6, 182, 212, 0.15) !important; background-color: rgba(6, 182, 212, 0.08) !important;"><i class="fi fi-rr-phone-call me-1"></i>ខលសុំច្បាប់</span>`;
                } else {
                    badgeHtml = `<span class="badge badge-excused"><i class="fi fi-rr-envelope-open-text me-1"></i>${leaveTypesStr || 'មានច្បាប់'}</span>`;
                }
                
                const reasonHtml = `<span class="text-secondary text-truncate d-flex align-items-center justify-content-center" style="font-style: italic;" title="${reasonStr || '-'}">${reasonStr || '-'}</span>`;
                
                rows += makeRowHtml(studentNameHtml, chineseNameHtml, genderHtml, badgeHtml, reasonHtml);
            });
        }
    });

    tableBody.innerHTML = rows;
    updateDashboardStats(totalAbsent, totalLeave, totalNoLeave);
    initDataTable();
}

function loadAttendanceData() {
    const tableBody = document.getElementById('attendanceDataBody');
    if (!tableBody) {
        showLoading(false);
        return;
    }

    // 1. Try to load and render from IndexedDB Cache instantly
    getIndexedDBCache('tx_cachedAttendanceData', (cachedItems) => {
        if (cachedItems && Array.isArray(cachedItems)) {
            renderAttendanceTable(cachedItems);
            // If cache loaded successfully, turn off loader immediately
            showLoading(false);
            isInitialLoadComplete = true;
        } else {
            // No cache, show loading overlay until Firebase resolves
            showLoading(true);
        }

        // 2. Start Firebase Live Listener
        firebase.database().ref('student_attendance').orderByChild('timestamp').on('value', (snapshot) => {
            const items = [];
            if (snapshot.exists()) {
                // O(N) unshift is pre-sorted in descending order because orderbyChild('timestamp') is in ascending order
                snapshot.forEach((childSnapshot) => {
                    items.unshift({ key: childSnapshot.key, ...childSnapshot.val() });
                });
                
                // Save to local cache
                setIndexedDBCache('tx_cachedAttendanceData', items);
            }

            renderAttendanceTable(items);
            
            showLoading(false);
            isInitialLoadComplete = true;
        }, (error) => {
            console.error("Firebase database error:", error);
            showLoading(false);
        });
    });
}

function updateDashboardStats(absent, leave, noLeave) {
    const elAbsent = document.getElementById('dash_totalAbsent');
    const elLeave = document.getElementById('dash_totalLeave');
    const elNoLeave = document.getElementById('dash_totalNoLeave');

    if (elAbsent) elAbsent.textContent = absent;
    if (elLeave) elLeave.textContent = leave;
    if (elNoLeave) elNoLeave.textContent = noLeave;
}

function initDataTable() {
    if ($.fn.DataTable.isDataTable('#attendanceTable')) {
        $('#attendanceTable').DataTable().destroy();
    }
    attendanceDataTable = $('#attendanceTable').DataTable({
        language: {
            search: "ស្វែងរក៖",
            searchPlaceholder: "ស្វែងរកទិន្នន័យទីនេះ...",
            lengthMenu: "បង្ហាញ _MENU_ ទិន្នន័យ",
            info: "បង្ហាញ _START_ ដល់ _END_ នៃ _TOTAL_ ទិន្នន័យ",
            infoEmpty: "គ្មានទិន្នន័យ",
            infoFiltered: "(ចម្រាញ់ចេញពី _MAX_ ទិន្នន័យសរុប)",
            paginate: {
                first: "ដំបូង",
                last: "ចុងក្រោយ",
                next: "បន្ទាប់",
                previous: "ថយក្រោយ"
            },
            emptyTable: `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:48px 20px; gap:12px;">
                    <div style="width:72px; height:72px; border-radius:50%; background:linear-gradient(135deg,#fdf4f8,#fce7f3); display:flex; align-items:center; justify-content:center; animation: emptyPulse 2.5s ease-in-out infinite;">
                        <i class="fi fi-rr-folder-open" style="font-size:1.8rem; color:#8a0e5b;"></i>
                    </div>
                    <div style="font-size:1.05rem; font-weight:700; color:#374151;">មិនមានទិន្នន័យក្នុងតារាងទេ</div>
                    <div style="font-size:0.82rem; color:#9ca3af; max-width:320px; text-align:center; line-height:1.6;">
                        សូមជ្រើសរើសថ្ងៃខែឆ្នាំ ម៉ោងសិក្សា និងគ្រូបន្ទុក ដើម្បីបង្ហាញទិន្នន័យអវត្តមាន
                    </div>
                </div>
            `
        },
        order: [], // Disable initial sorting
        pageLength: 50,
        dom: '<"row align-items-center mb-3"<"col-md-6"l><"col-md-6"f>>rt<"row align-items-center mt-3"<"col-md-6"i><"col-md-6 d-flex justify-content-end"p>>',
        buttons: [
            {
                extend: 'excelHtml5',
                text: '<i class="fi fi-rr-file-excel me-1"></i> Excel',
                className: 'btn btn-sm btn-success px-3 shadow-sm',
                title: 'បញ្ជីអវត្តមានប្រចាំថ្ងៃ',
                exportOptions: {
                    columns: ':not(:last-child)'
                }
            },
            {
                text: '<i class="fi fi-rr-file-pdf me-1"></i> PDF',
                className: 'btn btn-sm btn-danger px-3 shadow-sm mx-2',
                action: function (e, dt, button, config) {
                    generateAttendanceReportPDF();
                }
            },
            {
                text: '<i class="fi fi-rr-print me-1"></i> Print',
                className: 'btn btn-sm btn-primary px-3 shadow-sm',
                action: function (e, dt, button, config) {
                    generateAttendanceReportPDF();
                }
            }
        ],
        initComplete: function () {
            // Remove default DataTables button classes that make them ugly
            $('.dt-button').removeClass('dt-button');
        }
    });
}

window.deleteAttendance = function (key) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'តើអ្នកពិតជាចង់លុបទិន្នន័យនេះមែនទេ?',
            text: "ទិន្នន័យដែលលុបរួចមិនអាចទាញយកវិញបានទេ!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'បាទ/ចាស, លុបវា!',
            cancelButtonText: 'បោះបង់'
        }).then(async (result) => {
            if (result.isConfirmed) {
                showLoading(true, 'កំពុងលុបទិន្នន័យ...');
                try {
                    // Fetch the record first to know date, studyTime, and teacher
                    const snap = await firebase.database().ref('student_attendance/' + key).once('value');
                    if (snap.exists()) {
                        const rec = snap.val();
                        if (rec.date) {
                            const yyyy_mm_dd = getYYYYMMDD(rec.date);
                            if (yyyy_mm_dd) {
                                const safeTime = sanitizeFirebaseKey(rec.studyTime);
                                const safeTeach = sanitizeFirebaseKey(rec.teacher);
                                // Delete from 'attendance' node
                                await firebase.database().ref(`attendance/${yyyy_mm_dd}/${safeTime}/${safeTeach}`).remove();
                            }
                        }
                    }
                    // Delete from 'student_attendance'
                    await firebase.database().ref('student_attendance/' + key).remove();
                    showLoading(false);
                    if (window.showAlertPremium) window.showAlertPremium('បានលុបទិន្នន័យដោយជោគជ័យ!', 'success');
                } catch (error) {
                    showLoading(false);
                    if (window.showAlertPremium) window.showAlertPremium('កំហុសក្នុងការលុប: ' + error.message, 'error');
                }
            }
        });
    } else {
        if (confirm("តើអ្នកពិតជាចង់លុបទិន្នន័យនេះមែនទេ?")) {
            showLoading(true, 'កំពុងលុបទិន្នន័យ...');
            firebase.database().ref('student_attendance/' + key).once('value').then(snap => {
                if (snap.exists()) {
                    const rec = snap.val();
                    if (rec.date) {
                        const yyyy_mm_dd = getYYYYMMDD(rec.date);
                        if (yyyy_mm_dd) {
                            const safeTime = sanitizeFirebaseKey(rec.studyTime);
                            const safeTeach = sanitizeFirebaseKey(rec.teacher);
                            firebase.database().ref(`attendance/${yyyy_mm_dd}/${safeTime}/${safeTeach}`).remove();
                        }
                    }
                }
                firebase.database().ref('student_attendance/' + key).remove().then(() => {
                    showLoading(false);
                }).catch(err => {
                    showLoading(false);
                });
            }).catch(err => {
                showLoading(false);
            });
        }
    }
};

window.viewAttendance = async function (key) {
    if (typeof Swal === 'undefined') {
        alert('សូមដំឡើងប្រព័ន្ធ SweetAlert2 ដើម្បីប្រើមុខងារនេះ!');
        return;
    }

    showLoading(true, 'កំពុងទាញយកទិន្នន័យ...');
    try {
        const snap = await firebase.database().ref('student_attendance/' + key).once('value');
        if (!snap.exists()) {
            showLoading(false);
            if (window.showAlertPremium) window.showAlertPremium('មិនរកឃើញទិន្នន័យ!', 'error');
            return;
        }

        const rec = snap.val();

        // Build leave/presence badge
        let badgeHtml = '';
        if (rec.absentStudents === 0) {
            badgeHtml = `<span class="badge rounded-pill px-3 py-1.5" style="font-size: 12px; background: rgba(25, 135, 84, 0.08); color: #198754; border: 1px solid rgba(25, 135, 84, 0.18); font-weight: 600;"><i class="fi fi-rr-checkbox me-1.5"></i>វត្តមាន ១០០%</span>`;
        } else if (rec.leaveTypes && rec.leaveTypes.includes('អត់មានច្បាប់')) {
            badgeHtml = `<span class="badge rounded-pill px-3 py-1.5" style="font-size: 12px; background: rgba(220, 53, 69, 0.08); color: #dc3545; border: 1px solid rgba(220, 53, 69, 0.18); font-weight: 600;"><i class="fi fi-rr-ban me-1.5"></i>${rec.leaveTypes}</span>`;
        } else {
            badgeHtml = `<span class="badge rounded-pill px-3 py-1.5" style="font-size: 12px; background: rgba(138, 14, 91, 0.08); color: #8a0e5b; border: 1px solid rgba(138, 14, 91, 0.18); font-weight: 600;"><i class="fi fi-rr-envelope-open-text me-1.5"></i>${rec.leaveTypes || 'មានច្បាប់'}</span>`;
        }

        let detailsHtml = '';
        if (rec.studentDetails && Array.isArray(rec.studentDetails) && rec.studentDetails.length > 0) {
            detailsHtml = `
                <div class="table-responsive rounded-4 border overflow-hidden mt-1 shadow-sm bg-white" style="border-color: rgba(0,0,0,0.08) !important;">
                    <table class="table table-hover align-middle mb-0" style="font-size: 14px; background: #ffffff;">
                        <thead style="background: linear-gradient(135deg, #8a0e5b 0%, #5c063c 100%); color: #ffffff;">
                            <tr>
                                <th class="text-center py-3 ps-3" style="color: #ffffff; font-weight: 700; font-size: 13.5px; width: 25%; border: none;">ឈ្មោះសិស្ស (Student)</th>
                                <th class="text-center py-3" style="color: #ffffff; font-weight: 700; font-size: 13.5px; width: 25%; border: none;">ឈ្មោះចិន (Chinese)</th>
                                <th class="text-center py-3" style="color: #ffffff; font-weight: 700; font-size: 13.5px; width: 15%; border: none;">ភេទ (Gender)</th>
                                <th class="text-center py-3" style="color: #ffffff; font-weight: 700; font-size: 13.5px; width: 18%; border: none;">ប្រភេទច្បាប់ (Leave)</th>
                                <th class="text-center py-3 pe-3" style="color: #ffffff; font-weight: 700; font-size: 13.5px; width: 17%; border: none;">មូលហេតុ (Reason)</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            rec.studentDetails.forEach(detail => {
                let khName = detail.studentName || '';
                let zhName = detail.chineseName || '';
                if (!zhName && khName) {
                    const parsed = parseStudentNameDetails(khName);
                    khName = parsed.khmerName;
                    zhName = parsed.chineseName;
                } else if (khName) {
                    const parsed = parseStudentNameDetails(khName);
                    khName = parsed.khmerName;
                }

                let badge = '';
                if (detail.status === 'B') {
                    badge = `<span class="badge rounded-pill px-3 py-1.5" style="font-size: 12px; background: rgba(138, 14, 91, 0.08); color: #8a0e5b; border: 1px solid rgba(138, 14, 91, 0.18); font-weight: 600;"><i class="fi fi-rr-envelope-open-text me-1.5"></i>ទិញច្បាប់</span>`;
                } else if (detail.status === 'S') {
                    badge = `<span class="badge rounded-pill px-3 py-1.5" style="font-size: 12px; background: rgba(6, 182, 212, 0.08); color: #0891b2; border: 1px solid rgba(6, 182, 212, 0.18); font-weight: 600;"><i class="fi fi-rr-phone-call me-1.5"></i>ខលសុំច្បាប់</span>`;
                } else if (detail.status === 'A') {
                    badge = `<span class="badge rounded-pill px-3 py-1.5" style="font-size: 12px; background: rgba(220, 53, 69, 0.08); color: #dc3545; border: 1px solid rgba(220, 53, 69, 0.18); font-weight: 600;"><i class="fi fi-rr-ban me-1.5"></i>អត់ច្បាប់</span>`;
                } else {
                    badge = `<span class="badge rounded-pill px-3 py-1.5" style="font-size: 12px; background: rgba(25, 135, 84, 0.08); color: #198754; border: 1px solid rgba(25, 135, 84, 0.18); font-weight: 600;"><i class="fi fi-rr-checkbox me-1.5"></i>វត្តមាន</span>`;
                }

                // Gender
                let genderVal = detail.gender || '';
                if (!genderVal) {
                    const student = window.studentMap[detail.studentKey];
                    if (student) genderVal = student.gender || '';
                }
                const genderKhmer = (genderVal === 'Male' || genderVal === 'ប្រុស') ? 'ប្រុស' : ((genderVal === 'Female' || genderVal === 'ស្រី') ? 'ស្រី' : '-');
                
                // Gender badge
                let genderBadge = '';
                if (genderKhmer === 'ប្រុស') {
                    genderBadge = `<span class="badge rounded-pill px-2.5 py-1.5" style="font-size: 12px; background: rgba(13, 110, 253, 0.08); color: #0d6efd; border: 1px solid rgba(13, 110, 253, 0.15); font-weight: 600;"><i class="fi fi-rr-mars me-1"></i>ប្រុស</span>`;
                } else if (genderKhmer === 'ស្រី') {
                    genderBadge = `<span class="badge rounded-pill px-2.5 py-1.5" style="font-size: 12px; background: rgba(220, 53, 69, 0.08); color: #dc3545; border: 1px solid rgba(220, 53, 69, 0.15); font-weight: 600;"><i class="fi fi-rr-venus me-1"></i>ស្រី</span>`;
                } else {
                    genderBadge = `<span class="badge rounded-pill px-2.5 py-1.5" style="font-size: 12px; background: rgba(108, 117, 125, 0.08); color: #6c757d; border: 1px solid rgba(108, 117, 125, 0.15); font-weight: 600;">-</span>`;
                }

                detailsHtml += `
                    <tr style="transition: background-color 0.2s;">
                        <td class="fw-bold text-center py-3 ps-3" style="color: #1e293b; font-size: 14px;">
                            <div class="d-flex align-items-center justify-content-center gap-2.5">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(138, 14, 91, 0.08); color: var(--bs-pink-dark); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; border: 1px solid rgba(138, 14, 91, 0.15); flex-shrink: 0;">
                                    <i class="fi fi-rr-user" style="font-size: 0.8rem;"></i>
                                </div>
                                <div class="text-start" style="line-height: 1.3;">
                                    <div class="fw-bold" style="font-size: 14px;">
                                        ${detail.studentKey ? `<a href="data-tracking.html?studentKey=${detail.studentKey}&tab=attendance" class="student-link-premium" style="font-size: 14px !important;">${khName}</a>` : khName}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td class="text-center py-3 fw-bold text-success" style="font-size: 14px;">${zhName || '-'}</td>
                        <td class="text-center py-3" style="font-size: 14px;">${genderBadge}</td>
                        <td class="text-center py-3">${badge}</td>
                        <td class="text-secondary text-center py-3 pe-3" style="font-style: italic; font-size: 13.5px; font-weight: 500;">
                            ${detail.reason || '<span class="text-muted" style="font-size: 12px; font-weight: 400;">-</span>'}
                        </td>
                    </tr>
                `;
            });
            detailsHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            // Fallback for older records
            const names = (rec.studentName || '').split(', ');
            let oldDetailsRowsHtml = '';
            
            names.forEach(n => {
                if (!n || n === "អត់មានអ្នកអវត្តមាន") return;
                const parsed = parseStudentNameDetails(n);
                const khName = parsed.khmerName;
                const zhName = parsed.chineseName;
                
                // Get gender
                const student = window.studentMap[khName] || window.studentByNameMap[khName] || window.allStudentsData.find(st => st.fullName.includes(khName) || st.key === khName);
                const genderVal = student ? (student.gender || '') : '';
                const genderKhmer = (genderVal === 'Male' || genderVal === 'ប្រុស') ? 'ប្រុស' : ((genderVal === 'Female' || genderVal === 'ស្រី') ? 'ស្រី' : '-');
                
                let genderBadge = '';
                if (genderKhmer === 'ប្រុស') {
                    genderBadge = `<span class="badge rounded-pill px-2.5 py-1.5" style="font-size: 12px; background: rgba(13, 110, 253, 0.08); color: #0d6efd; border: 1px solid rgba(13, 110, 253, 0.15); font-weight: 600;"><i class="fi fi-rr-mars me-1"></i>ប្រុស</span>`;
                } else if (genderKhmer === 'ស្រី') {
                    genderBadge = `<span class="badge rounded-pill px-2.5 py-1.5" style="font-size: 12px; background: rgba(220, 53, 69, 0.08); color: #dc3545; border: 1px solid rgba(220, 53, 69, 0.15); font-weight: 600;"><i class="fi fi-rr-venus me-1"></i>ស្រី</span>`;
                } else {
                    genderBadge = `<span class="badge rounded-pill px-2.5 py-1.5" style="font-size: 12px; background: rgba(108, 117, 125, 0.08); color: #6c757d; border: 1px solid rgba(108, 117, 125, 0.15); font-weight: 600;">-</span>`;
                }
                
                let badge = '';
                if (rec.leaveTypes && rec.leaveTypes.includes('អត់មានច្បាប់')) {
                    badge = `<span class="badge rounded-pill px-3 py-1.5" style="font-size: 12px; background: rgba(220, 53, 69, 0.08); color: #dc3545; border: 1px solid rgba(220, 53, 69, 0.18); font-weight: 600;"><i class="fi fi-rr-ban me-1.5"></i>អត់ច្បាប់</span>`;
                } else if (rec.leaveTypes && rec.leaveTypes.includes('ទិញច្បាប់')) {
                    badge = `<span class="badge rounded-pill px-3 py-1.5" style="font-size: 12px; background: rgba(138, 14, 91, 0.08); color: #8a0e5b; border: 1px solid rgba(138, 14, 91, 0.18); font-weight: 600;"><i class="fi fi-rr-envelope-open-text me-1.5"></i>ទិញច្បាប់</span>`;
                } else if (rec.leaveTypes && rec.leaveTypes.includes('ខលសុំច្បាប់')) {
                    badge = `<span class="badge rounded-pill px-3 py-1.5" style="font-size: 12px; background: rgba(6, 182, 212, 0.08); color: #0891b2; border: 1px solid rgba(6, 182, 212, 0.18); font-weight: 600;"><i class="fi fi-rr-phone-call me-1.5"></i>ខលសុំច្បាប់</span>`;
                } else {
                    badge = `<span class="badge rounded-pill px-3 py-1.5" style="font-size: 12px; background: rgba(138, 14, 91, 0.08); color: #8a0e5b; border: 1px solid rgba(138, 14, 91, 0.18); font-weight: 600;"><i class="fi fi-rr-envelope-open-text me-1.5"></i>${rec.leaveTypes || 'មានច្បាប់'}</span>`;
                }
                
                oldDetailsRowsHtml += `
                    <tr style="transition: background-color 0.2s;">
                        <td class="fw-bold text-center py-3 ps-3" style="color: #1e293b; font-size: 14px;">
                            <div class="d-flex align-items-center justify-content-center gap-2.5">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(138, 14, 91, 0.08); color: var(--bs-pink-dark); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; border: 1px solid rgba(138, 14, 91, 0.15); flex-shrink: 0;">
                                    <i class="fi fi-rr-user" style="font-size: 0.8rem;"></i>
                                </div>
                                <div class="text-start" style="line-height: 1.3;">
                                    <div class="fw-bold" style="font-size: 14px;">
                                        ${sKey ? `<a href="data-tracking.html?studentKey=${sKey}&tab=attendance" class="student-link-premium" style="font-size: 14px !important;">${khName}</a>` : khName}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td class="text-center py-3 fw-bold text-success" style="font-size: 14px;">${zhName || '-'}</td>
                        <td class="text-center py-3" style="font-size: 14px;">${genderBadge}</td>
                        <td class="text-center py-3">${badge}</td>
                        <td class="text-secondary text-center py-3 pe-3" style="font-style: italic; font-size: 13.5px; font-weight: 500;">
                            ${rec.reason || '<span class="text-muted" style="font-size: 12px; font-weight: 400;">-</span>'}
                        </td>
                    </tr>
                `;
            });

            detailsHtml = `
                <div class="table-responsive rounded-4 border overflow-hidden mt-1 shadow-sm bg-white" style="border-color: rgba(0,0,0,0.08) !important;">
                    <table class="table table-hover align-middle mb-0" style="font-size: 14px; background: #ffffff;">
                        <thead style="background: linear-gradient(135deg, #8a0e5b 0%, #5c063c 100%); color: #ffffff;">
                            <tr>
                                <th class="text-center py-3 ps-3" style="color: #ffffff; font-weight: 700; font-size: 13.5px; width: 25%; border: none;">ឈ្មោះសិស្ស (Student)</th>
                                <th class="text-center py-3" style="color: #ffffff; font-weight: 700; font-size: 13.5px; width: 25%; border: none;">ឈ្មោះចិន (Chinese)</th>
                                <th class="text-center py-3" style="color: #ffffff; font-weight: 700; font-size: 13.5px; width: 15%; border: none;">ភេទ (Gender)</th>
                                <th class="text-center py-3" style="color: #ffffff; font-weight: 700; font-size: 13.5px; width: 18%; border: none;">ប្រភេទច្បាប់ (Leave)</th>
                                <th class="text-center py-3 pe-3" style="color: #ffffff; font-weight: 700; font-size: 13.5px; width: 17%; border: none;">មូលហេតុ (Reason)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${oldDetailsRowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        }

        showLoading(false);

        Swal.fire({
            title: `<div class="d-flex align-items-center gap-2.5 pb-2.5" style="font-family: 'Kantumruy', 'Khmer OS Battambang', sans-serif; border-bottom: 2px solid rgba(138, 14, 91, 0.1); width: 100%;">
                <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(138, 14, 91, 0.08); color: var(--bs-pink-dark); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                    <i class="fi fi-rr-document-text"></i>
                </div>
                <span class="fw-bold text-pink-dark" style="font-size: 17.5px; letter-spacing: 0.2px;">ព័ត៌មានលម្អិតអវត្តមាន (Absence Details)</span>
            </div>`,
            width: '750px',
            html: `
                <div class="text-start p-1" style="font-family: 'Kantumruy', 'Khmer OS Battambang', sans-serif; font-size: 14.5px; color: var(--bs-body-color, #1e293b);">
                    <!-- Header Info Box -->
                    <div class="mb-4 p-3.5 rounded-4 border shadow-sm" style="border-color: rgba(138, 14, 91, 0.08) !important; background: linear-gradient(135deg, rgba(138, 14, 91, 0.02) 0%, rgba(255, 255, 255, 0.8) 100%);">
                        <div class="row g-3">
                            <div class="col-sm-6">
                                <div class="d-flex align-items-center gap-2.5">
                                    <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(13, 110, 253, 0.08); color: #0d6efd; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;">
                                        <i class="fi fi-rr-calendar"></i>
                                    </div>
                                    <div>
                                        <div class="text-muted small" style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">កាលបរិច្ឆេទ (Date)</div>
                                        <div class="fw-bold text-dark" style="font-size: 14px;">${rec.date || '-'}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <div class="d-flex align-items-center gap-2.5">
                                    <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(245, 124, 0, 0.08); color: #f57c00; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;">
                                        <i class="fi fi-rr-clock"></i>
                                    </div>
                                    <div>
                                        <div class="text-muted small" style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">ម៉ោងសិក្សា (Study Time)</div>
                                        <div class="fw-bold text-pink-dark" style="font-size: 13.5px;">${rec.studyTime || '-'}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-12 border-top pt-2.5 mt-2.5" style="border-color: rgba(138, 14, 91, 0.06) !important;">
                                <div class="d-flex align-items-center gap-2.5">
                                    <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(138, 14, 91, 0.08); color: #8a0e5b; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;">
                                        <i class="fi fi-rr-chalkboard-user"></i>
                                    </div>
                                    <div>
                                        <div class="text-muted small" style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">គ្រូបន្ទុកថ្នាក់ (Teacher)</div>
                                        <div class="fw-bold text-dark" style="font-size: 14.5px;">${rec.teacher || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Attendance Statistics Grid -->
                    <div class="d-flex align-items-center gap-2 mb-3">
                        <div style="width: 4px; height: 16px; background: var(--bs-pink-dark); border-radius: 2px;"></div>
                        <h6 class="fw-bold m-0" style="font-size: 14px; color: var(--bs-pink-dark);">ស្ថិតិវត្តមានក្នុងថ្នាក់ (Class Attendance Stats)</h6>
                    </div>
                    
                    <div class="row g-3 mb-4 text-center">
                        <div class="col-4">
                            <div class="p-3 rounded-4 border d-flex flex-column align-items-center position-relative overflow-hidden" style="border-color: rgba(13, 110, 253, 0.1) !important; background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(13, 110, 253, 0.02) 100%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01);">
                                <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(13, 110, 253, 0.08); color: #0d6efd; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 8px; box-shadow: 0 4px 10px rgba(13, 110, 253, 0.12);">
                                    <i class="fi fi-rr-users"></i>
                                </div>
                                <span class="text-secondary fw-semibold mb-1" style="font-size: 12px; letter-spacing: 0.3px;">សិស្សសរុប</span>
                                <span class="fw-bold text-primary" style="font-size: 22px;">${rec.totalStudents || 0}</span>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="p-3 rounded-4 border d-flex flex-column align-items-center position-relative overflow-hidden" style="border-color: rgba(25, 135, 84, 0.1) !important; background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(25, 135, 84, 0.02) 100%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01);">
                                <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(25, 135, 84, 0.08); color: #198754; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 8px; box-shadow: 0 4px 10px rgba(25, 135, 84, 0.12);">
                                    <i class="fi fi-rr-user-check"></i>
                                </div>
                                <span class="text-secondary fw-semibold mb-1" style="font-size: 12px; letter-spacing: 0.3px;">សិស្សមក</span>
                                <span class="fw-bold text-success" style="font-size: 22px;">${rec.presentStudents || 0}</span>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="p-3 rounded-4 border d-flex flex-column align-items-center position-relative overflow-hidden" style="border-color: rgba(220, 53, 69, 0.1) !important; background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(220, 53, 69, 0.02) 100%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01);">
                                <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(220, 53, 69, 0.08); color: #dc3545; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 8px; box-shadow: 0 4px 10px rgba(220, 53, 69, 0.12);">
                                    <i class="fi fi-rr-user-xmark"></i>
                                </div>
                                <span class="text-secondary fw-semibold mb-1" style="font-size: 12px; letter-spacing: 0.3px;">អវត្តមាន</span>
                                <span class="fw-bold text-danger" style="font-size: 22px;">${rec.absentStudents || 0}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Absence Details -->
                    <div class="d-flex align-items-center gap-2 mb-3">
                        <div style="width: 4px; height: 16px; background: var(--bs-pink-dark); border-radius: 2px;"></div>
                        <h6 class="fw-bold m-0" style="font-size: 14px; color: var(--bs-pink-dark);">ព័ត៌មានលម្អិតអវត្តមាន (Absence Details)</h6>
                    </div>
                    ${detailsHtml}
                </div>
            `,
            confirmButtonColor: '#8a0e5b',
            confirmButtonText: '<span style="font-family: \'Kantumruy\', \'Khmer OS Battambang\', sans-serif; font-size: 14.5px; font-weight: bold; padding: 4px 15px; display: inline-block;">បិទ (Close)</span>',
            customClass: {
                popup: 'rounded-4 border-0 shadow-lg',
                confirmButton: 'rounded-pill px-4'
            }
        });

    } catch (error) {
        showLoading(false);
        console.error("Error fetching view details:", error);
        if (window.showAlertPremium) window.showAlertPremium('កំហុស៖ ' + error.message, 'error');
    }
};

window.editAttendance = async function (key) {
    const editForm = document.getElementById('attendanceForm');
    if (!editForm) return;

    showLoading(true, 'កំពុងទាញយកទិន្នន័យ...');
    try {
        const snap = await firebase.database().ref('student_attendance/' + key).once('value');
        if (!snap.exists()) {
            showLoading(false);
            if (window.showAlertPremium) window.showAlertPremium('មិនរកឃើញទិន្នន័យ!', 'error');
            return;
        }

        const rec = snap.val();

        // 1. Populate fields
        document.getElementById('att_reason').value = rec.reason || '';
        document.getElementById('att_totalStudents').value = rec.totalStudents || 0;
        document.getElementById('att_presentStudents').value = rec.presentStudents || 0;
        document.getElementById('att_absentStudents').value = rec.absentStudents || 0;

        // Checkboxes
        const leaveTypesStr = rec.leaveTypes || '';
        document.getElementById('att_leaveBought').checked = leaveTypesStr.includes("ទិញច្បាប់មុន");
        document.getElementById('att_leaveCalled').checked = leaveTypesStr.includes("ខលសុំច្បាប់មុន");
        document.getElementById('att_leaveNone').checked = leaveTypesStr.includes("អត់មានច្បាប់");

        // Update card visual selections
        if (window.updateLeaveCardState) {
            window.updateLeaveCardState();
        }

        // 2. Select Study Time & Teacher
        const studyTimeSelect = document.getElementById('att_studyTime');
        const teacherSelect = document.getElementById('att_teacher');

        if (studyTimeSelect) studyTimeSelect.value = rec.studyTime || '';
        if (teacherSelect) teacherSelect.value = rec.teacher || '';

        // 3. Trigger student filtration locally for dropdown populating
        const selectedTime = rec.studyTime || '';
        const selectedTeacher = rec.teacher || '';
        const hasTime = selectedTime && !selectedTime.includes('--');

        const filteredStudents = window.allStudentsData.filter(student => {
            const matchTeacher = (student.teacherName === selectedTeacher || student.homeroomTeacher === selectedTeacher);
            const matchTime = hasTime ? (student.studyTime === selectedTime) : true;
            const notExcluded = !student.attendanceExcluded;  // skip soft-excluded students
            return matchTeacher && matchTime && notExcluded;
        });

        // Set Total Students
        document.getElementById('att_totalStudents').value = filteredStudents.length;

        // Populate Select2
        const studentSelect = document.getElementById('att_studentName');
        $(studentSelect).empty(); // clear existing

        filteredStudents.forEach(student => {
            const opt = document.createElement('option');
            opt.value = student.key;
            opt.textContent = student.fullName;
            studentSelect.appendChild(opt);
        });

        // Trigger change to update Select2 UI
        $(studentSelect).trigger('change');

        // 4. Map names/details back to keys and select them
        let keys = [];
        if (rec.studentDetails && Array.isArray(rec.studentDetails)) {
            keys = rec.studentDetails.map(d => d.studentKey);
        } else {
            // Fallback for older format records
            const names = (rec.studentName || '').split(", ");
            keys = names.map(name => {
                const trimmedName = name.trim();
                const s = window.studentMap[trimmedName] || window.allStudentsData.find(st => {
                    if (st.fullName === trimmedName) return true;
                    if (st.key === trimmedName) return true;
                    const displayIdOnly = st.fullName.match(/\(([^)]+)\)$/)?.[1] || '';
                    if (displayIdOnly && displayIdOnly === trimmedName) return true;
                    return false;
                });
                return s ? s.key : trimmedName;
            }).filter(k => k && k !== "អត់មានអ្នកអវត្តមាន");
        }

        // Ensure all keys being edited are present as option tags in the select element
        keys.forEach(k => {
            if (!filteredStudents.some(student => student.key === k)) {
                const student = window.studentMap[k];
                const opt = document.createElement('option');
                opt.value = k;
                if (student) {
                    opt.textContent = student.fullName;
                } else {
                    // Fallback for custom/older name formats
                    let customName = k;
                    if (rec.studentDetails) {
                        const d = rec.studentDetails.find(detail => detail.studentKey === k);
                        if (d) customName = d.studentName || k;
                    }
                    opt.textContent = customName;
                }
                studentSelect.appendChild(opt);
            }
        });

        $('#att_studentName').val(keys).trigger('change');

        // 4.1. Set individual student values in the dynamic cards
        if (rec.studentDetails) {
            rec.studentDetails.forEach(detail => {
                const card = Array.from(document.querySelectorAll('.student-attendance-card')).find(c => c.getAttribute('data-student-key') === detail.studentKey);
                if (card) {
                    const statusSelect = card.querySelector('.student-leave-type');
                    const reasonInput = card.querySelector('.student-reason');
                    if (statusSelect) {
                        statusSelect.value = detail.status || 'A';
                        if (window.styleLeaveSelect) {
                            window.styleLeaveSelect(statusSelect);
                        }
                    }
                    if (reasonInput) reasonInput.value = detail.reason || '';
                }
            });
        } else {
            // Fallback for old format records
            const leaveTypesStr = rec.leaveTypes || '';
            let fallbackStatus = 'A';
            if (leaveTypesStr.includes("ទិញច្បាប់មុន")) fallbackStatus = 'B';
            else if (leaveTypesStr.includes("ខលសុំច្បាប់មុន")) fallbackStatus = 'S';

            const fallbackReason = rec.reason || '';

            keys.forEach(k => {
                const card = Array.from(document.querySelectorAll('.student-attendance-card')).find(c => c.getAttribute('data-student-key') === k);
                if (card) {
                    const statusSelect = card.querySelector('.student-leave-type');
                    const reasonInput = card.querySelector('.student-reason');
                    if (statusSelect) {
                        statusSelect.value = fallbackStatus;
                        if (window.styleLeaveSelect) {
                            window.styleLeaveSelect(statusSelect);
                        }
                    }
                    if (reasonInput) reasonInput.value = fallbackReason;
                }
            });
        }

        // 5. Store editing metadata
        editForm.dataset.editKey = key;
        editForm.dataset.editDate = rec.date;

        // Update Modal UI titles/buttons
        document.getElementById('attendanceModalLabel').innerHTML = '<i class="fi fi-rr-edit me-2"></i>កែប្រែព័ត៌មានអវត្តមាន';
        const submitBtn = editForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fi fi-rr-disk me-1"></i> កែប្រែទិន្នន័យ';
        }

        // Show Modal
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('attendanceModal'));
        showLoading(false);
        modal.show();

    } catch (error) {
        showLoading(false);
        console.error("Error loading edit modal:", error);
        if (window.showAlertPremium) window.showAlertPremium('កំហុស៖ ' + error.message, 'error');
    }
};

window.showReportPreviewModal = (htmlContent) => {
    let modalEl = document.getElementById('reportPreviewModal');
    if (!modalEl) {
        const modalHtml = `
            <div class="modal fade" id="reportPreviewModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content border-0 shadow-lg" style="border-radius: 16px !important; overflow: hidden;">
                        <div class="modal-header border-bottom-0" style="background: #ffffff !important; padding: 15px 20px !important; border-bottom: 1px solid #e2e8f0 !important; display: flex !important; justify-content: space-between !important; align-items: center !important;">
                            <h5 class="modal-title fw-bold text-dark d-flex align-items-center" style="color: #1e293b !important; font-size: 1.15rem !important;">
                                <i class="fi fi-rr-document text-primary me-2"></i> ពិនិត្យមើលរបាយការណ៍ (Preview)
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="background-color: transparent !important; filter: none !important; opacity: 0.8 !important; border: none !important;"></button>
                        </div>
                        <div class="modal-body p-0" style="height: 75vh; background: #e2e8f0 !important; padding: 0 !important;">
                            <iframe id="reportPreviewIframe" style="width: 100%; height: 100%; border: none; background: #e2e8f0;"></iframe>
                        </div>
                        <div class="modal-footer border-top-0" style="background: #ffffff !important; padding: 12px 20px !important; border-top: 1px solid #e2e8f0 !important;">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">បិទ (Close)</button>
                            <button type="button" class="btn btn-primary px-4 fw-bold" onclick="window.printReportPreviewIframe()">
                                <i class="fi fi-rr-print me-2"></i>បោះពុម្ព (Print / Save PDF)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('reportPreviewModal');
        
        if (!window.printReportPreviewIframe) {
            window.printReportPreviewIframe = function() {
                const iframe = document.getElementById('reportPreviewIframe');
                if (iframe && iframe.contentWindow) {
                    const origTitle = document.title;
                    const docTitle = iframe.contentDocument.title || 'Report';
                    const now = new Date();
                    const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                    document.title = docTitle.replace(/[<>:"/\\\\|?*]+/g, '_') + '_' + dateStr;
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                    setTimeout(() => { document.title = origTitle; }, 500);
                }
            };
        }
    }

    const iframe = document.getElementById('reportPreviewIframe');
    const myModal = new bootstrap.Modal(modalEl);
    myModal.show();

    setTimeout(() => {
        const win = iframe.contentWindow;
        win.document.open();
        win.document.write(htmlContent);
        win.document.close();
    }, 300);
};

window.exportAttendanceToExcel = function() {
    if (typeof attendanceDataTable !== 'undefined' && attendanceDataTable) {
        // Programmatically trigger the DataTable Excel button click
        attendanceDataTable.button('.buttons-excel').trigger();
    } else {
        // Fallback selector
        const dtBtn = document.querySelector('.buttons-excel');
        if (dtBtn) dtBtn.click();
    }
};

window.generateAttendanceReportPDF = function() {
    if (!attendanceDataTable) return;

    if (typeof Swal !== 'undefined') {
        // Inject modern styling for SweetAlert config modal
        const styleId = 'swal-report-config-styles';
        if (!document.getElementById(styleId)) {
            const styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.innerHTML = `
                .swal-report-container {
                    font-family: 'Kantumruy', 'Khmer OS Battambang', sans-serif;
                    color: #1e293b;
                }
                .preparer-card {
                    border: 2.5px solid #e2e8f0;
                    background-color: #ffffff;
                    border-radius: 14px;
                    padding: 14px 10px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }
                .preparer-card:hover {
                    transform: translateY(-2px);
                    border-color: #8a0e5b;
                    box-shadow: 0 10px 15px -3px rgba(138, 14, 91, 0.08);
                }
                .preparer-card.active {
                    border-color: #8a0e5b;
                    background-color: rgba(138, 14, 91, 0.04);
                    box-shadow: 0 10px 20px -5px rgba(138, 14, 91, 0.15);
                }
                .preparer-card .avatar-circle {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    background: #f1f5f9;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 8px;
                    font-size: 1.25rem;
                    transition: all 0.2s;
                }
                .preparer-card.active .avatar-circle {
                    background: rgba(138, 14, 91, 0.12);
                    color: #8a0e5b;
                }
                .preparer-card .check-badge {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #8a0e5b;
                    color: #fff;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.65rem;
                    box-shadow: 0 2px 4px rgba(138, 14, 91, 0.2);
                }
                .preparer-card.active .check-badge {
                    display: flex;
                }
                .swal-input-premium {
                    border: 1.5px solid #cbd5e1 !important;
                    border-radius: 8px !important;
                    padding: 10px 12px !important;
                    font-size: 0.95rem !important;
                    color: #1e293b !important;
                    background-color: #fff !important;
                    transition: border-color 0.2s, box-shadow 0.2s !important;
                    cursor: pointer;
                }
                .swal-input-premium:focus {
                    border-color: #8a0e5b !important;
                    box-shadow: 0 0 0 3px rgba(138, 14, 91, 0.2) !important;
                    outline: none !important;
                }
                .date-label {
                    font-size: 0.85rem;
                    color: #64748b;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
            `;
            document.head.appendChild(styleEl);
        }

        // Generate Khmer months list for date selection
        const khmerMonths = [
            { val: '01', name: 'មករា (Jan)' },
            { val: '02', name: 'កុម្ភៈ (Feb)' },
            { val: '03', name: 'មីនា (Mar)' },
            { val: '04', name: 'មេសា (Apr)' },
            { val: '05', name: 'ឧសភា (May)' },
            { val: '06', name: 'មិថុនា (Jun)' },
            { val: '07', name: 'កក្កដា (Jul)' },
            { val: '08', name: 'សីហា (Aug)' },
            { val: '09', name: 'កញ្ញា (Sep)' },
            { val: '10', name: 'តុលា (Oct)' },
            { val: '11', name: 'វិច្ឆិកា (Nov)' },
            { val: '12', name: 'ធ្នូ (Dec)' }
        ];

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
        const currentDay = String(today.getDate()).padStart(2, '0');

        // Build Day selection options
        let daysHtml = '';
        for (let d = 1; d <= 31; d++) {
            const val = String(d).padStart(2, '0');
            const selected = val === currentDay ? 'selected' : '';
            daysHtml += `<option value="${val}" ${selected}>${d}</option>`;
        }

        // Build Month selection options
        let monthsHtml = '';
        khmerMonths.forEach(m => {
            const selected = m.val === currentMonth ? 'selected' : '';
            monthsHtml += `<option value="${m.val}" ${selected}>${m.name}</option>`;
        });

        // Build Year selection options
        let yearsHtml = '';
        for (let y = currentYear - 3; y <= currentYear + 3; y++) {
            const selected = y === currentYear ? 'selected' : '';
            yearsHtml += `<option value="${y}" ${selected}>${y}</option>`;
        }

        Swal.fire({
            title: '<h5 class="fw-bold m-0" style="color: #8a0e5b; font-size: 1.25rem;"><i class="fi fi-rr-settings-sliders me-2"></i>រៀបចំរបាយការណ៍ (Configure Report)</h5>',
            html: `
                <div class="swal-report-container text-start mt-2">
                    <!-- Section 1: Preparer Selection -->
                    <div class="mb-4">
                        <label class="form-label fw-bold text-dark mb-2.5" style="font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                            <i class="fi fi-rr-user-edit" style="color: #8a0e5b; font-size: 1rem;"></i> អ្នកយកវត្តមាន/អ្នករៀបចំអវត្តមាន <span class="text-danger">*</span>
                        </label>
                        
                        <!-- Grid Cards -->
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <div class="preparer-card active" data-preparer="文玲 - ផុន លីន">
                                    <div class="check-badge"><i class="fi fi-rr-check"></i></div>
                                    <div class="avatar-circle"><i class="fi fi-rr-user"></i></div>
                                    <div class="fw-bold" style="font-size: 0.9rem;">文玲 - ផុន លីន</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="preparer-card" data-preparer="毛平安 - សុខណាង">
                                    <div class="check-badge"><i class="fi fi-rr-check"></i></div>
                                    <div class="avatar-circle"><i class="fi fi-rr-user"></i></div>
                                    <div class="fw-bold" style="font-size: 0.9rem;">毛平安 - សុខណាង</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Custom Option Card -->
                        <div class="preparer-card mb-2" data-preparer="custom" style="flex-direction: row; padding: 12px 15px; width: 100%; gap: 12px; justify-content: flex-start;">
                            <div class="check-badge"><i class="fi fi-rr-check"></i></div>
                            <div class="avatar-circle mb-0" style="width: 32px; height: 32px; font-size: 0.9rem;"><i class="fi fi-rr-user-add"></i></div>
                            <div class="fw-bold text-secondary" style="font-size: 0.9rem;">ឈ្មោះផ្សេងទៀត... (Custom Name)</div>
                        </div>

                        <!-- Custom Input Field -->
                        <div id="swal_custom_preparer_container" style="max-height: 0px; overflow: hidden; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0;">
                            <div class="pt-2">
                                <label for="swal_custom_preparer" class="date-label">បញ្ចូលឈ្មោះអ្នកយកវត្តមាន/អ្នករៀបចំអវត្តមាន (Chinese-Khmer)</label>
                                <input type="text" id="swal_custom_preparer" class="form-control swal-input-premium" placeholder="ឧ. 王小明-វ៉ាង ស៊ាវមីង...">
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Date Selector (Day, Month, Year) -->
                    <div class="mb-2">
                        <label class="form-label fw-bold text-dark mb-2" style="font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                            <i class="fi fi-rr-calendar-clock" style="color: #8a0e5b; font-size: 1rem;"></i> ថ្ងៃខែឆ្នាំធ្វើរបាយការណ៍ (Report Date) <span class="text-danger">*</span>
                        </label>
                        
                        <div class="row g-2">
                            <div class="col-4">
                                <div class="date-label">ថ្ងៃ (Day)</div>
                                <select id="swal_report_day" class="form-select swal-input-premium">
                                    ${daysHtml}
                                </select>
                            </div>
                            <div class="col-4">
                                <div class="date-label">ខែ (Month)</div>
                                <select id="swal_report_month" class="form-select swal-input-premium">
                                    ${monthsHtml}
                                </select>
                            </div>
                            <div class="col-4">
                                <div class="date-label">ឆ្នាំ (Year)</div>
                                <select id="swal_report_year" class="form-select swal-input-premium">
                                    ${yearsHtml}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            didOpen: () => {
                let selectedPreparer = '文玲 - ផុន លីន';
                const cards = document.querySelectorAll('.preparer-card');
                const customContainer = document.getElementById('swal_custom_preparer_container');
                const customInput = document.getElementById('swal_custom_preparer');

                cards.forEach(card => {
                    card.addEventListener('click', function() {
                        // Deactivate all cards
                        cards.forEach(c => c.classList.remove('active'));
                        
                        // Activate clicked card
                        this.classList.add('active');
                        selectedPreparer = this.getAttribute('data-preparer');

                        // Manage custom input slide-in effect
                        if (selectedPreparer === 'custom') {
                            customContainer.style.maxHeight = '100px';
                            customContainer.style.opacity = '1';
                            setTimeout(() => customInput.focus(), 150);
                        } else {
                            customContainer.style.maxHeight = '0px';
                            customContainer.style.opacity = '0';
                        }
                    });
                });

            },
            preConfirm: () => {
                const activeCard = document.querySelector('.preparer-card.active');
                const selectVal = activeCard ? activeCard.getAttribute('data-preparer') : '文玲 - ផុន លីន';
                
                let preparerName = selectVal;
                if (selectVal === 'custom') {
                    const customVal = document.getElementById('swal_custom_preparer').value.trim();
                    if (!customVal) {
                        Swal.showValidationMessage('សូមបញ្ចូលឈ្មោះអ្នកយកវត្តមាន/អ្នករៀបចំអវត្តមាន!');
                        return false;
                    }
                    preparerName = customVal;
                }

                // Get Day, Month, Year values
                const day = document.getElementById('swal_report_day').value;
                const month = document.getElementById('swal_report_month').value;
                const year = document.getElementById('swal_report_year').value;

                if (!day || !month || !year) {
                    Swal.showValidationMessage('សូមជ្រើសរើសថ្ងៃខែឆ្នាំអោយបានត្រឹមត្រូវ!');
                    return false;
                }

                const dateVal = `${year}-${month}-${day}`;
                return { preparerName, dateVal };
            },
            showCancelButton: true,
            confirmButtonText: '<i class="fi fi-rr-document-signed me-1"></i> បង្កើតរបាយការណ៍',
            cancelButtonText: 'បោះបង់',
            confirmButtonColor: '#8a0e5b',
            cancelButtonColor: '#64748b',
            customClass: {
                popup: 'rounded-4 border-0 shadow-lg',
                confirmButton: 'px-4 py-2 fw-bold',
                cancelButton: 'px-4 py-2'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                generateReportWithDetails(result.value.preparerName, result.value.dateVal);
            }
        });
    } else {
        let preparerName = prompt('សូមបញ្ចូលឈ្មោះអ្នកយកវត្តមាន/អ្នករៀបចំអវត្តមាន:', '文玲 - ផុន លីន');
        let reportDate = new Date().toISOString().substring(0, 10);
        if (preparerName) {
            generateReportWithDetails(preparerName, reportDate);
        }
    }
};

function convertDateToKhmerStandard(dateString) {
    if (!dateString) return 'ថ្ងៃទី....... ខែ....... ឆ្នាំ.......';
    const parts = dateString.split('-');
    if (parts.length !== 3) return 'ថ្ងៃទី....... ខែ....... ឆ្នាំ.......';

    const yyyy = parts[0];
    const mm = parts[1];
    const dd = parts[2];

    const khmerNumbers = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    const toKhmerNum = (numStr) => {
        return String(numStr).split('').map(char => khmerNumbers[parseInt(char)] || char).join('');
    };

    const khmerMonths = {
        '01': 'មករា', '02': 'កុម្ភៈ', '03': 'មីនា', '04': 'មេសា',
        '05': 'ឧសភា', '06': 'មិថុនា', '07': 'កក្កដា', '08': 'សីហា',
        '09': 'កញ្ញា', '10': 'តុលា', '11': 'វិច្ឆិកា', '12': 'ធ្នូ'
    };

    const khDay = toKhmerNum(parseInt(dd));
    const khMonth = khmerMonths[mm] || '.......';
    const khYear = toKhmerNum(yyyy);

    return `ថ្ងៃទី ${khDay} ខែ ${khMonth} ឆ្នាំ ${khYear}`;
}

function formatHeaderDate(dateString) {
    if (!dateString) return new Date().toLocaleDateString('en-GB');
    const parts = dateString.split('-');
    if (parts.length !== 3) return new Date().toLocaleDateString('en-GB');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function generateReportWithDetails(preparerName, reportDate) {
    // 1. Get filtered data from DataTable
    const rowsData = [];
    attendanceDataTable.rows({ search: 'applied' }).every(function () {
        const node = this.node();
        const key = $(node).attr('data-key');
        const cells = $(node).find('td');
        
        const originalItem = (window.currentAttendanceItems || []).find(item => item.key === key);
        
        rowsData.push({
            key: key,
            date: $(cells[0]).text().trim(),
            studyTime: $(cells[1]).text().trim(),
            teacher: $(cells[2]).text().trim(),
            totalStudents: $(cells[3]).text().trim(),
            presentStudents: $(cells[4]).text().trim(),
            absentStudents: $(cells[5]).text().trim(),
            studentName: $(cells[6]).text().trim(),
            chineseName: $(cells[7]).text().trim(), // Read Chinese Name cell
            gender: $(cells[8]).text().trim(),      // Shifted from 7 to 8
            leaveTypes: $(cells[9]).text().trim(),  // Shifted from 8 to 9
            reason: $(cells[10]).text().trim(),     // Shifted from 9 to 10
            studentDetails: originalItem ? originalItem.studentDetails : null
        });
    });

    if (rowsData.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire('គ្មានទិន្នន័យ', 'គ្មានទិន្នន័យសម្រាប់បង្កើតរបាយការណ៍ទេ', 'warning');
        } else {
            alert('គ្មានទិន្នន័យសម្រាប់បង្កើតរបាយការណ៍ទេ');
        }
        return;
    }

    // Calculate totals
    let totalAbsent = 0;
    let totalLeave = 0;
    let totalNoLeave = 0;
    const processedKeysForTotals = new Set();

    rowsData.forEach(r => {
        if (processedKeysForTotals.has(r.key)) {
            return; // Skip if already processed for totals
        }
        processedKeysForTotals.add(r.key);

        const absentCount = parseInt(r.absentStudents) || 0;
        totalAbsent += absentCount;
        if (r.studentDetails && Array.isArray(r.studentDetails)) {
            r.studentDetails.forEach(detail => {
                if (detail.status === 'B' || detail.status === 'S') {
                    totalLeave += 1;
                } else if (detail.status === 'A') {
                    totalNoLeave += 1;
                }
            });
        } else {
            // Fallback for older records
            const leaveText = r.leaveTypes;
            if (absentCount > 0) {
                if (leaveText.includes('អត់មានច្បាប់')) {
                    totalNoLeave += absentCount;
                } else {
                    totalLeave += absentCount;
                }
            }
        }
    });

    // 2. Group by teacher
    const groups = {};
    const processedKeysForTeacherStats = new Set();

    rowsData.forEach(row => {
        const teacher = row.teacher || 'មិនស្គាល់គ្រូ';
        if (!groups[teacher]) {
            groups[teacher] = {
                teacher: teacher,
                totalStudents: 0,
                presentStudents: 0,
                absentStudents: 0,
                sessions: []
            };
        }

        // Sum class stats once per unique session key to avoid double-counting
        if (!processedKeysForTeacherStats.has(row.key)) {
            processedKeysForTeacherStats.add(row.key);
            groups[teacher].totalStudents += parseInt(row.totalStudents) || 0;
            groups[teacher].presentStudents += parseInt(row.presentStudents) || 0;
            groups[teacher].absentStudents += parseInt(row.absentStudents) || 0;
        }

        // Keep all individual split rows for detailed printing
        groups[teacher].sessions.push(row);
    });

    const title = 'របាយការណ៍សម្រង់អវត្តមានសិស្សប្រចាំថ្ងៃ';
    const subtitle = 'Daily Student Absence Report';
    const todayDate = formatHeaderDate(reportDate);

    // Generate HTML for each teacher group card
    const teacherGroupsHtml = Object.values(groups).map(group => {
        const sessionRowsHtml = group.sessions.map((row, index) => {
            const absentCount = parseInt(row.absentStudents) || 0;
            const absentTextClass = absentCount > 0 ? 'text-danger fw-bold' : 'text-muted';
            
            let badgeStyle = '';
            let leaveText = row.leaveTypes;
            if (absentCount === 0) {
                leaveText = 'វត្តមាន ១០០%';
                badgeStyle = 'background-color: #d1e7dd; color: #0f5132; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; display: inline-block;';
            } else if (leaveText.includes('អត់មានច្បាប់')) {
                badgeStyle = 'background-color: #f8d7da; color: #842029; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; display: inline-block;';
            } else {
                badgeStyle = 'background-color: #fff3cd; color: #664d03; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; display: inline-block;';
            }

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${row.date}</td>
                    <td><span style="background: #f1f5f9; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; border: 1px solid #e2e8f0; display: inline-block;">${row.studyTime}</span></td>
                    <td class="fw-bold" style="color: #8a0e5b; text-align: center;">${row.studentName}</td>
                    <td class="fw-bold text-success" style="text-align: center;">${row.chineseName || '-'}</td>
                    <td class="fw-bold" style="text-align: center;">${row.gender || '-'}</td>
                    <td style="text-align: center;"><span style="${badgeStyle}">${leaveText}</span></td>
                    <td style="text-align: center;">${row.reason}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="teacher-group-card" style="margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; page-break-inside: avoid; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
                <div style="background: linear-gradient(135deg, #8a0e5b 0%, #680542 100%); color: #ffffff; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; border-bottom: 2px solid rgba(138, 14, 91, 0.15); position: relative; z-index: 1;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(255, 255, 255, 0.18); display: flex; align-items: center; justify-content: center; font-size: 1.15rem; color: #ffffff; border: 1.5px solid rgba(255, 255, 255, 0.25); box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <i class="fi fi-rr-chalkboard-user" style="vertical-align: middle;"></i>
                        </div>
                        <div style="text-align: left;">
                            <span style="font-size: 0.8rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255, 255, 255, 0.8); display: block; margin-bottom: 2px;">គ្រូបន្ទុកថ្នាក់ (Teacher)</span>
                            <span style="font-size: 1.15rem; font-weight: 800; color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">${group.teacher}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <span style="font-size: 0.82rem; font-weight: bold; background: rgba(56, 189, 248, 0.18); color: #38bdf8; border: 1.5px solid rgba(56, 189, 248, 0.3); padding: 4px 12px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
                            សិស្សសរុប៖ <span style="font-size: 0.95rem; font-weight: 800; color: #ffffff;">${group.totalStudents}</span> នាក់
                        </span>
                        <span style="font-size: 0.82rem; font-weight: bold; background: rgba(74, 222, 128, 0.18); color: #4ade80; border: 1.5px solid rgba(74, 222, 128, 0.3); padding: 4px 12px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
                            មក៖ <span style="font-size: 0.95rem; font-weight: 800; color: #ffffff;">${group.presentStudents}</span> នាក់
                        </span>
                        <span style="font-size: 0.82rem; font-weight: bold; background: rgba(248, 113, 113, 0.18); color: #fca5a5; border: 1.5px solid rgba(248, 113, 113, 0.3); padding: 4px 12px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
                            អវត្តមាន៖ <span style="font-size: 0.95rem; font-weight: 800; color: #ffffff; text-decoration: underline;">${group.absentStudents}</span> នាក់
                        </span>
                    </div>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 0;">
                    <thead>
                        <tr style="background-color: #f1f5f9; color: #475569;">
                            <th width="5%" style="color: #475569; background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; padding: 10px 6px; text-align: center; font-weight: bold;">ល.រ</th>
                            <th width="12%" style="color: #475569; background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; padding: 10px 6px; text-align: center; font-weight: bold;">កាលបរិច្ឆេទ</th>
                            <th width="12%" style="color: #475569; background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; padding: 10px 6px; text-align: center; font-weight: bold;">ម៉ោងសិក្សា</th>
                            <th style="color: #475569; background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; padding: 10px 6px; text-align: center; font-weight: bold;">ឈ្មោះសិស្សអវត្តមាន</th>
                            <th width="15%" style="color: #475569; background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; padding: 10px 6px; text-align: center; font-weight: bold;">ឈ្មោះចិន</th>
                            <th width="8%" style="color: #475569; background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; padding: 10px 6px; text-align: center; font-weight: bold;">ភេទ</th>
                            <th width="15%" style="color: #475569; background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; padding: 10px 6px; text-align: center; font-weight: bold;">ប្រភេទច្បាប់</th>
                            <th style="color: #475569; background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; padding: 10px 6px; text-align: center; font-weight: bold;">មូលហេតុ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessionRowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }).join('');

    const htmlContent = `
        <html>
        <head>
            <title>${title}</title>
            <style>
                @page { size: landscape; margin: 10mm; }
                @font-face {
                    font-family: 'Kantumruy';
                    src: url(data:font/truetype;charset=utf-8;base64,${typeof kantumruyRegularBase64 !== 'undefined' ? kantumruyRegularBase64 : ''}) format('truetype');
                }
                @font-face {
                    font-family: 'Khmer OS Battambang';
                    src: url(data:font/truetype;charset=utf-8;base64,${typeof khmerFontBase64 !== 'undefined' ? khmerFontBase64 : ''}) format('truetype');
                }
                body { 
                    font-family: 'Kantumruy', 'Khmer OS Battambang', sans-serif; 
                    padding: 20px; 
                    color: #333; 
                    background: #e2e8f0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin: 0;
                    box-sizing: border-box;
                }
                .document-page {
                    background: #fff;
                    width: 100%;
                    max-width: 297mm;
                    min-height: 210mm;
                    padding: 15mm;
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
                    box-sizing: border-box;
                    border-radius: 8px;
                    margin-bottom: 30px;
                    position: relative;
                    overflow: hidden;
                }
                .watermark-bg {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 480px;
                    height: 480px;
                    object-fit: contain;
                    opacity: 0.09;
                    filter: blur(1.5px);
                    pointer-events: none;
                    z-index: 0;
                }
                .header { 
                    display: flex; 
                    align-items: center; 
                    gap: 20px; 
                    margin-bottom: 25px; 
                    padding-bottom: 15px; 
                    border-bottom: 3px double #8a0e5b; 
                    position: relative;
                    z-index: 1;
                }
                .report-title { 
                    text-align: center; 
                    flex: 1; 
                    position: relative;
                    z-index: 1;
                }
                .report-title h2 { 
                    margin: 0; 
                    color: #8a0e5b; 
                    font-size: 1.8rem; 
                    font-weight: bold; 
                }
                
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    font-size: 0.85rem; 
                }
                th, td { 
                    padding: 10px 6px; 
                    text-align: center; 
                    vertical-align: middle; 
                }
                td {
                    border-bottom: 1px solid #e2e8f0;
                }
                tr:nth-child(even) {
                    background-color: #f8fafc;
                }
                .text-left { 
                    text-align: left !important; 
                    padding-left: 8px; 
                }
                .text-right { 
                    text-align: right !important; 
                    padding-right: 8px; 
                }
                .text-danger { 
                    color: #dc3545; 
                }
                .fw-bold { 
                    font-weight: bold; 
                }
                
                .footer { 
                    margin-top: 40px; 
                    display: flex; 
                    justify-content: flex-end; 
                    padding-right: 80px;
                    font-size: 0.9rem; 
                    page-break-inside: avoid; 
                    position: relative;
                    z-index: 1;
                }
                .signature-box { 
                    text-align: center; 
                    width: 280px; 
                }
                .signature-line { 
                    margin-top: 55px; 
                    border-top: 1px solid #333; 
                    width: 100%; 
                    margin-bottom: 10px;
                }
                
                @media print {
                    html, body { height: auto !important; padding: 0 !important; margin: 0 !important; background: #fff !important; }
                    .document-page {
                        width: 100% !important;
                        max-width: none !important;
                        min-height: auto !important;
                        box-shadow: none !important;
                        padding: 10mm !important;
                        border-radius: 0 !important;
                        margin-bottom: 0 !important;
                    }
                    tr { break-inside: avoid; }
                    thead { display: table-header-group; }
                    .watermark-bg {
                        position: fixed !important;
                        top: 50% !important;
                        left: 50% !important;
                        transform: translate(-50%, -50%) !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="document-page">
                <!-- Watermark Logo Background (Centered & Blurred) -->
                <img src="img/1.jpg" class="watermark-bg" onerror="this.src='img/logo.jpg'">
                
                <div class="header" style="justify-content: center; text-align: center;">
                    <div class="report-title" style="text-align: center; flex: none;">
                        <h2 style="font-size: 1.85rem; font-weight: 800; color: #8a0e5b; margin: 0; letter-spacing: 0.5px;">${title}</h2>
                        <div style="color: #475569; margin-top: 6px; font-size: 0.9rem; font-weight: bold; font-family: Arial, sans-serif; letter-spacing: 0.5px;">${subtitle}</div>
                        <div style="margin-top: 14px; display: flex; justify-content: center;">
                            <div style="display: inline-flex; align-items: center; border-radius: 6px; overflow: hidden; border: 1.5px solid #8a0e5b; box-shadow: 0 2px 4px rgba(138, 14, 91, 0.06);">
                                <div style="background-color: #8a0e5b; color: #ffffff; padding: 5px 12px; font-size: 0.82rem; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                                    <i class="fi fi-rr-calendar" style="font-size: 0.9rem;"></i>
                                    <span>កាលបរិច្ឆេទ (Date)</span>
                                </div>
                                <div style="background-color: #f8fafc; color: #0f172a; padding: 5px 14px; font-size: 0.88rem; font-weight: 800; letter-spacing: 0.5px;">
                                    ${todayDate}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${teacherGroupsHtml}
                
                <div style="margin-top: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px 20px; page-break-inside: avoid;">
                    <div style="font-size: 1rem; font-weight: bold; color: #8a0e5b; margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">
                        សរុបរបាយការណ៍រួម (Summary Statistics)
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.95rem; flex-wrap: wrap; gap: 10px;">
                        <div>សរុបសិស្សអវត្តមាន (Total Absent)៖ <span class="text-danger fw-bold">${totalAbsent} នាក់</span></div>
                        <div>មានច្បាប់ (Excused Absence)៖ <span class="fw-bold" style="color: #0f5132;">${totalLeave} នាក់</span></div>
                        <div>អត់មានច្បាប់ (Unexcused Absence)៖ <span class="text-danger fw-bold">${totalNoLeave} នាក់</span></div>
                    </div>
                </div>
                
                <div class="footer">
                    <div class="signature-box">
                        <div style="font-size: 0.9rem; margin-bottom: 8px; color: #475569; font-weight: bold;">${convertDateToKhmerStandard(reportDate)}</div>
                        <div class="fw-bold" style="font-size: 0.95rem; color: #1e293b;">អ្នកយកវត្តមាន/អ្នករៀបចំអវត្តមាន</div>
                        <div style="height: 65px;"></div>
                        <div class="fw-bold" style="font-size: 1rem; color: #8a0e5b;">( ${preparerName} )</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    window.showReportPreviewModal(htmlContent);
}
