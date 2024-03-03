class FecReceiverManager {
    receivedPackets = new Map();
    metricsManager;

    constructor(metricsManager) {
        this.metricsManager = metricsManager;
    }

    addPacket(packet) {
        this.receivedPackets.set(packet.header.id, packet);
    }

    recover(fecPacket) {
        for(const protectedId of fecPacket.header.protected) {
            if (!this.receivedPackets.get(protectedId)) console.log(`Recovered ${protectedId}`);
        }
    }
}

module.exports = { FecReceiverManager };
