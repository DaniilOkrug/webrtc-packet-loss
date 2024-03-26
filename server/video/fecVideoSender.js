require('dotenv').config({
    path: '../.env'
})

const ffmpeg = require('fluent-ffmpeg');
const dgram = require("dgram");
const { PacketsManager } = require('./PacketsManager');
const { FecSenderManager } = require('./FecSenderManager');

const server = dgram.createSocket("udp6");
const reportsListenerServer = dgram.createSocket("udp6");

const packetManager = new PacketsManager();
const fecManager = new FecSenderManager();

const framesQueue = [];
let framesAmount = 0;

let sendingRate = 100000; // 100mbps default
const sendingRateList = [sendingRate];

const PORT = 41234;

const videoStream = ffmpeg('./test.mp4')
    .videoBitrate(sendingRate)
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
    framesQueue.push(frame);
});

async function sendPacketsWithFEC(packets) {
    const promises = [];

    for (const packet of packets) {
        const fecPacket = fecManager.transform(packet);
        promises.push(sendPacket(packet, fecPacket));

        if (fecPacket) {
            fecManager.packetCounter = 0;
            fecManager.packet = null;
        }
    }

    await Promise.all(promises);
}

function sendPacket(packet, fecPacket) {
    return new Promise((resolve, reject) => {
        server.send(packet, PORT, "localhost", (err) => {
            if (err) {
                console.error('Error sending packet:', err);
                console.log('Packet error size:', packet.byteLength);
                reject(err);
            } else {
                // console.log('Packet sent:', packet.byteLength);
                resolve();
            }
        });

        if (fecPacket) {
            server.send(fecPacket, PORT, "localhost", (err) => {
                if (err) {
                    console.error('Error sending FEC packet:', err);
                    console.log('FEC Packet error size:', fecPacket.byteLength);
                    reject(err);
                    // resolve();
                } else {
                    // console.log('FEC Packet sent:', fecPacket.byteLength);
                    resolve();
                }
            });
        }
    });
}

async function processFrames() {
    const frame = framesQueue.shift();
    const packets = packetManager.toPackets(frame);

    // console.log(framesQueue.length);

    try {
        await sendPacketsWithFEC(packets);
    } catch (error) {
        console.error('Error sending packets:', error);
        server.close();
        return;
    }

    framesAmount--;

    if (framesAmount === 0) {
        server.close();
        reportsListenerServer.close();
        return;
    }

    processFrames();
}

reportsListenerServer.on("listening", () => {
    const address = reportsListenerServer.address();
    console.log(`reportsListenerServer listens ${address.address}:${address.port}`);
});
reportsListenerServer.bind(41235);

const networkReportList = [];
reportsListenerServer.on("message", (msg, _rinfo) => {
    const networkReport = JSON.parse(msg);

    console.log(networkReport);
    fecManager.adaptFecInterval(networkReport);

    if (networkReportList.length === 0) return networkReportList.push(networkReport);

    if (networkReport.packet_loss > 0.1) {
        //add
    } else if (networkReport.packet_loss < 0.02) {
        sendingRate = 1.05 * sendingRateList[sendingRateList.length - 1]
        return;
    } else {
        sendingRate = sendingRateList[sendingRateList.length - 1];
    }

    sendingRateList.push(sendingRate);
    networkReportList.push(networkReport)
});
