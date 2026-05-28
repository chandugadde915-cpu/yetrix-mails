import { IsFQDN, IsOptional, IsString } from "class-validator";

export class CreateDomainDto {
  @IsFQDN()
  domain!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
