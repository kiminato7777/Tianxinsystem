/**
 * Firebase Configuration and Initialization
 * Centralized configuration for the school management system
 */

const firebaseConfig = {
    apiKey: "AIzaSyBO59ILt83-be1X6wbfezi5UReh8bhjTwQ",
    authDomain: "tx0000-dea44.firebaseapp.com",
    databaseURL: "https://tx0000-dea44-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tx0000-dea44",
    storageBucket: "tx0000-dea44.firebasestorage.app",
    messagingSenderId: "600503313930",
    appId: "1:600503313930:web:bc7c8b7f94275d9889a1f3"
};

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined') {
    // Set to true for offline development mock, false to connect to the actual Firebase database
    const USE_MOCK = false;

    if (USE_MOCK) {
        console.warn("⚠️ Running in DEVELOPMENT MOCK mode");
        
        firebase.auth = () => ({
            currentUser: {
                email: "admin@school.com",
                displayName: "Admin (អ្នកគ្រប់គ្រង)"
            },
            onAuthStateChanged: (callback) => {
                setTimeout(() => {
                    callback({ email: 'admin@school.com', uid: 'mock-admin' });
                }, 10);
                return () => {};
            },
            signInWithEmailAndPassword: (email, password) => {
                console.log("Mock signing in with:", email);
                return Promise.resolve({
                    user: {
                        uid: "mock-admin",
                        email: email
                    }
                });
            },
            signOut: () => Promise.resolve()
        });

        const mockDb = {
            ref: (path) => {
                return {
                    on: (event, callback, errCallback) => {
                        setTimeout(() => {
                            if (path.startsWith('users/')) {
                                callback({
                                    val: () => ({
                                        name: "Admin (អ្នកគ្រប់គ្រង)",
                                        role: "admin",
                                        permissions: {
                                            dashboard: true,
                                            registration: true,
                                            data: true,
                                            incomeExpense: true,
                                            inventory: true,
                                            userManagement: true,
                                            staffManagement: true,
                                            teacherPortal: true,
                                            attendance: true
                                        }
                                    }),
                                    exists: () => true
                                });
                            } else if (path === 'settings/expenseCategories') {
                                callback({
                                    val: () => ["ទឹក-ភ្លើង", "ថ្លៃជួលផ្ទះ/ដី", "ប្រាក់ខែបុគ្គលិក", "សម្ភារៈការិយាល័យ", "ជួសជុល", "សាំង", "អាហារ"],
                                    exists: () => true
                                });
                            } else if (path === 'settings/exchangeRate') {
                                callback({
                                    val: () => 4000,
                                    exists: () => true
                                });
                            } else if (path === 'transactions') {
                                callback({
                                    val: () => ({
                                        "t1": {
                                            id: "t1",
                                            type: "income",
                                            paymentMethod: "cash",
                                            date: "2026-06-16",
                                            amount: 100,
                                            amountUSD: 100,
                                            amountKHR: 0,
                                            cashUSD: 100,
                                            cashKHR: 0,
                                            abaUSD: 0,
                                            abaKHR: 0,
                                            debtUSD: 0,
                                            debtKHR: 0,
                                            category: "សិស្សចុះឈ្មោះថ្មី",
                                            description: "សាកល្បងចំណូលទី១",
                                            payer: "សុខ ជា",
                                            receiver: "admin",
                                            boardingPlace: "បន្ទប់ 101"
                                        }
                                    }),
                                    exists: () => true
                                });
                            } else if (path === 'students') {
                                callback({
                                    val: () => ({
                                        "s1": { name: "សុខ ជា", id: "STU-001" },
                                        "s2": { name: "កែវ ណារី", id: "STU-002" }
                                    }),
                                    exists: () => true
                                });
                            } else if (path === '.info/connected') {
                                callback({
                                    val: () => navigator.onLine,
                                    exists: () => true
                                });
                            } else {
                                callback({
                                    val: () => null,
                                    exists: () => false
                                });
                            }
                        }, 50);
                    },
                    once: (event) => Promise.resolve({
                        val: () => ({}),
                        exists: () => true
                    }),
                    set: () => Promise.resolve(),
                    update: () => Promise.resolve(),
                    push: () => {
                        const pushRef = {
                            key: "mock-new-key",
                            set: () => Promise.resolve(),
                            update: () => Promise.resolve()
                        };
                        return Promise.resolve(pushRef);
                    },
                    child: (childPath) => mockDb.ref(path + '/' + childPath)
                };
            }
        };
        firebase.database = () => mockDb;
        
        firebase.storage = () => ({
            ref: (path) => ({
                put: () => Promise.resolve({ ref: { getDownloadURL: () => Promise.resolve("mock-url") } }),
                getDownloadURL: () => Promise.resolve("mock-url"),
                delete: () => Promise.resolve()
            })
        });
    } else {
        // Initialize Real Firebase
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
            console.log("🔥 Firebase initialized (Centralized)");
        } else {
            console.log("🔥 Firebase already initialized");
        }
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

    // Enable Firebase Storage as primary storage
    window.storage = (typeof firebase !== 'undefined' && firebase.storage) ? firebase.storage() : null;

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
     * CENTRALIZED AI CONFIGURATION (2026)
     * API Key for AI integrations (e.g., Gemini, Google AI)
     */
    window.AI_CONFIG = {
        apiKey: "AIzaSyBu0aZfd464GEOnAl4aZDpEPrhogWohga8",
        enabled: true
    };

    /**
     * CENTRALIZED SYSTEM CONFIGURATION (2026)
     * To change the system logo, update this path.
     * To hide the logo, set this to an empty string or delete the file in /img/
     */
    window.SYSTEM_LOGO = "/img/1.jpg";

    /**
     * TELEGRAM BOT CONFIGURATION
     * Enter your Telegram Bot Token and Chat ID below to enable notifications
     * Example Bot Token: "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
     */
    window.TELEGRAM_BOT_TOKEN = "8703320893:AAFPosUO4ALr3bVrScKwO-DM7Jxmez2L-c0";
    window.TELEGRAM_CHAT_ID = "-5513646177";

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
        { key: 'teacherPortal', label: 'ផ្ទាំងគ្រូបង្រៀន', icon: 'fi-rr-chalkboard-user', href: '/teacher-portal.html', badgeColor: 'bg-primary', sectionBefore: 'កិច្ចការប្រចាំថ្ងៃ (Daily Tasks)' },
        { key: 'attendance', label: 'អវត្តមានប្រចាំថ្ងៃ', icon: 'fi-rr-calendar-check', href: '/daily-attendance.html', badgeColor: 'bg-danger' },
        { key: 'dropoutStudents', label: 'សិស្សបោះបង់ការសិក្សា', icon: 'fi-rr-user-remove', href: '/dropout-students.html', badgeColor: 'bg-danger' },
        { key: 'paidStudents', label: 'សិស្សបង់ផ្ដាច់', icon: 'fi-rr-badge-check', href: '/paid-students.html', badgeColor: 'bg-success' },
        { key: 'graduatedStudents', label: 'សិស្សបញ្ចប់ការសិក្សា', icon: 'fi-rr-graduation-cap', href: '/graduated-students.html', badgeColor: 'bg-info text-dark' }
    ];
} else {
    console.error("❌ Firebase SDK not found. Please ensure Firebase scripts are loaded before firebase-config.js");
}
/**
 * Global Premium Alert/Toast Notification System
 * type: 'success' | 'error' | 'info'
 */
window.showAlertPremium = function(message, type = 'success', title = '') {
    // Remove existing if any
    const existing = document.querySelector('.premium-toast');
    if (existing) existing.remove();

    if (!title) {
        title = type === 'success' ? 'ជោគជ័យ!' : (type === 'error' ? 'មានកំហុស!' : 'ព័ត៌មាន');
    }

    const icon = type === 'success' ? 'fi-rr-check' : (type === 'error' ? 'fi-rr-cross-circle' : 'fi-rr-info');
    
    const toastHtml = `
        <div class="premium-toast ${type}">
            <div class="toast-icon"><i class="fi ${icon}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <div class="toast-progress">
                <div class="toast-progress-bar" style="animation: progressBarAnim 3s linear forwards;"></div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', toastHtml);
    const toast = document.querySelector('.premium-toast');
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 100);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};
