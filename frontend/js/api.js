// Simple API client
const API_BASE_URL = 'https://localhost:3000/api/v1';

// Helper function to get cookie value by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

const api = {
    async request(endpoint, options = {}) {
        // Read CSRF token from cookie (not HTTP-only, so JavaScript can access it)
        const csrfToken = getCookie('csrfToken');

        const headers = {
            'Content-Type': 'application/json',
            // Only send CSRF token for state-changing methods
            ...(csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET') &&
                { 'X-CSRF-Token': csrfToken }),
            ...options.headers,
        };

        const config = {
            ...options,
            headers,
            credentials: 'include', // Send cookies with every request
        };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

            if (response.status === 401) {
                // Unauthorized - redirect to login (unless already on login page)
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = '/login.html';
                }
                throw new Error('Unauthorized');
            }

            if (response.status === 403) {
                const error = await response.json().catch(() => ({}));
                // If CSRF token expired, redirect to login to get a new one
                if (error.error === 'CSRF token expired' || error.error === 'Invalid CSRF token') {
                    if (!window.location.pathname.includes('login.html')) {
                        alert('Your session has expired. Please log in again.');
                        window.location.href = '/login.html';
                    }
                    throw new Error('Session expired');
                }
                throw new Error(error.error || error.message || `HTTP ${response.status}`);
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || error.message || `HTTP ${response.status}`);
            }

            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    get(endpoint, params = {}) {
        const query = new URLSearchParams(params).toString();
        const url = query ? `${endpoint}?${query}` : endpoint;
        return this.request(url);
    },

    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE',
        });
    },
};
