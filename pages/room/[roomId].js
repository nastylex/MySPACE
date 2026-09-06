import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getSocket } from '../../lib/socket';
import { PeerManager } from '../../lib/webrtc';
import VideoTile from '../../components/VideoTile';
import Controls from '../../components/Controls';
import ChatPanel from '../../components/ChatPanel';

export default function Room() {
  const router = useRouter();
  const { roomId } = router.query;
  const name = (router.query.name || 'Guest').toString();

  const [ready, setReady] = useState(false);
  const [selfId, setSelfId] = useState(null);
  const [localTileStream, setLocalTileStream] = useState(null);
  const [peers, setPeers] = useState({}); // id -> { name, stream, micOn, cameraOn }
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [unreadChat, setUnreadChat] = useState(0);
  const [fatalError, setFatalError] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const copyInviteLink = useCallback(async () => {
    if (!roomId) return;
    const inviteUrl = `${window.location.origin}/room/${encodeURIComponent(roomId)}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      const input = document.createElement('input');
      input.value = inviteUrl;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }

    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 2200);
  }, [roomId]);

  const cameraStreamRef = useRef(null);
  const displayStreamRef = useRef(null);
  const socketRef = useRef(null);
  const peerManagerRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const namesRef = useRef({}); // id -> name, kept outside state for use in async handlers

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    async function init() {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        if (!cancelled) setFatalError('Camera or microphone access is off. Turn it on in your browser, then reload.');
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      cameraStreamRef.current = stream;
      setLocalTileStream(stream);

      const socket = getSocket();
      socketRef.current = socket;

      const peerManager = new PeerManager({
        socket,
        onRemoteStream: (id, remoteStream) => {
          setPeers((prev) => ({
            ...prev,
            [id]: { ...(prev[id] || { name: namesRef.current[id] || 'Guest', micOn: true, cameraOn: true }), stream: remoteStream },
          }));
        },
        onRemoteLeft: (id) => {
          setPeers((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        },
      });
      peerManagerRef.current = peerManager;
      peerManager.setLocalStream(stream);

      function onConnect() {
        setSelfId(socket.id);
        socket.emit('join-room', { roomId, name });
      }
      socket.on('connect', onConnect);

      socket.on('room-participants', (list) => {
        list.forEach((p) => {
          namesRef.current[p.id] = p.name;
        });
        setPeers((prev) => {
          const next = { ...prev };
          list.forEach((p) => {
            next[p.id] = next[p.id] || { name: p.name, stream: null, micOn: true, cameraOn: true };
          });
          return next;
        });
      });

      socket.on('peer-joined', ({ id, name: peerName }) => {
        namesRef.current[id] = peerName;
        setPeers((prev) => ({ ...prev, [id]: prev[id] || { name: peerName, stream: null, micOn: true, cameraOn: true } }));
        peerManager.initiateTo(id);
      });

      socket.on('signal', ({ from, data }) => {
        peerManager.handleSignal(from, data);
      });

      socket.on('peer-left', ({ id }) => {
        peerManager.removePeer(id);
      });

      socket.on('media-state', ({ from, micOn: remoteMic, cameraOn: remoteCamera }) => {
        setPeers((prev) => (prev[from] ? { ...prev, [from]: { ...prev[from], micOn: remoteMic, cameraOn: remoteCamera } } : prev));
      });

      socket.on('chat-message', (msg) => {
        setMessages((prev) => [...prev, msg]);
        setChatOpen((open) => {
          if (!open) setUnreadChat((n) => n + 1);
          return open;
        });
      });

      setReady(true);
      if (socket.connected) onConnect();
    }

    init();

    return () => {
      cancelled = true;
      const socket = socketRef.current;
      if (socket) {
        socket.emit('leave-room');
        socket.off('connect');
        socket.off('room-participants');
        socket.off('peer-joined');
        socket.off('signal');
        socket.off('peer-left');
        socket.off('media-state');
        socket.off('chat-message');
      }
      peerManagerRef.current?.closeAll();
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const toggleMic = useCallback(() => {
    const stream = cameraStreamRef.current;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
    socketRef.current?.emit('media-state', { roomId, micOn: next, cameraOn });
  }, [micOn, cameraOn, roomId]);

  const toggleCamera = useCallback(() => {
    const stream = cameraStreamRef.current;
    if (!stream) return;
    const next = !cameraOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = next));
    setCameraOn(next);
    socketRef.current?.emit('media-state', { roomId, micOn, cameraOn: next });
  }, [cameraOn, micOn, roomId]);

  const revertToCamera = useCallback(() => {
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current = null;
    const cam = cameraStreamRef.current;
    if (cam) {
      peerManagerRef.current?.setLocalStream(cam);
      setLocalTileStream(cam);
    }
    setSharingScreen(false);
  }, []);

  const toggleShare = useCallback(async () => {
    if (sharingScreen) {
      revertToCamera();
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      displayStreamRef.current = display;
      const audioTracks = cameraStreamRef.current ? cameraStreamRef.current.getAudioTracks() : [];
      const combined = new MediaStream([...display.getVideoTracks(), ...audioTracks]);
      peerManagerRef.current?.setLocalStream(combined);
      setLocalTileStream(combined);
      setSharingScreen(true);
      display.getVideoTracks()[0].addEventListener('ended', revertToCamera);
    } catch (err) {
      // User cancelled the share picker — no action needed.
    }
  }, [sharingScreen, revertToCamera]);

  const toggleRecord = useCallback(() => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    const stream = localTileStream;
    if (!stream) return;
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `myspace-recording-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setRecording(false);
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }, [recording, localTileStream]);

  const sendChat = useCallback(
    (text) => {
      socketRef.current?.emit('chat-message', { roomId, text, name });
      setMessages((prev) => [...prev, { from: selfId, name, text, at: Date.now() }]);
    },
    [roomId, name, selfId]
  );

  const openChat = useCallback(() => {
    setChatOpen((open) => !open);
    setUnreadChat(0);
  }, []);

  const leave = useCallback(() => {
    router.push('/');
  }, [router]);

  if (fatalError) {
    return (
      <div className="error-screen">
        <p>{fatalError}</p>
        <style jsx>{`
          .error-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            text-align: center;
            color: var(--text);
          }
        `}</style>
      </div>
    );
  }

  const peerList = Object.entries(peers);

  return (
    <>
      <Head>
        <title>{roomId ? `${roomId} — MySPACE` : 'MySPACE'}</title>
      </Head>
      <main className="room">
        <div className="topbar">
          <div className="room-heading">
            <span className="room-code">{roomId}</span>
            <span className="count">{peerList.length + 1} in the meeting</span>
          </div>
          <button type="button" className="invite-button" onClick={copyInviteLink}>
            {inviteCopied ? 'Link copied' : 'Copy invite link'}
          </button>
        </div>

        <div className="grid" data-count={Math.min(peerList.length + 1, 9)}>
          <VideoTile stream={localTileStream} name={name} isLocal micOff={!micOn} cameraOff={!cameraOn && !sharingScreen} />
          {peerList.map(([id, p]) => (
            <VideoTile key={id} stream={p.stream} name={p.name} micOff={p.micOn === false} cameraOff={p.cameraOn === false} />
          ))}
        </div>

        {!ready && <p className="connecting">Connecting…</p>}

        <Controls
          micOn={micOn}
          cameraOn={cameraOn}
          sharingScreen={sharingScreen}
          recording={recording}
          chatOpen={chatOpen}
          unreadChat={unreadChat}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onToggleShare={toggleShare}
          onToggleRecord={toggleRecord}
          onToggleChat={openChat}
          onLeave={leave}
        />

        <ChatPanel
          open={chatOpen}
          messages={messages}
          selfId={selfId}
          onSend={sendChat}
          onClose={() => setChatOpen(false)}
        />
      </main>

      <style jsx>{`
        .room {
          min-height: 100vh;
          padding: 20px 20px 120px;
        }
        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 18px;
          font-size: 0.8125rem;
          color: var(--text-dim);
        }
        .room-heading {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .room-code {
          font-family: var(--font-display);
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .invite-button {
          flex: 0 0 auto;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.8125rem;
          cursor: pointer;
        }
        .invite-button:hover {
          border-color: var(--accent);
          background: var(--surface-raised);
        }
        .grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }
        .connecting {
          color: var(--text-dim);
          font-size: 0.8125rem;
          margin-top: 14px;
        }
      `}</style>
    </>
  );
}
