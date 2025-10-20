/**
 * Searchable Select Initialization
 * Converts all select elements into searchable dropdowns using Select2
 */

// Initialize searchable selects after DOM is loaded
function initSearchableSelects() {
    // Wait for Select2 to be loaded
    if (typeof $ === 'undefined' || typeof $.fn.select2 === 'undefined') {
        console.warn('Select2 not loaded yet, retrying...');
        setTimeout(initSearchableSelects, 100);
        return;
    }

    // Initialize all select elements with Select2
    $('select').each(function() {
        const $select = $(this);

        // Skip if already initialized
        if ($select.hasClass('select2-hidden-accessible')) {
            return;
        }

        // Get placeholder from first option or default
        let placeholder = 'Select an option...';
        const firstOption = $select.find('option:first');
        if (firstOption.length && firstOption.val() === '') {
            placeholder = firstOption.text();
        }

        // Initialize Select2 with custom styling
        $select.select2({
            placeholder: placeholder,
            allowClear: true,
            width: '100%',
            dropdownAutoWidth: true,
            theme: 'default',
            minimumResultsForSearch: 5, // Show search box only if more than 5 options
            containerCssClass: 'select2-tailwind',
            dropdownCssClass: 'select2-tailwind-dropdown'
        });

        // Preserve Tailwind classes
        $select.next('.select2-container').addClass('w-full');
    });
}

// Re-initialize when new selects are added dynamically
function refreshSearchableSelects() {
    initSearchableSelects();
}

// Destroy and reinitialize a specific select
function refreshSelect(selectId) {
    const $select = $('#' + selectId);
    if ($select.hasClass('select2-hidden-accessible')) {
        $select.select2('destroy');
    }

    // Get placeholder
    let placeholder = 'Select an option...';
    const firstOption = $select.find('option:first');
    if (firstOption.length && firstOption.val() === '') {
        placeholder = firstOption.text();
    }

    // Reinitialize
    $select.select2({
        placeholder: placeholder,
        allowClear: true,
        width: '100%',
        dropdownAutoWidth: true,
        theme: 'default',
        minimumResultsForSearch: 5,
        containerCssClass: 'select2-tailwind',
        dropdownCssClass: 'select2-tailwind-dropdown'
    });

    $select.next('.select2-container').addClass('w-full');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Small delay to ensure other scripts have populated selects
        setTimeout(initSearchableSelects, 500);
    });
} else {
    setTimeout(initSearchableSelects, 500);
}
