import {
  Controller,
  Get,
  Body,
  Param,
  Put,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { PartnerPreferences } from './entities/partner-preferences.entity.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpsertPartnerPreferencesDto } from './dto/upsert-partner-preferences.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/matrimony.enum.js';
import {
  CurrentUser,
  type ActiveUserData,
} from '../common/decorators/current-user.decorator.js';

@ApiTags('Users & Profiles')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- Authenticated Static Routes ---

  // GET /users/profile -> Get logged-in user profile
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('profile')
  @ApiOperation({ summary: "Get authenticated user's own profile" })
  @ApiResponse({ status: 200, description: 'Profile returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: ActiveUserData): Promise<User> {
    return await this.usersService.findOne(user.userId);
  }

  // PUT /users/profile -> Update logged-in user profile
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Put('profile')
  @ApiOperation({ summary: "Update authenticated user's own profile" })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @CurrentUser() user: ActiveUserData,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    return await this.usersService.update(user.userId, updateProfileDto);
  }

  // GET /users/preferences -> Get logged-in user's partner preferences
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('preferences')
  @ApiOperation({ summary: "Get authenticated user's partner preferences" })
  @ApiResponse({ status: 200, description: 'Partner preferences returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Preferences not found' })
  async getPreferences(
    @CurrentUser() user: ActiveUserData,
  ): Promise<PartnerPreferences> {
    return await this.usersService.getPartnerPreferences(user.userId);
  }

  // PUT /users/preferences -> Upsert logged-in user's partner preferences
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Put('preferences')
  @ApiOperation({ summary: "Upsert authenticated user's partner preferences" })
  @ApiResponse({ status: 200, description: 'Preferences saved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async upsertPreferences(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: UpsertPartnerPreferencesDto,
  ): Promise<PartnerPreferences> {
    return await this.usersService.upsertPartnerPreferences(user.userId, dto);
  }

  // --- Admin Routes ---

  // GET /users -> Admin-only: Get all user profiles
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: 'Admin only: List all user profiles' })
  @ApiResponse({ status: 200, description: 'List of all profiles returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  async findAll(): Promise<User[]> {
    return await this.usersService.findAll();
  }

  // --- Public / Browsing Routes ---

  // GET /users/:id -> Get a single profile by ID
  @Get(':id')
  @ApiOperation({ summary: 'Get a user profile by UUID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User profile found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return await this.usersService.findOne(id);
  }
}