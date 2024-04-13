const fs = require('fs')
const express = require('express')
const cors = require('cors')
const ffmpeg = require('fluent-ffmpeg');

const app = express();
app.use(cors());

const router = express.Router();
router.get('/video', (request, response) => {
    const stream = fs.createReadStream('./test.mp4');
    stream.on

    const command = ffmpeg(stream, {
        timeout: 1000,
    })
        .format('mpeg')
        .on('progress', function (progress) {
            console.log('Processing. Timemark: -> ' + progress.timemark);
        })
        .on('end', (stdout, stderr) => {
            console.log('Transcoding succeeded !');
        })
        .on('error', (error) => {
            console.log('error', error);
        });

    const ffstream = command.pipe();
    ffstream.on('data', function (chunk) {
        response.send(chunk);
    });

    command.run();
});

app.use(router);

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server started at http://localhost:${PORT}`);
});