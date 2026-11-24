import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AUTOMATION_LIMITS as L, AutomationTrigger } from '@coaching/shared';
import type { SaveAutomationRuleRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class SaveAutomationRuleDto implements SaveAutomationRuleRequest {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxName)
  name!: string;

  @IsIn(Object.values(AutomationTrigger))
  trigger!: AutomationTrigger;

  @IsInt() @Min(0) @Max(L.maxDelayHours)
  delayHours!: number;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxBody)
  messageBody!: string;

  @IsBoolean()
  enabled!: boolean;
}
