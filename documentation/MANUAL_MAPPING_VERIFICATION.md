# Teacher Info Mapping Verification

This document confirms the mapping between `staff-management.html` (Staff Data) and `registration.html` (Student Registration Form).

## Verified Mappings

| Staff Field (Firebase) | Staff UI Label | Registration Field ID | Registration UI Label | Notes |
|------------------------|----------------|-----------------------|-----------------------|-------|
| `nameKhmer` | ឈ្មោះភាសាខ្មែរ | `reg_teacherName` | គ្រូបន្ទុកថ្នាក់ | Populates the select option value |
| `phone` | លេខទូរស័ព្ទ | `reg_teacherPhone` | លេខទូរស័ព្ទគ្រូ | Auto-filled on selection |
| `homeroomClass` | ថ្នាក់បន្ទុក | `reg_classroom` | បន្ទប់រៀន | Auto-filled on selection. Note: "Classroom" in Reg usually implies Room/Class. Staff "Homeroom" fits this purpose. |
| `level` | កម្រិតបង្រៀន | `reg_studyLevel` | កម្រិតសិក្សា | Auto-filled on selection |
| `studyType` | ប្រភេទវគ្គសិក្សា | `reg_courseType` | ប្រភេទការសិក្សា | Auto-filled on selection |
| `studyType` | ប្រភេទវគ្គសិក្សា | `reg_studyProgram` | វគ្គសិក្សា | Auto-filled on selection (Mapped same as Course Type for completeness) |
| `teachingHours` | ម៉ោងបង្រៀន | `reg_studyTime` | ម៉ោងសិក្សា | Auto-filled on selection. Staff hours are comma-separated string. |

## Implementation Details

The `registration-script.js` has been updated to include the following logic in the `teacherSelect` event listener:

```javascript
// Map studyType to both Course Type and Study Program
if (courseTypeInput) courseTypeInput.value = studyType;
if (studyProgramInput) studyProgramInput.value = studyType;

// Map teachingHours to studyTime
if (studyTimeInput) studyTimeInput.value = studyTime;
```

This ensures that when a teacher is selected, all relevant study information associated with that teacher is automatically populated in the registration form, fulfilling the "100% correct" requirement.
