import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import server from '../environment';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

export default function VideoMeetComponent() {

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);

    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState([]);

    let [audio, setAudio] = useState();

    let [screen, setScreen] = useState();

    let [showModal, setModal] = useState(true);

    let [screenAvailable, setScreenAvailable] = useState();

    let [messages, setMessages] = useState([])

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(3);

    let [askForUsername, setAskForUsername] = useState(true);

    let [username, setUsername] = useState("");

    const videoRef = useRef([])

    let [videos, setVideos] = useState([])

    // TODO
    // if(isChrome() === false) {


    // }

    useEffect(() => {
        console.log("HELLO")
        getPermissions();

    })

    let getDislayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .then((stream) => { })
                    .catch((e) => console.log(e))
            }
        }
    }

    const getPermissions = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoPermission) {
                setVideoAvailable(true);
                console.log('Video permission granted');
            } else {
                setVideoAvailable(false);
                console.log('Video permission denied');
            }

            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioPermission) {
                setAudioAvailable(true);
                console.log('Audio permission granted');
            } else {
                setAudioAvailable(false);
                console.log('Audio permission denied');
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }

            if (videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable });
                if (userMediaStream) {
                    window.localStream = userMediaStream;
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = userMediaStream;
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
            console.log("SET STATE HAS ", video, audio);

        }


    }, [video, audio])
    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();

    }




    let getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                console.log(description)
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            for (let id in connections) {
                connections[id].addStream(window.localStream)

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .then((stream) => { })
                .catch((e) => console.log(e))
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { }
        }
    }





    let getDislayMediaSuccess = (stream) => {
        console.log("HERE")
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false)

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            getUserMedia()

        })
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }




    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false })

        socketRef.current.on('signal', gotMessageFromServer)

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href)
            socketIdRef.current = socketRef.current.id

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
            })

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections)
                    // Wait for their ice candidate       
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }

                    // Wait for their video stream
                    connections[socketListId].onaddstream = (event) => {
                        console.log("BEFORE:", videoRef.current);
                        console.log("FINDING ID: ", socketListId);

                        let videoExists = videoRef.current.find(video => video.socketId === socketListId);

                        if (videoExists) {
                            console.log("FOUND EXISTING");

                            // Update the stream of the existing video
                            setVideos(videos => {
                                const updatedVideos = videos.map(video =>
                                    video.socketId === socketListId ? { ...video, stream: event.stream } : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            // Create a new video
                            console.log("CREATING NEW");
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsinline: true
                            };

                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };


                    // Add the local video stream
                    if (window.localStream !== undefined && window.localStream !== null) {
                        connections[socketListId].addStream(window.localStream)
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                        window.localStream = blackSilence()
                        connections[socketListId].addStream(window.localStream)
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue

                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            })
        })
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }
    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    let handleVideo = () => {
        setVideo(!video);
        // getUserMedia();
    }
    let handleAudio = () => {
        setAudio(!audio)
        // getUserMedia();
    }

    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia();
        }
    }, [screen])
    let handleScreen = () => {
        setScreen(!screen);
    }

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        window.location.href = "/"
    }

    let openChat = () => {
        setModal(true);
        setNewMessages(0);
    }
    let closeChat = () => {
        setModal(false);
    }
    let handleMessage = (e) => {
        setMessage(e.target.value);
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };



    let sendMessage = () => {
        console.log(socketRef.current);
        socketRef.current.emit('chat-message', message, username)
        setMessage("");

        // this.setState({ message: "", sender: username })
    }

    
    let connect = () => {
        setAskForUsername(false);
        getMedia();
    }


    return (
        <div>

            {askForUsername === true ?

                <div>


                    <h2>Enter into Lobby </h2>
                    <TextField id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
                    <Button variant="contained" onClick={connect}>Connect</Button>


                    <div>
                        <video ref={localVideoref} autoPlay muted></video>
                    </div>

                </div> :


                <div className={styles.meetVideoContainer}>

                    {showModal ? <div className={styles.chatRoom}>

                        <div className={styles.chatContainer}>
                            <h1>Chat</h1>

                            <div className={styles.chattingDisplay}>

                                {messages.length !== 0 ? messages.map((item, index) => {

                                    console.log(messages)
                                    return (
                                        <div style={{ marginBottom: "20px" }} key={index}>
                                            <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                                            <p>{item.data}</p>
                                        </div>
                                    )
                                }) : <p>No Messages Yet</p>}


                            </div>

                            <div className={styles.chattingArea}>
                                <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter Your chat" variant="outlined" />
                                <Button variant='contained' onClick={sendMessage}>Send</Button>
                            </div>


                        </div>
                    </div> : <></>}


                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: "white" }}>
                            {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleEndCall} style={{ color: "red" }}>
                            <CallEndIcon  />
                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: "white" }}>
                            {audio === true ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        {screenAvailable === true ?
                            <IconButton onClick={handleScreen} style={{ color: "white" }}>
                                {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                            </IconButton> : <></>}

                        <Badge badgeContent={newMessages} max={999} color='orange'>
                            <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                                <ChatIcon />                        </IconButton>
                        </Badge>

                    </div>


                    <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted></video>

                    <div className={styles.conferenceView}>
                        {videos.map((video) => (
                            <div key={video.socketId}>
                                <video

                                    data-socket={video.socketId}
                                    ref={ref => {
                                        if (ref && video.stream) {
                                            ref.srcObject = video.stream;
                                        }
                                    }}
                                    autoPlay
                                >
                                </video>
                            </div>

                        ))}

                    </div>

                </div>

            }

        </div>
    )
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
