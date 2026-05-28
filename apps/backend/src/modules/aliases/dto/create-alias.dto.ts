import { IsBoolean, IsOptional, IsString, Matches } from "class-validator";

export class CreateAliasDto {
  @Matches(/^(@[a-z0-9.-]+\.[a-z]{2,}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})$/i, {
    message: "Alias address must be an email address or catch-all domain",
  })
  address!: string;

  @IsString()
  goto!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
