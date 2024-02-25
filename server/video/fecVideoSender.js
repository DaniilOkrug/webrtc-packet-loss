const ffmpeg = require('fluent-ffmpeg');
const dgram = require("dgram");
const { PacketsManager } = require('./PacketsManager');

const server = dgram.createSocket("udp4");
const packetManager = new PacketsManager();

const PORT = 41234;

const videoStream = ffmpeg('./test.mp4')
    .videoBitrate(500)
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
    })
    .on('end', function() {
        console.log('Finished processing');

        server.close();
    }).pipe();

videoStream.on('data', (frame) => {
    const packet = packetManager.toPacket(frame);
    
    server.send(packet, PORT, "localhost", (err) => {
        if (err) {
            console.error(err);
            server.close();
        }
    });
});
