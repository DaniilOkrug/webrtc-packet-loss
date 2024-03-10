class Metrics {
    initTime;
    packetsCounter = 0;
    packetsLost = 0;
    packetsRecovered = 0;

    constructor() {
        this.initTime = Date.now();
    }

    getLossFraction() {
        return this.packetsLost / this.packetsCounter;
    }

    print() {
        console.log(`Started at: ${new Date(this.initTime).toLocaleString('en')}`);
        console.log(`Finished at: ${new Date().toLocaleString('en')}\n`);
        
        console.log(`Total packets: ${this.packetsCounter}`);

        console.log(`Packets lost: ${this.packetsLost}`);
        console.log(`Packets recovered: ${this.packetsRecovered}`);
        const recoverRate = this.packetsRecovered / this.packetsLost;
        console.log(`Recover rate: ${recoverRate}`);
        const lossRate = this.packetsLost / this.packetsCounter;
        console.log(`Loss rate: ${lossRate}`);
        
    }
}

module.exports = { Metrics };