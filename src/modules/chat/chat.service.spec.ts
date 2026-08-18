import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from 'src/common/redis/redis.service';
import { ChannelService } from 'src/modules/channel/channel.service';
import { UnauthorizedException } from '@nestjs/common';

describe('ChatService', () => {
  let service: ChatService;

  const mockPrismaService = {
    message: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockRedisService = {
    exists: jest.fn(),
    set: jest.fn(),
  };

  const mockChannelService = {
    hasChannelAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ChannelService, useValue: mockChannelService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMessages', () => {
    it('should return reversed messages and nextCursor when limit reached', async () => {
      const mockMessages = [
        { id: 'msg-2', content: 'Second', createdAt: new Date() },
        { id: 'msg-1', content: 'First', createdAt: new Date() },
      ];
      mockPrismaService.message.findMany.mockResolvedValue(mockMessages);

      const result = await service.getMessages('chan-1', 2);

      expect(result).toEqual({
        data: [
          { id: 'msg-1', content: 'First', createdAt: mockMessages[1].createdAt },
          { id: 'msg-2', content: 'Second', createdAt: mockMessages[0].createdAt },
        ],
        nextCursor: 'msg-1',
      });
      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
        take: 2,
        skip: 0,
        cursor: undefined,
        where: { channelId: 'chan-1' },
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { id: true, name: true, image: true },
          },
        },
      });
    });
  });

  describe('getUserFromSessionToken', () => {
    it('should return userId from redis if session is cached', async () => {
      const payload = { sub: 'sub-1', sid: 'sid-123', user: { id: 'user-1' } };
      mockJwtService.verify.mockReturnValue(payload);
      mockRedisService.exists.mockResolvedValue(true);

      const userId = await service.getUserFromSessionToken('valid-token');

      expect(userId).toBe('user-1');
      expect(mockRedisService.exists).toHaveBeenCalledWith('session:sid-123');
    });

    it('should check DB if redis cache miss, cache in redis and return userId', async () => {
      const payload = { sub: 'sub-1', sid: 'sid-123', user: { id: 'user-1' } };
      const futureDate = new Date(Date.now() + 60000);
      mockJwtService.verify.mockReturnValue(payload);
      mockRedisService.exists.mockResolvedValue(false);
      mockPrismaService.session.findUnique.mockResolvedValue({
        id: 'sess-1',
        userId: 'user-1',
        expiresAt: futureDate,
      });

      const userId = await service.getUserFromSessionToken('valid-token');

      expect(userId).toBe('user-1');
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if session is expired', async () => {
      const payload = { sub: 'sub-1', sid: 'sid-123', user: { id: 'user-1' } };
      const pastDate = new Date(Date.now() - 60000);
      mockJwtService.verify.mockReturnValue(payload);
      mockRedisService.exists.mockResolvedValue(false);
      mockPrismaService.session.findUnique.mockResolvedValue({
        id: 'sess-1',
        userId: 'user-1',
        expiresAt: pastDate,
      });
      mockPrismaService.session.delete.mockResolvedValue({});

      await expect(service.getUserFromSessionToken('valid-token')).rejects.toThrow(
        new UnauthorizedException('Session đã hết hạn')
      );
    });
  });

  describe('checkUserInChannel', () => {
    it('should return channel access status', async () => {
      mockChannelService.hasChannelAccess.mockResolvedValue(true);

      const hasAccess = await service.checkUserInChannel('user-1', 'chan-1');

      expect(hasAccess).toBe(true);
    });

    it('should return false on exception', async () => {
      mockChannelService.hasChannelAccess.mockRejectedValue(new Error('DB Error'));

      const hasAccess = await service.checkUserInChannel('user-1', 'chan-1');

      expect(hasAccess).toBe(false);
    });
  });

  describe('saveMessage', () => {
    it('should create message successfully', async () => {
      const data = { senderId: 'user-1', channelId: 'chan-1', content: 'Hello' };
      const createdMessage = { id: 'msg-1', ...data, sender: { id: 'user-1', name: 'User', image: null } };
      mockPrismaService.message.create.mockResolvedValue(createdMessage);

      const result = await service.saveMessage(data);

      expect(result).toEqual(createdMessage);
    });

    it('should throw Error on database failure', async () => {
      mockPrismaService.message.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.saveMessage({ senderId: 'u1', channelId: 'c1', content: 'Hi' })
      ).rejects.toThrow('Không thể lưu tin nhắn lúc này');
    });
  });
});
