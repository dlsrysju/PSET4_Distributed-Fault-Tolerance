// ========== js/app.js - Main Application Logic ==========

// Configuration - CONTROLLER endpoints
const CONTROLLERS = {
    auth: 'http://localhost:4001',
    course: 'http://localhost:4002',
    grade: 'http://localhost:4003'
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
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    document.querySelector('.modal-close').addEventListener('click', () => {
        document.getElementById('gradeModal').classList.remove('active');
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}View`).classList.add('active');
    
    if (tabName === 'courses') loadCourses();
    if (tabName === 'enrollments') loadEnrollments();
    if (tabName === 'grades') loadGrades();
}

// VIEW: Show/hide sections
function showLogin() {
    document.getElementById('loginView').classList.remove('hidden');
    document.getElementById('appView').classList.add('hidden');
    document.getElementById('logoutBtn').style.display = 'none';
}

function showApp() {
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('appView').classList.remove('hidden');
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('userName').textContent = 
        `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`;
    
    if (currentUser.role === 'faculty') {
        document.getElementById('enrollmentsTab').style.display = 'none';
        document.getElementById('gradesTab').textContent = 'Manage Grades';
    }
    
    loadCourses();
}

// VIEW: Alert helper
function showAlert(containerId, message, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
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
