import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;

    response.status(status).json({
      success: false,
      error: this.getMessage(body, exception),
    });
  }

  private getMessage(body: unknown, exception: unknown) {
    if (typeof body === "string") {
      return body;
    }

    if (body && typeof body === "object" && "message" in body) {
      const message = (body as { message: string | string[] }).message;
      return Array.isArray(message) ? message.join(", ") : message;
    }

    return exception instanceof Error ? exception.message : "Unexpected server error";
  }
}
