// Elementen ophalen
const targetNumberInput = document.getElementById('targetNumber');
const generateRandomButton = document.getElementById('generateRandom');
const spinWheelButton = document.getElementById('spinWheel');
const downloadVideoButton = document.getElementById('downloadVideo');
const progressBar = document.getElementById('progressBar');

let wheelData = {};

// Laad de wheelData bij het starten van de applicatie
fetch('wheelData.json')
    .then(response => response.json())
    .then(data => {
        wheelData = data;
        console.log('Wheel data geladen');
    })
    .catch(error => console.error('Fout bij het laden van wheel data:', error));

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
        const yOffset = -100; // Verplaats het vierkant 100 pixels omhoog
        
        ctx.fillStyle = '#ee7204';
        ctx.fillRect((width - numberBoxSize) / 2, (height - numberBoxSize) / 2 + yOffset, numberBoxSize, numberBoxSize);
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 5 * numberScale;
        ctx.strokeRect((width - numberBoxSize) / 2, (height - numberBoxSize) / 2 + yOffset, numberBoxSize, numberBoxSize);
        
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 5 * numberScale;
        ctx.font = `bold ${150 * numberScale}px DINPro-Bold`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(targetNumber, width / 2, height / 2 + yOffset);
        ctx.fillText(targetNumber, width / 2, height / 2 + yOffset);

        // Toon artiest en nummer
        if (wheelData[targetNumber]) {
            ctx.font = `bold ${40 * numberScale}px DINPro-Bold`;
            ctx.lineWidth = 2 * numberScale;
            ctx.strokeText(wheelData[targetNumber].artist, width / 2, height / 2 + yOffset + 180 * numberScale);
            ctx.fillText(wheelData[targetNumber].artist, width / 2, height / 2 + yOffset + 180 * numberScale);
            ctx.font = `${30 * numberScale}px DINPro-Bold`;
            ctx.strokeText(wheelData[targetNumber].song, width / 2, height / 2 + yOffset + 230 * numberScale);
            ctx.fillText(wheelData[targetNumber].song, width / 2, height / 2 + yOffset + 230 * numberScale);
        }
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

    // Load audio file
    const audioResponse = await fetch('geluid_rad.wav');
    const audioArrayBuffer = await audioResponse.arrayBuffer();
    ffmpeg.FS('writeFile', 'geluid_rad.wav', new Uint8Array(audioArrayBuffer));
    console.log('Audio file is geladen');

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

    // Load custom font
    const fontResponse = await fetch('DINPro-Bold.otf');
    const fontData = await fontResponse.arrayBuffer();
    const font = new FontFace('DINPro-Bold', fontData);
    await font.load();
    document.fonts.add(font);

    const worker = new Worker('videoWorker.js');

    worker.onmessage = async function(e) {
        if (e.data.type === 'progress') {
            updateProgress(e.data.progress, e.data.stage);
        } else if (e.data.type === 'complete') {
            console.log('Frames gegenereerd, start video rendering');
            
            ffmpeg.setProgress(({ ratio }) => {
                const encodingProgress = Math.round(80 + ratio * 20); // 80% tot 100%
                updateProgress(encodingProgress, 'encoding');
            });

            for (let i = 0; i < frameCount; i++) {
                const frameData = e.data.frames[i];
                ffmpeg.FS('writeFile', `frame_${i.toString().padStart(5, '0')}.png`, frameData);
            }

            await ffmpeg.run(
                '-framerate', `${fps}`,
                '-i', 'frame_%05d.png',
                '-i', 'geluid_rad.wav',
                '-c:v', 'libx264',
                '-preset', 'veryslow',
                '-crf', '17',
                '-c:a', 'aac',
                '-b:a', '320k',
                '-shortest',
                '-vf', 'scale=1920:1080,setsar=1:1',
                '-pix_fmt', 'yuv420p',
                '-profile:v', 'high',
                '-level', '5.1',
                '-x264-params', 'ref=5:bframes=3:b-adapt=2:me=umh:subme=10:trellis=2:deblock=-1,-1',
                '-movflags', '+faststart',
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
            ffmpeg.FS('unlink', 'geluid_rad.wav');
            
            spinWheelButton.disabled = false;
            spinWheelButton.textContent = 'Genereer video';
            downloadVideoButton.disabled = false;
            downloadVideoButton.textContent = 'Download video';
            console.log('Video generatie voltooid');
        }
    };

    worker.postMessage({
        targetNumber,
        frameCount,
        spinDuration,
        width,
        height,
        background: background.src,
        wheelImage: wheelImage.src,
        wheelData: JSON.parse(JSON.stringify(wheelData)),
        fontData: fontData
    });
}

async function downloadVideo(blob) {
    // Download MP4
    const videoUrl = URL.createObjectURL(blob);
    const videoLink = document.createElement('a');
    videoLink.href = videoUrl;
    videoLink.download = 'wheel_spin.mp4';
    document.body.appendChild(videoLink);
    videoLink.click();
    document.body.removeChild(videoLink);
    URL.revokeObjectURL(videoUrl);

    // Download WAV
    const audioResponse = await fetch('geluid_rad.wav');
    const audioBlob = await audioResponse.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audioLink = document.createElement('a');
    audioLink.href = audioUrl;
    audioLink.download = 'geluid_rad.wav';
    document.body.appendChild(audioLink);
    audioLink.click();
    document.body.removeChild(audioLink);
    URL.revokeObjectURL(audioUrl);

    console.log('MP4 en WAV download gestart');
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

