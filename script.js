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
        downloadVideoButton.disabled = false; // Enable the download button after spinning
    } else {
        alert('Voer een geldig nummer in tussen 0 en 1000.');
    }
});

// Disable the download button initially
downloadVideoButton.disabled = true;

// Verwijder de bestaande DOMContentLoaded event listener

let ffmpeg;

// Disable the download button initially
downloadVideoButton.disabled = true;

import { createFFmpeg, fetchFile } from './ffmpeg.min.js';

async function loadFFmpeg() {
    ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();
    console.log('FFmpeg is geladen');
}

loadFFmpeg();

downloadVideoButton.addEventListener('click', async () => {
    const targetNumber = parseInt(targetNumberInput.value);
    if (targetNumber >= 0 && targetNumber <= 1000 && ffmpeg.isLoaded()) {
        console.log('Start MP4 generatie voor nummer:', targetNumber);
        downloadVideoButton.disabled = true;
        downloadVideoButton.textContent = 'Video wordt gegenereerd...';
        progressBar.style.width = '0%';
        progressBar.style.display = 'block';

        const canvas = document.createElement('canvas');
        canvas.width = 960;
        canvas.height = 540;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const background = await loadImage('background.jpg');
        const wheel = await loadImage('wheel.png');

        console.log('Alle afbeeldingen geladen, start frame generatie');
        const frameCount = 60; // 2 seconds at 30 fps
        const fps = 30;

        for (let i = 0; i < frameCount; i++) {
            ctx.drawImage(background, 0, 0, 960, 540);
            
            const progress = i / frameCount;
            const rotation = progress * 360 * 5 + targetNumber * (360 / 1000);
            
            ctx.save();
            ctx.translate(480, 270);
            ctx.rotate(rotation * Math.PI / 180);
            ctx.drawImage(wheel, -75, -75, 150, 150);
            ctx.restore();
            
            const frameData = canvas.toDataURL('image/png').split(',')[1];
            ffmpeg.FS('writeFile', `frame_${i.toString().padStart(5, '0')}.png`, Uint8Array.from(atob(frameData), c => c.charCodeAt(0)));
            
            const frameProgress = Math.round((i / frameCount) * 50);
            progressBar.style.width = `${frameProgress}%`;
            downloadVideoButton.textContent = `Frames genereren: ${frameProgress}%`;
        }

        console.log('Alle frames gegenereerd, start video rendering');
        await ffmpeg.run('-framerate', `${fps}`, '-i', 'frame_%05d.png', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'output.mp4');
        
        console.log('Video rendering voltooid');
        const data = ffmpeg.FS('readFile', 'output.mp4');
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wheel_spin.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Opruimen
        for (let i = 0; i < frameCount; i++) {
            ffmpeg.FS('unlink', `frame_${i.toString().padStart(5, '0')}.png`);
        }
        ffmpeg.FS('unlink', 'output.mp4');
        
        downloadVideoButton.disabled = false;
        downloadVideoButton.textContent = 'Download MP4';
        progressBar.style.display = 'none';
        console.log('MP4 download gestart');
    } else if (!ffmpeg.isLoaded()) {
        alert('FFmpeg is nog niet geladen. Probeer het over enkele seconden opnieuw.');
    } else {
        alert('Voer een geldig nummer in tussen 0 en 1000.');
    }
});

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

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
