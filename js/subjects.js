import subjectsData from './subjects_data.js';

const searchInput = document.querySelector('.search-input');
const dropdown = document.querySelector('.custom-dropdown');
const tbody = document.querySelector('tbody');
const minCharsMessage = document.querySelector('.min-chars-message');
const MIN_CHARS = 6;

function normalizeText(text) {
    return text.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function updateDropdown(searchTerm) {
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

        return;
    } 

    minCharsMessage.style.display = 'none';

    const filteredSubjects = subjectsData.filter(subject => 
        normalizeText(subject.name).includes(searchTerm)
    );

    if (filteredSubjects.length === 0) {
        minCharsMessage.textContent = 'No se encontraron resultados';
        minCharsMessage.style.display = 'block';
        return;
    }
    
    filteredSubjects.forEach(subject => {
        dropdown.appendChild(createDropdownOption(subject));
    });
}

function createDropdownOption(subject) {
    const option = document.createElement('div');
    option.className = 'dropdown-option';
    option.textContent = subject.name;
    
    option.addEventListener('click', () => {
        console.log("click")
        searchInput.value = subject.name;
        dropdown.style.display = 'none';
        saveSubject(subject);
        updateSubjectsTable();
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
