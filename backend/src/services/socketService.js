// Socket.io Service for Real-time Hospital Notifications and Chat
let io = null;
const activeUsers = new Map(); // userId -> socketId

const init = (serverInstance) => {
  const socketIo = require('socket.io');
  io = socketIo(serverInstance, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join room based on user ID and role
    socket.on('join', (data) => {
      const { userId, role } = data;
      if (userId) {
        activeUsers.set(userId, socket.id);
        socket.join(`role:${role}`);
        socket.join(`user:${userId}`);
        console.log(`User ${userId} (Role: ${role}) joined socket rooms`);
      }
    });

    // Real-time Staff Chat
    socket.on('staff-message', (data) => {
      const { senderId, senderName, senderRole, message } = data;
      // Broadcast to all staff roles (excludes patients)
      const staffRoles = [
        'super_admin', 'admin', 'doctor', 'nurse', 'receptionist',
        'pharmacist', 'cashier', 'lab_technician', 'hospital_manager'
      ];
      
      let recipient = io;
      staffRoles.forEach(role => {
        recipient = recipient.to(`role:${role}`);
      });
      
      recipient.emit('staff-chat-msg', {
        senderId,
        senderName,
        senderRole,
        message,
        timestamp: new Date().toISOString()
      });
    });

    // Critical Vitals Alert
    socket.on('critical-vitals', (data) => {
      const { 
        patientId, 
        patientName, 
        vitalType, 
        vitalValue, 
        threshold, 
        severity,
        assignedDoctorId,
        nurseId
      } = data;

      const alertData = {
        type: 'critical_vitals',
        patientId,
        patientName,
        vitalType,
        vitalValue,
        threshold,
        severity,
        timestamp: new Date().toISOString(),
        message: `CRITICAL ALERT: ${patientName} - ${vitalType} is ${vitalValue} (Threshold: ${threshold})`
      };

      // Send to assigned doctor if specified
      if (assignedDoctorId) {
        emitToUser(assignedDoctorId, 'critical-alert', alertData);
      }

      // Send to assigned nurse if specified
      if (nurseId) {
        emitToUser(nurseId, 'critical-alert', alertData);
      }

      // Broadcast to all doctors and nurses for emergency response
      emitToRole('doctor', 'critical-alert', alertData);
      emitToRole('nurse', 'critical-alert', alertData);
      
      // Also notify admin
      emitToRole('admin', 'critical-alert', alertData);
      emitToRole('super_admin', 'critical-alert', alertData);

      console.log(`Critical vitals alert sent for patient ${patientName}: ${vitalType} = ${vitalValue}`);
    });

    // Emergency Call
    socket.on('emergency-call', (data) => {
      const { 
        patientId, 
        patientName, 
        location, 
        emergencyType,
        callerId,
        callerRole
      } = data;

      const emergencyData = {
        type: 'emergency_call',
        patientId,
        patientName,
        location,
        emergencyType,
        callerId,
        callerRole,
        timestamp: new Date().toISOString(),
        message: `EMERGENCY: ${emergencyType} at ${location} - Patient: ${patientName}`
      };

      // Broadcast to all medical staff
      const emergencyRoles = ['doctor', 'nurse', 'admin', 'super_admin'];
      emergencyRoles.forEach(role => {
        emitToRole(role, 'emergency-alert', emergencyData);
      });

      console.log(`Emergency call broadcast: ${emergencyType} for patient ${patientName}`);
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of activeUsers.entries()) {
        if (socketId === socket.id) {
          activeUsers.delete(userId);
          console.log(`User ${userId} disconnected from socket`);
          break;
        }
      }
    });
  });
};

const getIo = () => io;

const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

const emitToRole = (role, event, data) => {
  if (io) io.to(`role:${role}`).emit(event, data);
};

const broadcast = (event, data) => {
  if (io) io.emit(event, data);
};

module.exports = {
  init,
  getIo,
  emitToUser,
  emitToRole,
  broadcast
};
