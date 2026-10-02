/** Serializable shapes passed from Server Components to the wall's client islands. */

export interface WallPhoto {
  src: string;
  downloadUrl: string;
  width: number;
  height: number;
}

export interface WallMessage {
  id: string;
  authorName: string;
  body: string | null;
  photo: WallPhoto | null;
  createdAt: string;
  isHidden: boolean;
}

export interface WallBoard {
  slug: string;
  title: string;
  recipientName: string;
  welcomeMessage: string | null;
  coverSrc: string | null;
  isOpen: boolean;
}
