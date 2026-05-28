import { IsEmail, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListMessagesDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
