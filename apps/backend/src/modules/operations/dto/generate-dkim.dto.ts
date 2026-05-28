import { IsIn, IsInt, IsOptional, IsString } from "class-validator";

export class GenerateDkimDto {
  @IsOptional()
  @IsString()
  selector?: string;

  @IsOptional()
  @IsInt()
  @IsIn([1024, 2048, 4096])
  keySize?: number;
}
