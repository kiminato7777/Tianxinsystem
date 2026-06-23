# ការកែប្រែតារាង "បញ្ជីរាយនាមសិស្សតាមស្ថានភាពបំណុល"

## ការផ្លាស់ប្តូរដែលបានធ្វើ

### Column Headers ថ្មី (បានធ្វើរួចហើយ):
1. **ល.រ** (No.)
2. **អត្តលេខ** (ID)
3. **ឈ្មោះសិស្ស** (Student Name) - ដាច់ដោយឡែក
4. **ផ្នែកសិក្សា** (Study Section) - column ថ្មី
5. **គ្រូបន្ទុកថ្នាក់** (Class Teacher)
6. **ម៉ោងសិក្សា** (Study Hours)
7. **តម្លៃសិក្សា** (Study Fee) - column ថ្មី
8. **ស្ថានភាព (Status)**
9. **ថ្ងៃត្រូវបង់** (Payment Due Date)
10. **ថ្ងៃពន្យារ** (Delay Date) - hidden by default
11. **មូលហេតុ** (Reason) - hidden by default
12. **នៅជំពាក់** (Debt Amount)
13. **សម្គាល់(Remark)**
14. **លម្អិត** (Details)

## ការកែប្រែដែលត្រូវធ្វើក្នុង JavaScript

### រកមើល Function ដែលបង្កើត rows សម្រាប់ `unifiedDebtTable`

នៅក្នុង `data-tracking-script.js`, អ្នកត្រូវរកមើល function ដែល:
- បង្កើត `<tr>` rows សម្រាប់តារាង
- បញ្ចូលទិន្នន័យទៅក្នុង `unifiedDebtBody` (tbody ID)

### រចនាសម្ព័ន្ធ Row ត្រឹមត្រូវ:

```javascript
// Example structure for each row
const row = `
    <tr class="unified-debt-row">
        <td class="text-center">${index + 1}</td>                          <!-- ល.រ -->
        <td class="text-center">${student.displayId || 'N/A'}</td>         <!-- អត្តលេខ -->
        <td class="px-4">${student.lastName} ${student.firstName}</td>     <!-- ឈ្មោះសិស្ស -->
        <td>${getStudySection(student)}</td>                               <!-- ផ្នែកសិក្សា (NEW) -->
        <td>${student.teacherName || 'N/A'}</td>                           <!-- គ្រូបន្ទុកថ្នាក់ -->
        <td class="text-center">${formatStudyTimeKhmer(student.studyTime)}</td>  <!-- ម៉ោងសិក្សា -->
        <td class="text-center">$${calculateTotalAmount(student).toFixed(2)}</td> <!-- តម្លៃសិក្សា (NEW) -->
        <td class="text-center">${getStatusBadge(student)}</td>            <!-- ស្ថានភាព -->
        <td class="text-center">${student.nextPaymentDate || 'N/A'}</td>   <!-- ថ្ងៃត្រូវបង់ -->
        <td class="delay-col d-none">${student.delayDate || ''}</td>       <!-- ថ្ងៃពន្យារ -->
        <td class="delay-col d-none">${student.delayReason || ''}</td>     <!-- មូលហេតុ -->
        <td class="text-center text-danger fw-bold">$${calculateRemainingAmount(student).toFixed(2)}</td> <!-- នៅជំពាក់ -->
        <td class="px-4">${student.remark || ''}</td>                      <!-- សម្គាល់ -->
        <td class="text-center">
            <button class="btn btn-sm btn-primary" onclick="viewStudentDetails('${student.id}')">
                <i class="fi fi-rr-eye"></i>
            </button>
        </td>                                                               <!-- លម្អិត -->
    </tr>
`;
```

### Helper Function ថ្មី:

```javascript
// Function to get study section label
function getStudySection(student) {
    if (isStudentChineseFullTime(student)) {
        return 'សិស្សចិនពេញម៉ោង';
    } else if (isStudentTrilingual(student)) {
        return 'ថ្នាក់៣ភាសា';
    } else {
        return 'សិស្សក្រៅម៉ោង';
    }
}
```

## សំខាន់:
- Column **ផ្នែកសិក្សា** (Study Section) ត្រូវបង្ហាញប្រភេទសិក្សារបស់សិស្ស
- Column **តម្លៃសិក្សា** (Study Fee) ត្រូវបង្ហាញតម្លៃសរុបដែលគណនាពី `calculateTotalAmount(student)`

## ការធ្វើតេស្ត:
1. បើកទំព័រ `data-tracking.html`
2. ចុចលើ "សរុបទាំងអស់ (Financial Total)" ក្នុង dropdown
3. ពិនិត្យមើលថាតារាង "បញ្ជីរាយនាមសិស្សតាមស្ថានភាពបំណុល" បង្ហាញ columns ត្រឹមត្រូវ
