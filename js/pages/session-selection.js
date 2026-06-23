
/**
 * Open modal for selecting multiple study times for PDF export
 */
window.openSessionSelectionModal = function () {
    // Get all unique study times - prioritize staff-defined classes if available
    const activeStudents = Object.values(allStudentsData).filter(s => s.enrollmentStatus !== 'dropout');
    let studyTimes = [];

    if (window.allStaffStudyTimes && window.allStaffStudyTimes.length > 0) {
        studyTimes = window.allStaffStudyTimes;
    } else {
        studyTimes = [...new Set(activeStudents.map(s => s.studyTime).filter(Boolean))].sort();
    }

    // Get all unique teachers
    const teachers = [...new Set(activeStudents.map(s => s.teacherName).filter(Boolean))].sort();

    if (studyTimes.length === 0) {
        return showAlert('មិនមានម៉ោងសិក្សាទេ', 'warning');
    }

    // Remove existing modal if any
    const existing = document.getElementById('sessionSelectionModal');
    if (existing) {
        const instance = bootstrap.Modal.getInstance(existing);
        if (instance) instance.dispose();
        existing.remove();
    }

    // Create teacher options
    const teacherOptions = teachers.map(t => `<option value="${t}">${t}</option>`).join('');

    // Create checkboxes for each study time
    const checkboxesHTML = studyTimes.map((time, index) => `
        <div class="form-check mb-2">
            <input class="form-check-input" type="checkbox" value="${time}" id="session-${index}" data-session="${time}">
            <label class="form-check-label fw-bold" for="session-${index}">
                ${time}
            </label>
        </div>
    `).join('');

    const modalHTML = `
        <div class="modal fade" id="sessionSelectionModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 15px;">
                    <div class="modal-header bg-primary text-white border-0">
                        <h5 class="modal-title fw-bold">
                            <i class="fi fi-rr-clock me-2"></i>ម៉ោងសិក្សា (Study Times)
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        
                        <!-- Teacher Selection -->
                        <div class="mb-4">
                            <label class="form-label fw-bold text-dark mb-2">
                                <i class="fi fi-rr-chalkboard-user me-1"></i>គ្រូបន្ទុកថ្នាក់ (Teacher)
                            </label>
                            <select class="form-select border-primary" id="teacher-select">
                                <option value="all">គ្រូទាំងអស់ (All Teachers)</option>
                                ${teacherOptions}
                            </select>
                        </div>

                        <hr class="my-3 text-muted">

                        <p class="text-muted mb-3">
                            <i class="fi fi-rr-info me-2"></i>ម៉ោងសិក្សាមួយ ឬច្រើនដើម្បីនាំចេញជា PDF
                        </p>
                        <div class="mb-3">
                            <button type="button" class="btn btn-sm btn-outline-primary me-2" onclick="selectAllSessions()">
                                <i class="fi fi-rr-check-double me-1"></i>ជ្រើសរើសទាំងអស់
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="deselectAllSessions()">
                                <i class="fi fi-rr-cross-small me-1"></i>លុបចោលទាំងអស់
                            </button>
                        </div>
                        <div id="session-checkboxes" style="max-height: 250px; overflow-y: auto; background: #f8f9fa; padding: 15px; border-radius: 10px;">
                            ${checkboxesHTML}
                        </div>
                    </div>
                    <div class="modal-footer border-0 bg-light">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">បោះបង់</button>
                        <button type="button" class="btn btn-primary fw-bold px-4" onclick="exportMultipleSessionsPDF()">
                            <i class="fi fi-rr-file-pdf me-2"></i>នាំចេញ PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    new bootstrap.Modal(document.getElementById('sessionSelectionModal')).show();
};

/**
 * Select all sessions
 */
window.selectAllSessions = function () {
    document.querySelectorAll('#session-checkboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
};

/**
 * Deselect all sessions
 */
window.deselectAllSessions = function () {
    document.querySelectorAll('#session-checkboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
};

/**
 * Export PDF for multiple selected sessions
 */
window.exportMultipleSessionsPDF = function () {
    const selectedSessions = [];
    document.querySelectorAll('#session-checkboxes input[type="checkbox"]:checked').forEach(cb => {
        selectedSessions.push(cb.dataset.session);
    });

    const selectedTeacher = document.getElementById('teacher-select').value;

    if (selectedSessions.length === 0) {
        return showAlert('សូមជ្រើសរើសម៉ោងសិក្សាយ៉ាងហោចណាស់មួយ', 'warning');
    }

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('sessionSelectionModal'));
    if (modal) modal.hide();

    // Filter students by selected sessions AND teacher
    const activeStudents = Object.values(allStudentsData).filter(s => s.enrollmentStatus !== 'dropout');

    let filtered = activeStudents.filter(s => selectedSessions.includes(s.studyTime));

    // Apply teacher filter if not "all"
    if (selectedTeacher !== 'all') {
        filtered = filtered.filter(s => s.teacherName === selectedTeacher);
    }

    if (filtered.length === 0) {
        return showAlert('មិនមានសិស្សសម្រាប់ម៉ោងនិងគ្រូដែលបានជ្រើសរើសទេ', 'info');
    }

    // Sort by Display ID
    filtered.sort((a, b) => (parseInt(a.displayId) || 0) - (parseInt(b.displayId) || 0));

    // Create title
    let titleBase = selectedSessions.length === 1
        ? `របាយការណ៍បញ្ជីសិស្ស តាមម៉ោងសិក្សា៖ ${selectedSessions[0]}`
        : `របាយការណ៍បញ្ជីសិស្ស តាមម៉ោងសិក្សា (${selectedSessions.length} ម៉ោង)`;

    // Add teacher to title if specific teacher selected
    if (selectedTeacher !== 'all') {
        titleBase += ` (គ្រូ៖ ${selectedTeacher})`;
    }

    const subtitle = selectedSessions.length > 1
        ? `ម៉ោងសិក្សា៖ ${selectedSessions.join(', ')}`
        : '';

    // Generate PDF
    if (window.generateStudentListPDF) {
        window.generateStudentListPDF(filtered, titleBase, subtitle);
    } else {
        console.error("generateStudentListPDF function not found");
        showAlert("Error: PDF generator not found", "danger");
    }
};


