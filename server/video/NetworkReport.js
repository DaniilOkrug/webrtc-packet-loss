class NetworkReport {
    initTime;
    packetsAmount = 0;
    packetsRecovered = 0;
    totalBandwidth = 0;
    totalMediaBandwidth = 0;
    startPacketId = 0;
    endPacketId = 0;
    packets = new Map();

    constructor() { }

    processPacket(packet) {
        this.endPacketId = Math.max(packet.id, this.endPacketId);
        this.packets.set(packet.id, packet);
        this.packetsAmount++;
    }

    get() {
        const elapsedTime = Date.now() - this.initTime;

        let packetsLost = 0;
        for (let i = this.startPacketId; i < this.endPacketId; i++) {
            if (!this.packets.get(i)) {
                packetsLost++;
            }
        }

        let packet_loss_recovery; 
        let packet_loss;
        if (packetsLost === 0) {
            packet_loss = 0;
            packet_loss_recovery = 0;
        } else {
            packet_loss = packetsLost / (this.packetsAmount + packetsLost);
            packet_loss_recovery = Math.max(packetsLost - this.packetsRecovered, 0) / (this.packetsAmount + packetsLost);
        }

        const report = {
            packet_loss,
            packet_loss_recovery,
            bandwidth: this.totalBandwidth / Math.max((elapsedTime / 1000), 1),
            bandwidth_media: this.totalMediaBandwidth / Math.max((elapsedTime / 1000), 1)
        }

        this.initTime = Date.now();
        this.packetsLost = 0;
        this.packetsRecovered = 0;
        this.startPacketId = this.endPacketId;
        this.packetsAmount = 0;
        this.totalBandwidth = 0;
        this.totalMediaBandwidth = 0;

        return report;
    }

    getBandwidth() {
        const elapsedTime = (Date.now() - this.initTime) / 1000;
        return this.totalBandwidth / Math.max(elapsedTime, 1)
    }
}

module.exports = { NetworkReport };

