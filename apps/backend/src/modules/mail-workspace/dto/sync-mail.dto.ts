import { IsEmail, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class SyncMailDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
