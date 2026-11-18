import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { QueryFailedError } from "typeorm";

/** PostgreSQL error fields that node-postgres attaches to the driver error. */
interface PgError {
  code?: string;
  constraint?: string;
}

const UNIQUE_VIOLATION = "23505";

/** True when `err` is a PostgreSQL unique-constraint violation. */
export function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err.driverError as PgError | undefined)?.code === UNIQUE_VIOLATION
  );
}

const UNIQUE_MESSAGES: Record<string, string> = {
  users_email_key: "Email already registered",
  users_username_key: "Username already taken",
  favorites_user_id_listing_id_key: "Already in favorites",
  reviews_reviewer_id_reviewed_user_id_listing_id_key:
    "You already reviewed this user for this listing",
};

/** Errors caused by the request's data rather than by a server fault. */
const CLIENT_ERRORS: Record<string, string> = {
  // e.g. a NUL character in a text field
  "22021": "The request contains characters that cannot be stored",
  "22001": "A value is too long",
  "22003": "A number is out of range",
  "22P02": "A value has an invalid format",
  "23502": "A required value is missing",
  "23514": "A value is not allowed",
};

/**
 * The services check for duplicates before inserting, but two simultaneous
 * requests (a double-tapped button on a slow connection) both pass the
 * check and the loser hits the unique constraint. That, and input
 * PostgreSQL refuses to store, used to surface as a 500.
 */
@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const { code, constraint } = (exception.driverError ?? {}) as PgError;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let error = "Internal Server Error";

    if (code === UNIQUE_VIOLATION) {
      status = HttpStatus.CONFLICT;
      error = "Conflict";
      message = (constraint && UNIQUE_MESSAGES[constraint]) || "Already exists";
    } else if (code === "23503") {
      status = HttpStatus.CONFLICT;
      error = "Conflict";
      message = "A referenced record does not exist (anymore)";
    } else if (code && CLIENT_ERRORS[code]) {
      status = HttpStatus.BAD_REQUEST;
      error = "Bad Request";
      message = CLIENT_ERRORS[code];
    } else {
      this.logger.error(exception.message, exception.stack);
    }

    res.status(status).json({ statusCode: status, message, error });
  }
}
