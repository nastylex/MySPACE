# Relay — WebRTC meeting prototype

A working Next.js prototype of a browser-based video meeting product: camera/mic
preview, room codes, live multi-party video and audio, in-call chat, screen
share, and local session recording — no Zoom/Meet SDK, no third-party calling
service. Peer connections are custom WebRTC, signaled over a small Socket.io
server that runs alongside Next.js.

## Run it locally

```
npm install
npm run dev
```

Open `http://localhost:3000` in two browser windows (or two devices on the
same network, using your machine's LAN IP instead of `localhost`). Grant
camera/mic permission in both, join the same meeting code, and you'll see and
hear each other.

Note: `npm run dev` here runs the custom Socket.io + Next.js server (see
`server.js`), not plain `next dev` — that's intentional, it's what serves the
signaling endpoint.

## How the calling works

- **Signaling only goes through the server.** `server.js` runs a Socket.io
  server at `/api/signal` that relays join/offer/answer/ICE-candidate/chat
  messages between people in the same room. No media ever passes through it.
- **Media is peer-to-peer (mesh).** Each participant opens one
  `RTCPeerConnection` directly to every other participant (`lib/webrtc.js`).
  This is simplest to reason about and works well for small meetings (roughly
  2–6 people); it doesn't scale much beyond that since each participant's
  upload bandwidth is multiplied by the number of others in the call.
- **NAT traversal uses public STUN only** (Google's `stun.l.google.com`).
  That's enough on most home/office networks. Some networks (strict corporate
  firewalls, some mobile carriers) need a TURN relay to connect at all — see
  Roadmap.
- **Who calls whom:** when someone joins, everyone already in the room
  initiates an offer to them; the newcomer only answers. That one-directional
  rule is what keeps two sides from both trying to start the same connection
  at once.

## What's implemented

- Camera/mic preview and join flow (`pages/index.js`)
- Multi-party video grid, mute/camera toggle, leave (`pages/room/[roomId].js`)
- Screen sharing, swapped live into the existing peer connections
- In-call text chat, relayed by the signaling server
- Local recording via `MediaRecorder` — downloads a `.webm` of your own
  outgoing feed (camera or shared screen) when you stop recording

## Known limitations / roadmap

- **No TURN server.** Add one (e.g. coturn, or a hosted TURN provider) and
  list it in `ICE_SERVERS` in `lib/webrtc.js` for reliable connections across
  restrictive networks.
- **Recording is local-only**, one person's own feed, not a mixed recording
  of the whole meeting. A real "record this meeting" feature needs a
  server-side media pipeline (e.g. an SFU with a recording bot) — a bigger
  lift than this prototype covers.
- **Mesh topology caps group size.** For larger meetings, route media through
  an SFU (e.g. mediasoup, LiveKit, ion-sfu) instead of direct peer-to-peer.
- **No persistence.** Room membership lives in server memory; restarting the
  server drops everyone. Fine for a prototype, not for production.
- **No auth.** Anyone with a room code can join. Add access control before
  this goes anywhere near real users.
