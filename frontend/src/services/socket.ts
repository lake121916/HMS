import io, { Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getHospitalSocket(user?: { id: number; role: string } | null): Socket {
  if (!socket) {
    const socketUrl = ((window as any).REACT_APP_API_URL || window.location.origin)
      .replace(':3000', ':5000')
      .replace('/api', '');

    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('Hospital WebSocket connected:', socket?.id);
      if (user) {
        socket?.emit('join', { userId: user.id, role: user.role });
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn('Hospital WebSocket disconnected:', reason);
    });
  }

  if (socket && user && socket.connected) {
    socket.emit('join', { userId: user.id, role: user.role });
  }

  return socket;
}

export function disconnectHospitalSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
