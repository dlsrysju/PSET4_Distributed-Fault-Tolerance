// ========== js/courses.js - Courses VIEW Logic ==========

async function loadCourses() {
    showLoading('courses');
    try {
        const response = await fetch(`${CONTROLLERS.course}/api/courses`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            displayCourses(data.data);
        } else {
            showError('courses', data.error);
        }
    } catch (error) {
        showError('courses', 'Course controller unavailable');
    }
}

function displayCourses(courses) {
    hideLoading('courses');
    const container = document.getElementById('coursesList');
    
    if (courses.length === 0) {
        container.innerHTML = '<p class="text-center">No courses available</p>';
        return;
    }

    container.innerHTML = courses.map(course => `
        <div class="course-card">
            <div class="course-code">${course.code}</div>
            <div class="course-title">${course.title}</div>
            <div class="course-faculty">👨‍🏫 ${course.faculty_first_name || 'TBA'} ${course.faculty_last_name || ''}</div>
            <p class="course-desc">${course.description || 'No description'}</p>
            <div class="course-info">
                <span class="course-status status-${course.status}">${course.status.toUpperCase()}</span>
                <span class="enrollment-count">${course.enrolled_count || 0}/${course.max_students} enrolled</span>
            </div>
            ${currentUser.role === 'student' && course.status === 'open' ? 
                `<button class="btn btn-success btn-enroll" onclick="enrollCourse(${course.id})">Enroll</button>` 
                : ''}
        </div>
    `).join('');
}

async function enrollCourse(courseId) {
    try {
        const response = await fetch(`${CONTROLLERS.course}/api/enrollments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ courseId })
        });

        const data = await response.json();

        if (data.success) {
            alert('Successfully enrolled!');
            loadCourses();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Course controller unavailable');
    }
}

async function loadEnrollments() {
    showLoading('enrollments');
    try {
        const response = await fetch(`${CONTROLLERS.course}/api/enrollments/my`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            displayEnrollments(data.data);
        } else {
            showError('enrollments', data.error);
        }
    } catch (error) {
        showError('enrollments', 'Course controller unavailable');
    }
}

function displayEnrollments(enrollments) {
    hideLoading('enrollments');
    const container = document.getElementById('enrollmentsList');
    
    if (enrollments.length === 0) {
        container.innerHTML = '<p class="text-center">No enrollments yet</p>';
        return;
    }

    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Course Code</th>
                    <th>Course Title</th>
                    <th>Faculty</th>
                    <th>Enrolled Date</th>
                </tr>
            </thead>
            <tbody>
                ${enrollments.map(e => `
                    <tr>
                        <td>${e.code}</td>
                        <td>${e.title}</td>
                        <td>${e.faculty_first_name} ${e.faculty_last_name}</td>
                        <td>${new Date(e.enrolled_at).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}