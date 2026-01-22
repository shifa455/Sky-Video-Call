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
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const socketIdRef = useRef(null);

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
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      stream.getVideoTracks().forEach((t) => (t.enabled = true));
      stream.getAudioTracks().forEach((t) => (t.enabled = true));

      window.localStream = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      console.log("Local tracks:", {
        video: stream.getVideoTracks().map((t) => t.getSettings()),
        audio: stream.getAudioTracks().map((t) => t.getSettings()),
      });
    } catch (err) {
      console.error("Camera/Mic access error:", err);
      setSnackbar({ open: true, msg: "Camera/Mic access denied or unavailable" });
      throw err;
    }
  };

  // ---------------- SOCKET ----------------
  const connectSocket = () => {
    socketRef.current = io(server, { transports: ["websocket", "polling"] });
    const roomId = window.location.pathname.slice(1) || "default";

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", roomId);
    });

    // Server sends list of other user IDs
    socketRef.current.on("user-joined", (ids) => {
      const idList = Array.isArray(ids) ? ids : [ids];
      idList.forEach((id) => {
        if (id && id !== socketIdRef.current) createPeer(id);
      });
    });

    // Keep signaling shape consistent: (fromId, data)
    socketRef.current.on("signal", (fromId, data) => {
      handleSignal(fromId, data);
    });

    socketRef.current.on("user-left", (id) => {
      if (peers[id]) {
        try { peers[id].close(); } catch {}
      }
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
    if (id === socketIdRef.current) return peers[id];
    if (peers[id]) return peers[id];

    const peer = new RTCPeerConnection(peerConfig);
    peers[id] = peer;

    if (window.localStream) {
      window.localStream.getTracks().forEach((track) =>
        peer.addTrack(track, window.localStream)
      );
    }

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit("signal", id, { ice: e.candidate });
      }
    };

    peer.ontrack = (e) => {
      setVideos((prev) => {
        if (prev.find((v) => v.id === id)) return prev;
        return [...prev, { id, stream: e.streams[0] }];
      });
    };

    peer.createOffer()
      .then((offer) => peer.setLocalDescription(offer))
      .then(() => {
        socketRef.current.emit("signal", id, { sdp: peer.localDescription });
      })
      .catch((err) => console.error("Offer error:", err));

    return peer;
  };

  const handleSignal = async (fromId, data) => {
    if (fromId === socketIdRef.current) return;

    const peer = peers[fromId] || createPeer(fromId);

    try {
      if (data.sdp) {
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (data.sdp.type === "offer") {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socketRef.current.emit("signal", fromId, { sdp: peer.localDescription });
        }
      }
      if (data.ice) {
        await peer.addIceCandidate(new RTCIceCandidate(data.ice));
      }
    } catch (err) {
      console.error("Signal handling error:", err);
    }
  };

  // ---------------- CONTROLS ----------------
  const toggleVideo = () => {
    const tracks = window.localStream?.getVideoTracks() || [];
    if (tracks.length > 0) {
      const newState = !tracks[0].enabled;
      tracks.forEach((t) => (t.enabled = newState));
      setVideoEnabled(newState);
    }
  };

  const toggleAudio = () => {
    const tracks = window.localStream?.getAudioTracks() || [];
    if (tracks.length > 0) {
      const newState = !tracks[0].enabled;
      tracks.forEach((t) => (t.enabled = newState));
      setAudioEnabled(newState);
    }
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
    if (window.localStream) {
      window.localStream.getTracks().forEach((t) => t.stop());
    }
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
        className={styles.meetUserVideo /* or styles.localVideo if you prefer */}
      />

      {/* Chat panel */}
      {showChat && (
        <div className={styles.chatRoom}>
          <h3>Chat</h3>
          <div className={styles.chattingArea}>
            {messages.map((m, i) => (
              <p key={i}><b>{m.sender}:</b> {m.msg}</p>
            ))}
          </div>
          <TextField
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message"
          />
          <Button onClick={sendMessage}>Send</Button>
        </div>
      )}

      {/* Control buttons */}
      <div className={styles.buttonContainers}>
        <IconButton
          onClick={toggleVideo}
          style={{ color: videoEnabled ? "white" : "red" }}
          aria-label="toggle video"
        >
          {videoEnabled ? <Videocam /> : <VideocamOff />}
        </IconButton>

        <IconButton
          onClick={toggleAudio}
          style={{ color: audioEnabled ? "white" : "red" }}
          aria-label="toggle audio"
        >
          {audioEnabled ? <Mic /> : <MicOff />}
        </IconButton>

        <IconButton onClick={toggleScreen} style={{ color: "white" }} aria-label="toggle screen share">
          {screenSharing ? <StopScreenShare /> : <ScreenShare />}
        </IconButton>

        <IconButton onClick={endCall} style={{ color: "red" }} aria-label="end call">
          <CallEnd />
        </IconButton>

        <Badge badgeContent={newMessages} color="error">
          <IconButton onClick={() => setShowChat(!showChat)} style={{ color: "white" }} aria-label="toggle chat">
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
            {/* Separate audio element to ensure audio plays even if video is muted locally */}
            <audio
              id={`remote-${v.id}-audio`}
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
