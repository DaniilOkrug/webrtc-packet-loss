class NetworkReport {
    initTime;
    packetsAmount = 0;
    packetsLost = 0;
    totalBandwidth = 0;
    totalMediaBandwidth = 0; // Bandwidth of media packets

    constructor() { }

    get() {
        const elapsedTime = Date.now() - this.initTime;

        const report = {
            packet_loss: this.packetsLost === 0 ? 0 : this.packetsLost / (this.packetsAmount + this.packetsLost),
            bandwidth: this.totalBandwidth / Math.max((elapsedTime / 1000), 1),
            bandwidth_media: this.totalMediaBandwidth / Math.max((elapsedTime / 1000), 1)
        }

        if (elapsedTime > 1000) {
            this.initTime = Date.now();
            this.packetsLost = 0;
            this.packetsAmount = 0;
            this.totalBandwidth = 0;
            this.totalMediaBandwidth = 0;
        }

        return report;
    }

    getBandwidth() {
        const elapsedTime = Date.now() - this.initTime;
        return this.totalBandwidth / Math.max((elapsedTime / 1000))
    }
}

module.exports = { NetworkReport };