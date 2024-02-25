class NetworkReport {
    packetLoss;

    constructor(packetLoss) {
        this.packetLoss = packetLoss;
    }

    get() {
        return {
            packetLoss: this.packetLoss,
        }
    }
}

module.exports = { NetworkReport };