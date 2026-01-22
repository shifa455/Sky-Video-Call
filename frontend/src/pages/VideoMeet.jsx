import React, { useRef, useState } from "react";
import io from "socket.io-client";
import { IconButton, Badge, TextField, Button, Snackbar } from "@mui/material";
import { Videocam, VideocamOff, Mic, MicOff, CallEnd, ScreenShare, StopScreenShare, Chat } from "@mui/icons-material";
import styles from "../styles/videoComponent.module.css";

// STUN server (TURN optional)
const peerConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // { urls: "turn:YOUR_TURN_SERVER", username: "user", credential: "pass" }
  ]
};

let peers = {};

export default function VideoMeet() {
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const socketIdRef = useRef(null);

  const [username, setUsername] = useState("");
  const [askForUsername, setAskForUsername] = useState(true);
  const [localStream, setLocalStream] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [videos, setVideos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [showChat, setShowChat] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, msg: "" });

  const attachStream = async (videoEl, stream, muted = false) => {
    if (!videoEl || !stream) return;
    videoEl.srcObject = null;
    videoEl.srcObject = stream;
    videoEl.muted = muted;
    videoEl.playsInline = true;
    try { await videoEl.play(); } catch (e) { console.warn("play failed", e); }
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: true });
      setLocalStream(stream);
      await attachStream(localVideoRef.current, stream, true);
      setVideoEnabled(true);
      setAudioEnabled(true);
    } catch (err) {
      console.error("Camera/Mic error:", err);
      setSnackbar({ open: true, msg: "Camera/Mic access denied" });
    }
  };

  const connectSocket = () => {
    socketRef.current = io("http://localhost:5000", { transports: ["websocket", "polling"] });
    const roomId = window.location.pathname.slice(1) || "default";

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", roomId);
    });

    socketRef.current.on("user-joined", (ids) => { (Array.isArray(ids) ? ids : [ids]).forEach(id => { if (id !== socketIdRef.current) createPeer(id); }); });

    socketRef.current.on("signal", (fromId, data) => handleSignal(fromId, data));

    socketRef.current.on("user-left", (id) => { if (peers[id]) peers[id].close(); delete peers[id]; setVideos(prev => prev.filter(v => v.id !== id)); });

    socketRef.current.on("chat-message", (msg, sender, senderId) => { setMessages(prev => [...prev, { msg, sender }]); if (senderId !== socketIdRef.current) setNewMessages(n => n + 1); });
  };

  const createPeer = (id) => {
    if (id === socketIdRef.current) return peers[id];
    if (peers[id]) return peers[id];
    const peer = new RTCPeerConnection(peerConfig);
    peers[id] = peer;

    if (localStream) localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

    peer.onicecandidate = (e) => { if (e.candidate) socketRef.current.emit("signal", id, { ice: e.candidate }); };
    peer.ontrack = (e) => setVideos(prev => prev.find(v => v.id === id) ? prev : [...prev, { id, stream: e.streams[0] }]);

    peer.createOffer().then(offer => peer.setLocalDescription(offer)).then(() => socketRef.current.emit("signal", id, { sdp: peer.localDescription })).catch(console.error);
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
      if (data.ice) await peer.addIceCandidate(new RTCIceCandidate(data.ice));
    } catch (err) { console.error(err); }
  };

  const toggleVideo = () => { if (!localStream) return; const track = localStream.getVideoTracks()[0]; if (!track) return; track.enabled = !track.enabled; setVideoEnabled(track.enabled); attachStream(localVideoRef.current, localStream, true); };
  const toggleAudio = () => { if (!localStream) return; const track = localStream.getAudioTracks()[0]; if (!track) return; track.enabled = !track.enabled; setAudioEnabled(track.enabled); };
  const toggleScreen = async () => {
    if (!localStream) return;
    if (screenSharing) { attachStream(localVideoRef.current, localStream, true); Object.values(peers).forEach(peer => { const sender = peer.getSenders().find(s => s.track?.kind === "video"); if (sender) sender.replaceTrack(localStream.getVideoTracks()[0]); }); setScreenSharing(false); return; }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      Object.values(peers).forEach(peer => { const sender = peer.getSenders().find(s => s.track?.kind === "video"); if (sender) sender.replaceTrack(screenTrack); });
      attachStream(localVideoRef.current, screenStream, true);
      setScreenSharing(true);
      screenTrack.onended = () => { attachStream(localVideoRef.current, localStream, true); Object.values(peers).forEach(peer => { const sender = peer.getSenders().find(s => s.track?.kind === "video"); if (sender) sender.replaceTrack(localStream.getVideoTracks()[0]); }); setScreenSharing(false); };
    } catch (err) { console.error(err); }
  };

  const sendMessage = () => { if (!message.trim()) return; socketRef.current.emit("chat-message", message, username); setMessage(""); };
  const endCall = () => { Object.values(peers).forEach(peer => peer.close()); peers = {}; if (localStream) localStream.getTracks().forEach(t => t.stop()); window.location.href = "/"; };
  const connect = async () => { if (!username.trim()) { setSnackbar({ open: true, msg: "Enter username" }); return; } setAskForUsername(false); await startLocalStream(); connectSocket(); };
  const toggleChat = () => { setShowChat(prev => !prev); if (!showChat) setNewMessages(0); };

  if (askForUsername) return (
    <div className={styles.lobby}>
      <h2>Enter your name</h2>
      <TextField value={username} onChange={e => setUsername(e.target.value)} />
      <Button variant="contained" onClick={connect}>Join</Button>
      <Snackbar open={snackbar.open} message={snackbar.msg} autoHideDuration={3000} onClose={() => setSnackbar({ open: false, msg: "" })} />
    </div>
  );

  return (
    <div className={styles.meetVideoContainer}>
      <video ref={localVideoRef} autoPlay muted playsInline className={styles.meetUserVideo} />
      {showChat && <div className={styles.chatRoom}>
        <h3>Chat</h3>
        <div className={styles.chattingArea}>{messages.map((m, i) => <p key={i}><b>{m.sender}:</b> {m.msg}</p>)}</div>
        <TextField value={message} onChange={e => setMessage(e.target.value)} placeholder="Type a message" />
        <Button onClick={sendMessage}>Send</Button>
      </div>}
      <div className={styles.buttonContainers}>
        <IconButton onClick={toggleVideo} style={{ color: videoEnabled ? "white" : "red" }}>{videoEnabled ? <Videocam /> : <VideocamOff />}</IconButton>
        <IconButton onClick={toggleAudio} style={{ color: audioEnabled ? "white" : "red" }}>{audioEnabled ? <Mic /> : <MicOff />}</IconButton>
        <IconButton onClick={toggleScreen} style={{ color: "white" }}>{screenSharing ? <StopScreenShare /> : <ScreenShare />}</IconButton>
        <IconButton onClick={endCall} style={{ color: "red" }}><CallEnd /></IconButton>
        <Badge badgeContent={newMessages} color="error"><IconButton onClick={toggleChat} style={{ color: "white" }}><Chat /></IconButton></Badge>
      </div>
      <div className={styles.conferenceView}>
        {videos.map(v => <video key={v.id} autoPlay playsInline className={styles.remoteVideo} ref={ref => { if (ref) attachStream(ref, v.stream, false); }} />)}
      </div>
    </div>
  );
}
