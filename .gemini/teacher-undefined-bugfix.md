# 🔧 ជួសជុល Bug: គ្រូបន្ទុកថ្នាក់បង្ហាញ "undefined"

## 🐛 បញ្ហា

នៅពេលបើក modal ប្តូរថ្នាក់ dropdown "គ្រូបន្ទុកថ្នាក់ (Teacher)" បង្ហាញតម្លៃជា `undefined`។

## 🔍 មូលហេតុ

កូដកំពុងប្រើ `teacher.name` ប៉ុន្តែ object teacher មានរចនាសម្ព័ន្ធជា:
```javascript
{
    id: "...",
    nameKhmer: "លោកគ្រូ...",
    nameChinese: "...",
    position: "គ្រូ",
    // មិនមាន property "name" ទេ!
}
```

## ✅ ដំណោះស្រាយ

### 1. **កែប្រែការបង្កើត Teacher Options**

**មុន:**
```javascript
const teacherOptions = window.availableTeachers.map(teacher =>
    `<option value="${teacher.name}">${teacher.name}</option>`
).join('');
```

**ក្រោយ:**
```javascript
const teacherOptions = (window.availableTeachers || []).map(teacher => {
    const teacherName = teacher.nameKhmer || teacher.name || '';
    const displayName = teacherName + (teacher.nameChinese ? ` (${teacher.nameChinese})` : '');
    return `<option value="${teacherName}" ${s.teacherName === teacherName ? 'selected' : ''}>${displayName}</option>`;
}).join('');
```

### 2. **បន្ថែម Safety Checks**

បន្ថែម `|| []` សម្រាប់ arrays ទាំងអស់ដើម្បីការពារកំហុសប្រសិនបើទិន្នន័យមិនទាន់ load:

```javascript
// មុន
const levelOptions = window.allMasterLevels.map(...)

// ក្រោយ
const levelOptions = (window.allMasterLevels || []).map(...)
```

## 📝 ការកែលម្អលម្អិត

### Teacher Options
```javascript
const teacherOptions = (window.availableTeachers || []).map(teacher => {
    // 1. យកឈ្មោះគ្រូ (nameKhmer ជាចម្បង, fallback ទៅ name)
    const teacherName = teacher.nameKhmer || teacher.name || '';
    
    // 2. បង្កើត display name ជាមួយឈ្មោះចិន (ប្រសិនបើមាន)
    const displayName = teacherName + (teacher.nameChinese ? ` (${teacher.nameChinese})` : '');
    
    // 3. បង្កើត option tag
    return `<option value="${teacherName}" 
                    ${s.teacherName === teacherName ? 'selected' : ''}>
                ${displayName}
            </option>`;
}).join('');
```

### ឧទាហរណ៍ Output
```html
<option value="លោកគ្រូ សុខ">លោកគ្រូ សុខ (王老师)</option>
<option value="លោកគ្រូ ចន្ទា">លោកគ្រូ ចន្ទា</option>
```

## 🎯 ផលប្រយោជន៍

✅ **ឈ្មោះគ្រូបង្ហាញត្រឹមត្រូវ** - ប្រើ `nameKhmer` ជំនួស `name`  
✅ **បង្ហាញឈ្មោះចិនផងដែរ** - ងាយស្រួលសម្គាល់  
✅ **មិនមាន undefined** - មាន fallback values  
✅ **មិនមាន errors** - មាន safety checks សម្រាប់ arrays  

## 📋 ឯកសារដែលបានកែប្រែ

- `data-tracking-script.js` (Lines 5105-5122)

## 🧪 របៀបធ្វើតេស្ត

1. បើក modal ព័ត៌មានលម្អិតរបស់សិស្ស
2. ចុចប៊ូតុង "ប្តូរថ្នាក់"
3. ពិនិត្យមើល dropdown "គ្រូបន្ទុកថ្នាក់"
4. ✅ គួរតែបង្ហាញឈ្មោះគ្រូត្រឹមត្រូវ (មិនមែន undefined)
5. ✅ គួរតែបង្ហាញឈ្មោះចិនក្នុងវង់ក្រចក (ប្រសិនបើមាន)

## 📊 ទិន្នន័យ Teacher Structure

```javascript
// ពី loadTeacherNames() function
window.availableTeachers = [
    {
        id: "staff_001",
        nameKhmer: "លោកគ្រូ សុខ",
        nameChinese: "王老师",
        nameEnglish: "Mr. Sok",
        position: "គ្រូ",
        phone: "...",
        // ...
    },
    // ...
]
```

---

**ស្ថានភាព:** ✅ ជួសជុលរួចរាល់  
**កាលបរិច្ឆេទ:** 2026-02-07  
**Priority:** 🔥 High (Bug Fix)
