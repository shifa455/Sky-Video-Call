import React, { useRef, useState } from "react";
import io from "socket.io-client";
import {
  IconButton,
  Badge,
  TextField,
  Button,
  Snackbar,
} from "@mui/material";
import {
  Videocam,
  VideocamOff,
  Mic,
  MicOff,
  CallEnd,
  ScreenShare,
  StopScreenShare,
  Chat,
} from "@mui/icons-material";

import styles from "../styles/videoComponent.module.css";
import server from "../environment";

const peerConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let peers = {};

export default function VideoMeet() {
  const socketRef = useRef();
  const localVideoRef = useRef();
  const socketIdRef = useRef();

  const [username, setUsername] = useState("");
  const [askForUsername, setAskForUsername] = useState(true);

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  const [videos, setVideos] = useState([]); // [{ id, stream }]
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [showChat, setShowChat] = useState(true);

  const [snackbar, setSnackbar] = useState({ open: false, msg: "" });

  // ---------------- MEDIA ----------------
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      window.localStream = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      console.log("Audio tracks:", stream.getAudioTracks());
    } catch (err) {
      console.error("Camera/Mic access error:", err);
      setSnackbar({ open: true, msg: "Camera/Mic access denied or unavailable" });
    }
  };

  // ---------------- SOCKET ----------------
  const connectSocket = () => {
    socketRef.current = io(server);
    const roomId = window.location.pathname.slice(1);

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", roomId);
    });

    // Server may emit (newUserId, allIds) or just an array
    socketRef.current.on("user-joined", (newUserId, allIds) => {
      const ids = Array.isArray(allIds)
        ? allIds
        : Array.isArray(newUserId)
        ? newUserId
        : [newUserId];
      ids.forEach(createPeer);
    });

    socketRef.current.on("signal", handleSignal);

    socketRef.current.on("user-left", (id) => {
      if (peers[id]) peers[id].close();
      delete peers[id];
      setVideos((prev) => prev.filter((v) => v.id !== id));
    });

    socketRef.current.on("chat-message", (msg, sender, senderId) => {
      setMessages((prev) => [...prev, { msg, sender }]);
      if (senderId !== socketIdRef.current) setNewMessages((n) => n + 1);
    });
  };

  // ---------------- WEBRTC ----------------
  const createPeer = (id) => {
    if (id === socketIdRef.current || peers[id]) return peers[id];

    const peer = new RTCPeerConnection(peerConfig);
    peers[id] = peer;

    window.localStream.getTracks().forEach((track) =>
      peer.addTrack(track, window.localStream)
    );

    peer.onicecandidate = (e) => {
      if (e.candidate) socketRef.current.emit("signal", id, { ice: e.candidate });
    };

    peer.ontrack = (e) => {
      setVideos((prev) => {
        if (prev.find((v) => v.id === id)) return prev;
        return [...prev, { id, stream: e.streams[0] }];
      });
    };

    peer.createOffer().then((offer) => {
      peer.setLocalDescription(offer);
      socketRef.current.emit("signal", id, { sdp: offer });
    });

    return peer;
  };

  const handleSignal = async ({ from, data }) => {
    if (from === socketIdRef.current) return;
    const peer = peers[from] || createPeer(from);

    if (data.sdp) {
      await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if (data.sdp.type === "offer") {
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socketRef.current.emit("signal", from, { sdp: answer });
      }
    }

    if (data.ice) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(data.ice));
      } catch (err) {
        console.error("Failed to add ICE candidate:", err);
      }
    }
  };

  // ---------------- CONTROLS ----------------
  const toggleVideo = () => {
    window.localStream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setVideoEnabled(t.enabled);
    });
  };

  const toggleAudio = () => {
    window.localStream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setAudioEnabled(t.enabled);
    });
  };

  const toggleScreen = async () => {
    if (screenSharing) return;
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];

    Object.values(peers).forEach((peer) => {
      const sender = peer.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(screenTrack);
    });

    screenTrack.onended = () => {
      const videoTrack = window.localStream.getVideoTracks()[0];
      Object.values(peers).forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(videoTrack);
      });
      setScreenSharing(false);
    };

    setScreenSharing(true);
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

  const endCall = () => {
    Object.values(peers).forEach((peer) => peer.close());
    peers = {};
    window.localStream.getTracks().forEach((t) => t.stop());
    window.location.href = "/";
  };

  const connect = async () => {
    if (!username.trim()) {
      setSnackbar({ open: true, msg: "Enter username" });
      return;
    }
    setAskForUsername(false);
    await startLocalStream();
    connectSocket();
  };

  // ---------------- UI ----------------
  if (askForUsername) {
    return (
      <div className={styles.lobby}>
        <h2>Enter your name</h2>
        <TextField value={username} onChange={(e) => setUsername(e.target.value)} />
        <Button variant="contained" onClick={connect}>Join</Button>
        <Snackbar
          open={snackbar.open}
          message={snackbar.msg}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ open: false, msg: "" })}
        />
      </div>
    );
  }

  return (
    <div className={styles.meetVideoContainer}>
      {/* Local video preview */}
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className={styles.localVideo}
      />

      {/* Chat panel */}
      {showChat && (
        <div className={styles.chatRoom}>
          <h3>Chat</h3>
          {messages.map((m, i) => (
            <p key={i}><b>{m.sender}:</b> {m.msg}</p>
          ))}
          <TextField value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button onClick={sendMessage}>Send</Button>
        </div>
      )}

      {/* Control buttons */}
      <div className={styles.buttonContainers}>
        <IconButton onClick={toggleVideo} style={{ color: "white" }}>
          {videoEnabled ? <Videocam /> : <VideocamOff />}
        </IconButton>

        <IconButton onClick={toggleAudio} style={{ color: "white" }}>
          {audioEnabled ? <Mic /> : <MicOff />}
        </IconButton>

        <IconButton onClick={toggleScreen} style={{ color: "white" }}>
          {screenSharing ? <StopScreenShare /> : <ScreenShare />}
        </IconButton>

        <IconButton onClick={endCall} style={{ color: "red" }}>
          <CallEnd />
        </IconButton>

        <Badge badgeContent={newMessages} color="error">
          <IconButton onClick={() => setShowChat(!showChat)} style={{ color: "white" }}>
            <Chat />
          </IconButton>
        </Badge>
      </div>

      {/* Remote videos + audio */}
      <div className={styles.conferenceView}>
        {videos.map((v) => (
          <div key={v.id} className={styles.remoteContainer}>
            <video
              autoPlay
              playsInline
              className={styles.remoteVideo}
              ref={(ref) => {
                if (ref) ref.srcObject = v.stream;
              }}
            />
            <audio
              autoPlay
              playsInline
              ref={(ref) => {
                if (ref) ref.srcObject = v.stream;
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
