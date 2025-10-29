const express = require('express');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { createCanvas, loadImage } = require('canvas');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Load G1000 data
let g1000Data = [];
try {
    const data = fs.readFileSync('./data/g1000-2.json', 'utf8');
    g1000Data = JSON.parse(data);
    console.log(`G1000 data geladen: ${g1000Data.length} nummers`);
} catch (error) {
    console.error('Fout bij laden G1000 data:', error);
}

// API Routes
app.get('/api/g1000-data', (req, res) => {
    res.json(g1000Data);
});

app.post('/api/generate-wheel', async (req, res) => {
    try {
        const { selectedNumber, isRandom, spinSpeed } = req.body;
        
        let winningEntry;
        if (isRandom) {
            const randomIndex = Math.floor(Math.random() * g1000Data.length);
            winningEntry = g1000Data[randomIndex];
        } else {
            winningEntry = g1000Data.find(entry => entry.nummer === selectedNumber);
            if (!winningEntry) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Nummer niet gevonden' 
                });
            }
        }

        // Generate session ID for this wheel generation
        const sessionId = Date.now().toString();
        
        console.log(`Genereer rad video voor nummer ${winningEntry.nummer}: ${winningEntry.artiest} - ${winningEntry.titel}`);
        console.log(`Draai snelheid: ${spinSpeed}`);
        
        // Start video generation in background
        generateWheelVideo(sessionId, winningEntry, spinSpeed, g1000Data)
            .then(() => {
                console.log(`Video succesvol gegenereerd voor sessie ${sessionId}`);
            })
            .catch(error => {
                console.error('Fout bij video generatie voor sessie', sessionId, ':', error);
            });
        
        res.json({
            success: true,
            sessionId: sessionId,
            winningEntry: {
                position: winningEntry.nummer,
                artist: winningEntry.artiest,
                title: winningEntry.titel
            }
        });
        
    } catch (error) {
        console.error('Fout bij genereren rad:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server fout bij genereren rad' 
        });
    }
});

// Video generation function
async function generateWheelVideo(sessionId, winningEntry, spinSpeed, allEntries) {
    console.log(`Start video generatie voor sessie ${sessionId}`);
    
    const outputPath = path.join(__dirname, 'videos', `wheel_${sessionId}.mp4`);
    const framesDir = path.join(__dirname, 'temp', sessionId);
    
    console.log(`Output pad: ${outputPath}`);
    console.log(`Frames directory: ${framesDir}`);
    
    // Create directories
    if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        console.log('Videos directory aangemaakt');
    }
    if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir, { recursive: true });
        console.log('Temp frames directory aangemaakt');
    }

    try {
        // Load background and wheel images
        let backgroundImage = null;
        let wheelImage = null;
        
        const backgroundPath = path.join(__dirname, 'assets', 'background.jpg');
        const wheelPath = path.join(__dirname, 'assets', 'wheel.png');
        
        console.log(`Zoek background: ${backgroundPath}`);
        console.log(`Background bestaat: ${fs.existsSync(backgroundPath)}`);
        
        if (fs.existsSync(backgroundPath)) {
            console.log('Laad background image...');
            backgroundImage = await loadImage(backgroundPath);
            console.log('Background image geladen');
        }
        
        console.log(`Zoek wheel: ${wheelPath}`);
        console.log(`Wheel bestaat: ${fs.existsSync(wheelPath)}`);
        
        if (fs.existsSync(wheelPath)) {
            console.log('Laad wheel image...');
            wheelImage = await loadImage(wheelPath);
            console.log('Wheel image geladen');
        }

        // Register custom fonts
        const fontsDir = path.join(__dirname, 'fonts');
        if (fs.existsSync(fontsDir)) {
            const fontFiles = fs.readdirSync(fontsDir).filter(file => 
                file.endsWith('.ttf') || file.endsWith('.otf')
            );
            
            for (const fontFile of fontFiles) {
                const fontPath = path.join(fontsDir, fontFile);
                const fontName = path.parse(fontFile).name;
                try {
                    const { registerFont } = require('canvas');
                    registerFont(fontPath, { family: fontName });
                    console.log(`Font geregistreerd: ${fontName}`);
                } catch (error) {
                    console.warn(`Kon font niet registreren: ${fontFile}`, error.message);
                }
            }
        }

        const fps = 30;
        const videoDuration = 16; // Vaste duur van 16 seconden voor geluid sync
        const spinDuration = 10; // Rad draait 10 seconden
        const textDuration = 6; // Tekst animatie 6 seconden
        const totalFrames = Math.floor(videoDuration * fps);
        const spinFrames = Math.floor(spinDuration * fps);
        const canvas = createCanvas(1920, 1080);
        const ctx = canvas.getContext('2d');

        // Calculate winning position (convert nummer to angle)
        const winningAngle = (winningEntry.nummer / 1000) * Math.PI * 2;

        console.log(`Genereer ${totalFrames} frames...`);
        
        // Generate frames
        for (let frame = 0; frame < totalFrames; frame++) {
            if (frame % 60 === 0) { // Log elke 2 seconden (30fps)
                console.log(`Frame ${frame}/${totalFrames} (${Math.round((frame/totalFrames)*100)}%)`);
            }
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw background
            if (backgroundImage) {
                ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
            } else {
                // Default gradient background
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                gradient.addColorStop(0, '#667eea');
                gradient.addColorStop(1, '#764ba2');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            if (frame < spinFrames) {
                // Spinning phase (first 10 seconds)
                const progress = frame / spinFrames;
                const easeOut = 1 - Math.pow(1 - progress, 3); // Smooth deceleration
                
                // Start with multiple rotations and end at winning position
                // Snelheid bepaalt aantal rotaties: 1=4 rotaties, 5=12 rotaties
                const initialSpins = 2 + (spinSpeed * 2); 
                const totalRotation = (Math.PI * 2 * initialSpins) + winningAngle;
                const currentRotation = totalRotation * easeOut;

                // Draw spinning wheel
                drawSpinningWheel(ctx, canvas.width / 2, canvas.height / 2, wheelImage, currentRotation);
            } else {
                // Text animation phase (last 6 seconds)
                const textFrame = frame - spinFrames;
                const textProgress = textFrame / (totalFrames - spinFrames);
                
                // Draw final wheel position (stopped)
                const finalRotation = (Math.PI * 2 * (2 + (spinSpeed * 2))) + winningAngle;
                drawSpinningWheel(ctx, canvas.width / 2, canvas.height / 2, wheelImage, finalRotation);
                
                // Draw winning entry with animation
                drawWinningEntry(ctx, canvas.width / 2, canvas.height / 2, winningEntry, textProgress);
            }

            // Save frame
            const buffer = canvas.toBuffer('image/png');
            const framePath = path.join(framesDir, `frame_${frame.toString().padStart(6, '0')}.png`);
            fs.writeFileSync(framePath, buffer);
        }

        console.log('Start FFmpeg video generatie...');
        
        // Create video from frames using ffmpeg with audio
        await new Promise((resolve, reject) => {
            const audioPath = path.join(__dirname, 'assets', 'geluid_rad.wav');
            
            console.log(`Audio pad: ${audioPath}`);
            console.log(`Audio bestaat: ${fs.existsSync(audioPath)}`);
            
            let ffmpegCommand = ffmpeg()
                .input(path.join(framesDir, 'frame_%06d.png'))
                .inputFPS(fps);
            
            // Add audio if it exists
            if (fs.existsSync(audioPath)) {
                console.log('Voeg audio toe aan video...');
                ffmpegCommand = ffmpegCommand.input(audioPath);
            }
            
            ffmpegCommand
                .videoCodec('libx264')
                .outputOptions([
                    '-pix_fmt yuv420p',
                    '-crf 23',
                    '-t 16' // Zorg dat video precies 16 seconden duurt
                ])
                .output(outputPath)
                .on('start', (commandLine) => {
                    console.log('FFmpeg gestart met commando:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log('FFmpeg progress:', Math.round(progress.percent || 0) + '%');
                })
                .on('end', () => {
                    console.log(`Video met geluid gegenereerd: ${outputPath}`);
                    console.log(`Video bestand grootte: ${fs.statSync(outputPath).size} bytes`);
                    // Clean up temp frames
                    fs.rmSync(framesDir, { recursive: true, force: true });
                    console.log('Temp frames opgeruimd');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    console.error('FFmpeg stderr:', err.message);
                    reject(err);
                })
                .run();
        });

    } catch (error) {
        console.error('Fout bij video generatie voor sessie', sessionId, ':', error);
        console.error('Error stack:', error.stack);
        // Clean up on error
        if (fs.existsSync(framesDir)) {
            fs.rmSync(framesDir, { recursive: true, force: true });
            console.log('Temp frames opgeruimd na fout');
        }
        throw error;
    }
}

function drawSpinningWheel(ctx, centerX, centerY, wheelImage, rotation) {
    if (!wheelImage) {
        // Fallback: draw a simple colored circle if wheel.png is not available
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 400, 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    
    // Draw wheel image centered
    const wheelSize = 800; // Size of the wheel in pixels
    ctx.drawImage(wheelImage, -wheelSize/2, -wheelSize/2, wheelSize, wheelSize);
    
    ctx.restore();
}

function drawPointer(ctx, centerX, centerY) {
    // Pointer weggehaald - geen zwart pinnetje meer
}

function drawWinningEntry(ctx, centerX, centerY, winningEntry, progress) {
    // Overshoot animatie (elastic ease-out)
    const elasticEaseOut = (t) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        const c4 = (2 * Math.PI) / 3;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    };
    
    // Animatie effecten - veel sneller
    const fadeIn = Math.min(progress * 8, 1); // Zeer snelle fade in
    const overshootScale = elasticEaseOut(Math.min(progress * 3, 1)); // Snellere overshoot scale
    
    if (fadeIn <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = fadeIn;
    
    // Bereken posities - vaste positie zonder slide up
    const animatedY = centerY + 100; // Vaste positie
    
    // Oranje achtergrond met overshoot scale
    const bgWidth = 700 * overshootScale;
    const bgHeight = 220 * overshootScale;
    const bgX = centerX - bgWidth / 2;
    const bgY = animatedY - bgHeight / 2;
    
    // Oranje achtergrond
    ctx.fillStyle = '#FF6B35'; // Oranje kleur
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
    
    // Witte stroke
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
    
    // Probeer custom font te gebruiken, fallback naar Arial
    const customFont = 'Montserrat'; // Pas aan naar je font naam
    const fallbackFont = 'Arial, sans-serif';
    
    // Nummer (groot) met overshoot
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(80 * overshootScale)}px ${customFont}, ${fallbackFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Text shadow voor nummer
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillText(`#${winningEntry.nummer}`, centerX, animatedY - 50);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Artiest
    ctx.font = `bold ${Math.floor(42 * overshootScale)}px ${customFont}, ${fallbackFont}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(winningEntry.artiest, centerX, animatedY + 10);
    
    // Titel
    ctx.font = `${Math.floor(32 * overshootScale)}px ${customFont}, ${fallbackFont}`;
    ctx.fillStyle = '#f0f0f0';
    ctx.fillText(winningEntry.titel, centerX, animatedY + 55);
    
    ctx.restore();
}

// Video status check endpoint
app.get('/api/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const videoPath = path.join(__dirname, 'videos', `wheel_${sessionId}.mp4`);
    
    if (fs.existsSync(videoPath)) {
        const stats = fs.statSync(videoPath);
        res.json({
            ready: true,
            size: stats.size
        });
    } else {
        res.json({
            ready: false
        });
    }
});

app.get('/api/download/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const videoPath = path.join(__dirname, 'videos', `wheel_${sessionId}.mp4`);
    
    console.log(`Download aangevraagd voor sessie: ${sessionId}`);
    console.log(`Video pad: ${videoPath}`);
    console.log(`Video bestaat: ${fs.existsSync(videoPath)}`);
    
    if (fs.existsSync(videoPath)) {
        const stats = fs.statSync(videoPath);
        console.log(`Video bestand grootte: ${stats.size} bytes`);
        
        // Set proper headers for file download
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="grunneger_1000_rad_${sessionId}.mp4"`);
        res.setHeader('Content-Length', stats.size);
        
        // Stream the file
        const fileStream = fs.createReadStream(videoPath);
        fileStream.pipe(res);
        
        fileStream.on('error', (err) => {
            console.error('File stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Fout bij downloaden video' });
            }
        });
        
        fileStream.on('end', () => {
            console.log(`Video download voltooid voor sessie ${sessionId}`);
        });
    } else {
        console.log(`Video niet gevonden voor sessie ${sessionId}`);
        res.status(404).json({ 
            error: 'Video nog niet klaar of niet gevonden' 
        });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server draait op http://localhost:${PORT}`);
});
