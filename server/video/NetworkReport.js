class NetworkReport {
    initTime;
    packetsAmount = 0;
    packetsLost = 0;
    totalBandwidth = 0;

    constructor() {}

    get() {
        const elapsedTime = Date.now() - this.initTime;
        console.log('elapsedTime', elapsedTime / 1000);

        return {
            packet_loss: this.packetsLost === 0 ? 0 : this.packetsLost / (this.packetsAmount + this.packetsLost),
            bandwidth: this.totalBandwidth / Math.max((elapsedTime / 1000), 1)
        }
    }
}

module.exports = { NetworkReport };