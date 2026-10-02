import { expect, test } from "@playwright/test";
import { inspectJpeg } from "../../src/lib/jpeg";
import { card, createBoard, fixture, imageLoaded, postMessage } from "./helpers";

test.describe("crear tablero (RF-01, RF-02, AC-1)", () => {
  test("muestra el link público y el de administración, con portada", async ({ page }) => {
    const board = await createBoard(page, { cover: fixture("photo-gps.jpg") });
    expect(board.publicUrl).toMatch(/\/b\/[A-Za-z0-9_-]{21}$/);
    expect(board.adminUrl).toMatch(/\/b\/[A-Za-z0-9_-]{21}\/admin\?key=[A-Za-z0-9_-]{43}$/);
    await expect(page.getByRole("button", { name: "Copiar" })).toHaveCount(2);

    await page.goto(board.publicUrl);
    await expect(page.getByRole("heading", { level: 1, name: "Gracias por todo, Marcos." })).toBeVisible();
    expect(await imageLoaded(page, "Portada del tablero para Marcos")).toBe(true);
  });
});

test.describe("muro y mensajes (RF-03, RF-04)", () => {
  test("publica con previsualización y ordena del más antiguo al más nuevo", async ({ page }) => {
    const board = await createBoard(page);
    await page.goto(board.publicUrl);
    await expect(page.getByText("Todavía no hay mensajes. Sé la primera persona en dejar uno.")).toBeVisible();

    await postMessage(page, { name: "Ana", body: "¡Te vamos a extrañar!" });
    await postMessage(page, { name: "Bruno", body: "Gracias por todo lo que enseñaste." });

    const authors = await page.getByRole("article").locator("p >> span.font-semibold").allTextContents();
    expect(authors).toEqual(["— Ana", "— Bruno"]);
    await expect(page.getByText("2 mensajes")).toBeVisible();
  });

  test("valida nombre obligatorio y mensaje o foto", async ({ page }) => {
    const board = await createBoard(page);
    await page.goto(board.publicUrl);
    await page.getByRole("button", { name: "Dejar un mensaje" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Tu nombre").fill("Ana");
    await dialog.getByRole("button", { name: "Ver cómo queda" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Escribí un mensaje o agregá una foto");
  });
});

test.describe("fotos (RF-05, AC-4, AC-5, RF-10)", () => {
  test("una foto con GPS se publica comprimida y sin metadatos; lightbox y descarga", async ({ page }) => {
    const board = await createBoard(page);
    await page.goto(board.publicUrl);
    await postMessage(page, { name: "Carla", body: "Con foto", photo: fixture("photo-gps.jpg") });
    expect(await imageLoaded(page, "Foto de Carla")).toBe(true);

    await card(page, "Carla").getByRole("button", { name: /Ver en grande/ }).click();
    const lightbox = page.getByRole("dialog");
    await expect(lightbox.getByRole("heading", { name: /Foto de Carla/ })).toBeVisible();
    const href = await lightbox.getByRole("link", { name: "Descargar" }).getAttribute("href");
    expect(href).toContain("download=");

    const response = await page.request.get(href!);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-disposition"]).toContain("attachment");
    const bytes = new Uint8Array(await response.body());
    expect(inspectJpeg(bytes)).toEqual({ isJpeg: true, hasMetadata: false }); // AC-5: no EXIF/GPS

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("una foto HEIC se convierte y se ve en el muro", async ({ page }) => {
    const board = await createBoard(page);
    await page.goto(board.publicUrl);
    await postMessage(page, { name: "Diego", photo: fixture("photo.heic") });
    expect(await imageLoaded(page, "Foto de Diego")).toBe(true);
    const size = await page
      .getByAltText("Foto de Diego")
      .first()
      .evaluate((el: HTMLImageElement) => ({ w: el.getAttribute("width"), h: el.getAttribute("height") }));
    expect(size).toEqual({ w: "2000", h: "1333" }); // resized to ≤ 2000 px, aspect kept
  });
});

test.describe("editar o borrar el propio mensaje (RF-06, AC-9)", () => {
  test("solo el navegador que lo publicó ve los controles", async ({ page, browser }) => {
    const board = await createBoard(page);
    await page.goto(board.publicUrl);
    await postMessage(page, { name: "Eva", body: "Primera versión" });

    const mine = card(page, "Eva");
    await mine.getByRole("button", { name: "Editar" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Mensaje", { exact: true }).fill("Versión editada");
    await dialog.getByRole("button", { name: "Ver cómo queda" }).click();
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Versión editada")).toBeVisible();

    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await otherPage.goto(board.publicUrl);
    await expect(card(otherPage, "Eva")).toBeVisible();
    await expect(card(otherPage, "Eva").getByRole("button", { name: "Editar" })).toHaveCount(0);
    await other.close();

    page.once("dialog", (d) => d.accept());
    await card(page, "Eva").getByRole("button", { name: "Borrar" }).click();
    await expect(card(page, "Eva")).toHaveCount(0);
  });
});

test.describe("panel de administración (RF-07, RF-08, AC-6, AC-7)", () => {
  test("ocultar, restaurar y cerrar el tablero", async ({ page }) => {
    const board = await createBoard(page);
    await page.goto(board.publicUrl);
    await postMessage(page, { name: "Fede", body: "Mensaje a moderar" });

    await page.goto(board.adminUrl);
    await expect(page.getByText("Panel de administración")).toBeVisible();
    await card(page, "Fede").getByRole("button", { name: "Ocultar" }).click();
    await expect(card(page, "Fede").getByText("Oculto")).toBeVisible();

    await page.goto(board.publicUrl);
    await expect(card(page, "Fede")).toHaveCount(0);

    await page.goto(board.adminUrl);
    await card(page, "Fede").getByRole("button", { name: "Restaurar" }).click();
    await expect(card(page, "Fede").getByRole("button", { name: "Ocultar" })).toBeVisible();
    await page.goto(board.publicUrl);
    await expect(card(page, "Fede")).toBeVisible();

    // AC-7: closed board hides the form and keeps the wall visible.
    await page.goto(board.adminUrl);
    await page.getByRole("button", { name: "Cerrar tablero" }).click();
    await expect(page.getByText("Cerrado a nuevos mensajes")).toBeVisible();
    await page.goto(board.publicUrl);
    await expect(page.getByRole("button", { name: "Dejar un mensaje" })).toHaveCount(0);
    await expect(page.getByText("Este tablero ya no recibe mensajes.")).toBeVisible();
    await expect(card(page, "Fede")).toBeVisible();
    await expect(card(page, "Fede").getByRole("button", { name: "Editar" })).toHaveCount(0);

    await page.goto(board.adminUrl);
    await page.getByRole("button", { name: "Reabrir tablero" }).click();
    await expect(page.getByText("Abierto a mensajes")).toBeVisible();
  });
});

test.describe("acceso por URL (RF-13, AC-2, AC-8)", () => {
  test("un boardId alterado en un carácter y una adminKey incorrecta responden 404", async ({ page }) => {
    const board = await createBoard(page);
    const altered = board.slug.slice(0, -1) + (board.slug.endsWith("a") ? "b" : "a");

    const wrongBoard = await page.goto(`/b/${altered}`);
    expect(wrongBoard!.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();

    const wrongKey = await page.goto(`/b/${board.slug}/admin?key=${"x".repeat(43)}`);
    expect(wrongKey!.status()).toBe(404);
    const noKey = await page.goto(`/b/${board.slug}/admin`);
    expect(noKey!.status()).toBe(404);
  });

  test("las páginas de tablero llevan noindex y Referrer-Policy: no-referrer", async ({ page }) => {
    const board = await createBoard(page);
    for (const url of [board.publicUrl, board.adminUrl]) {
      const response = await page.goto(url);
      const headers = response!.headers();
      expect(headers["referrer-policy"]).toBe("no-referrer");
      expect(headers["x-robots-tag"]).toContain("noindex");
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
    }
  });
});
