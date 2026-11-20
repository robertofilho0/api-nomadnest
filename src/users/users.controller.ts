import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { isoDate } from '../auth/auth.schemas.js';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { pagination, uuidSchema } from '../common/schemas.js';
import { UsersService } from './users.service.js';

const role = z.enum(['NOMAD', 'ADMIN']);
const updateMeSchema = z
  .object({ name: z.string().trim().min(2).max(80), birthDate: isoDate })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Informe ao menos um campo',
  });
const listSchema = z.object({ role: role.optional(), ...pagination });
const roleSchema = z.object({ role }).strict();

@ApiTags('Usuários')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.findOne(user.id);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body({ schema: updateMeSchema }) body: z.infer<typeof updateMeSchema>,
  ) {
    return this.users.updateMe(user.id, body);
  }

  @Roles('ADMIN')
  @Get()
  list(@Query({ schema: listSchema }) query: z.infer<typeof listSchema>) {
    return this.users.list(query);
  }

  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id', { schema: uuidSchema }) id: string) {
    return this.users.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id/role')
  changeRole(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: uuidSchema }) id: string,
    @Body({ schema: roleSchema }) body: z.infer<typeof roleSchema>,
  ) {
    return this.users.changeRole(user.id, id, body.role);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: uuidSchema }) id: string,
  ) {
    return this.users.remove(user.id, id);
  }
}
