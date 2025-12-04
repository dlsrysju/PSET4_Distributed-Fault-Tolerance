// ========== js/profile.js - Profile update logic ==========

function setupProfileUI() {
    const profileForm = document.getElementById('profileForm');
    const profileBtn = document.getElementById('profileBtn');
    const profileClose = document.querySelector('#profileModal .modal-close');

    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
    if (profileBtn) {
        profileBtn.addEventListener('click', openProfileModal);
    }
    if (profileClose) {
        profileClose.addEventListener('click', closeProfileModal);
    }
}

function openProfileModal() {
    if (!currentUser) return;
    document.getElementById('profileAlert').innerHTML = '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profileFirstName').value = currentUser.firstName || '';
    document.getElementById('profileLastName').value = currentUser.lastName || '';
    document.getElementById('profilePassword').value = '';
    const roleBadge = document.getElementById('profileRoleInline');
    if (roleBadge) roleBadge.textContent = currentUser.role || '-';
    document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

async function handleProfileSubmit(e) {
    e.preventDefault();

    const email = document.getElementById('profileEmail').value.trim();
    const password = document.getElementById('profilePassword').value.trim();
    const firstName = document.getElementById('profileFirstName').value.trim();
    const lastName = document.getElementById('profileLastName').value.trim();

    try {
        const response = await fetch(`${CONTROLLERS.profile}/api/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                email,
                password: password || undefined,
                firstName,
                lastName
            })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.data.user;
            if (data.data.token) {
                authToken = data.data.token;
                localStorage.setItem('authToken', authToken);
            }
            localStorage.setItem('user', JSON.stringify(currentUser));
            renderUserName();
            showAlert('profileAlert', 'Profile updated successfully', 'success');
            closeProfileModal();
        } else {
            showAlert('profileAlert', data.error || 'Unable to update profile', 'error');
        }
    } catch (error) {
        showAlert('profileAlert', 'Profile service unavailable', 'error');
    }
}

async function refreshProfile() {
    if (!authToken) return;
    try {
        const response = await fetch(`${CONTROLLERS.profile}/api/profile/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();
        if (data.success && data.data?.user) {
            currentUser = { ...currentUser, ...data.data.user };
            localStorage.setItem('user', JSON.stringify(currentUser));
            renderUserName();
        }
    } catch (error) {
        console.warn('Profile refresh failed:', error);
    }
}
