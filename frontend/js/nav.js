// Shared Navigation Component
// Usage: Add <div id="app-nav"></div> in your HTML and call renderNav('pageName')

function renderNav(activePage = '') {
    const navContainer = document.getElementById('app-nav');
    if (!navContainer) return;

    // Get user data immediately to prevent layout shift
    let userName = 'User';
    const user = localStorage.getItem('user');
    if (user) {
        try {
            const userData = JSON.parse(user);
            userName = `${userData.first_name} ${userData.last_name}`;
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }

    // Determine if we're in a subdirectory
    const isSubdir = window.location.pathname.includes('/pages/');
    const prefix = isSubdir ? '../' : '';
    const pagesPrefix = isSubdir ? '' : 'pages/';

    const pages = [
        { name: 'dashboard', label: 'Dashboard', href: `${prefix}index.html` },
        { name: 'matters', label: 'Matters', href: `${pagesPrefix}matters.html` },
        { name: 'calendar', label: 'Calendar', href: `${pagesPrefix}calendar.html` },
        { name: 'billing', label: 'Time Entry', href: `${pagesPrefix}billing.html` },
        { name: 'expenses', label: 'Expenses', href: `${pagesPrefix}expenses.html` },
        { name: 'unbilled', label: 'Unbilled Time', href: `${pagesPrefix}unbilled-time.html` },
        { name: 'invoices', label: 'Invoices', href: `${pagesPrefix}invoices.html` },
        { name: 'ai', label: 'AI Assistant', href: `${pagesPrefix}ai-assistant.html` },
        { name: 'settings', label: 'Settings', href: `${pagesPrefix}settings.html` }
    ];

    const navLinks = pages.map(page => {
        const isActive = page.name === activePage;
        const classes = isActive
            ? 'border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium';

        return `<a href="${page.href}" class="${classes}">${page.label}</a>`;
    }).join('\n                        ');

    navContainer.innerHTML = `
    <nav class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <div class="flex">
                    <div class="flex-shrink-0 flex items-center">
                        <h1 class="text-xl font-bold text-gray-800">Case Management</h1>
                    </div>
                    <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
                        ${navLinks}
                    </div>
                </div>
                <div class="flex items-center">
                    <span class="text-sm text-gray-700 mr-4" id="userDisplay">${userName}</span>
                    <button onclick="logout()" class="text-sm text-gray-500 hover:text-gray-700">Logout</button>
                </div>
            </div>
        </div>
    </nav>`;
}
