const { NetworkReport } = require("./NetworkReport");

class PacketsManager {
    packetId = 1;

    constructor() {}

    /**
     * 
     * @param {Buffer} data 
     * @returns {Buffer}
     */
    toPacket(data) {
        const networkReport = new NetworkReport(0);
        const packet = {
            header: {
              id: this.packetId,
              type: 'media'
            },
            networkReport: networkReport.get(),
            payload: data,
        }

        this.packetId++;
    
        return Buffer.from(JSON.stringify(packet));
    }
}

module.exports = { PacketsManager };