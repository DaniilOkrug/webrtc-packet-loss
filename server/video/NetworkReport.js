class NetworkReport {
    initTime;
    packetsAmount = 0;
    packetsLost = 0;
    totalBandwidth = 0;
    totalMediaBandwidth = 0; // Bandwidth of media packets
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
        console.log(this.startPacketId, this.endPacketId);

        let packetsLost = 0;
        for (let i = this.startPacketId; i < this.endPacketId; i++) {
            if (!this.packets.get(i)) {
                packetsLost++;
            }
        }

        const report = {
            packet_loss: this.packetsLost === 0 ? 0 : this.packetsLost / (this.packetsAmount + this.packetsLost),
            bandwidth: this.totalBandwidth / Math.max((elapsedTime / 1000), 1),
            bandwidth_media: this.totalMediaBandwidth / Math.max((elapsedTime / 1000), 1)
        }

        // if (elapsedTime > 1000) {
        this.initTime = Date.now();
        this.packetsLost = 0;
        this.startPacketId = this.endPacketId;
        this.packetsAmount = 0;
        this.totalBandwidth = 0;
        this.totalMediaBandwidth = 0;
        // }

        return report;
    }

    getBandwidth() {
        const elapsedTime = Date.now() - this.initTime;
        return this.totalBandwidth / Math.max((elapsedTime / 1000))
    }
}

module.exports = { NetworkReport };