# សង្ខេបការកែប្រែតារាង "បញ្ជីរាយនាមសិស្សតាមស្ថានភាពបំណុល"

## ✅ ការផ្លាស់ប្តូរដែលបានធ្វើរួចរាល់

### 1. ឯកសារ `data-tracking.html` (បន្ទាត់ 2356-2375)
**កែប្រែ Table Headers:**
- បំបែក "ឈ្មោះសិស្ស & ផ្នែកសិក្សា" ទៅជា 2 columns:
  - `<th>ឈ្មោះសិស្ស</th>` (Student Name)
  - `<th>ផ្នែកសិក្សា</th>` (Study Section)
- បន្ថែម column ថ្មី:
  - `<th>តម្លៃសិក្សា</th>` (Study Fee)

### 2. ឯកសារ `data-tracking-script.js`

#### a) Function `renderUnifiedDebtList()` (បន្ទាត់ 9864-9925)
**កែប្រែរចនាសម្ព័ន្ធ Row:**

**មុនពេលកែ:**
```javascript
<td class="text-start px-3">
    <div>
        <div>${s.lastName} ${s.firstName}</div>
        <div>
            <span class="section-tag">${sectionName}</span>
            <span>${s.chineseLastName}${s.chineseFirstName}</span>
        </div>
    </div>
</td>
```

**បន្ទាប់ពីកែ:**
```javascript
<!-- Column 3: ឈ្មោះសិស្ស (Student Name Only) -->
<td class="text-start px-3">
    <div>
        <div>${s.lastName} ${s.firstName}</div>
        <div class="text-muted small">${s.chineseLastName}${s.chineseFirstName}</div>
    </div>
</td>

<!-- Column 4: ផ្នែកសិក្សា (Study Section - NEW SEPARATE COLUMN) -->
<td class="text-start">
    <span class="section-tag ${sectionClass}">${sectionName}</span>
</td>

<!-- Column 7: តម្លៃសិក្សា (Study Fee - NEW COLUMN) -->
<td class="text-center">
    <span class="fw-bold text-success">$${totalAmount.toFixed(2)}</span>
</td>
```

#### b) Empty State Message (បន្ទាត់ 9827)
**កែប្រែ colspan:**
- មុន: `colspan="9"`
- ឥឡូវ: `colspan="12"` (ដើម្បីត្រូវតាម columns ថ្មី)

## 📊 រចនាសម្ព័ន្ធ Columns ចុងក្រោយ (12 columns)

| # | Column Name | Description | Data Source |
|---|-------------|-------------|-------------|
| 1 | ល.រ | លេខរៀង | `idx + 1` |
| 2 | អត្តលេខ | Student ID | `s.displayId` |
| 3 | ឈ្មោះសិស្ស | ឈ្មោះសិស្ស (ខ្មែរ + ចិន) | `s.lastName + s.firstName` |
| 4 | ផ្នែកសិក្សា | ប្រភេទសិក្សា | `sectionName` (FT/PT/TL) |
| 5 | គ្រូបន្ទុកថ្នាក់ | ឈ្មោះគ្រូ | `s.teacherName` |
| 6 | ម៉ោងសិក្សា | ម៉ោងរៀន | `formatStudyTimeKhmer(s.studyTime)` |
| 7 | តម្លៃសិក្សា | តម្លៃសរុប | `calculateTotalAmount(s)` ⭐ NEW |
| 8 | ស្ថានភាព | ស្ថានភាពបង់ប្រាក់ | `statusObj.text` |
| 9 | ថ្ងៃត្រូវបង់ | ថ្ងៃកំណត់ | `s.nextPaymentDate` |
| 10 | នៅជំពាក់ | ទឹកប្រាក់នៅជំពាក់ | `calculateRemainingAmount(s)` |
| 11 | សម្គាល់ | កំណត់ចំណាំ | `s.remark` |
| 12 | លម្អិត | ប៊ូតុងមើល | Button |

## 🎨 ការកែលម្អបន្ថែម

1. **ផ្នែកសិក្សា Column:**
   - មាន badge ពណ៌ផ្សេងគ្នាតាមប្រភេទ:
     - 🔵 ចិនពេញម៉ោង (FT) - `bg-primary`
     - 🟡 ក្រៅម៉ោង (PT) - `bg-secondary`
     - 🟣 ៣ភាសា (TL) - `bg-info`

2. **តម្លៃសិក្សា Column:**
   - បង្ហាញជា USD format: `$XXX.XX`
   - ពណ៌បៃតង (`text-success`)
   - Font: Inter (សម្រាប់លេខ)

## 🧪 ការធ្វើតេស្ត

1. បើក `data-tracking.html`
2. ចុច "សរុបទាំងអស់ (Financial Total)" ក្នុង dropdown menu
3. ពិនិត្យមើល:
   - ✅ Column headers មាន 12 columns
   - ✅ ឈ្មោះសិស្ស និង ផ្នែកសិក្សា នៅដាច់ដោយឡែក
   - ✅ តម្លៃសិក្សា បង្ហាញត្រឹមត្រូវ
   - ✅ គ្មាន layout issues

## 📝 កំណត់ចំណាំ

- Function `calculateTotalAmount(s)` គណនាតម្លៃសរុបពី:
  - `tuitionFee` (តម្លៃសិក្សា)
  - `materialFee` (តម្លៃសម្ភារៈ)
  - `adminFee` (ថ្លៃរដ្ឋបាល)
  - `-discount` (បញ្ចុះតម្លៃ)

- ប្រសិនបើមានបញ្ហា, សូមពិនិត្យមើល browser console សម្រាប់ errors
