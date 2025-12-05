// ========== js/app.js - Main Application Logic ==========

// public/js/app.js
// Now all go through view-node (same origin)
const CONTROLLERS = {
    auth: '',
    course: '',
    grade: '',
    profile: ''
};

// Optional: add separate URLs for health checks
const HEALTH_ENDPOINTS = {
  auth:   '/api/health/auth',
  course: '/api/health/course',
  grade:  '/api/health/grade',
  profile: '/api/health/profile',
  account: '/api/health/account',
};

// Application state
let currentUser = null;
let authToken = null;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    checkAuth();
    setupEventListeners();
    checkServiceHealth();
    setInterval(checkServiceHealth, 30000);
}

function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            if (typeof openProfileModal === 'function') openProfileModal();
        });
    }
    if (typeof setupRegisterUI === 'function') {
        setupRegisterUI();
    }
    const gradeClose = document.querySelector('#gradeModal .modal-close');
    if (gradeClose) {
        gradeClose.addEventListener('click', () => {
            document.getElementById('gradeModal').classList.remove('active');
        });
    }
    
    document.querySelectorAll('.nav-btn').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    if (typeof setupProfileUI === 'function') {
        setupProfileUI();
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.nav-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabButton) tabButton.classList.add('active');
    const view = document.getElementById(`${tabName}View`);
    if (view) view.classList.add('active');
    
    if (tabName === 'courses') loadCourses();
    if (tabName === 'enrollments') loadEnrollments();
    if (tabName === 'grades') loadGrades();
    if (tabName === 'profile' && typeof refreshProfile === 'function') refreshProfile();
}

// VIEW: Show/hide sections
function showLogin() {
    const loginView = document.getElementById('loginView');
    const appView = document.getElementById('appView');
    const status = document.getElementById('serviceStatus');
    if (loginView) {
        loginView.classList.remove('hidden');
        loginView.style.display = 'block';
    }
    if (appView) {
        appView.classList.add('hidden');
        appView.style.display = 'none';
    }
    if (status) {
        status.classList.remove('hidden');
        status.style.display = 'flex';
    }
    document.getElementById('logoutBtn').style.display = 'none';
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('hidden');
    document.body.classList.add('login-state');
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) profileBtn.style.display = 'none';
    const userName = document.getElementById('userName');
    if (userName) userName.classList.add('hidden');
}

function showApp() {
    const loginView = document.getElementById('loginView');
    const appView = document.getElementById('appView');
    const status = document.getElementById('serviceStatus');
    if (loginView) {
        loginView.classList.add('hidden');
        loginView.style.display = 'none';
    }
    if (appView) {
        appView.classList.remove('hidden');
        appView.style.display = 'block';
    }
    if (status) {
        status.classList.remove('hidden');
        status.style.display = 'flex';
    }
    document.getElementById('logoutBtn').style.display = 'block';
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('hidden');
    document.body.classList.remove('login-state');
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) profileBtn.style.display = 'block';
    const userName = document.getElementById('userName');
    if (userName) userName.classList.remove('hidden');
    renderUserName();
    if (typeof refreshProfile === 'function') {
        refreshProfile();
    }
    
    if (currentUser.role === 'faculty') {
        document.getElementById('enrollmentsTab').style.display = 'none';
        document.getElementById('gradesTab').textContent = 'Manage Grades';
    } else if (currentUser.role === 'student') {
        document.getElementById('enrollmentsTab').style.display = '';
        document.getElementById('gradesTab').textContent = 'Grades';
    }
    
    loadCourses();
}

// VIEW: Alert helper
function showAlert(containerId, message, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    if (type === 'success') {
        showToast(message);
    }
}

// VIEW: Loading helpers
function showLoading(section) {
    document.getElementById(`${section}Loading`).classList.remove('hidden');
    document.getElementById(`${section}Error`).innerHTML = '';
}

function hideLoading(section) {
    document.getElementById(`${section}Loading`).classList.add('hidden');
}

function showError(section, message) {
    hideLoading(section);
    document.getElementById(`${section}Error`).innerHTML = 
        `<div class="alert alert-warning">${message}. This service may be temporarily unavailable.</div>`;
}

function renderUserName() {
    if (!currentUser) return;
    const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() 
        || currentUser.email 
        || 'User';
    document.getElementById('userName').textContent = 
        `${fullName} (${currentUser.role})`;
}

function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3500);
}
