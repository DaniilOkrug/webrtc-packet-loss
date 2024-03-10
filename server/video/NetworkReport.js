class NetworkReport {
    packetsAmount = 0;
    packetsLost = 0;
    bandwidth = 0;

    constructor() {}

    get() {
        return {
            packetLoss: this.packetsLost === 0 ? 0 : this.packetsLost / this.packetsAmount,
            bandwidth: this.bandwidth,
        }
    }
}

module.exports = { NetworkReport };