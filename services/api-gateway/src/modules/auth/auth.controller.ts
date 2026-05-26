import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateSessionDto, ValidateTokenDto } from './dto/auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('config')
  config(): ReturnType<AuthService['getConfig']> {
    return this.authService.getConfig();
  }

  @Post('session')
  session(@Body() payload: CreateSessionDto): ReturnType<AuthService['createSession']> {
    return this.authService.createSession(payload);
  }

  @Post('validate')
  validate(@Body() payload: ValidateTokenDto): ReturnType<AuthService['validateBearerToken']> {
    return this.authService.validateBearerToken(payload.token);
  }
}
