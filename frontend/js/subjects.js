import subjectsData from './subjects_data.js';

const searchInput = document.querySelector('.search-input');
const dropdown = document.querySelector('.custom-dropdown');
const minCharsMessage = document.querySelector('.min-chars-message');
const tbody = document.querySelector('tbody');
const MIN_CHARS = 6;

function normalizeText(text) {
    return text.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

async function updateDropdown(searchTerm) {
    // Clear previous options except the min-chars message
    for (let i = dropdown.children.length - 1; i >= 0; i--) {
        const option = dropdown.children[i];
        if (option.classList.contains("min-chars-message")) {
            continue;
        }
        option.remove();
    }

    if (searchTerm.length < MIN_CHARS) {
        minCharsMessage.textContent = 'Escribe al menos 6 caracteres para ver resultados';
        minCharsMessage.style.display = 'block';
        dropdown.style.display = 'block'; // Show dropdown to display message
        return;
    }

    minCharsMessage.style.display = 'none'; // Hide message by default

    try {
        const response = await fetch(`../backend/public/courses/search?q=${encodeURIComponent(searchTerm)}`);
        
        if (!response.ok) {
            let errorText = `Error cargando las materias`;

            minCharsMessage.textContent = errorText;
            minCharsMessage.style.display = 'block';
            dropdown.style.display = 'block';
            return;
        }

        const courses = await response.json();

        if (!courses || courses.length === 0) {
            minCharsMessage.textContent = 'No se encontraron materias';
            minCharsMessage.style.display = 'block';
        } else {
            courses.forEach(course => {
                let duration = "Indefinido"

                console.log("upper: ", course.course_type.toUpperCase())
                switch (course.course_type.toUpperCase()){
                    case "SEMESTRE":
                    duration = "Semestre"
                    break;
                    case "CICLO":
                    duration = "Ciclo"
                    break;
                }

                const subjectForOption = {
                    name: course.course_name, 
                    code: course.course_code,
                    credits: course.credits,
                    duration: duration,
                };
                dropdown.appendChild(createDropdownOption(subjectForOption));
            });
        }
        dropdown.style.display = 'block';

    } catch (error) {
        console.error('Error fetching course suggestions:', error);
        minCharsMessage.textContent = 'Error de red al buscar materias.';
        minCharsMessage.style.display = 'block';
        dropdown.style.display = 'block';
    }
}

function createDropdownOption(subject) {
    const option = document.createElement('div');
    option.className = 'dropdown-option';
    option.textContent = subject.name;

    option.addEventListener('click', () => {
        searchInput.value = subject.name;
        dropdown.style.display = 'none';
        saveSubject(subject);
        updateSubjectsTable()
    });
    
    return option;
}

function saveSubject(subject) {
    let savedSubjects = {}

    if (localStorage.getItem("subjects")){
        savedSubjects = JSON.parse(localStorage.getItem("subjects"))
    }

    savedSubjects[subject.name] = subject
    localStorage.setItem("subjects", JSON.stringify(savedSubjects))
}

function deleteSubject(subjectName) {
    let savedSubjects = {}

    if (localStorage.getItem("subjects")){
        savedSubjects = JSON.parse(localStorage.getItem("subjects"))
    }

    delete savedSubjects[subjectName]
    localStorage.setItem("subjects", JSON.stringify(savedSubjects))
}

function updateSubjectsTable(){
    for (let i = tbody.children.length - 1; i >= 0; i--) {
        const trow = tbody.children[i];
    
        trow.remove();
    }

    let savedSubjects = {}

    if (localStorage.getItem("subjects")){
        savedSubjects = JSON.parse(localStorage.getItem("subjects"))
    }

    for (let key in savedSubjects){
        let subject = savedSubjects[key]

        const row = document.createElement('tr');
        row.className = 'subject-row';
        
        row.innerHTML = `
            <td>${subject.name}</td>
            <td>${subject.credits}</td>
            <td>${subject.duration}</td>
            <td><a href="#" class="action-link">Eliminar</a></td>
        `;

        row.querySelector('.action-link').addEventListener('click', (e) => {
            e.preventDefault();
            deleteSubject(subject.name)
            row.remove();
        });
        
        tbody.appendChild(row);
    };
}

searchInput.addEventListener('focus', () => {
    dropdown.style.display = 'block';
    updateDropdown(normalizeText(searchInput.value));
});

searchInput.addEventListener('input', (e) => {
    dropdown.style.display = 'block';
    updateDropdown(normalizeText(e.target.value));
});

document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

updateSubjectsTable()
