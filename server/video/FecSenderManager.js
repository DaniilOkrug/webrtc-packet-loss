const { NetworkReport } = require('./NetworkReport');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class FecSenderManager {
    interval = 14;
    packet = null;
    ready = false;
    packetCounter = 0;
    packetsManager;

    constructor(packetsManager) {
        this.packetsManager = packetsManager;

        this.reportCsv = createCsvWriter({
            path: process.env.CSV_SENDER_REPORT_PATH,
            header: [
                { id: 'time', title: 'Time' },
                { id: 'packet_loss', title: 'Packet loss' },
                { id: 'packet_loss_random', title: 'Packet loss Random' },
                { id: 'packet_loss_recovery', title: 'Packet loss with recovery' },
                { id: 'fec_rate', title: 'FEC Interval' },
                { id: 'recovery_rate', title: 'Recovery Rate' },
                { id: 'bandwidth', title: 'Bandwidth' },
                { id: 'bandwidth_media', title: 'Bandwidth Media' },
                { id: 'sendingRate', title: 'Sending Rate' },
                { id: 'videoBitrate', title: 'Video bitrate' },
                { id: 'bandwidth_link', title: 'Bandwidth Link' }
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
                payload: Buffer.from(dataPacket)
                // payload: JSON.parse(JSON.stringify(dataPacket)),
                // payload: Buffer.alloc(dataPacket.length)
            }
        } else {
            this.packet.protected = [...this.packet.protected, parsedPacket.id];

            let origin = this.packet.payload;
            let target = Buffer.from(dataPacket);
            if (this.packet.payload.length < dataPacket.length) {
                origin = Buffer.from(dataPacket);
                target = this.packet.payload;
            }

            for (let i = 0; i < dataPacket.length; i++) {
                origin[i] = origin[i] ^ target[i];
            }

            this.packet.payload = origin;
        }

        this.packetCounter++;

        if (this.packetCounter >= this.interval) this.packet.id = this.packetsManager.packetId++

        return this.packetCounter >= this.interval ? Buffer.from(JSON.stringify(this.packet)) : null;
    }

    adaptFecInterval(networkReport) {
        const minFecInterval = 2;
        const maxFecInterval = 14;

        const packetLossThreshold = 0.1;

        const lossRateFactor = Math.min(1, networkReport.packet_loss / packetLossThreshold);

        const adaptiveFactor = lossRateFactor;

        this.interval = Math.round(maxFecInterval - adaptiveFactor * (maxFecInterval - minFecInterval));

        return this.interval;
    }

    report(networkReport, sendingRate, videoBitrate) {
        this.reportCsv.writeRecords([
            {
                packet_loss: networkReport.packet_loss,
                time: Date.now(),
                fec_rate: this.interval,
                recovery_rate: networkReport.recovery_rate,
                bandwidth: networkReport.bandwidth,
                bandwidth_media: networkReport.bandwidth_media,
                sendingRate,
                videoBitrate,
                bandwidth_link: networkReport.bandwidth_link,
                packet_loss_recovery: networkReport.packet_loss_recovery,
                packet_loss_random: networkReport.packet_loss_random
            }
        ]);
    }
}

module.exports = { FecSenderManager };