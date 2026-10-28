// Reading files the visitor attaches. Images are resized in the browser. PDFs and text files are
// turned into text in the browser, so only that text (not the file) is sent with the question.
// The limits match server/src/chatRequest.js.

export const LIMITS = { images: 3, documents: 3, documentChars: 14_000, imageChars: 1_400_000, pdfPages: 30 };

const MB = 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const TEXT_EXTENSIONS = /\.(txt|md|csv|json|log)$/i;

export const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf,.pdf,.txt,.md,.csv,.json,.log";

const makeId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image could not be opened."));
    };
    image.src = url;
  });
}

function drawScaled(image, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff"; // transparent PNGs become white instead of black
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function readImage(file) {
  if (file.size > 15 * MB) throw new Error(`${file.name} is larger than 15 MB.`);
  const image = await loadImage(file);

  let data = drawScaled(image, 1280, 0.82);
  for (const [side, quality] of [[1024, 0.75], [800, 0.7], [640, 0.65]]) {
    if (data.length <= LIMITS.imageChars) break;
    data = drawScaled(image, side, quality);
  }
  return { id: makeId(), kind: "image", name: file.name || "image", data, thumb: drawScaled(image, 192, 0.7) };
}

// The legacy build runs on older iPhones and Android browsers too.
async function readPdf(file) {
  if (file.size > 20 * MB) throw new Error(`${file.name} is larger than 20 MB.`);
  const [pdfjs, worker] = await Promise.all([import("pdfjs-dist/legacy/build/pdf.min.mjs"), import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pdf = await task.promise;
  const total = pdf.numPages;
  const pages = Math.min(total, LIMITS.pdfPages);
  let text = "";

  for (let number = 1; number <= pages && text.length < LIMITS.documentChars; number++) {
    const page = await pdf.getPage(number);
    const content = await page.getTextContent();
    const lines = content.items.map((item) => item.str + (item.hasEOL ? "\n" : " ")).join("");
    text += `${lines.replace(/[ \t]+/g, " ").trim()}\n\n`;
  }
  await task.destroy().catch(() => {}); // frees the worker; failing to clean up must not lose the text

  text = text.trim();
  if (text.replace(/\s/g, "").length < 20) {
    throw new Error(`${file.name} has no selectable text. It may be a scanned PDF. Try attaching a photo of the page instead.`);
  }
  return {
    id: makeId(),
    kind: "document",
    name: file.name,
    pages: total,
    text: text.slice(0, LIMITS.documentChars),
    truncated: text.length > LIMITS.documentChars || total > pages,
  };
}

async function readText(file) {
  if (file.size > 2 * MB) throw new Error(`${file.name} is larger than 2 MB.`);
  const text = (await file.text()).trim();
  if (!text) throw new Error(`${file.name} is empty.`);
  return { id: makeId(), kind: "document", name: file.name, text: text.slice(0, LIMITS.documentChars), truncated: text.length > LIMITS.documentChars };
}

/** Turns one File into an attachment, or throws an Error with a message fit to show the visitor. */
export async function readAttachment(file) {
  if (IMAGE_TYPES.includes(file.type)) return readImage(file);
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return readPdf(file);
  if (file.type.startsWith("text/") || file.type === "application/json" || TEXT_EXTENSIONS.test(file.name)) return readText(file);
  throw new Error(`${file.name || "That file"} is not supported. Attach an image, a PDF or a text file.`);
}
