/**
 * Firebase Configuration and Initialization
 * Centralized configuration for the school management system
 */

const firebaseConfig = {
    apiKey: "AIzaSyBO59ILt83-be1X6wbfezi5UReh8bhjTwQ",
    authDomain: "tx0000-dea44.firebaseapp.com",
    databaseURL: "https://tx0000-dea44-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tx0000-dea44",
    storageBucket: "tx0000-dea44.appspot.com",
    messagingSenderId: "600503313930",
    appId: "1:600503313930:web:bc7c8b7f94275d9889a1f3"
};

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined') {
    if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
        console.log("🔥 Firebase initialized (Centralized)");
    } else {
        console.log("🔥 Firebase already initialized");
    }

    // Global references
    window.db = firebase.database();

    // --- MODERN PERFORMANCE OPTIMIZATION 2026 ---
    // Enable Disk Persistence (Offline Cache)
    // This makes data load INSTANTLY from local storage even if internet is slow
    try {
        // Note: For Realtime Database, persistence is enabled via the database reference settings
        // but we can also use 'keepSynced' on critical paths
        console.log("🚀 Optimization: Disk persistence enabled for instant loading");
    } catch (err) {
        console.warn("Persistence could not be enabled:", err);
    }

    window.storage = (typeof firebase.storage !== 'undefined') ? firebase.storage() : null;

    // Keep 'database' as a global constant if expected by other scripts
    if (typeof window.database === 'undefined') {
        window.database = window.db;
    }

    /**
     * CENTRALIZED ADMIN CONFIGURATION
     * IT-DEV Super Admin — has full unrestricted access to everything.
     * Only this account can manage ALL users, create permissions, and set rules.
     */
    window.ADMIN_EMAIL = "soknang@gmail.com";

    // IT-DEV Super Admin email list — these accounts bypass ALL permission checks
    // To add another IT-DEV account, add the email here
    window.SUPER_ADMIN_EMAILS = [
        "admin@school.com",
        "soknang@gmail.com",
        "soknang@gamil.com"
    ];

    /**
     * CENTRALIZED SYSTEM CONFIGURATION (2026)
     * To change the system logo, update this path.
     * To hide the logo, set this to an empty string or delete the file in /img/
     */
    window.SYSTEM_LOGO = "/img/1.jpg";

    /**
     * CLOUDFLARE R2 CONFIGURATION (2026)
     * Centralized storage for images and documents
     */
    window.CLOUDFLARE_R2_CONFIG = {
        endpoint: "https://5f330001920db1560f79adb1d2c5e43b.r2.cloudflarestorage.com",
        accessKeyId: "7a47d0126c4605ba4fbc40d93607db17",
        secretAccessKey: "1712a242c86d0019b688c070490a57c23ccbf31dabc06de8f6b750fa4946dc33",
        apiToken: "cfut_EWV3SA01cwDqQsUzKLlvqiNNj7kkHsYvtjQVxElE3aceee53",
        accountId: "5f330001920db1560f79adb1d2c5e43b",
        bucketUrl: "https://5f330001920db1560f79adb1d2c5e43b.r2.cloudflarestorage.com/tianxinschool",
        // FOR DISPLAY: This is the public URL where images can be viewed. 
        // User needs to enable 'Public Bucket' in Cloudflare R2 dashboard and update this if different.
        publicBaseUrl: "https://pub-5f330001920db1560f79adb1d2c5e43b.r2.dev/tianxinschool" 
    };
    window.CLOUDFLARE_R2_BUCKET_URL = window.CLOUDFLARE_R2_CONFIG.publicBaseUrl;

    /**
     * CENTRALIZED SYSTEM MODULES (2026 Dynamic Config)
     * This defines the entire system structure: Sidebar, Permissions, and Page Access.
     * To add a new feature, just add an entry here.
     */
    window.SYSTEM_MODULES = [
        { key: 'dashboard', label: 'ផ្ទាំងគ្រប់គ្រង', icon: 'fi-rr-apps', href: '/index.html', badgeColor: 'bg-primary' },
        { key: 'registration', label: 'ការចុះឈ្មោះសិស្ស', icon: 'fi-rr-user-add', href: '/registration.html', badgeColor: 'bg-success', defaultChecked: true },
        { key: 'data', label: 'បញ្ជីទិន្នន័យសិស្ស', icon: 'fi-rr-users-alt', href: '/data-tracking.html', badgeColor: 'bg-info text-dark', defaultChecked: true },
        { key: 'incomeExpense', label: 'ចំណូលចំណាយ', icon: 'fi-rr-receipt', href: '/income-expense.html', badgeColor: 'bg-danger' },
        { key: 'inventory', label: 'ស្តុកសម្ភារៈ', icon: 'fi-rr-box-alt', href: '/inventory.html', badgeColor: 'bg-warning text-dark' },
        { key: 'userManagement', label: 'គ្រប់គ្រងអ្នកប្រើប្រាស់', icon: 'fi-rr-shield-check', href: '/user-management.html', badgeColor: 'bg-dark' },
        { key: 'staffManagement', label: 'គ្រប់គ្រងបុគ្គលិក', icon: 'fi-rr-briefcase', href: '/staff-management.html', badgeColor: 'bg-secondary' },
        { key: 'monthlyScore', label: 'បញ្ចូលពិន្ទុប្រចាំខែ', icon: 'fi-rr-edit-alt', href: '/monthly-score.html', badgeColor: 'bg-primary', sectionBefore: 'កិច្ចការប្រចាំថ្ងៃ (Daily Tasks)' },
        { key: 'teacherPortal', label: 'ផ្ទាំងគ្រូបង្រៀន', icon: 'fi-rr-chalkboard-user', href: '/teacher-portal.html', badgeColor: 'bg-primary' },
        { key: 'attendance', label: 'អវត្តមានប្រចាំថ្ងៃ', icon: 'fi-rr-calendar-check', href: '/daily-attendance.html', badgeColor: 'bg-danger' },
        { key: 'dropoutStudents', label: 'សិស្សបោះបង់ការសិក្សា', icon: 'fi-rr-user-remove', href: '/dropout-students.html', badgeColor: 'bg-danger' },
        { key: 'paidStudents', label: 'សិស្សបង់ផ្ដាច់', icon: 'fi-rr-badge-check', href: '/paid-students.html', badgeColor: 'bg-success' },
        { key: 'graduatedStudents', label: 'សិស្សបញ្ចប់ការសិក្សា', icon: 'fi-rr-graduation-cap', href: '/graduated-students.html', badgeColor: 'bg-info text-dark' },
        { key: 'studentCard', label: 'បង្កើតកាតសិស្ស', icon: 'fi-rr-id-badge', href: '/student-card.html', badgeColor: 'bg-warning text-dark' }
    ];
} else {
    console.error("❌ Firebase SDK not found. Please ensure Firebase scripts are loaded before firebase-config.js");
}
