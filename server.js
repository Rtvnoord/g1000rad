const express = require('express');
const path = require('path');
const fs = require('fs');
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
        
        // TODO: Hier zou de video generatie komen met rad.ai en background.jpg
        // Voor nu simuleren we dat het werkt
        console.log(`Genereer rad video voor nummer ${winningEntry.nummer}: ${winningEntry.artiest} - ${winningEntry.titel}`);
        console.log(`Draai duur: ${spinDuration}ms`);
        
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

app.get('/api/download/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    
    // TODO: Hier zou de gegenereerde video gedownload worden
    // Voor nu sturen we een placeholder response
    console.log(`Download aangevraagd voor sessie: ${sessionId}`);
    
    res.status(404).json({ 
        error: 'Video nog niet geïmplementeerd' 
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server draait op http://localhost:${PORT}`);
});
