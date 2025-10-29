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
        const { selectedNumber, isRandom, spinDuration } = req.body;
        
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
        console.log(`Draai duur: ${spinDuration}ms`);
        
        // Start video generation in background
        generateWheelVideo(sessionId, winningEntry, spinDuration, g1000Data)
            .catch(error => {
                console.error('Fout bij video generatie:', error);
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
async function generateWheelVideo(sessionId, winningEntry, spinDuration, allEntries) {
    const outputPath = path.join(__dirname, 'videos', `wheel_${sessionId}.mp4`);
    const framesDir = path.join(__dirname, 'temp', sessionId);
    
    // Create directories
    if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir, { recursive: true });
    }

    try {
        // Load background image if it exists
        let backgroundImage = null;
        const backgroundPath = path.join(__dirname, 'assets', 'background.jpg');
        if (fs.existsSync(backgroundPath)) {
            backgroundImage = await loadImage(backgroundPath);
        }

        const fps = 30;
        const totalFrames = Math.floor((spinDuration / 1000) * fps);
        const canvas = createCanvas(1920, 1080);
        const ctx = canvas.getContext('2d');

        // Generate frames
        for (let frame = 0; frame < totalFrames; frame++) {
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

            // Calculate rotation
            const progress = frame / totalFrames;
            const easeOut = 1 - Math.pow(1 - progress, 3); // Easing function
            const totalRotation = (Math.PI * 2 * 5) + (Math.PI * 2 * (winningEntry.nummer / 1000)); // 5 full rotations + position
            const currentRotation = totalRotation * easeOut;

            // Draw wheel
            drawWheel(ctx, canvas.width / 2, canvas.height / 2, 400, currentRotation, allEntries, winningEntry);

            // Save frame
            const buffer = canvas.toBuffer('image/png');
            const framePath = path.join(framesDir, `frame_${frame.toString().padStart(6, '0')}.png`);
            fs.writeFileSync(framePath, buffer);
        }

        // Create video from frames using ffmpeg
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(path.join(framesDir, 'frame_%06d.png'))
                .inputFPS(fps)
                .videoCodec('libx264')
                .outputOptions([
                    '-pix_fmt yuv420p',
                    '-crf 23'
                ])
                .output(outputPath)
                .on('end', () => {
                    console.log(`Video gegenereerd: ${outputPath}`);
                    // Clean up temp frames
                    fs.rmSync(framesDir, { recursive: true, force: true });
                    resolve();
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .run();
        });

    } catch (error) {
        console.error('Fout bij video generatie:', error);
        // Clean up on error
        if (fs.existsSync(framesDir)) {
            fs.rmSync(framesDir, { recursive: true, force: true });
        }
        throw error;
    }
}

function drawWheel(ctx, centerX, centerY, radius, rotation, allEntries, winningEntry) {
    const segmentCount = Math.min(allEntries.length, 100); // Limit segments for performance
    const segmentAngle = (Math.PI * 2) / segmentCount;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // Draw wheel segments
    for (let i = 0; i < segmentCount; i++) {
        const startAngle = i * segmentAngle;
        const endAngle = (i + 1) * segmentAngle;
        const entry = allEntries[Math.floor((i / segmentCount) * allEntries.length)];
        
        // Alternate colors
        ctx.fillStyle = i % 2 === 0 ? '#ff6b6b' : '#4ecdc4';
        
        // Draw segment
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text if segment is large enough
        if (segmentCount <= 50) {
            ctx.save();
            ctx.rotate(startAngle + segmentAngle / 2);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`#${entry.nummer}`, radius * 0.3, 5);
            ctx.restore();
        }
    }

    ctx.restore();

    // Draw pointer
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.moveTo(centerX + radius + 20, centerY);
    ctx.lineTo(centerX + radius - 20, centerY - 20);
    ctx.lineTo(centerX + radius - 20, centerY + 20);
    ctx.closePath();
    ctx.fill();

    // Draw center circle
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fill();

    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Grunneger 1000 Rad', centerX, 100);
}

app.get('/api/download/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const videoPath = path.join(__dirname, 'videos', `wheel_${sessionId}.mp4`);
    
    console.log(`Download aangevraagd voor sessie: ${sessionId}`);
    
    if (fs.existsSync(videoPath)) {
        res.download(videoPath, `grunneger_1000_rad_${sessionId}.mp4`, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).json({ error: 'Fout bij downloaden video' });
            }
        });
    } else {
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
