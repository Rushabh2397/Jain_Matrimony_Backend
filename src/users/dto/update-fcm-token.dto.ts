import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFcmTokenDto {
  @ApiProperty({
    example: 'dK1v...:APA91bH...',
    description: 'Firebase Cloud Messaging (FCM) registration token for mobile push notifications',
  })
  @IsNotEmpty()
  @IsString()
  fcmToken: string;
}

