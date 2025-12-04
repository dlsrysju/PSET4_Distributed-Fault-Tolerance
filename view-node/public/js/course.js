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
        console.error('loadCourses error:', error);
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
        <div class="course-card clickable" ${currentUser.role === 'faculty' ? `onclick="openStudentList('${course.code}')"` : ''}>
            <div class="course-code">${course.code}</div>
            <div class="course-title">${course.title}</div>
            <div class="course-faculty">Instructor: ${course.faculty_first_name || 'TBA'} ${course.faculty_last_name || ''}</div>
            <p class="course-desc">${course.description || 'No description'}</p>
            <div class="course-info">
                <span class="course-status status-${course.status}">${course.status}</span>
                <span class="enrollment-count">${course.enrolled_count || 0}/${course.max_students} enrolled</span>
            </div>
            ${currentUser.role === 'student' && course.status === 'open' ? 
                `<button class="btn btn-success btn-enroll" onclick="event.stopPropagation(); enrollCourse(${course.id});">Enroll</button>` 
                : ''}
            ${currentUser.role === 'faculty' ? `<span class="click-indicator">View students →</span>` : ''}
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
        console.error('enrollCourse error:', error);
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

// Faculty: view students enrolled in a course
async function openStudentList(courseCode) {
    try {
        const response = await fetch(`${CONTROLLERS.grade}/api/grades/enrollments`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (!data.success) {
            alert(data.error || 'Unable to fetch enrollments');
            return;
        }
        const enrollments = data.data || [];
        const filtered = enrollments.filter(e => e.course_code === courseCode);
        renderStudentListModal(courseCode, filtered);
    } catch (err) {
        console.error('openStudentList error:', err);
        alert('Unable to load student list');
    }
}

function renderStudentListModal(courseCode, enrollments) {
    const modal = document.getElementById('studentListModal');
    const content = document.getElementById('studentListContent');

    if (!modal || !content) return;

    if (enrollments.length === 0) {
        content.innerHTML = `<p class="text-center">No students enrolled in ${courseCode} yet.</p>`;
    } else {
        content.innerHTML = `
            <p class="eyebrow">Course</p>
            <h3 style="margin-bottom:12px;">${courseCode}</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Email</th>
                        <th>Enrolled At</th>
                        <th>Grade</th>
                    </tr>
                </thead>
                <tbody>
                    ${enrollments.map(e => `
                        <tr>
                            <td>${e.student_first_name} ${e.student_last_name}</td>
                            <td>${e.student_email || '-'}</td>
                            <td>${e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : '-'}</td>
                            <td>${e.grade || 'Not graded'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.onclick = () => modal.classList.remove('active');
    }
    modal.classList.add('active');
}
