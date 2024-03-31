const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");

const { Readable } = require('stream');

class FramesStream extends Readable {
    constructor(frames, options) {
        super(options);
        this.frames = frames;
        this.currentIndex = 0;
    }

    _read() {
        if (this.currentIndex >= this.frames.length) {
            this.push(null);
        } else {
            this.push(this.frames[this.currentIndex]);
            this.currentIndex++;
        }
    }
}

const receivedFrames = [];

const videoStream = ffmpeg('./test.mp4')
    .videoBitrate(100000)
    .videoCodec('libx264')
    .outputOptions('-preset ultrafast')
    .outputOptions('-tune zerolatency')
    .outputOptions('-pix_fmt yuv420p')
    .outputOptions('-r 30')
    .outputOptions('-s 540x380')
    .outputFormat('mpegts')
    .on('error', (err, stdout, stderr) => {
        console.log('Error:', err.message);
        console.log('ffmpeg stdout:', stdout);
        console.log('ffmpeg stderr:', stderr);
    })
    .on('end', function () {
        console.log('Finished processing');
        processFrames();
    }).pipe();

videoStream.on('data', (frame) => {
    receivedFrames.push(frame);
});

function processFrames() {
    const outputFilePath = './received_video.mp4';

    const inputOptions = {
        fps: 30, 
        videoSize: '640x480', 
        videoCodec: 'libx264',
        format: 'mpegts', 
    };

    const outputStream = fs.createWriteStream(outputFilePath);
    const framesStream = new FramesStream(receivedFrames);
    const ffmpegProcess = ffmpeg(framesStream);

    // receivedFrames.forEach(frame => {
    //     ffmpegProcess.input(frame);
    // });

    ffmpegProcess
        .inputOptions(inputOptions)
        .outputOptions('-preset ultrafast')
        .output(outputStream)
        .on('end', () => {
            console.log('Video file created successfully');
            server.close();
        })
        .on('error', (err, stdout, stderr) => {
            console.error('Error:', err.message);
            console.error('ffmpeg stdout:', stdout);
            console.error('ffmpeg stderr:', stderr);
        })
        .run();
}