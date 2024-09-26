// Elementen ophalen
const wheel = document.getElementById('wheel');
const targetNumberInput = document.getElementById('targetNumber');
const generateRandomButton = document.getElementById('generateRandom');
const spinWheelButton = document.getElementById('spinWheel');
const downloadVideoButton = document.getElementById('downloadVideo');

// Functie om het rad te draaien
function spinWheel(targetNumber) {
    // Bereken het aantal graden dat het rad moet draaien
    // We gaan ervan uit dat het rad 360 graden verdeeld over 1000 nummers heeft
    const degreesPerNumber = 360 / 1000;
    const degrees = targetNumber * degreesPerNumber;
    
    // Voeg wat willekeurigheid toe aan de rotatie
    const extraSpins = Math.floor(Math.random() * 5 + 5) * 360; // 5 tot 10 extra rotaties
    const totalDegrees = degrees + extraSpins;

    // Animeer het rad
    wheel.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)';
    wheel.style.transform = `translate(-50%, -50%) rotate(${totalDegrees}deg)`;

    // Reset de transitie na de animatie
    setTimeout(() => {
        wheel.style.transition = 'none';
        wheel.style.transform = `translate(-50%, -50%) rotate(${degrees}deg)`;
    }, 4000);
}

// Functie om een willekeurig nummer te genereren
function generateRandomNumber() {
    return Math.floor(Math.random() * 1001);
}

// Event listeners
generateRandomButton.addEventListener('click', () => {
    const randomNumber = generateRandomNumber();
    targetNumberInput.value = randomNumber;
});

spinWheelButton.addEventListener('click', () => {
    const targetNumber = parseInt(targetNumberInput.value);
    if (targetNumber >= 0 && targetNumber <= 1000) {
        spinWheel(targetNumber);
    } else {
        alert('Voer een geldig nummer in tussen 0 en 1000.');
    }
});

downloadVideoButton.addEventListener('click', () => {
    alert('Video downloaden is nog niet geïmplementeerd.');
});