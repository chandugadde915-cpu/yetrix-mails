import { IsEmail, IsInt, IsOptional, Max, Min } from "class-validator";

export class CreateMailboxDto {
  @IsEmail()
  address!: string;

  @IsOptional()
  @IsInt()
  @Min(128)
  @Max(102400)
  quotaMb?: number;
}
