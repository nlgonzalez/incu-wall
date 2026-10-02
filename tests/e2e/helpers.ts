import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const fixture = (name: string) => path.join(import.meta.dirname, "..", "fixtures", name);

export interface CreatedBoard {
  publicUrl: string;
  adminUrl: string;
  slug: string;
}

export async function createBoard(
  page: Page,
  { title = "Gracias por todo, Marcos.", cover }: { title?: string; cover?: string } = {},
): Promise<CreatedBoard> {
  await page.goto("/");
  await page.getByLabel("Título del tablero").fill(title);
  await page.getByLabel("¿Para quién es?").fill("Marcos");
  await page.getByLabel(/Mensaje de bienvenida/).fill("Dejale unas palabras antes de su último día.");
  if (cover) {
    await page.locator('input[type="file"]').setInputFiles(cover);
    await expect(page.getByRole("button", { name: "Quitar foto" })).toBeVisible({ timeout: 20_000 });
  }
  await page.getByRole("button", { name: "Crear tablero" }).click();
  await expect(page.getByRole("heading", { name: "Tablero creado." })).toBeVisible({ timeout: 20_000 });

  const publicUrl = await page.getByLabel(/Link público/).inputValue();
  const adminUrl = await page.getByLabel(/Link de administración/).inputValue();
  const slug = new URL(publicUrl).pathname.split("/")[2]!;
  return { publicUrl, adminUrl, slug };
}

export async function postMessage(
  page: Page,
  { name, body, photo }: { name: string; body?: string; photo?: string },
): Promise<void> {
  await page.getByRole("button", { name: "Dejar un mensaje" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tu nombre").fill(name);
  if (body) await dialog.getByLabel("Mensaje", { exact: true }).fill(body);
  if (photo) {
    await dialog.locator('input[type="file"]').setInputFiles(photo);
    await expect(dialog.getByRole("button", { name: "Quitar foto" })).toBeVisible({ timeout: 30_000 });
  }
  await dialog.getByRole("button", { name: "Ver cómo queda" }).click();
  await expect(dialog.getByRole("heading", { name: "Así se va a ver" })).toBeVisible();
  await dialog.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 30_000 });
}

export function card(page: Page, author: string) {
  return page.getByRole("article").filter({ hasText: `— ${author}` });
}

/** True when an <img> actually decoded (catches broken optimizer/signed URLs). */
export async function imageLoaded(page: Page, alt: string): Promise<boolean> {
  const img = page.getByAltText(alt).first();
  await img.scrollIntoViewIfNeeded();
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), {
      timeout: 15_000,
    })
    .toBe(true);
  return true;
}
