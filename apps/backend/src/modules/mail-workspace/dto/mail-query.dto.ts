import { Type } from "class-transformer";
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class MailQueryDto {
  @IsEmail()
  mailbox!: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  since?: string;

  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  flaggedOnly?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  attachmentsOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
