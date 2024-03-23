require('dotenv').config({
    path: '../.env'
})

const ffmpeg = require('fluent-ffmpeg');
const dgram = require("dgram");
const { PacketsManager } = require('./PacketsManager');
const { FecSenderManager } = require('./FecSenderManager');

const server = dgram.createSocket("udp6");
const packetManager = new PacketsManager();
const fecManager = new FecSenderManager();

const framesQueue = [];
let framesAmount = 0;

const PORT = 41234;

const videoStream = ffmpeg('./test.mp4')
    .videoBitrate(10)
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
        framesAmount = framesQueue.length;
        processFrames();
    }).pipe();

videoStream.on('data', (frame) => {
    // const packet = packetManager.toPacket(frame);
    // const fecPacket = fecManager.transform(packet);

    // packetsQueue.push(packet);

    // if (fecManager.packetCounter === fecManager.interval) {
    //     packetsQueue.push(fecPacket);

    //     fecManager.packet = null;
    //     fecManager.packetCounter = 0;
    // }
    framesQueue.push(frame);
});

function processFrames() {
    const frame = framesQueue.shift();
    const packets = packetManager.toPackets(frame);

    for (const packet of packets) {
        const fecPacket = fecManager.transform(packet);

        server.send(packet, PORT, "localhost", (err) => {
            if (err) {
                console.log('Errors packet size:', packet.byteLength, packet.length);
                console.error(err);
                server.close();
            }

            framesAmount--;

            if (framesAmount === 0) return server.close();

            processFrames();
        });


        if (fecManager.packetCounter >= fecManager.interval) {
            fecManager.packet = null;
            fecManager.packetCounter = 0;

            server.send(fecPacket, PORT, "localhost", (err) => {
                if (err) {
                    console.log('Errors packet size:', packet.byteLength, packet.length);
                    console.error(err);
                    server.close();
                }
            });
        }
    }
}

const reportsListenerServer = dgram.createSocket("udp6");

reportsListenerServer.on("listening", () => {
    const address = reportsListenerServer.address();
    console.log(`reportsListenerServer слушает ${address.address}:${address.port}`);
});
reportsListenerServer.bind(41235);


reportsListenerServer.on("message", (msg, rinfo) => {
    const networkReport = JSON.parse(msg);

    console.log(networkReport);
    fecManager.adaptFecInterval(networkReport);
});