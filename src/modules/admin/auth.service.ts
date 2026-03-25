import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from '../../common/dto/auth.dto';

/**
 * AuthService - Autenticación del panel admin.
 *
 * En esta implementación inicial, las credenciales se validan
 * contra variables de entorno (ADMIN_EMAIL + ADMIN_PASSWORD).
 *
 * Futuro: migrar a tabla de usuarios en la BD.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    const adminPassword = this.config.get<string>('ADMIN_PASSWORD');

    if (dto.email !== adminEmail || dto.password !== adminPassword) {
      this.logger.warn(`Login failed for: ${dto.email}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: 'admin',
      email: dto.email,
      role: 'admin',
    };

    const token = this.jwtService.sign(payload);

    this.logger.log(`Admin login successful: ${dto.email}`);

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: this.config.get<string>('JWT_EXPIRES_IN') ?? '8h',
    };
  }
}
