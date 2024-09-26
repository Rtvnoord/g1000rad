const express = require('express');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '.')));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/generate-video', async (req, res) => {
    const { targetNumber } = req.body;
    
    try {
        const videoPath = await generateVideo(targetNumber);
        res.json({ videoPath });
    } catch (error) {
        console.error('Error generating video:', error);
        res.status(500).json({ error: 'Failed to generate video' });
    }
});

app.get('/download-video/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'videos', filename);
    res.download(filePath, (err) => {
        if (err) {
            res.status(500).send('Error downloading file');
        }
        // Delete the file after download
        fs.unlinkSync(filePath);
    });
});

async function generateVideo(targetNumber) {
    const canvas = createCanvas(1920, 1080);
    const ctx = canvas.getContext('2d');
    
    // Load images
    const background = await loadImage('background.jpg');
    const wheel = await loadImage('wheel.png');
    
    // Generate frames
    const framesDir = path.join(__dirname, 'frames');
    if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir);
    }
    
    const frameCount = 120; // 4 seconds at 30 fps
    for (let i = 0; i < frameCount; i++) {
        ctx.drawImage(background, 0, 0, 1920, 1080);
        
        // Calculate wheel rotation
        const progress = i / frameCount;
        const rotation = progress * 360 * 5 + targetNumber * (360 / 1000);
        
        ctx.save();
        ctx.translate(960, 540);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.drawImage(wheel, -150, -150, 300, 300);
        ctx.restore();
        
        // Save frame
        const framePath = path.join(framesDir, `frame_${i.toString().padStart(4, '0')}.png`);
        fs.writeFileSync(framePath, canvas.toBuffer());
    }
    
    // Generate video from frames
    const videoDir = path.join(__dirname, 'videos');
    if (!fs.existsSync(videoDir)) {
        fs.mkdirSync(videoDir);
    }
    
    const videoFilename = `wheel_spin_${Date.now()}.mp4`;
    const videoPath = path.join(videoDir, videoFilename);
    
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(path.join(framesDir, 'frame_%04d.png'))
            .inputFPS(30)
            .output(videoPath)
            .videoCodec('libx264')
            .outputOptions('-pix_fmt yuv420p')
            .on('end', () => {
                // Clean up frames
                fs.readdirSync(framesDir).forEach(file => fs.unlinkSync(path.join(framesDir, file)));
                fs.rmdirSync(framesDir);
                resolve(videoFilename);
            })
            .on('error', (err) => reject(err))
            .run();
    });
}

app.listen(port, () => {
    console.log(`Server draait op http://localhost:${port}`);
});
