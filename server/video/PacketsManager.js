class PacketsManager {
    packetId = 1;

    constructor() { }

    /**
     * 
     * @param {Buffer} data 
     * @returns {Buffer[]}
     */
    toPackets(data) {
        const dataChunks = this.splitBufferIntoChunks(data, 1500);
        const packets = [];

        for (const chunk of dataChunks) {
            const packet = {
                id: this.packetId,
                type: 1, // Media type
                payload: chunk,
            }
            this.packetId++;

            packets.push(Buffer.from(JSON.stringify(packet)));
        }



        return packets;
    }

    /**
     * @param {Buffer} data 
     * @param {Number} maxPacketSize 
     * @returns {Buffer[]}
     */
    splitBufferIntoChunks(data, maxPacketSize) {
        const packets = [];
        let offset = 0;

        while (offset < Buffer.byteLength(data)) {
            const remaining = Buffer.byteLength(data) - offset;
            const packetSize = Math.min(maxPacketSize, remaining);
            const packetData = data.slice(offset, offset + packetSize);
            packets.push(packetData);
            offset += packetSize;
        }

        return packets;
    }
}

module.exports = { PacketsManager };