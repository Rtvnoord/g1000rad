const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const WheelGenerator = require('./src/wheel-generator');
const VideoGenerator = require('./src/video-generator');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Zorg ervoor dat output directory bestaat
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint voor het genereren van een rad video
app.post('/api/generate-wheel', async (req, res) => {
    try {
        const { selectedNumber, isRandom, spinDuration = 3000 } = req.body;
        const sessionId = uuidv4();
        
        console.log(`Nieuwe rad generatie gestart - Session: ${sessionId}`);
        
        // Laad G1000 data
        const g1000Data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'g1000.json'), 'utf8'));
        
        // Bepaal het winnende nummer
        let winningEntry;
        if (isRandom) {
            const randomIndex = Math.floor(Math.random() * g1000Data.length);
            winningEntry = g1000Data[randomIndex];
        } else {
            winningEntry = g1000Data.find(entry => entry.position === parseInt(selectedNumber));
            if (!winningEntry) {
                return res.status(400).json({ error: 'Nummer niet gevonden in G1000 lijst' });
            }
        }
        
        console.log(`Winnend nummer: ${winningEntry.position} - ${winningEntry.artist} - ${winningEntry.title}`);
        
        // Genereer rad frames
        const wheelGenerator = new WheelGenerator(g1000Data);
        const frames = await wheelGenerator.generateSpinFrames(winningEntry.position, spinDuration);
        
        // Genereer video
        const videoGenerator = new VideoGenerator();
        const videoPath = await videoGenerator.createVideo(frames, winningEntry, sessionId);
        
        res.json({
            success: true,
            sessionId,
            winningEntry,
            videoUrl: `/download/${sessionId}`,
            downloadUrl: `/api/download/${sessionId}`
        });
        
    } catch (error) {
        console.error('Fout bij genereren rad:', error);
        res.status(500).json({ error: 'Er is een fout opgetreden bij het genereren van het rad' });
    }
});

// Download endpoint
app.get('/api/download/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const videoPath = path.join(outputDir, `wheel_${sessionId}.mp4`);
    
    if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ error: 'Video niet gevonden' });
    }
    
    res.download(videoPath, `grunneger1000_rad_${sessionId}.mp4`, (err) => {
        if (err) {
            console.error('Download fout:', err);
        }
        // Optioneel: verwijder bestand na download
        // fs.unlinkSync(videoPath);
    });
});

// G1000 data endpoint
app.get('/api/g1000-data', (req, res) => {
    try {
        const g1000Data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'g1000.json'), 'utf8'));
        res.json(g1000Data);
    } catch (error) {
        console.error('Fout bij laden G1000 data:', error);
        res.status(500).json({ error: 'Kon G1000 data niet laden' });
    }
});

const server = app.listen(port, () => {
    console.log(`🎡 Grunneger 1000 Rad Generator draait op http://localhost:${port}`);
    console.log(`📁 Output directory: ${outputDir}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Poort ${port} is al in gebruik. Sluit de bestaande server of gebruik een andere poort.`);
        process.exit(1);
    } else {
        console.error('❌ Er is een fout opgetreden bij het starten van de server:', err);
    }
});

process.on('SIGINT', () => {
    console.log('\n🛑 Server wordt afgesloten...');
    server.close(() => {
        console.log('✅ Server is afgesloten.');
        process.exit(0);
    });
});
