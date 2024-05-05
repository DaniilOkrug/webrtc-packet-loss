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

const networkReport = new NetworkReport();
const metrics = new Metrics();
const fecReceiverManager = new FecReceiverManager(metrics);

let packetLoss = 0.02;
let bandwidthLimit = 2000000;

setTimeout(() => {
    bandwidthLimit -= 500000;
    packetLoss = 0.05
    console.log((new Date().toLocaleString()));
}, 10000);

setTimeout(() => {
    bandwidthLimit += 500000;
    packetLoss = 0.01
    console.log((new Date().toLocaleString()));
}, 30000);

setTimeout(() => {
    bandwidthLimit -= 500000;
    packetLoss = 0.05
    console.log((new Date().toLocaleString()));
}, 45000);

setTimeout(() => {
    bandwidthLimit += 500000;
    packetLoss = 0.01
    console.log((new Date().toLocaleString()));
}, 60000);

setTimeout(() => {
    bandwidthLimit += 500000;
    console.log((new Date().toLocaleString()));
    console.log('end');
}, 70000);

server.on("message", (msg, rinfo) => {
    const packet = JSON.parse(msg);

    if (!networkReport.initTime) networkReport.initTime = Date.now();

    const currentPacketLoss = Math.random();
    const currentBandwidth = networkReport.getBandwidth();
    // Временное решение
    if (currentPacketLoss < packetLoss || currentBandwidth > bandwidthLimit) {
        metrics.packetsLost++;
        networkReport.packetsLost++;
        fecReceiverManager.lost[packet.id] = packet;
        return;
    }

    if (packet.type === 1) {
        networkReport.totalBandwidth += rinfo.size;
        networkReport.totalMediaBandwidth += rinfo.size;
        fecReceiverManager.addPacket(packet, rinfo);
    } else if (packet.type === 2) {
        networkReport.totalBandwidth += Buffer.from(packet.payload).length;
        const isRecovered = fecReceiverManager.recover(packet, rinfo);

        if (isRecovered) {
            networkReport.packetsRecovered++;
        }
    }

    fecReceiverManager.metricsManager.packetsCounter++;
    networkReport.processPacket(packet);
});

setInterval(() => {
    server.send(Buffer.from(JSON.stringify({
        ...networkReport.get(),
        recovery_rate: metrics.getRecoveryRate(),
        bandwidth_link: bandwidthLimit,
        packet_loss_random: packetLoss
    })), 41235, 'localhost', (err) => {
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

    metrics.packetsCounter += metrics.packetsLost;
    metrics.print();
    const packets = [...fecReceiverManager.receivedPackets.values()].sort((a, b) => {
        if (a.frameId === b.frameId) return a.id - b.id;
        return a.frameId - b.frameId;
    }).map(val => {
        return Buffer.from(val.payload)
    });
    const outputStream = fs.createWriteStream('./received_video.flv');
    const framesStream = new FramesStream(packets);

    ffmpeg(framesStream)
        .preset('flashvideo')
        .outputOptions('-s 1280x720')
        .outputOptions('-preset medium')
        .outputOptions('-crf 28')
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
