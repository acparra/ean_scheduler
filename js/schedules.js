import schedulesData from './schedules_data.js';

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

            const subject = subjects.find(subject => {
                const subjectDay = subject.day;
                const subjectStartHour = parseInt(subject.startTime.split(':')[0]);
                const subjectEndHour = parseInt(subject.endTime.split(':')[0]);
                const currentHour = parseInt(time.split(':')[0]);
                
                return subjectDay === day && 
                       currentHour >= subjectStartHour && 
                       currentHour < subjectEndHour;
            });

            if (subject) {
                cell.classList.add('has-class');
                const currentHour = parseInt(time.split(':')[0]);
                const subjectStartHour = parseInt(subject.startTime.split(':')[0]);
                const subjectEndHour = parseInt(subject.endTime.split(':')[0]);
                
                const blockSpan = subjectEndHour - subjectStartHour;
                
                if (currentHour === subjectStartHour) {
                    cell.innerHTML = `
                        <div class="subject-name">${subject.name}</div>
                        <div class="subject-group">${subject.group}</div>
                        <div class="subject-time">${subject.startTime} - ${subject.endTime}</div>
                    `;

                    cell.style.gridRow = `span ${blockSpan}`;
                } else {

                    cell.style.display = 'none';
                }
            }

            scheduleGrid.appendChild(cell);
        }
    });
}

function getSchedules(){
    return schedulesData
}

generateButton.addEventListener("click", ()=>{
    schedules = getSchedules()

    tabs.innerHTML = ""
    schedules.forEach((schedule, index) => {
        let tab = document.createElement("button")
        tab.classList.add("tab-btn")
        tab.textContent = `Horario ${index+1}`
        tab.id = `tab-${index}`

        if (index == 0) {
            tab.classList.add("active")
        }

        tabs.appendChild(tab)
    })

    document.querySelectorAll(".tab-btn").forEach((element, index) => {
        element.addEventListener("click", (e)=>{
            scheduleGrid.innerHTML = ""
            document.querySelector(".active").classList.remove("active")
            e.target.classList.add("active")

            generateSchedule(schedules[index])
        })
    });

    document.querySelector(".schedules-section").style.display = "block"

    generateSchedule(schedules[0])
})

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

