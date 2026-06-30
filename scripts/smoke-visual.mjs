import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const target = process.env.SMOKE_URL ?? "http://localhost:3000";
const outDir = "artifacts";

async function sampleCanvases(page) {
  return page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll("canvas"));

    return canvases.map((canvas, index) => {
      const rect = canvas.getBoundingClientRect();
      let nonBlankPixels = 0;
      let contextType = "unknown";

      try {
        const context = canvas.getContext("2d");
        if (context) {
          contextType = "2d";
          const sampleWidth = Math.max(1, Math.min(80, canvas.width));
          const sampleHeight = Math.max(1, Math.min(80, canvas.height));
          const data = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
          for (let cursor = 0; cursor < data.length; cursor += 4) {
            if (data[cursor] || data[cursor + 1] || data[cursor + 2]) nonBlankPixels += 1;
          }
        } else {
          const webgl =
            canvas.getContext("webgl2") ??
            canvas.getContext("webgl") ??
            canvas.getContext("experimental-webgl");
          if (webgl && "readPixels" in webgl) {
            contextType = "webgl";
            const gl = webgl;
            const sampleWidth = Math.max(1, Math.min(64, canvas.width));
            const sampleHeight = Math.max(1, Math.min(64, canvas.height));
            const pixels = new Uint8Array(sampleWidth * sampleHeight * 4);
            const x = Math.max(0, Math.floor(canvas.width / 2 - sampleWidth / 2));
            const y = Math.max(0, Math.floor(canvas.height / 2 - sampleHeight / 2));
            gl.readPixels(x, y, sampleWidth, sampleHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            for (let cursor = 0; cursor < pixels.length; cursor += 4) {
              if (pixels[cursor] || pixels[cursor + 1] || pixels[cursor + 2]) nonBlankPixels += 1;
            }
          } else {
            nonBlankPixels = -1;
          }
        }
      } catch {
        nonBlankPixels = -1;
      }

      return {
        index,
        contextType,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        nonBlankPixels,
      };
    });
  });
}

async function run() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

  await page.goto(target, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas");
  await page.screenshot({ path: `${outDir}/desktop.png`, fullPage: true });

  const desktopCanvases = await sampleCanvases(page);
  const desktopOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(target, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas");
  await page.screenshot({ path: `${outDir}/mobile.png`, fullPage: true });
  const mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );

  await browser.close();

  const blank2d = desktopCanvases.filter((canvas) => canvas.nonBlankPixels === 0);
  const unreadable = desktopCanvases.filter((canvas) => canvas.nonBlankPixels < 0);
  if (desktopCanvases.length < 3) {
    throw new Error(`Expected at least 3 canvases, found ${desktopCanvases.length}.`);
  }
  if (unreadable.length > 0) {
    throw new Error(`Unreadable canvas detected: ${JSON.stringify(unreadable)}`);
  }
  if (blank2d.length > 0) {
    throw new Error(`Blank 2D canvas detected: ${JSON.stringify(blank2d)}`);
  }
  if (desktopOverflow > 4 || mobileOverflow > 4) {
    throw new Error(
      `Horizontal overflow detected. desktop=${desktopOverflow}, mobile=${mobileOverflow}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        target,
        desktopCanvases,
        desktopOverflow,
        mobileOverflow,
        screenshots: [`${outDir}/desktop.png`, `${outDir}/mobile.png`],
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
