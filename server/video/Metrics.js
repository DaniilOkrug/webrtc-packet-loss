class Metrics {
    initTime;
    packetsCounter = 0;
    packetsLost = 0;
    packetsRecovered = 0;

    constructor() {
        this.initTime = Date.now();
    }

    getLossFraction() {
        return this.packetsLost / (this.packetsCounter + this.packetsLost);
    }

    getRecoveryRate() {
        return this.packetsRecovered / this.packetsLost;
    }

    print() {
        console.log(`Started at: ${new Date(this.initTime).toLocaleString('en')}`);
        console.log(`Finished at: ${new Date().toLocaleString('en')}\n`);

        console.log(`Total packets: ${this.packetsCounter}`);

        console.log(`Packets lost: ${this.packetsLost}`);
        console.log(`Packets recovered: ${this.packetsRecovered}`);
        console.log(`Recover rate: ${this.getRecoveryRate()}`);
        console.log(`Loss rate: ${this.getLossFraction()}`);

    }
}

module.exports = { Metrics };