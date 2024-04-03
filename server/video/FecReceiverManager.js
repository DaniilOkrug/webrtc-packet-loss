const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class FecReceiverManager {
    receivedPackets = new Map();
    recoveredPackets = new Map();
    metricsManager;

    constructor(metricsManager) {
        this.metricsManager = metricsManager;
        this.reportCsv = createCsvWriter({
            path: process.env.CSV_REPORT_PATH,
            header: [
                { id: 'type', title: 'Type' },
                { id: 'time', title: 'Time' },
                { id: 'size', title: 'Size' }
            ]
        })
    }

    addPacket(packet, rinfo) {
        this.writeToReport(packet, rinfo);
        // console.log(packet.id);
        this.receivedPackets.set(packet.id, packet);

        if (this.recoveredPackets.get(packet.id)) {
            this.metricsManager.packetsRecovered--;
        }
        // console.log(this.metricsManager.getLossFraction());
    }

    recover(fecPacket, rinfo) {
        this.writeToReport(fecPacket, rinfo);

        const lostPackets = [];

        for (const protectedId of fecPacket.protected) {
            if (!this.receivedPackets.get(protectedId)) {
                lostPackets.push(protectedId);
            }
        }

        // Possible recover only 1 packet from whole set of packets
        if (lostPackets.length === 1) {
            // console.log(`Recovered packet: ${lostPackets[0]}`);
            this.metricsManager.packetsRecovered++;
            this.recoveredPackets.set(lostPackets[0].id, lostPackets[0]);
        }
    }

    writeToReport(packet, rinfo) {
        this.reportCsv.writeRecords([
            {
                type: packet.type,
                time: Date.now(),
                size: packet.type === 2 ? Buffer.from(packet.payload).length : rinfo.size
            }
        ])
    }
}

module.exports = { FecReceiverManager };
