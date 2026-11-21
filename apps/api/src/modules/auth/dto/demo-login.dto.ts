import { IsIn } from 'class-validator';
import { Role } from '@coaching/shared';
import type { DemoLoginRequest } from '@coaching/shared';

export class DemoLoginDto implements DemoLoginRequest {
  @IsIn(Object.values(Role))
  role!: Role;
}
