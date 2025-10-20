// Helper function to get cookie value by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Simple authentication - checks for token cookie
function checkAuth() {
    // Check for csrfToken (readable) instead of token (HttpOnly)
    // Or check if user info exists in localStorage
    const csrfToken = getCookie('csrfToken');
    const user = localStorage.getItem('user');

    if (!csrfToken && !user && !window.location.pathname.includes('login.html')) {
        window.location.href = '/login.html';
        return;
    }
}

async function login(email, password) {
    try {
        const response = await api.post('/auth/login', { email, password });

        // Tokens are now in HTTP-only cookies (set by server)
        // Only store user info in localStorage
        localStorage.setItem('user', JSON.stringify(response.user));

        window.location.href = '/index.html';
    } catch (error) {
        throw error;
    }
}

function logout() {
    // Clear user data from localStorage
    localStorage.removeItem('user');

    // Clear cookies by setting them to expire immediately
    document.cookie = 'token=; Max-Age=0; Path=/';
    document.cookie = 'csrfToken=; Max-Age=0; Path=/';

    window.location.href = '/login.html';
}
