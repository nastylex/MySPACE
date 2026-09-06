import { useEffect, useRef, useState } from 'react';

export default function ChatPanel({ open, messages, selfId, onSend, onClose }) {
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  function submit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  }

  return (
    <aside className={`panel ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="header">
        <span>In-call messages</span>
        <button type="button" className="close" onClick={onClose} aria-label="Close chat">
          Close
        </button>
      </div>

      <div className="list" ref={listRef}>
        {messages.length === 0 && <p className="empty">No messages yet. Say hello.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.from === selfId ? 'mine' : ''}`}>
            <div className="msg-meta">{m.from === selfId ? 'You' : m.name}</div>
            <div className="msg-body">{m.text}</div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="composer">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message everyone"
          maxLength={2000}
        />
        <button type="submit">Send</button>
      </form>

      <style jsx>{`
        .panel {
          position: fixed;
          top: 0;
          right: -340px;
          width: 320px;
          height: 100vh;
          background: var(--surface);
          border-left: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          transition: right 0.2s ease;
          z-index: 5;
        }
        .panel.open {
          right: 0;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 18px;
          border-bottom: 1px solid var(--border);
          font-size: 0.875rem;
        }
        .close {
          background: none;
          border: none;
          color: var(--text-dim);
          cursor: pointer;
          font-size: 0.8125rem;
        }
        .list {
          flex: 1;
          overflow-y: auto;
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .empty {
          color: var(--text-dim);
          font-size: 0.8125rem;
        }
        .msg-meta {
          font-size: 0.6875rem;
          color: var(--text-dim);
          margin-bottom: 2px;
        }
        .msg-body {
          font-size: 0.875rem;
          background: var(--surface-raised);
          padding: 8px 11px;
          border-radius: 8px;
          display: inline-block;
          max-width: 100%;
          overflow-wrap: break-word;
        }
        .mine .msg-body {
          background: var(--accent-soft);
        }
        .composer {
          display: flex;
          gap: 8px;
          padding: 14px;
          border-top: 1px solid var(--border);
        }
        .composer input {
          flex: 1;
          background: var(--surface-raised);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 9px 12px;
          border-radius: 6px;
          font-size: 0.875rem;
        }
        .composer button {
          background: var(--accent);
          border: none;
          color: #0c1210;
          font-weight: 600;
          padding: 0 16px;
          border-radius: 6px;
          cursor: pointer;
        }
      `}</style>
    </aside>
  );
}
