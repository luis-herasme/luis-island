/**
 * The HUD is DOM, not WebGL: the renderer has no text drawing, and a fixed
 * overlay above the canvas is the simplest honest way to show numbers. The
 * coin icon is the peso atlas itself — object-fit crops it to the front
 * face's half, and the border radius rounds it into a coin.
 */

const COUNTER_CONTAINER_STYLE = [
  "position: fixed",
  "top: 16px",
  "left: 16px",
  "display: flex",
  "align-items: center",
  "gap: 10px",
  "padding: 8px 18px 8px 10px",
  "background: rgba(10, 16, 24, 0.72)",
  "border-radius: 999px",
  "color: #f4d47c",
  "font: 600 22px/1 system-ui, sans-serif",
  "user-select: none",
  "pointer-events: none",
].join("; ");

const COIN_ICON_STYLE = [
  "width: 44px",
  "height: 44px",
  "border-radius: 50%",
  "object-fit: cover",
  "object-position: left center",
].join("; ");

let coinCountElement: HTMLSpanElement | null = null;

export function setCoinCount(count: number): void {
  if (!coinCountElement) coinCountElement = createCoinCounter();
  coinCountElement.textContent = String(count);
}

function createCoinCounter(): HTMLSpanElement {
  const container = document.createElement("div");
  container.style.cssText = COUNTER_CONTAINER_STYLE;

  const icon = document.createElement("img");
  icon.src = "/peso.jpg";
  icon.alt = "";
  icon.style.cssText = COIN_ICON_STYLE;

  const count = document.createElement("span");

  container.appendChild(icon);
  container.appendChild(count);
  document.body.appendChild(container);

  return count;
}
