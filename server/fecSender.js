const dgram = require("dgram");
const { v4: uuid } = require("uuid");

const server = dgram.createSocket("udp4");

const FEC_PACKET_INTERVAL = 2; // Количество пакетов перед отправкой FEC пакета
let messageCounter = 0;
let fecPacket = null;

function sendFecPacket() {
  server.send(Buffer.from(JSON.stringify(fecPacket)), 41234, "localhost", (err) => {
    if (err) {
      console.error(err);
      server.close();
    }
  });

  // Обнуляем FEC пакет после отправки
  fecPacket = null;
  messageCounter = 0;
}

function sendPacket(message) {
  const packet = {
    header: {
      id: uuid(),
      type: 'media'
    },
    payload: message,
  }
  
  const messageBuffer = Buffer.from(JSON.stringify(packet));

  // FEC - XOR
  if (!fecPacket) {
    fecPacket = {
      header: {
        type: 'fec',
        protected: [packet.header.id],
      },
      payload: messageBuffer,
    }
  } else {
    fecPacket.header.protected = [...fecPacket.header.protected, packet.header.id];
    for (let i = 0; i < messageBuffer.length; i++) {
      fecPacket.payload[i] = fecPacket.payload[i] ^ messageBuffer[i];
    }
  }

  // Отправляем оригинальный пакет данных
  server.send(messageBuffer, 41234, "localhost", (err) => {
    if (err) {
      console.error(err);
      server.close();
    } else {
      console.log(`${packet.header.id} - ${packet.header.type}: "${message}"`);
      messageCounter++;

      // Если достигли интервала FEC, отправляем FEC пакет
      if (messageCounter >= FEC_PACKET_INTERVAL) {
        sendFecPacket();
      }
    }
  });
}

// Симуляция
const SIMULATION_REQ_AMOUNT = 100;
let simulationCounter = 0;
const simulationTimer = setInterval(() => {
  const message = Math.random() * 100;
  sendPacket(message.toString());

  simulationCounter++;

  if (simulationCounter >= SIMULATION_REQ_AMOUNT) {
    clearInterval(simulationTimer);
    return;
  }
}, 100);
