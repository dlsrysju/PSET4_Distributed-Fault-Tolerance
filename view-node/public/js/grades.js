// ========== js/grades.js - Grades VIEW Logic ==========

async function loadGrades() {
    showLoading('grades');
    try {
        const endpoint = currentUser.role === 'student' 
            ? `${CONTROLLERS.grade}/api/grades/my`
            : `${CONTROLLERS.grade}/api/grades/enrollments`;
        
        const response = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            if (currentUser.role === 'student') {
                displayStudentGrades(data.data);
            } else {
                displayFacultyGrades(data.data);
            }
        } else {
            showError('grades', data.error);
        }
    } catch (error) {
        showError('grades', 'Grade controller unavailable');
    }
}

function displayStudentGrades(grades) {
    hideLoading('grades');
    const container = document.getElementById('gradesList');
    
    if (grades.length === 0) {
        container.innerHTML = '<p class="text-center">No grades available yet</p>';
        return;
    }

    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Course Code</th>
                    <th>Course Title</th>
                    <th>Grade</th>
                    <th>Remarks</th>
                    <th>Uploaded By</th>
                </tr>
            </thead>
            <tbody>
                ${grades.map(g => `
                    <tr>
                        <td>${g.course_code}</td>
                        <td>${g.course_title}</td>
                        <td><strong>${g.grade}</strong></td>
                        <td>${g.remarks || '-'}</td>
                        <td>${g.faculty_first_name} ${g.faculty_last_name}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayFacultyGrades(enrollments) {
    hideLoading('grades');
    const container = document.getElementById('gradesList');
    
    if (enrollments.length === 0) {
        container.innerHTML = '<p class="text-center">No enrollments in your courses</p>';
        return;
    }

    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Course</th>
                    <th>Student</th>
                    <th>Grade</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${enrollments.map(e => `
                    <tr>
                        <td>${e.course_code}</td>
                        <td>${e.student_first_name} ${e.student_last_name}</td>
                        <td>${e.grade || 'Not graded'}</td>
                        <td>
                            <button class="btn btn-primary btn-sm" 
                                    onclick="openGradeModal(${e.enrollment_id}, '${e.course_code}', '${e.student_first_name} ${e.student_last_name}', '${e.grade || ''}', '${e.remarks || ''}')">
                                ${e.grade ? 'Update' : 'Upload'} Grade
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function openGradeModal(enrollmentId, courseCode, studentName, currentGrade, currentRemarks) {
    const modal = document.getElementById('gradeModal');
    const content = document.getElementById('gradeModalContent');
    
    content.innerHTML = `
        <div class="form-group">
            <label>Course: <strong>${courseCode}</strong></label>
            <label>Student: <strong>${studentName}</strong></label>
        </div>
        <form id="gradeForm" onsubmit="submitGrade(event, ${enrollmentId})">
            <div class="form-group">
                <label>Grade</label>
                <select id="gradeInput" required>
                    <option value="">Select grade</option>
                    <option value="A" ${currentGrade === 'A' ? 'selected' : ''}>A</option>
                    <option value="B+" ${currentGrade === 'B+' ? 'selected' : ''}>B+</option>
                    <option value="B" ${currentGrade === 'B' ? 'selected' : ''}>B</option>
                    <option value="C+" ${currentGrade === 'C+' ? 'selected' : ''}>C+</option>
                    <option value="C" ${currentGrade === 'C' ? 'selected' : ''}>C</option>
                    <option value="D" ${currentGrade === 'D' ? 'selected' : ''}>D</option>
                    <option value="F" ${currentGrade === 'F' ? 'selected' : ''}>F</option>
                </select>
            </div>
            <div class="form-group">
                <label>Remarks (Optional)</label>
                <textarea id="remarksInput" rows="3">${currentRemarks}</textarea>
            </div>
            <button type="submit" class="btn btn-primary">Submit Grade</button>
        </form>
    `;
    
    modal.classList.add('active');
}

async function submitGrade(e, enrollmentId) {
    e.preventDefault();
    
    const grade = document.getElementById('gradeInput').value;
    const remarks = document.getElementById('remarksInput').value;
    
    try {
        const response = await fetch(`${CONTROLLERS.grade}/api/grades/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enrollmentId, grade, remarks })
        });

        const data = await response.json();

        if (data.success) {
            alert('Grade uploaded successfully!');
            document.getElementById('gradeModal').classList.remove('active');
            loadGrades();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Grade controller unavailable');
    }
}

// Check service health
async function checkServiceHealth() {
    const services = ['auth', 'course', 'grade'];
    const statusContainer = document.getElementById('serviceStatus');
    const statuses = [];

    for (const service of services) {
        try {
            const response = await fetch(`${CONTROLLERS[service]}/health`, { 
                signal: AbortSignal.timeout(2000)
            });
            const data = await response.json();
            statuses.push({
                name: service,
                status: data.success ? 'healthy' : 'unhealthy'
            });
        } catch (error) {
            statuses.push({
                name: service,
                status: 'unhealthy'
            });
        }
    }

    statusContainer.innerHTML = statuses.map(s => `
        <span class="service-badge service-${s.status}">
            ${s.name.toUpperCase()} Controller: ${s.status.toUpperCase()}
        </span>
    `).join('');
}
