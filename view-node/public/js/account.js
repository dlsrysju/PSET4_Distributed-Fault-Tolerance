// account.js - registration for students

function setupRegisterUI() {
    const openBtn = document.getElementById('openRegisterBtn');
    const closeBtn = document.querySelector('#registerModal .modal-close');
    const form = document.getElementById('registerForm');

    if (openBtn) {
        openBtn.addEventListener('click', openRegisterModal);
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', closeRegisterModal);
    }
    if (form) {
        form.addEventListener('submit', handleRegister);
    }
}

function openRegisterModal() {
    document.getElementById('registerAlert').innerHTML = '';
    document.getElementById('registerForm').reset();
    document.getElementById('registerModal').classList.add('active');
}

function closeRegisterModal() {
    document.getElementById('registerModal').classList.remove('active');
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const firstName = document.getElementById('registerFirstName').value.trim();
    const lastName = document.getElementById('registerLastName').value.trim();

    try {
        const resp = await fetch('/api/account/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, firstName, lastName })
        });
        const data = await resp.json();
        if (data.success) {
            showAlert('registerAlert', 'Account created! You can log in now.', 'success');
            showToast('Account created! Please log in.');
            closeRegisterModal();
        } else {
            showAlert('registerAlert', data.error || 'Unable to create account', 'error');
        }
    } catch (err) {
        showAlert('registerAlert', 'Account service unavailable', 'error');
    }
}
