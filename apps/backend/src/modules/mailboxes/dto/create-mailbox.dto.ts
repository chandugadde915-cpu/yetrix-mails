import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class CreateMailboxDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @MinLength(10)
  password!: string;

  @IsOptional()
  @IsInt()
  @Min(128)
  @Max(102400)
  quotaMb?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
