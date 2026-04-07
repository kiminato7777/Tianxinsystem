
// ==========================================
// INVENTORY MANAGEMENT SCRIPT
// ==========================================

let inventoryData = {};
let salesData = {};
let currentCurrency = 'USD';
let exchangeRate = 4100;
let itemToSellId = null;

let stockCurrentPage = 1;
let salesCurrentPage = 1;
const pageSize = 20;

// 1. Initialize Data Listeners IMMEDIATELY for speed
if (typeof inventoryRef !== 'undefined') setupInventoryListener();
if (typeof salesRef !== 'undefined') setupSalesListener();

// 2. Initialize UI Components
document.addEventListener('DOMContentLoaded', () => {
    console.log("Inventory Script UI Initialized");

    // Event Listeners
    setupEventListeners();

    // Set Default Report Date & Initialize Flatpickr
    const rdInput = document.getElementById('reportDate');
    if (rdInput) {
        flatpickr(rdInput, {
            locale: "km", // Display calendar in Khmer
            altInput: true,
            altFormat: "d-m-Y", // Display format DD-MM-YYYY
            dateFormat: "d-m-Y", // Value format DD-MM-YYYY
            defaultDate: "today",
            onReady: function(selectedDates, dateStr, instance) {
                instance.calendarContainer.classList.add("red-theme"); 
            }
        });
    }

    // High-Speed Patch: If data happened to arrive before UI was ready, re-render now
    if (Object.keys(inventoryData).length > 0) renderInventoryTable();
    if (Object.keys(salesData).length > 0) renderSalesTable();
});

function setupInventoryListener() {
    inventoryRef.on('value', (snapshot) => {
        inventoryData = snapshot.val() || {};
        renderInventoryTable();
        updateSummaryCards();
    });
}

function setupSalesListener() {
    salesRef.on('value', (snapshot) => {
        salesData = snapshot.val() || {};
        renderSalesTable();
    });
}

function renderSalesTable() {
    const tbody = document.getElementById('soldStockTableBody');
    if (!tbody) return;

    const searchTerm = document.getElementById('inventorySearchInput')?.value.toLowerCase() || '';
    const allItems = Object.entries(salesData).reverse(); // Latest first
    
    // Filter
    const filteredItems = allItems.filter(([id, item]) => {
        if (!searchTerm) return true;
        return item.itemName.toLowerCase().includes(searchTerm);
    });

    // Pagination
    const totalItems = filteredItems.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    if (salesCurrentPage > totalPages) salesCurrentPage = totalPages;
    
    const start = (salesCurrentPage - 1) * pageSize;
    const end = start + pageSize;
    const items = filteredItems.slice(start, end);

    let html = '';
    let index = start + 1;

    for (const [id, item] of items) {
        if (searchTerm && !item.itemName.toLowerCase().includes(searchTerm)) continue;

        const date = item.soldDate || formatDate(item.soldAt);
        const keeper = item.stockKeeper || '-';
        const note = item.note || '-';
        const totalPrice = item.totalPrice || 0;
        const unitPrice = item.pricePerUnit || 0;
        const unitPriceKHR = item.pricePerUnitKHR || (unitPrice * exchangeRate);
        const totalPriceKHR = totalPrice * exchangeRate;

        html += `
            <tr>
                <td class="ps-4 text-muted">${index++}</td>
                <td class="text-secondary small">${date}</td>
                <td class="text-secondary fw-bold">${keeper}</td>
                <td class="fw-bold text-dark">${item.itemName}</td>
                <td class="text-center"><span class="badge bg-danger">${item.quantity}</span></td>
                <td class="text-end text-muted">${unitPriceKHR.toLocaleString('en-US')} ៛</td>
                <td class="text-end fw-bold text-success">$${parseFloat(totalPrice).toFixed(2)}</td>
                <td class="text-end fw-bold text-primary">${totalPriceKHR.toLocaleString('en-US')} ៛</td>
                <td class="small text-muted text-truncate" style="max-width: 150px;">${note}</td>
                <td class="text-center">
                    <button class="btn btn-action btn-warning text-dark me-1" onclick="openEditSaleModal('${id}')" title="កែប្រែ">
                        <i class="fi fi-rr-edit"></i>
                    </button>
                    <button class="btn btn-action btn-delete" onclick="deleteSaleRecord('${id}')" title="លុប">
                        <i class="fi fi-rr-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }
    tbody.innerHTML = html;

    // Update pagination UI
    const infoEl = document.getElementById('salesPaginationInfo');
    if (infoEl) {
        if (totalItems > 0) {
            infoEl.innerText = `បង្ហាញពី ${start + 1} ដល់ ${Math.min(end, totalItems)} នៃទិន្នន័យសរុប ${totalItems}`;
        } else {
            infoEl.innerText = "គ្មានទិន្នន័យ";
        }
    }
    renderPagination('salesPagination', totalPages, salesCurrentPage, (p) => {
        salesCurrentPage = p;
        renderSalesTable();
    });
}

function deleteSaleRecord(saleId) {
    if (!confirm("តើអ្នកពិតជាចង់លុបកំណត់ត្រាលក់នេះមែនទេ? ស្តុកនឹងត្រូវបានបង្វិលសងវិញ។")) return;

    const sale = salesData[saleId];
    if (!sale) return;

    const itemId = sale.itemId;
    const qty = parseInt(sale.quantity) || 0;

    // Restore Stock Logic
    if (itemId && inventoryData[itemId]) {
        const item = inventoryData[itemId];
        const currentStockOut = parseInt(item.stockOut) || 0;
        const newStockOut = Math.max(0, currentStockOut - qty); // Prevent negative

        inventoryRef.child(itemId).update({ stockOut: newStockOut });
    }

    // Remove Sale Record
    salesRef.child(saleId).remove()
        .then(() => {
            Swal.fire({
                icon: 'success',
                title: 'ជោគជ័យ!',
                text: 'លុបកំណត់ត្រាលក់ជោគជ័យ!',
                confirmButtonColor: '#e91e63',
                timer: 2000
            });
        })
        .catch(err => {
            Swal.fire({
                icon: 'error',
                title: 'កំហុស!',
                text: err.message,
                confirmButtonColor: '#e91e63'
            });
        });
}

/**
 * Open Edit Modal for Sale Record
 */
function openEditSaleModal(saleId) {
    const sale = salesData[saleId];
    if (!sale) return;

    document.getElementById('editSaleId').value = saleId;
    document.getElementById('editSaleItemId').value = sale.itemId || '';
    document.getElementById('editSaleOldQty').value = sale.quantity || 0;
    document.getElementById('editSaleItemNameDisplay').innerText = sale.itemName || 'Unknown Item';
    document.getElementById('editSaleDate').value = sale.soldDate || '';
    document.getElementById('editSaleQty').value = sale.quantity || 0;
    
    // Set Prices
    const khrPrice = sale.pricePerUnitKHR || Math.round((sale.pricePerUnit || 0) * exchangeRate);
    document.getElementById('editSalePriceKHR').value = khrPrice;
    document.getElementById('editSalePriceUSD').value = parseFloat(sale.totalPrice || 0).toFixed(2);
    
    document.getElementById('editSaleKeeper').value = sale.stockKeeper || '冯 老师';
    document.getElementById('editSaleNote').value = sale.note || '';

    const modalEl = document.getElementById('editSaleModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
}

/**
 * Update Sale Record and Adjust Stock
 */
function updateSaleRecord() {
    const saleId = document.getElementById('editSaleId').value;
    const itemId = document.getElementById('editSaleItemId').value;
    const oldQty = parseInt(document.getElementById('editSaleOldQty').value) || 0;
    
    const newQty = parseInt(document.getElementById('editSaleQty').value) || 0;
    const newDate = document.getElementById('editSaleDate').value;
    const unitPriceKHR = parseFloat(document.getElementById('editSalePriceKHR').value) || 0;
    const totalPriceUSD = parseFloat(document.getElementById('editSalePriceUSD').value) || 0;
    const unitPriceUSD = exchangeRate > 0 ? (unitPriceKHR / exchangeRate) : 0;
    
    const newKeeper = document.getElementById('editSaleKeeper').value;
    const newNote = document.getElementById('editSaleNote').value;

    if (newQty <= 0) {
        Swal.fire({
            icon: 'warning',
            title: 'កំហុស!',
            text: 'ចំនួនត្រូវតែធំជាង 0',
            confirmButtonColor: '#e91e63'
        });
        return;
    }

    const updates = {
        quantity: newQty,
        soldDate: newDate,
        pricePerUnit: unitPriceUSD,
        pricePerUnitKHR: unitPriceKHR,
        totalPrice: totalPriceUSD,
        stockKeeper: newKeeper,
        note: newNote,
        updatedAt: new Date().toISOString()
    };

    // 1. Update Sale Entry
    salesRef.child(saleId).update(updates).then(() => {
        // 2. Adjust Stock if Quantity Changed
        if (itemId && newQty !== oldQty) {
            const item = inventoryData[itemId];
            if (item) {
                const diff = newQty - oldQty;
                const currentStockOut = parseInt(item.stockOut) || 0;
                inventoryRef.child(itemId).update({
                    stockOut: currentStockOut + diff
                });
            }
        }

        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ!',
            text: 'កែប្រែកំណត់ត្រាលក់ជោគជ័យ!',
            timer: 2000,
            showConfirmButton: false
        });

        const modalEl = document.getElementById('editSaleModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }).catch(err => {
        Swal.fire({
            icon: 'error',
            title: 'កំហុស!',
            text: err.message,
            confirmButtonColor: '#e91e63'
        });
    });
}

function deleteAllSales() {
    if (Object.keys(salesData).length === 0) return alert("គ្មានទិន្នន័យសម្រាប់លុបទេ!");

    const confirmInput = prompt("តើអ្នកពិតជាចង់លុបប្រវត្តិលក់ *ទាំងអស់* មែនទេ? ស្តុកទាំងអស់នឹងត្រូវបានបង្វិលសងវិញ។\n\nវាយពាក្យ 'DELETE' ដើម្បីបញ្ជាក់:");
    if (confirmInput !== 'DELETE') return;

    // Process all sales to restore stock
    const updates = {};
    const stockRestorations = {}; // Map itemId -> qty to restore

    Object.entries(salesData).forEach(([saleId, sale]) => {
        // Mark sale for deletion
        updates[`sales/${saleId}`] = null;

        // Aggregate stock restoration
        const itemId = sale.itemId;
        const qty = parseInt(sale.quantity) || 0;

        if (itemId) {
            stockRestorations[itemId] = (stockRestorations[itemId] || 0) + qty;
        }
    });

    // Apply stock restorations
    Object.entries(stockRestorations).forEach(([itemId, qtyToRestore]) => {
        if (inventoryData[itemId]) {
            const currentStockOut = parseInt(inventoryData[itemId].stockOut) || 0;
            const newStockOut = Math.max(0, currentStockOut - qtyToRestore);

            // We can't put this in the same multi-path update easily because paths are different refs usually
            // but here we have refs. Let's just update directly.
            inventoryRef.child(itemId).update({ stockOut: newStockOut });
        }
    });

    // Delete all sales
    salesRef.remove()
        .then(() => alert("លុបប្រវត្តិទាំងអស់ជោគជ័យ!"))
        .catch(err => alert("កំហុស: " + err.message));
}

function setupEventListeners() {
    // Currency Toggle
    const currencySelector = document.getElementById('currencySelector');
    if (currencySelector) {
        currencySelector.addEventListener('change', (e) => {
            currentCurrency = e.target.value;
            renderInventoryTable();
            updateSummaryCards();
        });
    }

    const exchangeInput = document.getElementById('exchangeRate');
    if (exchangeInput) {
        exchangeInput.addEventListener('change', (e) => {
            exchangeRate = parseInt(e.target.value) || 4100;
            renderInventoryTable();
            updateSummaryCards();
        });
    }

    // Add Inventory Form
    const addForm = document.getElementById('addInventoryForm');
    if (addForm) {
        addForm.addEventListener('submit', handleAddInventory);
    }

    // Handle "Other" selection
    const nameSelect = document.getElementById('itemNameSelect');
    if (nameSelect) {
        nameSelect.addEventListener('change', function () {
            const otherContainer = document.getElementById('otherItemNameContainer');
            if (this.value === 'ផ្សេងៗ') {
                otherContainer.style.display = 'block';
                document.getElementById('otherItemNameInput').required = true;
            } else {
                otherContainer.style.display = 'none';
                document.getElementById('otherItemNameInput').required = false;
            }
        });
    }

    // Search with Debounce for Performance
    const searchInput = document.getElementById('inventorySearchInput');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                stockCurrentPage = 1;
                salesCurrentPage = 1;
                renderInventoryTable();
                renderSalesTable();
                updateSummaryCards(); // Ensure summary stays in sync with search if needed (optional)
            }, 250); // 250ms debounce
        });
    }

    // Edit Sale Form Listener
    const editSaleForm = document.getElementById('editSaleForm');
    if (editSaleForm) {
        editSaleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            updateSaleRecord();
        });
        
        // Setup Datepicker for Edit Sale
        flatpickr("#editSaleDate", {
            locale: "km",
            dateFormat: "d-m-Y",
            allowInput: true
        });

        // Live calculation for edit sale modal
        const eQty = document.getElementById('editSaleQty');
        const ePriceKHR = document.getElementById('editSalePriceKHR');
        const ePriceUSD = document.getElementById('editSalePriceUSD');

        const updateEditCalc = () => {
            const q = parseInt(eQty.value) || 0;
            const p = parseFloat(ePriceKHR.value) || 0;
            const totalUSD = exchangeRate > 0 ? (q * p / exchangeRate) : 0;
            ePriceUSD.value = totalUSD.toFixed(2);
        };

        if (eQty) eQty.addEventListener('input', updateEditCalc);
        if (ePriceKHR) ePriceKHR.addEventListener('input', updateEditCalc);
    }

    // Date/Today Button (Import)
    document.getElementById('todayBtn')?.addEventListener('click', () => {
        document.getElementById('importDate').value = getTodayKhmerFormat();
    });

    // Sell Stock Form
    const sellForm = document.getElementById('sellStockForm');
    if (sellForm) {
        sellForm.addEventListener('submit', handleSellStock);
    }

    // Sell Date/Today Button
    document.getElementById('todaySellBtn')?.addEventListener('click', () => {
        document.getElementById('sellDate').value = getTodayKhmerFormat();
    });

    // Calculate Sell Totals on Quantity Change
    // Calculate Sell Totals
    const sellQtyInput = document.getElementById('sellQuantity');
    const sellUnitPriceInput = document.getElementById('sellUnitPrice');
    const sellTotalUSDInput = document.getElementById('sellTotalPriceUSD');
    const sellTotalKHRInput = document.getElementById('sellTotalPriceKHR');

    const updateSellCalc = () => {
        const qty = parseInt(sellQtyInput.value) || 0;
        const unitPriceKHR = parseFloat(sellUnitPriceInput.value) || 0;

        const totalKHR = qty * unitPriceKHR;
        const totalUSD = exchangeRate > 0 ? (totalKHR / exchangeRate) : 0;

        // Update Totals
        sellTotalKHRInput.value = totalKHR.toLocaleString('en-US');
        sellTotalUSDInput.value = totalUSD.toFixed(2);
    };

    if (sellQtyInput) sellQtyInput.addEventListener('input', updateSellCalc);
    if (sellUnitPriceInput) sellUnitPriceInput.addEventListener('input', updateSellCalc);

    // Optional: Update KHR if Total USD is manually edited
    // (Disabled or updated since we primarily use KHR now)
    /*
    if (sellTotalUSDInput) {
        sellTotalUSDInput.addEventListener('input', function () {
            const total = parseFloat(this.value) || 0;
            sellTotalKHRInput.value = (total * exchangeRate).toLocaleString('en-US');
        });
    }
    */

    // Restock Modal Form
    const restockForm = document.getElementById('restockForm');
    if (restockForm) {
        restockForm.addEventListener('submit', handleRestock);
    }

    // Restock Date/Today Button
    document.getElementById('todayRestockBtn')?.addEventListener('click', () => {
        document.getElementById('restockDate').value = getTodayKhmerFormat();
    });

    // Transfer Form
    const transferForm = document.getElementById('transferForm');
    if (transferForm) {
        transferForm.addEventListener('submit', handleTransfer);
    }

    // Transfer Date/Today Button
    document.getElementById('transferTodayBtn')?.addEventListener('click', () => {
        document.getElementById('transferDate').value = getTodayKhmerFormat();
    });

    // Return Stock Form
    const returnForm = document.getElementById('returnStockForm');
    if (returnForm) {
        returnForm.addEventListener('submit', handleReturnStock);
    }

    // Return Date/Today Button
    document.getElementById('returnTodayBtn')?.addEventListener('click', () => {
        document.getElementById('returnDate').value = getTodayKhmerFormat();
    });
    // Edit Inventory Form
    const editForm = document.getElementById('editInventoryForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditInventory);
    }

    // Live calculation for edit summary
    ['editOldStock', 'editWarehouseIn', 'editOfficeIn', 'editStockOut'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', recalcEditSummary);
    });
}

// ==========================================
// CRUD OPERATIONS
// ==========================================

function handleAddInventory(e) {
    e.preventDefault();

    const nameSelect = document.getElementById('itemNameSelect');
    let name = nameSelect.value;
    if (name === 'ផ្សេងៗ') {
        name = document.getElementById('otherItemNameInput').value;
    }

    const qty = parseInt(document.getElementById('quantity').value) || 0;
    const oldStock = parseInt(document.getElementById('oldStock').value) || 0;
    const officeInitial = parseInt(document.getElementById('officeInitialStock').value) || 0;
    const stockKeeper = document.getElementById('stockKeeperName').value;

    const item = {
        itemName: name,
        supplierName: "",
        stockKeeper: stockKeeper,
        importDate: document.getElementById('importDate').value,

        // New Logic
        warehouseIn: qty,     // Initial Stock In (Warehouse)
        oldStock: oldStock,   // Old Stock
        officeIn: officeInitial, // Initial Office Stock
        stockOut: 0,          // Nothing sold yet

        unitCost: 0,
        sellingPrice: 0,
        notes: document.getElementById('itemNotes').value,
        createdAt: new Date().toISOString()
    };

    inventoryRef.push(item)
        .then(() => {
            Swal.fire({
                icon: 'success',
                title: 'ជោគជ័យ!',
                text: 'បញ្ចូលស្តុកជោគជ័យ!',
                confirmButtonColor: '#e91e63',
                timer: 2000
            });
            e.target.reset();
            const modalEl = document.getElementById('addInventoryModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
        })
        .catch(err => {
            Swal.fire({
                icon: 'error',
                title: 'កំហុស!',
                text: err.message,
                confirmButtonColor: '#e91e63'
            });
        });
}

// Open Restock Modal
function openRestockModal(id) {
    const item = inventoryData[id];
    if (!item) return;

    // Populate Modal
    document.getElementById('restockItemId').value = id;
    document.getElementById('restockItemNameDisplay').innerText = item.itemName;

    const warehouseIn = parseInt(item.warehouseIn) || parseInt(item.totalIn) || parseInt(item.quantity) || 0;
    const oldStock = parseInt(item.oldStock) || 0; // Include Old Stock
    const officeIn = parseInt(item.officeIn) || 0;
    const currentWarehouse = (warehouseIn + oldStock) - officeIn;
    document.getElementById('restockCurrentStockDisplay').value = currentWarehouse;

    document.getElementById('restockQuantity').value = '';
    document.getElementById('restockSupplier').value = item.supplierName || '';
    document.getElementById('restockUnitCost').value = item.unitCost || '';
    document.getElementById('restockNote').value = '';

    // Set Date Default
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    document.getElementById('restockDate').value = `${d}/${m}/${y}`;

    // Show Modal
    const modalEl = document.getElementById('restockModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function handleRestock(e) {
    e.preventDefault();
    const id = document.getElementById('restockItemId').value;
    const item = inventoryData[id];
    if (!item) return;

    const qty = parseInt(document.getElementById('restockQuantity').value);

    if (isNaN(qty) || qty <= 0) {
        alert("ចំនួនមិនត្រឹមត្រូវ!");
        return;
    }

    const currentWarehouseIn = parseInt(item.warehouseIn) || parseInt(item.totalIn) || parseInt(item.quantity) || 0;
    const newWarehouseIn = currentWarehouseIn + qty;

    const updates = {
        warehouseIn: newWarehouseIn,
        totalIn: newWarehouseIn // Keep for compatibility
    };

    const supplier = document.getElementById('restockSupplier').value;
    const unitCost = parseFloat(document.getElementById('restockUnitCost').value);
    const note = document.getElementById('restockNote').value;
    const dateStr = document.getElementById('restockDate').value;

    if (supplier) updates.supplierName = supplier;
    if (!isNaN(unitCost)) updates.unitCost = unitCost;
    if (note) updates.notes = (item.notes ? item.notes + '\n' : '') + `[Restock Warehouse ${dateStr}: +${qty}] ${note}`;

    inventoryRef.child(id).update(updates).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ!',
            text: 'បន្ថែមស្តុកជោគជ័យ!',
            confirmButtonColor: '#e91e63',
            timer: 2000
        });
        const modalEl = document.getElementById('restockModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
    });
}

// Open Transfer Modal
function openTransferModal(id) {
    const item = inventoryData[id];
    if (!item) return;

    const warehouseIn = parseInt(item.warehouseIn) || parseInt(item.totalIn) || parseInt(item.quantity) || 0;
    const oldStock = parseInt(item.oldStock) || 0;
    const officeIn = parseInt(item.officeIn) || 0;
    const currentWarehouse = (warehouseIn + oldStock) - officeIn;

    document.getElementById('transferItemId').value = id;
    document.getElementById('transferItemName').innerText = item.itemName;
    document.getElementById('transferWarehouseStock').value = currentWarehouse;
    document.getElementById('transferQty').value = '';
    document.getElementById('transferNote').value = '';

    // Set Date Default
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    document.getElementById('transferDate').value = `${d}/${m}/${y}`;

    const modalEl = document.getElementById('transferModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function handleTransfer(e) {
    e.preventDefault();
    const id = document.getElementById('transferItemId').value;
    const item = inventoryData[id];
    if (!item) return;

    const qty = parseInt(document.getElementById('transferQty').value) || 0;
    const warehouseIn = parseInt(item.warehouseIn) || parseInt(item.totalIn) || parseInt(item.quantity) || 0;
    const oldStock = parseInt(item.oldStock) || 0;
    const officeIn = parseInt(item.officeIn) || 0;
    const currentWarehouse = (warehouseIn + oldStock) - officeIn;

    if (qty <= 0 || qty > currentWarehouse) {
        alert("ចំនួនផ្ទេរមិនត្រឹមត្រូវ ឬលើសពីស្តុកក្នុងឃ្លាំង!");
        return;
    }

    const newOfficeIn = officeIn + qty;
    const note = document.getElementById('transferNote').value;
    const dateStr = document.getElementById('transferDate').value;

    const updates = {
        officeIn: newOfficeIn
    };
    const logEntry = `[Transfer -> Office ${dateStr}: ${qty}] ${note}`;
    updates.notes = (item.notes ? item.notes + '\n' : '') + logEntry;

    inventoryRef.child(id).update(updates).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ!',
            text: 'ផ្ទេរស្តុកទៅការិយាល័យបានជោគជ័យ!',
            confirmButtonColor: '#e91e63',
            timer: 2000
        });
        const modalEl = document.getElementById('transferModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
    });
}

// Open Return Modal
function openReturnModal(id) {
    const item = inventoryData[id];
    if (!item) return;

    const warehouseIn = parseInt(item.warehouseIn) || parseInt(item.totalIn) || parseInt(item.quantity) || 0;
    const oldStock = parseInt(item.oldStock) || 0;
    const officeIn = parseInt(item.officeIn) || 0;
    const stockOut = parseInt(item.stockOut) || 0; // Sold

    // Items effectively IN the office (Transferred In - Sold)
    const currentOffice = Math.max(0, officeIn - stockOut);

    document.getElementById('returnItemId').value = id;
    document.getElementById('returnItemName').innerText = item.itemName;
    document.getElementById('returnOfficeStock').value = currentOffice;
    document.getElementById('returnQty').value = '';
    document.getElementById('returnNote').value = '';

    // Set Date Default
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    document.getElementById('returnDate').value = `${d}/${m}/${y}`;

    const modalEl = document.getElementById('returnStockModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function handleReturnStock(e) {
    e.preventDefault();
    const id = document.getElementById('returnItemId').value;
    const item = inventoryData[id];
    if (!item) return;

    const qty = parseInt(document.getElementById('returnQty').value) || 0;
    const officeIn = parseInt(item.officeIn) || 0;
    const stockOut = parseInt(item.stockOut) || 0;
    const currentOffice = Math.max(0, officeIn - stockOut);

    if (qty <= 0 || qty > currentOffice) {
        alert("ចំនួនត្រឡប់មិនត្រឹមត្រូវ ឬលើសពីស្តុកនៅការិយាល័យ!");
        return;
    }

    // Returning to warehouse means DECREASING the 'officeIn' count
    // Because officeIn represents "Total transferred FROM warehouse TO office"
    // So if we return, we are effectively un-transferring.
    const newOfficeIn = Math.max(0, officeIn - qty);

    const note = document.getElementById('returnNote').value;
    const dateStr = document.getElementById('returnDate').value;

    const updates = {
        officeIn: newOfficeIn
    };
    const logEntry = `[Return <- Warehouse ${dateStr}: ${qty}] ${note}`;
    updates.notes = (item.notes ? item.notes + '\n' : '') + logEntry;

    inventoryRef.child(id).update(updates).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ!',
            text: 'ត្រឡប់ស្តុកចូលឃ្លាំងបានជោគជ័យ!',
            confirmButtonColor: '#e91e63',
            timer: 2000
        });
        const modalEl = document.getElementById('returnStockModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
    });
}

// Open Sell Modal
function openSellModal(id) {
    itemToSellId = id;
    const item = inventoryData[id];
    if (!item) return;

    // Calculate current office stock
    const officeIn = parseInt(item.officeIn) || 0;
    const stockOut = parseInt(item.stockOut) || 0;
    const currentOffice = officeIn - stockOut;

    document.getElementById('sellItemId').value = id;
    document.getElementById('sellItemNameDisplay').innerText = item.itemName;
    document.getElementById('currentStockDisplay').value = currentOffice;
    document.getElementById('sellQuantity').value = '';
    const unitPriceKHR = Math.round(parseFloat(item.sellingPrice || 0) * exchangeRate);
    document.getElementById('sellUnitPrice').value = unitPriceKHR || '';
    document.getElementById('sellTotalPriceUSD').value = '0.00';
    document.getElementById('sellTotalPriceKHR').value = '0';
    document.getElementById('sellStockKeeper').value = item.stockKeeper || ''; // Default to item's keeper
    document.getElementById('sellNote').value = '';

    // Set Date Default
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    document.getElementById('sellDate').value = `${d}/${m}/${y}`;

    // Show Modal
    const modalEl = document.getElementById('sellStockModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function handleSellStock(e) {
    e.preventDefault();
    const id = document.getElementById('sellItemId').value;
    const item = inventoryData[id];
    if (!item) return;

    const qty = parseInt(document.getElementById('sellQuantity').value);
    const keeper = document.getElementById('sellStockKeeper').value;
    const note = document.getElementById('sellNote').value;
    const dateStr = document.getElementById('sellDate').value;

    // Calculate current office stock
    const officeIn = parseInt(item.officeIn) || 0;
    const stockOut = parseInt(item.stockOut) || 0;
    const currentOffice = officeIn - stockOut;

    if (isNaN(qty) || qty <= 0) {
        alert("ចំនួនមិនត្រឹមត្រូវ!");
        return;
    }

    if (qty > currentOffice) {
        alert(`ស្តុកការិយាល័យមិនគ្រប់គ្រាន់! នៅសល់តែ ${currentOffice} ប៉ុណ្ណោះ។ សូមផ្ទេរស្តុកពីឃ្លាំងជាមុនសិន។`);
        return;
    }

    const unitPriceKHR = parseFloat(document.getElementById('sellUnitPrice').value) || 0;
    const totalPriceUSD = parseFloat(document.getElementById('sellTotalPriceUSD').value) || 0;
    const unitPriceUSD = exchangeRate > 0 ? (unitPriceKHR / exchangeRate) : 0;

    // Process Sale
    const newStockOut = stockOut + qty;

    // Log Sale
    const saleRecord = {
        itemId: id,
        itemName: item.itemName,
        quantity: qty,
        soldAt: new Date().toISOString(),
        soldDate: dateStr, // User input date
        totalPrice: totalPriceUSD,
        pricePerUnit: unitPriceUSD,
        pricePerUnitKHR: unitPriceKHR, // Save the original KHR input
        stockKeeper: keeper,
        note: note,
        currency: 'USD',
        exchangeRate: exchangeRate // Capture the rate used
    };

    // Atomic update
    inventoryRef.child(id).update({ stockOut: newStockOut });
    salesRef.push(saleRecord).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ!',
            text: 'លក់ចេញជោគជ័យ!',
            confirmButtonColor: '#e91e63',
            timer: 2000
        });
        // Hide Modal
        const modalEl = document.getElementById('sellStockModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
    });
}

function deleteItem(id) {
    if (confirm("តើអ្នកពិតជាចង់លុបទិន្នន័យនេះមែនទេ?")) {
        inventoryRef.child(id).remove();
    }
}

// ==========================================
// EDIT INVENTORY
// ==========================================

function openEditModal(id) {
    const item = inventoryData[id];
    if (!item) return;

    // Set hidden ID
    document.getElementById('editItemId').value = id;

    // Display item name in banner
    const nameDisplay = document.getElementById('editItemNameDisplay');
    if (nameDisplay) nameDisplay.textContent = item.itemName || '...';

    // Text fields - use .value (safe, no HTML injection)
    document.getElementById('editItemName').value = item.itemName || '';
    document.getElementById('editStockKeeper').value = item.stockKeeper || '';
    document.getElementById('editImportDate').value = item.importDate || '';
    document.getElementById('editSupplierName').value = item.supplierName || '';
    document.getElementById('editNote').value = item.notes || '';

    // Number fields
    document.getElementById('editUnitCost').value = item.unitCost || '';
    document.getElementById('editSellingPrice').value = item.sellingPrice || '';

    // Stock fields (with legacy fallbacks)
    document.getElementById('editOldStock').value = parseInt(item.oldStock) || 0;
    document.getElementById('editWarehouseIn').value = parseInt(item.warehouseIn) || parseInt(item.totalIn) || parseInt(item.quantity) || 0;
    document.getElementById('editOfficeIn').value = parseInt(item.officeIn) || 0;
    document.getElementById('editStockOut').value = parseInt(item.stockOut) || 0;

    // Calculate summary
    recalcEditSummary();

    // Show modal
    const modalEl = document.getElementById('editInventoryModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function recalcEditSummary() {
    const oldStock = parseInt(document.getElementById('editOldStock').value) || 0;
    const warehouseIn = parseInt(document.getElementById('editWarehouseIn').value) || 0;
    const officeIn = parseInt(document.getElementById('editOfficeIn').value) || 0;
    const stockOut = parseInt(document.getElementById('editStockOut').value) || 0;

    const totalReceived = warehouseIn + oldStock;
    const currentWarehouse = Math.max(0, totalReceived - officeIn);
    const currentOffice = Math.max(0, officeIn - stockOut);
    const totalRemaining = currentWarehouse + currentOffice;

    document.getElementById('editCalcWarehouse').innerText = currentWarehouse;
    document.getElementById('editCalcOffice').innerText = currentOffice;
    document.getElementById('editCalcRemaining').innerText = totalRemaining;
    document.getElementById('editCalcTotalIn').innerText = totalReceived;
}

function handleEditInventory(e) {
    e.preventDefault();
    const id = document.getElementById('editItemId').value;
    if (!id) return;

    const itemName = document.getElementById('editItemName').value.trim();
    if (!itemName) {
        alert("សូមបញ្ចូលឈ្មោះទំនិញ!");
        return;
    }

    const updates = {
        itemName: itemName,
        stockKeeper: document.getElementById('editStockKeeper').value,
        importDate: document.getElementById('editImportDate').value,
        supplierName: document.getElementById('editSupplierName').value,
        notes: document.getElementById('editNote').value,
        unitCost: parseFloat(document.getElementById('editUnitCost').value) || 0,
        sellingPrice: parseFloat(document.getElementById('editSellingPrice').value) || 0,
        oldStock: parseInt(document.getElementById('editOldStock').value) || 0,
        warehouseIn: parseInt(document.getElementById('editWarehouseIn').value) || 0,
        officeIn: parseInt(document.getElementById('editOfficeIn').value) || 0,
        stockOut: parseInt(document.getElementById('editStockOut').value) || 0,
        totalIn: parseInt(document.getElementById('editWarehouseIn').value) || 0
    };

    inventoryRef.child(id).update(updates).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ!',
            text: 'កែប្រែទិន្នន័យជោគជ័យ!',
            confirmButtonColor: '#e91e63',
            timer: 2000
        });
        const modalEl = document.getElementById('editInventoryModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }).catch(err => {
        Swal.fire({
            icon: 'error',
            title: 'កំហុស!',
            text: err.message,
            confirmButtonColor: '#e91e63'
        });
    });
}

// ==========================================
// RENDER FUNCTIONS
// ==========================================

function renderInventoryTable() {
    const tbody = document.getElementById('currentStockTableBody');
    if (!tbody) return;

    const searchTerm = document.getElementById('inventorySearchInput')?.value.toLowerCase() || '';
    const allItems = Object.entries(inventoryData);
    
    // Filter
    const filteredItems = allItems.filter(([id, item]) => {
        if (!searchTerm) return true;
        return item.itemName.toLowerCase().includes(searchTerm);
    });

    // Pagination
    const totalItems = filteredItems.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    if (stockCurrentPage > totalPages) stockCurrentPage = totalPages;

    const start = (stockCurrentPage - 1) * pageSize;
    const end = start + pageSize;
    const items = filteredItems.slice(start, end);
    
    let html = '';
    let index = start + 1;

    for (const [id, item] of items) {
        if (searchTerm && !item.itemName.toLowerCase().includes(searchTerm)) continue;

        const warehouseIn = parseInt(item.warehouseIn) || parseInt(item.totalIn) || parseInt(item.quantity) || 0;
        const oldStock = parseInt(item.oldStock) || 0;
        const officeIn = parseInt(item.officeIn) || 0;
        const stockOut = parseInt(item.stockOut) || 0;

        const totalReceived = warehouseIn + oldStock;
        const currentWarehouse = Math.max(0, totalReceived - officeIn);
        const currentOffice = Math.max(0, officeIn - stockOut);
        const totalRemaining = currentWarehouse + currentOffice;

        const stockKeeper = item.stockKeeper || '-';
        const importDate = item.importDate || formatDate(item.createdAt) || '-';

        html += `
            <tr>
                <td class="ps-4 text-muted">${index++}</td>
                <td class="text-center text-muted fw-bold">${oldStock > 0 ? oldStock : '-'}</td>
                <td class="fw-bold text-dark">${item.itemName}</td>
                <td class="small text-muted">${importDate}</td>
                <td class="text-center"><span class="badge bg-secondary" style="font-size: 0.9rem;">${currentWarehouse}</span></td>
                <td class="text-center"><span class="badge bg-primary" style="font-size: 0.9rem;">${currentOffice}</span></td>
                <td class="text-center"><span class="badge bg-danger" style="font-size: 0.9rem;">${stockOut}</span></td>
                <td class="text-center"><span class="badge bg-success" style="font-size: 1rem;">${totalRemaining}</span></td>
                <td class="text-secondary small fw-bold">${stockKeeper}</td>
                <td class="text-center pe-4">
                    <button class="btn btn-action btn-add-stock" onclick="openRestockModal('${id}')" title="ចូលឃ្លាំង (+)">
                        <i class="fi fi-rr-plus"></i>
                    </button>
                    <button class="btn btn-action btn-info text-white" onclick="openTransferModal('${id}')" title="ផ្ទេរទៅការិយាល័យ (->)">
                        <i class="fi fi-rr-exchange-alt"></i>
                    </button>
                    <button class="btn btn-action btn-secondary text-white" onclick="openReturnModal('${id}')" title="ត្រឡប់ចូលឃ្លាំង (<-)">
                        <i class="fi fi-rr-undo"></i>
                    </button>
                    <button class="btn btn-action btn-sell-stock" onclick="openSellModal('${id}')" title="លក់ចេញពីការិយាល័យ (-)">
                        <i class="fi fi-rr-minus"></i>
                    </button>
                    <button class="btn btn-action btn-warning text-dark" onclick="openEditModal('${id}')" title="កែប្រែ (Edit)">
                        <i class="fi fi-rr-edit"></i>
                    </button>
                    <button class="btn btn-action btn-delete" onclick="deleteItem('${id}')" title="លុប">
                        <i class="fi fi-rr-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }
    tbody.innerHTML = html;

    // Update pagination UI
    const infoEl = document.getElementById('stockPaginationInfo');
    if (infoEl) {
        if (totalItems > 0) {
            infoEl.innerText = `បង្ហាញពី ${start + 1} ដល់ ${Math.min(end, totalItems)} នៃទិន្នន័យសរុប ${totalItems}`;
        } else {
            infoEl.innerText = "គ្មានទិន្នន័យ";
        }
    }
    renderPagination('stockPagination', totalPages, stockCurrentPage, (p) => {
        stockCurrentPage = p;
        renderInventoryTable();
    });
}

/**
 * Generic Pagination Renderer
 */
function renderPagination(containerId, totalPages, currentPage, onPageClick) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Previous Button
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link shadow-sm border-0 rounded-start" href="#" onclick="event.preventDefault(); ${currentPage > 1 ? `window.paginationCallback('${containerId}', ${currentPage - 1})` : ''}">
                <i class="fi fi-rr-angle-small-left"></i>
            </a>
        </li>
    `;

    // Page Numbers (Simplified logic: show first, current, last, and neighbors)
    const range = 2;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link shadow-sm border-0 ${i === currentPage ? 'bg-primary text-white' : 'bg-light text-dark'}" href="#" onclick="event.preventDefault(); window.paginationCallback('${containerId}', ${i})">${i}</a>
                </li>
            `;
        } else if (i === currentPage - range - 1 || i === currentPage + range + 1) {
            html += `<li class="page-item disabled"><span class="page-link border-0 bg-transparent text-muted">...</span></li>`;
        }
    }

    // Next Button
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link shadow-sm border-0 rounded-end" href="#" onclick="event.preventDefault(); ${currentPage < totalPages ? `window.paginationCallback('${containerId}', ${currentPage + 1})` : ''}">
                <i class="fi fi-rr-angle-small-right"></i>
            </a>
        </li>
    `;

    container.innerHTML = html;

    // We need a global bridge for the onclicks if callbacks are dynamic
    window.paginationCallbacks = window.paginationCallbacks || {};
    window.paginationCallbacks[containerId] = onPageClick;
}

// Global Callback Bridge
window.paginationCallback = (containerId, page) => {
    if (window.paginationCallbacks && window.paginationCallbacks[containerId]) {
        window.paginationCallbacks[containerId](page);
        // Scroll back to table top for UX
        const table = document.getElementById(containerId === 'stockPagination' ? 'inventoryTable' : 'salesTable');
        if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

function updateSummaryCards() {
    let statTotalIn = 0;
    let statTotalOut = 0;
    let totalItems = 0; // Remaining
    let totalVal = 0;

    Object.values(inventoryData).forEach(item => {
        // Use the same robust parsing as renderInventoryTable
        const warehouseIn = parseInt(item.warehouseIn) || parseInt(item.totalIn) || parseInt(item.quantity) || 0;
        const oldStock = parseInt(item.oldStock) || 0;
        const stockOut = parseInt(item.stockOut) || 0;

        const totalReceived = warehouseIn + oldStock;
        const remaining = totalReceived - stockOut;

        statTotalIn += totalReceived;
        statTotalOut += stockOut;
        totalItems += remaining;
        totalVal += (remaining * (parseFloat(item.unitCost) || 0));
    });

    if (document.getElementById('totalItems')) document.getElementById('totalItems').innerText = totalItems;
    if (document.getElementById('statTotalIn')) document.getElementById('statTotalIn').innerText = statTotalIn;
    if (document.getElementById('statTotalOut')) document.getElementById('statTotalOut').innerText = statTotalOut;
    if (document.getElementById('totalCost')) document.getElementById('totalCost').innerText = formatMoney(totalVal);
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

function getFilteredData(category, period) {
    let targetDate = new Date();
    const reportDateInput = document.getElementById('reportDate').value;
    
    if (reportDateInput) {
        // Parse gracefully supporting both YYYY-MM-DD and DD-MM-YYYY
        const parts = reportDateInput.split('-').map(Number);
        if (parts[0] > 31) { // YYYY-MM-DD
            targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
        } else { // DD-MM-YYYY
            targetDate = new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }
    
    const currentMonth = targetDate.getMonth();
    const currentYear = targetDate.getFullYear();
    const currentDay = targetDate.getDate();

    let data = [];
    let dateField = '';

    if (category === 'stockOut') {
        data = Object.values(salesData);
        dateField = 'soldAt'; // ISO format
    } else {
        // inventory or stockIn
        data = Object.values(inventoryData);
        dateField = 'importDate'; // DD/MM/YYYY text format
    }

    if (period === 'all') return data;

    return data.filter(item => {
        let itemDate;
        
        // 1. Identify valid date source
        // For Sales: Prioritize 'soldDate' (format DD/MM/YYYY) then 'soldAt' (ISO)
        // For Inventory: Prioritize 'importDate' (format DD/MM/YYYY) then 'createdAt' (ISO)
        let rawDate = (category === 'stockOut') ? (item.soldDate || item.soldAt) : (item.importDate || item.createdAt);
        if (!rawDate) return false;

        // 2. Parse the date robustly
        if (typeof rawDate === 'string' && rawDate.includes('/')) {
            // Handle DD/MM/YYYY
            const parts = rawDate.split('/');
            if (parts.length === 3) {
                itemDate = new Date(parts[2], parts[1] - 1, parts[0]);
            }
        } else if (typeof rawDate === 'string' && rawDate.includes('-')) {
            // Handle DD-MM-YYYY or YYYY-MM-DD
            const parts = rawDate.split('-');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    itemDate = new Date(parts[0], parts[1] - 1, parts[2]);
                } else {
                    itemDate = new Date(parts[2], parts[1] - 1, parts[0]);
                }
            }
        }
        
        if (!itemDate || isNaN(itemDate.getTime())) {
            // Handle ISO or other formats
            itemDate = new Date(rawDate);
        }

        if (isNaN(itemDate.getTime())) return false;

        // 3. Compare components (Local Time)
        const iDay = itemDate.getDate();
        const iMonth = itemDate.getMonth();
        const iYear = itemDate.getFullYear();

        if (period === 'daily') {
            return iDay === currentDay && iMonth === currentMonth && iYear === currentYear;
        } else if (period === 'monthly') {
            return iMonth === currentMonth && iYear === currentYear;
        }
        return true;
    });
}

async function exportToPDF() {
    const category = document.getElementById('reportCategory').value;
    const period = document.getElementById('exportType').value;

    let title = "របាយការណ៍ស្តុកសរុប (Global Inventory Report)";
    if (category === 'stockIn') title = "របាយការណ៍ស្តុកចូល (Stock In Report)";
    else if (category === 'stockOut') title = "របាយការណ៍លក់ទំនិញ (Sales Report)";

    const filteredData = getFilteredData(category, period);

    if (filteredData.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'គ្មានទិន្នន័យ!',
            text: 'គ្មានទិន្នន័យសម្រាប់បោះពុម្ព (No data to export)',
            confirmButtonColor: '#e91e63',
            confirmButtonText: 'យល់ព្រម'
        });
        return;
    }

    // Helper for English Date DDD-MMMM-YYYY
    const getEnglishFormattedDate = () => {
        let d = new Date();
        const reportDateInput = document.getElementById('reportDate').value;
        if (reportDateInput) {
            const parts = reportDateInput.split('-').map(Number);
            if (parts[0] > 31) { // YYYY-MM-DD
                d = new Date(parts[0], parts[1] - 1, parts[2]);
            } else { // DD-MM-YYYY
                d = new Date(parts[2], parts[1] - 1, parts[0]);
            }
        }
        
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        if (period === 'monthly') {
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return `${mm}/${d.getFullYear()}`;
        } else if (period === 'daily') {
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return `${dd}/${mm}/${d.getFullYear()}`;
        }
        return "All History";
    };

    // Helper for Khmer Date
    const getKhmerFullDate = () => {
        let now = new Date();
        const reportDateInput = document.getElementById('reportDate').value;
        if (reportDateInput) {
            const parts = reportDateInput.split('-').map(Number);
            if (parts[0] > 31) { // YYYY-MM-DD
                now = new Date(parts[0], parts[1] - 1, parts[2]);
            } else { // DD-MM-YYYY
                now = new Date(parts[2], parts[1] - 1, parts[0]);
            }
        }

        const months = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
        const khmerNumbers = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
        const toKhmerNum = (num) => String(num).split('').map(n => khmerNumbers[parseInt(n)] || n).join('');
        
        if (period === 'monthly') {
            return `ខែ ${months[now.getMonth()]} ឆ្នាំ ${toKhmerNum(now.getFullYear())}`;
        }
        return `ថ្ងៃទី ${toKhmerNum(now.getDate())} ខែ ${months[now.getMonth()]} ឆ្នាំ ${toKhmerNum(now.getFullYear())}`;
    };

    let win = window.open('', '_blank');
    let html = `<html><head><title>${title}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
        <style>
             @font-face {
                font-family: 'Kantumruy Pro';
                src: url('fonts/KantumruyPro-Regular.woff2') format('woff2'),
                     url('fonts/KantumruyPro-Regular.ttf') format('truetype');
            }
            body { font-family: 'Kantumruy Pro', sans-serif; padding: 20px; color: #333; line-height: 1.6; }
            .report-title { text-align: center; margin: 0 0 30px 0; padding: 20px 10px; border-bottom: 2px double #8a0e5b; position: relative; }
            .report-title h3 { font-size: 28px; color: rgb(138, 14, 91); margin: 0 0 10px 0; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            .report-title .date-info { font-size: 1.1rem; color: #444; margin-bottom: 8px; font-weight: 500; }
            .report-title .meta-info { font-size: 0.95rem; color: #666; background: #fef2f2; display: inline-block; padding: 5px 20px; border-radius: 50px; border: 1px solid #fee2e2; }
            .report-title .meta-info span { color: #8a0e5b; font-weight: bold; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; background: transparent; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th, td { border: 1px solid #999; padding: 10px; text-align: center; background: transparent; }
            th { background-color: rgb(138, 14, 91); color: white; font-weight: bold; border-color: rgb(138, 14, 91); }
            tr:nth-child(even) { background-color: rgba(250, 250, 250, 0.3); }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .fw-bold { font-weight: bold; }
            .price-col { color: #2e7d32; font-weight: bold; }
            
            .summary-box { margin-top: 25px; padding: 20px; border-radius: 12px; border: 1px solid #8a0e91; background: rgba(138, 14, 145, 0.03); page-break-inside: avoid; }
            .summary-box h4 { margin: 0 0 15px 0; color: rgb(138, 14, 91); font-size: 1.1rem; border-bottom: 2px solid rgba(138, 14, 91, 0.1); padding-bottom: 8px; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .summary-item { text-align: center; padding: 10px; background: white; border-radius: 8px; border: 1px dashed #ccc; }
            .summary-label { font-size: 0.85rem; color: #666; display: block; margin-bottom: 5px; font-weight: bold; }
            .summary-value { font-size: 16px; font-weight: bold; color: rgb(138, 14, 91); }

            .footer-date { text-align: right; margin-top: 50px; font-style: italic; font-weight: bold; color: #555; }
            .footer-signatures { margin-top: 30px; display: flex; justify-content: space-between; margin-bottom: 50px; page-break-inside: avoid; }
            .sig-box { text-align: center; width: 23%; padding: 10px; }
            .sig-name { margin-top: 80px; font-weight: bold; border-top: 2px solid #333; padding-top: 8px; font-size: 1.1rem; }
            
            .school-footer {
                margin-top: 60px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                text-align: center;
                color: #666;
                font-size: 0.9rem;
            }
            .school-footer h4 { margin: 0; color: rgb(138, 14, 91); font-size: 1.2rem; }
            .school-footer p { margin: 5px 0; }

            /* Watermark Style */
            .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                opacity: 0.08;
                width: 500px;
                height: 500px;
                z-index: -1000;
                pointer-events: none;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .watermark img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            
            .action-bar { position: fixed; top: 20px; left: 40px; right: 40px; display: flex; justify-content: space-between; z-index: 1000; }
            .btn { padding: 10px 20px; border: none; border-radius: 50px; cursor: pointer; font-family: inherit; font-weight: bold; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
            .btn-print { background: rgb(138, 14, 91); color: white; }
            .btn-home { background: #6c757d; color: white; text-decoration: none; }

            @media print {
                @page { size: landscape; margin: 15mm; }
                .no-print { display: none !important; }
                body { padding: 0 !important; }
            }
        </style>
    </head><body>
    
    <div class="watermark">
        <img src="/img/1.jpg">
    </div>

    <div class="action-bar no-print">
        <button class="btn btn-home" onclick="window.close()">
            <i class="fi fi-rr-home"></i> ត្រឡប់ទៅផ្ទាំងដើម (Back Home)
        </button>
        <button class="btn btn-print" onclick="window.print()">
            <i class="fi fi-rr-print"></i> បោះពុម្ពរបាយការណ៍ (Print Report)
        </button>
    </div>

    <div class="report-title">
        <h3>${title}</h3>
        <div class="date-info">
            កាលបរិច្ឆេទ: <span class="fw-bold text-dark">${getKhmerFullDate()}</span> (${getEnglishFormattedDate()})
        </div>
        <div class="meta-info">
            ប្រភេទ: <span>${period === 'daily' ? "ប្រចាំថ្ងៃ" : (period === 'monthly' ? "ប្រចាំខែ" : "ទាំងអស់")}</span> | 
            កាន់ស្តុកដោយ: <span>${localStorage.getItem('userName') || '冯 老师'}</span>
        </div>
    </div>

    <table>
        <thead>
            <tr>
               ${category === 'stockOut' ?
            `<th>ល.រ</th>
                  <th>កាលបរិច្ឆេទ</th>
                  <th>ឈ្មោះទំនិញ</th>
                  <th>ចំនួនលក់</th>
                  <th>តម្លៃរាយ (៛)</th>
                  <th>តម្លៃ ($)</th>
                  <th>សរុប ($)</th>
                  <th>សរុប (៛)</th>
                  <th>អ្នកកាន់ស្តុក</th>`
            :
            `<th>ល.រ</th>
                  <th class="text-left">ឈ្មោះទំនិញ</th>
                  <th>ស្តុកចាស់</th>
                  <th>ថ្ងៃនាំចូល</th>
                  <th>ឃ្លាំង</th>
                  <th>អូហ្វីស</th>
                  <th>លក់ចេញ</th>
                  <th class="fw-bold">សរុបគ្រាប់</th>
                  <th>តម្លៃរាយ (៛)</th>
                  <th>សរុប ($)</th>
                  <th>សរុប (៛)</th>`
        }
            </tr>
        </thead>
        <tbody>
        ${filteredData.map((item, index) => {
            if (category === 'stockOut') {
                const totalUSD = parseFloat(item.totalPrice) || 0;
                const totalKHR = totalUSD * exchangeRate;
                const unitPriceKHR = item.pricePerUnitKHR || (item.pricePerUnit * exchangeRate) || 0;
                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.soldDate || '-'}</td>
                        <td class="text-left fw-bold">${item.itemName}</td>
                        <td class="fw-bold">${item.quantity}</td>
                        <td>${Math.round(unitPriceKHR).toLocaleString()} ៛</td>
                        <td>$${parseFloat(item.pricePerUnit || 0).toFixed(2)}</td>
                        <td class="price-col">$${totalUSD.toFixed(2)}</td>
                        <td class="price-col text-primary">${Math.round(totalKHR).toLocaleString()} ៛</td>
                        <td>${item.stockKeeper || '-'}</td>
                    </tr>`;
            } else {
                const warehouseIn = parseInt(item.warehouseIn) || parseInt(item.totalIn) || parseInt(item.quantity) || 0;
                const oldStock = parseInt(item.oldStock) || 0;
                const officeIn = parseInt(item.officeIn) || 0;
                const stockOut = parseInt(item.stockOut) || 0;

                const totalReceived = warehouseIn + oldStock;
                const currentWarehouse = Math.max(0, totalReceived - officeIn);
                const currentOffice = Math.max(0, officeIn - stockOut);

                const totalRemaining = currentWarehouse + currentOffice;
                const importDate = item.importDate || formatDate(item.createdAt) || '-';

                const unitPriceUSD = parseFloat(item.sellingPrice || 0);
                const unitPriceKHR = Math.round(unitPriceUSD * exchangeRate);
                const totalValUSD = totalRemaining * unitPriceUSD;
                const totalValKHR = totalRemaining * unitPriceKHR;

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td class="text-left fw-bold">${item.itemName}</td>
                        <td>${oldStock > 0 ? oldStock : '-'}</td>
                        <td>${importDate}</td>
                        <td>${currentWarehouse}</td>
                        <td>${currentOffice}</td>
                        <td>${stockOut}</td>
                        <td class="fw-bold">${totalRemaining}</td>
                        <td>${unitPriceKHR.toLocaleString()} ៛</td>
                        <td class="price-col">$${totalValUSD.toFixed(2)}</td>
                        <td class="price-col">${totalValKHR.toLocaleString()} ៛</td>
                    </tr>`;
            }
        }).join('')}
        
        <!-- Grand Total Row -->
        ${(() => {
            if (category === 'stockOut') {
                let grandTotalUSD = filteredData.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
                let grandTotalQty = filteredData.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
                let grandTotalKHR = grandTotalUSD * exchangeRate;
                return `
                    <tr style="background: rgb(138, 14, 91); font-weight: bold; color: white;">
                        <td colspan="3" class="text-right" style="padding: 12px;">សរុបរួម (Grand Total):</td>
                        <td style="padding: 12px; font-size: 15px;">${grandTotalQty}</td>
                        <td style="padding: 12px;">-</td>
                        <td style="padding: 12px;">-</td>
                        <td class="text-white" style="padding: 12px; font-size: 15px; color: white !important;">$${grandTotalUSD.toFixed(2)}</td>
                        <td class="text-white" style="padding: 12px; font-size: 15px; color: white !important;">${Math.round(grandTotalKHR).toLocaleString()} ៛</td>
                        <td style="padding: 12px;">-</td>
                    </tr>`;
            } else {
                let tOld = 0, tWh = 0, tOff = 0, tOut = 0, tTotal = 0, tValUSD = 0;
                filteredData.forEach(item => {
                    const warehouseIn = parseInt(item.warehouseIn) || parseInt(item.totalIn) || parseInt(item.quantity) || 0;
                    const oldStock = parseInt(item.oldStock) || 0;
                    const officeIn = parseInt(item.officeIn) || 0;
                    const stockOut = parseInt(item.stockOut) || 0;

                    const totalReceived = warehouseIn + oldStock;
                    const currentWarehouse = Math.max(0, totalReceived - officeIn);
                    const currentOffice = Math.max(0, officeIn - stockOut);
                    const totalRemaining = currentWarehouse + currentOffice;

                    tOld += oldStock;
                    tWh += currentWarehouse;
                    tOff += currentOffice;
                    tOut += stockOut;
                    tTotal += totalRemaining;
                    tValUSD += (totalRemaining * (parseFloat(item.sellingPrice) || 0));
                });
                const tValKHR = tValUSD * exchangeRate;

                return `
                    <tr style="background: rgb(138, 14, 91); font-weight: bold; color: white;">
                        <td colspan="2" class="text-right" style="padding: 12px;">សរុបរួម (Grand Total):</td>
                        <td style="padding: 12px;">${tOld}</td>
                        <td style="padding: 12px;">-</td>
                        <td style="padding: 12px;">${tWh}</td>
                        <td style="padding: 12px;">${tOff}</td>
                        <td style="padding: 12px;">${tOut}</td>
                        <td style="padding: 12px; font-size: 15px;">${tTotal}</td>
                        <td style="padding: 12px;">-</td>
                        <td class="text-white" style="padding: 12px; font-size: 15px; color: white !important;">$${tValUSD.toFixed(2)}</td>
                        <td class="text-white" style="padding: 12px; font-size: 15px; color: white !important;">${Math.round(tValKHR).toLocaleString()} ៛</td>
                    </tr>`;
            }
        })()}

        </tbody>
    </table>

    ${(() => {
            if (category === 'stockOut') {
                let grandTotalUSD = filteredData.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
                let grandTotalQty = filteredData.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
                return `
                <div class="summary-box">
                    <h4><i class="fi fi-rr-checkhart-histogram me-2"></i> សង្ខេបការលក់សរុប (Grand Summary)</h4>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-label">ចំនួនលក់សរុប (Total Sold)</span>
                            <span class="summary-value">${grandTotalQty} ចំនួន</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">ទឹកប្រាក់សរុប ($)</span>
                            <span class="summary-value">$${grandTotalUSD.toFixed(2)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">ទឹកប្រាក់សរុប (៛)</span>
                            <span class="summary-value">${Math.round(grandTotalUSD * exchangeRate).toLocaleString()} ៛</span>
                        </div>
                    </div>
                </div>`;
            } else {
                let totalWarehouse = 0, totalOffice = 0, totalSold = 0, totalQty = 0, totalValUSD = 0;
                filteredData.forEach(item => {
                    const warehouseIn = parseInt(item.warehouseIn) || parseInt(item.totalIn) || parseInt(item.quantity) || 0;
                    const oldStock = parseInt(item.oldStock) || 0;
                    const officeIn = parseInt(item.officeIn) || 0;
                    const stockOut = parseInt(item.stockOut) || 0;

                    const totalReceived = warehouseIn + oldStock;
                    const cWh = Math.max(0, totalReceived - officeIn);
                    const cOff = Math.max(0, officeIn - stockOut);
                    const rem = cWh + cOff;

                    totalWarehouse += cWh;
                    totalOffice += cOff;
                    totalSold += stockOut;
                    totalQty += rem;
                    totalValUSD += (rem * (parseFloat(item.sellingPrice) || 0));
                });

                return `
                <div class="summary-box">
                    <h4><i class="fi fi-rr-box-alt me-2"></i> សង្ខេបតុល្យភាពស្តុក និងទឹកប្រាក់ (Inventory Value Summary)</h4>
                    <div class="summary-grid" style="grid-template-columns: repeat(4, 1fr);">
                        <div class="summary-item">
                            <span class="summary-label">ស្តុកសរុប (Total Qty)</span>
                            <span class="summary-value">${totalQty}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">លក់ចេញសរុប (Total Sold)</span>
                            <span class="summary-value" style="color: #666;">${totalSold}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">តម្លៃស្តុកសរុប ($)</span>
                            <span class="summary-value">$${totalValUSD.toFixed(2)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">តម្លៃស្តុកសរុប (៛)</span>
                            <span class="summary-value">${Math.round(totalValUSD * exchangeRate).toLocaleString()} ៛</span>
                        </div>
                    </div>
                </div>`;
            }
        })()}

    <!-- Footer date removed as requested -->

    <div class="footer-signatures">
        <div class="sig-box" style="width: 45%;">
            <p>កាន់ស្តុកដោយ</p>
            <div class="sig-name" style="color: rgb(138, 14, 91);">冯 老师</div>
        </div>
        <div class="sig-box" style="width: 45%;">
            <p>អនុម័តដោយ</p>
            <div class="sig-name">នាយកសាលា</div>
        </div>
    </div>

    <!-- School Footer removed as requested -->

    <script>
        setTimeout(() => {
            window.print();
        }, 800);
    </script>
    </body></html>`;

    win.document.write(html);
    win.document.close();
}

function exportToExcel() {
    const category = document.getElementById('reportCategory').value;
    const period = document.getElementById('exportType').value;
    const filteredData = getFilteredData(category, period);

    let exportData = [];

    if (category === 'stockOut') {
        exportData = filteredData.map((item, index) => ({
            "ល.រ (No)": index + 1,
            "កាលបរិច្ឆេទ (Date)": item.soldDate || '-',
            "ឈ្មោះទំនិញ (Item Name)": item.itemName,
            "ចំនួនលក់ (Qty)": item.quantity,
            "តម្លៃរាយ (Unit Price $)": parseFloat(item.pricePerUnit || 0).toFixed(2),
            "សរុប (Total $)": parseFloat(item.totalPrice || 0).toFixed(2),
            "សរុប (Total ៛)": Math.round((item.totalPrice || 0) * exchangeRate),
            "អ្នកលក់ (Seller)": item.stockKeeper || '-'
        }));
    } else {
        exportData = filteredData.map((item, index) => {
            const warehouseIn = parseInt(item.warehouseIn) || parseInt(item.totalIn) || parseInt(item.quantity) || 0;
            const officeIn = parseInt(item.officeIn) || 0;
            const stockOut = parseInt(item.stockOut) || 0;
            const currentWh = Math.max(0, warehouseIn - officeIn);
            const currentOff = Math.max(0, officeIn - stockOut);

            return {
                "ល.រ (No)": index + 1,
                "ឈ្មោះទំនិញ (Item Name)": item.itemName,
                "ថ្ងៃនាំចូល (Import Date)": item.importDate || formatDate(item.createdAt) || '-',
                "ក្នុងឃ្លាំង (Warehouse)": currentWh,
                "ការិយាល័យ (Office)": currentOff,
                "លក់ចេញ (Sold Out)": stockOut,
                "ស្តុកសរុប (Total Stock)": currentWh + currentOff,
                "តម្លៃលក់ ($)": parseFloat(item.sellingPrice || 0).toFixed(2),
                "តម្លៃលក់ (៛)": Math.round((item.sellingPrice || 0) * exchangeRate)
            };
        });
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    let d = new Date();
    const rd = document.getElementById('reportDate').value;
    if (rd) {
        const parts = rd.split('-').map(Number);
        if (parts[0] > 31) { // YYYY-MM-DD
            d = new Date(parts[0], parts[1] - 1, parts[2]);
        } else { // DD-MM-YYYY
            d = new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dateStr = (period === 'monthly') ? `${months[d.getMonth()]}-${d.getFullYear()}` : `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;

    XLSX.writeFile(workbook, `${category}_report_${dateStr}.xlsx`);
}

function formatMoney(amount) {
    if (currentCurrency === 'KHR') {
        const val = amount * exchangeRate;
        return val.toLocaleString('en-US') + ' ៛';
    }
    return '$' + parseFloat(amount).toFixed(2);
}

const khmerMonths = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];

function getTodayKhmerFormat() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

const khmerDays = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];

function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    return `ថ្ងៃទី ${day}/${month}/${year}`;
}



// Global exposure
window.openRestockModal = openRestockModal;
window.openTransferModal = openTransferModal;
window.openReturnModal = openReturnModal;
window.openSellModal = openSellModal;
window.openEditModal = openEditModal;
window.deleteItem = deleteItem;
window.exportToPDF = exportToPDF;
window.exportToExcel = exportToExcel;
window.deleteSaleRecord = deleteSaleRecord;
window.deleteAllSales = deleteAllSales;
window.openEditSaleModal = openEditSaleModal;


