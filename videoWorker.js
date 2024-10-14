function renderWheel(ctx, width, height, rotation, targetNumber, showNumber = false, numberScale = 1) {
    const wheelSize = 800;
    const numberSize = 300;
    const wheelOffsetY = -50;

    ctx.drawImage(self.background, 0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2 + wheelOffsetY);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.drawImage(self.wheelImage, -wheelSize/2, -wheelSize/2, wheelSize, wheelSize);
    ctx.restore();

    if (showNumber) {
        const numberBoxSize = numberSize * numberScale;
        const yOffset = -wheelSize / 4; // Verplaats het nummer naar boven
        
        ctx.fillStyle = '#ee7204';
        ctx.fillRect((width - numberBoxSize) / 2, (height - numberBoxSize) / 2 + yOffset, numberBoxSize, numberBoxSize);
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 5 * numberScale;
        ctx.strokeRect((width - numberBoxSize) / 2, (height - numberBoxSize) / 2 + yOffset, numberBoxSize, numberBoxSize);
        
        ctx.fillStyle = 'white';
        ctx.font = `bold ${150 * numberScale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(targetNumber, width / 2, height / 2 + yOffset);
    }
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeOutElastic(t) {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}

self.onmessage = async function(e) {
    const { targetNumber, frameCount, spinDuration, width, height, background, wheelImage } = e.data;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    self.background = await createImageBitmap(await fetch(background).then(r => r.blob()));
    self.wheelImage = await createImageBitmap(await fetch(wheelImage).then(r => r.blob()));

    const extraSpins = Math.floor(Math.random() * 5 + 5) * 360;
    const targetDegrees = targetNumber * (360 / 1000);
    const totalDegrees = targetDegrees + extraSpins;

    const frames = [];

    for (let i = 0; i < frameCount; i++) {
        const progress = Math.min(i / spinDuration, 1);
        const easeProgress = easeOutCubic(progress);
        const rotation = easeProgress * totalDegrees;
        
        const showNumber = i >= spinDuration;
        const numberScale = showNumber ? easeOutElastic(Math.min((i - spinDuration) / 25, 1)) : 0;

        renderWheel(ctx, width, height, rotation, targetNumber, showNumber, numberScale);

        const frameBlob = await canvas.convertToBlob();
        const frameArrayBuffer = await frameBlob.arrayBuffer();
        frames.push(new Uint8Array(frameArrayBuffer));

        const frameProgress = Math.round((i / frameCount) * 80);
        self.postMessage({ type: 'progress', progress: frameProgress, stage: 'frames' });
    }

    self.postMessage({ type: 'complete', frames });
};
