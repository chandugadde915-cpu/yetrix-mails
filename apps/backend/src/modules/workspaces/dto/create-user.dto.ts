import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  @MinLength(10)
  password!: string;

  @IsOptional()
  @IsIn(["owner", "admin", "support", "viewer"])
  role?: string;
}
