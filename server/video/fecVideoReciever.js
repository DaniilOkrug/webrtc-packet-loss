const dgram = require("dgram");

const server = dgram.createSocket("udp4");

server.on("message", (msg, rinfo) => {
    console.log(rinfo);
    const packet = JSON.parse(msg);

    console.log(`Packet id: ${packet.header.id}`);
});

server.on("listening", () => {
    const address = server.address();
    console.log(`Server listens ${address.address}:${address.port}`);
});

server.bind(41234);