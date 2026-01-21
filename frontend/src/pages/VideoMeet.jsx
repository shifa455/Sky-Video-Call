import React, { useEffect, useRef, useState } from 'react';
import io from "socket.io-client";
import {
    Badge,
    IconButton,
    TextField,
    Button
} from '@mui/material';
import {
    Videocam as VideocamIcon,
    VideocamOff as VideocamOffIcon,
    CallEnd as CallEndIcon,
    Mic as MicIcon,
    MicOff as MicOffIcon,
    ScreenShare as ScreenShareIcon,
    StopScreenShare as StopScreenShareIcon,
    Chat as ChatIcon
} from '@mui/icons-material';
import styles from "../styles/videoComponent.module.css";
import server from '../environment';

const server_url = server;

var connections = {};
const peerConfigConnections = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function VideoMeetComponent() {
    const socketRef = useRef();
    const socketIdRef = useRef();
    const localVideoref = useRef();
    const videoRef = useRef([]);

    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
    const [screen, setScreen] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);
    const [videos, setVideos] = useState([]);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");
    const [showModal, setModal] = useState(true);

    // Get permissions once
    useEffect(() => {
        const getPermissions = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
            } catch (err) {
                console.log("Permissions error:", err);
            }
        };
        getPermissions();
    }, []);

    // Toggle video
    const handleVideo = () => {
        setVideo(prev => !prev);
        updateLocalStream();
    };
    // Toggle audio
    const handleAudio = () => {
        setAudio(prev => !prev);
        updateLocalStream();
    };
    // Toggle screen share
    const handleScreen = () => {
        setScreen(prev => !prev);
    };

    const updateLocalStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
            window.localStream = stream;
            if (localVideoref.current) localVideoref.current.srcObject = stream;

            for (let id in connections) {
                if (id === socketIdRef.current) continue;
                connections[id].addStream(stream);
                const desc = await connections[id].createOffer();
                await connections[id].setLocalDescription(desc);
                socketRef.current.emit('signal', id, JSON.stringify({ sdp: connections[id].localDescription }));
            }
        } catch (err) {
            console.log(err);
        }
    };

    // Handle screen sharing
    useEffect(() => {
        if (!screen) return;
        const getDisplayMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                window.localStream = stream;
                if (localVideoref.current) localVideoref.current.srcObject = stream;
            } catch (err) {
                console.log(err);
                setScreen(false);
            }
        };
        getDisplayMedia();
    }, [screen]);

    // Chat
    const addMessage = (data, sender, socketIdSender) => {
        setMessages(prev => [...prev, { sender, data }]);
        if (socketIdSender !== socketIdRef.current) setNewMessages(prev => prev + 1);
    };
    const sendMessage = () => {
        if (!socketRef.current) return;
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    };

    // Connect socket and setup peer connections
    const connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });

        socketRef.current.on('signal', gotMessageFromServer);
        socketRef.current.on('connect', () => {
            socketIdRef.current = socketRef.current.id;
            socketRef.current.emit('join-call', window.location.href);

            socketRef.current.on('chat-message', addMessage);
            socketRef.current.on('user-left', (id) => {
                setVideos(prev => prev.filter(v => v.socketId !== id));
            });
            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach(socketListId => {
                    if (connections[socketListId]) return;

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    connections[socketListId].onicecandidate = event => {
                        if (event.candidate) socketRef.current.emit('signal', socketListId, JSON.stringify({ ice: event.candidate }));
                    };
                    connections[socketListId].onaddstream = event => {
                        setVideos(prev => {
                            const exists = prev.find(v => v.socketId === socketListId);
                            if (exists) {
                                return prev.map(v => v.socketId === socketListId ? { ...v, stream: event.stream } : v);
                            } else {
                                return [...prev, { socketId: socketListId, stream: event.stream }];
                            }
                        });
                    };

                    if (window.localStream) connections[socketListId].addStream(window.localStream);
                });
            });
        });
    };

    const gotMessageFromServer = async (fromId, message) => {
        const signal = JSON.parse(message);
        if (fromId === socketIdRef.current) return;

        try {
            if (signal.sdp) {
                await connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp));
                if (signal.sdp.type === 'offer') {
                    const answer = await connections[fromId].createAnswer();
                    await connections[fromId].setLocalDescription(answer);
                    socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: connections[fromId].localDescription }));
                }
            }
            if (signal.ice) {
                await connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice));
            }
        } catch (err) {
            console.log(err);
        }
    };

    // Connect after entering username
    const connect = () => {
        if (!username) return alert("Enter username");
        setAskForUsername(false);
        updateLocalStream();
        connectToSocketServer();
    };

    const handleEndCall = () => {
        try {
            window.localStream.getTracks().forEach(track => track.stop());
        } catch (err) { }
        window.location.href = "/";
    };

    return (
        <div>
            {askForUsername ? (
                <div>
                    <h2>Enter into Lobby</h2>
                    <TextField label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
                    <Button variant="contained" onClick={connect}>Connect</Button>
                    <div>
                        <video ref={localVideoref} autoPlay muted></video>
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>
                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <h1>Chat</h1>
                                <div className={styles.chattingDisplay}>
                                    {messages.length ? messages.map((msg, i) => (
                                        <div key={i} style={{ marginBottom: "20px" }}>
                                            <p style={{ fontWeight: "bold" }}>{msg.sender}</p>
                                            <p>{msg.data}</p>
                                        </div>
                                    )) : <p>No messages yet</p>}
                                </div>
                                <div className={styles.chattingArea}>
                                    <TextField value={message} onChange={e => setMessage(e.target.value)} label="Enter your chat" variant="outlined" />
                                    <Button variant="contained" onClick={sendMessage}>Send</Button>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: "white" }}>
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleEndCall} style={{ color: "red" }}>
                            <CallEndIcon />
                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: "white" }}>
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                        {screenAvailable && (
                            <IconButton onClick={handleScreen} style={{ color: "white" }}>
                                {screen ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                            </IconButton>
                        )}
                        <Badge badgeContent={newMessages} max={999} color="error">
                            <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>
                    <video ref={localVideoref} autoPlay muted className={styles.meetUserVideo}></video>
                    <div className={styles.conferenceView}>
                        {videos.map(v => (
                            <video key={v.socketId} ref={ref => { if (ref) ref.srcObject = v.stream; }} autoPlay playsInline></video>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
