// frontend/src/components/VideoMeet.js
import React, { useRef, useState, useEffect } from "react";
import io from "socket.io-client";
import { IconButton, Button, TextField, Badge } from "@mui/material";
import { Videocam, VideocamOff, Mic, MicOff, CallEnd, ScreenShare, StopScreenShare, Chat } from "@mui/icons-material";

const peerConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
let peers = {};

export default function VideoMeet({ roomId, username }) {
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  const [videos, setVideos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    const startLocal = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      window.localStream = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      socketRef.current = io("http://localhost:8000", { transports: ["websocket"] });
      socketRef.current.emit("join-meeting", roomId);

      socketRef.current.on("user-joined", (id) => createPeer(id));
      socketRef.current.on("signal", (fromId, data) => handleSignal(fromId, data));
      socketRef.current.on("user-left", (id) => {
        if (peers[id]) peers[id].close();
        delete peers[id];
        setVideos((prev) => prev.filter(v => v.id !== id));
      });
      socketRef.current.on("chat-message", (msg, sender) => {
        setMessages(prev => [...prev, { msg, sender }]);
        setNewMessages((n) => n + 1);
      });
    };

    startLocal();
  }, []);

  const createPeer = (id) => {
    if (peers[id]) return peers[id];

    const peer = new RTCPeerConnection(peerConfig);
    peers[id] = peer;

    if (window.localStream) window.localStream.getTracks().forEach(t => peer.addTrack(t, window.localStream));

    peer.onicecandidate = (e) => e.candidate && socketRef.current.emit("signal", id, { ice: e.candidate });
    peer.ontrack = (e) => setVideos(prev => prev.find(v => v.id === id) ? prev : [...prev, { id, stream: e.streams[0] }]);

    peer.createOffer()
      .then(o => peer.setLocalDescription(o))
      .then(() => socketRef.current.emit("signal", id, { sdp: peer.localDescription }));

    return peer;
  };

  const handleSignal = async (fromId, data) => {
    const peer = peers[fromId] || createPeer(fromId);

    if (data.sdp) {
      await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if (data.sdp.type === "offer") {
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socketRef.current.emit("signal", fromId, { sdp: peer.localDescription });
      }
    }
    if (data.ice) await peer.addIceCandidate(new RTCIceCandidate(data.ice));
  };

  const toggleVideo = () => {
    const track = window.localStream?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setVideoEnabled(track.enabled); }
  };

  const toggleAudio = () => {
    const track = window.localStream?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setAudioEnabled(track.enabled); }
  };

  const toggleScreen = async () => {
    if (screenSharing) return;
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];

    Object.values(peers).forEach(peer => {
      const sender = peer.getSenders().find(s => s.track?.kind === "video");
      if (sender) sender.replaceTrack(screenTrack);
    });

    screenTrack.onended = () => {
      const videoTrack = window.localStream.getVideoTracks()[0];
      Object.values(peers).forEach(peer => {
        const sender = peer.getSenders().find(s => s.track?.kind === "video");
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
    Object.values(peers).forEach(peer => peer.close());
    if (window.localStream) window.localStream.getTracks().forEach(t => t.stop());
    window.location.href = "/";
  };

  return (
    <div>
      <video ref={localVideoRef} autoPlay muted playsInline />
      <div>
        {videos.map(v => (
          <video key={v.id} autoPlay playsInline ref={r => r && (r.srcObject = v.stream)} />
        ))}
      </div>

      <div>
        <IconButton onClick={toggleVideo}>{videoEnabled ? <Videocam /> : <VideocamOff />}</IconButton>
        <IconButton onClick={toggleAudio}>{audioEnabled ? <Mic /> : <MicOff />}</IconButton>
        <IconButton onClick={toggleScreen}>{screenSharing ? <StopScreenShare /> : <ScreenShare />}</IconButton>
        <IconButton onClick={endCall}><CallEnd /></IconButton>

        <Badge badgeContent={newMessages} color="error">
          <IconButton onClick={() => setShowChat(!showChat)}><Chat /></IconButton>
        </Badge>
      </div>

      {showChat && (
        <div>
          {messages.map((m,i) => <p key={i}><b>{m.sender}:</b> {m.msg}</p>)}
          <TextField value={message} onChange={e => setMessage(e.target.value)} />
          <Button onClick={sendMessage}>Send</Button>
        </div>
      )}
    </div>
  );
}
