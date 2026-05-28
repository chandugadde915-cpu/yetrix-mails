import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  password?: string;

  @IsOptional()
  @IsIn(["owner", "admin", "support", "viewer"])
  role?: string;

  @IsOptional()
  @IsIn(["active", "disabled"])
  status?: string;
}
