# ការកែប្រែ Delay Filter សម្រាប់តារាង Unified Debt

## ✅ ការផ្លាស់ប្តូរដែលបានធ្វើ

### 1. ឯកសារ `data-tracking-script.js` (បន្ទាត់ 9826-9829)

**កែប្រែ Empty State Colspan:**

**មុនពេលកែ:**
```javascript
if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" class="text-center py-5 text-muted">...</td></tr>';
    return;
}
```

**បន្ទាប់ពីកែ:**
```javascript
if (filtered.length === 0) {
    const colspan = window.CURRENT_UNIFIED_FILTER === 'delay' ? '14' : '12';
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-5 text-muted">...</td></tr>`;
    return;
}
```

## 📋 រចនាសម្ព័ន្ធ Columns

### ពេល Filter = "ទាំងអស់" / "ថ្ងៃនេះ" / "ហួសកំណត់" / "នៅជំពាក់" / "ជិតដល់ថ្ងៃ" (12 columns)

1. ល.រ
2. អត្តលេខ
3. ឈ្មោះសិស្ស
4. ផ្នែកសិក្សា
5. គ្រូបន្ទុកថ្នាក់
6. ម៉ោងសិក្សា
7. តម្លៃសិក្សា
8. ស្ថានភាព (Status)
9. ថ្ងៃត្រូវបង់
10. នៅជំពាក់
11. សម្គាល់(Remark)
12. លម្អិត

### ពេល Filter = "ពន្យារពេល" (14 columns)

1. ល.រ
2. អត្តលេខ
3. ឈ្មោះសិស្ស
4. ផ្នែកសិក្សា
5. គ្រូបន្ទុកថ្នាក់
6. ម៉ោងសិក្សា
7. តម្លៃសិក្សា
8. ស្ថានភាព (Status)
9. ថ្ងៃត្រូវបង់
10. **ថ្ងៃពន្យារ** ⭐ បង្ហាញតែពេល filter = 'delay'
11. **មូលហេតុ** ⭐ បង្ហាញតែពេល filter = 'delay'
12. នៅជំពាក់
13. សម្គាល់(Remark)
14. លម្អិត

## 🔧 ការដំណើរការ

### នៅក្នុង HTML (`data-tracking.html`):

```html
<!-- Delay columns មាន class 'delay-col d-none' (លាក់ដោយ default) -->
<th class="delay-col d-none" style="...">ថ្ងៃពន្យារ</th>
<th class="delay-col d-none" style="...">មូលហេតុ</th>
```

### នៅក្នុង JavaScript (`data-tracking-script.js`):

```javascript
window.filterUnifiedList = (status) => {
    window.CURRENT_UNIFIED_FILTER = status;
    
    // Toggle Delay Columns Visibility
    const delayCols = document.querySelectorAll('.delay-col');
    delayCols.forEach(col => {
        if (status === 'delay') col.classList.remove('d-none');  // បង្ហាញ
        else col.classList.add('d-none');                        // លាក់
    });
    
    renderUnifiedDebtList(...);
};
```

### នៅក្នុង Row Generation:

```javascript
// Delay columns នឹងត្រូវបង្កើតតែពេល CURRENT_UNIFIED_FILTER === 'delay'
${window.CURRENT_UNIFIED_FILTER === 'delay' ? `
    <td class="fw-bold text-primary small" style="background: #fff9c4; color: #854d0e !important;">
        ${s.postponedDate || '-'}
    </td>
    <td class="text-start small" style="background: #fff9c4; color: #854d0e !important; min-width: 150px;">
        ${s.postponedReason || '-'}
    </td>
` : ''}
```

## 🧪 ការធ្វើតេស្ត

1. បើក `data-tracking.html`
2. ចុច "សរុបទាំងអស់ (Financial Total)" ក្នុង dropdown
3. ធ្វើតេស្ត filter buttons:
   - ✅ ចុច "ទាំងអស់" → បង្ហាញ 12 columns
   - ✅ ចុច "ថ្ងៃនេះ" → បង្ហាញ 12 columns
   - ✅ ចុច "ហួសកំណត់" → បង្ហាញ 12 columns
   - ✅ ចុច "នៅជំពាក់" → បង្ហាញ 12 columns
   - ✅ ចុច "ជិតដល់ថ្ងៃ" → បង្ហាញ 12 columns
   - ✅ ចុច **"ពន្យារពេល"** → បង្ហាញ 14 columns (រួមទាំង "ថ្ងៃពន្យារ" និង "មូលហេតុ")

## 📝 កំណត់ចំណាំ

- Delay columns មានពណ៌ផ្ទៃខាងក្រោយពិសេស: `background: #fff9c4` (លឿងស្រាល)
- Delay columns មានពណ៌អក្សរ: `color: #854d0e` (ត្នោតចាស់)
- Empty state message នឹងប្រើ colspan ត្រឹមត្រូវដោយស្វ័យប្រវត្តិ (12 ឬ 14)
