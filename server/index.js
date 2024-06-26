let express = require("express");
let http = require("http");
let app = express();
let cors = require("cors");
let server = http.createServer(app);
let socketio = require("socket.io");
let io = new socketio.Server(server);

app.use(cors());
const PORT = process.env.PORT || 8080;

let users = {};

let socketToRoom = {};

const maximum = 2;

io.on("connection", (socket) => {
    socket.on("join_room", async (data) => {
        if (users[data.room]) {
            const length = users[data.room].length;
            if (length === maximum) {
                socket.to(socket.id).emit("room_full");
                return;
            }

            const currentUser = users[data.room].find(el => el.id === socket.id);
            if (!currentUser) {
                users[data.room].push({ id: socket.id });
            }
        } else {
            users[data.room] = [{ id: socket.id }];
        }
        socketToRoom[socket.id] = data.room;

        await socket.join(data.room);
        console.log(`[${socketToRoom[socket.id]}]: ${socket.id} enter`);

        const usersInThisRoom = users[data.room].filter(
            (user) => user.id !== socket.id
        );

        console.log(usersInThisRoom);

        io.sockets.to(socket.id).emit("all_users", usersInThisRoom);
    });

    socket.on("offer", (sdp) => {
        console.log("offer: " + socket.id);
        socket.broadcast.emit("getOffer", sdp);
    });

    socket.on("answer", (sdp) => {
        console.log("answer: " + socket.id);
        socket.broadcast.emit("getAnswer", sdp);
    });

    socket.on("candidate", (candidate) => {
        console.log("candidate: " + socket.id);
        socket.broadcast.emit("getCandidate", candidate);
    });

    socket.on("disconnect", () => {
        console.log(`[${socketToRoom[socket.id]}]: ${socket.id} exit`);
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter((user) => user.id !== socket.id);
            users[roomID] = room;
            if (room.length === 0) {
                delete users[roomID];
                return;
            }
        }
        socket.broadcast.to(room).emit("user_exit", { id: socket.id });
        console.log(users);
    });
});

server.listen(PORT, () => {
    console.log(`server running on ${PORT}`);
});