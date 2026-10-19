import {
  Controller,
  Post,
  Delete,
  Get,
  Patch,
  Body,
  Param,
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
  ApiQuery,
} from '@nestjs/swagger';
import { SafetyService } from './safety.service.js';
import { BlockUserDto } from './dto/block-user.dto.js';
import { ReportUserDto } from './dto/report-user.dto.js';
import { UpdateReportStatusDto } from './dto/update-report-status.dto.js';
import { UserBlock } from './entities/user-block.entity.js';
import { UserReport } from './entities/user-report.entity.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type ActiveUserData,
} from '../common/decorators/current-user.decorator.js';
import {
  UserRole,
  ReportStatus,
} from '../common/enums/matrimony.enum.js';

@ApiTags('Safety & Moderation')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('safety')
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @Post('block/:targetUserId')
  @ApiOperation({
    summary:
      'Block a user profile (deactivates conversations and cancels interests)',
  })
  @ApiParam({ name: 'targetUserId', description: 'Target user UUID to block' })
  @ApiResponse({ status: 201, description: 'User blocked successfully' })
  @ApiResponse({ status: 400, description: 'Cannot block yourself' })
  @ApiResponse({ status: 404, description: 'Target user not found' })
  @ApiResponse({ status: 409, description: 'User is already blocked' })
  async blockUser(
    @CurrentUser() user: ActiveUserData,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: BlockUserDto,
  ): Promise<UserBlock> {
    return await this.safetyService.blockUser(user.userId, targetUserId, dto);
  }

  @Delete('block/:targetUserId')
  @ApiOperation({ summary: 'Unblock a previously blocked user' })
  @ApiParam({ name: 'targetUserId', description: 'Target user UUID to unblock' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  @ApiResponse({ status: 404, description: 'Block relationship not found' })
  async unblockUser(
    @CurrentUser() user: ActiveUserData,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
  ): Promise<{ message: string }> {
    await this.safetyService.unblockUser(user.userId, targetUserId);
    return { message: 'User unblocked successfully' };
  }

  @Get('blocked')
  @ApiOperation({ summary: 'List all profiles blocked by current user' })
  @ApiResponse({ status: 200, description: 'List of blocked user records' })
  async getBlockedUsers(
    @CurrentUser() user: ActiveUserData,
  ): Promise<UserBlock[]> {
    return await this.safetyService.getBlockedUsers(user.userId);
  }

  @Post('report/:targetUserId')
  @ApiOperation({
    summary:
      'Report a user profile for Trust & Safety review (auto-blocks by default)',
  })
  @ApiParam({ name: 'targetUserId', description: 'Target user UUID to report' })
  @ApiResponse({ status: 201, description: 'Report filed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot report yourself' })
  @ApiResponse({ status: 404, description: 'Target user not found' })
  async reportUser(
    @CurrentUser() user: ActiveUserData,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: ReportUserDto,
  ): Promise<UserReport> {
    return await this.safetyService.reportUser(user.userId, targetUserId, dto);
  }

  @Get('reports')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin only: List safety reports' })
  @ApiQuery({
    name: 'status',
    enum: ReportStatus,
    required: false,
    description: 'Filter reports by status',
  })
  @ApiResponse({ status: 200, description: 'List of reports returned' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  async getAllReports(
    @Query('status') status?: ReportStatus,
  ): Promise<UserReport[]> {
    return await this.safetyService.getAllReports(status);
  }

  @Patch('reports/:reportId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin only: Update review status and notes on a report' })
  @ApiParam({ name: 'reportId', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'Report updated successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  async updateReportStatus(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: UpdateReportStatusDto,
  ): Promise<UserReport> {
    return await this.safetyService.updateReportStatus(reportId, dto);
  }
}

