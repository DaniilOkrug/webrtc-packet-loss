const ffmpeg = require('fluent-ffmpeg');
const dgram = require("dgram");
const { PacketsManager } = require('./PacketsManager');
const { FecSenderManager } = require('./FecSenderManager');

const server = dgram.createSocket("udp6");
const packetManager = new PacketsManager();
const fecManager = new FecSenderManager();

const packetsQueue = [];
let packetsAmount = 0;

const PORT = 41234;

const videoStream = ffmpeg('./test.mp4')
    .videoBitrate(1)
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
        packetsAmount = packetsQueue.length;
        processFrames();
    }).pipe();

videoStream.on('data', (frame) => {
    const packet = packetManager.toPacket(frame);
    const fecPacket = fecManager.transform(packet);

    packetsQueue.push(packet);

    if (fecManager.packetCounter === fecManager.interval) {
        packetsQueue.push(fecPacket);

        fecManager.packet = null;
        fecManager.packetCounter = 0;
    }
});

function processFrames() {
    const packet = packetsQueue.shift();

    console.log(JSON.parse(packet).header.id);


    server.send(packet, PORT, "localhost", (err) => {
        if (err) {
            console.error(err);
            server.close();
        }

        packetsAmount--;

        if (packetsAmount === 0) return server.close();

        processFrames();
    });
}
