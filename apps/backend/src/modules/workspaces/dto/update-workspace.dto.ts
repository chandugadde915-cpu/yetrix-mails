import { IsString } from "class-validator";

export class UpdateWorkspaceDto {
  @IsString()
  name!: string;
}
