import { IsBoolean, IsEmail, IsOptional, IsString } from "class-validator";

export class CreateAliasDto {
  @IsEmail()
  address!: string;

  @IsString()
  goto!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
