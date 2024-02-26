const socket = io("/");
const main__chat__window = document.getElementById("main__chat_window");
const videoGrids = document.getElementById("video-grids");
const myVideo = document.createElement("video");
const chat = document.getElementById("chat");
const isPeerCall = false; // future purpose
let myname = "";
let OtherUsername = "";
chat.hidden = true;
// myVideo.muted = true;

document.getElementById("roomid").innerHTML = `<strong>${roomId}</strong>`;

let defaultConfigObj = {};

window.onload = () => {
  $(document).ready(function () {
    let searchStr = window.location.search.substring("1");
    if (searchStr) {
      searchStr.split("&").forEach((item) => {
        const [name, value] = item.split("=");
        defaultConfigObj[name] = decodeURIComponent(value);
      });
      myname = defaultConfigObj.name;
    }

    if (defaultConfigObj.visitNotesEnabled) {
      let visitNotesDiv = document.getElementsByClassName("visitNotes");
      visitNotesDiv[1].classList.add("main_controls_button");
      visitNotesDiv[1].innerHTML +=
        "<button type='button' class='btn btn-primary' onClick='visitNotesClick()'><span>Visit Notes</span></button>";
      visitNotesDiv[0].innerHTML +=
        "<button type='button' class='dropdown-item' onClick='visitNotesClick()'><i class='fas fa-notes-medical'></i><span>Visit Notes</span></button>";
    }
  });
};

var peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: window.location.port,
});

let screenStream;
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
    video: {
      width: { min: 320, ideal: 1280, max: 1280 },
      height: { min: 180, ideal: 720, max: 720 },
    },
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream, myname);
    initStreams();

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

      call.on("close", function () {
        video.remove();
        RemoveUnusedDivs();
      });

      peers[call.peer] = call;
    },
    function (err) {
      console.log("Failed to get local stream", err);
    }
  );
});

peer.on("open", (id) => {
  sendPostMessageToParent({ eventType: "userconnect" });
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

socket.on("endCallForAll", (id) => {
  if (peers[id]) peers[id].close();
  endCall();
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

const replaceStreams = (peerObj, streamData) => {
  let videoTrack = streamData.getVideoTracks()[0];
  peerObj.peerConnection?.getSenders().map((sender) => {
    if (sender.track.kind == videoTrack.kind) {
      sender.replaceTrack(videoTrack);
    }
  });
};

const connectToNewUser = (userId, streams, myname) => {
  const call = peer.call(userId, streams);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, myname);
  });
  call.on("close", () => {
    video.remove();
    RemoveUnusedDivs();
  });
  peers[userId] = call;

  if (screenSharing) {
    setTimeout(() => {
      if (isPeerCall) {
        peer.call(userId, screenStream);
      } else {
        replaceStreams(call, screenStream);
      }
    }, 1000); // dont remove this timeout
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

const initStreams = () => {
  var element = document.getElementById("mute-icon");
  var muteText = document.getElementById("muteText");
  if (defaultConfigObj.startWithAudioMuted === "true") {
    myVideoStream.getAudioTracks()[0].enabled = false;
    element.classList.add("fa-microphone-slash");
    element.classList.remove("fa-microphone");
    muteText.innerHTML = "Unmute";
  }

  var element1 = document.getElementById("video-icon");
  var videoText = document.getElementById("videoText");
  if (defaultConfigObj.startWithVideoMuted === "true") {
    myVideoStream.getVideoTracks()[0].enabled = false;
    element1.classList.add("fa-video-slash");
    element1.classList.remove("fa-video");
    videoText.innerHTML = "Start Video";
  }
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

const endCallForAll = () => {
  sendPostMessageToParent({ eventType: "endCallForAll" });
  window.location.replace("/");
  socket.emit("endCallForAll", "");
};

const visitNotesClick = () => {
  sendPostMessageToParent({ eventType: "visitNotes" });
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
  const options = {
    audio: true,
    video: { displaySurface: "monitor" },
  };
  navigator.mediaDevices.getDisplayMedia(options).then((stream) => {
    screenStream = stream;
    let video;
    if (isPeerCall) {
      video = document.createElement("video");
      addVideoStream(video, stream, myname);
    } else {
      setScreenSharingStream(stream);
    }

    let videoTrack = screenStream.getVideoTracks()[0];
    videoTrack.onended = () => {
      if (isPeerCall) {
        video.remove();
        RemoveUnusedDivs();
        document.getElementById("screenShare").style.visibility = "visible";
        screenSharing = false;
      } else {
        stopScreenSharing();
      }
    };
    if (peer) {
      if (isPeerCall) {
        Object.keys(peers).forEach((item) => {
          peer.call(item, stream);
        });
      } else {
        Object.keys(peers).forEach((item) => {
          replaceStreams(peers[item], screenStream);
        });
      }

      document.getElementById("screenShare").style.visibility = "hidden";
      screenSharing = true;
    }
  });
}

function stopScreenSharing() {
  if (!screenSharing) return;
  stopScreenSharingStream();
  if (peer) {
    Object.keys(peers).forEach((item) => {
      replaceStreams(peers[item], myVideoStream);
    });
  }
  screenStream.getTracks().forEach(function (track) {
    track.stop();
  });
  document.getElementById("screenShare").style.visibility = "visible";
  screenSharing = false;
}

/*
function getSupportedMimeTypes() {
  const possibleTypes = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=h264,opus",
    "video/mp4;codecs=h264,aac",
    "video/webm;codecs=av01,opus",
  ];
  return possibleTypes.filter((mimeType) => {
    return MediaRecorder.isTypeSupported(mimeType);
  });
}

let mediaRecorder;
let recordedBlobs;

function handleDataAvailable(event) {
  console.log("handleDataAvailable", event);
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

const recordButton = document.getElementById("recordText");
const recordingHandle = () => {
  if (recordButton.textContent === "Start Recording") {
    startRecording();
  } else {
    stopRecording();
    recordButton.textContent = "Start Recording";
  }
};

const download = () => {
  const blob = new Blob(recordedBlobs, { type: "video/webm" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = "test.webm";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
};

function startRecording() {
  recordedBlobs = [];
  const mimeType = getSupportedMimeTypes()[0];
  const options = { mimeType };

  try {
    mediaRecorder = new MediaRecorder(myVideoStream, options);
  } catch (e) {
    console.error("Exception while creating MediaRecorder:", e);
    console.log(`Exception while creating MediaRecorder: ${JSON.stringify(e)}`);
    return;
  }

  console.log("Created MediaRecorder", mediaRecorder, "with options", options);
  recordButton.textContent = "Stop Recording";
  mediaRecorder.onstop = (event) => {
    console.log("Recorder stopped: ", event);
    console.log("Recorded Blobs: ", recordedBlobs);
  };
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start();
  console.log("MediaRecorder started", mediaRecorder);
}

function stopRecording() {
  mediaRecorder.stop();
  setTimeout(() => {
    download();
  }, 100);
}
*/
