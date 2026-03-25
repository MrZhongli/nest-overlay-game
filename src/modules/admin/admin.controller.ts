import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '../../common/dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from './strategies/jwt.strategy';

@Controller('admin')
export class AdminController {
  constructor(private readonly authService: AuthService) { }

  /** Login público - obtiene JWT de admin */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Verificar identidad del usuario autenticado */
  @Get('me')
  getMe(@CurrentUser() user) {
    return user;
  }
}
