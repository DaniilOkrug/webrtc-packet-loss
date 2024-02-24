const dgram = require("dgram");
const ffmpeg = require("fluent-ffmpeg");

const server = dgram.createSocket("udp4");

server.on("message", (msg, rinfo) => {
    // console.log(rinfo);
    console.log(msg);

    ffmpeg()
        .input(msg)
        .inputOptions('-f mpegts')
        .output("./output.mp4")
        .on("error", (err, stdout, stderr) => {
            console.error("ffmpeg error:", err.message);
            console.error("ffmpeg stdout:", stdout);
            console.error("ffmpeg stderr:", stderr);
        })
        .on("end", () => {
            console.log("Video saved successfully");
        })
        .run();
});

server.on("listening", () => {
    const address = server.address();
    console.log(`Сервер слушает ${address.address}:${address.port}`);
});

server.bind(41234);