const API_BASE_URL = 'http://localhost:8000/api/v1';

const StorageKeys = {
    CURRENT_USER: 'currentUser',
    ACCESS_TOKEN: 'accessToken'
};

function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

function removeFromStorage(key) {
    localStorage.removeItem(key);
}

function showMessage(message, type = 'info') {
    alert(message);
}

function redirectTo(url) {
    window.location.href = url;
}

function checkAuth() {
    const currentUser = getFromStorage(StorageKeys.CURRENT_USER);
    return currentUser !== null;
}

function requireAuth() {
    if (!checkAuth()) {
        redirectTo('index.html');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getAuthHeaders() {
    const token = getFromStorage(StorageKeys.ACCESS_TOKEN);
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
}

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                ...getAuthHeaders(),
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || data.message || 'Có lỗi xảy ra');
        }

        return { success: true, data, status: response.status };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

