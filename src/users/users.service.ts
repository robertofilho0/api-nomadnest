import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { paginate } from '../common/schemas.js';
import type { Role, User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type PublicUser = Omit<User, 'passwordHash'>;

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _hash, ...rest } = user;
  return rest;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOrFail(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async findOne(id: string) {
    return toPublicUser(await this.findOrFail(id));
  }

  async updateMe(id: string, data: { name?: string; birthDate?: string }) {
    await this.findOrFail(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });
    return toPublicUser(user);
  }

  async list({
    role,
    page,
    limit,
  }: {
    role?: Role;
    page: number;
    limit: number;
  }) {
    const where = role ? { role } : {};
    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return paginate(users.map(toPublicUser), total, page, limit);
  }

  async changeRole(actorId: string, id: string, role: Role) {
    if (actorId === id)
      throw new BadRequestException('Você não pode alterar o próprio papel');
    await this.findOrFail(id);
    return toPublicUser(
      await this.prisma.user.update({ where: { id }, data: { role } }),
    );
  }

  async remove(actorId: string, id: string) {
    if (actorId === id)
      throw new BadRequestException('Você não pode remover a própria conta');
    await this.findOrFail(id);
    await this.prisma.user.delete({ where: { id } }); // reservas e notificações caem em cascata
  }
}
