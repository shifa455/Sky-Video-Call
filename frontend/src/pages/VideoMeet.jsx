import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import {
  Badge,
  IconButton,
  TextField,
  Button,
} from "@mui/material";
import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  Chat as ChatIcon,
} from "@mui/icons-material";
import styles from "../styles/videoComponent.module.css";
import server from "../environment";

const peerConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
let connections = {};

export default function VideoMeetComponent() {
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);

  const [videos, setVideos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);

  const [username, setUsername] = useState("");
  const [askForUsername, setAskForUsername] = useState(true);
  const [showChat, setShowChat] = useState(true);

  // Get camera + mic permission once
  useEffect(() => {
    const getPermissions = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
      } catch (err) {
        console.log("Permission error:", err);
      }
    };
    getPermissions();
  }, []);

  // Initialize local stream
  const initLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: audioEnabled,
      });
      window.localStream = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.log(err);
    }
  };

  // Toggle video
  const handleVideoToggle = () => {
    setVideoEnabled((prev) => !prev);
    if (window.localStream) {
      window.localStream.getVideoTracks().forEach((track) => (track.enabled = !videoEnabled));
    }
  };

  // Toggle audio
  const handleAudioToggle = () => {
    setAudioEnabled((prev) => !prev);
    if (window.localStream) {
      window.localStream.getAudioTracks().forEach((track) => (track.enabled = !audioEnabled));
    }
  };

  // Screen sharing
  const handleScreenToggle = async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        for (let id in connections) {
          const sender = connections[id].getSenders().find((s) => s.track.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = async () => {
          const videoTrack = window.localStream.getVideoTracks()[0];
          for (let id in connections) {
            const sender = connections[id].getSenders().find((s) => s.track.kind === "video");
            if (sender) sender.replaceTrack(videoTrack);
          }
          setScreenSharing(false);
        };

        setScreenSharing(true);
      } catch (err) {
        console.log(err);
      }
    } else {
      // Optional: manually stop screen sharing
    }
  };

  // Chat
  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prev) => [...prev, { data, sender }]);
    if (socketIdSender !== socketIdRef.current) setNewMessages((prev) => prev + 1);
  };

  const sendMessage = () => {
    if (!message || !socketRef.current) return;
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

  // Socket + WebRTC setup
  const connectToSocketServer = () => {
    socketRef.current = io.connect(server, { secure: false });

    socketRef.current.on("signal", handleSignal);
    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", window.location.href);

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        setVideos((prev) => prev.filter((v) => v.socketId !== id));
        delete connections[id];
      });

      socketRef.current.on("user-joined", (idList) => {
        idList.forEach((id) => {
          if (id === socketIdRef.current || connections[id]) return;

          const peer = new RTCPeerConnection(peerConfig);
          connections[id] = peer;

          peer.onicecandidate = (event) => {
            if (event.candidate)
              socketRef.current.emit("signal", id, JSON.stringify({ ice: event.candidate }));
          };

          peer.ontrack = (event) => {
            setVideos((prev) => {
              const exists = prev.find((v) => v.socketId === id);
              if (exists) {
                return prev.map((v) => (v.socketId === id ? { ...v, stream: event.streams[0] } : v));
              } else {
                return [...prev, { socketId: id, stream: event.streams[0] }];
              }
            });
          };

          if (window.localStream)
            window.localStream.getTracks().forEach((track) => peer.addTrack(track, window.localStream));
        });
      });
    });
  };

  const handleSignal = async (fromId, message) => {
    const signal = JSON.parse(message);
    if (fromId === socketIdRef.current) return;

    const peer = connections[fromId];
    if (!peer) return;

    try {
      if (signal.sdp) {
        await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === "offer") {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socketRef.current.emit("signal", fromId, JSON.stringify({ sdp: peer.localDescription }));
        }
      }
      if (signal.ice) {
        await peer.addIceCandidate(new RTCIceCandidate(signal.ice));
      }
    } catch (err) {
      console.log(err);
    }
  };

  const connect = async () => {
    if (!username) return alert("Enter username");
    setAskForUsername(false);
    await initLocalStream();
    connectToSocketServer();
  };

  const handleEndCall = () => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch {}
    window.location.href = "/";
  };

  return (
    <div className={styles.meetContainer}>
      {askForUsername ? (
        <div className={styles.lobby}>
          <h2>Enter your name</h2>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
          />
          <Button variant="contained" onClick={connect}>
            Connect
          </Button>
          <div>
            <video ref={localVideoRef} autoPlay muted></video>
          </div>
        </div>
      ) : (
        <div className={styles.videoWrapper}>
          {/* Chat */}
          {showChat && (
            <div className={styles.chatRoom}>
              <h1>Chat</h1>
              <div className={styles.chatMessages}>
                {messages.length
                  ? messages.map((msg, i) => (
                      <div key={i}>
                        <p><b>{msg.sender}</b></p>
                        <p>{msg.data}</p>
                      </div>
                    ))
                  : "No messages yet"}
              </div>
              <div className={styles.chatInput}>
                <TextField
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  label="Type a message"
                  variant="outlined"
                />
                <Button onClick={sendMessage} variant="contained">Send</Button>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className={styles.controls}>
            <IconButton onClick={handleVideoToggle} style={{ color: "white" }}>
              {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
            <IconButton onClick={handleEndCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>
            <IconButton onClick={handleAudioToggle} style={{ color: "white" }}>
              {audioEnabled ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
            {screenAvailable && (
              <IconButton onClick={handleScreenToggle} style={{ color: "white" }}>
                {screenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
              </IconButton>
            )}
            <Badge badgeContent={newMessages} max={999} color="error">
              <IconButton onClick={() => setShowChat(!showChat)} style={{ color: "white" }}>
                <ChatIcon />
              </IconButton>
            </Badge>
          </div>

          {/* Videos */}
          <video ref={localVideoRef} autoPlay muted className={styles.localVideo}></video>
          <div className={styles.remoteVideos}>
            {videos.map((v) => (
              <video
                key={v.socketId}
                ref={(ref) => { if (ref) ref.srcObject = v.stream; }}
                autoPlay
                playsInline
              ></video>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
