const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

class VideoGenerator {
    constructor() {
        this.outputDir = path.join(__dirname, '..', 'output');
        this.tempDir = path.join(__dirname, '..', 'temp');
        
        // Zorg ervoor dat directories bestaan
        [this.outputDir, this.tempDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async createVideo(frames, winningEntry, sessionId) {
        const tempFramesDir = path.join(this.tempDir, `frames_${sessionId}`);
        const outputPath = path.join(this.outputDir, `wheel_${sessionId}.mp4`);

        try {
            // Maak temp directory voor frames
            if (!fs.existsSync(tempFramesDir)) {
                fs.mkdirSync(tempFramesDir, { recursive: true });
            }

            console.log(`Opslaan van ${frames.length} frames naar ${tempFramesDir}`);

            // Sla frames op als PNG bestanden
            for (let i = 0; i < frames.length; i++) {
                const framePath = path.join(tempFramesDir, `frame_${i.toString().padStart(4, '0')}.png`);
                fs.writeFileSync(framePath, frames[i]);
            }

            console.log('Frames opgeslagen, starten video generatie...');

            // Genereer video met FFmpeg
            await this.generateVideoFromFrames(tempFramesDir, outputPath, winningEntry);

            // Cleanup temp files
            this.cleanupTempFiles(tempFramesDir);

            console.log(`Video succesvol gegenereerd: ${outputPath}`);
            return outputPath;

        } catch (error) {
            console.error('Fout bij video generatie:', error);
            // Cleanup bij fout
            this.cleanupTempFiles(tempFramesDir);
            throw error;
        }
    }

    generateVideoFromFrames(framesDir, outputPath, winningEntry) {
        return new Promise((resolve, reject) => {
            const inputPattern = path.join(framesDir, 'frame_%04d.png');

            ffmpeg()
                .input(inputPattern)
                .inputFPS(30)
                .videoCodec('libx264')
                .outputOptions([
                    '-pix_fmt yuv420p',
                    '-crf 23',
                    '-preset medium'
                ])
                .output(outputPath)
                .on('start', (commandLine) => {
                    console.log('FFmpeg gestart:', commandLine);
                })
                .on('progress', (progress) => {
                    if (progress.percent) {
                        console.log(`Video progress: ${Math.round(progress.percent)}%`);
                    }
                })
                .on('end', () => {
                    console.log('Video generatie voltooid');
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error('FFmpeg fout:', err);
                    reject(err);
                })
                .run();
        });
    }

    cleanupTempFiles(tempDir) {
        try {
            if (fs.existsSync(tempDir)) {
                const files = fs.readdirSync(tempDir);
                files.forEach(file => {
                    fs.unlinkSync(path.join(tempDir, file));
                });
                fs.rmdirSync(tempDir);
                console.log(`Temp directory opgeruimd: ${tempDir}`);
            }
        } catch (error) {
            console.error('Fout bij opruimen temp files:', error);
        }
    }
}

module.exports = VideoGenerator;
