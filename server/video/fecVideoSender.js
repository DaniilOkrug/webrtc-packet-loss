require('dotenv').config({
    path: '../.env'
})

const ffmpeg = require('fluent-ffmpeg');
const dgram = require("dgram");
const { PacketsManager } = require('./PacketsManager');
const { FecSenderManager } = require('./FecSenderManager');
const { env } = require('process');

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

const packetsManager = new PacketsManager();
const fecManager = new FecSenderManager(packetsManager);

let frameId = 0;
let packetsSize = 0;
let initTime = Date.now();
let isVideoParsingFinished = false;
let updateFFmpegProcess = false;
let videoProgress = {
    timemark: '00:00:00.00'
}

let videoBitrate = 3000;
let sendingRate = videoBitrate + (videoBitrate / 14);
const sendingRateList = [sendingRate];

const PORT = 41234;

let ffmpegProcess;
let videoStream;

function createFFmpegProcess(bitrate) {
    ffmpegProcess = ffmpeg('6075_shibuya_tokyo_japan_170111052TokyoIlluminatedSigns1080p.mp4')
        .videoBitrate(bitrate, true)
        .videoCodec('libx264')
        .inputOptions('-stream_loop 10')
        .inputOptions('-re')
        // .setStartTime(getVideoTimemark())
        .outputOptions('-preset ultrafast')
        .outputOptions('-tune zerolatency')
        .outputOptions('-pix_fmt yuv420p')
        .outputOptions('-r 30')
        .outputOptions('-s 1280x720')
        .outputFormat('mpegts')
        .on('codecData', function (data) {
            console.log(data);
        })
        .on('progress', function (info) {
            videoProgress = info
            if (updateFFmpegProcess) {
                // updateFFmpegProcess = false;
                // ffmpegProcess.kill('SIGKILL');
                // videoStream.removeAllListeners();
                // createFFmpegProcess(sendingRate);
            }
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
        processFrames(frame, frameId);
        frameId++;
    });
}

createFFmpegProcess(videoBitrate);

async function sendPacketsWithFEC(packets) {
    const promises = [];

    for (const packet of packets) {
        const fecPacket = fecManager.transform(packet);
        // promises.push(sendPacket(packet, fecPacket));
        await sendPacket(packet);
        if (fecPacket) {
            setTimeout(async () => {
                await sendFECPacket(fecPacket);
            }, 100);
            fecManager.packetCounter = 0;
            fecManager.packet = null;
        }
    }

    await Promise.all(promises);
}

function sendPacket(packet) {
    return new Promise((resolve, reject) => {
        packetsSize += Buffer.byteLength(packet);
        server.send(packet, PORT, env.RECEVIER_HOST, (err) => {
            if (err) {
                console.error('Error sending packet:', err);
                console.log('Packet error size:', packet.byteLength);
                reject(err);
            } else {
                resolve();
            }
        });

        // if (fecPacket) {
        //     server.send(fecPacket, PORT, "localhost", (err) => {
        //         packetsSize += Buffer.from(JSON.parse(fecPacket).payload).byteLength;
        //         if (err) {
        //             console.error('Error sending FEC packet:', err);
        //             console.log('FEC Packet error size:', fecPacket.byteLength);
        //             reject(err);
        //         } else {
        //             resolve();
        //         }
        //     });
        // }
    });
}

function sendFECPacket(fecPacket) {
    return new Promise((resolve, reject) => {
        server.send(fecPacket, PORT, env.RECEVIER_HOST, (err) => {
            if (err) {
                console.error('Error sending FEC packet:', err);
                console.log('FEC Packet error size:', fecPacket.byteLength);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

setInterval(() => {
    senderCheckReport.writeRecords([
        {
            time: Date.now(),
            bandwidth: packetsSize,
        }
    ])
    packetsSize = 0;
}, 1000);

async function processFrames(frame, id) {
    const packets = packetsManager.toPackets(frame, id);

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

    if (networkReport.packet_loss_recovery > 0.1) {
        const newSendingRate = sendingRateList[sendingRateList.length - 1] * (1 - 0.5 * networkReport.packet_loss_recovery);

        sendingRate = Math.max(newSendingRate, 100);
    } else if (networkReport.packet_loss_recovery < 0.02) {
        sendingRate = 1.05 * sendingRateList[sendingRateList.length - 1]
    } else {
        sendingRate = sendingRateList[sendingRateList.length - 1];
    }

    sendingRateList.push(sendingRate);
    networkReportList.push(networkReport)

    const fecInterval = fecManager.adaptFecInterval(networkReport);

    // sendingRate = videoBitrate + (videoBitrate / fecInterval);
    videoBitrate = sendingRate - (sendingRate / (fecInterval + 1))

    fecManager.report(networkReport, sendingRate, videoBitrate);

    if (videoBitrate !== sendingRateList[sendingRateList.length - 2]) {
        updateFFmpegProcess = true;
        ffmpegProcess.kill('SIGKILL');
        videoStream.removeAllListeners();
        createFFmpegProcess(videoBitrate);
    }

    if (isVideoParsingFinished) {
        reportsListenerServer.close();
    }
});


function getVideoTimemark() {
    const endTime = new Date();
    const duration = endTime - initTime;

    function formatDuration(ms) {
        const totalSeconds = ms / 1000;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const milliseconds = ms % 1000;

        return `${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(milliseconds, 3)}`;
    }

    function pad(num, size) {
        return num.toString().padStart(size, '0');
    }

    console.log(`Продолжительность: ${formatDuration(duration)}`);
    return formatDuration(duration);
}