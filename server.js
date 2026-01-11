const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const fs = require('fs').promises;
const path = require('path');
const { findPackageJSON } = require('module');
const sqlDir = '/sql';

// Асинхронное чтение SQL файла
async function loadSQLQuery(filePath) {
    try {
        const sql = await fs.readFile(path.resolve(__dirname + sqlDir, filePath + '.sql'), 'utf8');
        return sql;
    } catch (error) {
        console.error('Ошибка загрузки SQL файла:', error);
        throw error;
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Конфигурация базы данных
const dbConfig = {
    host: 'localhost',
    user: 'hr_system',
    password: '123',
    database: 'hr_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    keepAliveInitialDelay: 10000,
    enableKeepAlive: true
};

// Создание пула соединений
let pool;

async function initializePool() {
    pool = mysql.createPool(dbConfig);

    // Проверка соединения с базой данных
    try {
        const connection = await pool.getConnection();
        console.log('Connected to MySQL database');
        connection.release();
    } catch (error) {
        console.error('Error connecting to MySQL:', error);
    }
}

// Константы приложения
const INTERVIEW_DURATION_HOURS = 1;
const INTERVIEW_DURATION_MINUTES = 30;
const MIN_SKILL_MATCH_PERCENTAGE = 80;

// Middleware
app.use(cors());
app.use(express.json());

// Вспомогательные функции
function calculateTimeOverlap(start1, end1, start2, end2) {
    const startTime1 = new Date(`1970-01-01T${start1}`);
    const endTime1 = new Date(`1970-01-01T${end1}`);
    const startTime2 = new Date(`1970-01-01T${start2}`);
    const endTime2 = new Date(`1970-01-01T${end2}`);

    return startTime1 <= endTime2 && startTime2 <= endTime1;
}

function calculateTimeNested(start1, end1, start2, end2) {
    const startTime1 = new Date(`1970-01-01T${start1}`);
    const endTime1 = new Date(`1970-01-01T${end1}`);
    const startTime2 = new Date(`1970-01-01T${start2}`);
    const endTime2 = new Date(`1970-01-01T${end2}`);

    return startTime1 >= startTime2 && endTime1 <= endTime2;
}

function addMinutes(time, hours, minutes) {
    const date = new Date(`1970-01-01T${time}`);
    date.setHours(date.getHours() + hours);
    date.setMinutes(date.getMinutes() + minutes);

    // Форматирование обратно в HH:MM:SS
    const hoursStr = String(date.getHours()).padStart(2, '0');
    const minutesStr = String(date.getMinutes()).padStart(2, '0');
    return `${hoursStr}:${minutesStr}:00`;
}

// API: Время собеседования
app.get('/api/time', async (req, res) => {
    try {
        res.json({ hours: INTERVIEW_DURATION_HOURS, minutes: INTERVIEW_DURATION_MINUTES });
    } catch (error) {
        console.error('Ошибка при получении времени собеседования:', error);
        res.status(500).json({ error: 'Не удалось получить время собеседования' });
    }
});


// API: Навыки
app.get('/api/skills', async (req, res) => {
    try {
        const [rows] = await pool.execute(await loadSQLQuery('get_skills'));
        res.json(rows);
    } catch (error) {
        console.error('Ошибка при получении навыков:', error);
        res.status(500).json({ error: 'Не удалось получить навыки' });
    }
});

app.post('/api/skills', async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Необходимо название навыка' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(
            await loadSQLQuery('add_skills'),
            [name]
        );

        const [newSkill] = await connection.execute(
            await loadSQLQuery('new_skill'),
            [result.insertId]
        );

        await connection.commit();
        res.status(201).json(newSkill[0]);
    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            connection.release();
            return res.status(400).json({ error: 'Навык уже существует' });
        }
        console.error('Ошибка при удалении навыка:', error);
        res.status(500).json({ error: 'Не удалось создать навык' });
    } finally {
        await connection.release();
    }
});

app.delete('/api/skills/:id', async (req, res) => {
    const { id } = req.params;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute('DELETE FROM skills WHERE id = ?', [id]);

        await connection.commit();
        res.json({ message: 'Навык успешно удален' });
    } catch (error) {
        await connection.rollback();
        console.error('Ошибка при удалении навыка:', error);
        res.status(500).json({ error: 'Не удалось удалить навык' });
    } finally {
        connection.release();
    }
});

// API: Специалисты
app.get('/api/specialists', async (req, res) => {
    try {
        const [specialists] = await pool.execute(await loadSQLQuery('get_specialists'));

        // Преобразуем строку навыков в массив
        const formattedSpecialists = specialists.map(specialist => ({
            ...specialist,
            skills_names: specialist.skills_names ? specialist.skills_names.split(',') : []
        }));

        res.json(formattedSpecialists);
    } catch (error) {
        console.error('Ошибка при получении специалистов:', error);
        res.status(500).json({ error: 'Не удалось получить специалистов' });
    }
});

app.get('/api/specialists/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [specialist] = await pool.execute(
            await loadSQLQuery('get_specialist_by_id'),
            [id]
        );

        if (specialist.length === 0) {
            return res.status(404).json({ error: 'Специалист не найден' });
        }

        // Получаем навыки специалиста
        const [skills] = await pool.execute(await loadSQLQuery('specialist_skills'),
            [id]);

        // Получаем собеседования специалиста
        const [interviews] = await pool.execute(
            await loadSQLQuery('specialist_interviews'),
            [id]
        );

        res.json({
            ...specialist[0],
            skills: skills,
            interviews: interviews
        });
    } catch (error) {
        console.error('Ошибка при получении специалистов:', error);
        res.status(500).json({ error: 'Не удалось получить специалистов' });
    }
});

app.post('/api/specialists', async (req, res) => {
    const { full_name, available_start, available_end, skill_ids } = req.body;

    if (!full_name || !available_start || !available_end) {
        return res.status(400).json({ error: 'Поля ФИО и доступное время обязательны для заполнения' });
    }


    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [results] = await connection.execute(
            await loadSQLQuery('add_specialist'),
            [full_name, available_start, available_end]
        );

        const id = results.insertId;

        // Добавляем навыки специалиста
        if (skill_ids && skill_ids.length > 0) {
            const skillValues = skill_ids.map(skill_id => [id, skill_id]);
            await connection.query(
                await loadSQLQuery('add_specialist_skills'),
                [skillValues]
            );
        }

        await connection.commit();
        res.status(201).json({ id, message: 'Специалист успешно добавлен' });
    } catch (error) {
        await connection.rollback();
        console.error('Ошибка при добавлении специалиста:', error);
        res.status(500).json({ error: 'Не удалось добавить специалиста' });
    } finally {
        await connection.release();
    }
});

app.put('/api/specialists/:id', async (req, res) => {
    const { id } = req.params;
    const { full_name, available_start, available_end, skill_ids } = req.body;

    const connection = await pool.getConnection();
    try {

        await connection.beginTransaction();

        await connection.execute(
            'UPDATE specialists SET full_name = ?, available_start = ?, available_end = ? WHERE id = ?',
            [full_name, available_start, available_end, id]
        );

        // Обновляем навыки специалиста
        await connection.execute('DELETE FROM specialist_skills WHERE specialist_id = ?', [id]);

        if (skill_ids && skill_ids.length > 0) {
            const skillValues = skill_ids.map(skill_id => [id, skill_id]);
            await connection.query(
                'INSERT INTO specialist_skills (specialist_id, skill_id) VALUES ?',
                [skillValues]
            );
        }

        await connection.execute(await loadSQLQuery("cancel_interviews"),
            [id, available_start, INTERVIEW_DURATION_HOURS, INTERVIEW_DURATION_MINUTES, available_end]
        )

        await connection.commit();
        res.json({ message: 'Специалист успешно изменен' });
    } catch (error) {
        await connection.rollback();
        console.error('Ошибка при изменении специалиста:', error);
        res.status(500).json({ error: 'Не удалось изменить специалиста' });
    }
    finally {
        connection.release();
    }
});

app.delete('/api/specialists/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await pool.execute('DELETE FROM specialists WHERE id = ?', [id]);
        res.json({ message: 'Специалист успешно удален' });
    } catch (error) {
        console.error('Ошибка при удалении специалиста:', error);
        res.status(500).json({ error: 'Не удалось удалить специалиста' });
    }
});

// API: Собеседования
app.get('/api/interviews', async (req, res) => {
    try {
        const [interviews] = await pool.execute(await loadSQLQuery('get_interviews'));

        // Форматируем результат
        const formattedInterviews = interviews.map(interview => ({
            ...interview,
            skills_names: interview.skills_names ? interview.skills_names.split(',') : []
        }));

        res.json(formattedInterviews);
    } catch (error) {
        console.error('Ошибка при получении собеседований:', error);
        res.status(500).json({ error: 'Не удалось получить собеседования' });
    }
});

app.post('/api/interviews', async (req, res) => {
    const { candidate_name, interview_time, specialist_id, skill_ids } = req.body;

    if (!candidate_name || !interview_time || !specialist_id) {
        return res.status(400).json({ error: 'Поля ФИО соискателя, собеседование и специалист обязательны для заполнения' });
    }

    const connection = await pool.getConnection();
    // Проверка доступности специалиста в это время
    try {
        await connection.beginTransaction();

        // Получаем данные специалиста
        const [specialistRows] = await connection.execute(
            'SELECT * FROM specialists WHERE id = ?',
            [specialist_id]
        );

        if (specialistRows.length === 0) {
            await connection.rollback();
            await connection.release();
            return res.status(404).json({ error: 'Специалист не найден' });
        }

        const specialist = specialistRows[0];
        // Проверяем, находится ли время собеседования в диапазоне доступности специалиста
        if (!calculateTimeNested(interview_time, addMinutes(interview_time, INTERVIEW_DURATION_HOURS, INTERVIEW_DURATION_MINUTES), specialist.available_start, specialist.available_end)) {
            await connection.rollback();
            await connection.release();
            return res.status(400).json({
                error: `Специалист недоступен в это время. Собеседование должно начинаться и заканчиваться с ${specialist.available_start} по ${specialist.available_end}`
            });
        }

        // Проверяем навыки специалиста и соискателя
        const [specialistSkills] = await connection.execute(`
      SELECT skill_id FROM specialist_skills WHERE specialist_id = ?
    `, [specialist_id]);

        const specialistSkillIds = specialistSkills.map(s => s.skill_id);

        if (skill_ids && skill_ids.length > 0) {
            const commonSkills = skill_ids.filter(id => specialistSkillIds.includes(id));
            const matchPercentage = (commonSkills.length / skill_ids.length) * 100;

            if (matchPercentage < MIN_SKILL_MATCH_PERCENTAGE) {
                await connection.rollback();
                await connection.release();
                return res.status(400).json({
                    error: `Совпадение навыков только ${matchPercentage.toFixed(1)}%. Необходимо как минимум${MIN_SKILL_MATCH_PERCENTAGE}%`
                });
            }
        }

        // Проверяем пересечение по времени с другими собеседованиями
        const interviewEnd = addMinutes(interview_time, INTERVIEW_DURATION_HOURS, INTERVIEW_DURATION_MINUTES);

        const [existingInterviews] = await connection.execute(await loadSQLQuery('verify_interview_time'), [
            specialist_id,
            interviewEnd,
            INTERVIEW_DURATION_HOURS,
            INTERVIEW_DURATION_MINUTES,
            interview_time,
            interviewEnd,
            interview_time
        ]);

        if (existingInterviews.length > 0) {
            await connection.rollback();
            await connection.release();
            return res.status(400).json({
                error: 'Пересечение по времени с существующими собеседованиями'
            });
        }

        // Создаем собеседование
        [results] = await connection.execute(
            'INSERT INTO interviews (candidate_name, interview_time, specialist_id) VALUES (?, ?, ?)',
            [candidate_name, interview_time, specialist_id]
        );

        const interviewId = results.insertId;

        // Добавляем навыки собеседования
        if (skill_ids && skill_ids.length > 0) {
            const skillValues = skill_ids.map(skill_id => [interviewId, skill_id]);
            await connection.query(
                'INSERT INTO interview_skills (interview_id, skill_id) VALUES ?',
                [skillValues]
            );
        }

        await connection.commit();
        res.status(201).json({ id: interviewId, message: 'Собеседование успешно создано' });
    } catch (error) {
        await connection.rollback();
        console.error('Ошибка при создании собеседования:', error);
        res.status(500).json({ error: 'Не удалось создать собеседование' });
    } finally {
        await connection.release();
    }
});

app.put('/api/interviews/:id/transfer', async (req, res) => {
    const { id } = req.params;
    const { new_specialist_id, new_time } = req.body;

    if (!new_specialist_id) {
        return res.status(400).json({ error: 'Необходим ID нового специалиста' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Получаем данные о собеседовании
        const [interviewRows] = await connection.execute(
            'SELECT * FROM interviews WHERE id = ?',
            [id]
        );

        if (interviewRows.length === 0) {
            await connection.rollback();
            await connection.release();
            return res.status(404).json({ error: 'Собеседование не найдено' });
        }

        const interview = interviewRows[0];

        // Проверяем доступность нового специалиста в это время
        const [newSpecialistRows] = await connection.execute(
            'SELECT * FROM specialists WHERE id = ?',
            [new_specialist_id]
        );

        if (newSpecialistRows.length === 0) {
            await connection.rollback();
            await connection.release();
            return res.status(404).json({ error: 'Новый специалист не найден' });
        }

        const newSpecialist = newSpecialistRows[0];
        // Проверяем, находится ли время собеседования в диапазоне доступности нового специалиста
        if (!calculateTimeNested(new_time, addMinutes(new_time, INTERVIEW_DURATION_HOURS, INTERVIEW_DURATION_MINUTES), newSpecialist.available_start, newSpecialist.available_end)) {
            await connection.rollback();
            await connection.release();
            return res.status(400).json({
                error: `Новый специалист недоступен в это время. Собеседование должно начинаться и заканчиваться с ${newSpecialist.available_start} по ${newSpecialist.available_end}`
            });
        }

        // Получаем навыки собеседования
        const [interviewSkills] = await connection.execute(`
      SELECT skill_id FROM interview_skills WHERE interview_id = ?
    `, [id]);

        const interviewSkillIds = interviewSkills.map(s => s.skill_id);

        // Получаем навыки нового специалиста
        const [newSpecialistSkills] = await connection.execute(`
      SELECT skill_id FROM specialist_skills WHERE specialist_id = ?
    `, [new_specialist_id]);

        const newSpecialistSkillIds = newSpecialistSkills.map(s => s.skill_id);

        // Проверяем соответствие навыков
        if (interviewSkillIds.length > 0) {
            const commonSkills = interviewSkillIds.filter(id => newSpecialistSkillIds.includes(id));
            const matchPercentage = (commonSkills.length / interviewSkillIds.length) * 100;

            if (matchPercentage < MIN_SKILL_MATCH_PERCENTAGE) {
                await connection.rollback();
                await connection.release();
                return res.status(400).json({
                    error: `Совпадение навыков составляет только ${matchPercentage.toFixed(1)}%. Необходимо минимально: ${MIN_SKILL_MATCH_PERCENTAGE}%`
                });
            }
        }

        // Проверяем пересечение по времени с собеседованиями нового специалиста
        const interviewEnd = addMinutes(interview.interview_time, INTERVIEW_DURATION_HOURS, INTERVIEW_DURATION_MINUTES);

        const [existingInterviews] = await connection.execute(await loadSQLQuery('verify_transfer_time'), [
            new_specialist_id,
            id,
            interviewEnd,
            INTERVIEW_DURATION_HOURS,
            INTERVIEW_DURATION_MINUTES,
            new_time,
            interviewEnd,
            new_time
        ]);

        if (existingInterviews.length > 0) {
            await connection.rollback();
            await connection.release();
            return res.status(400).json({
                error: 'Пересечение по времени с существующими собеседованиями нового специалиста'
            });
        }

        // Переносим собеседование
        await connection.execute(
            'UPDATE interviews SET interview_time = ?, specialist_id = ? WHERE id = ?',
            [new_time, new_specialist_id, id]
        );

        await connection.commit();
        res.json({ message: 'Собеседование успешно перенесено' });
    } catch (error) {
        await connection.rollback();
        console.error('Ошибка при переносе собеседования:', error);
        res.status(500).json({ error: 'Не удалось перенести собеседование' });
    } finally {
        await connection.release();
    }
});

app.delete('/api/interviews/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await pool.execute('DELETE FROM interviews WHERE id = ?', [id]);
        res.json({ message: 'Собеседование отменено' });
    } catch (error) {
        console.error('Ошибка при отмене собеседования:', error);
        res.status(500).json({ error: 'Не удалось отменить собеседование' });
    }
});

// Запуск сервера
initializePool().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});