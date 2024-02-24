const ffmpeg = require('fluent-ffmpeg');
const dgram = require("dgram");

const server = dgram.createSocket("udp4");

const PORT = 41234;

const videoStream = ffmpeg('./test.mp4')
    .videoBitrate(1000)
    .videoCodec('libx264')
    .outputOptions('-preset ultrafast')
    .outputOptions('-tune zerolatency')
    .outputOptions('-pix_fmt yuv420p')
    .outputOptions('-r 30')
    .outputFormat('mpegts')
    .on('error', (err, stdout, stderr) => {
        console.log('Error:', err.message);
        console.log('ffmpeg stdout:', stdout);
        console.log('ffmpeg stderr:', stderr);
    }).pipe();

videoStream.on('data', (frame) => {
    console.log(frame);
    server.send(frame, PORT, "localhost", (err) => {
        if (err) {
            console.error(err);
            server.close();
        }
    });
});