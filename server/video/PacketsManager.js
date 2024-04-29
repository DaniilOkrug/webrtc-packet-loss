class PacketsManager {
    packetId = 0;

    constructor() { }

    /**
     * 
     * @param {Buffer} data 
     * @returns {Buffer[]}
     */
    toPackets(data, frameId) {
        const dataChunks = this.splitBufferIntoChunks(data, 1000);
        const packets = [];

        for (const chunk of dataChunks) {
            // console.log(this.packetId);
            const packet = {
                id: this.packetId++,
                frameId,
                type: 1, // Media type
                payload: chunk,
            }

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