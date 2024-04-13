const { Readable } = require('stream');

class FramesStream extends Readable {
    constructor(frames, options) {
        super(options);
        this.frames = frames;
        this.currentIndex = 0;
    }

    _read() {
        if (this.currentIndex >= this.frames.length) {
            this.push(null);
        } else {
            this.push(this.frames[this.currentIndex]);
            this.currentIndex++;
        }
    }
}

module.exports = { FramesStream };