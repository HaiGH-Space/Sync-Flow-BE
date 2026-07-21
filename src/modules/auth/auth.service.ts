import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { RegisterDto } from "./dto/register.dto";
import { MailerService } from "@nestjs-modules/mailer/dist/mailer.service";
import { ErrorCode } from "src/common/constants/error-codes";
import { AppConfigService } from "src/config/config.service";
import { RedisService } from "src/common/redis/redis.service";
import { SessionTokenService } from "./session-token.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly configService: AppConfigService,
    private readonly sessionTokenService: SessionTokenService,
    private readonly redisService: RedisService,
  ) {}
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException(ErrorCode.AUTH_EMAIL_IN_USE);
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    try {
      const newUser = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            name: dto.name,
            image: dto.image,
          },
        });

        const expiresIn = new Date();
        expiresIn.setHours(expiresIn.getHours() + 24);
        const token = crypto.randomUUID();
        await tx.verification.create({
          data: {
            identifier: user.email,
            value: token,
            expiresAt: expiresIn,
          },
        });

        const verificationLink = `${this.configService.frontendUrl}/verify-email?token=${token}`;
        this.logger.debug(`Verification Link: ${verificationLink}`);
        await this.mailerService.sendMail({
          to: user.email,
          subject: "Welcome to SyncFlow! Verify your Email",
          template: "welcome-email",
          context: {
            name: user.name,
            verificationLink,
          },
        });
        await tx.account.create({
          data: {
            userId: user.id,
            providerId: "credentials",
            accountId: user.email,
            password: hashedPassword,
          },
        });
        return user;
      });
      return newUser;
    } catch (error) {
      this.logger.error("Register Error:", error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException(ErrorCode.INTERNAL_SERVER_ERROR);
    }
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    const account = await this.prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credentials",
      },
    });

    if (!account || !account.password) {
      throw new UnauthorizedException(ErrorCode.AUTH_OAUTH_ACCOUNT_ONLY);
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      account.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }
    const sessionWithUser = await this.createSession(
      user.id,
      userAgent,
      ipAddress,
    );
    return sessionWithUser;
  }

  private async createSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    // create a session token
    const sessionToken = crypto.randomUUID();

    // Set expiration date using configured TTL
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.configService.sessionTtlDays);

    const session = await this.prisma.session.create({
      data: {
        userId,
        token: sessionToken,
        expiresAt,
        userAgent,
        ipAddress,
      },
      // Include user to return info to frontend to avoid additional query
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            emailVerified: true,
            hasSeenWelcome: true,
          }, // Only select necessary fields
        },
      },
    });

    const ttlSeconds = this.configService.sessionTtlDays * 24 * 60 * 60;
    await this.redisService.set(
      `session:${sessionToken}`,
      JSON.stringify({ userId, expiresAt: expiresAt.toISOString() }),
      ttlSeconds
    );

    const token = this.sessionTokenService.generateToken(userId, sessionToken, {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      emailVerified: session.user.emailVerified,
      hasSeenWelcome: session.user.hasSeenWelcome,
    });

    return {
      ...session,
      token,
    };
  }

  async logoutByToken(token?: string): Promise<void> {
    if (!token) return;

    try {
      let sid = token;
      const decoded = this.sessionTokenService.decodeToken(token);
      if (decoded && decoded.sid) {
        sid = decoded.sid;
      }

      await this.redisService.del(`session:${sid}`);
      await this.prisma.session.deleteMany({ where: { token: sid } });
    } catch (error) {
      this.logger.error("Error deleting session on logout:", error instanceof Error ? error.stack : String(error));
      // Let the error bubble up as a 500 so callers can handle/log as needed
      throw error;
    }
  }
}
