const { NetworkReport } = require('./NetworkReport');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class FecSenderManager {
    interval = 14;
    packet = null;
    ready = false;
    packetCounter = 0;

    constructor() {
        this.reportCsv = createCsvWriter({
            path: process.env.CSV_SENDER_REPORT_PATH,
            header: [
                { id: 'time', title: 'Time' },
                { id: 'packet_loss', title: 'Packet loss' },
                { id: 'fec_rate', title: 'FEC Interval' },
                { id: 'recovery_rate', title: 'Recovery Rate' }
            ]
        })
    }

    /**
     * @param {Buffer} dataPacket 
     * @returns {Buffer | null}
     */
    transform(dataPacket) {
        const parsedPacket = JSON.parse(dataPacket);

        if (!this.packet) {
            this.packet = {
                type: 2, // FEC type
                protected: [parsedPacket.id],
                // payload: JSON.parse(JSON.stringify(dataPacket)),
                payload: Buffer.alloc(Buffer.from(parsedPacket.payload).length)
            }
        } else {
            this.packet.protected = [...this.packet.protected, parsedPacket.id];
            for (let i = 0; i < dataPacket.length; i++) {
                this.packet.payload[i] = this.packet.payload[i] ^ dataPacket[i];
            }
        }

        this.packetCounter++;
        // console.log('Interval:', this.interval, this.packetCounter);


        return this.packetCounter >= this.interval ? Buffer.from(JSON.stringify(this.packet)) : null;
    }

    /**
     * 
     * @param {NetworkReport} networkReport 
     */
    adaptFecInterval(networkReport) {
        const minFecInterval = 2;
        const maxFecInsterval = 14;

        const packetLossThreshold = 0.1;

        const lossRateFactor = Math.min(1, networkReport.packet_loss / packetLossThreshold);

        const adaptiveFactor = lossRateFactor;

        this.interval = Math.round(maxFecInsterval - adaptiveFactor * (maxFecInsterval - minFecInterval));

        console.log('Interval:', this.interval);
        this.reportCsv.writeRecords([
            {
                packet_loss: networkReport.packet_loss,
                time: Date.now(),
                fec_rate: this.interval,
                recovery_rate: networkReport.recovery_rate
            }
        ]);
    }
}

module.exports = { FecSenderManager };