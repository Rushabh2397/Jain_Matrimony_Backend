import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Put,
  Query,
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
import { ProfileDetails } from './entities/profile-details.entity.js';
import { PhotoAccessRequest } from './entities/photo-access-request.entity.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpsertPartnerPreferencesDto } from './dto/upsert-partner-preferences.dto.js';
import { UpsertProfileDetailsDto } from './dto/upsert-profile-details.dto.js';
import { RespondPhotoRequestDto } from './dto/respond-photo-request.dto.js';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { SubmitKycDto } from './dto/submit-kyc.dto.js';
import { ReviewKycDto } from './dto/review-kyc.dto.js';
import { PendingKycQueryDto } from './dto/pending-kyc-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole, KycStatus } from '../common/enums/matrimony.enum.js';
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

  // GET /users/profile/export -> Export all user personal data under DPDP Data Portability
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('profile/export')
  @ApiOperation({
    summary:
      'Export authenticated user personal data in compliance with DPDP Act (Data Portability)',
  })
  @ApiResponse({
    status: 200,
    description: 'Personal data export generated successfully in JSON format',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportData(
    @CurrentUser() user: ActiveUserData,
  ): Promise<Record<string, unknown>> {
    return await this.usersService.exportPersonalData(user.userId);
  }

  // DELETE /users/profile -> Self-service soft delete and erasure under DPDP Right to be Forgotten
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete('profile')
  @ApiOperation({
    summary:
      'Self-service account deletion and personal data erasure in compliance with DPDP (Right to be Forgotten)',
  })
  @ApiResponse({
    status: 200,
    description: 'Account successfully soft-deleted and personal data erased',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(
    @CurrentUser() user: ActiveUserData,
    @Body() dto?: DeleteAccountDto,
  ): Promise<{ message: string; deletedAt: Date }> {
    return await this.usersService.deleteAccount(user.userId, dto);
  }

  // POST /users/profile/kyc -> Submit KYC identity documents for verification
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('profile/kyc')
  @ApiOperation({
    summary: 'Submit government ID document for KYC profile verification',
  })
  @ApiResponse({
    status: 201,
    description: 'KYC documents submitted for admin verification',
  })
  @ApiResponse({
    status: 400,
    description: 'Profile is already verified or invalid payload',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async submitKyc(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: SubmitKycDto,
  ): Promise<{ message: string; kycStatus: KycStatus }> {
    return await this.usersService.submitKyc(user.userId, dto);
  }

  // GET /users/profile/kyc -> Get current KYC verification status and history
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('profile/kyc')
  @ApiOperation({
    summary: 'Get current KYC verification status and history',
  })
  @ApiResponse({
    status: 200,
    description: 'KYC status returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getKycStatus(@CurrentUser() user: ActiveUserData) {
    return await this.usersService.getKycStatus(user.userId);
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

  // GET /users/profile/details -> Get logged-in user's decoupled profile details (bio, lifestyle, family, kundli)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('profile/details')
  @ApiOperation({
    summary:
      "Get authenticated user's profile details (bio, hobbies, family, astrology)",
  })
  @ApiResponse({
    status: 200,
    description: 'Profile details returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile details not found' })
  async getProfileDetails(
    @CurrentUser() user: ActiveUserData,
  ): Promise<ProfileDetails> {
    return await this.usersService.getProfileDetails(user.userId);
  }

  // PUT /users/profile/details -> Upsert logged-in user's profile details
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Put('profile/details')
  @ApiOperation({ summary: "Upsert authenticated user's profile details" })
  @ApiResponse({
    status: 200,
    description: 'Profile details saved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async upsertProfileDetails(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: UpsertProfileDetailsDto,
  ): Promise<ProfileDetails> {
    return await this.usersService.upsertProfileDetails(user.userId, dto);
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

  // GET /users/admin/kyc/pending -> Admin-only: List pending KYC submissions
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Get('admin/kyc/pending')
  @ApiOperation({
    summary: 'Admin only: List all pending KYC verification submissions',
  })
  @ApiResponse({
    status: 200,
    description: 'List of pending submissions returned',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  async getPendingKyc(@Query() query: PendingKycQueryDto) {
    return await this.usersService.getPendingKycSubmissions(
      query.page,
      query.limit,
    );
  }

  // PATCH /users/admin/kyc/:targetUserId/review -> Admin-only: Review KYC submission
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'targetUserId',
    description: 'UUID of user whose KYC is being reviewed',
  })
  @Patch('admin/kyc/:targetUserId/review')
  @ApiOperation({
    summary: 'Admin only: Approve or reject KYC verification submission',
  })
  @ApiResponse({
    status: 200,
    description: 'KYC submission reviewed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid review decision or missing rejection reason',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Target user not found' })
  async reviewKyc(
    @CurrentUser() admin: ActiveUserData,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: ReviewKycDto,
  ) {
    return await this.usersService.reviewKyc(admin.userId, targetUserId, dto);
  }

  // PUT /users/fcm-token -> Register device push notification token
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Put('fcm-token')
  @ApiOperation({ summary: 'Register FCM device push notification token for user/parents' })
  @ApiResponse({ status: 200, description: 'FCM token registered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async registerFcmToken(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: UpdateFcmTokenDto,
  ): Promise<User> {
    return await this.usersService.registerFcmToken(user.userId, dto.fcmToken);
  }

  // --- Photo Access Request Routes ---

  // GET /users/photo-requests/received -> List incoming photo requests
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('photo-requests/received')
  @ApiOperation({
    summary:
      'List incoming photo access requests received by authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of received photo requests returned',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getReceivedPhotoRequests(
    @CurrentUser() user: ActiveUserData,
  ): Promise<PhotoAccessRequest[]> {
    return await this.usersService.getReceivedPhotoRequests(user.userId);
  }

  // GET /users/photo-requests/sent -> List outgoing photo requests
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('photo-requests/sent')
  @ApiOperation({
    summary: 'List outgoing photo access requests sent by authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of sent photo requests returned',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSentPhotoRequests(
    @CurrentUser() user: ActiveUserData,
  ): Promise<PhotoAccessRequest[]> {
    return await this.usersService.getSentPhotoRequests(user.userId);
  }

  // PATCH /users/photo-requests/:requestId/respond -> Approve, Decline, or Revoke photo request
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch('photo-requests/:requestId/respond')
  @ApiOperation({
    summary: 'Respond to photo access request (Approve, Decline, or Revoke)',
  })
  @ApiParam({ name: 'requestId', description: 'Photo access request UUID' })
  @ApiResponse({
    status: 200,
    description: 'Photo request responded successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Only target user can respond',
  })
  @ApiResponse({ status: 404, description: 'Photo access request not found' })
  async respondToPhotoRequest(
    @CurrentUser() user: ActiveUserData,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: RespondPhotoRequestDto,
  ): Promise<PhotoAccessRequest> {
    return await this.usersService.respondToPhotoRequest(
      user.userId,
      requestId,
      dto,
    );
  }

  // POST /users/:targetId/photo-request -> Request photo access
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post(':targetId/photo-request')
  @ApiOperation({
    summary: 'Request permission to view locked photos of a candidate',
  })
  @ApiParam({ name: 'targetId', description: 'Candidate user UUID' })
  @ApiResponse({
    status: 201,
    description: 'Photo access request created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot request own photos or photos are already public',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Target user not found' })
  @ApiResponse({
    status: 409,
    description: 'Photo request already exists or was previously declined',
  })
  async requestPhotoAccess(
    @CurrentUser() user: ActiveUserData,
    @Param('targetId', ParseUUIDPipe) targetId: string,
  ): Promise<PhotoAccessRequest> {
    return await this.usersService.requestPhotoAccess(user.userId, targetId);
  }

  // GET /users/:id -> Get a single profile by ID (photo-gated)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get(':id')
  @ApiOperation({
    summary: 'Get a user profile by UUID (photo-gated based on interest status and photo requests)',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User profile found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ActiveUserData,
  ): Promise<User> {
    return await this.usersService.findOneProfile(id, user.userId);
  }
}