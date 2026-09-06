export default function Controls({
  micOn,
  cameraOn,
  sharingScreen,
  recording,
  chatOpen,
  unreadChat,
  onToggleMic,
  onToggleCamera,
  onToggleShare,
  onToggleRecord,
  onToggleChat,
  onLeave,
}) {
  return (
    <div className="bar">
      <button
        type="button"
        className={`control ${micOn ? '' : 'control-off'}`}
        onClick={onToggleMic}
        aria-pressed={!micOn}
      >
        {micOn ? 'Mute' : 'Unmute'}
      </button>
      <button
        type="button"
        className={`control ${cameraOn ? '' : 'control-off'}`}
        onClick={onToggleCamera}
        aria-pressed={!cameraOn}
      >
        {cameraOn ? 'Stop video' : 'Start video'}
      </button>
      <button
        type="button"
        className={`control ${sharingScreen ? 'control-active' : ''}`}
        onClick={onToggleShare}
      >
        {sharingScreen ? 'Stop sharing' : 'Share screen'}
      </button>
      <button
        type="button"
        className={`control ${recording ? 'control-active' : ''}`}
        onClick={onToggleRecord}
      >
        {recording ? 'Stop recording' : 'Record'}
      </button>
      <button type="button" className="control" onClick={onToggleChat}>
        Chat{unreadChat > 0 && !chatOpen ? ` (${unreadChat})` : ''}
      </button>
      <button type="button" className="control control-leave" onClick={onLeave}>
        Leave
      </button>

      <style jsx>{`
        .bar {
          position: fixed;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          background: rgba(27, 30, 36, 0.92);
          border: 1px solid var(--border);
          padding: 8px;
          border-radius: 999px;
          backdrop-filter: blur(6px);
        }
        .control {
          background: transparent;
          border: none;
          color: var(--text);
          padding: 10px 16px;
          border-radius: 999px;
          font-size: 0.8125rem;
          cursor: pointer;
          white-space: nowrap;
        }
        .control:hover {
          background: var(--surface-raised);
        }
        .control-off {
          background: var(--danger-soft);
          color: var(--text);
        }
        .control-active {
          background: var(--accent-soft);
          color: var(--accent-strong);
        }
        .control-leave {
          background: var(--danger);
          color: #180a07;
          font-weight: 600;
        }
        .control-leave:hover {
          background: #c96b51;
        }
        @media (max-width: 640px) {
          .bar {
            gap: 2px;
            padding: 6px;
          }
          .control {
            padding: 9px 10px;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
