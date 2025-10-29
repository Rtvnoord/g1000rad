document.addEventListener('DOMContentLoaded', function() {
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const manualNumberInput = document.getElementById('manualNumber');
    const spinDurationSlider = document.getElementById('spinDuration');
    const durationValueSpan = document.getElementById('durationValue');
    const generateBtn = document.getElementById('generateBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultArea = document.getElementById('resultArea');
    const downloadBtn = document.getElementById('downloadBtn');

    let currentSessionId = null;

    // Mode switching
    modeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            manualNumberInput.disabled = this.value === 'random';
            if (this.value === 'random') {
                manualNumberInput.value = '';
            }
        });
    });

    // Duration slider
    spinDurationSlider.addEventListener('input', function() {
        const speedLabels = ['', 'Langzaam', 'Rustig', 'Normaal', 'Snel', 'Zeer snel'];
        durationValueSpan.textContent = speedLabels[parseInt(this.value)];
    });

    // Generate button
    generateBtn.addEventListener('click', async function() {
        const selectedMode = document.querySelector('input[name="mode"]:checked').value;
        const manualNumber = manualNumberInput.value;
        const spinSpeed = parseInt(spinDurationSlider.value); // 1-5 speed setting

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

    // Download button - simplified since video is already ready
    downloadBtn.addEventListener('click', async function() {
        if (currentSessionId) {
            try {
                // Disable button and show loading state
                downloadBtn.disabled = true;
                downloadBtn.innerHTML = '⏳ Video wordt gedownload...';
                
                const response = await fetch(`/api/download/${currentSessionId}`);
                
                if (response.ok) {
                    // Create blob and download
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `grunneger_1000_rad_${currentSessionId}.mp4`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    // Success feedback
                    downloadBtn.innerHTML = '✅ Video gedownload!';
                    setTimeout(() => {
                        downloadBtn.innerHTML = '📥 Download Video';
                        downloadBtn.disabled = false;
                    }, 3000);
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'Download mislukt');
                }
            } catch (error) {
                console.error('Download error:', error);
                downloadBtn.innerHTML = '❌ Download mislukt';
                setTimeout(() => {
                    downloadBtn.innerHTML = '📥 Download Video';
                    downloadBtn.disabled = false;
                }, 3000);
                alert('Er is een fout opgetreden bij het downloaden: ' + error.message);
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
        hideLoading();
        
        document.getElementById('winningPosition').textContent = winningEntry.position;
        document.getElementById('winningArtist').textContent = winningEntry.artist;
        document.getElementById('winningTitle').textContent = winningEntry.title;
        
        // Toon resultaat maar verberg download sectie
        resultArea.classList.remove('hidden');
        document.querySelector('.download-section').style.display = 'none';
        
        // Start polling voor video status
        checkVideoStatus();
    }

    async function checkVideoStatus() {
        const statusElement = document.querySelector('.video-status');
        statusElement.style.display = 'block';
        statusElement.innerHTML = '🎬 Video wordt gegenereerd...';
        
        let attempts = 0;
        const maxAttempts = 120; // 2 minuten maximum wachten
        
        const checkInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/status/${currentSessionId}`);
                const status = await response.json();
                
                attempts++;
                
                if (status.ready) {
                    clearInterval(checkInterval);
                    statusElement.innerHTML = '✅ Video is klaar!';
                    setTimeout(() => {
                        statusElement.style.display = 'none';
                        document.querySelector('.download-section').style.display = 'block';
                    }, 1000);
                } else {
                    statusElement.innerHTML = `🎬 Video wordt gegenereerd... (${attempts}s)`;
                }
                
                if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    statusElement.innerHTML = '❌ Video generatie duurt te lang';
                }
            } catch (error) {
                console.error('Status check error:', error);
                clearInterval(checkInterval);
                statusElement.innerHTML = '❌ Fout bij controleren video status';
            }
        }, 1000);
    }

    // Load G1000 data on page load to verify connection
    fetch('/api/g1000-data')
        .then(response => response.json())
        .then(data => {
            console.log(`G1000 data geladen: ${data.length} nummers`);
        })
        .catch(error => {
            console.error('Kon G1000 data niet laden:', error);
        });
});
