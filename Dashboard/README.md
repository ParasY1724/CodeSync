# </> CodeSync - Real-Time Collaborative Code Editor

A modern, real-time collaborative code editor built for seamless pair programming and team coding sessions. Create or join rooms instantly and code together with live cursor tracking, chat, and voice communication.

![Built with React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3FCF8E?logo=supabase)


## Features

### 🏠 Rooms
- Generate unique 6-character room codes instantly or join via code
- Auto-cleanup after 5 minutes of inactivity
- Seamless rejoin if connection drops

### 📝 Editor
- CodeMirror 6 with Python, C++, Go, and JavaScript support
- Context-aware autocompletion and Dracula-inspired dark theme

### 👥 Real-Time Collaboration
- Live cursors with name labels — see exactly where teammates are typing
- Presence indicators, per-user active file display, and click-to-navigate

### 📁 File Management
- Tree-view explorer with full create / rename / delete support
- ZIP import and export for bulk file transfers
- All changes sync instantly across all participants

### 💬 Communication
- Built-in room chat with timestamps
- WebRTC mesh voice chat with participant count and join/leave notifications

---

## Quick Start

```bash
git clone https://github.com/ParasY1724/OnlineJudger.git
cd OnlineJudger
npm install
npm run dev
```

Requires Node.js 18+ or Bun.

### Environment Variables

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-id>
```

> Auto-configured on Lovable Cloud. For local dev, create a `.env` file at the project root.

---

### Database Schema

```
┌─────────────────┐     ┌──────────────────────┐
│     rooms       │     │  room_participants   │
├─────────────────┤     ├──────────────────────┤
│ id (uuid)       │◄────│ room_id (uuid)       │
│ room_code       │     │ user_id (uuid)       │
│ created_by      │     │ is_active (bool)     │
│ created_at      │     │ joined_at            │
└─────────────────┘     └──────────────────────┘
        │
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│     files       │     │    folders      │
├─────────────────┤     ├─────────────────┤
│ id (uuid)       │     │ id (uuid)       │
│ room_id (uuid)  │     │ room_id (uuid)  │
│ name            │     │ name            │
│ path            │     │ path            │
│ content         │     │ parent_path     │
│ extension       │     │ created_by      │
│ created_by      │     │ created_at      │
│ created_at      │     └─────────────────┘
│ updated_at      │
└─────────────────┘
        │
        │
┌─────────────────┐     ┌─────────────────┐
│    messages     │     │    profiles     │
├─────────────────┤     ├─────────────────┤
│ id (uuid)       │     │ id (uuid)       │
│ room_id (uuid)  │     │ user_id (uuid)  │
│ user_id (uuid)  │     │ display_name    │
│ content         │     │ avatar_url      │
│ created_at      │     │ created_at      │
└─────────────────┘     │ updated_at      │
                        └─────────────────┘
```

---

## 🔄 Real-Time Features

### Supabase Channels

The app uses multiple Supabase Realtime channels for different features:

| Channel | Purpose |
|---------|---------|
| `presence-{roomCode}` | Track online users |
| `cursors-{roomCode}` | Sync cursor positions |
| `code-sync-{roomCode}` | Broadcast code changes |
| `room-events-{roomCode}` | Join/leave notifications |
| `active-files-{roomCode}` | Track which file users edit |
| `room-participants-{roomId}` | Postgres changes for participants |
| `files-{roomId}` | Postgres changes for files |
| `folders-{roomId}` | Postgres changes for folders |
| `messages-{roomId}` | Postgres changes for chat |

### WebRTC Voice Chat

Voice chat uses a mesh topology for peer-to-peer audio:

```
     ┌─────────┐
     │ User A  │
     └────┬────┘
          │ WebRTC
    ┌─────┴─────┐
    │           │
┌───▼───┐   ┌───▼───┐
│User B │◄──│User C │
└───────┘   └───────┘
```

- Signaling via Supabase broadcast channels
- Direct peer connections for low-latency audio
- Automatic peer discovery when joining voice

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Lovable account (for backend)

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

The following are automatically configured by Lovable Cloud:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```


---

## Security
 
- Row Level Security on all tables — users only access rooms they've joined
- Email/password auth via Supabase with session persistence
- Protected routes redirect to `/auth`
 
