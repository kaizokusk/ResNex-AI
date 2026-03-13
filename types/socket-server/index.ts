// socket-server/index.ts — Socket.io realtime server (deploy to Render)
// Separate Node.js server for group chat broadcasting

import express from 'express'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import cors from 'cors'

const app = express()
const httpServer = createServer(app)

app.use(cors({ origin: '*' }))
app.use(express.json())

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

// Room management: one room per project
const projectRooms = new Map<string, Set<string>>()

io.on('connection', (socket: Socket) => {
  console.log(`[socket] connected: ${socket.id}`)

  // Join a project room
  socket.on('join_project', (projectId: string) => {
    socket.join(`project:${projectId}`)
    if (!projectRooms.has(projectId)) {
      projectRooms.set(projectId, new Set())
    }
    projectRooms.get(projectId)!.add(socket.id)
    console.log(`[socket] ${socket.id} joined project:${projectId}`)

    // Notify room of new member
    socket.to(`project:${projectId}`).emit('user_joined', { socketId: socket.id })
  })

  // Leave a project room
  socket.on('leave_project', (projectId: string) => {
    socket.leave(`project:${projectId}`)
    projectRooms.get(projectId)?.delete(socket.id)
    console.log(`[socket] ${socket.id} left project:${projectId}`)
  })

  // Broadcast a new chat message to the whole project room
  // The Next.js API route saves the message, then calls this endpoint
  socket.on('chat_message', (data: {
    projectId: string
    message: {
      id: string
      content: string
      user: { id: string; full_name: string; avatar_url?: string }
      created_at: string
    }
  }) => {
    // Broadcast to all OTHER clients in the room (sender gets it via API response)
    socket.to(`project:${data.projectId}`).emit('new_message', data.message)
    console.log(`[socket] message broadcast to project:${data.projectId}`)
  })

  // Typing indicator
  socket.on('typing_start', (data: { projectId: string; userName: string }) => {
    socket.to(`project:${data.projectId}`).emit('user_typing', { userName: data.userName })
  })

  socket.on('typing_stop', (data: { projectId: string }) => {
    socket.to(`project:${data.projectId}`).emit('user_stopped_typing', { socketId: socket.id })
  })

  // Section status update broadcast (admin triggers merge, etc.)
  socket.on('section_update', (data: { projectId: string; memberId: string; status: string }) => {
    io.to(`project:${data.projectId}`).emit('member_status_changed', data)
  })

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`)
    // Clean up all rooms this socket was in
    projectRooms.forEach((members, projectId) => {
      if (members.has(socket.id)) {
        members.delete(socket.id)
        socket.to(`project:${projectId}`).emit('user_left', { socketId: socket.id })
      }
    })
  })
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: projectRooms.size })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`[socket-server] listening on port ${PORT}`)
})

export default io
