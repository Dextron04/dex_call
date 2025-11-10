// ==================== WebSocket & WebRTC Configuration ====================
import { BalatroBG } from './src/balatro.js';
import { CircularText } from './src/circularText.js';
import { PixelCard } from './src/pixelCard.js';
import { DecryptedText } from './src/decryptedText.js';

const WS_URL = window.location.protocol === 'https:'
    ? 'wss://dex-call.dextron04.in/wss'
    : 'ws://localhost:8080';
let ws;
let pc;
let localStream;
let remoteStream;
let myId = '';
let peerId = '';
let callStartTime = null;
let callDurationInterval = null;
let isMuted = false;
let isSpeakerOn = false;
let isVideoOn = false;
let bgAnimation = null;
let circularText = null;
let pixelCardAnimation = null;
let headerText = null;

const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.l.google.com:5349" },
    { urls: "stun:stun1.l.google.com:3478" },
    { urls: "stun:stun1.l.google.com:5349" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:5349" },
    { urls: "stun:stun3.l.google.com:3478" },
    { urls: "stun:stun3.l.google.com:5349" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:5349" }
];

const config = { iceServers };

// ==================== DOM Elements ====================
const elements = {
    // Status
    connectionStatus: document.getElementById('connectionStatus'),
    statusDot: document.querySelector('.status-dot'),
    statusText: document.querySelector('.status-text'),

    // Cards & States
    registrationCard: document.getElementById('registrationCard'),
    callCard: document.getElementById('callCard'),
    callStateIdle: document.getElementById('callStateIdle'),
    callStateIncoming: document.getElementById('callStateIncoming'),
    callStateActive: document.getElementById('callStateActive'),

    // Registration
    myIdInput: document.getElementById('myId'),
    registerBtn: document.getElementById('registerBtn'),
    displayMyId: document.getElementById('displayMyId'),

    // Call
    peerIdInput: document.getElementById('peerId'),
    callBtn: document.getElementById('callBtn'),

    // Incoming Call
    incomingCallerId: document.getElementById('incomingCallerId'),
    acceptCallBtn: document.getElementById('acceptCallBtn'),
    rejectCallBtn: document.getElementById('rejectCallBtn'),

    // Active Call
    activeCallerId: document.getElementById('activeCallerId'),
    callDuration: document.getElementById('callDuration'),
    muteBtn: document.getElementById('muteBtn'),
    endCallBtn: document.getElementById('endCallBtn'),
    speakerBtn: document.getElementById('speakerBtn'),
    videoBtn: document.getElementById('videoBtn'),

    // Audio & Video
    remoteAudio: document.getElementById('remoteAudio'),
    videoContainer: document.getElementById('videoContainer'),
    localVideo: document.getElementById('localVideo'),
    remoteVideo: document.getElementById('remoteVideo'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// ==================== WebSocket Connection ====================
function connectWebSocket() {
    updateConnectionStatus('connecting');

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        updateConnectionStatus('connected');
        showToast('Connected to server', 'success');
    };

    ws.onclose = () => {
        updateConnectionStatus('disconnected');
        showToast('Disconnected from server', 'error');

        // Attempt reconnect after 3 seconds
        setTimeout(() => {
            if (!ws || ws.readyState === WebSocket.CLOSED) {
                connectWebSocket();
            }
        }, 3000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        showToast('Connection error', 'error');
    };

    ws.onmessage = async (message) => {
        try {
            const data = JSON.parse(message.data);
            console.log('Received message:', data);

            if (data.type === 'offer') {
                await handleIncomingCall(data.payload, data.from);
            } else if (data.type === 'answer') {
                await handleAnswer(data.payload);
            } else if (data.type === 'ice') {
                await handleIceCandidate(data.payload);
            } else if (data.type === 'end-call') {
                handleRemoteEndCall(data.from);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    };
}

// ==================== Connection Status ====================
function updateConnectionStatus(status) {
    const statusMap = {
        connecting: { text: 'Connecting...', class: '' },
        connected: { text: 'Connected', class: 'connected' },
        disconnected: { text: 'Disconnected', class: '' }
    };

    const { text, class: className } = statusMap[status] || statusMap.disconnected;
    elements.statusText.textContent = text;
    elements.statusDot.className = `status-dot ${className}`;
}

// ==================== Toast Notifications ====================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>`,
        error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>`,
        info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>`
    };

    toast.innerHTML = `
        ${icons[type] || icons.info}
        <span class="toast-message">${message}</span>
    `;

    elements.toastContainer.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== UI State Management ====================
function showRegistrationCard() {
    elements.registrationCard.classList.remove('hidden');
    elements.callCard.classList.add('hidden');
}

function showCallCard() {
    elements.registrationCard.classList.add('hidden');
    elements.callCard.classList.remove('hidden');
}

function showCallState(state) {
    // Hide all states
    elements.callStateIdle.classList.remove('active');
    elements.callStateIncoming.classList.remove('active');
    elements.callStateActive.classList.remove('active');

    // Show requested state
    const stateMap = {
        idle: elements.callStateIdle,
        incoming: elements.callStateIncoming,
        active: elements.callStateActive
    };

    if (stateMap[state]) {
        stateMap[state].classList.add('active');
    }
}

// ==================== Registration ====================
elements.registerBtn.addEventListener('click', async () => {
    const id = elements.myIdInput.value.trim();

    if (!id) {
        showToast('Please enter your ID', 'error');
        elements.myIdInput.focus();
        return;
    }

    if (id.length < 3) {
        showToast('ID must be at least 3 characters', 'error');
        elements.myIdInput.focus();
        return;
    }

    // Check mic permission
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop preview

        myId = id;
        ws.send(JSON.stringify({ type: 'register', payload: { id: myId } }));

        elements.displayMyId.textContent = myId;
        showCallCard();
        showCallState('idle');
        showToast(`Registered as ${myId}`, 'success');

    } catch (error) {
        console.error('Microphone permission error:', error);
        showToast('Microphone access denied. Please allow microphone access.', 'error');
    }
});

// Allow Enter key to register
elements.myIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.registerBtn.click();
    }
});

// ==================== Outgoing Call ====================
elements.callBtn.addEventListener('click', async () => {
    const targetId = elements.peerIdInput.value.trim();

    if (!targetId) {
        showToast('Please enter peer ID', 'error');
        elements.peerIdInput.focus();
        return;
    }

    if (targetId === myId) {
        showToast('You cannot call yourself', 'error');
        return;
    }

    peerId = targetId;

    try {
        elements.callBtn.disabled = true;
        showToast(`Calling ${peerId}...`, 'info');
        await startCall();
    } catch (error) {
        console.error('Error starting call:', error);
        showToast('Failed to start call', 'error');
        elements.callBtn.disabled = false;
    }
});

// Allow Enter key to call
elements.peerIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.callBtn.click();
    }
});

async function startCall() {
    try {
        pc = new RTCPeerConnection(config);

        localStream = await navigator.mediaDevices.getUserMedia({ video: isVideoOn, audio: true });
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

        // Display local video if enabled
        if (isVideoOn && elements.localVideo) {
            elements.localVideo.srcObject = localStream;
        }

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                ws.send(JSON.stringify({ type: 'ice', target: peerId, payload: e.candidate, id: myId }));
            }
        };

        pc.ontrack = (e) => {
            console.log('Track received:', e.track.kind, 'Streams:', e.streams.length);

            // Use the first stream if available, otherwise create a new one
            if (!remoteStream) {
                remoteStream = e.streams[0] || new MediaStream();
            }

            const stream = remoteStream;

            // Add the track to our remote stream if it's not already there
            if (!stream.getTracks().find(t => t.id === e.track.id)) {
                stream.addTrack(e.track);
            }

            if (e.track.kind === 'audio') {
                console.log('Setting remote audio');
                elements.remoteAudio.srcObject = stream;
            } else if (e.track.kind === 'video') {
                console.log('Setting remote video');
                elements.remoteVideo.srcObject = stream;
                elements.videoContainer.classList.remove('hidden');
            }

            startCallDuration();
            showCallState('active');
            elements.activeCallerId.textContent = peerId;
            showToast('Call connected', 'success');
        };

        pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc.connectionState);
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                endCall();
                showToast('Call disconnected', 'info');
            }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: 'offer', target: peerId, payload: offer, id: myId }));

    } catch (error) {
        console.error('Error in startCall:', error);
        throw error;
    }
}

// ==================== Incoming Call ====================
async function handleIncomingCall(offer, from) {
    peerId = from;
    elements.incomingCallerId.textContent = from || 'Unknown';
    showCallCard();
    showCallState('incoming');
    showToast(`Incoming call from ${from || 'Unknown'}`, 'info');

    // Re-enable accept button for new incoming call
    elements.acceptCallBtn.disabled = false;

    // Store offer for when user accepts
    window.pendingOffer = offer;
}

elements.acceptCallBtn.addEventListener('click', async () => {
    try {
        elements.acceptCallBtn.disabled = true;
        await acceptCall(window.pendingOffer);
        delete window.pendingOffer;
    } catch (error) {
        console.error('Error accepting call:', error);
        showToast('Failed to accept call', 'error');
        elements.acceptCallBtn.disabled = false;
    }
});

elements.rejectCallBtn.addEventListener('click', () => {
    // Notify the caller that we rejected the call
    if (peerId && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'end-call', target: peerId, id: myId }));
    }
    delete window.pendingOffer;
    showCallState('idle');
    peerId = '';
    showToast('Call rejected', 'info');
});

async function acceptCall(offer) {
    pc = new RTCPeerConnection(config);

    pc.onicecandidate = (e) => {
        if (e.candidate) {
            ws.send(JSON.stringify({ type: 'ice', target: peerId, payload: e.candidate, id: myId }));
        }
    };

    pc.ontrack = (e) => {
        const stream = e.streams[0];
        elements.remoteAudio.srcObject = stream;

        // Display remote video if it has video tracks
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && elements.remoteVideo) {
            elements.remoteVideo.srcObject = stream;
            elements.videoContainer.classList.remove('hidden');
        }

        startCallDuration();
        showCallState('active');
        elements.activeCallerId.textContent = peerId;
        showToast('Call connected', 'success');
    };

    pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            endCall();
            showToast('Call disconnected', 'info');
        }
    };

    localStream = await navigator.mediaDevices.getUserMedia({ video: isVideoOn, audio: true });
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    // Display local video if enabled
    if (isVideoOn && elements.localVideo) {
        elements.localVideo.srcObject = localStream;
    }

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws.send(JSON.stringify({ type: 'answer', target: peerId, payload: answer, id: myId }));
}

async function handleAnswer(answer) {
    try {
        await pc.setRemoteDescription(answer);
    } catch (error) {
        console.error('Error handling answer:', error);
    }
}

async function handleIceCandidate(candidate) {
    try {
        if (pc && candidate) {
            await pc.addIceCandidate(candidate);
        }
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
}

function handleRemoteEndCall(from) {
    console.log(`Call ended by ${from}`);
    endCall();
    showToast(`${from} ended the call`, 'info');
}

// ==================== Call Controls ====================
elements.muteBtn.addEventListener('click', () => {
    if (!localStream) return;

    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
    });

    elements.muteBtn.classList.toggle('active', isMuted);
    showToast(isMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
});

elements.speakerBtn.addEventListener('click', () => {
    isSpeakerOn = !isSpeakerOn;
    elements.speakerBtn.classList.toggle('active', isSpeakerOn);

    // On mobile, this would typically trigger speaker phone
    // Web API doesn't have direct speaker control, but we can adjust volume
    elements.remoteAudio.volume = isSpeakerOn ? 1.0 : 0.8;

    showToast(isSpeakerOn ? 'Speaker on' : 'Speaker off', 'info');
});

elements.videoBtn.addEventListener('click', async () => {
    if (!localStream) return;

    isVideoOn = !isVideoOn;

    try {
        if (isVideoOn) {
            // Add video track to existing stream
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const videoTrack = videoStream.getVideoTracks()[0];

            localStream.addTrack(videoTrack);

            // Add video track to peer connection
            if (pc) {
                const sender = pc.addTrack(videoTrack, localStream);
            }

            // Display local video
            if (elements.localVideo) {
                elements.localVideo.srcObject = localStream;
                elements.videoContainer.classList.remove('hidden');
            }

            elements.videoBtn.classList.add('active');
            showToast('Camera on', 'success');
        } else {
            // Remove video track
            localStream.getVideoTracks().forEach(track => {
                track.stop();
                localStream.removeTrack(track);

                // Remove from peer connection
                if (pc) {
                    const sender = pc.getSenders().find(s => s.track === track);
                    if (sender) {
                        pc.removeTrack(sender);
                    }
                }
            });

            // Hide video container if no remote video
            if (elements.remoteVideo && elements.remoteVideo.srcObject) {
                const remoteStream = elements.remoteVideo.srcObject;
                if (!remoteStream.getVideoTracks().length) {
                    elements.videoContainer.classList.add('hidden');
                }
            } else {
                elements.videoContainer.classList.add('hidden');
            }

            elements.videoBtn.classList.remove('active');
            showToast('Camera off', 'info');
        }
    } catch (error) {
        console.error('Error toggling video:', error);
        showToast('Failed to toggle camera', 'error');
        isVideoOn = !isVideoOn; // Revert state
    }
});

elements.endCallBtn.addEventListener('click', () => {
    // Notify the other peer that we're ending the call
    if (peerId && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'end-call', target: peerId, id: myId }));
    }
    endCall();
    showToast('Call ended', 'info');
});

function endCall() {
    // Stop local stream
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    // Stop remote stream
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }

    // Close peer connection
    if (pc) {
        pc.close();
        pc = null;
    }

    // Stop call duration timer
    stopCallDuration();

    // Clean up pixel card animation
    if (pixelCardAnimation) {
        pixelCardAnimation.disappear();
        setTimeout(() => {
            if (pixelCardAnimation) {
                pixelCardAnimation.destroy();
                pixelCardAnimation = null;
            }
        }, 1000);
    }

    // Reset UI
    showCallState('idle');
    elements.peerIdInput.value = '';
    elements.callBtn.disabled = false;
    isMuted = false;
    isSpeakerOn = false;
    isVideoOn = false;
    elements.muteBtn.classList.remove('active');
    elements.speakerBtn.classList.remove('active');
    elements.videoBtn.classList.remove('active');

    // Clear video elements
    if (elements.localVideo) {
        elements.localVideo.srcObject = null;
    }
    if (elements.remoteVideo) {
        elements.remoteVideo.srcObject = null;
    }
    if (elements.videoContainer) {
        elements.videoContainer.classList.add('hidden');
    }

    peerId = '';
}

// ==================== Call Duration Timer ====================
function startCallDuration() {
    callStartTime = Date.now();
    updateCallDuration();
    callDurationInterval = setInterval(updateCallDuration, 1000);

    // Initialize pixel card animation when call connects
    const callCard = document.getElementById('callCard');
    if (callCard && !pixelCardAnimation) {
        try {
            pixelCardAnimation = new PixelCard(callCard, {
                variant: 'purple',
                gap: 5,
                speed: 30
            });
            // Trigger the animation
            setTimeout(() => {
                if (pixelCardAnimation) {
                    pixelCardAnimation.appear();
                }
            }, 100);
            console.log('Pixel card animation started');
        } catch (error) {
            console.error('Failed to initialize pixel card animation:', error);
        }
    }
}

function updateCallDuration() {
    if (!callStartTime) return;

    const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    elements.callDuration.textContent =
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function stopCallDuration() {
    if (callDurationInterval) {
        clearInterval(callDurationInterval);
        callDurationInterval = null;
    }
    callStartTime = null;
    elements.callDuration.textContent = '00:00';
}

// ==================== Initialize App ====================
function init() {
    console.log('Initializing Voice Call App...');

    // Initialize header decrypted text animation
    const appTitle = document.querySelector('.app-title');
    if (appTitle) {
        try {
            headerText = new DecryptedText(appTitle, {
                text: 'Dex Call',
                speed: 80,
                maxIterations: 25,
                sequential: true,
                revealDirection: 'start',
                useOriginalCharsOnly: false,
                characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*',
                encryptedClassName: 'encrypted-char',
                animateOn: 'view'
            });
            console.log('Header decrypted text animation initialized');
        } catch (error) {
            console.error('Failed to initialize header text animation:', error);
        }
    }

    // Initialize background animation
    const bgCanvas = document.getElementById('bgCanvas');
    if (bgCanvas) {
        try {
            bgAnimation = new BalatroBG(bgCanvas, {
                spinRotation: -2.0,
                spinSpeed: 5.0,
                color1: '#667eea',
                color2: '#764ba2',
                color3: '#0f172a',
                contrast: 3.0,
                lighting: 0.35,
                spinAmount: 0.3,
                pixelFilter: 650.0,
                spinEase: 1.0,
                isRotate: true,
                mouseInteraction: true
            });
            console.log('Background animation initialized');
        } catch (error) {
            console.error('Failed to initialize background animation:', error);
        }
    }

    // Initialize circular text animation
    const circularTextContainer = document.getElementById('circularTextContainer');
    if (circularTextContainer) {
        try {
            circularText = new CircularText(circularTextContainer, {
                text: 'DEX CALL • DEX CALL • DEX CALL • DEX CALL • DEX CALL • DEX CALL • ',
                spinDuration: 40,
                onHover: 'speedUp',
                className: ''
            });
            console.log('Circular text animation initialized');
        } catch (error) {
            console.error('Failed to initialize circular text:', error);
        }
    }

    connectWebSocket();
    showRegistrationCard();
}

// Start the app
init();
