
// Function to delete selected teacher from filter list
window.deleteCurrentTeacherFilter = function () {
    const select = document.getElementById('filterClassTeacher');
    if (!select) return;

    const selectedValue = select.value;
    const selectedText = select.options[select.selectedIndex].text;

    // Prevent deleting "All Teachers"
    if (selectedValue === 'all') {
        Swal.fire({
            icon: 'warning',
            title: 'សុំទោស',
            text: 'មិនអាចលុបជម្រើស "ទាំងអស់" បានទេ (Cannot delete "All" option)',
            timer: 2000,
            showConfirmButton: false
        });
        return;
    }

    // Check if this teacher has any active students
    // We check against rawStudentsArray which contains all loaded students
    const hasData = rawStudentsArray.some(s => {
        const tName = (s.teacherName || '').trim();
        // Check exact match or if the student's teacher name contains the filter value (loose match)
        return tName === selectedValue;
    });

    if (hasData) {
        Swal.fire({
            icon: 'error',
            title: 'មិនអាចលុបបាន',
            text: `ឈ្មោះគ្រូ "${selectedText}" មានទិន្នន័យសិស្ស។ សូមលុបតែឈ្មោះណាដែលគ្មានទិន្នន័យ។ (This teacher has student data)`,
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#8a0e5b'
        });
        return;
    }

    // Confirm deletion
    Swal.fire({
        title: 'តើអ្នកចង់លុបមែនទេ?',
        text: `តើអ្នកចង់លុបឈ្មោះ "${selectedText}" ចេញពីបញ្ជីឬ?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'លុបចេញ',
        cancelButtonText: 'បោះបង់'
    }).then((result) => {
        if (result.isConfirmed) {
            // Remove the option
            select.remove(select.selectedIndex);

            // Switch back to 'all'
            select.value = 'all';
            currentFilters.filterClassTeacher = 'all';

            // Update table
            const tableBody = document.getElementById('studentDataBody');
            if (renderFilteredTable) {
                renderFilteredTable();
            }

            Swal.fire({
                icon: 'success',
                title: 'បានលុបជោគជ័យ',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
};
