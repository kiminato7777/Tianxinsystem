# គ្រប់គ្រងបុគ្គលិក (Staff Management System)

## ការណែនាំ (Overview)

ប្រព័ន្ធគ្រប់គ្រងបុគ្គលិកនេះត្រូវបានបង្កើតឡើងដើម្បីគ្រប់គ្រងព័ត៌មានបុគ្គលិកទាំងអស់របស់សាលា។ ប្រព័ន្ធនេះមានលក្ខណៈពិសេសដូចខាងក្រោម:

This Staff Management System is designed to manage all staff information for the school. The system includes the following features:

## លក្ខណៈពិសេស (Features)

### 1. បញ្ជីបុគ្គលិកពេញលេញ (Complete Staff List Sidebar)
- បង្ហាញបញ្ជីបុគ្គលិកទាំងអស់នៅខាងឆ្វេង
- Shows complete staff list on the left sidebar
- Real-time updates from Firebase database
- Search functionality to filter staff by name, position, phone, or department
- Visual indicators for staff status (Active, Inactive, On Leave)

### 2. ការស្វែងរក (Search Functionality)
- ស្វែងរកបុគ្គលិកតាមឈ្មោះ មុខតំណែង លេខទូរស័ព្ទ ឬនាយកដ្ឋាន
- Real-time search with instant results
- Highlights matching staff members

### 3. ព័ត៌មានលម្អិតបុគ្គលិក (Detailed Staff Information)
ចុចលើឈ្មោះបុគ្គលិកដើម្បីមើលព័ត៌មានលម្អិត:
- ឈ្មោះពេញ (Full Name)
- មុខតំណែង (Position)
- លេខទូរស័ព្ទ (Phone Number)
- អ៊ីមែល (Email)
- ភេទ (Gender)
- ថ្ងៃខែឆ្នាំកំណើត (Date of Birth)
- នាយកដ្ឋាន (Department)
- ថ្ងៃចូលធ្វើការ (Hire Date)
- ប្រាក់ខែ (Salary)
- អាសយដ្ឋាន (Address)
- ស្ថានភាព (Status)
- កំណត់ចំណាំ (Notes)

### 4. បន្ថែមបុគ្គលិកថ្មី (Add New Staff)
- ចុចប៊ូតុង "បន្ថែមបុគ្គលិក" ដើម្បីបន្ថែមបុគ្គលិកថ្មី
- Fill in all required information
- Automatic validation for required fields
- Data is saved to Firebase in real-time

### 5. កែប្រែព័ត៌មាន (Edit Staff Information)
- ចុចប៊ូតុង "កែប្រែ" ដើម្បីកែប្រែព័ត៌មានបុគ្គលិក
- Update any staff information
- Changes are saved immediately to Firebase

### 6. លុបបុគ្គលិក (Delete Staff)
- ចុចប៊ូតុង "លុប" ដើម្បីលុបបុគ្គលិក
- Confirmation dialog before deletion
- Permanent removal from database

### 7. នាំចេញទិន្នន័យ (Export Data)
- នាំចេញទិន្នន័យបុគ្គលិកទាំងអស់ជា CSV file
- Export to CSV format for use in Excel or other applications
- Includes all staff information

## របៀបប្រើប្រាស់ (How to Use)

### ការចូលប្រើប្រព័ន្ធ (Accessing the System)
1. ចូលទៅកាន់ `staff-management.html`
2. ប្រព័ន្ធនឹងផ្ទុកបញ្ជីបុគ្គលិកទាំងអស់ពី Firebase

### ការបន្ថែមបុគ្គលិកថ្មី (Adding New Staff)
1. ចុចប៊ូតុង "បន្ថែមបុគ្គលិក" នៅខាងលើ
2. បំពេញព័ត៌មានទាំងអស់ដែលមានសញ្ញា * (ចាំបាច់)
3. ចុចប៊ូតុង "រក្សាទុក" ដើម្បីរក្សាទុកទិន្នន័យ

### ការមើលព័ត៌មានលម្អិត (Viewing Staff Details)
1. ចុចលើឈ្មោះបុគ្គលិកនៅក្នុងបញ្ជីខាងឆ្វេង
2. ព័ត៌មានលម្អិតនឹងបង្ហាញនៅផ្នែកខាងស្តាំ

### ការកែប្រែព័ត៌មាន (Editing Staff Information)
1. ជ្រើសរើសបុគ្គលិកដែលចង់កែប្រែ
2. ចុចប៊ូតុង "កែប្រែ"
3. កែប្រែព័ត៌មានដែលចង់ផ្លាស់ប្តូរ
4. ចុចប៊ូតុង "រក្សាទុក"

### ការស្វែងរកបុគ្គលិក (Searching for Staff)
1. វាយបញ្ចូលឈ្មោះ មុខតំណែង លេខទូរស័ព្ទ ឬនាយកដ្ឋាននៅក្នុងប្រអប់ស្វែងរក
2. បញ្ជីនឹងត្រូវបានត្រងតាមលក្ខខណ្ឌស្វែងរក

### ការនាំចេញទិន្នន័យ (Exporting Data)
1. ចុចប៊ូតុង "នាំចេញទិន្នន័យ"
2. ឯកសារ CSV នឹងត្រូវបានទាញយកស្វ័យប្រវត្តិ

## ស្ថានភាពបុគ្គលិក (Staff Status)

### កំពុងធ្វើការ (Active)
- បុគ្គលិកដែលកំពុងធ្វើការ
- បង្ហាញជាពណ៌បៃតង

### ឈប់ធ្វើការ (Inactive)
- បុគ្គលិកដែលឈប់ធ្វើការ
- បង្ហាញជាពណ៌ប្រផេះ

### សម្រាក (On Leave)
- បុគ្គលិកដែលកំពុងសម្រាក
- បង្ហាញជាពណ៌លឿង

## មុខតំណែងបុគ្គលិក (Staff Positions)

ប្រព័ន្ធគាំទ្រមុខតំណែងដូចខាងក្រោម:
- នាយក (Director)
- អនុនាយក (Vice Director)
- គ្រូបង្រៀន (Teacher)
- គ្រូជំនួយការ (Assistant Teacher)
- បណ្ណារក្ស (Librarian)
- គណនេយ្យករ (Accountant)
- អ្នកសំអាត (Cleaner)
- សន្តិសុខ (Security)
- ផ្សេងៗ (Others)

## ទិន្នន័យដែលត្រូវរក្សាទុក (Required Data)

### ព័ត៌មានចាំបាច់ (Required Information)
- ឈ្មោះពេញ (Full Name) *
- មុខតំណែង (Position) *
- លេខទូរស័ព្ទ (Phone Number) *
- ភេទ (Gender) *
- ថ្ងៃចូលធ្វើការ (Hire Date) *
- ស្ថានភាព (Status) *

### ព័ត៌មានបន្ថែម (Optional Information)
- អ៊ីមែល (Email)
- ថ្ងៃខែឆ្នាំកំណើត (Date of Birth)
- ប្រាក់ខែ (Salary)
- អាសយដ្ឋាន (Address)
- នាយកដ្ឋាន (Department)
- កំណត់ចំណាំ (Notes)

## ការរក្សាទុកទិន្នន័យ (Data Storage)

ទិន្នន័យទាំងអស់ត្រូវបានរក្សាទុកនៅក្នុង Firebase Realtime Database:
- Path: `/staff/{staffId}`
- Real-time synchronization
- Automatic backup
- Secure access control

## ការរចនា (Design Features)

### Sidebar Design
- Fixed position on the left
- Scrollable staff list
- Search box at the top
- Staff count indicator
- Responsive design for mobile

### Main Content Area
- Staff details display
- Action buttons (Edit, Delete)
- Information grid layout
- Empty state when no staff selected

### Color Scheme
- Primary: #8a0e5b (Pink/Purple)
- Active Status: Green
- Inactive Status: Gray
- On Leave Status: Yellow

## ការឆ្លើយតប (Responsive Design)

- Desktop: Full sidebar visible
- Tablet: Collapsible sidebar
- Mobile: Hidden sidebar with toggle button

## ការភ្ជាប់ទៅកាន់ទំព័រផ្សេង (Navigation)

ប្រព័ន្ធគ្រប់គ្រងបុគ្គលិកត្រូវបានភ្ជាប់ទៅកាន់:
- ផ្ទាំងគ្រប់គ្រង (Dashboard) - index.html
- បញ្ជីទិន្នន័យសិស្ស (Student Data) - data-tracking.html
- គ្រប់គ្រងអ្នកប្រើប្រាស់ (User Management) - user-management.html

## ឯកសារពាក់ព័ន្ធ (Related Files)

- `staff-management.html` - Main HTML file
- `staff-management.js` - JavaScript functionality
- `firebase-config.js` - Firebase configuration
- `auth-check.js` - Authentication check
- `loader.css` - Loading animation styles
- `loader-init.js` - Loading initialization

## ការគាំទ្រ (Support)

សម្រាប់ជំនួយបន្ថែម សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ។

For additional help, please contact the system administrator.

---

**ចំណាំ:** ប្រព័ន្ធនេះត្រូវការការភ្ជាប់អ៊ីនធឺណិតដើម្បីធ្វើការជាមួយ Firebase។

**Note:** This system requires an internet connection to work with Firebase.
