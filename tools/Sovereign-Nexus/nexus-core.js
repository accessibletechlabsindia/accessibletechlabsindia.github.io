let peer = null;
let conn = null;
let myName = "";
let otherName = "";
let roomPin = "";
let audioCtx = null;
let incomingConn = null;
let replyContext = null;
let editMsgId = null;
let mediaRecorder = null;
let audioChunks = [];
let voiceTimerInterval = null;
let voiceSeconds = 0;
let isPaused = false;
let typingTimeout = null;
let pendingFile = null;
let isHost = false;
let actionMsgId = null;
let actionMsgText = "";
let actionMsgIsText = false;
let actionMsgIsSelf = false;
let webrtcCall = null;
let localStream = null;
let callTimerInterval = null;
let callDurationSec = 0;
let ringToneInterval = null;
let incomingCallObj = null;
let callTimeoutTimer = null;
let keepAliveInterval = null;
let wakeLock = null;
let voiceStartTime = 0;
let voiceAccumulated = 0;
let callStartTime = 0;
let lastHeartbeatAck = 0;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {}
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release().catch(()=>{});
        wakeLock = null;
    }
}

async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return "atli-" + hashHex;
}

function setCallLockdown(isLocked) {
    const audioBtn = document.querySelector('button[onclick*="initiateWebRTCCall(\'audio\')"]');
    const videoBtn = document.querySelector('button[onclick*="initiateWebRTCCall(\'video\')"]');
    const mBtn = document.getElementById('micBtn');
    
    if(audioBtn) {
        audioBtn.disabled = isLocked;
        audioBtn.style.opacity = isLocked ? "0.5" : "1";
        audioBtn.style.cursor = isLocked ? "not-allowed" : "pointer";
        if(isLocked) audioBtn.setAttribute('aria-disabled', 'true');
        else audioBtn.removeAttribute('aria-disabled');
    }
    if(videoBtn) {
        videoBtn.disabled = isLocked;
        videoBtn.style.opacity = isLocked ? "0.5" : "1";
        videoBtn.style.cursor = isLocked ? "not-allowed" : "pointer";
        if(isLocked) videoBtn.setAttribute('aria-disabled', 'true');
        else videoBtn.removeAttribute('aria-disabled');
    }
    if(mBtn) {
        mBtn.disabled = isLocked;
        mBtn.style.opacity = isLocked ? "0.5" : "1";
        mBtn.style.cursor = isLocked ? "not-allowed" : "pointer";
        if(isLocked) mBtn.setAttribute('aria-disabled', 'true');
        else mBtn.removeAttribute('aria-disabled');
    }
}

function initLargeEmojiList() {
    const drop = document.getElementById('emojiSelect');
    const emojis = [];
    for(let i=128512; i<=128591; i++) emojis.push(String.fromCodePoint(i));
    for(let i=127744; i<=128317; i++) emojis.push(String.fromCodePoint(i));
    for(let i=128640; i<=128704; i++) emojis.push(String.fromCodePoint(i));
    emojis.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e;
        opt.innerText = e;
        drop.appendChild(opt);
    });
}
initLargeEmojiList();

function insertEmoji() {
    const drop = document.getElementById('emojiSelect');
    const val = drop.value;
    if(val) {
        const inp = document.getElementById('msgInput');
        inp.value += val;
        inp.focus();
        handleTyping();
        drop.selectedIndex = 0;
    }
}

function handleAttachDropdown() {
    const drop = document.getElementById('attachSelect');
    const val = drop.value;
    if(!val) return;
    if(val === 'photo') triggerFileSelect('image/*');
    else if(val === 'video') triggerFileSelect('video/*');
    else if(val === 'audio') triggerFileSelect('audio/*');
    else if(val === 'document') triggerFileSelect('*');
    else if(val === 'location') shareCurrentLocation();
    drop.selectedIndex = 0;
}

function initAudio() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    } else if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playTone(type) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if (type === 'create') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'request') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc.start(); osc.stop(audioCtx.currentTime + 0.6);
    } else if (type === 'connect') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
        osc.start(); osc.stop(audioCtx.currentTime + 0.8);
    } else if (type === 'send') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'receive') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'record') {
        osc.type = 'square'; osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'pause') {
        osc.type = 'square'; osc.frequency.setValueAtTime(250, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'resume') {
        osc.type = 'square'; osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'discard') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'clear') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'delete') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start(); osc.stop(audioCtx.currentTime + 0.4);
    } else if (type === 'disconnect') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.setValueAtTime(300, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start(); osc.stop(audioCtx.currentTime + 0.4);
    } else if (type === 'error') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'read') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'call_out') {
        osc.type = 'sine'; 
        const osc2 = audioCtx.createOscillator();
        osc2.type = 'sine';
        osc.frequency.value = 425;
        osc2.frequency.value = 475;
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.setValueAtTime(0, audioCtx.currentTime + 1);
        gain2.gain.setValueAtTime(0, audioCtx.currentTime + 1);
        osc.start(); osc2.start();
        osc.stop(audioCtx.currentTime + 1); osc2.stop(audioCtx.currentTime + 1);
    } else if (type === 'call_in') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15);
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3);
        osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
        osc.start(); osc.stop(audioCtx.currentTime + 1.2);
    } else if (type === 'call_accept') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'call_end') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.setValueAtTime(400, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start(); osc.stop(audioCtx.currentTime + 0.4);
    }
}

function controlRingTone(action, type) {
    if (action === 'start') {
        if (ringToneInterval) clearInterval(ringToneInterval);
        playTone(type);
        ringToneInterval = setInterval(() => { playTone(type); }, type === 'call_out' ? 3000 : 2500);
    } else {
        if (ringToneInterval) { clearInterval(ringToneInterval); ringToneInterval = null; }
    }
}

function announce(msg) {
    const sr = document.getElementById('srAnnouncer');
    sr.innerText = "";
    setTimeout(() => { sr.innerText = msg + "\u200B".repeat(Math.floor(Math.random() * 10)); }, 50);
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 3500);
}

function hideAll() {
    document.getElementById('introSection').style.display = 'none';
    document.getElementById('modeGrid').style.display = 'none';
    document.getElementById('hostSetup').style.display = 'none';
    document.getElementById('hostWaiting').style.display = 'none';
    document.getElementById('joinSetup').style.display = 'none';
    document.getElementById('chatRoom').style.display = 'none';
}

function resetUI() { location.reload(); }

function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
        initJoinMode();
        document.getElementById('joinPin').value = room;
        showToast("Room PIN auto-filled from link.");
        announce("Room PIN auto-filled from link. Please enter your name.");
    }
}

function initHostMode() { initAudio(); hideAll(); document.getElementById('hostSetup').style.display = 'block'; announce("Host setup activated. Enter your name."); document.getElementById('hostName').focus(); }
function initJoinMode() { initAudio(); hideAll(); document.getElementById('joinSetup').style.display = 'block'; announce("Join setup activated. Enter your name and PIN."); document.getElementById('joinName').focus(); }

function handleDisconnectCleanup() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    playTone('disconnect');
    announce("Connection closed. Returning to main menu.");
    showToast("Disconnected. Reloading...");
    endActiveCallUI();
    controlRingTone('stop');
    setTimeout(() => {
        location.reload();
    }, 2500);
}

async function generateRoom() {
    initAudio();
    myName = document.getElementById('hostName').value.trim();
    if (!myName) { playTone('error'); showToast("Name is empty. Please enter your name."); announce("Name field is empty. Please enter your name."); return; }
    
    isHost = true;
    roomPin = Math.floor(100000 + Math.random() * 900000).toString();
    const peerId = await hashPin(roomPin);
    
    hideAll();
    document.getElementById('hostWaiting').style.display = 'block';
    document.getElementById('pinDisplay').innerText = roomPin;
    
    const linkUrl = window.location.origin + window.location.pathname + "?room=" + roomPin;
    document.getElementById('directLinkAnchor').href = linkUrl;
    document.getElementById('directLinkAnchor').innerText = linkUrl;
    
    playTone('create');
    announce("Chat Room Created. Your secure 6-digit PIN is " + roomPin + ".");

const peerConfig = {
host: 'sovereign-server-1.onrender.com',
        port: 443,
        path: '/',
        secure: true,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
                { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
            ]
        }
    };
    peer = new Peer(peerId, peerConfig);
    setupPeerCallEvents();
    
    peer.on('connection', c => {
        incomingConn = c;
        c.on('open', () => {
            c.on('data', d => {
                if (d.type === 'req') {
                    otherName = d.name;
                    playTone('request');
                    document.getElementById('reqDetails').innerText = otherName + " wants to join the chat.";
                    document.getElementById('reqModal').showModal();
                    document.getElementById('reqModal').focus();
                    announce(otherName + " wants to join the chat.");
                }
            });
        });
    });
    peer.on('error', err => { showToast("Network Error: " + err.type); });
}

function copyRoomLink() {
    const link = window.location.origin + window.location.pathname + "?room=" + roomPin;
    navigator.clipboard.writeText(link).then(() => { showToast("Link Copied."); announce("Link copied to clipboard."); });
}

async function shareRoomDetails() {
    const link = window.location.origin + window.location.pathname + "?room=" + roomPin;
    const text = "Accessible Tech Labs India - Sovereign WebRTC Nexus\n\nSecure Room PIN: " + roomPin;
    if (navigator.share) {
        try {
            await navigator.share({ title: 'Secure ATLI Chat Invitation', text: text, url: link });
            announce("Sharing menu opened.");
        } catch(err) { copyRoomLink(); }
    } else {
        navigator.clipboard.writeText(link).then(() => { showToast("Link Copied."); announce("Link copied to clipboard."); });
    }
}

async function requestJoin() {
    initAudio();
    myName = document.getElementById('joinName').value.trim();
    roomPin = document.getElementById('joinPin').value.trim();
    if (!myName || !roomPin) { playTone('error'); showToast("Name and PIN required."); announce("Name or PIN is empty."); return; }

    isHost = false;
    showToast("Sending request... (Searching for up to 60 seconds)");
    announce("Sending request. Searching network for up to 60 seconds.");
    
    const targetPeerId = await hashPin(roomPin);
const peerConfig = {
host: 'sovereign-server-1.onrender.com',
        port: 443,
        path: '/',
        secure: true,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
                { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
            ]
        }
    };

    peer = new Peer(peerConfig);
    
    let joinTimeout = setTimeout(() => {
        if (!conn || !conn.open) {
            playTone('error');
            showToast("Server cannot be located. Room not found.");
            announce("Server cannot be located. Room not found.");
            if(peer) peer.destroy();
        }
    }, 60000);

    peer.on('open', () => {
        setupPeerCallEvents();
        conn = peer.connect(targetPeerId);
        conn.on('open', () => {
            clearTimeout(joinTimeout);
            conn.send({ type: 'req', name: myName });
        });
        conn.on('data', d => {
            if (d.type === 'res') {
                if (d.status === 'accept') {
                    otherName = d.name;
                    setupChatUI();
                } else {
                    showToast("Access Denied by Host.");
                    announce("Access Denied.");
                    peer.destroy();
                }
            } else {
                handleIncomingData(d);
            }
        });
        conn.on('close', () => { 
            handleDisconnectCleanup();
        });
    });
    peer.on('error', err => { 
        clearTimeout(joinTimeout);
        playTone('error');
        showToast("Connection failed. Invalid PIN or Host offline."); 
        announce("Connection failed."); 
    });
}

function acceptRequest() {
    document.getElementById('reqModal').close();
    conn = incomingConn;
    conn.send({ type: 'res', status: 'accept', name: myName });
    conn.on('data', handleIncomingData);
    conn.on('close', () => { 
        handleDisconnectCleanup();
    });
    setupChatUI();
}

function declineRequest() {
    document.getElementById('reqModal').close();
    incomingConn.send({ type: 'res', status: 'decline' });
    setTimeout(() => { incomingConn.close(); }, 500);
}

function setupChatUI() {
    playTone('connect');
    hideAll();
    document.getElementById('chatRoom').style.display = 'flex';
    document.getElementById('chatHeaderTitle').innerText = "🟢 Connected to " + otherName;
    announce("Connected to " + otherName + ". Chat active.");
    document.getElementById('msgInput').focus();
    
    document.getElementById('chatHistory').addEventListener('scroll', handleScrollReadReceipts);
    window.addEventListener('focus', () => { if(conn && conn.open) handleScrollReadReceipts(); });

    lastHeartbeatAck = Date.now();
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(() => {
        if (conn && conn.open) {
            if (Date.now() - lastHeartbeatAck > 15000) {
                handleDisconnectCleanup();
                return;
            }
            conn.send({ type: 'HEARTBEAT_PING' });
        }
    }, 3000);
}

function handleIncomingData(d) {
    lastHeartbeatAck = Date.now();
    
    if (d.type === 'HEARTBEAT_PING') {
        if (conn && conn.open) conn.send({ type: 'HEARTBEAT_PONG' });
        return;
    }
    if (d.type === 'HEARTBEAT_PONG') {
        return;
    }

    if (d.type === 'text') {
        playTone('receive');
        appendMessage(d.id, otherName, d.text, false, d.replyContext);
        announce(otherName + " sent a message: " + d.text);
        conn.send({type: 'msg_delivered', id: d.id});
        checkIfMsgIsVisible(d.id);
    } else if (d.type === 'edit') {
        const txtEl = document.getElementById('txt_' + d.id);
        if(txtEl) {
            txtEl.innerText = d.text;
            txtEl.innerHTML += `<span class="msg-edited-tag">(Edited)</span>`;
            announce(otherName + " edited a message.");
        }
    } else if (d.type === 'typing') {
        showTyping();
    } else if (d.type === 'delete') {
        const el = document.getElementById(d.id);
        if(el) { el.remove(); playTone('delete'); announce(otherName + " deleted a message."); }
    } else if (d.type === 'pin') {
        document.getElementById('pinnedBanner').style.display = 'block';
        document.getElementById('pinnedText').innerText = d.text;
        announce(otherName + " pinned a message.");
    } else if (d.type === 'file') {
        playTone('receive');
        appendMedia(d.id, otherName, d.fileMeta, d.fileData, false, d.caption);
        announce(otherName + " sent a file.");
        conn.send({type: 'msg_delivered', id: d.id});
        checkIfMsgIsVisible(d.id);
    } else if (d.type === 'voice') {
        playTone('receive');
        appendVoice(d.id, otherName, d.audioData, false);
        announce(otherName + " sent an audio message. It will delete after listening.");
        conn.send({type: 'msg_delivered', id: d.id});
    } else if (d.type === 'voice_burned') {
        const el = document.getElementById(d.id);
        if(el) { el.remove(); playTone('delete'); announce(otherName + " listened to your voice message. It is now burned."); }
    } else if (d.type === 'location') {
        playTone('receive');
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=...{d.lat},${d.lng}`;
        const locHtml = `📍 Shared Location: <br><a href="${mapsLink}" target="_blank" style="color:#58a6ff; font-weight:bold;">Open in Google Maps</a>`;
        appendMessageHtml(d.id, otherName, locHtml, false, null);
        announce(otherName + " shared a location.");
        conn.send({type: 'msg_delivered', id: d.id});
        checkIfMsgIsVisible(d.id);
    } else if (d.type === 'clear_all') {
        document.getElementById('chatHistory').innerHTML = '';
        playTone('clear');
        announce(otherName + " cleared the chat history.");
    } else if (d.type === 'disconnect') {
        handleDisconnectCleanup();
    } else if (d.type === 'msg_delivered') {
        const statusEl = document.getElementById('status_' + d.id);
        if(statusEl && statusEl.innerText !== '🔵 ✓✓ Read') {
            statusEl.innerText = '✓✓ Delivered';
            statusEl.className = 'msg-status status-delivered';
        }
    } else if (d.type === 'msg_read') {
        const statusEl = document.getElementById('status_' + d.id);
        if(statusEl) {
            statusEl.innerText = '🔵 ✓✓ Read';
            statusEl.className = 'msg-status status-read';
            playTone('read');
            announce("Your message was read by " + otherName);
        }
    } else if (d.type === 'call_signal') {
        handleCallSignal(d);
    }
}

function handleScrollReadReceipts() {
    if(!document.hasFocus()) return;
    const hist = document.getElementById('chatHistory');
    const bubbles = hist.querySelectorAll('.msg-other');
    const histRect = hist.getBoundingClientRect();
    
    bubbles.forEach(b => {
        if(!b.dataset.readSent) {
            const rect = b.getBoundingClientRect();
            if(rect.top >= histRect.top && rect.bottom <= histRect.bottom) {
                b.dataset.readSent = "true";
                conn.send({type: 'msg_read', id: b.id});
            }
        }
    });
}

function checkIfMsgIsVisible(id) {
    setTimeout(() => {
        if(!document.hasFocus()) return;
        const el = document.getElementById(id);
        const hist = document.getElementById('chatHistory');
        if(el) {
            const histRect = hist.getBoundingClientRect();
            const rect = el.getBoundingClientRect();
            if(rect.top >= histRect.top && rect.bottom <= histRect.bottom) {
                el.dataset.readSent = "true";
                conn.send({type: 'msg_read', id: id});
            }
        }
    }, 500);
}

function generateMsgId() { return "m_" + Date.now() + "_" + Math.floor(Math.random()*1000); }

function sendTextMessage() {
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    
    if (editMsgId) {
        if (!text) { playTone('error'); announce("Message box is empty."); showToast("Message box is empty."); return; }
        conn.send({ type: 'edit', id: editMsgId, text: text });
        const txtEl = document.getElementById('txt_' + editMsgId);
        if(txtEl) {
            txtEl.innerText = text;
            txtEl.innerHTML += `<span class="msg-edited-tag">(Edited)</span>`;
        }
        announce("Message edited.");
        input.value = "";
        cancelEdit();
        return;
    }
    
    if (!text) { playTone('error'); announce("Message box is empty."); showToast("Message box is empty."); return; }
    
    initAudio();
    playTone('send');
    const msgId = generateMsgId();
    conn.send({ type: 'text', id: msgId, text: text, replyContext: replyContext });
    appendMessage(msgId, "You", text, true, replyContext);
    announce("You sent: " + text);
    input.value = "";
    cancelReply();
    input.focus();
}

function handleEnter(e) { if (e.key === "Enter") sendTextMessage(); }

function handleTyping() {
    conn.send({ type: 'typing' });
    const btn = document.getElementById('sendTextBtn');
    const mic = document.getElementById('micBtn');
    if(document.getElementById('msgInput').value.trim() !== "") {
        btn.style.display = "block"; mic.style.display = "none";
    } else {
        btn.style.display = "none"; mic.style.display = "block";
    }
}

function showTyping() {
    const ind = document.getElementById('typingIndicator');
    ind.innerText = otherName + " is typing...";
    ind.style.display = 'block';
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { ind.style.display = 'none'; }, 2000);
}

function appendMessage(id, sender, text, isSelf, replyCtx) {
    const hist = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = "message-bubble " + (isSelf ? "msg-self" : "msg-other");
    div.id = id;
    
    let safeText = text.replace(/</g, "<").replace(/'/g, "\\'");
    let html = `<div class="msg-header"><span>${sender}</span> <button class="msg-options-btn" onclick="openMsgAction('${id}', true, '${safeText}', ${isSelf})" aria-label="Chat Action Menu">⋮</button></div>`;
    
    if (replyCtx) {
        html += `<div style="background:rgba(0,0,0,0.2); padding:5px 10px; border-left:3px solid #3fb950; margin-bottom:10px; font-size:0.9rem; border-radius:3px;">${replyCtx}</div>`;
    }
    
    html += `<div id="txt_${id}">${text.replace(/</g, "<")}</div>`;
    
    if (isSelf) {
        html += `<div id="status_${id}" class="msg-status status-sent">✓ Sent</div>`;
    }
    
    div.innerHTML = html;
    hist.appendChild(div);
    hist.scrollTop = hist.scrollHeight;
}

function appendMessageHtml(id, sender, innerHtml, isSelf, replyCtx) {
    const hist = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = "message-bubble " + (isSelf ? "msg-self" : "msg-other");
    div.id = id;
    
    let html = `<div class="msg-header"><span>${sender}</span> <button class="msg-options-btn" onclick="openMsgAction('${id}', false, '', ${isSelf})" aria-label="Chat Action Menu">⋮</button></div>`;
    
    if (replyCtx) {
        html += `<div style="background:rgba(0,0,0,0.2); padding:5px 10px; border-left:3px solid #3fb950; margin-bottom:10px; font-size:0.9rem; border-radius:3px;">${replyCtx}</div>`;
    }
    
    html += `<div>${innerHtml}</div>`;
    
    if (isSelf) {
        html += `<div id="status_${id}" class="msg-status status-sent">✓ Sent</div>`;
    }
    
    div.innerHTML = html;
    hist.appendChild(div);
    hist.scrollTop = hist.scrollHeight;
}

function appendMedia(id, sender, meta, dataArray, isSelf, caption) {
    const hist = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = "message-bubble " + (isSelf ? "msg-self" : "msg-other");
    div.id = id;
    
    const blob = new Blob([new Uint8Array(dataArray)], {type: meta.type});
    const url = URL.createObjectURL(blob);
    
    let html = `<div class="msg-header"><span>${sender}</span> <button class="msg-options-btn" onclick="openMsgAction('${id}', false, '', ${isSelf})" aria-label="Chat Action Menu">⋮</button></div>`;
    
    if (meta.type.startsWith('image/')) {
        html += `<img src="${url}" class="media-preview" alt="Image File">`;
    } else if (meta.type.startsWith('video/')) {
        html += `<video src="${url}" controls class="media-preview" aria-label="Video File"></video>`;
    } else if (meta.type.startsWith('audio/')) {
        html += `<audio src="${url}" controls class="media-preview" aria-label="Audio File"></audio>`;
    } else {
        html += `<div style="padding:10px; background:rgba(0,0,0,0.2); border-radius:5px;">📄 ${meta.name}</div>`;
    }
    
    if (caption) html += `<div style="margin-top:10px;">${caption.replace(/</g, "<")}</div>`;
    
    if (!isSelf) {
        html += `<button class="media-btn" onclick="downloadBlob('${url}', '${meta.name}')">⬇ Save to Device</button>`;
    } else {
        html += `<div id="status_${id}" class="msg-status status-sent">✓ Sent</div>`;
    }
    
    div.innerHTML = html;
    hist.appendChild(div);
    hist.scrollTop = hist.scrollHeight;
}

function appendVoice(id, sender, dataArray, isSelf) {
    const hist = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = "message-bubble " + (isSelf ? "msg-self" : "msg-other");
    div.id = id;
    div.style.border = "2px solid #da3633";
    
    const blob = new Blob([new Uint8Array(dataArray)], {type: 'audio/webm'});
    const url = URL.createObjectURL(blob);
    
    let html = `
        <div class="msg-header"><span style="color:#ff7b72;">🔥 Secure Voice Note (Burn After Listen)</span> <button class="msg-options-btn" onclick="openMsgAction('${id}', false, '', ${isSelf})" aria-label="Chat Action Menu">⋮</button></div>
        <audio src="${url}" controls class="media-preview" id="aud_${id}" aria-label="Voice Message"></audio>
    `;
    if(isSelf) html += `<div id="status_${id}" class="msg-status status-sent">✓ Sent</div>`;
    
    div.innerHTML = html;
    hist.appendChild(div);
    hist.scrollTop = hist.scrollHeight;
    
    document.getElementById("aud_"+id).onended = function() {
        if (!isSelf) {
            div.remove();
            conn.send({type: 'voice_burned', id: id});
            playTone('delete');
            announce("Audio message playback complete. Burned.");
        }
    };
}

function downloadBlob(url, name) {
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    showToast("Saving to device..."); announce("Saving file to device.");
}

function openMsgAction(id, isText, text, isSelf) {
    actionMsgId = id;
    actionMsgText = text;
    actionMsgIsText = isText;
    actionMsgIsSelf = isSelf;
    
    document.getElementById('btnCopy').style.display = isText ? 'block' : 'none';
    document.getElementById('btnPin').style.display = isText ? 'block' : 'none';
    document.getElementById('btnReply').style.display = isText ? 'block' : 'none';
    document.getElementById('btnEdit').style.display = (isText && isSelf) ? 'block' : 'none';
    
    document.getElementById('msgActionModal').showModal();
    document.getElementById('btnDel').focus();
    announce("Chat action menu opened.");
}

function closeMsgAction() { document.getElementById('msgActionModal').close(); }

function execCopy() { navigator.clipboard.writeText(actionMsgText); showToast("Copied"); closeMsgAction(); }

function execDelete() {
    const el = document.getElementById(actionMsgId);
    if(el) { el.remove(); playTone('delete'); }
    conn.send({type: 'delete', id: actionMsgId});
    announce("Message deleted.");
    closeMsgAction();
}

function execPin() {
    document.getElementById('pinnedBanner').style.display = 'block';
    document.getElementById('pinnedText').innerText = actionMsgText;
    conn.send({type: 'pin', text: actionMsgText});
    announce("Message pinned.");
    closeMsgAction();
}

function execReply() {
    replyContext = actionMsgText.substring(0, 30) + "...";
    document.getElementById('replyBanner').style.display = 'block';
    document.getElementById('replyPreview').innerText = replyContext;
    document.getElementById('msgInput').focus();
    announce("Replying to message.");
    closeMsgAction();
}

function cancelReply() { replyContext = null; document.getElementById('replyBanner').style.display = 'none'; }

function execEditSetup() {
    editMsgId = actionMsgId;
    document.getElementById('editBanner').style.display = 'block';
    document.getElementById('editPreview').innerText = actionMsgText.substring(0,30) + "...";
    document.getElementById('msgInput').value = actionMsgText;
    document.getElementById('msgInput').focus();
    handleTyping();
    announce("Editing message.");
    closeMsgAction();
}

function cancelEdit() { editMsgId = null; document.getElementById('editBanner').style.display = 'none'; document.getElementById('msgInput').value = ""; handleTyping(); }

function scrollToPinned() { document.getElementById('chatHistory').scrollTop = 0; }

function triggerFileSelect(accept) {
    const i = document.getElementById('hiddenFileInput');
    i.accept = accept; i.click();
}

function handleFileSelection(input) {
    if(!input.files.length) return;
    pendingFile = input.files[0];
    if (pendingFile.size > 500 * 1024 * 1024) {
        playTone('error');
        showToast("Error: Exceeds 500MB secure threshold.");
        announce("File too large. Maximum 500 megabytes.");
        return;
    }
    document.getElementById('filePreviewText').innerText = "Selected: " + pendingFile.name + " (" + (pendingFile.size/1024/1024).toFixed(2) + " MB)";
    document.getElementById('fileSendModal').showModal();
    document.getElementById('fileCaption').focus();
    announce("File selected. Enter caption and send.");
}

function cancelFileSend() { document.getElementById('fileSendModal').close(); pendingFile = null; }

async function executeFileSend() {
    document.getElementById('fileSendModal').close();
    const cap = document.getElementById('fileCaption').value;
    const msgId = generateMsgId();
    showToast("Sending file...");
    playTone('send');
    
    const buffer = await pendingFile.arrayBuffer();
    const meta = { name: pendingFile.name, type: pendingFile.type };
    
    conn.send({ type: 'file', id: msgId, fileMeta: meta, fileData: buffer, caption: cap });
    appendMedia(msgId, "You", meta, buffer, true, cap);
    announce("You sent a file.");
    pendingFile = null;
    document.getElementById('fileCaption').value = "";
}

function shareCurrentLocation() {
    if(navigator.geolocation) {
        showToast("Acquiring GPS...");
        navigator.geolocation.getCurrentPosition(pos => {
            const lat = pos.coords.latitude.toFixed(5);
            const lng = pos.coords.longitude.toFixed(5);
            const mapsLink = `https://www.google.com/maps/search/?api=1&query=$${lat},${lng}`;
            const msgId = generateMsgId();
            
            conn.send({type: 'location', id: msgId, live: false, lat: lat, lng: lng});
            
            const locHtml = `📍 Shared Location: <br><a href="${mapsLink}" target="_blank" style="color:#58a6ff; font-weight:bold;">Open in Google Maps</a>`;
            appendMessageHtml(msgId, "You", locHtml, true, null);
            playTone('send');
            announce("You shared your current location.");
        }, () => {
            playTone('error'); showToast("Failed to acquire GPS."); announce("Failed to acquire GPS.");
        });
    }
}

async function startRecording() {
    initAudio(); playTone('record');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({audio: true});
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        
        document.getElementById('msgInput').style.display = 'none';
        document.getElementById('sendTextBtn').style.display = 'none';
        document.getElementById('micBtn').style.display = 'none';
        document.getElementById('emojiSelect').style.display = 'none';
        document.getElementById('attachSelect').style.display = 'none';
        document.getElementById('voiceUi').style.display = 'flex';
        
        isPaused = false;
        document.getElementById('voicePauseBtn').innerText = "⏸ Pause";
        voiceSeconds = 0;
        voiceAccumulated = 0;
        voiceStartTime = Date.now();
        document.getElementById('voiceTimer').innerText = "00:00";
        voiceTimerInterval = setInterval(() => {
            let totalMs = voiceAccumulated;
            if(!isPaused) totalMs += (Date.now() - voiceStartTime);
            voiceSeconds = Math.floor(totalMs / 1000);
            const m = String(Math.floor(voiceSeconds/60)).padStart(2,'0');
            const s = String(voiceSeconds%60).padStart(2,'0');
            document.getElementById('voiceTimer').innerText = m+":"+s;
        }, 1000);
        
        mediaRecorder.start();
        document.getElementById('voicePauseBtn').focus();
        announce("Recording started. Focus moved to pause button.");
    } catch(err) { playTone('error'); showToast("Microphone access denied."); announce("Microphone access denied."); }
}

function pauseResumeRecording() {
    const btn = document.getElementById('voicePauseBtn');
    if(mediaRecorder.state === "recording") {
        mediaRecorder.pause(); isPaused = true; btn.innerText = "▶ Resume"; playTone('pause'); announce("Recording paused.");
        voiceAccumulated += (Date.now() - voiceStartTime);
    } else if(mediaRecorder.state === "paused") {
        mediaRecorder.resume(); isPaused = false; btn.innerText = "⏸ Pause"; playTone('resume'); announce("Recording resumed.");
        voiceStartTime = Date.now();
    }
}

function discardRecording() {
    playTone('discard');
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
    clearInterval(voiceTimerInterval);
    resetInputUI();
    announce("Recording discarded.");
}

function sendRecording() {
    mediaRecorder.onstop = async () => {
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
        clearInterval(voiceTimerInterval);
        const blob = new Blob(audioChunks, {type: 'audio/webm'});
        const buffer = await blob.arrayBuffer();
        const msgId = generateMsgId();
        
        conn.send({type: 'voice', id: msgId, audioData: buffer});
        appendVoice(msgId, "You", buffer, true);
        playTone('send');
        resetInputUI();
        announce("You sent an audio message.");
    };
    mediaRecorder.stop();
}

function resetInputUI() {
    document.getElementById('voiceUi').style.display = 'none';
    document.getElementById('msgInput').style.display = 'block';
    document.getElementById('micBtn').style.display = 'block';
    document.getElementById('emojiSelect').style.display = 'block';
    document.getElementById('attachSelect').style.display = 'block';
    document.getElementById('msgInput').focus();
}

function promptClearChats() { 
    const hist = document.getElementById('chatHistory');
    if (hist.children.length === 0) {
        playTone('error');
        showToast("Error: Chat history is already empty.");
        announce("Chat history is already empty.");
        return;
    }
    if (window.confirm("Warning: This action will permanently erase the entire chat history for BOTH users. This action cannot be reversed. Do you wish to proceed?")) {
        executeClearChats();
    } else {
        announce("Action cancelled.");
    }
}

function executeClearChats() {
    document.getElementById('chatHistory').innerHTML = '';
    conn.send({type: 'clear_all'});
    playTone('clear');
    announce("Chat history cleared.");
}

function promptDisconnect() { 
    if (window.confirm("Warning: Terminating the connection will permanently destroy the secure tunnel. All active session data will be instantly purged. Do you wish to proceed?")) {
        executeDisconnect();
    } else {
        announce("Action cancelled.");
    }
}

function executeDisconnect() {
    handleDisconnectCleanup();
}

function initiateWebRTCCall(type) {
    initAudio();
    setCallLockdown(true);
    
    const constraints = {
        video: type === 'video',
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 2
        }
    };
    
    navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        document.getElementById('localVideo').srcObject = stream;
        
        webrtcCall = peer.call(conn.peer, stream, { metadata: { type: type, caller: myName } });
        setupCallEvents(webrtcCall, type);
        
        document.getElementById('outgoingCallText').innerText = `Calling ${otherName}...`;
        document.getElementById('outgoingCallModal').showModal();
        controlRingTone('start', 'call_out');
        announce(`Calling ${otherName}`);
        
        callTimeoutTimer = setTimeout(() => {
            cancelOutgoingCall(true);
        }, 120000);
    })
    .catch(err => { 
        setCallLockdown(false);
        playTone('error'); 
        showToast("Microphone or camera access denied."); 
        announce("Microphone or camera access denied."); 
    });
}

function setupPeerCallEvents() {
    peer.on('call', call => {
        incomingCallObj = call;
        const callType = call.metadata.type;
        document.getElementById('incomingCallText').innerText = `Incoming ${callType} call from ${call.metadata.caller}`;
        document.getElementById('incomingCallModal').showModal();
        document.getElementById('incomingCallModal').focus();
        controlRingTone('start', 'call_in');
        announce(`Incoming ${callType} call from ${call.metadata.caller}`);
    });
}

function acceptIncomingCall() {
    document.getElementById('incomingCallModal').close();
    controlRingTone('stop');
    const type = incomingCallObj.metadata.type;
    setCallLockdown(true);
    
    const constraints = {
        video: type === 'video',
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 2
        }
    };
    
    navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        document.getElementById('localVideo').srcObject = stream;
        incomingCallObj.answer(stream);
        webrtcCall = incomingCallObj;
        setupCallEvents(webrtcCall, type);
        showActiveCallUI(type);
    })
    .catch(err => {
        setCallLockdown(false);
        playTone('error');
        showToast("Microphone or camera access denied.");
        conn.send({type: 'call_signal', action: 'decline'});
    });
}

function declineIncomingCall() {
    document.getElementById('incomingCallModal').close();
    controlRingTone('stop');
    conn.send({type: 'call_signal', action: 'decline'});
    if(incomingCallObj) incomingCallObj.close();
}

function cancelOutgoingCall(isAuto = false) {
    if (callTimeoutTimer) clearTimeout(callTimeoutTimer);
    document.getElementById('outgoingCallModal').close();
    controlRingTone('stop');
    conn.send({type: 'call_signal', action: 'cancel'});
    if(webrtcCall) webrtcCall.close();
    stopLocalStream();
    setCallLockdown(false);
    if (isAuto) {
        playTone('error');
        showToast("Call not answered.");
        announce("Call not answered.");
    }
}

function handleCallSignal(d) {
    if (d.action === 'decline') {
        if (callTimeoutTimer) clearTimeout(callTimeoutTimer);
        document.getElementById('outgoingCallModal').close();
        controlRingTone('stop');
        playTone('call_end');
        showToast("Call declined.");
        announce("Call declined.");
        stopLocalStream();
        setCallLockdown(false);
    } else if (d.action === 'cancel') {
        document.getElementById('incomingCallModal').close();
        controlRingTone('stop');
        playTone('call_end');
        showToast("Missed call.");
        announce("Missed call.");
    } else if (d.action === 'end') {
        endActiveCallUI();
    }
}

function setupCallEvents(call, type) {
    call.on('stream', remoteStream => {
        if (callTimeoutTimer) clearTimeout(callTimeoutTimer);
        const outModal = document.getElementById('outgoingCallModal');
        if(outModal.open) outModal.close();
        controlRingTone('stop');
        document.getElementById('remoteVideo').srcObject = remoteStream;
        showActiveCallUI(type);
        playTone('call_accept');
    });
    call.on('close', () => {
        endActiveCallUI();
    });
    if (call.peerConnection) {
        call.peerConnection.addEventListener('iceconnectionstatechange', () => {
            const state = call.peerConnection.iceConnectionState;
            if(state === 'disconnected' || state === 'failed' || state === 'closed') {
                endActiveCallUI();
            }
        });
    }
}

function showActiveCallUI(type) {
    document.getElementById('activeCallPanel').style.display = 'flex';
    if (type === 'video') {
        document.getElementById('videoContainer').style.display = 'inline-block';
        document.getElementById('callCamBtn').style.display = 'inline-block';
    } else {
        document.getElementById('videoContainer').style.display = 'none';
        document.getElementById('callCamBtn').style.display = 'none';
    }
    
    requestWakeLock();
    callDurationSec = 0;
    callStartTime = Date.now();
    document.getElementById('callStatusText').innerText = "Active Call - 00:00";
    announce("Call connected.");
    
    callTimerInterval = setInterval(() => {
        callDurationSec = Math.floor((Date.now() - callStartTime) / 1000);
        const m = String(Math.floor(callDurationSec/60)).padStart(2,'0');
        const s = String(callDurationSec%60).padStart(2,'0');
        document.getElementById('callStatusText').innerText = `Active Call - ${m}:${s}`;
    }, 1000);
}

function endActiveCallUI() {
    if (document.getElementById('activeCallPanel').style.display === 'flex') {
        playTone('call_end');
        announce("Call ended.");
    }
    document.getElementById('activeCallPanel').style.display = 'none';
    clearInterval(callTimerInterval);
    releaseWakeLock();
    if(webrtcCall) webrtcCall.close();
    webrtcCall = null;
    stopLocalStream();
    setCallLockdown(false);
}

function endWebRTCCall() {
    conn.send({type: 'call_signal', action: 'end'});
    endActiveCallUI();
}

function stopLocalStream() {
    if(localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
}

function toggleCallMic() {
    if(localStream) {
        const track = localStream.getAudioTracks()[0];
        if(track) {
            track.enabled = !track.enabled;
            document.getElementById('callMicBtn').innerText = track.enabled ? "🎤 Mute Mic" : "🔇 Unmute Mic";
            announce(track.enabled ? "Microphone active." : "Microphone muted.");
        }
    }
}

function toggleCallCam() {
    if(localStream) {
        const track = localStream.getVideoTracks()[0];
        if(track) {
            track.enabled = !track.enabled;
            document.getElementById('callCamBtn').innerText = track.enabled ? "📸 Cam Off" : "📹 Cam On";
            announce(track.enabled ? "Camera active." : "Camera off.");
        }
    }
}

document.getElementById('incomingCallModal').addEventListener('cancel', function(e) {
    e.preventDefault();
    declineIncomingCall();
});

document.getElementById('outgoingCallModal').addEventListener('cancel', function(e) {
    e.preventDefault();
    cancelOutgoingCall();
});

window.addEventListener('beforeunload', () => {
    if(conn && conn.open) conn.send({type: 'disconnect', isHost: isHost});
    if(webrtcCall) webrtcCall.close();
    if(peer) peer.destroy();
});

window.onload = checkUrlParams;