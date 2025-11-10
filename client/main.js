// ==================== WebSocket & WebRTC Configuration ====================
const WS_URL = 'ws://localhost:8080';
let ws;
let pc;
let localStream;
let myId = '';
let peerId = '';
let callStartTime = null;
let callDurationInterval = null;
let isMuted = false;
let isSpeakerOn = false;

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

    // Audio
    remoteAudio: document.getElementById('remoteAudio'),

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

        localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                ws.send(JSON.stringify({ type: 'ice', target: peerId, payload: e.candidate }));
            }
        };

        pc.ontrack = (e) => {
            elements.remoteAudio.srcObject = e.streams[0];
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
    elements.incomingCallerId.textContent = from;
    showCallState('incoming');
    showToast(`Incoming call from ${from}`, 'info');

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
    delete window.pendingOffer;
    showCallState('idle');
    showToast('Call rejected', 'info');
});

async function acceptCall(offer) {
    pc = new RTCPeerConnection(config);

    pc.onicecandidate = (e) => {
        if (e.candidate) {
            ws.send(JSON.stringify({ type: 'ice', target: peerId, payload: e.candidate }));
        }
    };

    pc.ontrack = (e) => {
        elements.remoteAudio.srcObject = e.streams[0];
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

    localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

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

elements.endCallBtn.addEventListener('click', () => {
    endCall();
    showToast('Call ended', 'info');
});

function endCall() {
    // Stop local stream
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    // Close peer connection
    if (pc) {
        pc.close();
        pc = null;
    }

    // Stop call duration timer
    stopCallDuration();

    // Reset UI
    showCallState('idle');
    elements.peerIdInput.value = '';
    elements.callBtn.disabled = false;
    isMuted = false;
    isSpeakerOn = false;
    elements.muteBtn.classList.remove('active');
    elements.speakerBtn.classList.remove('active');
    peerId = '';
}

// ==================== Call Duration Timer ====================
function startCallDuration() {
    callStartTime = Date.now();
    updateCallDuration();
    callDurationInterval = setInterval(updateCallDuration, 1000);
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
    connectWebSocket();
    showRegistrationCard();
}

// Start the app
init();
