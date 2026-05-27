import { IsFQDN } from "class-validator";

export class CreateDomainDto {
  @IsFQDN()
  domain!: string;
}
