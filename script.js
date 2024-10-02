// Elementen ophalen
const wheel = document.getElementById('wheel');
const targetNumberInput = document.getElementById('targetNumber');
const generateRandomButton = document.getElementById('generateRandom');
const spinWheelButton = document.getElementById('spinWheel');
const downloadVideoButton = document.getElementById('downloadVideo');
const progressBar = document.getElementById('progressBar');
const numberDisplay = document.getElementById('number-display');

// Gemeenschappelijke render functie
function renderWheel(ctx, width, height, rotation, targetNumber, showNumber = false, numberScale = 1) {
    const wheelSize = 350;
    const numberSize = 180;

    // Teken de achtergrond
    ctx.drawImage(background, 0, 0, width, height);

    // Teken het rad
    ctx.save();
    ctx.translate(width / 2, height * 0.45);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.drawImage(wheel, -wheelSize/2, -wheelSize/2, wheelSize, wheelSize);
    ctx.restore();

    // Teken het nummer als showNumber true is
    if (showNumber) {
        const numberBoxSize = numberSize * numberScale;
        
        ctx.fillStyle = '#ee7204';
        ctx.fillRect((width - numberBoxSize) / 2, (height - numberBoxSize) * 0.45, numberBoxSize, numberBoxSize);
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3 * numberScale;
        ctx.strokeRect((width - numberBoxSize) / 2, (height - numberBoxSize) * 0.45, numberBoxSize, numberBoxSize);
        
        ctx.fillStyle = 'white';
        ctx.font = `bold ${90 * numberScale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(targetNumber, width / 2, height * 0.45);
    }
}

// Functie om het rad te draaien
function spinWheel(targetNumber) {
    // Verberg het nummer-container voordat het rad begint te draaien
    gsap.set("#number-container", { opacity: 0, scale: 0 });

    // Bereken het aantal graden dat het rad moet draaien
    const degreesPerNumber = 360 / 1000;
    const degrees = targetNumber * degreesPerNumber;
    
    // Voeg wat willekeurigheid toe aan de rotatie
    const extraSpins = Math.floor(Math.random() * 5 + 5) * 360; // 5 tot 10 extra rotaties
    const totalDegrees = degrees + extraSpins;

    // Animeer het rad
    const duration = 4; // 4 seconden
    const fps = 60;
    const totalFrames = duration * fps;

    let frame = 0;
    const animate = () => {
        if (frame <= totalFrames) {
            const progress = frame / totalFrames;
            const currentRotation = easeOutCubic(progress) * totalDegrees;

            const canvas = document.createElement('canvas');
            canvas.width = 960;
            canvas.height = 540;
            const ctx = canvas.getContext('2d');

            renderWheel(ctx, canvas.width, canvas.height, currentRotation, targetNumber);

            // Update het wheel-container element
            document.getElementById('wheel-container').innerHTML = '';
            document.getElementById('wheel-container').appendChild(canvas);

            frame++;
            requestAnimationFrame(animate);
        } else {
            // Toon het nummer na de animatie
            showNumber(targetNumber);
        }
    };

    animate();
}

// Functie om het nummer te tonen
function showNumber(number) {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');

    const degreesPerNumber = 360 / 1000;
    const degrees = number * degreesPerNumber;

    renderWheel(ctx, canvas.width, canvas.height, degrees, number, true);

    // Update het wheel-container element
    document.getElementById('wheel-container').innerHTML = '';
    document.getElementById('wheel-container').appendChild(canvas);

    gsap.from(canvas, {
        opacity: 0,
        scale: 0.5,
        duration: 0.8,
        ease: "back.out(1.7)"
    });
}

function updateProgress(progress) {
    progressBar.style.width = `${progress}%`;
    downloadVideoButton.textContent = `Video genereren: ${progress}%`;
    if (progress === 100) {
        downloadVideoButton.textContent = 'Download MP4';
    }
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
let html2canvasLoaded = false;
let generatedVideoBlob = null;
let background;
let wheel;

// Laad de afbeeldingen bij het starten van de applicatie
window.addEventListener('load', async () => {
    background = await loadImage('background.jpg');
    wheel = await loadImage('wheel.png');
});

// Disable the download button initially
downloadVideoButton.disabled = true;

const { createFFmpeg, fetchFile } = FFmpeg;

async function loadDependencies() {
    // Load FFmpeg
    ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();
    console.log('FFmpeg is geladen');

    // Load html2canvas
    if (typeof html2canvas === 'undefined') {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'html2canvas.min.js';
            script.onload = () => {
                console.log('html2canvas is geladen');
                html2canvasLoaded = true;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    } else {
        console.log('html2canvas is al geladen');
        html2canvasLoaded = true;
        return Promise.resolve();
    }
}

document.addEventListener('DOMContentLoaded', loadDependencies);

downloadVideoButton.addEventListener('click', async () => {
    const targetNumber = parseInt(targetNumberInput.value);
    if (targetNumber >= 0 && targetNumber <= 1000 && ffmpeg.isLoaded() && html2canvasLoaded) {
        if (generatedVideoBlob) {
            // Als er al een gegenereerde video is, download deze direct
            downloadVideo(generatedVideoBlob);
        } else {
            // Anders, genereer een nieuwe video
            await generateAndDownloadVideo(targetNumber);
        }
    } else if (!ffmpeg.isLoaded()) {
        alert('FFmpeg is nog niet geladen. Probeer het over enkele seconden opnieuw.');
    } else if (!html2canvasLoaded) {
        alert('html2canvas is nog niet geladen. Probeer het over enkele seconden opnieuw.');
    } else {
        alert('Voer een geldig nummer in tussen 0 en 1000.');
    }
});

async function generateAndDownloadVideo(targetNumber) {
    console.log('Start MP4 generatie voor nummer:', targetNumber);
    downloadVideoButton.disabled = true;
    downloadVideoButton.textContent = 'Video wordt gegenereerd...';
    progressBar.style.width = '0%';
    progressBar.style.display = 'block';

    const frameCount = 480; // 16 seconds at 30 fps (6 seconds spinning + 10 seconds static)
    const fps = 30;
    const spinDuration = 180; // 6 seconds of spinning
    const width = 960;
    const height = 540;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    console.log('Start frame generatie');

    const extraSpins = Math.floor(Math.random() * 5 + 5) * 360; // 5 tot 10 extra rotaties
    const targetDegrees = targetNumber * (360 / 1000);
    const totalDegrees = targetDegrees + extraSpins;

    for (let i = 0; i < frameCount; i++) {
        const progress = Math.min(i / spinDuration, 1);
        const easeProgress = easeOutCubic(progress);
        const rotation = easeProgress * totalDegrees;
        
        const showNumber = i >= spinDuration;
        const numberScale = showNumber ? Math.min((i - spinDuration) / 30, 1) : 0; // 1 seconde animatie

        renderWheel(ctx, width, height, rotation, targetNumber, showNumber, numberScale);

        const frameData = canvas.toDataURL('image/png').split(',')[1];
        ffmpeg.FS('writeFile', `frame_${i.toString().padStart(5, '0')}.png`, Uint8Array.from(atob(frameData), c => c.charCodeAt(0)));
        
        const frameProgress = Math.round((i / frameCount) * 80); // Max 80% voor frame generatie
        updateProgress(frameProgress);
    }

    console.log('Alle frames gegenereerd, start video rendering');
    await ffmpeg.run(
        '-framerate', `${fps}`,
        '-i', 'frame_%05d.png',
        '-c:v', 'libx264',
        '-preset', 'slow',
        '-crf', '22',
        '-vf', 'scale=960:540,setsar=1:1',
        '-pix_fmt', 'yuv420p',
        'output.mp4'
    );
    updateProgress(95); // Update progress after video rendering
    
    console.log('Video rendering voltooid');
    const data = ffmpeg.FS('readFile', 'output.mp4');
    generatedVideoBlob = new Blob([data.buffer], { type: 'video/mp4' });

    // Update progress to 100% when ready to download
    updateProgress(100);

    // Opruimen
    for (let i = 0; i < frameCount; i++) {
        ffmpeg.FS('unlink', `frame_${i.toString().padStart(5, '0')}.png`);
    }
    ffmpeg.FS('unlink', 'output.mp4');
    
    downloadVideoButton.disabled = false;
    progressBar.style.display = 'none';
    console.log('Video generatie voltooid');

    // Download de gegenereerde video
    downloadVideo(generatedVideoBlob);
}

function downloadVideo(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wheel_spin.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('MP4 download gestart');
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeOutElastic(t) {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

