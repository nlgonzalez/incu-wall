import "server-only";

export type DomainErrorCode = "not-found" | "closed" | "forbidden" | "invalid";

/** Expected business failure; Server Actions map it to a user-facing result. */
export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const notFound = () => new DomainError("not-found", "No encontramos este tablero");
export const boardClosed = () =>
  new DomainError("closed", "El tablero está cerrado a nuevos mensajes");
