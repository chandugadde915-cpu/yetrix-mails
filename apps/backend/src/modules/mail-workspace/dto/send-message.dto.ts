import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class SendMessageDto {
  @IsEmail()
  from!: string;

  @IsString()
  password!: string;

  @IsEmail()
  to!: string;

  @IsString()
  subject!: string;

  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsString()
  cc?: string;
}
