require('dotenv').config({
    path: '../.env'
})

const ffmpeg = require('fluent-ffmpeg');
const dgram = require("dgram");
const { PacketsManager } = require('./PacketsManager');
const { FecSenderManager } = require('./FecSenderManager');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const senderCheckReport = createCsvWriter({
    path: './report/sender_check.csv',
    header: [
        { id: 'time', title: 'Time' },
        { id: 'bandwidth', title: 'Bandwidth' },
    ]
})

const server = dgram.createSocket("udp6");
const reportsListenerServer = dgram.createSocket("udp6");

const packetManager = new PacketsManager();
const fecManager = new FecSenderManager();

let packetsSize = 0;
let initTime = Date.now();
let isVideoParsingFinished = false;

let sendingRate = 3000; // 42000 is max; 2983 is actual
const sendingRateList = [sendingRate];

const PORT = 41234;

let ffmpegProcess;
let videoStream;

function createFFmpegProcess(bitrate) {
    ffmpegProcess = ffmpeg('test.mp4')
        .videoBitrate(bitrate, true)
        .videoCodec('libx264')
        .inputOptions('-stream_loop 2')
        .inputOptions('-re')
        .outputOptions('-preset ultrafast')
        .outputOptions('-tune zerolatency')
        .outputOptions('-pix_fmt yuv420p')
        .outputOptions('-r 30')
        .outputOptions('-s 1280x720')
        .outputFormat('mpegts')
        .on('codecData', function (data) {
            // console.log(data);
        })
        .on('progress', function (info) {
            // console.log('progress ' + info.percent + '%');
        })
        .on('error', (err, stdout, stderr) => {
            console.log('Error:', err.message);
            console.log('ffmpeg stdout:', stdout);
            console.log('ffmpeg stderr:', stderr);
        })
        .on('end', function () {
            console.log('Finished processing');
            isVideoParsingFinished = true;
        });

    videoStream = ffmpegProcess.pipe();
    videoStream.on('data', (frame) => {
        processFrames(frame)
    });
}

createFFmpegProcess(sendingRate);

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
        packetsSize += Buffer.byteLength(packet);
        server.send(packet, PORT, "localhost", (err) => {
            if (err) {
                console.error('Error sending packet:', err);
                console.log('Packet error size:', packet.byteLength);
                reject(err);
            } else {
                resolve();
            }
        });

        if (fecPacket) {
            server.send(fecPacket, PORT, "localhost", (err) => {
                packetsSize += Buffer.from(JSON.parse(fecPacket).payload).byteLength;
                if (err) {
                    console.error('Error sending FEC packet:', err);
                    console.log('FEC Packet error size:', fecPacket.byteLength);
                    reject(err);
                } else {
                    resolve();
                }
            });
        }
    });
}

setInterval(() => {
    // console.log(packetsSize);
    senderCheckReport.writeRecords([
        {
            time: Date.now(),
            bandwidth: packetsSize,
        }
    ])
    packetsSize = 0;
}, 1000);

async function processFrames(frame) {
    const packets = packetManager.toPackets(frame);

    try {
        await sendPacketsWithFEC(packets);
    } catch (error) {
        console.error('Error sending packets:', error);
        server.close();
        return;
    }

    if (isVideoParsingFinished) {
        server.close();
        reportsListenerServer.close();
        return;
    }
}

reportsListenerServer.on("listening", () => {
    const address = reportsListenerServer.address();
    console.log(`reportsListenerServer listens ${address.address}:${address.port}`);
});
reportsListenerServer.bind(41235);

const networkReportList = [];
reportsListenerServer.on("message", (msg, _rinfo) => {
    const networkReport = JSON.parse(msg);

    if (networkReportList.length === 0) return networkReportList.push(networkReport);

    if (networkReport.packet_loss > 0.1) {
        const newSendingRate = sendingRateList[sendingRateList.length - 1] * (1 - 0.5 * networkReport.packet_loss);

        sendingRate = Math.max(newSendingRate, 100);
    } else if (networkReport.packet_loss < 0.02) {
        sendingRate = 1.05 * sendingRateList[sendingRateList.length - 1]
    } else {
        sendingRate = sendingRateList[sendingRateList.length - 1];
    }

    sendingRateList.push(sendingRate);
    networkReportList.push(networkReport)

    fecManager.adaptFecInterval(networkReport, sendingRate);

    if (sendingRate !== sendingRateList[sendingRateList.length - 2]) {
        ffmpegProcess.kill('SIGKILL');
        videoStream.removeAllListeners();

        createFFmpegProcess(sendingRate);
    }

    if (isVideoParsingFinished) {
        reportsListenerServer.close();
    }
});
