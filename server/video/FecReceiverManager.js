const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class FecReceiverManager {
    receivedPackets = new Map();
    metricsManager;

    constructor(metricsManager) {
        this.metricsManager = metricsManager;
        this.reportCsv = createCsvWriter({
            path: process.env.CSV_REPORT_PATH,
            header: [
                {id: 'type', title: 'Type'},
                {id: 'time', title: 'Time'},
                {id: 'size', title: 'Size'}
            ]
        })
    }

    addPacket(packet, rinfo) {
        this.writeToReport(packet, rinfo);

        this.receivedPackets.set(packet.header.id, packet);
        this.metricsManager.packetsCounter++;
    }

    recover(fecPacket, rinfo) {
        this.writeToReport(fecPacket, rinfo);

        const lostPackets = [];

        for(const protectedId of fecPacket.header.protected) {
            if (!this.receivedPackets.get(protectedId)) {
                lostPackets.push(protectedId);
            }
        }

        // Possible recover only 1 packet from whole set of packets
        if (lostPackets.length === 1) {
            console.log(`Recovered packet: ${lostPackets[0]}`);
            this.metricsManager.packetsRecovered++;
        }
    }

    writeToReport(packet, rinfo) {
        this.reportCsv.writeRecords([
            {
                type: packet.header.type, 
                time: Date.now(), 
                size: packet.header.type === 'fec' ? Buffer.from(packet.payload).length : rinfo.size
            }
        ])
    }
}

module.exports = { FecReceiverManager };
