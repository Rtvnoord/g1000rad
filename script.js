// Elementen ophalen
const targetNumberInput = document.getElementById('targetNumber');
const generateRandomButton = document.getElementById('generateRandom');
const spinWheelButton = document.getElementById('spinWheel');
const downloadVideoButton = document.getElementById('downloadVideo');
const progressBar = document.getElementById('progressBar');

// Gemeenschappelijke render functie
function renderWheel(ctx, width, height, rotation, targetNumber, showNumber = false, numberScale = 1) {
    const wheelSize = 800; // Vergroot het rad
    const numberSize = 300; // Vergroot het nummer
    const wheelOffsetY = -50; // Verplaats het rad 50 pixels omhoog

    // Teken de achtergrond
    ctx.drawImage(background, 0, 0, width, height);

    // Teken het rad
    ctx.save();
    ctx.translate(width / 2, height / 2 + wheelOffsetY);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.drawImage(wheelImage, -wheelSize/2, -wheelSize/2, wheelSize, wheelSize);
    ctx.restore();

    // Teken het nummer als showNumber true is
    if (showNumber) {
        const numberBoxSize = numberSize * numberScale;
        
        ctx.fillStyle = '#ee7204';
        ctx.fillRect((width - numberBoxSize) / 2, (height - numberBoxSize) / 2, numberBoxSize, numberBoxSize);
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 5 * numberScale;
        ctx.strokeRect((width - numberBoxSize) / 2, (height - numberBoxSize) / 2, numberBoxSize, numberBoxSize);
        
        ctx.fillStyle = 'white';
        ctx.font = `bold ${150 * numberScale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(targetNumber, width / 2, height / 2);
    }
}

function updateProgress(progress, stage) {
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${progress}%`;
    if (stage === 'frames') {
        const frame = Math.floor((progress / 80) * 400);
        spinWheelButton.textContent = `Genereren: Frame ${frame}/400`;
    } else if (stage === 'encoding') {
        spinWheelButton.textContent = `Video renderen: ${progress}%`;
    } else if (stage === 'complete') {
        spinWheelButton.textContent = 'Genereer video';
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

spinWheelButton.addEventListener('click', async () => {
    const targetNumber = parseInt(targetNumberInput.value);
    if (targetNumber >= 0 && targetNumber <= 1000) {
        await generateVideo(targetNumber);
    } else {
        alert('Voer een geldig nummer in tussen 0 en 1000.');
    }
});

// Enable the download button initially
downloadVideoButton.disabled = false;

let ffmpeg;
let html2canvasLoaded = false;
let generatedVideoBlob = null;
let background, wheelImage;

// Laad de afbeeldingen bij het starten van de applicatie
window.addEventListener('load', async () => {
    [background, wheelImage] = await Promise.all([
        loadImage('background.jpg'),
        loadImage('wheel.png')
    ]);
});

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

downloadVideoButton.addEventListener('click', () => {
    if (generatedVideoBlob) {
        downloadVideo(generatedVideoBlob);
    } else {
        alert('Genereer eerst een video voordat je deze probeert te downloaden.');
    }
});

async function generateVideo(targetNumber) {
    console.log('Start MP4 generatie voor nummer:', targetNumber);
    spinWheelButton.disabled = true;
    downloadVideoButton.disabled = true;
    spinWheelButton.textContent = 'Video wordt gegenereerd...';
    progressBar.style.width = '0%';
    progressBar.style.display = 'block';

    const frameCount = 400; // 16 seconds at 25 fps (6 seconds spinning + 10 seconds static)
    const fps = 25;
    const spinDuration = 150; // 6 seconds of spinning
    const width = 1920;
    const height = 1080;

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
        const numberScale = showNumber ? easeOutElastic(Math.min((i - spinDuration) / 25, 1)) : 0; // Snellere animatie met easing

        renderWheel(ctx, width, height, rotation, targetNumber, showNumber, numberScale);

        const frameData = canvas.toDataURL('image/png').split(',')[1];
        ffmpeg.FS('writeFile', `frame_${i.toString().padStart(5, '0')}.png`, Uint8Array.from(atob(frameData), c => c.charCodeAt(0)));
        
        const frameProgress = Math.round((i / frameCount) * 80); // Max 80% voor frame generatie
        updateProgress(frameProgress, 'frames');

        // Voeg een kleine pauze toe om de UI te laten updaten
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    console.log('Alle frames gegenereerd, start video rendering');
    
    ffmpeg.setProgress(({ ratio }) => {
        const encodingProgress = Math.round(80 + ratio * 20); // 80% tot 100%
        updateProgress(encodingProgress, 'encoding');
    });

    await ffmpeg.run(
        '-framerate', `${fps}`,
        '-i', 'frame_%05d.png',
        '-c:v', 'libx264',
        '-preset', 'slow',
        '-crf', '22',
        '-vf', 'scale=1920:1080,setsar=1:1',
        '-pix_fmt', 'yuv420p',
        'output.mp4'
    );
    
    console.log('Video rendering voltooid');
    const data = ffmpeg.FS('readFile', 'output.mp4');
    generatedVideoBlob = new Blob([data.buffer], { type: 'video/mp4' });

    // Update progress to 100% when ready to download
    updateProgress(100, 'complete');

    // Opruimen
    for (let i = 0; i < frameCount; i++) {
        ffmpeg.FS('unlink', `frame_${i.toString().padStart(5, '0')}.png`);
    }
    ffmpeg.FS('unlink', 'output.mp4');
    
    spinWheelButton.disabled = false;
    spinWheelButton.textContent = 'Genereer video';
    downloadVideoButton.disabled = false;
    downloadVideoButton.textContent = 'Download video';
    console.log('Video generatie voltooid');
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

