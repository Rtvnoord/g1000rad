// Elementen ophalen
const wheel = document.getElementById('wheel');
const targetNumberInput = document.getElementById('targetNumber');
const generateRandomButton = document.getElementById('generateRandom');
const spinWheelButton = document.getElementById('spinWheel');
const downloadVideoButton = document.getElementById('downloadVideo');
const progressBar = document.getElementById('progressBar');
const numberDisplay = document.getElementById('number-display');

// Functie om het rad te draaien
function spinWheel(targetNumber) {
    // Verberg het nummer-container voordat het rad begint te draaien
    gsap.set("#number-container", { opacity: 0, scale: 0 });

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

    // Reset de transitie en toon het nummer na de animatie
    setTimeout(() => {
        wheel.style.transition = 'none';
        wheel.style.transform = `translate(-50%, -50%) rotate(${degrees}deg)`;
        animateNumberContainer(targetNumber);
    }, 4000);
}

// Functie om het nummer-container te animeren
function animateNumberContainer(number) {
    const numberContainer = document.getElementById('number-container');
    numberDisplay.textContent = number;

    gsap.to(numberContainer, {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: "back.out(1.7)",
        onComplete: () => animateNumber()
    });

    // Centreer het nummer-container in het wheel-container
    const wheelContainer = document.getElementById('wheel-container');
    gsap.set(numberContainer, {
        left: '50%',
        top: '50%',
        xPercent: -50,
        yPercent: -50
    });
}

// Functie om het nummer te animeren
function animateNumber() {
    gsap.fromTo(numberDisplay, 
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
    );
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

// Verwijder de bestaande DOMContentLoaded event listener

downloadVideoButton.addEventListener('click', () => {
    const targetNumber = parseInt(targetNumberInput.value);
    if (targetNumber >= 0 && targetNumber <= 1000) {
        console.log('Start GIF generatie voor nummer:', targetNumber);
        downloadVideoButton.disabled = true;
        downloadVideoButton.textContent = 'GIF wordt gegenereerd...';
        progressBar.style.width = '0%';
        progressBar.style.display = 'block';
        
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: 960,
            height: 540
        });

        console.log('GIF object aangemaakt');

        const canvas = document.createElement('canvas');
        canvas.width = 960;
        canvas.height = 540;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        console.log('Canvas aangemaakt');

        const background = new Image();
        background.src = 'background.jpg';
        const wheel = new Image();
        wheel.src = 'wheel.png';

        console.log('Afbeeldingen worden geladen');

        Promise.all([
            new Promise(resolve => background.onload = resolve),
            new Promise(resolve => wheel.onload = resolve)
        ]).then(() => {
            console.log('Alle afbeeldingen geladen, start frame generatie');
            const frameCount = 60; // 2 seconds at 30 fps
            let currentFrame = 0;

            function addFrame() {
                if (currentFrame < frameCount) {
                    ctx.drawImage(background, 0, 0, 960, 540);
                    
                    const progress = currentFrame / frameCount;
                    const rotation = progress * 360 * 5 + targetNumber * (360 / 1000);
                    
                    ctx.save();
                    ctx.translate(480, 270);
                    ctx.rotate(rotation * Math.PI / 180);
                    ctx.drawImage(wheel, -75, -75, 150, 150);
                    ctx.restore();
                    
                    gif.addFrame(ctx, {copy: true, delay: 33});
                    
                    currentFrame++;
                    const frameProgress = Math.round((currentFrame / frameCount) * 50);
                    progressBar.style.width = `${frameProgress}%`;
                    downloadVideoButton.textContent = `Frames toevoegen: ${frameProgress}%`;
                    
                    requestAnimationFrame(addFrame);
                } else {
                    console.log('Alle frames toegevoegd, start rendering');
                    gif.render();
                }
            }

            addFrame();
            
            gif.on('progress', function(p) {
                const progress = Math.round(p * 50) + 50; // Start vanaf 50% (na frames toevoegen)
                console.log('Rendering voortgang:', progress + '%');
                progressBar.style.width = `${progress}%`;
                downloadVideoButton.textContent = `Rendering: ${progress}%`;
            });

            gif.on('finished', function(blob) {
                console.log('GIF rendering voltooid');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'wheel_spin.gif';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                downloadVideoButton.disabled = false;
                downloadVideoButton.textContent = 'Download GIF';
                progressBar.style.display = 'none';
                console.log('GIF download gestart');
            });
        }).catch(error => {
            console.error('Fout bij het laden van afbeeldingen:', error);
            alert('Er is een fout opgetreden bij het laden van de afbeeldingen. Probeer het opnieuw.');
            downloadVideoButton.disabled = false;
            downloadVideoButton.textContent = 'Download GIF';
            progressBar.style.display = 'none';
        });
    } else {
        alert('Voer een geldig nummer in tussen 0 en 1000.');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const numberDisplay = document.getElementById('number-display');
    const randomNumber = Math.floor(Math.random() * 100) + 1; // Genereer een willekeurig nummer tussen 1 en 100

    // Animatie voor het tevoorschijn komen van het nummer
    gsap.fromTo(numberDisplay, 
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1, ease: "back.out(1.7)", delay: 0.5 }
    );

    // Zet het nummer in het element
    numberDisplay.textContent = randomNumber;
});
