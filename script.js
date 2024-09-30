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
    const numberDisplay = document.getElementById('number-display');
    numberDisplay.textContent = number;

    gsap.set(numberContainer, {
        opacity: 0,
        scale: 0,
        left: '50%',
        top: '50%',
        xPercent: -50,
        yPercent: -50
    });

    gsap.to(numberContainer, {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        ease: "elastic.out(1, 0.5)",
        onComplete: () => animateNumber()
    });
}

// Functie om het nummer te animeren
function animateNumber() {
    gsap.fromTo("#number-display", 
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)", delay: 0.2 }
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
let html2canvasLoaded = false;

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

        const background = await loadImage('background.jpg');
        const wheel = await loadImage('wheel.png');

        console.log('Alle afbeeldingen geladen, start frame generatie');

        const extraSpins = Math.floor(Math.random() * 5 + 5) * 360; // 5 tot 10 extra rotaties
        const targetDegrees = targetNumber * (360 / 1000);
        const totalDegrees = targetDegrees + extraSpins;

        let lastFrame;
        for (let i = 0; i < frameCount; i++) {
            if (i < spinDuration) {
                ctx.drawImage(background, 0, 0, width, height);
                
                const progress = i / spinDuration;
                const easeProgress = easeOutCubic(progress);
                const rotation = easeProgress * totalDegrees;
                
                ctx.save();
                ctx.translate(width / 2, height / 2);
                ctx.rotate(rotation * Math.PI / 180);
                ctx.drawImage(wheel, -150, -150, 300, 300);
                ctx.restore();
            }
            
            if (i === spinDuration - 1 || (i >= spinDuration && !lastFrame)) {
                // Toon het nummer met animatie
                const numberContainer = document.createElement('div');
                numberContainer.style.position = 'absolute';
                numberContainer.style.left = '50%';
                numberContainer.style.top = '50%';
                numberContainer.style.transform = 'translate(-50%, -50%)';
                numberContainer.style.width = '120px';
                numberContainer.style.height = '120px';
                numberContainer.style.backgroundColor = '#ee7204';
                numberContainer.style.border = '4px solid white';
                numberContainer.style.borderRadius = '10px';
                numberContainer.style.display = 'flex';
                numberContainer.style.justifyContent = 'center';
                numberContainer.style.alignItems = 'center';
                numberContainer.style.fontSize = '60px';
                numberContainer.style.fontWeight = 'bold';
                numberContainer.style.color = 'white';
                numberContainer.textContent = targetNumber;
                
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                const tempCtx = tempCanvas.getContext('2d');
                
                document.body.appendChild(numberContainer);
                try {
                    // Animatie van het nummer
                    const animationFrames = 30; // 1 seconde animatie bij 30 fps
                    for (let frame = 0; frame < animationFrames; frame++) {
                        const progress = frame / (animationFrames - 1);
                        const scale = easeOutElastic(progress);
                        numberContainer.style.transform = `translate(-50%, -50%) scale(${scale})`;
                        
                        tempCtx.drawImage(canvas, 0, 0);
                        
                        let numberCanvas = await html2canvas(numberContainer);
                        if (numberCanvas && numberCanvas.width > 0 && numberCanvas.height > 0) {
                            tempCtx.drawImage(numberCanvas, (width - 120) / 2, (height - 120) / 2);
                        } else {
                            console.error('Ongeldige numberCanvas grootte:', numberCanvas ? `${numberCanvas.width}x${numberCanvas.height}` : 'null');
                        }
                        
                        const frameData = tempCanvas.toDataURL('image/png').split(',')[1];
                        ffmpeg.FS('writeFile', `frame_${(i + frame).toString().padStart(5, '0')}.png`, Uint8Array.from(atob(frameData), c => c.charCodeAt(0)));
                    }
                    lastFrame = tempCanvas.toDataURL('image/png').split(',')[1];
                    i += animationFrames - 1; // Skip frames used for animation
                } catch (error) {
                    console.error('Fout bij het genereren van het laatste frame:', error);
                    // Gebruik het laatste succesvolle frame als fallback
                    lastFrame = lastFrame || canvas.toDataURL('image/png').split(',')[1];
                } finally {
                    document.body.removeChild(numberContainer);
                }
            }
            
            if (i >= spinDuration && lastFrame) {
                console.log('Gebruik laatst gegenereerde frame voor frame', i);
                ffmpeg.FS('writeFile', `frame_${i.toString().padStart(5, '0')}.png`, Uint8Array.from(atob(lastFrame), c => c.charCodeAt(0)));
            } else {
                const frameData = canvas.toDataURL('image/png').split(',')[1];
                ffmpeg.FS('writeFile', `frame_${i.toString().padStart(5, '0')}.png`, Uint8Array.from(atob(frameData), c => c.charCodeAt(0)));
            }
            
            const frameProgress = Math.round((i / frameCount) * 90); // Max 90% voor frame generatie
            progressBar.style.width = `${frameProgress}%`;
            downloadVideoButton.textContent = `Video genereren: ${frameProgress}%`;
        }

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function easeOutElastic(t) {
            const p = 0.3;
            return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        }

        console.log('Alle frames gegenereerd, start video rendering');
        await ffmpeg.run(
            '-framerate', `${fps}`,
            '-i', 'frame_%05d.png',
            '-c:v', 'libx264',
            '-preset', 'slow',
            '-crf', '22',
            '-vf', 'scale=1920:1080',
            '-pix_fmt', 'yuv420p',
            'output.mp4'
        );
        
        console.log('Video rendering voltooid');
        const data = ffmpeg.FS('readFile', 'output.mp4');
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wheel_spin.mp4';
        document.body.appendChild(a);

        // Update progress to 100% when ready to download
        progressBar.style.width = '100%';
        downloadVideoButton.textContent = 'Video genereren: 100%';

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
    } else if (!html2canvasLoaded) {
        alert('html2canvas is nog niet geladen. Probeer het over enkele seconden opnieuw.');
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
