# Chat System Architecture

## Overview

This is a production-grade, scalable chat system inspired by Slack, Teams, and WhatsApp, with built-in AI capabilities. The system supports multiple chat modes within a unified layout.

## Supported Features

### Core Chat Types

- ✅ **1v1 Chat** - Direct messaging between two users
- ✅ **Group Chat** - Multi-participant conversations
- ✅ **AI Chat** - Text-based AI assistant conversations
- 🚧 **AI Voice Call** - Voice conversations with AI (placeholder implemented)
- 🚧 **File/Media Sharing** - UI ready, backend integration pending
- 🚧 **System Notifications** - Architecture in place
- 🚧 **Mentions and Reactions** - Data model ready
- 🚧 **Threaded Replies** - Data model includes replyToId
- 🚧 **Video Call** - Extensible design for future implementation

## Architecture

### Directory Structure

```
components/chat/
├── layout/
│   ├── ChatContainer.tsx     # Main wrapper component
│   ├── ChatSidebar.tsx        # Conversation list
│   └── ChatHeader.tsx         # Dynamic header with call controls
├── view/
│   ├── MessageList.tsx        # Virtualized message display
│   └── MessageBubble.tsx      # Individual message component
├── input/
│   └── ChatInput.tsx          # Rich input with attachments
└── index.ts                   # Export barrel

store/
├── chat-store.ts              # Zustand state management
└── auth-store.ts              # User authentication state

types/
└── chat.ts                    # TypeScript interfaces

app/(dashboard)/
└── chat/
    └── page.tsx               # Chat route
```

### State Management

**Technology**: Zustand with devtools and persistence

**Store Structure** (`chat-store.ts`):

```typescript
{
  conversations: Conversation[]      // All user conversations
  activeConversationId: string       // Currently selected chat
  messages: Record<string, Message[]> // Messages by conversation
  typingUsers: Record<string, string[]> // Typing indicators
  searchQuery: string                // Conversation search
}
```

**Actions**:

- `setActiveConversation(id)` - Switch active chat
- `sendMessage(id, content, type)` - Send text/file/audio
- `markAsRead(id)` - Mark conversation as read
- `togglePin(id)` - Pin/unpin conversations
- `setTyping(id, isTyping)` - Typing indicators
- `setSearchQuery(query)` - Filter conversations

### Data Models

#### Message Types

```typescript
type MessageType = "text" | "image" | "file" | "audio" | "system";
```

#### Chat Types

```typescript
type ChatType = "dm" | "group" | "ai" | "channel";
```

#### Key Interfaces

- `User` - User profile with avatar and status
- `Message` - Message content with metadata
- `Conversation` - Chat metadata and participants
- `Attachment` - File/media metadata

## Component Details

### ChatContainer

- **Purpose**: Root component orchestrating layout
- **Composition**: Sidebar + Header + MessageList + Input
- **Responsive**: Single column layout

### ChatSidebar

- **Features**:
  - Search conversations
  - Filter by type (DM, Group, AI)
  - Unread count badges
  - Online status indicators
  - Pinned conversations (data model ready)
- **Performance**: Optimized for 100+ conversations

### MessageList

- **Features**:
  - Auto-scroll to latest
  - Read receipts (checkmarks)
  - Timestamp grouping
  - Empty states
- **Future**: Virtual scrolling for 1000+ messages

### ChatInput

- **Features**:
  - Multi-line text input
  - Enter to send, Shift+Enter for newline
  - Attachment menu (Photo, File)
  - Voice recording toggle
  - Emoji picker (UI ready)
- **Extensibility**: Easy to add markdown, mentions, etc.

### MessageBubble

- **Features**:
  - Sender avatar
  - Timestamp
  - Read status
  - Different styles for sender/receiver
- **Extensibility**: Supports reactions, replies, attachments

## AI Integration

### Current Implementation

- Mock AI responses with 1s delay
- Conversation type detection
- Dedicated AI conversation UI (bot icon)

### Future Enhancements

- WebSocket streaming for real-time AI responses
- Voice synthesis and recognition
- Context-aware responses using conversation history
- Tool calling (search, analytics, etc.)

## Real-time Features (To Implement)

### WebSocket Integration

Recommended architecture:

```
1. Create socket-store.ts for connection management
2. Subscribe to conversation-specific channels
3. Handle events:
   - message:new
   - message:read
   - user:typing
   - user:status
```

### Typing Indicators

- Data structure already in place
- Need backend WebSocket events
- UI will auto-render from typingUsers state

## Performance Optimizations

### Current

- Component-level memoization
- Zustand selective subscriptions
- Minimal re-renders

### Recommended

- Virtual scrolling (react-window) for message lists
- Image lazy loading
- Pagination for conversation list
- Service workers for offline support

## Styling & Design

- **Design System**: Tailwind CSS with semantic tokens
- **Theme**: Matches dashboard design system
- **Responsive**: Mobile-first approach
- **Accessibility**: ARIA labels, keyboard navigation ready

## Integration Points

### Backend API (To Implement)

```
GET    /api/conversations          # List user conversations
GET    /api/conversations/:id      # Get conversation details
POST   /api/conversations          # Create new conversation
GET    /api/messages/:convId       # Get messages (paginated)
POST   /api/messages               # Send message
POST   /api/messages/:id/read      # Mark as read
POST   /api/upload                 # File upload
```

### WebSocket Events (To Implement)

```
// Subscribe
ws.send({ type: 'subscribe', conversationId })

// Listen
ws.on('message:new', handleNewMessage)
ws.on('message:read', handleRead)
ws.on('typing:start', handleTypingStart)
ws.on('typing:stop', handleTypingStop)
```

## Future Enhancements

### Phase 2

- [ ] Media gallery view
- [ ] Message search within conversation
- [ ] Emoji reactions
- [ ] Threaded replies UI
- [ ] @mentions with autocomplete
- [ ] Link previews
- [ ] Message editing/deletion

### Phase 3

- [ ] Video calls (WebRTC)
- [ ] Screen sharing
- [ ] Poll creation
- [ ] Message pinning
- [ ] Custom bot integrations
- [ ] E2E encryption

## Development

### Running the App

```bash
cd .app
pnpm install
pnpm run dev
```

Navigate to `http://localhost:3000/chat`

### Testing

```bash
# Unit tests
pnpm test

# E2E tests (future)
pnpm test:e2e
```

### Mock Data

The system includes rich mock data for development:

- 3 conversation types (DM, Group, AI)
- Sample messages with different states
- Simulated AI responses

## Notes

- All TypeScript - full type safety
- Extensible architecture for future features
- Production-ready state management
- Clean separation of concerns
- Follows React best practices

---

**Status**: ✅ Core functionality complete  
**Next Steps**: Backend API integration, WebSocket real-time events
