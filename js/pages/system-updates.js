/**
 * system-updates.js
 * Manages and displays the history of system updates and changelog.
 */

const SYSTEM_UPDATES = [
    {
        date: "2026-03-17",
        title: "មុខងារជូនដំណឹងការ Update (System Updates)",
        content: "ផ្លាស់ប្តូរមកជាផ្ទាំងចំហៀង (Side Panel) ដើម្បីកុំឱ្យបាំងផ្ទៃកណ្តាលនៃអេក្រង់ និងអាចមើលទិន្នន័យផ្សេងៗបានក្នុងពេលតែមួយ។",
        badge: "New",
        badgeClass: "bg-primary"
    },
    {
        date: "2026-03-17",
        title: "បច្ចុប្បន្នភាព Firebase Security Rules",
        content: "ដោះស្រាយបញ្ហា 'Permission Denied' ដោយកំណត់សិទ្ធិឱ្យ Admin គ្រប់គ្រងទិន្នន័យបានពេញលេញ។",
        badge: "Security",
        badgeClass: "bg-danger"
    },
    {
        date: "2026-03-17",
        title: "ដោះស្រាយកំហុសការគណនា (TypeError Fix)",
        content: "ជួសជុលបញ្ហាដែលមិនអាចបង្ហាញទិន្នន័យក្នុង Modal កែប្រែដំណាក់កាលបង់ប្រាក់។",
        badge: "Fix",
        badgeClass: "bg-warning text-dark"
    },
    {
        date: "2026-03-16",
        title: "កែលម្អការកែប្រែប្រវត្តិលក់ (Sold History Edit)",
        content: "បន្ថែមប៊ូតុង 'កែប្រែ' ក្នុងបញ្ជីលក់សម្ភារៈ និងធ្វើបច្ចុប្បន្នភាពស្តុកដោយស្វ័យប្រវត្តិ។",
        badge: "Feature",
        badgeClass: "bg-success"
    },
    {
        date: "2026-03-16",
        title: "ការបោះពុម្ព PDF តាមរយៈ Iframe",
        content: "ប្តូររបៀបបោះពុម្ពរបាយការណ៍សិស្ស និងចំណូលចំណាយ ពីការបើក Tab ថ្មី មកជាការ Print ក្នុងប្រព័ន្ធផ្ទាល់តែម្តង។",
        badge: "Improvement",
        badgeClass: "bg-info"
    },
    {
        date: "2026-03-16",
        title: "សមកាលកម្មទិន្នន័យបង់ប្រាក់ (Payment Sync)",
        content: "បង្កើនប្រសិទ្ធភាពនៃការគណនាស្វ័យប្រវត្តិនូវ ថ្លៃសិក្សា ប្រាក់បានបង់ និងប្រាក់ជំពាក់។",
        badge: "Refactor",
        badgeClass: "bg-secondary"
    },
    {
        date: "2026-03-15",
        title: "ដាក់បញ្ចូល Font ខ្មែរទំនើប (Kantumruy Pro)",
        content: "ផ្លាស់ប្តូរ Font ក្នុងប្រព័ន្ធទាំងមូលឱ្យមកប្រើប្រាស់ 'Kantumruy Pro' ដើម្បីភាពងាយស្រួលក្នុងការអាន។",
        badge: "UI/UX",
        badgeClass: "bg-dark"
    }
];

function initNotificationSystem() {
    const btn = document.getElementById('notificationBtn');
    const badge = document.getElementById('notificationBadge');
    const offcanvasEl = document.getElementById('systemUpdatesOffcanvas');
    const list = document.getElementById('notificationList');

    if (!btn || !offcanvasEl || !list) return;

    // Check for last seen update in localStorage
    const lastSeenCount = localStorage.getItem('lastSeenUpdateCount') || 0;
    if (SYSTEM_UPDATES.length > parseInt(lastSeenCount)) {
        if (badge) badge.style.display = 'block';
    }

    // Render list when offcanvas is show
    offcanvasEl.addEventListener('show.bs.offcanvas', function () {
        list.innerHTML = SYSTEM_UPDATES.map(update => `
            <div class="notification-item p-3 border-bottom rounded-3 mb-2" style="background: rgba(138, 14, 91, 0.02);">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="notification-date-badge">${update.date}</span>
                    <span class="badge ${update.badgeClass} rounded-pill" style="font-size: 0.65rem;">${update.badge}</span>
                </div>
                <h6 class="fw-bold mb-1 text-dark" style="font-size: 1rem;">${update.title}</h6>
                <p class="notification-content mb-0 text-muted" style="font-size: 0.85rem; line-height: 1.5;">
                    ${update.content}
                </p>
            </div>
        `).join('');

        // Mark as seen
        localStorage.setItem('lastSeenUpdateCount', SYSTEM_UPDATES.length);
        if (badge) badge.style.display = 'none';
    });
}

// Run on load
document.addEventListener('DOMContentLoaded', initNotificationSystem);


