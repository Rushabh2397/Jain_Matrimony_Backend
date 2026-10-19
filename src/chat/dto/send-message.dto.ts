import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Conversation UUID',
  })
  @IsNotEmpty()
  @IsUUID()
  conversationId: string;

  @ApiProperty({
    example: 'Jai Jinendra! Hope you are having a wonderful day.',
    description: 'Message text content (max 1000 chars)',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  content: string;
}

