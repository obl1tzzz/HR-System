// Конфигурация API
const API_BASE_URL = 'http://localhost:3000/api';

// Глобальные переменные
let specialists = [];
let interviews = [];
let skills = [];
let currentSpecialistId = null;
let currentInterviewId = null;

let INTERVIEW_DURATION_HOURS;
let INTERVIEW_DURATION_MINUTES;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function () {
    initTabs();
    loadSkills();
    loadSpecialists();
    loadInterviews();
    loadInterviewTime();

    // Назначаем обработчики событий
    document.getElementById('addSpecialistBtn').addEventListener('click', showAddSpecialistModal);
    document.getElementById('addInterviewBtn').addEventListener('click', showAddInterviewModal);
    document.getElementById('addSkillBtn').addEventListener('click', addSkill);
    document.getElementById('specialistSearch').addEventListener('input', filterSpecialists);
    document.getElementById('interviewSearch').addEventListener('input', filterInterviews);

    // Загрузка навыков для фильтров
    loadSkillsForFilters();
});

function addMinutes(time, hours, minutes) {
    const date = new Date(`1970-01-01T${time}`);
    date.setHours(date.getHours() + hours);
    date.setMinutes(date.getMinutes() + minutes);

    // Форматирование обратно в HH:MM:SS
    const hoursStr = String(date.getHours()).padStart(2, '0');
    const minutesStr = String(date.getMinutes()).padStart(2, '0');
    return `${hoursStr}:${minutesStr}:00`;
}

// Управление вкладками
function initTabs() {
    const tabItems = document.querySelectorAll('.nav-menu li');
    console.log()
    document.querySelector('[data-tab=specialists]').addEventListener('click', loadSpecialists);
    document.querySelector('[data-tab=interviews]').addEventListener('click', loadInterviews);
    document.querySelector('[data-tab=skills]').addEventListener('click', loadSkills);

    tabItems.forEach(tab => {
        tab.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');

            // Обновляем активную вкладку в меню
            tabItems.forEach(item => item.classList.remove('active'));
            this.classList.add('active');

            // Показываем соответствующую вкладку контента
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
        });
    });
}

async function loadInterviewTime() {
    try {
        const response = await fetch(`${API_BASE_URL}/time`);
        if (!response.ok) throw new Error('Не удалось получить время собеседования');

        const res = await response.json();
        INTERVIEW_DURATION_HOURS = res.hours;
        INTERVIEW_DURATION_MINUTES = res.minutes;
    } catch (error) {
        showNotification('Ошибка загрузки времени', 'error');
        console.error('Ошибка при загрузке времени:', error);
    }
}

// Загрузка навыков
async function loadSkills() {
    try {
        const response = await fetch(`${API_BASE_URL}/skills`);
        if (!response.ok) throw new Error('Не удалось загрузить навыки');

        skills = await response.json();
        loadSkillsForFilters();
        renderSkills();
    } catch (error) {
        showNotification('Ошибка загрузки навыков', 'error');
        console.error('Ошибка при загрузке навыков:', error);
    }
}

// Загрузка навыков для фильтров
function loadSkillsForFilters() {
    const skillFilter = document.getElementById('specialistSkillFilter');

    skills.forEach(skill => {
        const option = document.createElement('option');
        option.value = skill.id;
        option.textContent = skill.name;
        skillFilter.appendChild(option);
    });

    skillFilter.addEventListener('change', filterSpecialists);
}

// Загрузка специалистов
async function loadSpecialists() {
    try {
        const response = await fetch(`${API_BASE_URL}/specialists`);
        if (!response.ok) throw new Error('Не удалось загрузить специалистов');

        specialists = await response.json();
        renderSpecialists();

        // Обновляем фильтр собеседований
        updateSpecialistFilter();

        loadSkills();
    } catch (error) {
        showNotification('Ошибка загрузки специалистов', 'error');
        console.error('Ошибка при загрузке специалистов:', error);
    }
}

// Загрузка собеседований
async function loadInterviews() {
    try {
        const response = await fetch(`${API_BASE_URL}/interviews`);
        if (!response.ok) throw new Error('Не удалось загрузить собеседования');

        interviews = await response.json();
        renderInterviews();

        loadSpecialists();
    } catch (error) {
        showNotification('Ошибка загрузки собеседований', 'error');
        console.error('Ошибка при загрузке собеседований:', error);
    }
}

// Отображение специалистов
function renderSpecialists(filteredSpecialists = null) {
    const specialistsToRender = filteredSpecialists || specialists;
    const tbody = document.getElementById('specialistsTableBody');
    tbody.innerHTML = '';

    if (specialistsToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Нет данных</td></tr>';
        return;
    }

    specialistsToRender.forEach(specialist => {
        const row = document.createElement('tr');

        // Форматируем время доступности
        const availability = `${specialist.available_start.substring(0, 5)} - ${specialist.available_end.substring(0, 5)}`;

        // Создаем теги навыков
        let skillsHtml = '';
        if (specialist.skills_names && specialist.skills_names.length > 0) {
            skillsHtml = specialist.skills_names.map(skill =>
                `<span class="skill-tag">${skill}</span>`
            ).join('');
        } else {
            skillsHtml = '<span class="skill-tag">Нет навыков</span>';
        }

        row.innerHTML = `
            <td><strong>${specialist.full_name}</strong></td>
            <td><code>${specialist.id}</code></td>
            <td>${availability}</td>
            <td>${skillsHtml}</td>
            <td>
                <button class="btn btn-sm btn-primary view-interviews-btn" data-id="${specialist.id}">
                    <i class="fas fa-eye"></i> Просмотр
                </button>
            </td>
            <td>
                <button class="btn btn-sm btn-primary edit-specialist-btn" data-id="${specialist.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-specialist-btn" data-id="${specialist.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });

    // Назначаем обработчики событий
    document.querySelectorAll('.edit-specialist-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const specialistId = this.getAttribute('data-id');
            showEditSpecialistModal(specialistId);
        });
    });

    document.querySelectorAll('.delete-specialist-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const specialistId = this.getAttribute('data-id');
            deleteSpecialist(specialistId);
        });
    });

    document.querySelectorAll('.view-interviews-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const specialistId = this.getAttribute('data-id');
            showSpecialistInterviewsModal(specialistId);
        });
    });
}

// Отображение собеседований
function renderInterviews(filteredInterviews = null) {
    const interviewsToRender = filteredInterviews || interviews;
    const tbody = document.getElementById('interviewsTableBody');
    tbody.innerHTML = '';

    if (interviewsToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Нет данных</td></tr>';
        return;
    }

    interviewsToRender.forEach(interview => {
        const row = document.createElement('tr');

        // Форматируем время
        const interviewTime = interview.interview_time.substring(0, 5);

        // Создаем теги навыков
        let skillsHtml = '';
        if (interview.skills_names && interview.skills_names.length > 0) {
            skillsHtml = interview.skills_names.map(skill =>
                `<span class="skill-tag">${skill}</span>`
            ).join('');
        } else {
            skillsHtml = '<span class="skill-tag">Нет навыков</span>';
        }

        row.innerHTML = `
            <td><strong>${interview.candidate_name}</strong></td>
            <td><code>${interview.id}</code></td>
            <td>${interviewTime}</td>
            <td>${interview.specialist_name || 'Не назначен'}</td>
            <td>${skillsHtml}</td>
            <td>
                <button class="btn btn-sm btn-primary transfer-interview-btn" data-id="${interview.id}">
                    <i class="fas fa-exchange-alt"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-interview-btn" data-id="${interview.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });

    // Назначаем обработчики событий
    document.querySelectorAll('.transfer-interview-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const interviewId = this.getAttribute('data-id');
            showTransferInterviewModal(interviewId);
        });
    });

    document.querySelectorAll('.delete-interview-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const interviewId = this.getAttribute('data-id');
            deleteInterview(interviewId);
        });
    });
}

// Отображение навыков
function renderSkills() {
    const container = document.getElementById('skillsContainer');
    container.innerHTML = '';

    if (skills.length === 0) {
        container.innerHTML = '<p>Нет навыков. Добавьте первый навык.</p>';
        return;
    }

    skills.forEach(skill => {
        const skillCard = document.createElement('div');
        skillCard.className = 'skill-card';

        skillCard.innerHTML = `
            <span>${skill.name}</span>
            <button class="btn btn-sm btn-danger delete-skill-btn" data-id="${skill.id}">
                <i class="fas fa-trash"></i>
            </button>
        `;

        container.appendChild(skillCard);
    });

    // Назначаем обработчики событий для удаления навыков
    document.querySelectorAll('.delete-skill-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const skillId = this.getAttribute('data-id');
            deleteSkill(skillId);
        });
    });
}

// Фильтрация специалистов
function filterSpecialists() {
    const searchTerm = document.getElementById('specialistSearch').value.toLowerCase();
    const skillFilter = document.getElementById('specialistSkillFilter').value;

    let filtered = specialists;

    // Фильтрация по поисковому запросу
    if (searchTerm) {
        filtered = filtered.filter(s =>
            s.full_name.toLowerCase().includes(searchTerm)
        );
    }

    // Фильтрация по навыку
    if (skillFilter) {
        filtered = filtered.filter(s =>
            s.skills_names && s.skills_names.some(skillName =>
                skills.find(skill => skill.id == skillFilter)?.name === skillName
            )
        );
    }

    renderSpecialists(filtered);
}

// Фильтрация собеседований
function filterInterviews() {
    const searchTerm = document.getElementById('interviewSearch').value.toLowerCase();
    const specialistFilter = document.getElementById('interviewSpecialistFilter').value;

    let filtered = interviews;

    // Фильтрация по поисковому запросу
    if (searchTerm) {
        filtered = filtered.filter(i =>
            i.candidate_name.toLowerCase().includes(searchTerm)
        );
    }

    // Фильтрация по специалисту
    if (specialistFilter) {
        filtered = filtered.filter(i =>
            i.specialist_id == specialistFilter
        );
    }

    renderInterviews(filtered);
}

// Обновление фильтра специалистов для собеседований
function updateSpecialistFilter() {
    const filter = document.getElementById('interviewSpecialistFilter');
    filter.innerHTML = '<option value="">Все специалисты</option>';

    specialists.forEach(specialist => {
        const option = document.createElement('option');
        option.value = specialist.id;
        option.textContent = specialist.full_name;
        filter.appendChild(option);
    });

    filter.addEventListener('change', filterInterviews);
}

// Добавление навыка
async function addSkill() {
    const input = document.getElementById('newSkillInput');
    const skillName = input.value.trim();

    if (!skillName) {
        showNotification('Введите название навыка', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/skills`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: skillName })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Не удалось добавить навык');
        }

        input.value = '';
        showNotification('Навык успешно добавлен', 'success');
        loadSkills();
        loadSkillsForFilters(); // Обновляем фильтры
    } catch (error) {
        showNotification(`Ошибка: ${error.message}`, 'error');
        console.error('Ошибка при добавлении навыка:', error);
    }
}

// Удаление навыка
async function deleteSkill(skillId) {
    const template = document.querySelector("#confirm-modal");
    const modal = createModal("Подтверждение");
    modal.querySelector(".modal-body").innerHTML = template.innerHTML;
    modal.querySelector("#confirm-message").innerHTML = 'Вы уверены, что хотите удалить этот навык?';


    modal.querySelector('.btn-success').addEventListener('click', async function (e) {
        e.preventDefault();

        try {
            await fetch(`${API_BASE_URL}/skills/${skillId}`, { method: 'DELETE' });
            loadSkills();
        } catch (error) {
            showNotification('Ошибка удаления навыка', 'error');
            console.error('Ошибка при удалении навыка:', error);
        } finally {
            closeModal();
        }
    });

    modal.querySelector('.btn-danger').addEventListener('click', closeModal);
}

// Показ модального окна добавления специалиста
async function showAddSpecialistModal() {
    // Создаем модальное окно
    const template = document.querySelector('#add-specialist-modal');
    var modal = createModal('Добавить специалиста');
    var modalBody = modal.querySelector('.modal-body');
    console.log(template);
    modalBody.innerHTML = template.innerHTML;
    console.log(modalBody);

    console.log(skills);
    var selection = modalBody.querySelector('#specialist-skills');
    console.log(selection)
    selection.innerHTML = skills.map(skill => `<option value="${skill.id}">${skill.name}</option>`).join('');
    console.log(selection)
    // Обработчик отправки формы
    modal.querySelector('.btn-success').addEventListener('click', async function (e) {
        e.preventDefault();

        const fullName = document.getElementById('specialist-fullname').value;
        const startTime = document.getElementById('specialist-start-time').value;
        const endTime = document.getElementById('specialist-end-time').value;
        const skillsSelect = document.getElementById('specialist-skills');
        const selectedSkills = Array.from(skillsSelect.selectedOptions).map(option => parseInt(option.value));

        try {
            const response = await fetch(`${API_BASE_URL}/specialists`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    full_name: fullName,
                    available_start: startTime + ':00',
                    available_end: endTime + ':00',
                    skill_ids: selectedSkills
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add specialist');
            }

            closeModal();
            showNotification('Специалист успешно добавлен', 'success');
            loadSpecialists();
        } catch (error) {
            showNotification(`Ошибка: ${error.message}`, 'error');
            console.error('Error adding specialist:', error);
        }
    });

    // Обработчик отмены
    modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
}

// Показ модального окна редактирования специалиста
async function showEditSpecialistModal(specialistId) {
    try {
        const response = await fetch(`${API_BASE_URL}/specialists/${specialistId}`);
        if (!response.ok) throw new Error('Failed to load specialist data');

        const specialist = await response.json();

        // Создаем модальное окно
        const template = document.querySelector("#edit-specialist-modal");
        const modal = createModal('Редактировать специалиста');
        modal.querySelector('.modal-body').innerHTML = template.innerHTML;
        modal.querySelector('#edit-specialist-fullname').setAttribute("value", specialist.full_name);
        modal.querySelector('#edit-specialist-skills').innerHTML = skills.map(skill =>
            `<option value="${skill.id}" ${specialist.skills.some(s => s.id === skill.id) ? 'selected' : ''}>
                        ${skill.name}
                    </option>`
        ).join('');
        modal.querySelector('#edit-specialist-start-time').setAttribute("value", specialist.available_start.substring(0, 5));
        modal.querySelector('#edit-specialist-end-time').setAttribute("value", specialist.available_end.substring(0, 5));

        modal.querySelector('.btn-success').addEventListener('click', async function (e) {
            e.preventDefault();

            const fullName = document.getElementById('edit-specialist-fullname').value;
            const startTime = document.getElementById('edit-specialist-start-time').value;
            const endTime = document.getElementById('edit-specialist-end-time').value;
            const skillsSelect = document.getElementById('edit-specialist-skills');
            const selectedSkills = Array.from(skillsSelect.selectedOptions).map(option => parseInt(option.value));

            try {
                const response = await fetch(`${API_BASE_URL}/specialists/${specialistId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        full_name: fullName,
                        available_start: startTime + ':00',
                        available_end: endTime + ':00',
                        skill_ids: selectedSkills
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to update specialist');
                }

                closeModal();
                showNotification('Специалист успешно обновлен', 'success');
                loadSpecialists();
            } catch (error) {
                showNotification(`Ошибка: ${error.message}`, 'error');
                console.error('Error updating specialist:', error);
            }
        });

        // Обработчик отмены
        modal.querySelector('.cancel-btn').addEventListener('click', closeModal);

    } catch (error) {
        showNotification('Ошибка загрузки данных специалиста', 'error');
        console.error('Error loading specialist:', error);
    }
}

// Удаление специалиста
async function deleteSpecialist(specialistId) {
    const template = document.querySelector("#confirm-modal");
    const modal = createModal("Подтверждение");
    modal.querySelector(".modal-body").innerHTML = template.innerHTML;
    modal.querySelector("#confirm-message").innerHTML = 'Вы уверены, что хотите удалить этого специалиста?';

    // if (!confirm('Вы уверены, что хотите удалить этого специалиста?')) return;

    modal.querySelector('.btn-success').addEventListener('click', async function (e) {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/specialists/${specialistId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Не удалось получить специалиста');

            showNotification('Специалист успешно удален', 'success');
            loadSpecialists();
            loadInterviews(); // Обновляем собеседования, так как они могут быть связаны с удаленным специалистом
        } catch (error) {
            showNotification('Ошибка удаления специалиста', 'error');
            console.error('Ошибка при удалении специалиста:', error);
        } finally {
            closeModal();
        }
    }
    );
    modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
}

// Показ модального окна добавления собеседования
async function showAddInterviewModal() {
    // Создаем модальное окно
    const template = document.querySelector('#add-interview-modal');
    const modal = createModal('Назначить собеседование');
    const modalBody = modal.querySelector('.modal-body')
    modalBody.innerHTML = template.innerHTML;

    modalBody.querySelector('#interview-time').addEventListener("input", () => {
        console.log('input');
        const intTime = modalBody.querySelector('#interview-time').value;
        console.log(intTime);
        modalBody.querySelector('#interview-end').value = addMinutes(intTime, INTERVIEW_DURATION_HOURS, INTERVIEW_DURATION_MINUTES);
    });

    modalBody.querySelector('#interview-specialist').innerHTML =
        specialists.map(s => `<option value="${s.id}">${s.full_name}</option>`).join('');

    modalBody.querySelector('#interview-skills').innerHTML =
        skills.map(skill => `<option value="${skill.id}">${skill.name}</option>`).join('');

    // Обработчик отправки формы
    modal.querySelector('.btn-success').addEventListener('click', async function (e) {
        e.preventDefault();

        const candidateName = document.getElementById('interview-candidate-name').value;
        const interviewTime = document.getElementById('interview-time').value;
        const specialistId = document.getElementById('interview-specialist').value;
        const skillsSelect = document.getElementById('interview-skills');
        const selectedSkills = Array.from(skillsSelect.selectedOptions).map(option => parseInt(option.value));

        try {
            const response = await fetch(`${API_BASE_URL}/interviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    candidate_name: candidateName,
                    interview_time: interviewTime + ':00',
                    specialist_id: specialistId,
                    skill_ids: selectedSkills
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to schedule interview');
            }

            closeModal();
            showNotification('Собеседование успешно назначено', 'success');
            loadInterviews();
        } catch (error) {
            showNotification(`Ошибка: ${error.message}`, 'error');
            console.error('Ошибка при назначении собеседования:', error);
        }
    });

    // Обработчик отмены
    modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
}

// Показ модального окна переноса собеседования
async function showTransferInterviewModal(interviewId) {
    currentInterviewId = interviewId;

    // Находим собеседование
    const interview = interviews.find(i => i.id === parseInt(interviewId));
    if (!interview) {
        showNotification('Собеседование не найдено', 'error');
        return;
    }

    // Создаем модальное окно
    const template = document.querySelector("#interview-edit-modal");
    const modal = createModal('Перенос собеседования');
    modal.querySelector(".modal-body").innerHTML = template.innerHTML;
    modal.querySelector("#new-specialist").innerHTML =
        ` ${specialists.map(s =>
            `<option value="${s.id}">
                        ${s.full_name} ${s.id === interview.specialist_id ? '(текущий)' : ''}
                    </option>`
        ).join('')}`
    modal.querySelector("#new-specialist").value = interview.specialist_id;

    modal.querySelector("#interview-time").addEventListener("input", () => {
        const intTime = modal.querySelector("#interview-time").value;
        modal.querySelector("#interview-end").value = addMinutes(intTime, INTERVIEW_DURATION_HOURS, INTERVIEW_DURATION_MINUTES);
    });
    modal.querySelector("#interview-candidate-name").setAttribute("value",
        interview.candidate_name
    )

    modal.querySelector("#interview-time").value = interview.interview_time.substring(0, 5)
    modal.querySelector("#interview-end").value = addMinutes(interview.interview_time.substring(0, 5), INTERVIEW_DURATION_HOURS, INTERVIEW_DURATION_MINUTES);

    // Обработчик отправки формы
    modal.querySelector('.btn-success').addEventListener('click', async function (e) {
        e.preventDefault();

        const newSpecialistId = modal.querySelector('#new-specialist').value;
        const newTime = modal.querySelector('#interview-time').value;

        if (!newSpecialistId) {
            showNotification('Выберите нового специалиста', 'warning');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/interviews/${interviewId}/transfer`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    new_specialist_id: newSpecialistId,
                    new_time: newTime
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to transfer interview');
            }

            closeModal();
            showNotification('Собеседование успешно перенесено', 'success');
            loadInterviews();
        } catch (error) {
            showNotification(`Ошибка: ${error.message}`, 'error');
            console.error('Ошибка при переносе собеседования:', error);
        }
    });

    // Обработчик отмены
    modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
}

// Удаление собеседования
async function deleteInterview(interviewId) {
    // if (!confirm('Вы уверены, что хотите отменить это собеседование?')) return;

    const template = document.querySelector("#confirm-modal");
    const modal = createModal("Подтверждение");
    modal.querySelector(".modal-body").innerHTML = template.innerHTML;
    modal.querySelector("#confirm-message").innerHTML = 'Вы уверены, что хотите отменить это собеседование?';

    modal.querySelector(".btn-success").addEventListener('click', async function (e) {
        e.preventDefault();

        try {
            const response = await fetch(`${API_BASE_URL}/interviews/${interviewId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Не удалось отменить собеседование');

            showNotification('Собеседование успешно отменено', 'success');
            loadInterviews();
        } catch (error) {
            showNotification('Ошибка отмена собеседования', 'error');
            console.error('Ошибка при отмене собеседования:', error);
        } finally {
            closeModal();
        }
    }
    );

    modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
}

// Показ модального окна с собеседованиями специалиста
async function showSpecialistInterviewsModal(specialistId) {
    try {
        const response = await fetch(`${API_BASE_URL}/specialists/${specialistId}`);
        if (!response.ok) throw new Error('Не удалось загрузить информацию о специалисте');

        const specialist = await response.json();

        let interviewsHtml = '';
        if (specialist.interviews && specialist.interviews.length > 0) {
            interviewsHtml = specialist.interviews.map(interview => `
                <div class="interview-item">
                    <h4>${interview.candidate_name}</h4>
                    <p><strong>Время:</strong> ${interview.interview_time.substring(0, 5)}</p>
                    <p><strong>ID:</strong> ${interview.id}</p>
                </div>
            `).join('');
        } else {
            interviewsHtml = '<p>У специалиста нет назначенных собеседований.</p>';
        }

        // Создаем модальное окно
        const template = document.querySelector("#specialist-interviews");
        const modal = createModal(`Собеседования специалиста: ${specialist.full_name}`);
        modal.querySelector(".modal-body").innerHTML = template.innerHTML;
        modal.querySelector(".interviews-list").innerHTML = interviewsHtml;
        modal.querySelector(".specialist-info").innerHTML = `
            <p><strong>Доступен:</strong> ${specialist.available_start.substring(0, 5)} - ${specialist.available_end.substring(0, 5)}</p>
        `;
        // Обработчик закрытия
        modal.querySelector('.cancel-btn').addEventListener('click', closeModal);

    } catch (error) {
        showNotification('Ошибка загрузки данных', 'error');
        console.error('Ошибка при загрузке собеседований специалиста:', error);
    }
}

function createModal(title) {
    // Удаляем существующее модальное окно
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }

    // Создаем новое модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';

    modal.innerHTML = document.querySelector("#modal-window").innerHTML;
    modal.querySelector(".modal-title").innerHTML = title;

    document.body.appendChild(modal);

    // Обработчик закрытия
    modal.querySelector('.close-btn').addEventListener('click', closeModal);

    // Закрытие при клике вне модального окна
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    return modal;
}

// Закрытие модального окна
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Показ уведомления
function showNotification(message, type = 'info') {
    // Удаляем существующие уведомления
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        document.body.removeChild(notification);
    });

    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    // Автоматическое скрытие уведомления через 5 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            document.body.removeChild(notification);
        }
    }, 5000);
}