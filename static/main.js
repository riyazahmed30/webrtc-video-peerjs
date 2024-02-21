const socket = io("/");
const main__chat__window = document.getElementById("main__chat_window");
const videoGrids = document.getElementById("video-grids");
const myVideo = document.createElement("video");
const chat = document.getElementById("chat");
let OtherUsername = "";
chat.hidden = true;
// myVideo.muted = true;

window.onload = () => {
  $(document).ready(function () {
    // $("#getCodeModal").modal("show");
  });
};

var peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: window.location.port,
});

let screenStream;
let currentPeer = null;
let screenSharing = false;
let myVideoStream;
const peers = {};
var getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

const sendmessage = (text) => {
  if (event.key === "Enter" && text.value != "") {
    socket.emit("messagesend", myname + " : " + text.value);
    text.value = "";
    main__chat_window.scrollTop = main__chat_window.scrollHeight;
  }
};

const sendPostMessageToParent = (msgObj) => {
  if (window.parent) {
    window.parent.postMessage(msgObj, "*");
  }
};

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream, myname);
    sendPostMessageToParent({ eventType: "userconnect" });

    socket.on("user-connected", (id, username) => {
      console.log("userid:" + id);
      connectToNewUser(id, stream, username);
      socket.emit("tellName", myname);
    });

    socket.on("user-disconnected", (id) => {
      console.log(peers);
      if (peers[id]) peers[id].close();
    });
  });
peer.on("call", (call) => {
  getUserMedia(
    { video: true, audio: true },
    function (stream) {
      call.answer(stream); // Answer the call with an A/V stream.
      const video = document.createElement("video");
      call.on("stream", function (remoteStream) {
        addVideoStream(video, remoteStream, OtherUsername);
      });
      peers[call.peer] = call;
    },
    function (err) {
      console.log("Failed to get local stream", err);
    }
  );
});

peer.on("open", (id) => {
  socket.emit("join-room", roomId, id, myname);
});

socket.on("createMessage", (message) => {
  var ul = document.getElementById("messageadd");
  var li = document.createElement("li");
  li.className = "message";
  li.appendChild(document.createTextNode(message));
  ul.appendChild(li);
});

socket.on("AddName", (username) => {
  OtherUsername = username;
  console.log(username);
});

const RemoveUnusedDivs = () => {
  //
  let alldivs = videoGrids.getElementsByTagName("div");
  for (var i = 0; i < alldivs.length; i++) {
    const e = alldivs[i].getElementsByTagName("video").length;
    if (e == 0) {
      alldivs[i].remove();
    }
  }
};

const connectToNewUser = (userId, streams, myname) => {
  const call = peer.call(userId, streams);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    //       console.log(userVideoStream);
    addVideoStream(video, userVideoStream, myname);
  });
  call.on("close", () => {
    video.remove();
    RemoveUnusedDivs();
  });
  peers[userId] = call;

  if (screenSharing) {
    console.log("sharee");
    /*
    let videoTrack = screenStream.getVideoTracks()[0];
    let sender = call.peerConnection.getSenders().find(function (s) {
      return s.track.kind == videoTrack.kind;
    });
    sender.replaceTrack(videoTrack);
    */
  }
};

const cancel = () => {
  $("#getCodeModal").modal("hide");
};

const copy = async () => {
  const origin = window.location.origin;
  const roomid = document.getElementById("roomid").innerText;
  await navigator.clipboard.writeText(`${origin}/join/${roomid}`);
};
const invitebox = () => {
  $("#getCodeModal").modal("show");
};

const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  var element = document.getElementById("mute-icon");
  var muteText = document.getElementById("muteText");
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    element.classList.add("fa-microphone-slash");
    element.classList.remove("fa-microphone");
    muteText.innerHTML = "Unmute";
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    element.classList.add("fa-microphone");
    element.classList.remove("fa-microphone-slash");
    muteText.innerHTML = "Mute";
  }
};

const VideomuteUnmute = () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  var element = document.getElementById("video-icon");
  var videoText = document.getElementById("videoText");
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    element.classList.add("fa-video-slash");
    element.classList.remove("fa-video");
    videoText.innerHTML = "Start Video";
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    element.classList.add("fa-video");
    element.classList.remove("fa-video-slash");
    videoText.innerHTML = "Stop Video";
  }
};

const showchat = () => {
  if (chat.hidden == false) {
    chat.hidden = true;
  } else {
    chat.hidden = false;
  }
};

const endCall = () => {
  sendPostMessageToParent({ eventType: "endCall" });
  window.location.replace("/");
};

const addVideoStream = (videoEl, stream, name) => {
  videoEl.srcObject = stream;
  videoEl.addEventListener("loadedmetadata", () => {
    videoEl.play();
  });
  const h1 = document.createElement("h1");
  const h1name = document.createTextNode(name);
  h1.appendChild(h1name);
  const videoGrid = document.createElement("div");
  videoGrid.classList.add("video-grid");
  videoGrid.appendChild(h1);
  videoGrids.appendChild(videoGrid);
  videoGrid.append(videoEl);
  RemoveUnusedDivs();
  let totalUsers = document.getElementsByTagName("video").length;
  if (totalUsers > 1) {
    for (let index = 0; index < totalUsers; index++) {
      document.getElementsByTagName("video")[index].style.width =
        100 / totalUsers + "%";
    }
  }
};

function setScreenSharingStream(stream) {
  myVideo.srcObject = stream;
  myVideo.muted = true;
  myVideo.play();
}

function stopScreenSharingStream() {
  myVideo.srcObject = myVideoStream;
  myVideo.muted = false;
  myVideo.play();
}

function startScreenShare() {
  if (screenSharing) {
    stopScreenSharing();
  }
  navigator.mediaDevices.getDisplayMedia({ video: true }).then((stream) => {
    setScreenSharingStream(stream);

    screenStream = stream;
    let videoTrack = screenStream.getVideoTracks()[0];
    videoTrack.onended = () => {
      stopScreenSharing();
    };
    if (peer) {
      Object.keys(peers).forEach((item) => {
        currentPeer = peers[item];
        currentPeer.peerConnection?.getSenders().map((sender) => {
          if (sender.track.kind == videoTrack.kind) {
            sender.replaceTrack(videoTrack);
          }
        });
      });

      document.getElementById("screenShare").style.visibility = "hidden";
      screenSharing = true;
    }
  });
}

function stopScreenSharing() {
  if (!screenSharing) return;
  stopScreenSharingStream();
  let videoTrack = myVideoStream.getVideoTracks()[0];
  if (peer) {
    Object.keys(peers).forEach((item) => {
      currentPeer = peers[item];
      currentPeer.peerConnection?.getSenders().map((sender) => {
        if (sender.track.kind == videoTrack.kind) {
          sender.replaceTrack(videoTrack);
        }
      });
    });
  }
  screenStream.getTracks().forEach(function (track) {
    track.stop();
  });
  document.getElementById("screenShare").style.visibility = "visible";
  screenSharing = false;
}
