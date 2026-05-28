import { IsBoolean, IsEmail, IsOptional, IsString } from "class-validator";

export class UpdateAliasDto {
  @IsOptional()
  @IsEmail()
  address?: string;

  @IsOptional()
  @IsString()
  goto?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
