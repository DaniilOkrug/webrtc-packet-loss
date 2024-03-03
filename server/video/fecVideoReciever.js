const dgram = require("dgram");
const { FecReceiverManager } = require("./FecReceiverManager");
const { Metrics } = require("./Metrics");

const server = dgram.createSocket("udp6");

const metrics = new Metrics();
const fecReceiverManager = new FecReceiverManager(metrics);

server.on("message", (msg, rinfo) => {
    // console.log(rinfo);
    const packet = JSON.parse(msg);

    if (Math.random() < 0.2) return console.log(`Lost ${packet.header.id}`);

    if (packet.header.type === 'media') {
        // console.log(`${packet.header.type} : ${packet.header.id}`);

        fecReceiverManager.addPacket(packet);
    } else if (packet.header.type === 'fec') {
        // console.log(`${packet.header.type} : ${packet.header.protected}`);
        fecReceiverManager.recover(packet);
    }
});

process.on('SIGINT', function () {
    console.log("Caught interrupt signal");

    
    
    process.exit();
});

server.on("listening", () => {
    const address = server.address();
    console.log(`Server listens ${address.address}:${address.port}`);
});

server.bind(41234);