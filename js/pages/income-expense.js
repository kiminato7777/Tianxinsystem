// Firebase References
const database = window.database || window.db || firebase.database();
const transactionsRef = database.ref('transactions');
const studentsRef = database.ref('students');
const salesRef = database.ref('sales'); // Inventory Sales

// Dynamic Configuration
let EXCHANGE_RATE_USD_TO_KHR = 4150;
let EXCHANGE_RATE_INCOME = 4150;
let EXCHANGE_RATE_EXPENSE = 4150;

// State Variables
let transactionsData = [];
let studentsData = {};
let salesData = {};
// Pagination State
let currentPage = 1;
const itemsPerPage = 20;

let currentFilter = 'all'; // all, income, expense

// Helper to format YYYY-MM-DD using local time
const toLocalISO = (date) => {
    const offset = date.getTimezoneOffset();
    date = new Date(date.getTime() - (offset * 60 * 1000));
    return date.toISOString().split('T')[0];
};

// Helper: Convert number to Khmer numerals
const toKhmerNumber = (num) => {
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return num.toString().split('').map(digit => khmerDigits[digit] || digit).join('');
};

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    // Initial Setup
    setupEventListeners();
    initRealtimeListeners();
    loadDynamicSettings();

    // Set default date to today in Modal (using local time)
    if (document.getElementById('transDate')) {
        document.getElementById('transDate').value = toLocalISO(new Date());
    }

    // Initialization for Report Date Range (Default: This Month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    if (document.getElementById('reportStartDate')) {
        document.getElementById('reportStartDate').value = toLocalISO(firstDay);
        document.getElementById('reportEndDate').value = toLocalISO(today);
    }

    // Date/Time Display
    function updateDateTime() {
        const now = new Date();
        const dateStr = formatDate(now);
        if (document.getElementById('currentDateDisplay')) document.getElementById('currentDateDisplay').textContent = dateStr;
        if (document.getElementById('currentTimeDisplay')) document.getElementById('currentTimeDisplay').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();
    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Alt + N for New Transaction
        if (e.altKey && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            const type = currentFilter === 'all' ? 'income' : currentFilter;
            openTransactionModal(type);
        }
        // Escape to clear search
        if (e.key === 'Escape' && document.activeElement.id === 'searchDescription') {
            const searchInput = document.getElementById('searchDescription');
            searchInput.value = '';
            fetchTransactions();
        }
    });

    // Modal Theme Switcher
    const radioIncome = document.getElementById('typeIncome');
    const radioExpense = document.getElementById('typeExpense');
    const modalContent = document.querySelector('#transactionModal .modal-content');

    if (radioIncome && radioExpense) {
        radioIncome.addEventListener('change', () => {
            document.getElementById('transactionModal').classList.add('modal-income');
            document.getElementById('transactionModal').classList.remove('modal-expense');
            document.getElementById('modalTitle').innerHTML = '<i class="fi fi-rr-plus-circle me-2"></i>បន្ថែមចំណូលថ្មី (Add Income)';
        });
        radioExpense.addEventListener('change', () => {
            document.getElementById('transactionModal').classList.remove('modal-income');
            document.getElementById('transactionModal').classList.add('modal-expense');
            document.getElementById('modalTitle').innerHTML = '<i class="fi fi-rr-minus-circle me-2"></i>បន្ថែមចំណាយថ្មី (Add Expense)';
        });
    }
});

// ==========================================
// CORE FUNCTIONS
// ==========================================

// ==========================================
// REAL-TIME LISTENERS (DYNAMIC 100%)
// ==========================================

function initRealtimeListeners() {
    showLoading(true);

    // 1. Transactions Listener
    transactionsRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        processAllData(data, studentsData, salesData);
    });

    // 2. Students Listener
    studentsRef.on('value', (snapshot) => {
        studentsData = snapshot.val() || {};
        // Re-process with latest student info
        transactionsRef.once('value').then(snap => {
            processAllData(snap.val() || {}, studentsData, salesData);
        });
    });

    // 3. Sales Listener (Optional)
    if (salesRef) {
        salesRef.on('value', (snapshot) => {
            salesData = snapshot.val() || {};
            transactionsRef.once('value').then(snap => {
                processAllData(snap.val() || {}, studentsData, salesData);
            });
        });
    }
}

function loadDynamicSettings() {
    // Load Exchange Rate
    database.ref('settings/exchangeRate').on('value', (snap) => {
        const val = snap.val();
        if (val) {
            EXCHANGE_RATE_USD_TO_KHR = parseFloat(val) || 4150;
            EXCHANGE_RATE_INCOME = EXCHANGE_RATE_USD_TO_KHR;
            EXCHANGE_RATE_EXPENSE = EXCHANGE_RATE_USD_TO_KHR;
            renderTable(); // Re-render totals with new rate
        }
    });

    // Load Income Categories
    database.ref('settings/incomeCategories').on('value', (snap) => {
        const cats = snap.val();
        if (cats) {
            const list = document.getElementById('incomeCategories');
            if (list) {
                list.innerHTML = '';
                Object.values(cats).forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c;
                    list.appendChild(opt);
                });
            }
        }
    });

    // Load Expense Categories
    database.ref('settings/expenseCategories').on('value', (snap) => {
        const cats = snap.val();
        if (cats) {
            const list = document.getElementById('expenseCategories');
            if (list) {
                list.innerHTML = '';
                Object.values(cats).forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c;
                    list.appendChild(opt);
                });
            }
        }
    });

    // Load Users for Receivers (Dynamic Dropdown via Central Utility)
    document.addEventListener('receiversUpdated', (event) => {
        const select = document.getElementById('transReceiver');
        if (select) {
            const currentVal = select.value;
            populateReceiverSelect(select, currentVal);
        }

        // Dynamic Reporter Datalist & Pills
        const reporterDatalist = document.getElementById('reporterDatalist');
        const quickReporterList = document.getElementById('quickReporterList');
        
        if (window.SYSTEM_RECEIVERS) {
            const defaultRoles = ['Admin', 'រដ្ឋបាល', 'គណនេយ្យ', '索达សុខ ដា'];
            const reporters = [...new Set([...defaultRoles, ...window.SYSTEM_RECEIVERS])];
            
            if (reporterDatalist) {
                reporterDatalist.innerHTML = '';
                reporters.forEach(name => {
                    const opt = document.createElement('option');
                    opt.value = name;
                    reporterDatalist.appendChild(opt);
                });
            }

            if (quickReporterList) {
                quickReporterList.innerHTML = '';
                reporters.slice(0, 8).forEach(name => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'btn btn-sm btn-light border bg-white rounded-pill px-3 py-1 text-muted shadow-sm fw-bold';
                    btn.style.fontSize = '0.75rem';
                    btn.style.transition = 'all 0.2s';
                    btn.innerHTML = `<i class="fi fi-rr-circle-user me-1 text-primary"></i> ${name}`;
                    
                    // Hover effects
                    btn.onmouseover = () => {
                        btn.classList.add('border-primary', 'text-primary');
                        btn.classList.remove('text-muted', 'border');
                    };
                    btn.onmouseout = () => {
                        btn.classList.remove('border-primary', 'text-primary');
                        btn.classList.add('text-muted', 'border');
                    };
                    
                    btn.onclick = () => { 
                        if (typeof selectReporter === 'function') {
                            selectReporter(name);
                        } else {
                            const input = document.getElementById('customReporterName');
                            if (input) input.value = name;
                        }
                    };
                    quickReporterList.appendChild(btn);
                });
            }
        }
    });
}

function processAllData(manualTrans, students, sales) {
    try {
        transactionsData = [];

        // Helper to normalize any date — handles strings, numbers (timestamps), null
        const normalizeDate = (dateStr) => {
            // Handle null / undefined / empty
            if (dateStr === null || dateStr === undefined || dateStr === '') {
                return toLocalISO(new Date());
            }
            // Handle Firebase numeric timestamps (milliseconds)
            if (typeof dateStr === 'number') {
                return toLocalISO(new Date(dateStr));
            }
            // Convert to string if it's something else (object, etc.)
            dateStr = String(dateStr);
            // Already YYYY-MM-DD
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
            // Check for ISO with time (e.g. "2026-03-09T07:00:00.000Z")
            if (dateStr.includes('T')) {
                try { return new Date(dateStr).toISOString().split('T')[0]; } catch (e) { }
            }
            // DD/MM/YYYY or DD-MM-YYYY
            const parts = dateStr.split(/[-/]/);
            if (parts.length === 3 && parts[2].length === 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            // Last resort: parse then convert
            try {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) return toLocalISO(d);
            } catch (e) { }
            return toLocalISO(new Date());
        };

        // Process Manual Transactions Only
        if (manualTrans) {
            Object.keys(manualTrans).forEach(key => {
                const item = manualTrans[key];
                transactionsData.push({
                    id: key,
                    sourceType: 'manual',
                    ...item,
                    date: normalizeDate(item.date),
                    amount: parseFloat(item.amount) || 0,
                    payer: item.payer || (item.type === 'income' ? 'សិស្ស/អាណាព្យាបាល' : 'សាលា'),
                    receiver: item.receiver || (item.type === 'income' ? 'សាលា' : 'បុគ្គលិក/អ្នកលក់')
                });
            });
        }

        // Note: Automated student registration and installment syncing has been disabled 
        // per user request to keep this report focused 100% on manual entries.


        // Populate Student Lists for selection in modal
        updateStudentLists(students);

        // Sort Highest Date First
        transactionsData.sort((a, b) => new Date(b.date) - new Date(a.date));

        renderTable();
        showLoading(false);
    } catch (e) {
        console.error("Process Error:", e);
        showLoading(false);
    }
}

function updateStudentLists(students) {
    const studentList = document.getElementById('studentList');
    const recentButtons = document.getElementById('recentStudentButtons');
    if (!studentList) return;

    studentList.innerHTML = '';
    if (recentButtons) recentButtons.innerHTML = '';

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const names = new Set();
    const recent = [];

    Object.values(students).forEach(s => {
        if (!s) return;
        const name = `${s.lastName || ''} ${s.firstName || ''}`.trim();
        if (!name) return;
        names.add(name);

        const regDate = new Date(s.startDate || s.createdAt);
        if (regDate >= sevenDaysAgo) recent.push({ name, date: regDate });
    });

    Array.from(names).sort().forEach(n => {
        const opt = document.createElement('option');
        opt.value = n;
        studentList.appendChild(opt);
    });

    if (recentButtons) {
        recent.sort((a, b) => b.date - a.date).slice(0, 10).forEach(r => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-sm btn-light border py-1 px-3 me-1 mb-1 shadow-sm rounded-pill text-primary fw-bold';
            btn.style.fontSize = '0.7rem';
            btn.innerHTML = `<i class="fi fi-rr-user-add me-1"></i> ${r.name}`;
            btn.onclick = () => selectRecentStudent(r.name);
            recentButtons.appendChild(btn);
        });
        if (recent.length === 0) recentButtons.innerHTML = '<span class="text-muted small italic">មិនមានសិស្សចុះឈ្មោះក្នុង ៧ថ្ងៃចុងក្រោយ</span>';
    }
}

// Keep the old function for compatibility but it's now internal to processAllData
function fetchTransactions() {
}

// Helper for Array check
function isArray(what) {
    return Object.prototype.toString.call(what) === '[object Array]';
}

function updateStats(data) {
    let totalUSD_Inc = 0; let totalUSD_Exp = 0;
    let totalKHR_Inc = 0; let totalKHR_Exp = 0;

    let abaUSD_Inc = 0; let abaKHR_Inc = 0;
    let abaUSD_Exp = 0; let abaKHR_Exp = 0;

    let cashUSD_Inc = 0; let cashKHR_Inc = 0;
    let cashUSD_Exp = 0; let cashKHR_Exp = 0;

    let countInc = 0; let countExp = 0;

    data.forEach(item => {
        const method = item.paymentMethod || 'cash';
        const isInc = item.type === 'income';

        let i_cashUSD = parseFloat(item.cashUSD) || 0;
        let i_cashKHR = parseFloat(item.cashKHR) || 0;
        let i_abaUSD = parseFloat(item.abaUSD) || 0;
        let i_abaKHR = parseFloat(item.abaKHR) || 0;

        // Fallback for older data
        if (item.cashUSD === undefined && item.abaUSD === undefined) {
            const amtUSD = item.amountUSD !== undefined ? item.amountUSD : (item.originalCurrency !== 'KHR' ? (item.amount || item.originalAmount || 0) : 0);
            const amtKHR = item.amountKHR !== undefined ? item.amountKHR : (item.originalCurrency === 'KHR' ? item.originalAmount : 0);
            if (method === 'aba') { i_abaUSD = amtUSD; i_abaKHR = amtKHR; }
            else { i_cashUSD = amtUSD; i_cashKHR = amtKHR; }
        }

        if (isInc) {
            countInc++;
            totalUSD_Inc += (i_cashUSD + i_abaUSD);
            totalKHR_Inc += (i_cashKHR + i_abaKHR);
            abaUSD_Inc += i_abaUSD; abaKHR_Inc += i_abaKHR;
            cashUSD_Inc += i_cashUSD; cashKHR_Inc += i_cashKHR;
        } else {
            countExp++;
            totalUSD_Exp += (i_cashUSD + i_abaUSD);
            totalKHR_Exp += (i_cashKHR + i_abaKHR);
            abaUSD_Exp += i_abaUSD; abaKHR_Exp += i_abaKHR;
            cashUSD_Exp += i_cashUSD; cashKHR_Exp += i_cashKHR;
        }
    });

    // Net Balances
    const netCashUSD = cashUSD_Inc - cashUSD_Exp;
    const netCashKHR = cashKHR_Inc - cashKHR_Exp;
    const netAbaUSD = abaUSD_Inc - abaUSD_Exp;
    const netAbaKHR = abaKHR_Inc - abaKHR_Exp;

    // UI Updates
    const setT = (id, val, prefix = '', suffix = '') => {
        const el = document.getElementById(id);
        if (el) el.textContent = prefix + val + suffix;
    };

    // Separate Summaries (Net)
    setT('statCashUSD', netCashUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '$');
    setT('statCashKHR', netCashKHR.toLocaleString(), '', ' ៛');
    setT('statAbaUSD', netAbaUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '$');
    setT('statAbaKHR', netAbaKHR.toLocaleString(), '', ' ៛');

    // NEW: Dashboard Card Detailed Breakdowns
    setT('statIncCashDetail', `$${cashUSD_Inc.toLocaleString()} | ${cashKHR_Inc.toLocaleString()} ៛`);
    setT('statIncAbaDetail', `$${abaUSD_Inc.toLocaleString()} | ${abaKHR_Inc.toLocaleString()} ៛`);

    setT('statExpCashDetail', `$${cashUSD_Exp.toLocaleString()} | ${cashKHR_Exp.toLocaleString()} ៛`);
    setT('statExpAbaDetail', `$${abaUSD_Exp.toLocaleString()} | ${abaKHR_Exp.toLocaleString()} ៛`);

    setT('statNetCashDetail', `$${netCashUSD.toLocaleString()} | ${netCashKHR.toLocaleString()} ៛`);
    setT('statNetAbaDetail', `$${netAbaUSD.toLocaleString()} | ${netAbaKHR.toLocaleString()} ៛`);

    // NEW: ABA Gross Components (for detailed breakdown)
    setT('statAbaIncUSD', abaUSD_Inc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '$');
    setT('statAbaIncKHR', abaKHR_Inc.toLocaleString(), '', ' ៛');
    setT('statAbaExpUSD', abaUSD_Exp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '$');
    setT('statAbaExpKHR', abaKHR_Exp.toLocaleString(), '', ' ៛');

    // Consolidated Totals
    const totalIncConsolidatedUSD = totalUSD_Inc + (totalKHR_Inc / EXCHANGE_RATE_INCOME);
    const totalExpConsolidatedUSD = totalUSD_Exp + (totalKHR_Exp / EXCHANGE_RATE_EXPENSE);
    const netBalanceUSD = totalIncConsolidatedUSD - totalExpConsolidatedUSD;
    const netBalanceKHR = (totalIncConsolidatedUSD * EXCHANGE_RATE_INCOME) - (totalExpConsolidatedUSD * EXCHANGE_RATE_EXPENSE);

    // Badges
    setT('badgeAll', data.length);
    setT('badgeIncome', countInc);
    setT('badgeExpense', countExp);

    // Cards
    setT('statTotalIncome', totalUSD_Inc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '$');
    setT('statTotalIncomeKHR', totalKHR_Inc.toLocaleString(), '', ' ៛');
    setT('statTotalExpense', totalUSD_Exp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '$');
    setT('statTotalExpenseKHR', totalKHR_Exp.toLocaleString(), '', ' ៛');

    const balEl = document.getElementById('statNetBalance');
    if (balEl) {
        balEl.textContent = '$' + netBalanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        balEl.style.color = netBalanceUSD >= 0 ? '#2563eb' : '#dc2626';
    }
    setT('statNetBalanceKHR', netBalanceKHR.toLocaleString(), '', ' ៛');

    // Progress Bar
    const totalVolume = totalIncConsolidatedUSD + totalExpConsolidatedUSD;
    const incPct = totalVolume > 0 ? (totalIncConsolidatedUSD / totalVolume * 100).toFixed(0) : 0;
    const expPct = totalVolume > 0 ? (totalExpConsolidatedUSD / totalVolume * 100).toFixed(0) : 0;
    const progBar = document.getElementById('balanceProgressBar');
    if (progBar) progBar.style.width = incPct + '%';
    setT('balanceIncomePct', incPct, 'INC: ', '%');
    setT('balanceExpensePct', expPct, 'EXP: ', '%');
}

// Quick Date Filtering Logic
function setQuickDate(period) {
    const today = new Date();
    // Always create fresh Date objects to avoid mutation bugs
    let start = new Date(today);
    let end = new Date(today);

    if (period === 'today') {
        // start and end are already copies of today
    } else if (period === 'week') {
        // getDay(): 0=Sun,1=Mon,...,6=Sat
        // We want Monday as start of week
        const dayOfWeek = today.getDay(); // 0=Sun
        // Days since Monday: if Sun(0) → 6 days ago, Mon(1) → 0 days ago, etc.
        const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start = new Date(today);
        start.setDate(today.getDate() - daysSinceMonday);
    } else if (period === 'month') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (period === 'all') {
        start = new Date(2020, 0, 1);
    }

    document.getElementById('reportStartDate').value = toLocalISO(start);
    document.getElementById('reportEndDate').value = toLocalISO(end);

    // Update Pills UI
    document.querySelectorAll('.quick-filter-pill').forEach(pill => {
        pill.classList.remove('active');
        if (pill.innerText.includes(period === 'today' ? 'ថ្ងៃនេះ' : period === 'week' ? 'សប្តាហ៍នេះ' : period === 'month' ? 'ខែនេះ' : 'ទាំងអស់')) {
            pill.classList.add('active');
        }
    });

    renderTable(true);
}

function applyTypeFilter(type) {
    currentFilter = type;

    // Update UI Buttons
    const buttons = {
        'all': document.getElementById('filterAll'),
        'income': document.getElementById('filterIncome'),
        'expense': document.getElementById('filterExpense')
    };

    // Reset All
    if (buttons.all) {
        buttons.all.className = 'btn btn-sm btn-outline-secondary rounded-pill-start filter-btn';
    }
    if (buttons.income) {
        buttons.income.className = 'btn btn-sm btn-outline-success filter-btn';
    }
    if (buttons.expense) {
        buttons.expense.className = 'btn btn-sm btn-outline-danger rounded-pill-end filter-btn';
    }

    // Set Active
    if (type === 'all' && buttons.all) {
        buttons.all.className = 'btn btn-sm btn-secondary rounded-pill-start filter-btn active';
    } else if (type === 'income' && buttons.income) {
        buttons.income.className = 'btn btn-sm btn-success filter-btn active';
    } else if (type === 'expense' && buttons.expense) {
        buttons.expense.className = 'btn btn-sm btn-danger rounded-pill-end filter-btn active';
    }

    renderTable(true);
}

function renderTable(resetPage = false) {
    const tableBody = document.getElementById('transactionsTableBody');
    const searchText = document.getElementById('searchDescription') ? document.getElementById('searchDescription').value.toLowerCase() : '';

    if (resetPage) currentPage = 1;

    tableBody.innerHTML = '';

    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    // 1. Filter by DATE & SEARCH first (Base Data for Stats)
    // Normalize helper: ensure YYYY-MM-DD format for safe string comparison
    const normDateStr = (d) => {
        if (!d) return '';
        const parts = d.split(/[-/]/);
        if (parts.length === 3 && parts[0].length === 4) {
            // Already YYYY-MM-DD or YYYY-M-D → pad
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
        // Try parse as Date
        const dt = new Date(d);
        if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
        return d;
    };
    let baseFilteredData = transactionsData.filter(item => {
        // Date Range — compare normalized YYYY-MM-DD strings safely
        const itemDate = normDateStr(item.date);
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;

        // Search
        if (searchText) {
            const searchStr = `${item.category} ${item.description} ${item.payer} ${item.receiver} ${item.recorder}`.toLowerCase();
            if (!searchStr.includes(searchText)) return false;
        }
        return true;
    });

    // 2. Update Stats based on this base filtered data (So stats show totals for the PERIOD, regardless of Income/Expense tab)
    updateStats(baseFilteredData);

    // 3. Apply Type Filter specific for the Table View
    let tableData = baseFilteredData.filter(item => {
        if (currentFilter !== 'all' && item.type !== currentFilter) return false;
        return true;
    });

    // Pagination Logic
    const totalPages = Math.ceil(tableData.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, tableData.length);
    const paginatedData = tableData.slice(startIndex, endIndex);

    // Update Counts (Table View Counts) dynamically
    const displayStart = tableData.length === 0 ? 0 : startIndex + 1;

    if (document.getElementById('displayStartCount')) document.getElementById('displayStartCount').textContent = displayStart;
    if (document.getElementById('displayEndCount')) document.getElementById('displayEndCount').textContent = endIndex;
    if (document.getElementById('totalCount')) document.getElementById('totalCount').textContent = tableData.length;

    if (tableData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center py-5 text-muted">
                    <div class="spinner-border text-pink-primary mb-3" role="status" style="width: 3rem; height: 3rem; display:none;"></div> <!-- hidden spinner -->
                    <i class="fi fi-rr-inbox fa-3x mb-3 opacity-25" style="font-size: 3rem;"></i>
                    <p>មិនមានទិន្នន័យ (No Data Found)</p>
                </td>
            </tr>
        `;
        document.getElementById('paginationControls').innerHTML = '';
        return;
    }

    // Render Rows
    paginatedData.forEach((item, index) => {
        // Calculate true index for "No." column
        const trueIndex = startIndex + index;

        const row = document.createElement('tr');
        row.className = 'align-middle'; // Ensure alignment

        // Type Badge with Icon
        let typeBadge;
        if (item.type === 'income') {
            typeBadge = `<span class="badge rounded-pill bg-success bg-opacity-10 text-success px-3 py-2 fw-bold"><i class="fi fi-rr-arrow-trend-up me-1"></i>ចំណូល</span>`;
        } else {
            typeBadge = `<span class="badge rounded-pill bg-danger bg-opacity-10 text-danger px-3 py-2 fw-bold"><i class="fi fi-rr-arrow-trend-down me-1"></i>ចំណាយ</span>`;
        }

        // Amount Styling
        const amountClass = item.type === 'income' ? 'text-success' : 'text-danger';
        const amountPrefix = item.type === 'income' ? '+' : '-';
        const payerName = item.payer || '<span class="text-muted">-</span>';
        const receiverName = item.receiver || '<span class="text-muted">-</span>';

        const actionButtons = `
            <div class="d-flex justify-content-center gap-2">
                <button class="btn btn-sm btn-light text-info shadow-sm rounded-circle" style="width: 32px; height: 32px;" onclick="viewTransaction('${item.id}', ${trueIndex + 1})" title="មើលលម្អិត">
                    <i class="fi fi-rr-eye"></i>
                </button>
                <button class="btn btn-sm btn-light text-primary shadow-sm rounded-circle" style="width: 32px; height: 32px;" onclick="editTransaction('${item.id}')" title="កែប្រែ">
                    <i class="fi fi-rr-edit"></i>
                </button>
                <button class="btn btn-sm btn-light text-danger shadow-sm rounded-circle" style="width: 32px; height: 32px;" onclick="deleteTransaction('${item.id}')" title="លុប">
                    <i class="fi fi-rr-trash"></i>
                </button>
            </div>
        `;

        row.innerHTML = `
            <td class="text-center text-muted fw-bold small">${trueIndex + 1}</td>
            <td class="text-center text-dark fw-bold" style="font-family: 'Kantumruy Pro', sans-serif;">
                ${formatDate(item.date)}
            </td>
            <td class="text-center">${typeBadge}</td>
            <td class="text-center">
                ${(item.cashUSD + item.cashKHR > 0 && item.abaUSD + item.abaKHR > 0)
                ? `<span class="badge rounded-pill bg-secondary bg-opacity-10 text-secondary px-2 py-1 fw-bold" style="font-size: 0.7rem;">
                    <i class="fi fi-rr-layers me-1"></i> ABA + សាច់ប្រាក់
                   </span>`
                : `<span class="badge rounded-pill ${item.paymentMethod === 'aba' ? 'bg-info bg-opacity-10 text-info' : 'bg-primary bg-opacity-10 text-primary'} px-2 py-1 fw-bold" style="font-size: 0.7rem;">
                    <i class="fi ${item.paymentMethod === 'aba' ? 'fi-rr-bank' : 'fi-rr-money-bill-wave'} me-1"></i>
                    ${item.paymentMethod === 'aba' ? 'ABA' : 'សាច់ប្រាក់'}
                   </span>`
            }
            </td>
            <td class="text-start">
                <div class="fw-bold text-dark text-truncate" style="max-width: 150px;" title="${item.category}">${item.category}</div>
            </td>
            <td class="text-start text-secondary small">${payerName}</td>
            <td class="text-start text-secondary small">${receiverName}</td>
            <td class="text-start">
                <div class="text-muted small text-wrap description-text" style="max-width: 300px; line-height: 1.4;">
                    ${item.description || '-'}
                </div>
            </td>
            <td class="text-end">
                <span class="${amountClass} fw-bold fs-6">
                    ${(item.amountUSD > 0 || (item.originalCurrency !== 'KHR' && item.originalAmount > 0))
                ? `${amountPrefix}${(item.amountUSD !== undefined ? item.amountUSD : (item.amount || item.originalAmount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '-'}
                </span>
            </td>
            <td class="text-end pe-4">
                <span class="${amountClass} fw-bold fs-6">
                    ${(item.amountKHR > 0 || (item.originalCurrency === 'KHR' && item.originalAmount > 0))
                ? `${amountPrefix}${(item.amountKHR !== undefined ? item.amountKHR : item.originalAmount).toLocaleString()} ៛`
                : '-'}
                </span>
            </td>
            <td class="text-center">
                ${actionButtons}
            </td>
        `;
        tableBody.appendChild(row);
    });

    renderPaginationControls(totalPages);

    // Update Table Footer Totals
    const tableFooter = document.getElementById('transactionsTableFooter');
    if (tableFooter) {
        // Calculate separate footing for USD and KHR entries
        let totalUSDIncome = 0;
        let totalUSDExpense = 0;
        let totalKHRIncome = 0;
        let totalKHRExpense = 0;

        baseFilteredData.forEach(item => {
            if (item.originalCurrency === 'KHR') {
                if (item.type === 'income') totalKHRIncome += (item.originalAmount || (parseFloat(item.amount) * EXCHANGE_RATE_INCOME));
                else totalKHRExpense += (item.originalAmount || (parseFloat(item.amount) * EXCHANGE_RATE_EXPENSE));
            } else {
                const amt = item.originalAmount || parseFloat(item.amount) || 0;
                if (item.type === 'income') totalUSDIncome += amt;
                else totalUSDExpense += amt;
            }
        });

        // Calculate total Volume in both currencies
        const totalIncUSD = totalUSDIncome + (totalKHRIncome / EXCHANGE_RATE_INCOME);
        const totalIncKHR = (totalUSDIncome * EXCHANGE_RATE_INCOME) + totalKHRIncome;

        const totalExpUSD = totalUSDExpense + (totalKHRExpense / EXCHANGE_RATE_EXPENSE);
        const totalExpKHR = (totalUSDExpense * EXCHANGE_RATE_EXPENSE) + totalKHRExpense;

        const finalBalUSD = totalIncUSD - totalExpUSD;
        const finalBalKHR = totalIncKHR - totalExpKHR;

        const balClass = finalBalUSD >= 0 ? 'text-primary' : 'text-danger';

        // Remove or empty table footer from UI to keep it clean (Totals are in the cards above)
        tableFooter.innerHTML = '';
    }
}

function renderPaginationControls(totalPages) {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) return;

    // Helper to add a page item
    const addPageItem = (page, label, active = false, disabled = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`;
        
        const content = disabled && label === '...' 
            ? `<span class="page-link">${label}</span>`
            : `<a class="page-link" href="javascript:void(0)" onclick="changePage(${page})">${label}</a>`;
            
        li.innerHTML = content;
        paginationContainer.appendChild(li);
    };

    // 1. Previous Button
    addPageItem(currentPage - 1, '<i class="fi fi-rr-angle-left"></i>', false, currentPage === 1);

    // 2. Dynamic Page Numbers
    // Always show First Page
    if (totalPages > 5 && currentPage > 3) {
        addPageItem(1, '1');
        addPageItem(null, '...', false, true);
    }

    // Determine range
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    // Adjust if near beginning or end
    if (currentPage <= 3) {
        end = Math.min(totalPages, 5);
    }
    if (currentPage > totalPages - 3) {
        start = Math.max(1, totalPages - 4);
    }

    for (let i = start; i <= end; i++) {
        addPageItem(i, i, i === currentPage);
    }

    // Always show Last Page
    if (totalPages > 5 && currentPage < totalPages - 2) {
        addPageItem(null, '...', false, true);
        addPageItem(totalPages, totalPages);
    }

    // 3. Next Button
    addPageItem(currentPage + 1, '<i class="fi fi-rr-angle-right"></i>', false, currentPage === totalPages);
}

function changePage(page) {
    if (page < 1) return;
    currentPage = page;
    renderTable(false); // Do not reset page, use the new one
}

// ==========================================
// EVENT HANDLERS
// ==========================================

function setupEventListeners() {
    // Apply Date Filter Button
    if (document.getElementById('btnApplyDateFilter')) {
        document.getElementById('btnApplyDateFilter').addEventListener('click', () => {
            renderTable(true);
        });
    }

    // Set Today Button in Modal
    const btnSetToday = document.getElementById('btnSetToday');
    if (btnSetToday) {
        btnSetToday.addEventListener('click', () => {
            const dateInput = document.getElementById('transDate');
            if (dateInput) {
                dateInput.value = toLocalISO(new Date());
                updateDateHint(); // Update hint immediately
            }
        });
    }

    // Dynamic Date Hint
    const transDateInput = document.getElementById('transDate');
    if (transDateInput) {
        transDateInput.addEventListener('input', updateDateHint);
    }
    // Modal Form Submit
    document.getElementById('transactionForm').addEventListener('submit', handleFormSubmit);

    // Type Toggle in Modal (Switch Categories & Theme)
    const typeRadios = document.getElementsByName('transType');
    const transModalEl = document.getElementById('transactionModal');
    typeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            toggleCategoryOptions(val);

            // Dynamic Theme Switching
            if (transModalEl) {
                if (val === 'income') {
                    transModalEl.classList.remove('expense-theme');
                    transModalEl.classList.add('income-theme');
                } else {
                    transModalEl.classList.remove('income-theme');
                    transModalEl.classList.add('expense-theme');
                }
            }
        });
    });

    // Filter Button
    const btnFilter = document.getElementById('btnFilter');
    if (btnFilter) {
        btnFilter.addEventListener('click', renderTable);
    }

    // Search Input (Real-time filtering)
    const searchInput = document.getElementById('searchDescription');
    if (searchInput) {
        searchInput.addEventListener('keyup', () => renderTable(true));
    }

    // --- Live Amount Calculation (Multi-Source: Cash & ABA) ---
    const fieldIds = ['transAmountCash', 'transAmountCashKHR', 'transAmountAba', 'transAmountAbaKHR'];
    fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => updateLiveTotal());
    });

    // Intelligent Modal Student Search (Advance)
    const modalStudentSearch = document.getElementById('studentSearchInModal');
    const searchResults = document.getElementById('studentSearchResults');
    const btnClearSearch = document.getElementById('btnClearStudentSearch');

    if (modalStudentSearch && searchResults) {
        modalStudentSearch.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase().trim();
            if (btnClearSearch) btnClearSearch.style.display = val ? 'block' : 'none';

            if (val.length < 1) {
                searchResults.style.display = 'none';
                return;
            }

            // Filter Students from studentsData
            const matches = [];
            const uniqueNames = new Set();

            // Note: studentsData is the global object from Firebase
            if (studentsData) {
                Object.values(studentsData).forEach(s => {
                    if (!s) return;
                    const lName = s.lastName || '';
                    const fName = s.firstName || '';
                    const fullName = `${lName} ${fName}`.trim();
                    const id = s.displayId || s.key || '';

                    if (!fullName) return;

                    if (fullName.toLowerCase().includes(val) || id.toLowerCase().includes(val)) {
                        if (!uniqueNames.has(fullName)) {
                            matches.push({ name: fullName, id: id });
                            uniqueNames.add(fullName);
                        }
                    }
                });
            }

            // Display results
            if (matches.length > 0) {
                searchResults.innerHTML = matches.slice(0, 15).map(m => `
                    <button type="button" class="list-group-item list-group-item-action py-3 border-0 border-bottom" 
                        onclick="selectRecentStudent('${m.name.replace(/'/g, "\\'")}')">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <i class="fi fi-rr-user text-primary me-2"></i>
                                <span class="fw-bold text-dark">${m.name}</span>
                            </div>
                            ${m.id ? `<span class="badge bg-light text-muted fw-normal" style="font-size: 0.7rem;">ID: ${m.id}</span>` : ''}
                        </div>
                    </button>
                `).join('');
                searchResults.style.display = 'block';
            } else {
                searchResults.innerHTML = `<div class="p-4 text-center text-muted">
                    <i class="fi fi-rr-info fa-2x mb-2 opacity-50"></i>
                    <p class="mb-0 small">រកមិនឃើញសិស្សឈ្មោះ "<b>${e.target.value}</b>" ទេ</p>
                </div>`;
                searchResults.style.display = 'block';
            }
        });

        // Hide results when clicking outside
        document.addEventListener('mousedown', (e) => {
            if (!modalStudentSearch.contains(e.target) && !searchResults.contains(e.target)) {
                setTimeout(() => { searchResults.style.display = 'none'; }, 200);
            }
        });
    }

    if (btnClearSearch) {
        btnClearSearch.addEventListener('click', () => {
            if (modalStudentSearch) modalStudentSearch.value = '';
            if (searchResults) searchResults.style.display = 'none';
            btnClearSearch.style.display = 'none';
        });
    }

    // Reset Modal on Open (if adding new)
    const modal = document.getElementById('transactionModal');
    modal.addEventListener('show.bs.modal', (event) => {
        if (event.relatedTarget && event.relatedTarget.getAttribute('data-bs-target') === '#transactionModal') {
            const button = event.relatedTarget;
            const type = button.getAttribute('data-type') || 'income';

            // Reset Form
            document.getElementById('transactionForm').reset();
            document.getElementById('editTransactionId').value = '';

            // Set Type based on button clicked
            const radio = document.getElementById('type' + type.charAt(0).toUpperCase() + type.slice(1));
            if (radio) radio.checked = true;

            toggleCategoryOptions(type);

            // Set Date to Today (using local time)
            if (document.getElementById('transDate')) {
                document.getElementById('transDate').value = toLocalISO(new Date());
                updateDateHint();
            }

            // Initial Total
            updateLiveTotal();
        }
    });
}

function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('editTransactionId').value;
    const type = document.querySelector('input[name="transType"]:checked').value;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const date = document.getElementById('transDate').value;

    const cashUSD = parseFloat(document.getElementById('transAmountCash').value) || 0;
    const cashKHR = parseFloat(document.getElementById('transAmountCashKHR').value) || 0;
    const abaUSD = parseFloat(document.getElementById('transAmountAba').value) || 0;
    const abaKHR = parseFloat(document.getElementById('transAmountAbaKHR').value) || 0;

    const rate = type === 'income' ? EXCHANGE_RATE_INCOME : EXCHANGE_RATE_EXPENSE;
    const finalAmountUSD = cashUSD + abaUSD + ((cashKHR + abaKHR) / rate);

    if (finalAmountUSD <= 0) {
        alert("សូមបញ្ចូលចំនួនទឹកប្រាក់ត្រឹមត្រូវ (Please enter valid amount)");
        return;
    }

    // New Fields
    const payer = document.getElementById('transPayer').value;
    const receiver = document.getElementById('transReceiver').value;
    const boardingPlace = document.getElementById('transBoardingPlace') ? document.getElementById('transBoardingPlace').value.trim() : '';

    // Category/Description Logic
    let category = '';
    if (type === 'income') {
        category = document.getElementById('transIncomeSource').value.trim();
        if (!category) {
            alert("សូមបញ្ចូលប្រភពចំណូល (Please enter income source)");
            return;
        }
    } else {
        category = document.getElementById('transExpenseCategory').value;
        if (!category) {
            alert("សូមជ្រើសរើសប្រភេទចំណាយ (Please select expense category)");
            return;
        }
    }

    const description = document.getElementById('transDescription').value;

    const transactionData = {
        type: type,
        paymentMethod: paymentMethod,
        date: date,
        amount: finalAmountUSD,
        amountUSD: cashUSD + abaUSD,
        amountKHR: cashKHR + abaKHR,
        cashUSD,
        cashKHR,
        abaUSD,
        abaKHR,
        category,
        description,
        payer,
        receiver,
        boardingPlace,
        recorder: firebase.auth().currentUser ? (firebase.auth().currentUser.displayName || firebase.auth().currentUser.email) : 'System/Admin',
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    showLoading(true);

    if (id) {
        // Update
        transactionsRef.child(id).update(transactionData)
            .then(() => {
                closeModal();
                fetchTransactions(); // Refresh data
                Swal.fire({
                    icon: 'success',
                    title: 'កែប្រែបានជោគជ័យ',
                    text: 'ទិន្នន័យត្រូវបានធ្វើបច្ចុប្បន្នភាពរួចរាល់!',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#fff',
                    color: '#000',
                    iconColor: '#10b981'
                });
            })
            .catch(err => {
                console.error(err);
                showLoading(false);
                Swal.fire({
                    icon: 'error',
                    title: 'កំហុសក្នុងការកែប្រែ',
                    text: 'សូមព្យាយាមម្ដងទៀត!',
                });
            });
    } else {
        // Create
        transactionData.createdAt = firebase.database.ServerValue.TIMESTAMP;
        transactionsRef.push(transactionData)
            .then(() => {
                closeModal();
                fetchTransactions(true); // Refresh and go to page 1
                Swal.fire({
                    icon: 'success',
                    title: 'រក្សាទុកបានជោគជ័យ',
                    text: 'ប្រតិបត្តិការថ្មីត្រូវបានរក្សាទុកក្នុងប្រព័ន្ធ!',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#fff',
                    color: '#000',
                    iconColor: '#10b981'
                });
            })
            .catch(err => {
                console.error(err);
                showLoading(false);
                Swal.fire({
                    icon: 'error',
                    title: 'កំហុសក្នុងការរក្សាទុក',
                    text: 'សូមព្យាយាមម្ដងទៀត!',
                });
            });
    }
}

function editTransaction(id) {
    const item = transactionsData.find(t => t.id === id);
    if (!item) return;

    // Set Values
    document.getElementById('editTransactionId').value = id;
    document.getElementById('transDate').value = item.date;

    // Set Amounts correctly
    if (item.cashUSD !== undefined || item.abaUSD !== undefined || item.cashKHR !== undefined || item.abaKHR !== undefined) {
        document.getElementById('transAmountCash').value = item.cashUSD || '';
        document.getElementById('transAmountCashKHR').value = item.cashKHR || '';
        document.getElementById('transAmountAba').value = item.abaUSD || '';
        document.getElementById('transAmountAbaKHR').value = item.abaKHR || '';
    } else {
        // Fallback for old dual-field format
        if (item.amountUSD !== undefined || item.amountKHR !== undefined) {
            document.getElementById('transAmountCash').value = item.amountUSD || '';
            document.getElementById('transAmountCashKHR').value = item.amountKHR || '';
            document.getElementById('transAmountAba').value = '';
            document.getElementById('transAmountAbaKHR').value = '';
        } else if (item.originalCurrency === 'KHR') {
            document.getElementById('transAmountCash').value = '';
            document.getElementById('transAmountCashKHR').value = item.originalAmount;
            document.getElementById('transAmountAba').value = '';
            document.getElementById('transAmountAbaKHR').value = '';
        } else {
            document.getElementById('transAmountCash').value = item.originalAmount || item.amount;
            document.getElementById('transAmountCashKHR').value = '';
            document.getElementById('transAmountAba').value = '';
            document.getElementById('transAmountAbaKHR').value = '';
        }
    }

    document.getElementById('transDescription').value = item.description || '';

    // Set New Fields
    document.getElementById('transPayer').value = item.payer || '';
    document.getElementById('transReceiver').value = item.receiver || '';
    if (document.getElementById('transBoardingPlace')) {
        document.getElementById('transBoardingPlace').value = item.boardingPlace || '';
    }

    // Set Type
    if (item.type === 'income') {
        document.getElementById('typeIncome').checked = true;
    } else {
        document.getElementById('typeExpense').checked = true;
    }

    if (item.paymentMethod === 'aba') {
        document.getElementById('methodABA').checked = true;
    } else {
        document.getElementById('methodCash').checked = true;
    }
    toggleCategoryOptions(item.type);

    // Set Category (after toggling options)
    if (item.type === 'income') {
        document.getElementById('transIncomeSource').value = item.category || '';
    } else {
        document.getElementById('transExpenseCategory').value = item.category || '';
    }

    // Update Title
    document.getElementById('modalTitle').innerHTML = '<i class="fi fi-rr-edit me-2"></i>កែប្រែទិន្នន័យ (Edit)';

    // Open Modal
    const _transModalEl = document.getElementById('transactionModal');
    if (_transModalEl) {
        bootstrap.Modal.getOrCreateInstance(_transModalEl).show();
        // Update total display after setting values
        updateLiveTotal();
    }
}

function viewTransaction(id, index) {
    const item = transactionsData.find(t => t.id === id);
    if (!item) return;

    const typeLabel = item.type === 'income' ? 'ចំណូល (Income)' : 'ចំណាយ (Expense)';
    const typeColor = item.type === 'income' ? '#059669' : '#e11d48';

    // Formatted Sequential ID
    const formattedId = "TX" + String(index || 0).padStart(4, '0');

    // Amounts breakdown
    const cUSD = parseFloat(item.cashUSD) || 0;
    const cKHR = parseFloat(item.cashKHR) || 0;
    const aUSD = parseFloat(item.abaUSD) || 0;
    const aKHR = parseFloat(item.abaKHR) || 0;

    // Total Display
    const displayUSD = (item.amountUSD !== undefined ? item.amountUSD : (item.originalCurrency !== 'KHR' ? (item.amount || item.originalAmount || 0) : 0));
    const displayKHR = (item.amountKHR !== undefined ? item.amountKHR : (item.originalCurrency === 'KHR' ? item.originalAmount : 0));

    let detailsHtml = `
        <div class="text-start" style="font-family: 'Kantumruy Pro', sans-serif;">
            <div class="row g-0">
                <!-- Left Section: Status & Financial Summary -->
                <div class="col-md-5 p-4 rounded-start-4" style="background: #f8fafc; border-right: 1px dashed #e2e8f0;">
                    <div class="text-center mb-4">
                         <div class="badge rounded-pill mb-2 px-3 py-2" style="background: ${typeColor}15; color: ${typeColor}; font-weight: 800; border: 1px solid ${typeColor}30;">
                            <i class="fi ${item.type === 'income' ? 'fi-rr-arrow-trend-up' : 'fi-rr-arrow-trend-down'} me-2"></i> ${typeLabel}
                         </div>
                         <h2 class="fw-bold mb-0 text-dark">$${displayUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                         <div class="text-primary fw-bold fs-5">${displayKHR.toLocaleString()} ៛</div>
                         <div class="mt-2 small text-muted">ID: <span class="fw-bold text-dark">${formattedId}</span></div>
                    </div>

                    <div class="space-y-3">
                         <h6 class="fw-bold text-muted small mb-3 border-bottom pb-2 text-uppercase" style="letter-spacing: 0.05em;">បំណែងចែក (Breakdown)</h6>
                         <div class="p-3 rounded-4 bg-white border shadow-sm mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="text-muted small"><i class="fi fi-rr-money-bill-wave me-1"></i> សាច់ប្រាក់:</span>
                                <span class="fw-bold text-dark">$${cUSD.toLocaleString()} | ${cKHR.toLocaleString()} ៛</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mb-0">
                                <span class="text-muted small"><i class="fi fi-rr-bank me-1 text-info"></i> ABA Bank:</span>
                                <span class="fw-bold text-dark">$${aUSD.toLocaleString()} | ${aKHR.toLocaleString()} ៛</span>
                            </div>
                         </div>
                         <div class="p-3 rounded-4 bg-white border shadow-sm">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="text-muted small">ប្រភេទ:</span>
                                <span class="badge bg-light text-dark border px-2">${item.paymentMethod === 'aba' ? 'ABA' : 'Cash'}</span>
                            </div>
                         </div>
                    </div>
                </div>

                <!-- Right Section: Details & Context -->
                <div class="col-md-7 p-4 bg-white rounded-end-4">
                    <h6 class="fw-bold text-muted small mb-4 text-uppercase border-bottom pb-2" style="letter-spacing: 0.05em;"><i class="fi fi-rr-list text-primary me-1"></i> ព័ត៌មានប្រតិបត្តិការ (Details)</h6>
                    
                    <div class="row g-3 mb-4">
                        <div class="col-6">
                            <label class="text-muted small mb-1 d-block"><i class="fi fi-rr-calendar me-1"></i> កាលបរិច្ឆេទ</label>
                            <div class="fw-bold text-dark p-2 bg-light rounded-3">${formatDate(item.date)}</div>
                        </div>
                        <div class="col-6">
                            <label class="text-muted small mb-1 d-block"><i class="fi fi-rr-tag me-1"></i> ចំណាត់ថ្នាក់</label>
                            <div class="fw-bold text-primary p-2 bg-light rounded-3">${item.category}</div>
                        </div>
                        ${item.boardingPlace ? `
                        <div class="col-12 mt-3">
                            <label class="text-muted small mb-1 d-block"><i class="fa-solid fa-hotel me-1 text-warning"></i> កន្លែងស្នាក់នៅ/ជំណាក់ (Boarding Place)</label>
                            <div class="fw-bold text-dark p-2 bg-warning bg-opacity-10 rounded-3 border-start border-warning border-3">${item.boardingPlace}</div>
                        </div>` : ''}
                        <div class="col-6">
                            <label class="text-muted small mb-1 d-block"><i class="fi fi-rr-user me-1"></i> ${item.type === 'income' ? 'អ្នកផ្ដល់ប្រាក់' : 'អ្នកទូទាត់'}</label>
                            <div class="fw-bold text-dark p-2 bg-light rounded-3 text-truncate">${item.payer || '-'}</div>
                        </div>
                        <div class="col-6">
                            <label class="text-muted small mb-1 d-block"><i class="fi fi-rr-user-check me-1"></i> អ្នកទទួលប្រាក់</label>
                            <div class="fw-bold text-dark p-2 bg-light rounded-3 text-truncate">${item.receiver || '-'}</div>
                        </div>
                    </div>

                    <div class="mb-4">
                         <label class="text-muted small mb-2 d-block"><i class="fi fi-rr-chat-arrow-down me-1"></i> ការបរិយាយ (Description)</label>
                         <div class="p-3 bg-light rounded-4 italic small text-muted" style="min-height: 80px; line-height: 1.6; border: 1px solid #eef2f6;">
                            ${item.description || 'មិនមានការបរិយាយបន្ថែមទេ...'}
                         </div>
                    </div>

                    <div class="text-end border-top pt-3">
                        <span class="text-muted small italic">កត់ត្រាដោយ: <span class="fw-bold text-secondary">${item.recorder || 'System'}</span></span>
                    </div>
                </div>
            </div>
        </div>
    `;

    Swal.fire({
        title: null, // Title embedded in HTML for better design control
        html: detailsHtml,
        showCloseButton: true,
        showConfirmButton: false,
        width: '900px', // Horizontal width
        padding: '0',
        background: '#ffffff',
        customClass: {
            container: 'horizontal-detail-modal',
            popup: 'rounded-4 overflow-hidden border-0'
        }
    });
}

function deleteTransaction(id) {
    if (!confirm("តើអ្នកពិតជាចង់លុបទិន្នន័យនេះមែនទេ? (Are you sure?)")) return;

    showLoading(true);

    // Check if it is a system-linked ID
    if (id.startsWith('reg_')) {
        // Registration Payment: reg_{key}
        const studentKey = id.replace('reg_', '');
        studentsRef.child(studentKey).update({ initialPayment: 0 })
            .then(() => {
                fetchTransactions(); // Refresh
                alert("លុបការបង់ប្រាក់ចុះឈ្មោះជោគជ័យ (Registration payment cleared)");
            })
            .catch(err => {
                console.error(err);
                showLoading(false);
                alert("កំហុសក្នុងការលុប (Error deleting)");
            });

    } else if (id.startsWith('inst_')) {
        // Installment
        const parts = id.split('_');
        const idx = parseInt(parts.pop());
        parts.shift(); // remove 'inst'
        const studentKey = parts.join('_');

        studentsRef.child(studentKey).child('installments').once('value')
            .then(snapshot => {
                let installs = snapshot.val();
                if (!installs) {
                    showLoading(false);
                    return;
                }
                // Convert object to array if needed (though usually array)
                // If it's an object with keys 0,1,2..., Object.values might lose key association if sparse? 
                // But for splicing by index we need array. Assuming strictly sequential or object.
                // Re-fetching entire installments object is safer.
                // But let's proceed with current logic for now, just adding refresh.

                let instArray = isArray(installs) ? installs : Object.values(installs);

                if (idx >= 0 && idx < instArray.length) {
                    instArray.splice(idx, 1);
                    return studentsRef.child(studentKey).update({ installments: instArray });
                }
            })
            .then(() => {
                fetchTransactions(); // Refresh
                alert("លុបប្រវត្តិបង់រំលស់ជោគជ័យ (Installment deleted)");
            })
            .catch(err => {
                console.error(err);
                showLoading(false);
                alert("កំហុសក្នុងការលុប (Error deleting)");
            });

    } else if (id.startsWith('sale_')) {
        alert("មិនអាចលុបការលក់ពីទីនេះបានទេ សូមទៅកាន់ស្តុក (Cannot delete sales from here, please use Inventory)");
        showLoading(false);
    } else {
        transactionsRef.child(id).remove()
            .then(() => {
                fetchTransactions(); // Refresh
            })
            .catch(err => {
                console.error(err);
                showLoading(false);
                alert("កំហុសក្នុងការលុប (Error deleting)");
            });
    }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function toggleCategoryOptions(type) {
    const incomeContainer = document.getElementById('incomeInputContainer');
    const expenseContainer = document.getElementById('expenseSelectContainer');
    const modalTitle = document.getElementById('modalTitle');
    const labelPayer = document.getElementById('labelPayer');
    const labelReceiver = document.getElementById('labelReceiver');
    const transModalEl = document.getElementById('transactionModal');

    // Reset animations for total display
    const totalDisplay = document.querySelector('.summary-card-premium');
    if (totalDisplay) {
        totalDisplay.classList.remove('total-updating');
        void totalDisplay.offsetWidth; // Trigger reflow
        totalDisplay.classList.add('total-updating');
    }

    // Toggle Boarding Place Section (Income ONLY)
    const boardingSection = document.getElementById('boardingPlaceSection');
    if (boardingSection) {
        boardingSection.style.display = type === 'income' ? 'block' : 'none';
    }

    if (type === 'income') {
        incomeContainer.style.display = 'block';
        expenseContainer.style.display = 'none';

        if (transModalEl) {
            transModalEl.classList.remove('expense-theme');
            transModalEl.classList.add('income-theme');
        }

        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fi fi-rr-arrow-trend-up me-2"></i>បន្ថែមចំណូល (Income)';
        }

        if (labelPayer) labelPayer.innerHTML = 'អ្នកផ្ដល់ប្រាក់ <i class="fi fi-rr-user-tag ms-1 text-success"></i>';
        if (labelReceiver) labelReceiver.innerHTML = 'អ្នកទទួលប្រាក់ <i class="fi fi-rr-bank ms-1 text-primary"></i>';

        document.getElementById('transIncomeSource').setAttribute('required', 'required');
        document.getElementById('transExpenseCategory').removeAttribute('required');

        // Default receiver for Income (Only if not already set to a valid name)
        const receiverInput = document.getElementById('transReceiver');
        const validNames = ["毛平安-សុខណាង", "倪思妮-ស្រីនីត"];
        if (!validNames.includes(receiverInput.value)) {
            receiverInput.value = "毛平安-សុខណាង"; // Choose first one as default
        }
    } else {
        incomeContainer.style.display = 'none';
        expenseContainer.style.display = 'block';

        if (transModalEl) {
            transModalEl.classList.remove('income-theme');
            transModalEl.classList.add('expense-theme');
        }

        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fi fi-rr-arrow-trend-down me-2"></i>បន្ថែមការចំណាយ (Expense)';
        }

        if (labelPayer) labelPayer.innerHTML = 'អ្នកទូទាត់ <i class="fi fi-rr-shopping-cart ms-1 text-danger"></i>';
        if (labelReceiver) labelReceiver.innerHTML = 'អ្នកទទួលប្រាក់ <i class="fi fi-rr-user-check ms-1 text-warning"></i>';

        document.getElementById('transIncomeSource').removeAttribute('required');
        document.getElementById('transExpenseCategory').setAttribute('required', 'required');

        // Auto-payer for Expense is School
        const payerInput = document.getElementById('transPayer');
        if (!payerInput.value || payerInput.value === "") {
            payerInput.value = "សាលា (School)";
        }
    }
}

// Quick select recent student
function selectRecentStudent(name) {
    const payerInput = document.getElementById('transPayer');
    if (payerInput) {
        payerInput.value = name;
        // Pulse animation to show it was selected
        payerInput.classList.add('animate__animated', 'animate__pulse');
        setTimeout(() => payerInput.classList.remove('animate__animated', 'animate__pulse'), 1000);
    }

    // Hide search results and clear search input if active
    const searchResults = document.getElementById('studentSearchResults');
    const modalSearch = document.getElementById('studentSearchInModal');
    const btnClearSearch = document.getElementById('btnClearStudentSearch');

    if (searchResults) searchResults.style.display = 'none';
    if (modalSearch) modalSearch.value = '';
    if (btnClearSearch) btnClearSearch.style.display = 'none';

    // Auto-set category to "សិស្សបង់ប្រាក់បន្ថែម" if income
    const isIncome = document.getElementById('typeIncome')?.checked;
    if (isIncome) {
        const sourceInput = document.getElementById('transIncomeSource');
        if (sourceInput) sourceInput.value = 'សិស្សបង់ប្រាក់បន្ថែម';
    }
}


const khmerMonths = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const khmerDays = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];


function formatDate(dateString) {
    if (!dateString) return '';

    let d;
    // 1. Try parsing directly
    d = new Date(dateString);

    // 2. If direct parse fails or returns local components that might be wrong
    if (isNaN(d.getTime()) || (typeof dateString === 'string' && dateString.includes('-') && !dateString.includes('T'))) {
        const parts = dateString.split(/[-/]/);
        if (parts.length === 3) {
            // YYYY-MM-DD
            if (parts[0].length === 4) d = new Date(parts[0], parts[1] - 1, parts[2]);
            // DD-MM-YYYY
            else if (parts[2].length === 4) d = new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }

    if (isNaN(d.getTime())) return dateString;

    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    return `ថ្ងៃទី ${day}/${month}/${year}`;
}





function showLoading(show) {
    if (show) {
        if (window.showUniversalLoader) window.showUniversalLoader();
    } else {
        if (window.hideUniversalLoader) window.hideUniversalLoader();
    }
}

function updateLiveTotal() {
    const cUSD = parseFloat(document.getElementById('transAmountCash')?.value) || 0;
    const cKHR = parseFloat(document.getElementById('transAmountCashKHR')?.value) || 0;
    const aUSD = parseFloat(document.getElementById('transAmountAba')?.value) || 0;
    const aKHR = parseFloat(document.getElementById('transAmountAbaKHR')?.value) || 0;

    const totalDisplay = document.getElementById('transTotalDisplay');
    const totalKHRDisplay = document.getElementById('transTotalKHR');
    const summaryCard = document.querySelector('.summary-card-premium');

    if (!totalDisplay) return;

    const type = document.querySelector('input[name="transType"]:checked')?.value || 'income';
    const rate = type === 'income' ? EXCHANGE_RATE_INCOME : EXCHANGE_RATE_EXPENSE;

    const totalUSD = cUSD + aUSD + ((cKHR + aKHR) / rate);
    const totalKHR = (cUSD + aUSD) * rate + (cKHR + aKHR);

    // Animation trigger
    if (summaryCard) {
        summaryCard.classList.remove('total-updating');
        void summaryCard.offsetWidth; // trigger reflow
        summaryCard.classList.add('total-updating');
    }

    totalDisplay.textContent = '$' + totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (totalKHRDisplay) {
        totalKHRDisplay.textContent = totalKHR.toLocaleString() + ' ៛';
        totalKHRDisplay.className = 'small fw-bold position-relative mt-1 fs-6';
    }
}


function updateDateHint() {
    const dateInput = document.getElementById('transDate');
    const hint = document.getElementById('transDateHint');
    if (!dateInput || !hint) return;

    if (!dateInput.value) {
        hint.textContent = '(dddd-mmmm-yyyy)';
        hint.classList.remove('text-success');
        return;
    }

    const formatted = formatDate(dateInput.value);
    hint.textContent = formatted;
    hint.classList.add('text-success'); // Change color when valid
}



function closeModal() {
    const modalEl = document.getElementById('transactionModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
}

// ==========================================
// REPORT GENERATION
// ==========================================

let pendingReportType = null;

function exportReport(type) {
    pendingReportType = type;

    // Set default date to today
    const nowD = new Date();
    const sDay = document.getElementById('reportSignDay');
    const sMonth = document.getElementById('reportSignMonth');
    const sYear = document.getElementById('reportSignYear');
    if (sDay) sDay.value = nowD.getDate();
    if (sMonth) sMonth.value = nowD.getMonth() + 1;
    if (sYear) sYear.value = nowD.getFullYear();

    // Show/Hide Display Logic
    const monthlyArea = document.getElementById('monthlySelectionArea');
    const rangeArea = document.getElementById('rangeSelectionArea');
    
    if (monthlyArea) monthlyArea.style.display = (type === 'monthly') ? 'block' : 'none';
    if (rangeArea) rangeArea.style.display = (type === 'range') ? 'block' : 'none';

    if (type === 'monthly') {
        const now = new Date();
        const monthInput = document.getElementById('reportMonth');
        const yearInput = document.getElementById('reportYear');
        if (monthInput && !monthInput.value) monthInput.value = now.getMonth() + 1;
        if (yearInput && !yearInput.value) yearInput.value = now.getFullYear();
    } else if (type === 'range') {
        const pageStart = document.getElementById('reportStartDate');
        const pageEnd = document.getElementById('reportEndDate');
        
        const todayStr = new Date().toISOString().split('T')[0];
        const valStart = (pageStart && pageStart.value) ? pageStart.value : todayStr;
        const valEnd = (pageEnd && pageEnd.value) ? pageEnd.value : todayStr;
        
        try {
            const sParts = valStart.split('-');
            if (sParts.length === 3) {
                if (document.getElementById('modalStartYear')) document.getElementById('modalStartYear').value = parseInt(sParts[0], 10);
                if (document.getElementById('modalStartMonth')) document.getElementById('modalStartMonth').value = parseInt(sParts[1], 10);
                if (document.getElementById('modalStartDay')) document.getElementById('modalStartDay').value = parseInt(sParts[2], 10);
            }
            const eParts = valEnd.split('-');
            if (eParts.length === 3) {
                if (document.getElementById('modalEndYear')) document.getElementById('modalEndYear').value = parseInt(eParts[0], 10);
                if (document.getElementById('modalEndMonth')) document.getElementById('modalEndMonth').value = parseInt(eParts[1], 10);
                if (document.getElementById('modalEndDay')) document.getElementById('modalEndDay').value = parseInt(eParts[2], 10);
            }
        } catch(e) {}
    }

    // Set default reporter name dynamically
    const reporterInput = document.getElementById('customReporterName');
    if (reporterInput && !reporterInput.value) {
        let authName = '';
        try {
            if (firebase && firebase.auth().currentUser) {
                authName = firebase.auth().currentUser.displayName || firebase.auth().currentUser.email.split('@')[0];
            }
        } catch (e) {}
        
        const uiEl = document.getElementById('user-display-name') || document.getElementById('welcome-user-name');
        let uiName = uiEl ? uiEl.textContent.trim() : '';
        if (uiName === '...' || uiName === 'Loading...') uiName = '';
        
        reporterInput.value = authName || uiName || 'Admin';
    }

    const modal = new bootstrap.Modal(document.getElementById('reporterModal'));
    modal.show();
}

function selectReporter(name) {
    document.getElementById('customReporterName').value = name;
}

function confirmReportPrint() {
    const reporterName = document.getElementById('customReporterName').value || "Admin";
    
    const sDay = document.getElementById('reportSignDay')?.value;
    const sMonth = document.getElementById('reportSignMonth')?.value;
    const sYear = document.getElementById('reportSignYear')?.value;
    
    let signDateValue = new Date().toISOString().split('T')[0];
    if (sDay && sMonth && sYear) {
        signDateValue = `${sYear}-${String(sMonth).padStart(2, '0')}-${String(sDay).padStart(2, '0')}`;
    } else {
        const oldDateInput = document.getElementById('reportSignDate');
        if (oldDateInput) signDateValue = oldDateInput.value || signDateValue;
    }

    const type = pendingReportType;

    // Close the reporter modal
    const reporterModalEl = document.getElementById('reporterModal');
    const bModal = bootstrap.Modal.getInstance(reporterModalEl);
    if (bModal) bModal.hide();

    executeExportReport(type, reporterName, signDateValue);
}

function executeExportReport(type, reporterName, signDateValue) {

    let titlePrefix = "";
    if (currentFilter === 'income') titlePrefix = "ចំណូល (Income) - ";
    else if (currentFilter === 'expense') titlePrefix = "ចំណាយ (Expense) - ";
    else titlePrefix = "ចំណូល-ចំណាយ (Income-Expense) - ";

    let title = "";
    let filteredData = [];
    let periodText = "";

    if (type === 'daily') {
        // Use LOCAL date (not UTC) to avoid timezone shift
        const today = toLocalISO(new Date());
        title = titlePrefix + "របាយការណ៍ប្រចាំថ្ងៃ";
        periodText = `ប្រចាំថ្ងៃតី: ${formatDate(today)} `;

        filteredData = transactionsData.filter(item => item.date === today);
    } else if (type === 'monthly') {
        const currentYear = new Date().getFullYear();
        let month = new Date().getMonth() + 1;
        let year = currentYear;

        const monthInput = document.getElementById('reportMonth');
        const yearInput = document.getElementById('reportYear');
        
        if (monthInput && yearInput && monthInput.value) {
             month = parseInt(monthInput.value) || month;
             year = parseInt(yearInput.value) || year;
        } else {
             const promptMonth = prompt("សូមបញ្ចូលខែ (1-12) សម្រាប់របាយការណ៍:", month);
             if (!promptMonth) return;
             month = parseInt(promptMonth);
             if (isNaN(month) || month < 1 || month > 12) {
                 alert("ខែមិនត្រឹមត្រូវ (Invalid Month)");
                 return;
             }
             const promptYear = prompt("សូមបញ្ចូលឆ្នាំ:", year);
             year = parseInt(promptYear) || year;
        }

        // Use Proper Khmer Month
        const khmerMonthName = (khmerMonths && khmerMonths[month - 1]) ? khmerMonths[month - 1] : month;
        title = titlePrefix + `របាយការណ៍ប្រចាំខែ ${khmerMonthName} ឆ្នាំ ${year}`;
        periodText = `ប្រចាំខែ: ${khmerMonthName} ឆ្នាំ ${year}`;

        filteredData = transactionsData.filter(item => {
            const d = new Date(item.date);
            return (d.getMonth() + 1) === month && d.getFullYear() === year;
        });
    } else if (type === 'range') {
        let startDate = "";
        let endDate = "";
        
        const sd_D = document.getElementById('modalStartDay')?.value;
        const sd_M = document.getElementById('modalStartMonth')?.value;
        const sd_Y = document.getElementById('modalStartYear')?.value;
        if (sd_D && sd_M && sd_Y) {
            startDate = `${sd_Y}-${String(sd_M).padStart(2, '0')}-${String(sd_D).padStart(2, '0')}`;
        }
        
        const ed_D = document.getElementById('modalEndDay')?.value;
        const ed_M = document.getElementById('modalEndMonth')?.value;
        const ed_Y = document.getElementById('modalEndYear')?.value;
        if (ed_D && ed_M && ed_Y) {
            endDate = `${ed_Y}-${String(ed_M).padStart(2, '0')}-${String(ed_D).padStart(2, '0')}`;
        }
        
        // Fallback to page filter if modal elements are missing
        if (!startDate || !endDate) {
            startDate = startDate || document.getElementById('reportStartDate')?.value;
            endDate = endDate || document.getElementById('reportEndDate')?.value;
        }

        if (!startDate || !endDate) {
            Swal.fire({
                icon: 'warning',
                title: 'សូមជ្រើសកាលបរិច្ឆេទ',
                text: 'សូមជ្រើសរើសកាលបរិច្ឆេទចាប់ផ្តើម និងបញ្ចប់ (Please select start and end date)',
                confirmButtonText: 'យល់ព្រម',
                confirmButtonColor: '#8a0e5b'
            });
            return;
        }

        if (startDate > endDate) {
            Swal.fire({
                icon: 'error',
                title: 'កាលបរិច្ឆេទមិនត្រឹមត្រូវ',
                text: 'កាលបរិច្ឆេទចាប់ផ្តើមមិនអាចធំជាងកាលបរិច្ឆេទបញ្ចប់ទេ',
                confirmButtonColor: '#8a0e5b'
            });
            return;
        }

        title = titlePrefix + `របាយការណ៍ចន្លោះថ្ងៃ`;
        periodText = `ចន្លោះថ្ងៃ: ${formatDate(startDate)} ដល់ ${formatDate(endDate)}`;

        // Normalize helper (same as renderTable)
        const normD = (d) => {
            if (!d) return '';
            if (typeof d === 'number') return toLocalISO(new Date(d));
            d = String(d);
            if (d.includes('T')) return d.split('T')[0];
            const parts = d.split(/[-/]/);
            if (parts.length === 3 && parts[0].length === 4)
                return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            if (parts.length === 3 && parts[2].length === 4)
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            try { const dt = new Date(d); if (!isNaN(dt)) return toLocalISO(dt); } catch (e) { }
            return d;
        };

        filteredData = transactionsData.filter(item => {
            const itemDate = normD(item.date);
            return itemDate >= startDate && itemDate <= endDate;
        });
    }

    // Apply the CURRENT filter to the report as well
    if (currentFilter !== 'all') {
        filteredData = filteredData.filter(item => item.type === currentFilter);
    }

    if (filteredData.length === 0) {
        alert("គ្មានទិន្នន័យសម្រាប់ period នេះទេ (No data found)");
        return;
    }

    // Sort by date/time
    filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

    let totalUSD_Inc = 0; let totalUSD_Exp = 0;
    let totalKHR_Inc = 0; let totalKHR_Exp = 0;
    let boardingUSD = 0; let boardingKHR = 0;
    let abaUSD_Inc = 0; let abaKHR_Inc = 0;
    let abaUSD_Exp = 0; let abaKHR_Exp = 0;
    let cashUSD_Inc = 0; let cashKHR_Inc = 0;
    let cashUSD_Exp = 0; let cashKHR_Exp = 0;

    // Format signDateValue into Khmer string: ថ្ងៃទី... ខែ... ឆ្នាំ...
    let khmerSignDate = "ថ្ងៃទី...........ខែ...........ឆ្នាំ.............";
    if (signDateValue) {
        const sDate = new Date(signDateValue);
        const sDay = sDate.getDate();
        const sMonth = sDate.getMonth() + 1;
        const sYear = sDate.getFullYear();
        const sMonthKhmer = (khmerMonths && khmerMonths[sMonth - 1]) ? khmerMonths[sMonth - 1] : sMonth;
        khmerSignDate = `ថ្ងៃទី ${toKhmerNumber(sDay)} ខែ ${sMonthKhmer} ឆ្នាំ ${toKhmerNumber(sYear)}`;
    }

    const rows = filteredData.map((item, index) => {
        const typeLabel = item.type === 'income' ? 'ចំណូល' : 'ចំណាយ';
        const typeColor = item.type === 'income' ? 'text-success' : 'text-danger';
        const amountPrefix = item.type === 'income' ? '+' : '-';
        const payerName = item.payer || '-';
        const receiverName = item.receiver || '-';

        let displayUSD = '-'; let displayKHR = '-';

        let i_cashUSD = parseFloat(item.cashUSD) || 0;
        let i_cashKHR = parseFloat(item.cashKHR) || 0;
        let i_abaUSD = parseFloat(item.abaUSD) || 0;
        let i_abaKHR = parseFloat(item.abaKHR) || 0;

        // Fallback for older data
        if (item.cashUSD === undefined && item.abaUSD === undefined) {
            const method = item.paymentMethod || 'cash';
            const amtUSD = item.amountUSD !== undefined ? item.amountUSD : (item.originalCurrency !== 'KHR' ? (item.amount || item.originalAmount || 0) : 0);
            const amtKHR = item.amountKHR !== undefined ? item.amountKHR : (item.originalCurrency === 'KHR' ? item.originalAmount : 0);
            if (method === 'aba') { i_abaUSD = amtUSD; i_abaKHR = amtKHR; }
            else { i_cashUSD = amtUSD; i_cashKHR = amtKHR; }
        }

        const totalRowUSD = i_cashUSD + i_abaUSD;
        const totalRowKHR = i_cashKHR + i_abaKHR;

        if (item.type === 'income') {
            totalUSD_Inc += totalRowUSD; totalKHR_Inc += totalRowKHR;
            abaUSD_Inc += i_abaUSD; abaKHR_Inc += i_abaKHR;
            cashUSD_Inc += i_cashUSD; cashKHR_Inc += i_cashKHR;

            // Check for boarding (ជំណាក់)
            if (item.category && item.category.includes('ជំណាក់')) {
                boardingUSD += totalRowUSD;
                boardingKHR += totalRowKHR;
            }
        } else {
            totalUSD_Exp += totalRowUSD; totalKHR_Exp += totalRowKHR;
            abaUSD_Exp += i_abaUSD; abaKHR_Exp += i_abaKHR;
            cashUSD_Exp += i_cashUSD; cashKHR_Exp += i_cashKHR;
        }

        if (totalRowUSD > 0) displayUSD = `${amountPrefix}$${totalRowUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (totalRowKHR > 0) displayKHR = `${amountPrefix}${totalRowKHR.toLocaleString()} ៛`;

        return `
            <tr style="font-weight: bold; font-size: 14px; color: #000;">
                <td style="text-align: center;">${formatDate(item.date)}</td>
                <td style="text-align: center;">
                    <span style="
                        display: inline-block;
                        padding: 3px 8px;
                        border-radius: 6px;
                        font-size: 12px;
                        font-weight: 800;
                        background-color: ${item.type === 'income' ? '#ecfdf5' : '#fef2f2'};
                        color: ${item.type === 'income' ? '#059669' : '#dc2626'};
                        border: 1px solid ${item.type === 'income' ? '#6ee7b7' : '#fca5a5'};
                    ">${typeLabel}</span>
                </td>
                <td>${item.category}${item.boardingPlace ? ` (${item.boardingPlace})` : ''}</td>
                <td>${payerName}</td>
                <td>${receiverName}</td>
                <td>${item.description || '-'}</td>
                <td class="text-end" style="font-weight: 900; color: ${item.type === 'income' ? '#059669' : '#dc2626'};">
                    ${displayUSD}
                </td>
                <td class="text-end" style="font-weight: 900; color: ${item.type === 'income' ? '#059669' : '#dc2626'};">
                    ${displayKHR}
                </td>
            </tr>
        `;
    }).join('');

    const netAbaUSD = abaUSD_Inc - abaUSD_Exp;
    const netAbaKHR = abaKHR_Inc - abaKHR_Exp;

    // Consolidated Grand Balance: convert all KHR to USD then combine
    const rate = EXCHANGE_RATE_USD_TO_KHR || 4150;
    const grandIncUSD = totalUSD_Inc + (totalKHR_Inc / rate);
    const grandExpUSD = totalUSD_Exp + (totalKHR_Exp / rate);
    const grandBalUSD = grandIncUSD - grandExpUSD;           // single USD number
    const grandBalKHR = grandBalUSD * rate;                  // same value in KHR

    // Keep separate for sub-breakdown rows
    const finalBalUSD = totalUSD_Inc - totalUSD_Exp;
    const finalBalKHR = totalKHR_Inc - totalKHR_Exp;

    let html = `<html><head><title>${title}</title>
         <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
        <style>
             @font-face {
                font-family: 'Kantumruy Pro';
                src: url('fonts/KantumruyPro-Regular.woff2') format('woff2'),
                     url('fonts/KantumruyPro-Regular.ttf') format('truetype');
                font-weight: normal;
                font-style: normal;
            }
            body { font-family: 'Kantumruy Pro', sans-serif; padding: 20px; color: #333; }
            .header-flex {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 3px double #333;
                padding-bottom: 15px;
                margin-bottom: 25px;
            }
            .header-logo { width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; }
            .header-logo img { max-width: 100%; max-height: 100%; border-radius: 10px; }
            .header-text { flex-grow: 1; text-align: center; }
            .header-text h1 { margin: 0; font-size: 22px; font-weight: 700; color: #1e293b; }
            .header-text h2 { margin: 5px 0; font-size: 16px; font-weight: 600; color: #475569; }
            .header-text h3 { margin: 10px 0; font-size: 14px; text-decoration: underline; color: #000; }

            /* Summary Dashboard Style */
            .print-summary-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-bottom: 30px;
            }
            .summary-card {
                padding: 15px;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                background: #fff;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                position: relative;
                overflow: hidden;
            }
            .summary-card.income { border-left: 5px solid #10b981; }
            .summary-card.expense { border-left: 5px solid #ef4444; }
            .summary-card.balance { border-left: 5px solid #3b82f6; }
            
            .summary-card h4 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; }
            .summary-card .val-usd { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
            .summary-card .val-khr { font-size: 13px; color: #475569; font-weight: 600; }

            .text-success { color: #059669 !important; }
            .text-danger { color: #dc2626 !important; }
            .text-primary { color: #2563eb !important; }

            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; color: #000; }
            th, td { border: 1px solid #000; padding: 10px 8px; vertical-align: middle; }
            th { background-color: #f8fafc; font-weight: 800; color: #000; }
            tbody tr { font-weight: 700; }
            
            /* Badge Styles */
            .badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 800;
                text-align: center;
                text-transform: uppercase;
            }
            .badge-income { background-color: #ecfdf5; color: #059669; border: 1px solid #10b981; }
            .badge-expense { background-color: #fef2f2; color: #dc2626; border: 1px solid #f87171; }

            /* Action Bar */
            .action-bar { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 12px 20px; border-radius: 10px; margin-bottom: 20px; }
            .btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700; border: none; cursor: pointer; }
            .btn-close { background-color: #64748b; color: white; }
            .btn-print { background-color: #0f172a; color: white; }
            
            /* Print Specifics */
            @media print {
                @page { size: landscape; margin: 10mm; }
                .no-print { display: none; }
                .summary-box { break-inside: avoid; page-break-inside: avoid; }
                th { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #8a0e5b !important; color: #fff !important; }
                .total-income-row td { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #ecfdf5 !important; color: #065f46 !important; }
                .total-expense-row td { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #fef2f2 !important; color: #991b1b !important; }
                .total-balance-row td { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #eff6ff !important; color: #1e3a8a !important; }
                .header-flex { border-bottom: 3px double #000; }
                
                /* Prevent Header Repetition */
                thead { display: table-row-group; }
                
                /* Ensure rows don't split */
                tr { page-break-inside: avoid; break-inside: avoid; }
                td, th { page-break-inside: avoid; break-inside: avoid; }
                table { page-break-inside: auto; }
            }
        </style>
    </head><body>

    <!-- Standard Header Layout -->
    <div class="header-flex">
        <div class="header-logo">
            <img src="/img/1.jpg" onerror="this.src='/img/1.jpg'" alt="School Logo">
        </div>
        <div class="header-text">
            <h1>សាលាអន្តរជាតិ ធាន ស៊ីន</h1>
            <h2>Tian Xin International School</h2>
            <h3 style="margin-bottom: 0; text-decoration: none; font-weight: 800;">${title}</h3>
            <div style="font-size: 13px; margin-top: 5px; color: #000; font-weight: bold;">${periodText}</div>
        </div>
        <div style="width: 100px;"></div> <!-- Spacer -->
    </div>

    <table>
        <thead>
            <tr style="
                background-color: rgb(138, 14, 91);
                color: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            ">
                <th width="9%" style="padding:10px 8px; border-color:#a01570; color:#fff; background-color: rgb(138, 14, 91);">
                    <i class="fa-solid fa-calendar-days" style="font-size:11px; margin-right:4px;"></i>កាលបរិច្ឆេទ
                </th>
                <th width="7%" style="text-align:center; padding:10px 8px; border-color:#a01570; color:#fff; background-color: rgb(138, 14, 91);">
                    <i class="fa-solid fa-tags" style="font-size:11px; margin-right:4px;"></i>ប្រភេទ
                </th>
                <th width="13%" style="padding:10px 8px; border-color:#a01570; color:#fff; background-color: rgb(138, 14, 91);">
                    <i class="fa-solid fa-layer-group" style="font-size:11px; margin-right:4px;"></i>ប្រភព/ចំណាយ
                </th>
                <th width="13%" style="padding:10px 8px; border-color:#a01570; color:#fff; background-color: rgb(138, 14, 91);">
                    <i class="fa-solid fa-user" style="font-size:11px; margin-right:4px;"></i>សិស្ស/អ្នកចំណាយ
                </th>
                <th width="13%" style="padding:10px 8px; border-color:#a01570; color:#fff; background-color: rgb(138, 14, 91);">
                    <i class="fa-solid fa-user-check" style="font-size:11px; margin-right:4px;"></i>អ្នកទទួល
                </th>
                <th style="padding:10px 8px; border-color:#a01570; color:#fff; background-color: rgb(138, 14, 91);">
                    <i class="fa-solid fa-comment-dots" style="font-size:11px; margin-right:4px;"></i>ការបរិយាយ
                </th>
                <th width="10%" style="text-align:right; padding:10px 8px; border-color:#a01570; color:#fff; background-color: rgb(138, 14, 91);">
                    <i class="fa-solid fa-dollar-sign" style="font-size:11px; margin-right:3px;"></i>ទឹកប្រាក់ ($)
                </th>
                <th width="10%" style="text-align:right; padding:10px 8px; border-color:#a01570; color:#fff; background-color: rgb(138, 14, 91);">
                    <i class="fa-solid fa-coins" style="font-size:11px; margin-right:3px;"></i>ទឹកប្រាក់ (៛)
                </th>
            </tr>
        </thead>
        <tbody>
            ${rows}
            <!-- Footer Totals -->
             <tr style="height: 30px; border: none;"><td colspan="8" style="border: none;"></td></tr>
             
             <!-- Income Summary Tier -->
             <tr style="background-color: #f0fdf4; border-top: 3px solid #059669; border-bottom: 1px solid #bdf1d9;">
                 <td colspan="6" class="text-end" style="padding: 12px 20px;">
                    <span style="font-weight: 900; color: #065f46; font-size: 15px;">សរុបចំណូល (Total Income)</span>
                    <div style="font-size: 11px; color: #059669; font-weight: bold; margin-top: 2px;">
                        <i class="fa-solid fa-building-columns me-1"></i> ABA: $${abaUSD_Inc.toLocaleString()} | ${abaKHR_Inc.toLocaleString()} ៛ &nbsp;&nbsp;
                        <i class="fa-solid fa-money-bill-1-wave me-1"></i> សាច់ប្រាក់: $${cashUSD_Inc.toLocaleString()} | ${cashKHR_Inc.toLocaleString()} ៛
                    </div>
                 </td>
                 <td class="text-end" style="padding: 12px; vertical-align: middle;">
                    <div style="font-weight: 900; color: #059669; font-size: 16px;">$${totalUSD_Inc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                 </td>
                 <td class="text-end" style="padding: 12px; vertical-align: middle;">
                    <div style="font-weight: 900; color: #059669; font-size: 16px;">${totalKHR_Inc.toLocaleString()} ៛</div>
                 </td>
             </tr>

             <!-- Boarding Summary (ជំណាក់) -->
             <tr style="background-color: #fefce8; border-bottom: 1px solid #fde68a;">
                 <td colspan="6" class="text-end" style="padding: 10px 20px;">
                    <span style="font-weight: 800; color: #854d0e; font-size: 14px;"><i class="fa-solid fa-hotel me-1"></i> សរុបប្រាក់ជំណាក់ (Boarding Total)</span>
                 </td>
                 <td class="text-end" style="padding: 10px; vertical-align: middle;">
                    <div style="font-weight: 800; color: #854d0e; font-size: 14px;">$${boardingUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                 </td>
                 <td class="text-end" style="padding: 10px; vertical-align: middle;">
                    <div style="font-weight: 800; color: #854d0e; font-size: 14px;">${boardingKHR.toLocaleString()} ៛</div>
                 </td>
             </tr>

             <!-- Expense Summary Tier -->
             <tr style="background-color: #fef2f2; border-top: 1px solid #fecaca; border-bottom: 1px solid #fecaca;">
                 <td colspan="6" class="text-end" style="padding: 12px 20px;">
                    <span style="font-weight: 900; color: #991b1b; font-size: 15px;">សរុបចំណាយ (Total Expense)</span>
                    <div style="font-size: 11px; color: #b91c1c; font-weight: bold; margin-top: 2px;">
                        <i class="fa-solid fa-building-columns me-1"></i> ABA: $${abaUSD_Exp.toLocaleString()} | ${abaKHR_Exp.toLocaleString()} ៛ &nbsp;&nbsp;
                        <i class="fa-solid fa-money-bill-1-wave me-1"></i> សាច់ប្រាក់: $${cashUSD_Exp.toLocaleString()} | ${cashKHR_Exp.toLocaleString()} ៛
                    </div>
                 </td>
                 <td class="text-end" style="padding: 12px; vertical-align: middle;">
                    <div style="font-weight: 900; color: #b91c1c; font-size: 16px;">$${totalUSD_Exp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                 </td>
                 <td class="text-end" style="padding: 12px; vertical-align: middle;">
                    <div style="font-weight: 900; color: #b91c1c; font-size: 16px;">${totalKHR_Exp.toLocaleString()} ៛</div>
                 </td>
             </tr>

             <!-- Grand Balance Tier (HIGH CONTRAST) -->
             <tr style="background-color: #1e293b; color: #fff; border-top: 2px solid #000;">
                 <td colspan="6" class="text-end" style="padding: 15px 25px;">
                    <span style="font-weight: 900; font-size: 18px; letter-spacing: 0.5px;">ប្រាក់សរុប (GRAND BALANCE)</span>
                    <div style="font-size: 11px; color: #94a3b8; font-weight: bold; margin-top: 5px; line-height: 1.7;">
                        <span style="color: #34d399;">&#43; ចំណូល USD: $${totalUSD_Inc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        &nbsp;|&nbsp;
                        <span style="color: #34d399;">&#43; ចំណូល ៛→$: $${(totalKHR_Inc / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <br>
                        <span style="color: #f87171;">&#8722; ចំណាយ USD: $${totalUSD_Exp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        &nbsp;|&nbsp;
                        <span style="color: #f87171;">&#8722; ចំណាយ ៛→$: $${(totalKHR_Exp / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <br>
                        <span style="color: #60a5fa;"><i class="fa-solid fa-bank"></i> ABA: $${netAbaUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} | ${netAbaKHR.toLocaleString()} ៛</span>
                        &nbsp;&nbsp;
                        <span style="color: #a78bfa; font-size: 10px;">(អត្រាប្ដូរ: 1$ = ${rate.toLocaleString()} ៛)</span>
                    </div>
                 </td>
                 <!-- Grand Balance USD -->
                 <td class="text-end" style="padding: 15px; vertical-align: middle; background-color: #0f172a;">
                    <div style="font-weight: 900; font-size: 20px; color: ${grandBalUSD >= 0 ? '#4ade80' : '#f87171'}; letter-spacing: 0.5px;">
                        $${grandBalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                 </td>
                 <!-- Grand Balance KHR equivalent -->
                 <td class="text-end" style="padding: 15px; vertical-align: middle; background-color: #0f172a;">
                    <div style="font-weight: 900; font-size: 20px; color: ${grandBalUSD >= 0 ? '#4ade80' : '#f87171'};">
                        ${grandBalKHR.toLocaleString('en-US', { maximumFractionDigits: 0 })} ៛
                    </div>
                 </td>
             </tr>
        </tbody>
    </table>

    <div class="summary-box no-print">
        <p><strong>សង្ខេប (Summary):</strong></p>
        <p>ចំនួនប្រតិបត្តិការសរុប: ${filteredData.length}</p>
    </div>

    <!-- Signature Section removed as requested -->
    <div style="margin-top: 20px;"></div>

    <script>
        // No auto-print — shown in preview overlay
    </script>
    </body></html>`;

    // Show in in-page preview overlay instead of new tab
    openPrintPreview(html, title, periodText);
}

// Global Export
window.exportReport = exportReport;



// --- Helper to set category from quick buttons ---
function setCategory(val) {
    const expInput = document.getElementById("transExpenseCategory");
    if (expInput) {
        expInput.value = val;
        document.getElementById('transAmountCash')?.focus();
        updateLiveTotal();
    }
}

function setIncomeSource(val) {
    const incInput = document.getElementById("transIncomeSource");
    if (incInput) {
        incInput.value = val;
        document.getElementById('transAmountCash')?.focus();
        updateLiveTotal();
    }
}


