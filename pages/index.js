import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

function randomRoomCode() {
  const words = ['echo', 'delta', 'lumen', 'atlas', 'nova', 'quartz', 'cobalt', 'fern'];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = Math.floor(100 + Math.random() * 900);
  return `${word}-${digits}`;
}

export default function Home() {
  const router = useRouter();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [mediaError, setMediaError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        setMediaError('Camera or microphone access is off. Turn it on in your browser to join with video.');
      }
    }

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function toggleMic() {
    const stream = streamRef.current;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  }

  function toggleCamera() {
    const stream = streamRef.current;
    if (!stream) return;
    const next = !cameraOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = next));
    setCameraOn(next);
  }

  function enterRoom(e) {
    e.preventDefault();
    const code = (roomCode || randomRoomCode()).trim().toLowerCase().replace(/\s+/g, '-');
    const displayName = name.trim() || 'Guest';
    router.push(`/room/${encodeURIComponent(code)}?name=${encodeURIComponent(displayName)}`);
  }

  return (
    <>
      <Head>
        <title>MySPACE — start or join a meeting</title>
      </Head>
      <main className="lobby">
        <section className="preview">
          <video ref={videoRef} autoPlay muted playsInline className="preview-video" />
          {mediaError && <p className="preview-error">{mediaError}</p>}
          <div className="preview-controls">
            <button
              type="button"
              className={`pill ${micOn ? '' : 'pill-off'}`}
              onClick={toggleMic}
              aria-pressed={!micOn}
            >
              {micOn ? 'Mic on' : 'Mic off'}
            </button>
            <button
              type="button"
              className={`pill ${cameraOn ? '' : 'pill-off'}`}
              onClick={toggleCamera}
              aria-pressed={!cameraOn}
            >
              {cameraOn ? 'Camera on' : 'Camera off'}
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="wordmark">MySPACE</div>
          <p className="tagline">HD meetings, straight from your browser. No install.</p>

          <form onSubmit={enterRoom} className="join-form">
            <label className="field">
              <span>Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Lee"
                maxLength={40}
              />
            </label>

            <label className="field">
              <span>Meeting code</span>
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Leave blank to start a new one"
                className="code-input"
                maxLength={40}
              />
            </label>

            <button type="submit" className="join-button">
              {roomCode.trim() ? 'Join meeting' : 'Start meeting'}
            </button>
          </form>
        </section>
      </main>

      <style jsx>{`
        .lobby {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
        }
        .preview {
          position: relative;
          background: #0e0f12;
          display: flex;
          align-items: flex-end;
        }
        .preview-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }
        .preview-error {
          position: absolute;
          top: 24px;
          left: 24px;
          right: 24px;
          background: var(--danger-soft);
          border: 1px solid var(--danger);
          color: var(--text);
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 0.875rem;
        }
        .preview-controls {
          position: absolute;
          bottom: 28px;
          left: 28px;
          display: flex;
          gap: 10px;
        }
        .pill {
          background: rgba(20, 22, 26, 0.75);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 9px 16px;
          border-radius: 999px;
          font-size: 0.8125rem;
          cursor: pointer;
        }
        .pill-off {
          background: var(--danger-soft);
          border-color: var(--danger);
        }
        .panel {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px;
          border-left: 1px solid var(--border);
        }
        .wordmark {
          font-family: var(--font-display);
          font-size: 1.75rem;
          letter-spacing: -0.01em;
        }
        .tagline {
          color: var(--text-dim);
          margin: 10px 0 40px;
          max-width: 34ch;
        }
        .join-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
          max-width: 360px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.8125rem;
          color: var(--text-dim);
        }
        .field input {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 12px 14px;
          border-radius: 6px;
          font-size: 0.9375rem;
        }
        .code-input {
          font-family: var(--font-display);
          letter-spacing: 0.02em;
        }
        .join-button {
          margin-top: 8px;
          background: var(--accent);
          border: none;
          color: #0c1210;
          font-weight: 600;
          padding: 13px 20px;
          border-radius: 6px;
          font-size: 0.9375rem;
          cursor: pointer;
        }
        .join-button:hover {
          background: var(--accent-strong);
        }
        @media (max-width: 860px) {
          .lobby {
            grid-template-columns: 1fr;
            grid-template-rows: 45vh 1fr;
          }
          .panel {
            border-left: none;
            border-top: 1px solid var(--border);
            padding: 40px 28px;
          }
        }
      `}</style>
    </>
  );
}
