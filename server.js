const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Voeg headers toe voor Cross-Origin Isolation
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

app.use(express.static(path.join(__dirname, '.'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.wasm')) {
            res.set('Content-Type', 'application/wasm');
        }
    }
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const server = app.listen(port, () => {
    console.log(`Server draait op http://localhost:${port}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Poort ${port} is al in gebruik. Sluit de bestaande server of gebruik een andere poort.`);
        process.exit(1);
    } else {
        console.error('Er is een fout opgetreden bij het starten van de server:', err);
    }
});

process.on('SIGINT', () => {
    console.log('Server wordt afgesloten...');
    server.close(() => {
        console.log('Server is afgesloten.');
        process.exit(0);
    });
});
