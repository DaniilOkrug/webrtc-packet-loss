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

server.on("message", (msg, rinfo) => {
    const packet = JSON.parse(msg);

    // Временное решение
    if (Math.random() < 0.2) {
        if (packet.type === 1) {
            metrics.packetsLost++;
        }

        return //console.log(`Lost ${packet.id}`);
    }

    if (packet.type === 1) {
        // console.log(`${packet.type} : ${packet.id}`);
        fecReceiverManager.addPacket(packet, rinfo);
    } else if (packet.type === 2) {
        // console.log(`${packet.type} : ${packet.protected}`);
        fecReceiverManager.recover(packet, rinfo);
    }

    server.send(Buffer.from(JSON.stringify({
        packet_loss: metrics.getLossFraction(),
        recovery_rate: metrics.getRecoveryRate()
    })), 41235, "localhost", (err) => {
        if (err) {
            console.error(err);
            server.close();
        }
    });
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


/**
 * 
 */
server.on("listening", () => {
    const address = server.address();
    console.log(`Server listens ${address.address}:${address.port}`);
});

server.bind(41234);