import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsEmail, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from "class-validator";

export class MailAttachmentDto {
  @IsString()
  @MaxLength(180)
  filename!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contentType?: string;

  @IsString()
  dataBase64!: string;
}

export class SendMessageDto {
  @IsEmail()
  from!: string;

  @IsString()
  password!: string;

  @IsEmail()
  to!: string;

  @IsString()
  subject!: string;

  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsString()
  cc?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => MailAttachmentDto)
  attachments?: MailAttachmentDto[];
}

export class DraftMessageDto {
  @IsEmail()
  from!: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEmail()
  to?: string;

  @IsOptional()
  @IsString()
  cc?: string;

  @IsOptional()
  @IsString()
  bcc?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => MailAttachmentDto)
  attachments?: MailAttachmentDto[];
}
