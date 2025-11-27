// ========== js/auth.js - Authentication VIEW Logic ==========

function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        showApp();
    } else {
        showLogin();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${CONTROLLERS.auth}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.data.token;
            currentUser = data.data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            showApp();
        } else {
            showAlert('loginAlert', data.error, 'error');
        }
    } catch (error) {
        showAlert('loginAlert', 'Authentication controller unavailable', 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    showLogin();
}
