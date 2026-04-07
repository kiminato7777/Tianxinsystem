/**
 * receiver-utils.js
 * Centralized logic for managing payment receivers across the system.
 */

// Global list of receivers
window.SYSTEM_RECEIVERS = [];
window.EXTRA_RECEIVERS = ['毛平安-សុខណាង', '倪思妮-ស្រីនីត'];

/**
 * Initialize receivers logic.
 * Fetches users from Firebase and updates the global list.
 */
let isReceiverSyncInitialized = false;

function initReceiverSync() {
    if (typeof firebase === 'undefined' || isReceiverSyncInitialized) return;
    isReceiverSyncInitialized = true;

    const usersRef = firebase.database().ref('users');
    usersRef.on('value', (snapshot) => {
        const users = snapshot.val();
        let userNames = [];
        if (users) {
            userNames = Object.values(users).map(u => u.name || u.displayName).filter(n => n);
        }
        
        // Merge with extra receivers, remove duplicates, and sort
        let receivers = [...new Set([...userNames, ...window.EXTRA_RECEIVERS])];
        
        // Add current user name if found in UI or auth
        const authName = firebase.auth().currentUser ? (firebase.auth().currentUser.displayName || firebase.auth().currentUser.email.split('@')[0]) : null;
        const uiName = document.getElementById('user-display-name')?.textContent || document.getElementById('welcome-user-name')?.textContent;
        if (authName) receivers.push(authName);
        if (uiName && uiName !== '...' && uiName !== 'Loading...') receivers.push(uiName);
        
        window.SYSTEM_RECEIVERS = [...new Set(receivers.filter(n => n))].sort();
        
        // Trigger a custom event so pages can update their dropdowns
        document.dispatchEvent(new CustomEvent('receiversUpdated', { detail: window.SYSTEM_RECEIVERS }));
    }, (error) => {
        console.log("Receiver sync permission issue (access limited):", error.message);
        
        // Fallback to extra receivers + current user
        let fallback = [...window.EXTRA_RECEIVERS];
        const authName = firebase.auth().currentUser ? (firebase.auth().currentUser.displayName || firebase.auth().currentUser.email.split('@')[0]) : null;
        if (authName) fallback.push(authName);
        
        window.SYSTEM_RECEIVERS = [...new Set(fallback)].sort();
        document.dispatchEvent(new CustomEvent('receiversUpdated', { detail: window.SYSTEM_RECEIVERS }));
    });
}

/**
 * Generates HTML for a receiver select element.
 * @param {string} selectedValue - The value to pre-select.
 * @param {string} nameAttr - name attribute for select.
 * @param {string} classAttr - class attribute for select.
 * @param {string} idAttr - id attribute for select.
 * @param {string} extraAttr - any extra attributes (style, etc).
 * @returns {string} HTML select string.
 */
function getReceiverSelectHtml(selectedValue, nameAttr, classAttr, idAttr, extraAttr = '') {
    const receivers = window.SYSTEM_RECEIVERS.length > 0 ? window.SYSTEM_RECEIVERS : window.EXTRA_RECEIVERS;
    
    let html = `<select class="form-select ${classAttr || ''}" name="${nameAttr || ''}" ${idAttr ? `id="${idAttr}"` : ''} ${extraAttr}>`;
    html += `<option value="">ជ្រើសរើសអ្នកទទួល...</option>`;

    receivers.forEach(name => {
        const selected = (selectedValue === name) ? 'selected' : '';
        html += `<option value="${name}" ${selected}>${name}</option>`;
    });

    // If selectedValue is not in the list (legacy data), add it
    if (selectedValue && !receivers.includes(selectedValue)) {
        html += `<option value="${selectedValue}" selected>${selectedValue}</option>`;
    }

    html += `</select>`;
    return html;
}

/**
 * Populates an existing select element with receiver options.
 * @param {HTMLElement} selectElement - The select element to populate.
 * @param {string} selectedValue - Value to select.
 */
function populateReceiverSelect(selectElement, selectedValue) {
    if (!selectElement) return;
    
    const receivers = window.SYSTEM_RECEIVERS.length > 0 ? window.SYSTEM_RECEIVERS : window.EXTRA_RECEIVERS;
    const currentVal = selectedValue || selectElement.value;
    
    selectElement.innerHTML = '<option value="">ជ្រើសរើសអ្នកទទួល...</option>';
    receivers.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (name === currentVal) opt.selected = true;
        selectElement.appendChild(opt);
    });
    
    // Legacy value support
    if (currentVal && !receivers.includes(currentVal)) {
        const opt = document.createElement('option');
        opt.value = currentVal;
        opt.textContent = currentVal;
        opt.selected = true;
        selectElement.appendChild(opt);
    }
}

// Auto-initialize if firebase is already loaded
if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            initReceiverSync();
        }
    });
}
