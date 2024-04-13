require('dotenv').config({
    path: '../.env'
})

const dgram = require("dgram");
const { FecReceiverManager } = require("./FecReceiverManager");
const { Metrics } = require("./Metrics");
const { NetworkReport } = require('./NetworkReport');
const { FramesStream } = require('./FramesStream');
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const server = dgram.createSocket("udp6");

const metrics = new Metrics();
const networkReport = new NetworkReport();
const fecReceiverManager = new FecReceiverManager(metrics);

let packetLoss = 0.04;
let bandwidthLimit = 180000000;

// setInterval(() => {
//     bandwidthLimit -= 1000000;
// }, 10000)

// setTimeout(() => {
//     bandwidthLimit -= 500000;
// }, 2000);

// setTimeout(() => {
//     bandwidthLimit += 500000;
// }, 10000);

server.on("message", (msg, rinfo) => {
    const packet = JSON.parse(msg);

    // Временное решение
    if (Math.random() < packetLoss || networkReport.getBandwidth() > bandwidthLimit) {
        // if (packet.type === 1) {
        metrics.packetsLost++;
        networkReport.packetsLost++;
        // }

        return;
    }

    if (packet.type === 1) {
        networkReport.totalBandwidth += rinfo.size;
        networkReport.totalMediaBandwidth += rinfo.size;
        fecReceiverManager.addPacket(packet, rinfo);
    } else if (packet.type === 2) {
        networkReport.totalBandwidth += Buffer.from(packet.payload).length;
        fecReceiverManager.recover(packet, rinfo);
    }

    if (!networkReport.initTime) networkReport.initTime = Date.now();

    fecReceiverManager.metricsManager.packetsCounter++;
    networkReport.packetsAmount++;
});

setInterval(() => {
    server.send(Buffer.from(JSON.stringify({
        ...networkReport.get(),
        recovery_rate: metrics.getRecoveryRate()
    })), 41235, "localhost", (err) => {
        if (err) {
            console.error(err);
            server.close();
        }
    });
}, 1000);


/**
 * Show metrics at KeyboardInterrupt
 */
process.on('SIGINT', function () {
    console.log("\n--Caught interrupt signal--\n");

    metrics.packetsCounter += metrics.packetsLost; // Add lost packets to received packets
    metrics.print();

    const packets = [...fecReceiverManager.receivedPackets.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(val => Buffer.from(val[1].payload));
    const outputStream = fs.createWriteStream('./received_video.flv');
    const framesStream = new FramesStream(packets);

    ffmpeg(framesStream)
        .preset('flashvideo')
        .output(outputStream)
        .on('end', () => {
            console.log('Video file created successfully');
            process.exit();
        })
        .on('error', (err, stdout, stderr) => {
            console.error('Error:', err.message);
            console.error('ffmpeg stdout:', stdout);
            console.error('ffmpeg stderr:', stderr);
            process.exit();
        })
        .run();
});

server.on("listening", () => {
    const address = server.address();
    console.log(`Server listens ${address.address}:${address.port}`);
});

server.bind(41234);
