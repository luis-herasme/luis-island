let idCounter = 0;

export function generateId(): number {
  return idCounter++;
}

export async function fetchImage(url: string): Promise<HTMLImageElement> {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const image = new Image();
  image.src = objectUrl;
  await image.decode();

  return image;
}

export async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  return response.text();
}

/** Calls the callback once per frame, forever. */
export function startAnimationLoop(callback: () => void): void {
  const frame = () => {
    callback();
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}
