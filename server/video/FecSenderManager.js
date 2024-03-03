const { NetworkReport } = require("./NetworkReport");

class FecSenderManager {
    interval = 2;
    packet = null;
    ready = false;
    packetCounter = 0;

    constructor() { }

    /**
     * 
     * 
     * @param {Buffer} dataPacket 
     * @returns {Buffer}
     */
    transform(dataPacket) {
        const parsedPacket = JSON.parse(dataPacket);
        const networkReport = new NetworkReport(0);

        if (!this.packet) {
            this.packet = {
                header: {
                    type: 'fec',
                    protected: [parsedPacket.header.id],
                },
                networkReport: networkReport.get(),
                payload: JSON.parse(JSON.stringify(dataPacket)),
            }
        } else {
            this.packet.header.protected = [...this.packet.header.protected, parsedPacket.header.id];
            for (let i = 0; i < dataPacket.length; i++) {
                this.packet.payload[i] = this.packet.payload[i] ^ dataPacket[i];
            }
        }

        this.packetCounter++;

        return Buffer.from(JSON.stringify(this.packet));
    }
}

module.exports = { FecSenderManager };