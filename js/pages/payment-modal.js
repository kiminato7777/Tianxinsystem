// =====================================================================
// MODAL បង់ប្រាក់បន្ថែម - V3 FINAL (PREMIUM)
// =====================================================================

// Global Constants
const KHMER_MONTHS_V3 = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];

/**
 * គណនាទឹកប្រាក់ដែលនៅជំពាក់ (Calculate Remaining Amount)
 */
const calculateRemainingAmountV3 = (student) => {
    if (!student) return 0;

    // 1. Base amount from student profile
    const tuition = parseFloat(student.courseFee || student.tuitionFee || student.totalAmount) || 0;
    const admin = parseFloat(student.adminFee) || 0;
    const material = parseFloat(student.materialFee) || 0;
    const discount = parseFloat(student.discount) || 0;
    
    let totalOwed = tuition + admin + material - discount;
    const initial = parseFloat(student.initialPayment) || 0;
    let totalPaid = initial;

    let sumOfInstallments = 0;
    if (initial > 0) {
        sumOfInstallments += initial + (parseFloat(student.balance) || 0);
    }

    // 2. Add extra fees and subtract paid amounts from installments
    if (student.installments) {
        const instList = Array.isArray(student.installments) ? student.installments : Object.values(student.installments);
        instList.forEach(inst => {
            // Standardize: Skip installments that were part of the initial payment
            if (initial > 0 && (inst.stage == 1 || inst.stage == '1' || inst.isInitial)) return;
            
            sumOfInstallments += (parseFloat(inst.amount) || 0);

            // Add extra fees charged in this installment
            totalOwed += (parseFloat(inst.adminServicesFee || inst.adminFee) || 0);
            totalOwed += (parseFloat(inst.materialFee) || 0);
            
            // NOTE: We DO NOT add inst.boardingFee to totalOwed anymore,
            // because boardingFee is now used as 'Debt Gap' (manualDebt), NOT an extra fee.
            
            // Subtract discounts given in this installment
            totalOwed -= (parseFloat(inst.discountDollar) || 0);
            if (parseFloat(inst.discountPercent) > 0) {
                totalOwed -= ((parseFloat(inst.amount) || 0) * parseFloat(inst.discountPercent) / 100);
            }

            // Add to total paid if marked as paid or has a paidAmount
            if (inst.status === 'paid' || inst.paid === true) {
                totalPaid += parseFloat(inst.paidAmount || inst.amount) || 0;
            } else if (inst.status === 'partial' && inst.paidAmount) {
                totalPaid += parseFloat(inst.paidAmount) || 0;
            }
        });
    }
    
    // If tuition is 0, the student is on Pay-As-You-Go, meaning Total Owed is the sum of billed installments
    if (tuition <= 0) {
        totalOwed += sumOfInstallments;
    }
    
    const remaining = totalOwed - totalPaid;
    return Math.max(0, remaining);
};

// -------------------------------------------------------
// Helper Global Functions
// -------------------------------------------------------

window.setPayOff = function (amount, currentMonths) {
    const amtInput = document.getElementById('payAmount');
    if (amtInput) {
        amtInput.value = amount.toFixed(2);
        amtInput.classList.add('animate__animated', 'animate__pulse');
        setTimeout(() => amtInput.classList.remove('animate__animated', 'animate__pulse'), 500);
    }

    const modal = document.getElementById('additionalPaymentModal');
    const studyDuration = parseFloat(modal?.dataset.studyDuration) || 0;
    const monthsInput = document.getElementById('payMonths');
    if (monthsInput) {
        const current = parseFloat(currentMonths) || 0;
        const needed = studyDuration > 0 ? Math.max(0, studyDuration - current) : 0;
        monthsInput.value = needed > 0 ? needed : 1;
    }

    if (window.updateHybridPreview) window.updateHybridPreview();
};

window.setQuickAmount = function (val) {
    const input = document.getElementById('payAmount');
    if (!input) return;
    input.value = val;
    input.classList.add('animate__animated', 'animate__pulse');
    setTimeout(() => input.classList.remove('animate__animated', 'animate__pulse'), 500);
    window.updateHybridPreview();
};

window.switchMethod = function (m) {
    const methodInput = document.getElementById('payMethod');
    if (!methodInput) return;
    methodInput.value = m;
    document.querySelectorAll('.v5-selector-chip').forEach(c => c.classList.remove('active'));
    const target = document.getElementById('m-' + m);
    if (target) target.classList.add('active');
    window.updateHybridPreview();
};

window.updateHybridPreview = function () {
    const amountInput = document.getElementById('payAmount');
    const actualPaidInput = document.getElementById('payActualPaid');
    const boardingEl = document.getElementById('payBoardingFee');
    if (!amountInput || !actualPaidInput) return;

    let amount = parseFloat(amountInput.value) || 0;
    let actualPaid = parseFloat(actualPaidInput.value) || 0;
    
    const adminEl = document.getElementById('payAdminFee');
    const materialEl = document.getElementById('payMaterialFee');
    const dPEl = document.getElementById('payDiscountPercent');
    const dDEl = document.getElementById('payDiscountDollar');
    
    const modal = document.getElementById('additionalPaymentModal');
    const originalOwed = parseFloat(modal?.dataset.remainingAmount) || 0;

    // --- 1. DYNAMIC SYNC ENGINE (PRO-GRADE) ---
    // User Requirement: Tuition - Paid = Boarding (Remaining Gap)
    const active = document.activeElement;

    if (active === actualPaidInput) {
        // Typing in "Paid Amount" -> Calculate Gap (Boarding Fee)
        const gap = amount - actualPaid;
        if (boardingEl) {
            boardingEl.value = (gap > 0) ? gap.toFixed(2) : "";
        }
    } else if (active === boardingEl) {
        // Typing in "Boarding Fee" (Debt Gap) -> Calculate Paid Amount
        const gap = parseFloat(boardingEl.value) || 0;
        actualPaid = amount - gap;
        actualPaidInput.value = (actualPaid >= 0) ? actualPaid.toFixed(2) : "0.00";
    } else if (active === amountInput) {
        // Typing in "Tuition Fee" -> Re-calculate Paid based on existing gap, or sync if no gap
        const gap = parseFloat(boardingEl?.value) || 0;
        if (gap > 0) {
            actualPaid = amount - gap;
            actualPaidInput.value = (actualPaid >= 0) ? actualPaid.toFixed(2) : "0.00";
        } else {
            actualPaid = amount;
            actualPaidInput.value = amount.toFixed(2);
        }
    }

    // Refresh local vars after sync
    actualPaid = parseFloat(actualPaidInput.value) || 0;
    const boarding = boardingEl ? (parseFloat(boardingEl.value) || 0) : 0;
    const admin = adminEl ? (parseFloat(adminEl.value) || 0) : 0;
    const material = materialEl ? (parseFloat(materialEl.value) || 0) : 0;
    const dP = dPEl ? (parseFloat(dPEl.value) || 0) : 0;
    const dD = dDEl ? (parseFloat(dDEl.value) || 0) : 0;

    // --- 2. CALCULATIONS & RECEIPT UPDATES ---
    const adjustments = admin + material; 
    // Note: Boarding is intentionally separate as it's the 'Carryover Debt'
    const discTot = dD + (amount * dP / 100);
    const netToPay = Math.max(0, amount + adjustments - discTot);

    // Centerpiece: PAID AMOUNT (The star of the receipt)
    const totalEl = document.getElementById('summary-total');
    const rielEl = document.getElementById('summary-riel'); 
    if (totalEl) {
        const oldVal = totalEl.innerText;
        totalEl.innerText = actualPaid.toFixed(2);
        
        if (rielEl) {
            rielEl.innerText = Math.round(actualPaid * 4100).toLocaleString() + ' ៛';
        }

        if (oldVal !== actualPaid.toFixed(2)) {
            totalEl.style.color = '#10b981';
            totalEl.classList.add('animate__animated', 'animate__pulse');
            setTimeout(() => totalEl.classList.remove('animate__animated', 'animate__pulse'), 600);
        }
    }

    // Receipt Line Items
    if (document.getElementById('summary-subtotal')) {
        document.getElementById('summary-subtotal').innerText = '$' + amount.toFixed(2);
    }
    const adjSummaryEl = document.getElementById('summary-adjustments');
    if (adjSummaryEl) {
        const netAdj = adjustments - discTot;
        adjSummaryEl.innerText = (netAdj >= 0 ? '+' : '-') + '$' + Math.abs(netAdj).toFixed(2);
        adjSummaryEl.className = netAdj >= 0 ? 't-rose' : 't-emerald fw-bold';
    }

    // Dynamic Remaining Box
    const remainingEl = document.getElementById('summary-remaining-after');
    if (remainingEl) {
        remainingEl.innerText = '$' + boarding.toFixed(2);
        const container = remainingEl.closest('.remaining-footer');
        if (container) {
            const hasNoDebt = boarding <= 0;
            container.style.background = hasNoDebt ? '#f0fdf4' : '#fff1f2';
            container.style.borderColor = hasNoDebt ? '#10b981' : '#fecaca';
            if (!hasNoDebt && active !== boardingEl) {
                remainingEl.classList.add('animate__animated', 'animate__headShake');
                setTimeout(() => remainingEl.classList.remove('animate__animated', 'animate__headShake'), 500);
            }
        }
    }

    // Status Badge Logic
    const badge = document.querySelector('.badge-status-glow');
    if (badge) {
        if (boarding <= 0 && actualPaid > 0) {
            badge.innerHTML = '<i class="fi fi-rr-check-double me-2"></i> FULL PAYMENT READY';
            badge.className = 'badge-status-glow active-full';
        } else if (actualPaid > 0) {
            badge.innerHTML = '<i class="fi fi-rr-hourglass me-2"></i> PARTIAL PAYMENT';
            badge.className = 'badge-status-glow active-partial';
        } else {
            badge.innerHTML = '<i class="fi fi-rr-info me-2"></i> WAITING FOR ENTRY';
            badge.className = 'badge-status-glow';
        }
    }

    window.calculateHybridOutcome();
};

window.calculateHybridOutcome = function () {
    const nextDueInput = document.getElementById('payNextDueDate');

    // If user is currently focused/typing in the date field, we respect their manual entry
    // and don't overwrite it with auto-calculation.
    if (nextDueInput === document.activeElement) return;

    const modal = document.getElementById('additionalPaymentModal');
    const originalNextDue = (modal?.dataset.nextDue || '').trim();
    const prevTotalMonths = parseFloat(modal?.dataset.paymentMonths) || 0;

    const payTotalMonthsInput = document.getElementById('payTotalMonths');
    let currentTotalMonths = parseFloat(payTotalMonthsInput?.value);

    // On first load or if empty, we default to the previous total
    if (isNaN(currentTotalMonths) && payTotalMonthsInput !== document.activeElement) {
        currentTotalMonths = prevTotalMonths;
        if (payTotalMonthsInput) payTotalMonthsInput.value = currentTotalMonths;
    }
    if (isNaN(currentTotalMonths)) currentTotalMonths = prevTotalMonths;

    const _paidMonths = currentTotalMonths - prevTotalMonths;

    // 1. Parsed Base Date (Start from Previous Next Due)
    let baseDate = new Date(NaN); // Initialize as Invalid Date

    // Attempt to parse existing next due date first
    if (originalNextDue && !['មិនមាន', 'N/A', '', 'undefined', 'null'].includes(originalNextDue)) {
        let cleanOriginalDue = originalNextDue.replace(/ថ្ងៃទី/g, '').trim();
        const separators = /[\/\-\s]/;
        const p = cleanOriginalDue.split(separators).map(x => x.trim()).filter(x => x);

        if (p.length >= 3) {
            let day, midx = -1, year;
            if (p[0].length === 4) { // YYYY-MM-DD
                year = parseInt(p[0]);
                if (isNaN(p[1])) {
                    midx = KHMER_MONTHS_V3.indexOf(p[1]);
                    if (midx === -1) {
                        const ENG_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        midx = ENG_SHORT.findIndex(m => p[1].toLowerCase().includes(m.toLowerCase()));
                    }
                } else { midx = parseInt(p[1]) - 1; }
                day = parseInt(p[2]);
            } else { // DD-MM-YYYY
                day = parseInt(p[0]);
                if (isNaN(p[1])) {
                    midx = KHMER_MONTHS_V3.indexOf(p[1]);
                    if (midx === -1) {
                        const ENG_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        midx = ENG_SHORT.findIndex(m => p[1].toLowerCase().includes(m.toLowerCase()));
                    }
                } else { midx = parseInt(p[1]) - 1; }
                year = parseInt(p[2]);
            }
            if (midx >= 0 && midx <= 11 && !isNaN(day) && !isNaN(year)) {
                baseDate = new Date(year, midx, day);
            }
        }
    }

    // Fallback: Use "Payment Date" from the modal if originalNextDue is invalid
    if (isNaN(baseDate.getTime())) {
        let payDateStr = document.getElementById('payDate')?.value || '';
        if (payDateStr) {
            payDateStr = payDateStr.replace(/ថ្ងៃទី/g, '').trim();
            const separators = /[\/\-\s]/;
            const p = payDateStr.split(separators).map(x => x.trim()).filter(x => x);
            if (p.length >= 3) {
                let day, midx = -1, year;
                if (p[0].length === 4) {
                    year = parseInt(p[0]);
                    if (isNaN(p[1])) {
                        midx = KHMER_MONTHS_V3.indexOf(p[1]);
                        if (midx === -1) {
                            const ENG_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            midx = ENG_SHORT.findIndex(m => p[1].toLowerCase().includes(m.toLowerCase()));
                        }
                    } else { midx = parseInt(p[1]) - 1; }
                    day = parseInt(p[2]);
                } else {
                    day = parseInt(p[0]);
                    if (isNaN(p[1])) {
                        midx = KHMER_MONTHS_V3.indexOf(p[1]);
                        if (midx === -1) {
                            const ENG_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            midx = ENG_SHORT.findIndex(m => p[1].toLowerCase().includes(m.toLowerCase()));
                        }
                    } else { midx = parseInt(p[1]) - 1; }
                    year = parseInt(p[2]);
                }
                if (midx >= 0 && midx <= 11) {
                    baseDate = new Date(year, midx, day);
                }
            }
        }
    }

    // Final Fallback: If still invalid, use today
    if (isNaN(baseDate.getTime())) baseDate = new Date();

    // 2. Calculate New Date: Add months accurately
    if (!isNaN(_paidMonths) && _paidMonths !== 0) {
        // use sign math to handle positive/negative correctly without flooring neg to lower integer
        const sign = _paidMonths < 0 ? -1 : 1;
        const absMonths = Math.abs(_paidMonths);
        const fullMonths = Math.floor(absMonths) * sign;
        const fractionalMonth = (absMonths - Math.floor(absMonths)) * sign;

        // Safer way to add months:
        const targetDay = baseDate.getDate();
        baseDate.setDate(1); // To avoid overflow
        baseDate.setMonth(baseDate.getMonth() + fullMonths);
        const lastDayOfNewMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
        baseDate.setDate(Math.min(targetDay, lastDayOfNewMonth));

        // Add/sub days for fractional part (0.5 months = 15 days)
        if (fractionalMonth !== 0) {
            const daysToAdd = Math.round(fractionalMonth * 30);
            baseDate.setDate(baseDate.getDate() + daysToAdd);
        }
    }

    const resDate = `${String(baseDate.getDate()).padStart(2, '0')}/${String(baseDate.getMonth() + 1).padStart(2, '0')}/${baseDate.getFullYear()}`;

    // 3. UI Updates
    const summaryNextDate = document.getElementById('summary-next-date');
    const summaryTotalMonths = document.getElementById('summary-total-months');

    if (summaryNextDate) {
        summaryNextDate.textContent = resDate;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        summaryNextDate.style.color = (baseDate < today) ? '#ef4444' : '#059669';
    }

    if (nextDueInput) {
        nextDueInput.value = resDate;
    }

    if (summaryTotalMonths) {
        summaryTotalMonths.textContent = currentTotalMonths + ' ខែ';
    }
};

// -------------------------------------------------------
// Main Modal Show Function
// -------------------------------------------------------

async function showAdditionalPaymentModal(key) {
    const s = allStudentsData[key];
    if (!s) return;

    let currentUser = 'Admin';
    if (firebase.auth().currentUser) {
        currentUser = firebase.auth().currentUser.displayName || 'Admin';
    }
    if (typeof getCurrentUserName === 'function') {
        const name = await getCurrentUserName();
        if (name) currentUser = name;
    }

    const remainingAmount = calculateRemainingAmountV3(s);
    const studentName = `${s.lastName || ''} ${s.firstName || ''}`.trim();
    const today = new Date();
    const todayKhmer = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const existing = document.getElementById('additionalPaymentModal');
    if (existing) existing.remove();

    const modalHtml = `
    <div class="modal fade" id="additionalPaymentModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static"
         data-remaining-amount="${remainingAmount}"
         data-payment-months="${s.paymentMonths || s.studyDuration || 1}"
         data-study-duration="${s.studyDuration || 1}"
         data-next-due="${s.nextPaymentDate || ''}">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content ultra-v5-premium">
                
                <!-- PREMIUM HEADER -->
                <div class="v5-header p-4">
                    <div class="row align-items-center g-0">
                        <div class="col">
                            <div class="d-flex align-items-center gap-3">
                                <div class="v5-header-icon"><i class="fi fi-rr-wallet fs-3"></i></div>
                                <div>
                                    <h2 class="v5-title mb-0">បង់ប្រាក់បន្ថែម (ADD PAYMENT)</h2>
                                    <div class="v5-subtitle-row">
                                        <span class="v5-status-dot"></span>
                                        <span class="v5-subtitle">Terminal: ${currentUser} • ${todayKhmer}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-auto">
                            <div class="d-flex gap-2">
                                <button type="button" class="btn-v5-util" onclick="if(typeof showEditModal === 'function') { additionalPaymentModal.hide(); setTimeout(() => showEditModal('${s.key}'), 500); }">
                                    <i class="fi fi-rr-edit me-2"></i>កែប្រែ
                                </button>
                                <button type="button" class="btn-v5-close" data-bs-dismiss="modal">
                                    <i class="fi fi-rr-cross"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-body p-0">
                    <div class="row g-0">
                        <!-- LEFT PANEL: DATA ENTRY -->
                        <div class="col-lg-7 p-4 p-xl-5 entry-panel shadow-sm">
                            <form id="additionalPaymentForm">
                                
                                <!-- HIDDEN METADATA -->
                                <input type="hidden" id="payMethod" value="Cash">
                                
                                <input type="hidden" id="payMaterialFee" value="0">

                                <!-- STUDENT BADGE -->
                                <div class="v5-student-badge mb-5 animate__animated animate__fadeIn">
                                    <div class="v5-avatar-box position-relative" style="cursor: pointer;" onclick="document.getElementById('modalProfileUpload_${s.key}').click()" title="ប្តូររូបថត">
                                        ${s.imageUrl ? `<img id="modalProfileImg_${s.key}" src="${s.imageUrl}" class="v5-student-img">` : `<div id="modalProfilePlaceholder_${s.key}" class="v5-placeholder"><i class="fi fi-rr-user"></i></div>`}
                                        <div class="position-absolute bottom-0 end-0 p-1 bg-primary rounded-circle" style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; transform: translate(5px, 5px);">
                                            <i class="fi fi-rr-camera text-white" style="font-size: 8px;"></i>
                                        </div>
                                        <input type="file" id="modalProfileUpload_${s.key}" class="d-none" accept="image/*" onchange="window.updateStudentProfileImage('${s.key}', this, true)">
                                    </div>
                                    <div class="v5-profile-info">
                                        <h4 class="v5-student-name">${studentName}</h4>
                                        <div class="v5-tag-row">
                                            <span class="v5-badge-outline">ID: ${s.displayId || '---'}</span>
                                            <span class="v5-badge-outline">LEVEL: ${s.studyLevel || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div class="v5-debt-focus ms-auto">
                                        <span class="v5-tiny-label">ជំពាក់សរុប (DEBT)</span>
                                        <span id="summary-debt-top" class="v5-debt-val">$${remainingAmount.toFixed(2)}</span>
                                    </div>
                                </div>

                                <!-- PRIMARY ACTION MODULE -->
                                <div class="v5-input-module mb-5">
                                    <div class="row g-4">
                                        <div class="col-md-6">
                                            <div class="v5-group">
                                                <label class="v5-label">តម្លៃសិក្សា (TUITION FEE)</label>
                                                <div class="v5-field-box">
                                                    <span class="v5-field-cur">$</span>
                                                    <input type="number" step="0.01" id="payAmount" class="v5-input" value="${remainingAmount > 0 ? remainingAmount : ''}" oninput="window.updateHybridPreview()" placeholder="0.00">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="v5-group active-emerald">
                                                <label class="v5-label text-emerald">ប្រាក់ដែលបានបង់ (PAID AMOUNT)</label>
                                                <div class="v5-field-box emerald-variant">
                                                    <span class="v5-field-cur emerald-text">$</span>
                                                    <input type="number" step="0.01" id="payActualPaid" class="v5-input emerald-text fw-bold" value="${remainingAmount > 0 ? remainingAmount : ''}" oninput="window.updateHybridPreview()" placeholder="0.00">
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="v5-shortcuts mt-3">
                                        <button type="button" class="btn-v5-pill" onclick="window.setQuickAmount(10)">$10</button>
                                        <button type="button" class="btn-v5-pill" onclick="window.setQuickAmount(20)">$20</button>
                                        <button type="button" class="btn-v5-pill" onclick="window.setQuickAmount(50)">$50</button>
                                        <button type="button" class="btn-v5-action-grad ms-auto" onclick="const r=${remainingAmount}; document.getElementById('payAmount').value=r; document.getElementById('payActualPaid').value=r; document.getElementById('payBoardingFee').value=''; window.updateHybridPreview();">
                                            <i class="fi fi-rr-check-double me-2"></i>បង់ពេញ (FULL PAID)
                                        </button>
                                    </div>
                                </div>

                                <!-- TRANSACTION GRID -->
                                <div class="row g-4 mb-5">
                                    <div class="col-md-6">
                                        <div class="v5-group">
                                            <label class="v5-label">កាលបរិច្ឆេទ (DATE)</label>
                                            <div class="v5-field-box soft-bg">
                                                <i class="fi fi-rr-calendar icon-v5"></i>
                                                <input type="text" id="payDate" value="${todayKhmer}" class="v5-input ps-5" oninput="window.updateHybridPreview()">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="v5-group">
                                            <label class="v5-label">មធ្យោបាយ (METHOD)</label>
                                            <div class="v5-selector">
                                                <div class="v5-selector-chip active" id="m-Cash" onclick="window.switchMethod('Cash')">💵 Cash</div>
                                                <div class="v5-selector-chip" id="m-ABA" onclick="window.switchMethod('ABA')">🏦 ABA</div>
                                                <div class="v5-selector-chip" id="m-Wing" onclick="window.switchMethod('Wing')">💸 Wing</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-12">
                                        <div class="v5-group">
                                            <label class="v5-label">អ្នកទទួលប្រាក់ (RECEIVER)</label>
                                            <div class="v5-field-box soft-bg" style="height: auto; padding: 0;">
                                                <i class="fi fi-rr-user-check icon-v5"></i>
                                                ${getReceiverSelectHtml(currentUser, '', 'v5-input ps-5', 'payReceiver', 'style="height: 56px; cursor: pointer; appearance: auto; -webkit-appearance: auto;"')}
                                            </div>
                                        </div>
                                    </div>

                                    <!-- NEW: PAYMENT STATUS & POSTPONED DATE -->
                                    <div class="col-md-6 mt-3">
                                        <div class="v5-group">
                                            <label class="v5-label">ស្ថានភាព (STATUS)</label>
                                            <div class="v5-field-box soft-bg" style="height: auto; padding: 4px; border: 2px solid #e2e8f0;">
                                                <select class="form-select border-0 shadow-none fw-bold" id="payStatus" style="height: 48px; background: transparent;" onchange="const pd = document.getElementById('postponedDateContainer'); if(this.value === 'Delay' || this.value === 'Installment') { pd.style.display = 'block'; } else { pd.style.display = 'none'; const inputs = pd.querySelectorAll('input'); inputs.forEach(i => i.value = ''); }">
                                                    <option value="Paid" selected="">បង់រួច (Paid)</option>
                                                    <option value="Pending">មិនទាន់បង់ (Pending)</option>
                                                    <option value="Installment">នៅជំពាក់ (Installment)</option>
                                                    <option value="Delay">ពន្យា (Delay)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-12 mt-3" id="postponedDateContainer" style="display: none;">
                                        <div class="v5-group animate__animated animate__fadeIn p-3 rounded-4 border-start border-4 border-warning bg-warning bg-opacity-5">
                                            <div class="row g-3">
                                                <div class="col-md-6">
                                                    <label class="v5-label text-warning mb-2">ថ្ងៃសន្យាបង់ (POSTPONED DATE)</label>
                                                    <div class="v5-field-box border-warning bg-white shadow-sm">
                                                        <i class="fi fi-rr-calendar-clock icon-v5 text-warning"></i>
                                                        <input type="text" id="payPostponedDate" class="v5-input ps-5 t-warning" placeholder="DD/MM/YYYY">
                                                    </div>
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="v5-label text-warning mb-2">មូលហេតុ (REASON)</label>
                                                    <div class="v5-field-box border-warning bg-white shadow-sm">
                                                        <i class="fi fi-rr-info icon-v5 text-warning"></i>
                                                        <input type="text" id="payPostponedReason" class="v5-input ps-5 t-warning" placeholder="បន្ថែមមូលហេតុ...">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 📂 RECEIPT ATTACHMENT SECTION (Premium Dynamic Upload) -->
                                <div class="v5-group mt-4 mb-5 p-4 rounded-4 bg-light border-0 shadow-sm animate__animated animate__fadeInUp">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <label class="v5-label mb-0"><i class="fi fi-rr-clip me-2 text-primary"></i>ឯកសារភ្ជាប់ (RECEIPT ATTACHMENT)</label>
                                        <button type="button" class="btn-v5-pill small px-3 text-primary" onclick="document.getElementById('receiptUpload').click()">
                                            <i class="fi fi-rr-upload me-2"></i>បន្ថែមរូបភាព
                                        </button>
                                        <input type="file" id="receiptUpload" class="d-none" accept="image/*" onchange="window.handleReceiptUpload(this)">
                                    </div>
                                    <div id="receiptPreviewContainer" class="d-flex flex-wrap gap-2">
                                        <!-- Dynamic Preview -->
                                        <div class="v5-upload-placeholder w-100 border-2 border-dashed border-secondary opacity-50 rounded-4 p-4 text-center">
                                            <i class="fi fi-rr-picture fs-1 d-block mb-2"></i>
                                            <p class="small mb-0">មិនទាន់បានភ្ជាប់វិក្កយបត្រ (No Receipt Attached)</p>
                                        </div>
                                    </div>
                                    <input type="hidden" id="payReceiptUrl" value="">
                                </div>

                                <!-- METRIC CARD -->
                                <div class="v5-metric-grid p-4 mb-4">
                                    <div class="row g-4 align-items-center">
                                        <div class="col-md-6">
                                            <span class="v5-micro-label">ថ្ងៃផុតកំណត់ថ្មី (NEW NEXT DUE)</span>
                                            <div class="d-flex align-items-center gap-3 mt-1 text-emerald fw-bold">
                                                <i class="fi fi-rr-calendar-clock fs-4"></i>
                                                <input type="text" id="payNextDueDate" class="v5-ghost-input t-emerald" placeholder="Select duration...">
                                            </div>
                                        </div>
                                        <div class="col-md-6 v5-divider-left ps-4">
                                            <span class="v5-micro-label">សរុបខែសិក្សា (TOTAL MONTHS)</span>
                                            <div class="d-flex align-items-center gap-3 mt-1 text-blue fw-bold">
                                                <i class="fi fi-rr-time-forward fs-4"></i>
                                                <input type="text" id="payTotalMonths" class="v5-ghost-input t-blue" oninput="window.updateHybridPreview()">
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- ADVANCED COLLAPSE -->
                                <div class="v5-accordion animate__animated animate__fadeInUp">
                                    <div class="v5-acc-header" data-bs-toggle="collapse" href="#v5Fees">
                                        <span class="fw-bold"><i class="fi fi-rr-settings-sliders me-2"></i>សេវា និង ការបញ្ចុះតម្លៃ (FEES & ADJUSTMENTS)</span>
                                        <i class="fi fi-rr-angle-small-down"></i>
                                    </div>
                                    <div class="collapse show" id="v5Fees">
                                        <div class="v5-acc-body p-4">
                                            <div class="grid-4-v5">
                                                <div class="v5-mini-field">
                                                    <label>បញ្ចុះ %</label>
                                                    <input type="number" id="payDiscountPercent" placeholder="0" oninput="window.updateHybridPreview()">
                                                </div>
                                                <div class="v5-mini-field">
                                                    <label>បញ្ចុះ $</label>
                                                    <input type="number" id="payDiscountDollar" placeholder="0.00" oninput="window.updateHybridPreview()">
                                                </div>
                                                <div class="v5-mini-field">
                                                    <label>សេវាផ្សេងៗ</label>
                                                    <input type="number" id="payAdminFee" placeholder="0.00" oninput="window.updateHybridPreview()">
                                                </div>
                                                <div class="v5-mini-field highlight-rose">
                                                    <label>ជំណាក់នៅសល់ (Debt)</label>
                                                    <input type="number" id="payBoardingFee" class="t-rose fw-black" placeholder="0.00" oninput="window.updateHybridPreview()">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="mt-4">
                                    <label class="v5-label">សម្គាល់ (REMARK)</label>
                                    <textarea id="payNote" class="v5-textarea" placeholder="បញ្ចូលព័ត៌មានបន្ថែម..."></textarea>
                                </div>
                            </form>
                        </div>

                        <!-- RIGHT PANEL: PREMIUM RECEIPT -->
                        <div class="col-lg-5 summary-panel p-4 p-xl-5">
                            <div class="v5-receipt-sticky">
                                <div class="v5-receipt shadow-premium animate__animated animate__fadeInRight">
                                    <div class="v5-receipt-header py-5 px-4">
                                        <div class="v5-receipt-seal">
                                            <i class="fi fi-rr-star text-white"></i>
                                        </div>
                                        <h3 class="v5-receipt-brand">TIAN XIN INTERNATIONAL</h3>
                                        <div class="v5-receipt-divider"></div>
                                    </div>
                                    
                                    <div class="v5-receipt-body">
                                        <!-- MAIN CENTERPIECE -->
                                        <div class="v5-centerpiece py-4">
                                            <span class="v5-center-label">ប្រាក់បង់សរុប (TOTAL PAID)</span>
                                            <div class="v5-center-amount">
                                                <span class="v5-center-cur">$</span>
                                                <span id="summary-total" class="v5-center-val">0.00</span>
                                            </div>
                                            <div class="v5-center-riel" id="summary-riel">0 ៛</div>
                                            <div class="mt-3">
                                                <span class="badge-status-glow"><i class="fi fi-rr-info me-2"></i>WAITING FOR ENTRY</span>
                                            </div>
                                        </div>

                                        <!-- DETAILS -->
                                        <div class="v5-details p-4">
                                            <div class="v5-receipt-row">
                                                <span>តម្លៃសិក្សា (Tuition)</span>
                                                <span id="summary-subtotal">$0.00</span>
                                            </div>
                                            <div class="v5-receipt-row">
                                                <span>សេវា & បញ្ចុះតម្លៃ</span>
                                                <span id="summary-adjustments" class="t-emerald">$0.00</span>
                                            </div>
                                            <div class="v5-perforated-dashed my-3"></div>
                                            
                                            <div class="v5-outcome-card mb-4">
                                                <div class="d-flex align-items-center gap-3">
                                                    <i class="fi fi-rr-calendar-check t-emerald fs-4"></i>
                                                    <div>
                                                        <span class="v5-micro-label">ថ្ងៃផុតកំណត់ថ្មី</span>
                                                        <span id="summary-next-date" class="fw-bold d-block">--- --- ---</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- REMAINING BOX -->
                                            <div class="remaining-footer p-3 rounded-4 shadow-sm border border-dashed border-danger border-opacity-20 mt-4">
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <span class="v5-tiny-label t-rose">ជំពាក់នៅសល់ (REMAINING)</span>
                                                        <span id="summary-remaining-after" class="h4 mb-0 fw-black t-rose">$0.00</span>
                                                    </div>
                                                    <div class="v5-remaining-icon"><i class="fi fi-rr-clock-three"></i></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="v5-receipt-zig-zag"></div>
                                </div>

                                <!-- ACTIONS -->
                                <div class="v5-actions mt-5">
                                    <div class="glass-toggle p-3 mb-4 rounded-4 border d-flex justify-content-between align-items-center">
                                        <div class="d-flex align-items-center gap-3">
                                            <div class="v5-mini-icon"><i class="fi fi-rr-print"></i></div>
                                            <span class="fw-bold small text-muted">បោះពុម្ពស្វ័យប្រវត្តិ</span>
                                        </div>
                                        <div class="form-check form-switch custom-switch-v5">
                                            <input class="form-check-input" type="checkbox" id="autoPrintToggle" checked>
                                        </div>
                                    </div>
                                    
                                    <div class="d-flex flex-column gap-3">
                                        <button type="button" class="btn-v5-primary w-100 animate__animated animate__pulse animate__infinite animate__slow" onclick="saveAdditionalPayment('${key}')">
                                            <i class="fi fi-rr-disk me-2"></i>រក្សាទុកទិន្នន័យ (SAVE NOW)
                                        </button>
                                        <button type="button" class="btn-v5-secondary w-100" data-bs-dismiss="modal">
                                            <i class="fi fi-rr-undo me-2"></i>បិទ (CLOSE)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Kantumruy+Pro:wght@400;500;600;700&display=swap');

                    :root {
                        --v5-accent: #0f172a;
                        --v5-primary: #2563eb;
                        --v5-emerald: #10b981;
                        --v5-rose: #f43f5e;
                        --v5-blue: #3b82f6;
                        --v5-bg: #ffffff;
                        --v5-surface: #f8fafc;
                        --v5-border: #e2e8f0;
                        --v5-text-main: #334155;
                        --v5-text-muted: #64748b;
                        --v5-radius: 20px;
                        --v5-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    }

                    #additionalPaymentModal { font-family: 'Plus Jakarta Sans', 'Kantumruy Pro', sans-serif; color: var(--v5-text-main); }
                    
                    .ultra-v5-premium { 
                        border-radius: var(--v5-radius); 
                        background: #fff;
                        border: none;
                        box-shadow: 0 40px 100px -20px rgba(15, 23, 42, 0.3);
                        overflow: hidden;
                    }

                    /* Header */
                    .v5-header { 
                        background: #fff; 
                        border-bottom: 1px solid var(--v5-border);
                        position: relative;
                        padding: 24px 40px !important;
                    }
                    .v5-header-icon { 
                        width: 54px; height: 54px; 
                        background: #eff6ff; color: var(--v5-primary);
                        border-radius: 14px;
                        display: flex; align-items: center; justify-content: center;
                    }
                    .v5-title { font-weight: 800; font-size: 1.5rem; color: var(--v5-accent); }
                    .v5-subtitle-row { d-flex: align-items-center; gap: 8px; margin-top: 4px; }
                    .v5-subtitle { font-size: 0.8rem; color: var(--v5-text-muted); font-weight: 600; }
                    .v5-status-dot { 
                        width: 8px; height: 8px; background: var(--v5-emerald); 
                        border-radius: 50%; display: inline-block;
                        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
                        animation: v5pulse 2s infinite;
                    }
                    @keyframes v5pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

                    .btn-v5-util { 
                        background: var(--v5-surface); border: 1px solid var(--v5-border); 
                        padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 0.85rem;
                        color: var(--v5-accent); transition: 0.2s;
                    }
                    .btn-v5-util:hover { background: #e2e8f0; }
                    .btn-v5-close { 
                        background: #fff; border: 1px solid var(--v5-border); 
                        width: 40px; height: 40px; border-radius: 10px; color: var(--v5-text-muted);
                        display: flex; align-items: center; justify-content: center; transition: 0.2s;
                    }
                    .btn-v5-close:hover { background: var(--v5-rose); color: #fff; border-color: var(--v5-rose); }

                    /* Panels */
                    .entry-panel { background: #fff; position: relative; }
                    .summary-panel { background: var(--v5-surface); border-left: 1px solid var(--v5-border); }

                    /* Student Badge */
                    .v5-student-badge { 
                        background: var(--v5-surface); padding: 20px; border-radius: 16px; 
                        border: 1px solid var(--v5-border); display: flex; align-items: center; gap: 20px;
                    }
                    .v5-avatar-box { 
                        width: 64px; height: 64px; border-radius: 16px; overflow: hidden; 
                        border: 2px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                    }
                    .v5-student-img { width: 100%; height: 100%; object-fit: cover; }
                    .v5-placeholder { width: 100%; height: 100%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 1.5rem; }
                    .v5-student-name { font-weight: 800; font-size: 1.25rem; color: var(--v5-accent); margin-bottom: 6px; }
                    .v5-tag-row { display: flex; gap: 8px; }
                    .v5-badge-outline { background: #fff; border: 1px solid var(--v5-border); padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; color: var(--v5-text-muted); }
                    .v5-tiny-label { display: block; font-size: 0.65rem; color: var(--v5-text-muted); font-weight: 700; text-transform: uppercase; }
                    .v5-debt-val { display: block; font-size: 1.4rem; font-weight: 900; color: var(--v5-rose); }

                    /* Inputs */
                    .v5-label { display: block; font-size: 0.8rem; font-weight: 700; color: var(--v5-text-muted); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
                    .v5-field-box { 
                        position: relative; background: var(--v5-surface); border: 2px solid var(--v5-border); 
                        border-radius: 12px; height: 56px; transition: 0.3s; display: flex; align-items: center;
                    }
                    .v5-field-box:focus-within { border-color: var(--v5-primary); background: #fff; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
                    .v5-field-cur { font-size: 1.4rem; font-weight: 700; margin-left:16px; color: #94a3b8; margin-right: 8px; }
                    .v5-input { 
                        width: 100%; height: 100%; border: none; background: transparent; 
                        font-weight: 800; font-size: 1.5rem; color: var(--v5-accent); outline: none; padding-right: 16px;
                    }
                    .emerald-variant { border-color: #d1fae5; background: #f0fdf4 !important; }
                    .emerald-text { color: var(--v5-emerald) !important; }
                    .t-emerald { color: var(--v5-emerald) !important; }
                    .t-blue { color: var(--v5-blue) !important; }
                    .t-rose { color: var(--v5-rose) !important; }

                    .v5-shortcuts { display: flex; gap: 10px; flex-wrap: wrap; }
                    .btn-v5-pill { 
                        padding: 6px 14px; border-radius: 8px; border: 1px solid var(--v5-border); 
                        background: #fff; font-weight: 700; font-size: 0.8rem; color: var(--v5-text-muted); transition: 0.2s;
                    }
                    .btn-v5-pill:hover { border-color: var(--v5-primary); color: var(--v5-primary); }
                    .btn-v5-action-grad { 
                        background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; 
                        padding: 8px 20px; border-radius: 10px; font-weight: 700; font-size: 0.85rem;
                    }

                    .v5-selector { display: flex; gap: 10px; background: var(--v5-surface); padding: 6px; border-radius: 12px; border: 1px solid var(--v5-border); width: 100%; }
                    .v5-selector-chip { flex: 1; text-align: center; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; transition: 0.2s; }
                    .v5-selector-chip.active { background: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.05); color: var(--v5-primary); }

                    .v5-metric-grid { background: var(--v5-surface); border-radius: 16px; border: 1px solid var(--v5-border); border-left: 5px solid var(--v5-emerald); }
                    .v5-micro-label { display: block; font-size: 0.65rem; color: var(--v5-text-muted); font-weight: 700; text-transform: uppercase; }
                    .v5-divider-left { border-left: 1px solid var(--v5-border); }

                    .v5-field-box.soft-bg { background: #f1f5f9; border-color: transparent; }
                    .icon-v5 { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 1.1rem; }
                    .ps-5 { padding-left: 52px !important; }

                    .v5-ghost-input { border: none; background: transparent; width: 100%; outline: none; font-size: 1.1rem; font-weight: 700; color: inherit; }
                    .v5-ghost-input::placeholder { color: #cbd5e1; }

                    .v5-accordion { border: 1px solid var(--v5-border); border-radius: 14px; overflow: hidden; background: #fff; }
                    .v5-acc-header { padding: 16px 20px; background: var(--v5-surface); cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
                    .grid-4-v5 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
                    .v5-mini-field label { display: block; font-size: 0.6rem; font-weight: 700; color: var(--v5-text-muted); margin-bottom: 6px; text-transform: uppercase; }
                    .v5-mini-field input { width: 100%; border: 1px solid var(--v5-border); border-radius: 8px; padding: 6px 12px; font-weight: 700; font-size: 0.9rem; outline: none; transition: 0.2s; }
                    .v5-mini-field input:focus { border-color: var(--v5-primary); }
                    .highlight-rose input { border-color: #fecaca; background: #fff1f2; }

                    .v5-textarea { 
                        width: 100%; height: 80px; border: 2px solid var(--v5-border); border-radius: 14px; padding: 16px; 
                        outline: none; font-size: 0.9rem; transition: 0.3s;
                    }
                    .v5-textarea:focus { border-color: var(--v5-primary); }

                    /* Receipt */
                    .v5-receipt { background: #fff; border-radius: 20px; overflow: hidden; position: relative; }
                    .v5-receipt-header { background: #1e293b; color: #fff; text-align: center; position: relative; }
                    .v5-receipt-seal { 
                        width: 50px; height: 50px; background: var(--v5-emerald); border-radius: 50%;
                        display: flex; align-items: center; justify-content: center; position: absolute;
                        top: -25px; left: 50%; transform: translateX(-50%); border: 5px solid var(--v5-surface);
                    }
                    .v5-receipt-brand { font-weight: 900; letter-spacing: 2px; font-size: 0.9rem; }
                    .v5-receipt-divider { height: 2px; background: rgba(255,255,255,0.1); width: 40px; margin: 15px auto 0; }
                    
                    .v5-centerpiece { text-align: center; border-bottom: 1px dashed var(--v5-border); }
                    .v5-center-label { display: block; font-size: 0.75rem; font-weight: 700; color: var(--v5-text-muted); margin-bottom: 4px; }
                    .v5-center-amount { display: flex; align-items: center; justify-content: center; gap: 4px; }
                    .v5-center-cur { font-size: 1.5rem; font-weight: 700; color: var(--v5-text-muted); }
                    .v5-center-val { font-size: 3rem; font-weight: 900; color: #1e293b; letter-spacing: -1px; }
                    .v5-center-riel { font-weight: 800; font-size: 1.1rem; color: #64748b; font-family: 'Kantumruy Pro'; }
                    
                    .badge-status-glow { 
                        background: #f1f5f9; color: #475569; padding: 6px 14px; border-radius: 20px; 
                        font-size: 0.65rem; font-weight: 800; border: 1px solid #e2e8f0;
                        transition: 0.3s;
                    }
                    .badge-status-glow.active-full { background: #dcfce7; color: #166534; border-color: #86efac; box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }
                    .badge-status-glow.active-partial { background: #eff6ff; color: #1e40af; border-color: #bfdbfe; }

                    .v5-receipt-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.9rem; font-weight: 600; color: #475569; }
                    .v5-receipt-row span:last-child { color: var(--v5-accent); font-weight: 800; }
                    .v5-perforated-dashed { border-top: 1px dashed var(--v5-border); }
                    
                    .v5-outcome-card { background: var(--v5-surface); padding: 16px; border-radius: 12px; }
                    .v5-remaining-icon { width: 44px; height: 44px; background: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--v5-rose); font-size: 1.2rem; }
                    
                    .v5-mini-icon { width: 32px; height: 32px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
                    .btn-v5-primary { 
                        background: var(--v5-primary); color: #fff; border: none; height: 56px; 
                        border-radius: 14px; font-weight: 800; font-size: 1.05rem; transition: 0.3s;
                        box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
                    }
                    .btn-v5-primary:hover { background: #1d4ed8; transform: translateY(-2px); box-shadow: 0 15px 30px rgba(37, 99, 235, 0.3); }
                    .btn-v5-secondary { 
                        background: #fff; color: var(--v5-text-main); border: 2px solid var(--v5-border); 
                        height: 52px; border-radius: 14px; font-weight: 700; transition: 0.2s;
                    }
                    .btn-v5-secondary:hover { background: var(--v5-surface); border-color: #cbd5e1; }

                    @media (max-width: 991px) {
                        .entry-panel, .summary-panel { padding: 24px !important; }
                        .summary-panel { border-left: none; border-top: 1px solid var(--v5-border); }
                    }
                </style>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    additionalPaymentModal = new bootstrap.Modal(document.getElementById('additionalPaymentModal'));
    additionalPaymentModal.show();

    // Event Listeners for Ultra V5 IDs
    const nextDueInput = document.getElementById('payNextDueDate');
    if (nextDueInput) {
        nextDueInput.addEventListener('input', function() {
            const sumDate = document.getElementById('summary-next-date');
            if (sumDate) sumDate.innerText = this.value || '--- --- ---';
        });
    }

    const payActualPaidInput = document.getElementById('payActualPaid');
    if (payActualPaidInput) {
        payActualPaidInput.addEventListener('input', () => window.updateHybridPreview());
    }

    const boardingInput = document.getElementById('payBoardingFee');
    if (boardingInput) {
        boardingInput.addEventListener('input', () => window.updateHybridPreview());
    }

    const amountInput = document.getElementById('payAmount');
    if (amountInput) {
        amountInput.addEventListener('input', () => window.updateHybridPreview());
    }

    // Initialize UI Focus
    setTimeout(() => {
        const inp = document.getElementById('payActualPaid') || document.getElementById('payAmount');
        if (inp) {
            inp.focus();
            inp.select();
        }
        window.updateHybridPreview();
    }, 500);

    // Cleanup
    document.getElementById('additionalPaymentModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
    });
}

// -------------------------------------------------------
// Save Payment Function
// -------------------------------------------------------

function saveAdditionalPayment(key) {
    const s = allStudentsData[key];
    if (!s) return;

    const dateInput = document.getElementById('payDate')?.value || '';
    const amount = parseFloat(document.getElementById('payAmount')?.value) || 0;
    const actualPaidInput = document.getElementById('payActualPaid');
    const actualPaid = actualPaidInput ? parseFloat(actualPaidInput.value) || 0 : amount;
    const receiver = document.getElementById('payReceiver')?.value || 'System';
    const note = document.getElementById('payNote')?.value || '';
    const method = document.getElementById('payMethod')?.value || 'Cash';
    const nextDueDate = document.getElementById('payNextDueDate')?.value || '';
    const totalMonths = document.getElementById('payTotalMonths')?.value || '';
    const payStatus = document.getElementById('payStatus')?.value || 'Paid';
    const postponedDate = document.getElementById('payPostponedDate')?.value || '';
    const postponedReason = document.getElementById('payPostponedReason')?.value || '';
    const receiptUrl = document.getElementById('payReceiptUrl')?.value || '';

    // Calculate the paid months (months delta) based on user's manual TOTAL MONTHS input
    const modal = document.getElementById('additionalPaymentModal');
    const prevTotalMonths = parseFloat(modal?.dataset.paymentMonths) || 0;
    const currentTotalMonths = parseFloat(totalMonths);
    const months = !isNaN(currentTotalMonths) ? (currentTotalMonths - prevTotalMonths) : 0;
    const discountPercent = parseFloat(document.getElementById('payDiscountPercent')?.value) || 0;
    const discountDollar = parseFloat(document.getElementById('payDiscountDollar')?.value) || 0;
    const adminFee = parseFloat(document.getElementById('payAdminFee')?.value) || 0;
    const materialFee = parseFloat(document.getElementById('payMaterialFee')?.value) || 0;
    const boardingFee = parseFloat(document.getElementById('payBoardingFee')?.value) || 0;
    const stageInput = document.getElementById('payStage')?.value || '';
    const autoPrint = document.getElementById('autoPrintToggle')?.checked || false;

    if (amount <= 0 && adminFee <= 0 && materialFee <= 0 && boardingFee <= 0) {
        return showAlert('សូមបញ្ចូលទឹកប្រាក់ត្រឹមត្រូវ', 'warning');
    }

    let currentCount = 0;
    let maxStage = 0;
    if (parseFloat(s.initialPayment) > 0) {
        currentCount = 1;
        maxStage = 1;
    }
    
    if (s.installments) {
        const instList = Array.isArray(s.installments) ? s.installments : Object.values(s.installments);
        instList.forEach(inst => {
            const stg = parseInt(inst.stage) || 0;
            if (stg > maxStage) maxStage = stg;
        });
        currentCount += instList.length;
    }
    // Safety: use maxStage + 1 if it's larger than currentCount
    const nextStage = stageInput || Math.max(currentCount + 1, maxStage + 1);

    const periodStart = s.nextPaymentDate || s.startDate || 'N/A';
    const periodEnd = nextDueDate || 'N/A';
    const paymentPeriod = `${periodStart} ដល់ ${periodEnd}`;

    let forMonth = '';
    if (periodStart !== 'N/A' && (periodStart.includes('-') || periodStart.includes(' '))) {
        const parts = periodStart.split(/[- ]/);
        if (parts.length >= 2) forMonth = parts[1];
    } else if (periodStart !== 'N/A' && periodStart.includes('/')) {
        const parts = periodStart.split('/');
        if (parts.length === 3) {
            const mIndex = parseInt(parts[1]) - 1;
            if (KHMER_MONTHS_V3[mIndex]) forMonth = KHMER_MONTHS_V3[mIndex];
        }
    }

    const newInstallment = {
        stage: nextStage.toString(),
        date: dateInput,
        amount: amount,
        paidAmount: actualPaid,
        paid: actualPaid >= amount,
        status: (payStatus !== 'Paid' && payStatus !== 'Pending') ? payStatus.toLowerCase() : (actualPaid >= amount ? 'paid' : 'partial'),
        postponedDate: postponedDate,
        postponedReason: postponedReason,
        receiver: receiver,
        paymentMethod: method,
        note: note,
        months: months,
        period: paymentPeriod,
        forMonth: forMonth,
        discountPercent: discountPercent,
        discountDollar: discountDollar,
        adminServicesFee: adminFee,
        materialFee: materialFee,
        boardingFee: boardingFee,
        receiptUrl: receiptUrl
    };

    let installments = [];
    if (s.installments) {
        installments = Array.isArray(s.installments)
            ? [...s.installments]
            : Object.values(s.installments);
    }
    const newIndex = installments.length;
    installments.push(newInstallment);

    // Also add to general attachments if receipt exists
    let studentAttachments = s.attachments ? (Array.isArray(s.attachments) ? [...s.attachments] : Object.values(s.attachments)) : [];
    if (receiptUrl) studentAttachments.push(receiptUrl);

    const currentRem = calculateRemainingAmountV3(s);
    // Include current modal fees/discounts not yet in DB
    const modalTotalEffect = adminFee + materialFee + boardingFee - (discountDollar + (amount * discountPercent / 100));
    const newRemaining = Math.max(0, currentRem + modalTotalEffect - actualPaid);

    const updateData = {
        installments: installments,
        updatedAt: new Date().toISOString()
    };
    if (nextDueDate) updateData.nextPaymentDate = nextDueDate;
    if (postponedDate) updateData.nextPaymentDate = postponedDate;
    if (totalMonths) updateData.paymentMonths = totalMonths;
    if (receiptUrl) updateData.attachments = studentAttachments;

    showLoading(true);
    studentsRef.child(key).update(updateData)
        .then(async () => {
            if (allStudentsData[key]) {
                Object.assign(allStudentsData[key], updateData);
                // Unified recalculation (100% dynamic)
                if (typeof syncStudentFinancials === 'function') await syncStudentFinancials(key);
                
                if (typeof renderFilteredTable === 'function') renderFilteredTable();
                if (typeof viewStudentDetails === 'function') viewStudentDetails(key);
            }

            showAlert('បង់ប្រាក់បន្ថែមជោគជ័យ', 'success');

            try {
                const telMsg = `
<b>💰 ការបង់ប្រាក់បន្ថែម (Additional Payment)</b>
--------------------------------
<b>អត្តលេខ (ID):</b> ${s.displayId || 'N/A'}
<b>ឈ្មោះ (Name):</b> ${s.lastName || ''} ${s.firstName || ''}
<b>កាលបរិច្ឆេទ (Date):</b> ${newInstallment.date}
<b>ទឹកប្រាក់ (Amount):</b> $${newInstallment.amount}
<b>ប្រាក់ជំណាក់ (Boarding):</b> $${newInstallment.boardingFee || 0}
<b>រយៈពេល (Duration):</b> ${newInstallment.months} ខែ
<b>ដំណើរកាល (Stage):</b> ${newInstallment.stage}
<b>អ្នកទទួល (Receiver):</b> ${newInstallment.receiver}
--------------------------------
<i>System Notification</i>`;
                if (typeof sendTelegramNotification === 'function') sendTelegramNotification(telMsg);
            } catch (err) { console.error('Telegram Error:', err); }

            if (additionalPaymentModal) additionalPaymentModal.hide();

            if (autoPrint && typeof printPaymentReceipt === 'function') {
                setTimeout(() => printPaymentReceipt(key, newIndex), 500);
            }
        })
        .catch(e => {
            console.error(e);
            showAlert('មានបញ្ហាក្នុងការរក្សាទុក', 'danger');
        })
        .finally(() => showLoading(false));
}

/**
 * បោះពុម្ពវិក្កយបត្រ (Receipt)
 */
window.printPaymentReceipt = function (studentKey, index) {
    const s = allStudentsData[studentKey];
    if (!s) return;

    const inst = index === 'initial' ? { amount: s.initialPayment, date: s.startDate, receiver: s.receiver } : s.installments[index];
    if (!inst) return;

    const win = window.open('', '_blank');
    win.document.write(`
    <html>
    <head>
        <title>Receipt - ${s.lastName} ${s.firstName}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;700&display=swap');
            body { font-family: 'Kantumruy Pro', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .receipt-box { max-width: 600px; margin: auto; border: 2px solid #eee; padding: 40px; border-radius: 20px; }
            .header { text-align: center; border-bottom: 2px solid #f6f6f6; margin-bottom: 30px; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #059669; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 15px; }
            .label { color: #666; }
            .value { font-weight: bold; }
            .footer { margin-top: 50px; text-align: center; font-size: 14px; color: #999; border-top: 1px dashed #eee; padding-top: 20px; }
            .total { font-size: 22px; color: #059669; margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; }
        </style>
    </head>
    <body onload="window.print()">
        <div class="receipt-box">
            <div class="header">
                <div class="logo">សាលាអន្តរជាតិ ធាន ស៊ីន</div>
                <div style="font-size: 14px; color: #666;">TIAN XIN INTERNATIONAL SCHOOL</div>
                <h2 style="margin-top: 20px;">វិក្កយបត្របង់ប្រាក់</h2>
            </div>
            <div class="row">
                <span class="label">ឈ្មោះសិស្ស (Student):</span>
                <span class="value">${s.lastName} ${s.firstName}</span>
            </div>
            <div class="row">
                <span class="label">ID សិស្ស:</span>
                <span class="value">${s.displayId || 'N/A'}</span>
            </div>
            <div class="row">
                <span class="label">ទឹកប្រាក់សរុប (Amount):</span>
                <span class="value">$${parseFloat(inst.amount).toFixed(2)}</span>
            </div>
            ${inst.adminServicesFee ? `
            <div class="row">
                <span class="label">សេវារដ្ឋបាល (Admin Fee):</span>
                <span class="value">$${parseFloat(inst.adminServicesFee).toFixed(2)}</span>
            </div>` : ''}
            ${inst.materialFee ? `
            <div class="row">
                <span class="label">ថ្លៃសម្ភារៈ (Material Fee):</span>
                <span class="value">$${parseFloat(inst.materialFee).toFixed(2)}</span>
            </div>` : ''}
            ${inst.boardingFee ? `
            <div class="row">
                <span class="label text-warning" style="color: #d97706;">ប្រាក់ជំណាក់ (Boarding Fee):</span>
                <span class="value text-warning" style="color: #d97706;">$${parseFloat(inst.boardingFee).toFixed(2)}</span>
            </div>` : ''}
            ${inst.discountDollar ? `
            <div class="row">
                <span class="label">បញ្ចុះតម្លៃ (Discount $):</span>
                <span class="value">-$${parseFloat(inst.discountDollar).toFixed(2)}</span>
            </div>` : ''}
            ${inst.discountPercent ? `
            <div class="row">
                <span class="label">បញ្ចុះតម្លៃ (Discount %):</span>
                <span class="value">-$${(parseFloat(inst.amount) * parseFloat(inst.discountPercent) / 100).toFixed(2)}</span>
            </div>` : ''}
            <div class="row">
                <span class="label">កាលបរិច្ឆេទ (Date):</span>
                <span class="value">${inst.date}</span>
            </div>
            <div class="row">
                <span class="label">វិធីសាស្ត្របង់ (Method):</span>
                <span class="value">${inst.paymentMethod || 'Cash'}</span>
            </div>
            <div class="row">
                <span class="label">អ្នកទទួលប្រាក់ (Receiver):</span>
                <span class="value">${inst.receiver || 'Admin'}</span>
            </div>
            <div class="row total">
                <span class="label">សរុបទាំងអស់ (Grand Total):</span>
                <span class="value">$${(parseFloat(inst.amount) + (parseFloat(inst.adminServicesFee) || 0) + (parseFloat(inst.materialFee) || 0) - (parseFloat(inst.discountDollar) || 0) - (parseFloat(inst.amount) * (parseFloat(inst.discountPercent) || 0) / 100)).toFixed(2)}</span>
            </div>
            <div class="row" style="margin-top: 10px; border-bottom: 2px dashed #eee; padding-bottom: 10px;">
                <span class="label" style="color: #059669; font-weight: bold;">បានបង់ពិតប្រាកដ (Actual Paid):</span>
                <span class="value" style="color: #059669; font-weight: bold; font-size: 18px;">$${(parseFloat(inst.paidAmount) || parseFloat(inst.actualPaid) || parseFloat(inst.amount)).toFixed(2)}</span>
            </div>
            <div class="footer">
                <p>សូមអរគុណសម្រាប់ការបង់ប្រាក់!</p>
                <p style="font-size: 12px;">អាសយដ្ឋាន៖ រាជធានីភ្នំពេញ</p>
            </div>
        </div>
    </body>
    </html>
    `);
    win.document.close();
};

// Export to window scope
// ==========================================
// RECEIPT ATTACHMENT LOGIC
// ==========================================

window.handleReceiptUpload = async function (input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    // 2MB Limit
    if (file.size > 2097152) {
        if (typeof showAlert === 'function') showAlert('ទំហំរូបភាពលើសពី 2MB! សូមជ្រើសរើសរូបភាពតូចជាងនេះ។', 'danger');
        else alert('ទំហំរូបភាពលើសពី 2MB!');
        input.value = '';
        return;
    }

    const container = document.getElementById('receiptPreviewContainer');
    if (!container) return;

    try {
        container.classList.add('position-relative');
        container.innerHTML = `
            <div class="w-100 p-4 text-center">
                <div class="r2-mini-status">
                    <div class="r2-mini-spinner"></div>
                    <span>កំពុងបង្ហោះរូបភាព...</span>
                </div>
                <span class="spinner-border text-primary spinner-border-sm me-2"></span>
            </div>`;

        // Upload to R2
        const url = await uploadImageToR2(file);
        if (!url) throw new Error("Upload failed");

        // Update hidden field
        const hiddenField = document.getElementById('payReceiptUrl');
        if (hiddenField) hiddenField.value = url;

        // Show preview
        container.innerHTML = `
            <div class="position-relative animate__animated animate__zoomIn mt-2" style="width: 100%; height: 200px; border-radius: 12px; overflow: hidden; border: 2px solid #e2e8f0;">
                <img src="${url}" class="w-100 h-100 object-fit-cover">
                <button type="button" class="btn btn-danger btn-sm rounded-circle position-absolute top-0 end-0 m-2 shadow" onclick="window.removeReceipt()" title="លុបវិញ">
                    <i class="fi fi-rr-cross-small"></i>
                </button>
            </div>`;

    } catch (error) {
        console.error("Receipt Upload Error:", error);
        container.innerHTML = `
            <div class="v5-upload-placeholder w-100 border-2 border-dashed border-danger text-danger rounded-4 p-4 text-center">
                <i class="fi fi-rr-cross-circle fs-1 d-block mb-2"></i>
                <p class="small mb-0">បរាជ័យក្នុងការបង្ហោះរូបភាព: ${error.message}</p>
            </div>`;
    }
};

window.removeReceipt = function () {
    if (!confirm('តើអ្នកពិតជាចង់លុបរូបភាពវិក្កយបត្រនេះមែនទេ?')) return;

    const hiddenField = document.getElementById('payReceiptUrl');
    if (hiddenField) hiddenField.value = '';

    const container = document.getElementById('receiptPreviewContainer');
    if (container) {
        container.innerHTML = `
            <div class="v5-upload-placeholder w-100 border-2 border-dashed border-secondary opacity-50 rounded-4 p-4 text-center">
                <i class="fi fi-rr-picture fs-1 d-block mb-2"></i>
                <p class="small mb-0">មិនទាន់បានភ្ជាប់វិក្កយបត្រ (No Receipt Attached)</p>
            </div>`;
    }
    const input = document.getElementById('receiptUpload');
    if (input) input.value = '';
};

window.showAdditionalPaymentModal = showAdditionalPaymentModal;
window.saveAdditionalPayment = saveAdditionalPayment;


