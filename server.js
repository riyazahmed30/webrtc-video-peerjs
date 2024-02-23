const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server);
const { ExpressPeerServer } = require("peer");
const url = require("url");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});
const path = require("path");

app.use("/public", express.static(path.join(__dirname, "static")));
app.use("/peerjs", peerServer);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "index.html"));
});

app.get("/join", (req, res) => {
  res.redirect(
    url.format({
      pathname: `/join/${uuidv4()}`,
      query: req.query,
    })
  );
});

app.get("/joinold", (req, res) => {
  res.redirect(
    url.format({
      pathname: `/join/${req.query.meeting_id}`,
      query: req.query,
    })
  );
});

app.get("/join/:rooms", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "room.html"));
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, id, myname) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", id, myname);

    socket.on("messagesend", (message) => {
      io.to(roomId).emit("createMessage", message);
    });

    socket.on("tellName", (myname) => {
      socket.to(roomId).broadcast.emit("AddName", myname);
    });

    socket.on("disconnect", () => {
      socket.to(roomId).broadcast.emit("user-disconnected", id);
    });

    socket.on("endCallForAll", () => {
      socket.to(roomId).broadcast.emit("endCallForAll", id);
    });
  });
});

server.listen(process.env.PORT || 3030);
