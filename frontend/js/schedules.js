import "https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js";

const generateButton = document.querySelector(".generate-btn")
const saveImgButton = document.querySelector("#save-image-btn")
const tabs = document.querySelector(".schedule-tabs")
const scheduleGrid = document.querySelector("#schedule-grid")

let schedules = []

function generateSchedule(subjects) {
    console.log(subjects)
    scheduleGrid.innerHTML = "";
    
    const days = ['Hora', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sabado'];
    days.forEach(day => {
        const headerCell = document.createElement('div');
        headerCell.className = 'grid-header';
        headerCell.textContent = day;
        scheduleGrid.appendChild(headerCell);
    });

    const timeSlots = new Set();
    subjects.forEach(subject => {
        const startHour = parseInt(subject.startTime.split(':')[0]);
        const endHour = parseInt(subject.endTime.split(':')[0]);
        
        for (let hour = startHour; hour < endHour; hour++) {
            timeSlots.add(`${hour.toString().padStart(2, '0')}:00`);
        }
    });

    const sortedTimeSlots = Array.from(timeSlots).sort();

    sortedTimeSlots.forEach(time => {
        const timeBlock = document.createElement('div');
        timeBlock.className = 'time-block';
        timeBlock.textContent = time;
        scheduleGrid.appendChild(timeBlock);

        for (let day = 0; day < 6; day++) {
            const cell = document.createElement('div');
            cell.className = 'schedule-cell';

            const currentHour = parseInt(time.split(':')[0]);

            const activeSubjectsInHour = subjects.filter(s => {
                const subjectDay = s.day;
                const subjectStartHour = parseInt(s.startTime.split(':')[0]);
                const subjectEndHour = parseInt(s.endTime.split(':')[0]);
                
                return subjectDay === day && 
                       currentHour >= subjectStartHour && 
                       currentHour < subjectEndHour;
            });

            if (activeSubjectsInHour.length > 0) {
                cell.classList.add('has-class');
                
                const subjectsStartingThisHour = activeSubjectsInHour.filter(s => 
                    parseInt(s.startTime.split(':')[0]) === currentHour
                );

                if (subjectsStartingThisHour.length > 0) {
                    let cellHTML = '';
                    subjectsStartingThisHour.forEach(s => {
                        cellHTML += `
                                <div class="subject-name">${s.name}</div>
                                <div class="subject-time">${s.startTime} - ${s.endTime}</div>
                        `;
                    });
                    cell.innerHTML = cellHTML;
                } else {
                    cell.style.display = 'none';
                }
            }

            scheduleGrid.appendChild(cell);
        }
    });
}

generateButton.addEventListener("click", async () => {
    let selectedCourseCodes = getSelectedCourseCodes()

    const userAvailability = getUserAvailability();

    if (!selectedCourseCodes || selectedCourseCodes.length === 0) {
        alert("Por favor, selecciona al menos una materia.");
 
        return;
    }
    
    if (!userAvailability || userAvailability.length === 0) {
        alert("Por favor, selecciona al menos una disponibilidad");

        return;
    }

    tabs.innerHTML = "<p>Generando horarios...</p>";
    scheduleGrid.innerHTML = "";
    document.querySelector(".schedules-section").style.display = "block";

    try {
        const response = await fetch('../backend/public/scheduler/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                selected_courses: selectedCourseCodes,
                user_availability: userAvailability
            })
        });

        if (!response.ok) {
            let errorMsg = `Error ${response.status} al generar horarios.`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.reason) {
                    errorMsg = errorData.reason;
                }
            } catch (e) {

            }
            console.error('Error from backend:', errorMsg);
            tabs.innerHTML = `<p style="color: red;">Error: ${errorMsg}</p>`;
            return;
        }

        const backendSchedules = await response.json();

        if (!Array.isArray(backendSchedules) || backendSchedules.length === 0) {
            tabs.innerHTML = "<p>No se encontraron horarios compatibles con las materias y disponibilidad seleccionada.</p>";
            schedules = [];
            return;
        }

        schedules = backendSchedules.map(scheduleSlots => 
            scheduleSlots.map(slot => mapBackendSlotToFrontendFormat(slot))
        );

        tabs.innerHTML = "";
        if (schedules.length > 0) {
            schedules.forEach((schedule, index) => {
                let tab = document.createElement("button");
                tab.classList.add("tab-btn");
                tab.textContent = `Horario ${index + 1}`;
                tab.id = `tab-${index}`;

                if (index == 0) {
                    tab.classList.add("active");
                }
                tabs.appendChild(tab);
            });

            document.querySelectorAll(".tab-btn").forEach((button, index) => {
                button.addEventListener("click", (e) => {
                    const currentActive = document.querySelector(".tab-btn.active");
                    if(currentActive) currentActive.classList.remove("active");
                    e.target.classList.add("active");
                    generateSchedule(schedules[index]); 
                });
            });
            
            generateSchedule(schedules[0])
        } else {
            tabs.innerHTML = "<p>No se generaron horarios.</p>";
        }

    } catch (error) {
        console.error('Error fetching schedules:', error);
        tabs.innerHTML = `<p style="color: red;">Error de conexión al intentar generar horarios: ${error.message}</p>`;
        schedules = [];
    }
});

saveImgButton.addEventListener("click", (e)=>{saveImage(e)})

function saveImage(e){
    const originalWidth = scheduleGrid.style.width;
    scheduleGrid.style.width = scheduleGrid.scrollWidth + 'px';

    htmlToImage.toPng(scheduleGrid)
      .then(function (dataUrl) {
        scheduleGrid.style.width = originalWidth;

        const link = document.createElement('a');
        link.download = 'captura.png';
        link.href = dataUrl;
        link.click();
      })
      .catch(function (error) {
        console.error('Error al generar la imagen:', error);
      });
}

function getSelectedCourseCodes() {
    let savedSubjects = {};
    if (localStorage.getItem("subjects")) {
        savedSubjects = JSON.parse(localStorage.getItem("subjects"));
    }

    const courseCodes = [];
    for (const key in savedSubjects) {
        if (savedSubjects[key] && savedSubjects[key].code) {
            courseCodes.push(savedSubjects[key].code);
        }
    }
    
    return courseCodes;
}

function getUserAvailability() {
    const storedAvailability = localStorage.getItem("availability");
    if (!storedAvailability) {
        return [];
    }

    try {
        const availabilityData = JSON.parse(storedAvailability);
        const backendFormattedAvailability = [];

        const dayMapping = {
            monday: "LUNES",
            tuesday: "MARTES",
            wednesday: "MIERCOLES",
            thursday: "JUEVES",
            friday: "VIERNES",
            saturday: "SABADO",
        };

        for (const dayKey in availabilityData) {
            if (availabilityData.hasOwnProperty(dayKey) && dayMapping[dayKey]) {
                const dayInfo = availabilityData[dayKey];
                if (dayInfo.enabled && dayInfo.start && dayInfo.end && dayInfo.start !== "" && dayInfo.end !== "") {
                    const formatTime = (timeStr) => {
                        if (timeStr && timeStr.match(/^\d{2}:\d{2}$/)) {
                            return timeStr + ":00";
                        }
                        return timeStr;
                    };

                    backendFormattedAvailability.push({
                        day_of_week: dayMapping[dayKey],
                        start_time: formatTime(dayInfo.start),
                        end_time: formatTime(dayInfo.end)
                    });
                }
            }
        }
        
        return backendFormattedAvailability;

    } catch (error) {
        return []; 
    }
}

function mapDayOfWeekToNumber(dayName) {
    const days = {
        "LUNES": 0, "MARTES": 1, "MIERCOLES": 2, "JUEVES": 3, "VIERNES": 4, "SABADO": 5, "DOMINGO": 6
    };

    return dayName ? days[dayName.toUpperCase()] : -1; 
}

function mapBackendSlotToFrontendFormat(backendSlot) {
    return {
        name: backendSlot.group_name,
        day: mapDayOfWeekToNumber(backendSlot.day_of_week),
        startTime: backendSlot.start_time.substring(0, 5),
        endTime: backendSlot.end_time.substring(0, 5),
        courseCode: backendSlot.course_code,
        groupCode: backendSlot.course_group_code,
    };
}
