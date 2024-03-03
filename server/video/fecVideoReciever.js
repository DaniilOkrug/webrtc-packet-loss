require('dotenv').config({
    path: '../.env'
})

const dgram = require("dgram");
const { FecReceiverManager } = require("./FecReceiverManager");
const { Metrics } = require("./Metrics");

const server = dgram.createSocket("udp6");

const metrics = new Metrics();
const fecReceiverManager = new FecReceiverManager(metrics);

server.on("message", (msg, rinfo) => {
    // console.log(rinfo);
    const packet = JSON.parse(msg);

    // Временное решение
    if (Math.random() < 0.1) {
        if (packet.header.type === 'media') {
            metrics.packetsLost++;
        }

        return console.log(`Lost ${packet.header.id}`);
    }

    if (packet.header.type === 'media') {
        // console.log(`${packet.header.type} : ${packet.header.id}`);
        fecReceiverManager.addPacket(packet, rinfo);
    } else if (packet.header.type === 'fec') {
        // console.log(`${packet.header.type} : ${packet.header.protected}`);
        fecReceiverManager.recover(packet, rinfo);
    }
});


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