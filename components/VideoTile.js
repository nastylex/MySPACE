import { useEffect, useRef } from 'react';

export default function VideoTile({ stream, name, isLocal, micOff, cameraOff }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <div className="tile">
      {stream && !cameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`tile-video ${isLocal ? 'mirrored' : ''}`}
        />
      ) : (
        <div className="tile-fallback">
          <span>{(name || '?').slice(0, 1).toUpperCase()}</span>
        </div>
      )}
      <div className="tile-label">
        <span>{name}{isLocal ? ' (you)' : ''}</span>
        {micOff && <span className="mic-off" aria-label="Microphone muted" title="Microphone muted" />}
      </div>

      <style jsx>{`
        .tile {
          position: relative;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          aspect-ratio: 16 / 10;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tile-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .mirrored {
          transform: scaleX(-1);
        }
        .tile-fallback {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--accent-soft);
          color: var(--accent-strong);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 1.5rem;
        }
        .tile-label {
          position: absolute;
          left: 10px;
          bottom: 10px;
          background: rgba(14, 15, 18, 0.65);
          color: var(--text);
          font-size: 0.75rem;
          padding: 4px 9px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .mic-off {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--danger);
          display: inline-block;
        }
      `}</style>
    </div>
  );
}
