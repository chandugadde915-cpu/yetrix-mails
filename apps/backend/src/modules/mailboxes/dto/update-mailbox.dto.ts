import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateMailboxDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(128)
  @Max(102400)
  quotaMb?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
