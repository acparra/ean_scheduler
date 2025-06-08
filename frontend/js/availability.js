const DAYS = {
    monday: { start: 'mondayStartTime', end: 'mondayEndTime' },
    tuesday: { start: 'tuesdayStartTime', end: 'tuesdayEndTime' },
    wednesday: { start: 'wednesdayStartTime', end: 'wednesdayEndTime' },
    thursday: { start: 'thursdayStartTime', end: 'thursdayEndTime' },
    friday: { start: 'fridayStartTime', end: 'fridayEndTime' },
    saturday: { start: 'saturdayStartTime', end: 'saturdayEndTime' }
};

function getSavedAvailability() {
    const saved = localStorage.getItem('availability');
    return saved ? JSON.parse(saved) : {};
}

function saveAvailability(day, type, value) {
    const availability = getSavedAvailability();
    if (!availability[day]) {
        availability[day] = { start: '', end: '', enabled: true };
    }
    availability[day][type] = value;
    localStorage.setItem('availability', JSON.stringify(availability));
}

function loadSavedAvailability() {
    const availability = getSavedAvailability();
    
    Object.entries(DAYS).forEach(([day, ids]) => {
        const dayData = availability[day];
        if (dayData) {

            if (dayData.start) {
                document.getElementById(ids.start).value = dayData.start;
            }
            if (dayData.end) {
                document.getElementById(ids.end).value = dayData.end;
            }

            const checkbox = document.getElementById(day);
            if (checkbox) {
                checkbox.checked = dayData.enabled;
            }
        }
    });
}

function handleTimeChange(day, type, event) {
    const value = event.target.value;
    saveAvailability(day, type, value);
}

function handleCheckboxChange(day, event) {
    const enabled = event.target.checked;
    saveAvailability(day, 'enabled', enabled);
}

function initializeAvailabilityHandlers() {
    Object.entries(DAYS).forEach(([day, ids]) => {

        const startInput = document.getElementById(ids.start);
        const endInput = document.getElementById(ids.end);
        const checkbox = document.getElementById(day);

        if (startInput) {
            startInput.addEventListener('change', (e) => handleTimeChange(day, 'start', e));
        }
        if (endInput) {
            endInput.addEventListener('change', (e) => handleTimeChange(day, 'end', e));
        }
        if (checkbox) {
            checkbox.addEventListener('change', (e) => handleCheckboxChange(day, e));
        }
    });
}

initializeAvailabilityHandlers();
loadSavedAvailability();
