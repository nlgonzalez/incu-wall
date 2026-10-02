// RF-06: the editToken lives only in the author's browser. localStorage can be unavailable
// (private mode, blocked storage); every access is guarded and failure just hides controls.

const key = (messageId: string) => `incu-wall:edit:${messageId}`;
const AUTHOR_KEY = "incu-wall:author-name";

export function saveEditToken(messageId: string, token: string): void {
  try {
    localStorage.setItem(key(messageId), token);
  } catch {
    /* storage unavailable */
  }
}

export function readEditToken(messageId: string): string | null {
  try {
    return localStorage.getItem(key(messageId));
  } catch {
    return null;
  }
}

export function forgetEditToken(messageId: string): void {
  try {
    localStorage.removeItem(key(messageId));
  } catch {
    /* storage unavailable */
  }
}

export function readAuthorName(): string {
  try {
    return localStorage.getItem(AUTHOR_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveAuthorName(name: string): void {
  try {
    localStorage.setItem(AUTHOR_KEY, name);
  } catch {
    /* storage unavailable */
  }
}
