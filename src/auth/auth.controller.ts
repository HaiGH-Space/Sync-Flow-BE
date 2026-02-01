import { Controller, Post, Body, HttpCode, HttpStatus, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Response, Request } from 'express';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return {
      message: 'Registration successful! Please check your email to verify your account.',
      user,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response, @Req() request: Request) {
    const userAgent = request.headers['user-agent'];
    const ipAddress = request.ip || (request.headers['x-forwarded-for'] as string);

    const { session, user} = await this.authService.login(dto, userAgent, ipAddress);
    response.cookie('session_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return user;
  }

  // @Get('me')
  // @UseGuards(AuthGuard)
  // getMe(@Req() request: Request) {
  //   const user = request['user']; 
    
  //   return user;
  // }
}
