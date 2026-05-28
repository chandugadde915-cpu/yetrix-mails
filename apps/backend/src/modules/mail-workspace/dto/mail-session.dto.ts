import { IsEmail, IsString } from "class-validator";

export class MailSessionDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
