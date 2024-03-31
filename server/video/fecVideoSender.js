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

// const framesQueue = [];
// let framesAmount = 0;
let isVideoParsingFinished = false;

let sendingRate = 2983; // 42000 is max; 2983 is actual
const sendingRateList = [sendingRate];

const PORT = 41234;

const videoStream = ffmpeg('./test.mp4')
    .videoBitrate(sendingRate)
    .videoCodec('libx264')
    .inputOptions('-stream_loop 10')
    .outputOptions('-preset ultrafast')
    .outputOptions('-tune zerolatency')
    .outputOptions('-pix_fmt yuv420p')
    .outputOptions('-r 30')
    .outputOptions('-s 1280x720')
    .outputFormat('mpegts')
    .on('codecData', function (data) {
        console.log(data);
    })
    .on('error', (err, stdout, stderr) => {
        console.log('Error:', err.message);
        console.log('ffmpeg stdout:', stdout);
        console.log('ffmpeg stderr:', stderr);
    })
    .on('end', function () {
        console.log('Finished processing');
        // framesAmount = framesQueue.length;
        isVideoParsingFinished = true;
        // processFrames();
    }).pipe();

videoStream.on('data', (frame) => {
    // framesQueue.push(frame);
    processFrames(frame)
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

async function processFrames(frame) {
    // console.log(Buffer.byteLength(frame));
    // const frame = framesQueue.shift();
    const packets = packetManager.toPackets(frame);

    // console.log(framesQueue.length);

    try {
        await sendPacketsWithFEC(packets);
    } catch (error) {
        console.error('Error sending packets:', error);
        server.close();
        return;
    }

    // framesAmount--;

    if (isVideoParsingFinished) {
        server.close();
        reportsListenerServer.close();
        return;
    }

    // processFrames();
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

    if (networkReportList.length === 0) return networkReportList.push(networkReport);

    if (networkReport.packet_loss > 0.1) {
        sendingRate = sendingRateList[sendingRateList.length - 1] * (1 - 0.5 * networkReport.packet_loss);
    } else if (networkReport.packet_loss < 0.02) {
        sendingRate = 1.05 * sendingRateList[sendingRateList.length - 1]
    } else {
        sendingRate = sendingRateList[sendingRateList.length - 1];
    }

    sendingRateList.push(sendingRate);
    networkReportList.push(networkReport)

    fecManager.adaptFecInterval(networkReport, sendingRate);

    if (isVideoParsingFinished) {
        reportsListenerServer.close();
    }
});
