require('dotenv').config({
    path: '../.env'
})

const dgram = require("dgram");
const { FecReceiverManager } = require("./FecReceiverManager");
const { Metrics } = require("./Metrics");
const { NetworkReport } = require('./NetworkReport');
const server = dgram.createSocket("udp6");

const metrics = new Metrics();
const networkReport = new NetworkReport();
const fecReceiverManager = new FecReceiverManager(metrics);

let packetLoss = 0.15;
let bandwidthLimit = 2000000;

// setInterval(() => {
//     bandwidthLimit -= 1000000;
// }, 10000)

setTimeout(() => {
    bandwidthLimit -= 500000;
    console.log((new Date().toLocaleString()));
}, 10000);

setTimeout(() => {
    bandwidthLimit -= 500000;
    console.log((new Date().toLocaleString()));
}, 30000);

setTimeout(() => {
    bandwidthLimit += 500000;
    console.log((new Date().toLocaleString()));

}, 50000);

setTimeout(() => {
    bandwidthLimit += 500000;
    console.log((new Date().toLocaleString()));
    console.log('end');
}, 70000);

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

    process.exit();
});

server.on("listening", () => {
    const address = server.address();
    console.log(`Server listens ${address.address}:${address.port}`);
});

server.bind(41234);
