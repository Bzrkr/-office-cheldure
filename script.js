const dayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const IPEauditories = ["502-2 к.", "601-2 к.", "603-2 к.", "604-2 к.", "605-2 к.", "607-2 к.", "611-2 к.", "613-2 к.", "615-2 к."];

const currentDate = new Date();
const dayNumber = currentDate.getDay() - 1; // getDay() returns 0 for Sunday, so adjust by -1
const dayName = dayNames[dayNumber];

document.getElementById('header').innerText = `--------------${dayName}-------------`;

async function fetchJson(url) {
    const response = await fetch(url);
    return response.json();
}

async function getTeacherInfo() {
    const teachers = await fetchJson('https://iis.bsuir.by/api/v1/employees/all');
    const teacherSchedules = {};

    const promises = teachers.map(async (teacher) => {
        try {
            const schedule = await fetchJson(`https://iis.bsuir.by/api/v1/employees/schedule/${teacher.urlId}`);
            teacherSchedules[teacher.urlId] = schedule;
        } catch (error) {
            console.error(`${teacher.urlId} generated an exception:`, error);
        }
    });

    await Promise.all(promises);
    return { teachers, teacherSchedules };
}

function parseDate(dateStr) {
    return dateStr ? new Date(dateStr.split('.').reverse().join('-')) : null;
}

function addLessonToSchedule(schedule, lesson, teacher) {
    schedule[`${lesson.startLessonTime}—${lesson.endLessonTime}`] = `${lesson.subject} (${lesson.lessonTypeAbbrev}) ${teacher.fio}`;
}

function timeInRange(start, end, x) {
    return start <= x && x <= end;
}

async function requestDaily(aud, teachers, teacherSchedules, currentWeek) {
    const schedule = {};
    for (const teacher of teachers) {
        const teacherSchedule = teacherSchedules[teacher.urlId] || {};
        const weekDaySchedule = teacherSchedule.schedules?.[dayName] || [];

        for (const lesson of weekDaySchedule) {
            if (lesson && lesson.auditories.includes(aud) && lesson.weekNumber.includes(currentWeek)) {
                const start = parseDate(lesson.startLessonDate);
                const end = parseDate(lesson.endLessonDate);
                const lessonDate = parseDate(lesson.dateLesson);

                if (start && end && timeInRange(start, end, currentDate)) {
                    addLessonToSchedule(schedule, lesson, teacher);
                } else if (lessonDate && currentDate.toDateString() === lessonDate.toDateString()) {
                    addLessonToSchedule(schedule, lesson, teacher);
                }
            }
        }
    }
    return schedule;
}

function printDict(container, dict) {
    for (const [timeRange, details] of Object.entries(dict)) {
        const lessonDiv = document.createElement('div');
        lessonDiv.className = 'lesson';
        lessonDiv.innerText = `${timeRange} ————— ${details}`;
        container.appendChild(lessonDiv);
    }
}

async function printSchedulesIPE() {
    const { teachers, teacherSchedules } = await getTeacherInfo();
    const currentWeek = await fetchJson('https://iis.bsuir.by/api/v1/schedule/current-week');
    const schedulesContainer = document.getElementById('schedules');

    for (const aud of IPEauditories) {
        const audContainer = document.createElement('div');
        audContainer.className = 'auditory';
        audContainer.innerText = `-------------------------${aud}-------------------------`;
        schedulesContainer.appendChild(audContainer);

        const dailySchedule = await requestDaily(aud, teachers, teacherSchedules, currentWeek);
        const sortedSchedule = Object.keys(dailySchedule).sort().reduce((obj, key) => {
            obj[key] = dailySchedule[key];
            return obj;
        }, {});

        printDict(audContainer, sortedSchedule);
    }
}

printSchedulesIPE();