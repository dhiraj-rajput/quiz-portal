import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { Socket } from 'socket.io';

interface SocketData {
  userId: string;
  role: string;
  testId?: string;
  startTime?: Date;
  duration?: number;
}

interface AuthenticatedSocket extends Socket {
  data: SocketData;
}

export class WebSocketService {
  private io: SocketServer;
  private activeTestSessions = new Map<string, {
    userId: string;
    testId: string;
    startTime: Date;
    duration: number;
    autoSaveInterval?: NodeJS.Timeout;
  }>();

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:5174'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // JWT Authentication middleware for WebSocket
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.data = {
          userId: user._id.toString(),
          role: user.role,
        };

        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.data.userId} connected via WebSocket`);

      // Join user-specific room for personalized notifications
      socket.join(`user:${socket.data.userId}`);
      
      // Join role-specific room
      socket.join(`role:${socket.data.role}`);

      // Test session management
      socket.on('test:start', this.handleTestStart.bind(this, socket));
      socket.on('test:heartbeat', this.handleTestHeartbeat.bind(this, socket));
      socket.on('test:auto-save', this.handleAutoSave.bind(this, socket));
      socket.on('test:submit', this.handleTestSubmit.bind(this, socket));
      socket.on('test:time-warning', this.handleTimeWarning.bind(this, socket));

      // Admin notifications
      socket.on('admin:broadcast', this.handleAdminBroadcast.bind(this, socket));

      // Disconnect handling
      socket.on('disconnect', this.handleDisconnect.bind(this, socket));
    });
  }

  private handleTestStart(socket: AuthenticatedSocket, data: { testId: string; duration: number }) {
    const sessionId = `${socket.data.userId}-${data.testId}`;
    const startTime = new Date();

    // Store test session
    this.activeTestSessions.set(sessionId, {
      userId: socket.data.userId,
      testId: data.testId,
      startTime,
      duration: data.duration,
    });

    // Set up auto-save interval (every 30 seconds)
    const autoSaveInterval = setInterval(() => {
      socket.emit('test:auto-save-trigger');
    }, 30000);

    this.activeTestSessions.get(sessionId)!.autoSaveInterval = autoSaveInterval;

    // Set up automatic test submission when time expires
    setTimeout(() => {
      this.handleAutoSubmit(socket, data.testId);
    }, data.duration * 60 * 1000); // Convert minutes to milliseconds

    // Send timer start confirmation
    socket.emit('test:started', {
      testId: data.testId,
      startTime: startTime.toISOString(),
      duration: data.duration,
      serverTime: new Date().toISOString(),
    });

    console.log(`Test session started: ${sessionId}`);
  }

  private handleTestHeartbeat(socket: AuthenticatedSocket, data: { testId: string }) {
    const sessionId = `${socket.data.userId}-${data.testId}`;
    const session = this.activeTestSessions.get(sessionId);

    if (session) {
      const elapsed = Math.floor((new Date().getTime() - session.startTime.getTime()) / 1000);
      const remaining = Math.max(0, (session.duration * 60) - elapsed);

      socket.emit('test:time-update', {
        elapsed,
        remaining,
        serverTime: new Date().toISOString(),
      });

      // Send warnings at specific intervals
      if (remaining <= 300 && remaining > 240) { // 5 minutes left
        socket.emit('test:time-warning', { type: 'warning', remaining, message: '5 minutes remaining!' });
      } else if (remaining <= 60 && remaining > 0) { // 1 minute left
        socket.emit('test:time-warning', { type: 'critical', remaining, message: '1 minute remaining!' });
      }
    }
  }

  private handleAutoSave(socket: AuthenticatedSocket, data: { testId: string; answers: any }) {
    // This will be integrated with the database save operation
    socket.emit('test:auto-saved', {
      timestamp: new Date().toISOString(),
      success: true,
    });

    console.log(`Auto-save for user ${socket.data.userId} on test ${data.testId}`);
  }

  private handleTestSubmit(socket: AuthenticatedSocket, data: { testId: string }) {
    const sessionId = `${socket.data.userId}-${data.testId}`;
    const session = this.activeTestSessions.get(sessionId);

    if (session) {
      // Clear intervals
      if (session.autoSaveInterval) {
        clearInterval(session.autoSaveInterval);
      }

      // Remove session
      this.activeTestSessions.delete(sessionId);

      socket.emit('test:submitted', {
        testId: data.testId,
        submittedAt: new Date().toISOString(),
      });

      console.log(`Test submitted: ${sessionId}`);
    }
  }

  private handleAutoSubmit(socket: AuthenticatedSocket, testId: string) {
    const sessionId = `${socket.data.userId}-${testId}`;
    const session = this.activeTestSessions.get(sessionId);

    if (session) {
      // Clear intervals
      if (session.autoSaveInterval) {
        clearInterval(session.autoSaveInterval);
      }

      // Remove session
      this.activeTestSessions.delete(sessionId);

      socket.emit('test:auto-submitted', {
        testId,
        reason: 'Time expired',
        submittedAt: new Date().toISOString(),
      });

      console.log(`Auto-submitted test: ${sessionId}`);
    }
  }

  private handleTimeWarning(socket: AuthenticatedSocket, data: { testId: string; remaining: number }) {
    socket.emit('test:time-warning', {
      testId: data.testId,
      remaining: data.remaining,
      timestamp: new Date().toISOString(),
    });
  }

  private handleAdminBroadcast(socket: AuthenticatedSocket, data: { message: string; type: string }) {
    if (socket.data.role === 'admin') {
      this.io.to('role:student').emit('admin:notification', {
        message: data.message,
        type: data.type,
        timestamp: new Date().toISOString(),
        from: 'admin',
      });

      console.log(`Admin broadcast sent: ${data.message}`);
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    console.log(`User ${socket.data.userId} disconnected`);

    // Clean up any active test sessions
    for (const [sessionId, session] of this.activeTestSessions.entries()) {
      if (session.userId === socket.data.userId) {
        if (session.autoSaveInterval) {
          clearInterval(session.autoSaveInterval);
        }
        // Keep the session data but mark as disconnected
        console.log(`Preserved test session for reconnection: ${sessionId}`);
      }
    }
  }

  // Public methods for external use
  public notifyUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public notifyRole(role: string, event: string, data: any) {
    this.io.to(`role:${role}`).emit(event, data);
  }

  public broadcastToAll(event: string, data: any) {
    this.io.emit(event, data);
  }

  public getActiveTestSessions() {
    return Array.from(this.activeTestSessions.entries()).map(([sessionId, session]) => ({
      sessionId,
      ...session,
    }));
  }
}

export default WebSocketService;
