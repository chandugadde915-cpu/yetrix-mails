import { IsEmail, IsString, MinLength } from "class-validator";

export class SignupDto {
  @IsString()
  workspaceName!: string;

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  password!: string;
}
