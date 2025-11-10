const ws = new WebSocket('ws://localhost:8080');
let pc;
let localStream;
let myId, peerId;

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

const config = {
    iceServers: iceServers
}

document.getElementById('registerBtn').onclick = () => {
    myId = document.getElementById('myId').value.trim();
    ws.send(JSON.stringify({ type: 'register', payload: { id: myId } }));
    alert(`Registered with ID: ${myId}`);
}

document.getElementById('callBtn').onclick = async () => {
    peerId = document.getElementById('peerId').value.trim();
    await startCall();
}

ws.onmessage = async (message) => {
    const data = JSON.parse(message.data);
    if (data.type === 'offer') await handleOffer(data.payload, data.from);
    else if (data.type === 'answer') await handleAnswer(data.payload);
    else if (data.type === 'ice') await handleIceCandidate(data.payload);
}

async function startCall() {
    pc = new RTCPeerConnection(config);

    localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.onicecandidate = (e) => {
        if (e.candidate) {
            ws.send(JSON.stringify({ type: 'ice', target: peerId, payload: e.candidate }));
        }
    }

    pc.ontrack = (e) => {
        document.getElementById('remoteAudio').srcObject = e.streams[0];
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: 'offer', target: peerId, payload: offer, id: myId }));
}

async function handleOffer(offer, from) {
    peerId = from;
    pc = new RTCPeerConnection(config);

    pc.onicecandidate = (e) => {
        if (e.candidate) {
            ws.send(JSON.stringify({ type: 'ice', target: peerId, payload: e.candidate }));
        }
    }

    pc.ontrack = (e) => {
        document.getElementById('remoteAudio').srcObject = e.streams[0];
    }

    localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    await pc.setRemoteDescription(offer)
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws.send(JSON.stringify({ type: 'answer', target: peerId, payload: answer, id: myId }));
}

async function handleAnswer(answer) {
    await pc.setRemoteDescription(answer);
}

async function handleIceCandidate(candidate) {
    try {
        await pc.addIceCandidate(candidate);
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
}
