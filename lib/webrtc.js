const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Manages one RTCPeerConnection per remote participant (mesh topology).
// Whichever side already has an established room seat initiates the offer
// to a newcomer, so exactly one side ever calls createOffer per pair —
// that ordering rule is what keeps the two sides from racing each other.
export class PeerManager {
  constructor({ socket, onRemoteStream, onRemoteLeft, onConnectionState }) {
    this.socket = socket;
    this.onRemoteStream = onRemoteStream;
    this.onRemoteLeft = onRemoteLeft;
    this.onConnectionState = onConnectionState;
    this.peers = new Map(); // remoteId -> RTCPeerConnection
    this.localStream = null;
  }

  setLocalStream(stream) {
    this.localStream = stream;
    // Push the new/changed tracks (e.g. after a screen-share swap) to every open connection.
    for (const pc of this.peers.values()) {
      const senders = pc.getSenders();
      stream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track && s.track.kind === track.kind);
        if (sender) sender.replaceTrack(track);
        else pc.addTrack(track, stream);
      });
    }
  }

  _createConnection(remoteId) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('signal', {
          to: remoteId,
          data: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      this.onRemoteStream(remoteId, event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      this.onConnectionState?.(remoteId, pc.connectionState);
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        // Leave cleanup to the explicit peer-left/leave-room path; a transient
        // "disconnected" can still recover, so we only log here.
      }
    };

    this.peers.set(remoteId, pc);
    return pc;
  }

  // Called by the side that was already in the room when `remoteId` joined.
  async initiateTo(remoteId) {
    const pc = this._createConnection(remoteId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.socket.emit('signal', { to: remoteId, data: { type: 'offer', sdp: offer } });
  }

  async handleSignal(fromId, data) {
    let pc = this.peers.get(fromId);

    if (data.type === 'offer') {
      if (!pc) pc = this._createConnection(fromId);
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit('signal', { to: fromId, data: { type: 'answer', sdp: answer } });
    } else if (data.type === 'answer') {
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    } else if (data.type === 'candidate') {
      if (pc && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          // Candidates that arrive before the remote description is set are
          // dropped rather than queued, for prototype simplicity.
          console.warn('Could not add ICE candidate', err);
        }
      }
    }
  }

  removePeer(remoteId) {
    const pc = this.peers.get(remoteId);
    if (pc) {
      pc.close();
      this.peers.delete(remoteId);
    }
    this.onRemoteLeft(remoteId);
  }

  closeAll() {
    for (const pc of this.peers.values()) pc.close();
    this.peers.clear();
  }
}
