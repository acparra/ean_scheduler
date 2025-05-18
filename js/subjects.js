import subjectsData from './subjects_data.js';

const searchInput = document.querySelector('.search-input');
const dropdown = document.querySelector('.custom-dropdown');
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
    
    return option;
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
