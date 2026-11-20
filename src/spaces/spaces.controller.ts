import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { uuidSchema } from '../common/schemas.js';
import {
  availabilitySchema,
  createSpaceSchema,
  listSpacesSchema,
  updateSpaceSchema,
  type AvailabilityQuery,
  type CreateSpaceInput,
  type ListSpacesQuery,
  type UpdateSpaceInput,
} from './spaces.schemas.js';
import { SpacesService } from './spaces.service.js';

@ApiTags('Espaços')
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spaces: SpacesService) {}

  @Public()
  @Get()
  list(@Query({ schema: listSpacesSchema }) query: ListSpacesQuery) {
    return this.spaces.list(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', { schema: uuidSchema }) id: string) {
    return this.spaces.findOne(id);
  }

  @Public()
  @Get(':id/availability')
  availability(
    @Param('id', { schema: uuidSchema }) id: string,
    @Query({ schema: availabilitySchema }) query: AvailabilityQuery,
  ) {
    return this.spaces.availability(id, query);
  }

  @ApiBearerAuth()
  @Roles('ADMIN')
  @Post()
  create(@Body({ schema: createSpaceSchema }) body: CreateSpaceInput) {
    return this.spaces.create(body);
  }

  @ApiBearerAuth()
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', { schema: uuidSchema }) id: string,
    @Body({ schema: updateSpaceSchema }) body: UpdateSpaceInput,
  ) {
    return this.spaces.update(id, body);
  }

  @ApiBearerAuth()
  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: uuidSchema }) id: string) {
    return this.spaces.remove(id);
  }
}
