// Simple authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token && !window.location.pathname.includes('login.html')) {
        window.location.href = '/login.html';
        return;
    }

    if (user) {
        const userData = JSON.parse(user);
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay) {
            userDisplay.textContent = `${userData.first_name} ${userData.last_name}`;
        }
    }
}

async function login(email, password) {
    try {
        const response = await api.post('/auth/login', { email, password });

        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));

        window.location.href = '/index.html';
    } catch (error) {
        throw error;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}
