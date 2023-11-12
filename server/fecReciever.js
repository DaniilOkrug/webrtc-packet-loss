const dgram = require("dgram");
const server = dgram.createSocket("udp4");

const FEC_PACKET_LOSS = 0.1;

let expectedPacketCount = 0;
let receivedPackets = {};
let fecPacket;

const metrics = {
  mediaCount: 0,
  fecCount: 0,
  mediaSize: 0,
  fecSize: 0
};

server.on("message", (msg, rinfo) => {
  const packet = JSON.parse(msg);

  if (packet.header.type === 'media') {
    metrics.mediaCount++;
    metrics.mediaSize += rinfo.size;

    if (Math.random() > FEC_PACKET_LOSS) {
      receivedPackets[packet.header.id] = msg;

      console.log(`${packet.header.id}: ${packet.payload}`);
    } else {
      console.log(`${packet.header.id} потерян`);
    }
  } else {
    metrics.fecCount++;
    metrics.fecSize += rinfo.size;
    console.log(`FEC: ${packet.header.protected}`);

    let lostId;
    const recoveryIds = [];
    for (const id of packet.header.protected) {
      if (!receivedPackets[id]) {
        if (!lostId) lostId = id;
        else { // При потере больше 1 пакета, восстановление невозможно
          console.log('Сообщение не возможно восстановить');
          return;
        }
      } else {
        recoveryIds.push(id);
      }
    }

    // Если есть потерянный пакеты, то воссановим его
    if (recoveryIds < packet.header.protected) {
      const lostPacket = Buffer.from(packet.payload.data);
      for (let i = 0; i < receivedPackets[recoveryIds[0]].length; i++) {
        lostPacket[i] = lostPacket[i] ^ receivedPackets[recoveryIds[0]][i];
      }
      console.log(`Восстановлено сообщение: ${lostPacket.toString()}`);
    }
  }

  if (metrics.mediaCount >= 100) {
    console.table(metrics);
  }
});

server.on("listening", () => {
  const address = server.address();
  console.log(`Сервер слушает ${address.address}:${address.port}`);
});

server.bind(41234);
