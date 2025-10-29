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

        const fps = 30;
        const videoDuration = 16; // Vaste duur van 16 seconden voor geluid sync
        const totalFrames = Math.floor(videoDuration * fps);
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

            // Calculate rotation with easing over 16 seconds
            const progress = frame / totalFrames;
            const easeOut = 1 - Math.pow(1 - progress, 3); // Smooth deceleration
            
            // Start with multiple rotations and end at winning position
            // Snelheid bepaalt aantal rotaties: 1=4 rotaties, 5=12 rotaties
            const initialSpins = 2 + (spinSpeed * 2); 
            const totalRotation = (Math.PI * 2 * initialSpins) + winningAngle;
            const currentRotation = totalRotation * easeOut;

            // Draw spinning wheel
            drawSpinningWheel(ctx, canvas.width / 2, canvas.height / 2, wheelImage, currentRotation);

            // Draw pointer/indicator
            drawPointer(ctx, canvas.width / 2, canvas.height / 2);

            // Draw title
            drawTitle(ctx, canvas.width / 2);

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
    // Draw pointer/indicator at the top
    const pointerSize = 40;
    
    ctx.fillStyle = '#333333';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 400 - pointerSize);
    ctx.lineTo(centerX - pointerSize/2, centerY - 400);
    ctx.lineTo(centerX + pointerSize/2, centerY - 400);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawTitle(ctx, centerX) {
    // Draw title at the top
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.font = 'bold 64px Arial';
    ctx.textAlign = 'center';
    
    // Draw text with outline
    ctx.strokeText('Grunneger 1000 Rad', centerX, 120);
    ctx.fillText('Grunneger 1000 Rad', centerX, 120);
}

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
