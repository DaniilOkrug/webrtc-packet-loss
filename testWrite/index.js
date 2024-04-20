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
    .videoBitrate('2983k', true)
    .videoCodec('libx264')
    .outputOptions('-preset ultrafast')
    .outputOptions('-tune zerolatency')
    .outputOptions('-pix_fmt yuv420p')
    .outputOptions('-r 30')
    .outputOptions('-s 1280x720')
    .outputFormat('mpegts')
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
    const packets = splitBufferIntoChunks(frame, 15000)
    receivedFrames.push(...packets);
});

function splitBufferIntoChunks(data, maxPacketSize) {
    const packets = [];
    let offset = 0;

    while (offset < Buffer.byteLength(data)) {
        const remaining = Buffer.byteLength(data) - offset;
        const packetSize = Math.min(maxPacketSize, remaining);
        const packetData = data.slice(offset, offset + packetSize);
        packets.push(packetData);
        offset += packetSize;
    }

    return packets;
}

function processFrames() {
    const temp = [];
    for (const frame of receivedFrames) {
        if (Math.random() < 0.05) continue;
        temp.push(frame);
    }

    const outputStream = fs.createWriteStream('./received_video.flv');
    const framesStream = new FramesStream(temp);

    ffmpeg(framesStream)
        .preset('flashvideo')
        .outputOptions('-s 1280x720')
        .outputOptions('-preset medium')
        .outputOptions('-crf 28')
        .output(outputStream)
        .on('end', () => {
            console.log('Video file created successfully');
        })
        .on('error', (err, stdout, stderr) => {
            console.error('Error:', err.message);
            console.error('ffmpeg stdout:', stdout);
            console.error('ffmpeg stderr:', stderr);
        })
        .run();
}

