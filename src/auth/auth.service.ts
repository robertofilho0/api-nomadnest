import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { Env } from '../config/env.js';
import type { Role, User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPublicUser } from '../users/users.service.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

export interface AccessPayload {
  sub: string;
  role: Role;
}

const DUMMY_HASH = bcrypt.hashSync('dummy-password', 4);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private async respond(user: User) {
    const payload: AccessPayload = { sub: user.id, role: user.role };
    return {
      token: await this.jwt.signAsync(payload),
      expiresIn: this.config.get('JWT_EXPIRES_IN', { infer: true }),
      user: toPublicUser(user),
    };
  }

  async register({ password, birthDate, ...data }: RegisterInput) {
    if (await this.prisma.user.findUnique({ where: { email: data.email } })) {
      throw new ConflictException('E-mail já cadastrado');
    }
    const user = await this.prisma.user.create({
      data: {
        ...data,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        passwordHash: await bcrypt.hash(
          password,
          this.config.get('BCRYPT_ROUNDS', { infer: true }),
        ),
      },
    });
    return this.respond(user);
  }

  async login({ email, password }: LoginInput) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new UnauthorizedException('Credenciais inválidas');
    return this.respond(user);
  }
}
