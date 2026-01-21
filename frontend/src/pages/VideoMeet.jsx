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

export default function VideoMeetComponent() {
  const socketRef = useRef();
  const localVideoRef = useRef();
  const socketIdRef = useRef();

  const [username, setUsername] = useState("");
  const [askForUsername, setAskForUsername] = useState(true);

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  const [videos, setVideos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [showChat, setShowChat] = useState(true);

  const [snackbar, setSnackbar] = useState({ open: false, msg: "" });

  /* ------------------ MEDIA ------------------ */
  const startLocalStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    window.localStream = stream;
    localVideoRef.current.srcObject = stream;
  };

  /* ------------------ SOCKET ------------------ */
  const connectSocket = () => {
    socketRef.current = io(server);

    const roomId = window.location.pathname.slice(1); // only path, not full URL

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", roomId);
    });

    socketRef.current.on("user-joined", (ids) => {
      ids.forEach(createPeer);
    });

    socketRef.current.on("signal", handleSignal);

    socketRef.current.on("user-left", (id) => {
      if (peers[id]) {
        peers[id].close();
        delete peers[id];
      }
      setVideos((prev) => prev.filter((v) => v.id !== id));
    });

    socketRef.current.on("chat-message", (msg, sender, senderId) => {
      setMessages((prev) => [...prev, { msg, sender }]);
      if (senderId !== socketIdRef.current) setNewMessages((n) => n + 1);
    });
  };

  /* ------------------ WEBRTC ------------------ */
  const createPeer = (id) => {
    if (id === socketIdRef.current || peers[id]) return peers[id];

    const peer = new RTCPeerConnection(peerConfig);
    peers[id] = peer;

    window.localStream.getTracks().forEach((track) => peer.addTrack(track, window.localStream));

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

    let peer = peers[from];
    if (!peer) peer = createPeer(from);

    if (data.sdp) {
      await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if (data.sdp.type === "offer") {
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socketRef.current.emit("signal", from, { sdp: answer });
      }
    }

    if (data.ice) await peer.addIceCandidate(new RTCIceCandidate(data.ice));
  };

  /* ------------------ CONTROLS ------------------ */
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
    if (!screenSharing) {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      Object.values(peers).forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track && s.track.kind === "video");
        sender.replaceTrack(screenTrack);
      });

      screenTrack.onended = () => {
        const videoTrack = window.localStream.getVideoTracks()[0];
        Object.values(peers).forEach((peer) => {
          const sender = peer.getSenders().find((s) => s.track && s.track.kind === "video");
          sender.replaceTrack(videoTrack);
        });
        setScreenSharing(false);
      };

      setScreenSharing(true);
    } else {
      // Stop screen sharing manually
      const videoTrack = window.localStream.getVideoTracks()[0];
      Object.values(peers).forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track && s.track.kind === "video");
        sender.replaceTrack(videoTrack);
      });
      setScreenSharing(false);
    }
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

  /* ------------------ UI ------------------ */
  if (askForUsername) {
    return (
      <div className={styles.lobby}>
        <h2>Enter your name</h2>
        <TextField value={username} onChange={(e) => setUsername(e.target.value)} />
        <Button variant="contained" onClick={connect}>Join</Button>
        <video ref={localVideoRef} autoPlay muted />
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

      <video className={styles.meetUserVideo} ref={localVideoRef} autoPlay muted />

      <div className={styles.conferenceView}>
        {videos.map((v) => (
          <video
            key={v.id}
            autoPlay
            playsInline
            ref={(ref) => { if (ref) ref.srcObject = v.stream; ref.muted = false; }}
          />
        ))}
      </div>
    </div>
  );
}





// import React, { useRef, useState } from "react";
// import io from "socket.io-client";
// import {
//   IconButton,
//   Badge,
//   TextField,
//   Button,
// } from "@mui/material";
// import {
//   Videocam,
//   VideocamOff,
//   Mic,
//   MicOff,
//   CallEnd,
//   ScreenShare,
//   StopScreenShare,
//   Chat,
// } from "@mui/icons-material";

// import styles from "../styles/videoComponent.module.css";
// import server from "../environment";

// const peerConfig = {
//   iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
// };

// let peers = {};

// export default function VideoMeetComponent() {
//   const socketRef = useRef();
//   const localVideoRef = useRef();
//   const socketIdRef = useRef();

//   const [username, setUsername] = useState("");
//   const [askForUsername, setAskForUsername] = useState(true);

//   const [videoEnabled, setVideoEnabled] = useState(true);
//   const [audioEnabled, setAudioEnabled] = useState(true);
//   const [screenSharing, setScreenSharing] = useState(false);

//   const [videos, setVideos] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState("");
//   const [newMessages, setNewMessages] = useState(0);
//   const [showChat, setShowChat] = useState(true);

//   /* ------------------ MEDIA ------------------ */

//   const startLocalStream = async () => {
//     const stream = await navigator.mediaDevices.getUserMedia({
//       video: true,
//       audio: {
//         echoCancellation: true,
//         noiseSuppression: true,
//         autoGainControl: true,
//       },
//     });

//     window.localStream = stream;
//     localVideoRef.current.srcObject = stream;
//   };

//   /* ------------------ SOCKET ------------------ */

//   const connectSocket = () => {
//     socketRef.current = io(server);

//     socketRef.current.on("connect", () => {
//       socketIdRef.current = socketRef.current.id;
//       socketRef.current.emit("join-call", window.location.href);
//     });

//     socketRef.current.on("user-joined", (ids) => {
//       ids.forEach(createPeer);
//     });

//     socketRef.current.on("signal", handleSignal);

//     socketRef.current.on("user-left", (id) => {
//       setVideos((prev) => prev.filter((v) => v.id !== id));
//       delete peers[id];
//     });

//     socketRef.current.on("chat-message", (msg, sender, senderId) => {
//       setMessages((prev) => [...prev, { msg, sender }]);
//       if (senderId !== socketIdRef.current) {
//         setNewMessages((n) => n + 1);
//       }
//     });
//   };

//   /* ------------------ WEBRTC ------------------ */

//   const createPeer = (id) => {
//     if (id === socketIdRef.current || peers[id]) return peers[id];

//     const peer = new RTCPeerConnection(peerConfig);
//     peers[id] = peer;

//     window.localStream.getTracks().forEach((track) => {
//       peer.addTrack(track, window.localStream);
//     });

//     peer.onicecandidate = (e) => {
//       if (e.candidate) {
//         socketRef.current.emit("signal", id, { ice: e.candidate });
//       }
//     };

//     peer.ontrack = (e) => {
//       setVideos((prev) => {
//         if (prev.find((v) => v.id === id)) return prev;
//         return [...prev, { id, stream: e.streams[0] }];
//       });
//     };

//     peer.createOffer().then((offer) => {
//       peer.setLocalDescription(offer);
//       socketRef.current.emit("signal", id, { sdp: offer });
//     });

//     return peer;
//   };

//   const handleSignal = async ({ from, data }) => {
//     if (from === socketIdRef.current) return;

//     let peer = peers[from];
//     if (!peer) peer = createPeer(from);

//     if (data.sdp) {
//       await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));

//       if (data.sdp.type === "offer") {
//         const answer = await peer.createAnswer();
//         await peer.setLocalDescription(answer);
//         socketRef.current.emit("signal", from, { sdp: answer });
//       }
//     }

//     if (data.ice) {
//       await peer.addIceCandidate(new RTCIceCandidate(data.ice));
//     }
//   };

//   /* ------------------ CONTROLS ------------------ */

//   const toggleVideo = () => {
//     window.localStream.getVideoTracks().forEach((t) => {
//       t.enabled = !t.enabled;
//       setVideoEnabled(t.enabled);
//     });
//   };

//   const toggleAudio = () => {
//     window.localStream.getAudioTracks().forEach((t) => {
//       t.enabled = !t.enabled;
//       setAudioEnabled(t.enabled);
//     });
//   };

//   const toggleScreen = async () => {
//     if (screenSharing) return;

//     const screenStream = await navigator.mediaDevices.getDisplayMedia({
//       video: true,
//     });

//     const screenTrack = screenStream.getVideoTracks()[0];

//     Object.values(peers).forEach((peer) => {
//       const sender = peer
//         .getSenders()
//         .find((s) => s.track && s.track.kind === "video");
//       sender.replaceTrack(screenTrack);
//     });

//     screenTrack.onended = () => {
//       const videoTrack = window.localStream.getVideoTracks()[0];
//       Object.values(peers).forEach((peer) => {
//         const sender = peer
//           .getSenders()
//           .find((s) => s.track && s.track.kind === "video");
//         sender.replaceTrack(videoTrack);
//       });
//       setScreenSharing(false);
//     };

//     setScreenSharing(true);
//   };

//   const sendMessage = () => {
//     socketRef.current.emit("chat-message", message, username);
//     setMessage("");
//   };

//   const endCall = () => {
//     window.localStream.getTracks().forEach((t) => t.stop());
//     window.location.href = "/";
//   };

//   const connect = async () => {
//     if (!username) return alert("Enter username");
//     setAskForUsername(false);
//     await startLocalStream();
//     connectSocket();
//   };

//   /* ------------------ UI ------------------ */

//   if (askForUsername) {
//     return (
//       <div className={styles.lobby}>
//         <h2>Enter your name</h2>
//         <TextField
//           value={username}
//           onChange={(e) => setUsername(e.target.value)}
//         />
//         <Button variant="contained" onClick={connect}>
//           Join
//         </Button>
//         <video ref={localVideoRef} autoPlay muted />
//       </div>
//     );
//   }

//   return (
//     <div className={styles.meetVideoContainer}>
//       {showChat && (
//         <div className={styles.chatRoom}>
//           <h3>Chat</h3>
//           {messages.map((m, i) => (
//             <p key={i}>
//               <b>{m.sender}:</b> {m.msg}
//             </p>
//           ))}
//           <TextField
//             value={message}
//             onChange={(e) => setMessage(e.target.value)}
//           />
//           <Button onClick={sendMessage}>Send</Button>
//         </div>
//       )}

//       <div className={styles.buttonContainers}>
//         <IconButton onClick={toggleVideo} style={{ color: "white" }}>
//           {videoEnabled ? <Videocam /> : <VideocamOff />}
//         </IconButton>

//         <IconButton onClick={toggleAudio} style={{ color: "white" }}>
//           {audioEnabled ? <Mic /> : <MicOff />}
//         </IconButton>

//         <IconButton onClick={toggleScreen} style={{ color: "white" }}>
//           {screenSharing ? <StopScreenShare /> : <ScreenShare />}
//         </IconButton>

//         <IconButton onClick={endCall} style={{ color: "red" }}>
//           <CallEnd />
//         </IconButton>

//         <Badge badgeContent={newMessages} color="error">
//           <IconButton
//             onClick={() => setShowChat(!showChat)}
//             style={{ color: "white" }}
//           >
//             <Chat />
//           </IconButton>
//         </Badge>
//       </div>

//       <video
//         className={styles.meetUserVideo}
//         ref={localVideoRef}
//         autoPlay
//         muted
//       />

//       <div className={styles.conferenceView}>
//         {videos.map((v) => (
//           <video
//             key={v.id}
//             autoPlay
//             playsInline
//             ref={(ref) => {
//               if (ref) {
//                 ref.srcObject = v.stream;
//                 ref.muted = false; // 🔊 AUDIO FIX
//               }
//             }}
//           />
//         ))}
//       </div>
//     </div>
//   );
// }
