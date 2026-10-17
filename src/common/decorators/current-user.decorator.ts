import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../enums/matrimony.enum.js';

export interface ActiveUserData {
  userId: string;
  role?: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActiveUserData => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
