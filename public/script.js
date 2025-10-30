document.addEventListener('DOMContentLoaded', function() {
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const manualNumberInput = document.getElementById('manualNumber');
    const generateBtn = document.getElementById('generateBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultArea = document.getElementById('resultArea');
    const videoPathDisplay = document.getElementById('videoPathDisplay');
    const copyPathBtn = document.getElementById('copyPathBtn');
    const openFolderBtn = document.getElementById('openFolderBtn');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    let currentSessionId = null;
    let currentVideoPath = null;
    let g1000Data = [];

    // Mode switching
    modeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const isManual = this.value === 'manual';
            manualNumberInput.disabled = !isManual;
            searchInput.disabled = !isManual;
            if (!isManual) {
                manualNumberInput.value = '';
                searchInput.value = '';
                searchResults.classList.add('hidden');
            }
        });
    });

    // Search functionality
    searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();

        if (query.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }

        // Filter G1000 data
        const filtered = g1000Data.filter(entry => {
            return entry.artiest.toLowerCase().includes(query) ||
                   entry.titel.toLowerCase().includes(query);
        }).slice(0, 10); // Limit to 10 results

        if (filtered.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item no-results">Geen resultaten gevonden</div>';
            searchResults.classList.remove('hidden');
            return;
        }

        // Display results
        searchResults.innerHTML = filtered.map(entry => `
            <div class="search-result-item" data-nummer="${entry.nummer}">
                <div class="result-position">#${entry.nummer}</div>
                <div class="result-info">
                    <div class="result-artist">${entry.artiest}</div>
                    <div class="result-title">${entry.titel}</div>
                </div>
            </div>
        `).join('');

        searchResults.classList.remove('hidden');

        // Add click handlers
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function() {
                const nummer = this.dataset.nummer;
                if (nummer) {
                    manualNumberInput.value = nummer;
                    searchInput.value = '';
                    searchResults.classList.add('hidden');
                }
            });
        });
    });

    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });

    // Generate button
    generateBtn.addEventListener('click', async function() {
        const selectedMode = document.querySelector('input[name="mode"]:checked').value;
        const manualNumber = manualNumberInput.value;
        const spinSpeed = 3; // Vaste snelheid (normaal)

        // Validation
        if (selectedMode === 'manual' && (!manualNumber || manualNumber < 1 || manualNumber > 1000)) {
            alert('Voer een geldig nummer in tussen 1 en 1000');
            return;
        }

        // Show loading
        showLoading();

        try {
            const response = await fetch('/api/generate-wheel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    selectedNumber: selectedMode === 'manual' ? parseInt(manualNumber) : null,
                    isRandom: selectedMode === 'random',
                    spinSpeed: spinSpeed
                })
            });

            const result = await response.json();

            if (result.success) {
                currentSessionId = result.sessionId;
                showResult(result.winningEntry);
            } else {
                throw new Error(result.error || 'Onbekende fout');
            }

        } catch (error) {
            console.error('Error generating wheel:', error);
            alert('Er is een fout opgetreden: ' + error.message);
            hideLoading();
        }
    });

    // Copy path button
    copyPathBtn.addEventListener('click', async function() {
        if (currentVideoPath) {
            try {
                await navigator.clipboard.writeText(currentVideoPath);
                copyPathBtn.innerHTML = '✅ Gekopieerd!';
                setTimeout(() => {
                    copyPathBtn.innerHTML = '📋 Kopieer pad';
                }, 2000);
            } catch (error) {
                console.error('Copy error:', error);
                copyPathBtn.innerHTML = '❌ Kopiëren mislukt';
                setTimeout(() => {
                    copyPathBtn.innerHTML = '📋 Kopieer pad';
                }, 2000);
            }
        }
    });

    // Open folder button
    openFolderBtn.addEventListener('click', async function() {
        if (currentVideoPath) {
            try {
                const response = await fetch('/api/open-folder', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ path: currentVideoPath })
                });

                const result = await response.json();

                if (result.success) {
                    openFolderBtn.innerHTML = '✅ Map geopend!';
                    setTimeout(() => {
                        openFolderBtn.innerHTML = '📂 Open map';
                    }, 2000);
                } else {
                    throw new Error(result.error || 'Map openen mislukt');
                }
            } catch (error) {
                console.error('Open folder error:', error);
                openFolderBtn.innerHTML = '❌ Fout bij openen';
                setTimeout(() => {
                    openFolderBtn.innerHTML = '📂 Open map';
                }, 2000);
                alert('Fout bij openen van de map: ' + error.message);
            }
        }
    });

    function showLoading() {
        generateBtn.disabled = true;
        loadingIndicator.classList.remove('hidden');
        resultArea.classList.add('hidden');
    }

    function hideLoading() {
        generateBtn.disabled = false;
        loadingIndicator.classList.add('hidden');
    }

    function showResult(winningEntry) {
        // Houd loading indicator zichtbaar tijdens video generatie
        // Pas tekst aan om duidelijk te maken dat video wordt gemaakt
        const loadingText = loadingIndicator.querySelector('p');
        loadingText.textContent = `Video wordt gegenereerd voor ${winningEntry.artist} - ${winningEntry.title}...`;

        document.getElementById('winningPosition').textContent = winningEntry.position;
        document.getElementById('winningArtist').textContent = winningEntry.artist;
        document.getElementById('winningTitle').textContent = winningEntry.title;

        // Toon resultaat maar verberg video path sectie
        resultArea.classList.remove('hidden');
        document.querySelector('.video-path-section').style.display = 'none';

        // Start polling voor video status
        checkVideoStatus();
    }

    async function checkVideoStatus() {
        const maxAttempts = 120; // 2 minuten maximum wachten
        const startTime = Date.now();

        // Get loading elements
        const loadingText = loadingIndicator.querySelector('p');
        const progressBar = loadingIndicator.querySelector('.progress-fill');

        console.log('Start progress tracking voor sessie:', currentSessionId);
        console.log('Progress bar element:', progressBar);

        const checkInterval = setInterval(async () => {
            try {
                // Check progress
                const progressResponse = await fetch(`/api/progress/${currentSessionId}`);
                const progressData = await progressResponse.json();

                console.log('Progress data ontvangen:', progressData);

                // Check if video is ready
                const statusResponse = await fetch(`/api/status/${currentSessionId}`);
                const statusData = await statusResponse.json();

                // Update progress bar
                if (progressBar) {
                    progressBar.style.setProperty('width', `${progressData.progress}%`, 'important');
                    console.log(`Progress bar width gezet naar: ${progressData.progress}%`);
                }

                // Update loading text
                loadingText.innerHTML = `${progressData.message} (${progressData.progress}%)`;

                if (statusData.ready) {
                    clearInterval(checkInterval);
                    if (progressBar) {
                        progressBar.style.setProperty('width', '100%', 'important');
                    }
                    loadingText.innerHTML = '✅ Video is klaar!';
                    console.log('Video is klaar!');
                    console.log('Video pad:', statusData.path);

                    // Sla video pad op
                    currentVideoPath = statusData.path;

                    // Verberg loading indicator en toon video pad
                    setTimeout(() => {
                        hideLoading();
                        document.querySelector('.video-path-section').style.display = 'block';
                        if (videoPathDisplay && statusData.path) {
                            videoPathDisplay.textContent = statusData.path;
                        }
                    }, 1000);
                }

                // Timeout check
                const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
                if (elapsedTime >= maxAttempts) {
                    clearInterval(checkInterval);
                    loadingText.innerHTML = '❌ Video generatie duurt te lang';
                    setTimeout(() => {
                        hideLoading();
                    }, 2000);
                }
            } catch (error) {
                console.error('Status check error:', error);
                clearInterval(checkInterval);
                loadingText.innerHTML = '❌ Fout bij controleren video status';
                setTimeout(() => {
                    hideLoading();
                }, 2000);
            }
        }, 500); // Check elke halve seconde voor responsievere updates
    }

    // Load G1000 data on page load
    fetch('/api/g1000-data')
        .then(response => response.json())
        .then(data => {
            g1000Data = data;
            console.log(`G1000 data geladen: ${data.length} nummers`);
        })
        .catch(error => {
            console.error('Kon G1000 data niet laden:', error);
        });
});
