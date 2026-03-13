type SocketIOServer = unknown

let io: SocketIOServer | null = null

export function setIO(server: SocketIOServer) {
  io = server
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}
