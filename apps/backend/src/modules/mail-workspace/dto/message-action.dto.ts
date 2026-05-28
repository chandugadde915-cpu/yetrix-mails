import { IsEmail, IsString } from "class-validator";

export class MessageActionDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsString()
  id!: string;
}
