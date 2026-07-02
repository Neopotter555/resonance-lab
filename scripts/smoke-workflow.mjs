import { chromium } from "playwright";

const target = process.env.SMOKE_URL ?? "http://localhost:3000";

const exactText = (page, text) => page.getByText(text, { exact: true }).first();

async function visible(page, text) {
  return exactText(page, text)
    .isVisible()
    .catch(() => false);
}

async function waitForText(page, text, timeout = 5000) {
  await exactText(page, text).waitFor({ timeout });
  return true;
}

async function waitForEither(page, texts, timeout = 5000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    for (const text of texts) {
      if (await visible(page, text)) return text;
    }

    await page.waitForTimeout(100);
  }

  throw new Error(`Timed out waiting for one of: ${texts.join(", ")}`);
}

function tomorrowLocalInputValue() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function checkResult(result) {
  return Object.entries(result).filter(([key, value]) => {
    if (key === "target") return false;
    if (key === "consoleErrors") return Array.isArray(value) && value.length > 0;
    if (key.endsWith("Overflow")) return value > 4;
    if (key === "exportName") return value !== "resonance-lab-session.json";
    if (key === "audioStartSignal") return !["Audio session started", "Audio could not start"].includes(value);
    if (key === "habitSignal") return !["Habit checked in", "Habit check-in removed"].includes(value);
    if (key === "relaxSignal") return !["Relax music enabled", "Relax music paused"].includes(value);
    if (key === "soundscapeSignal") {
      return !["Ambient soundscape enabled", "Ambient soundscape paused"].includes(value);
    }

    return value !== true;
  });
}

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();
  const consoleErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(target, { waitUntil: "networkidle" });

  const apiTrace = await page.evaluate(async () => {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Build a 10-minute calm focus loop with one variable and safe signals.",
        context: {
          mode: "binaural",
          binaural: { carrier: 220, beat: 8 },
          journalEntries: [],
        },
      }),
    });
    const payload = await response.json();

    return {
      ok: response.ok,
      traceTitles: Array.isArray(payload.trace)
        ? payload.trace.map((step) => step.title)
        : [],
      actions: payload.actions?.length ?? 0,
      checks: payload.checks?.length ?? 0,
      signals: payload.signals?.length ?? 0,
      nextPrompt:
        typeof payload.nextPrompt === "string" &&
        payload.nextPrompt.includes("analyze the newest journal entry"),
    };
  });

  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  const checks = {
    apiTrace:
      apiTrace.ok &&
      apiTrace.traceTitles.includes("Prompt parsed") &&
      apiTrace.traceTitles.includes("Deliverable assembled") &&
      apiTrace.actions >= 4 &&
      apiTrace.checks >= 4 &&
      apiTrace.signals >= 3 &&
      apiTrace.nextPrompt,
    preflightVisible: await visible(page, "Assistant preflight"),
    promptPreflight: await visible(page, "Prompt clarity"),
    protocolPreflight: await visible(page, "Protocol context"),
    audioPreflight: await visible(page, "Audio variable"),
    journalPreflight: await visible(page, "Journal baseline"),
    safetyPreflight: await visible(page, "Safety boundary"),
    sessionCompass: await visible(page, "Session compass"),
    compassInitialFocus: await visible(page, "Press play softly"),
    compassJournalFocus: false,
    compassNextPromptFocus: false,
    compassReadyFocus: false,
    starterTrace: await visible(page, "Operator trace"),
    modeGuidance: false,
    toneLayerAdded: false,
    toneLayerRemoved: false,
    relaxSignal: "",
    soundscapeSignal: "",
    frequencyGuidance: false,
    audioStartSignal: "",
    audioStopGuidance: false,
    presetSaved: false,
    presetDeleted: false,
    customProtocol: false,
    protocolSaved: false,
    journalSaved: false,
    askTrace: false,
    nextPromptCard: false,
    nextPromptLoaded: false,
    analyzeTrace: false,
    scheduleGuidance: false,
    habitSignal: "",
    exportGuidance: false,
  };

  await page.getByRole("button", { name: "Pure tones" }).click();
  checks.modeGuidance = await waitForText(page, "Audio mode selected");

  await page.getByTitle("Add tone layer").click();
  checks.toneLayerAdded = await waitForText(page, "Tone layer added");

  await page.getByTitle("Remove layer").last().click();
  checks.toneLayerRemoved = await waitForText(page, "Tone layer removed");

  await page.getByTitle("Toggle relax music").click();
  checks.relaxSignal = await waitForEither(page, ["Relax music enabled", "Relax music paused"]);

  await page.getByTitle("Toggle soundscape").click();
  checks.soundscapeSignal = await waitForEither(page, [
    "Ambient soundscape enabled",
    "Ambient soundscape paused",
  ]);

  await page.getByLabel("Frequency library").selectOption({ index: 1 });
  checks.frequencyGuidance = await waitForText(page, "Frequency preset applied");

  await page.getByTitle("Start").first().click();
  checks.audioStartSignal = await waitForEither(page, [
    "Audio session started",
    "Audio could not start",
  ]);
  if (checks.audioStartSignal === "Audio session started") {
    await page.waitForTimeout(350);
    await page.getByTitle("Stop").first().click();
    checks.audioStopGuidance = await waitForText(page, "Audio stopped");
  } else {
    checks.audioStopGuidance = true;
  }

  await page.getByLabel("Frequency preset title").fill("Workflow smoke preset");
  await page.getByTitle("Save current frequency preset").click();
  checks.presetSaved = await waitForText(page, "Frequency preset saved");
  await page.getByTitle("Delete preset").first().click();
  checks.presetDeleted = await waitForText(page, "Frequency preset deleted");

  await page.getByTitle("Create custom protocol").click();
  checks.customProtocol = await waitForText(page, "Custom protocol created");
  await page.getByTitle("Save protocol").click();
  checks.protocolSaved = await waitForText(page, "Protocol saved");

  await page
    .getByPlaceholder("What changed, what stayed the same, and what else was happening today?")
    .fill("Workflow smoke: calm, clear, no red signals.");
  await page.getByTitle("Save journal entry").click();
  checks.journalSaved = await waitForText(page, "Journal entry saved");
  checks.compassJournalFocus = await waitForText(page, "Ask or Analyze the journal");

  await page.getByTitle("Ask assistant").click();
  await waitForText(page, "Assistant loop completed", 15000);
  checks.askTrace = (await visible(page, "Prompt parsed")) && (await visible(page, "Deliverable assembled"));
  checks.nextPromptCard = await visible(page, "Next loop prompt");
  checks.compassNextPromptFocus = await visible(page, "Load the next loop prompt");
  await page.getByTitle("Load next loop prompt").last().click();
  checks.nextPromptLoaded = await waitForText(page, "Next loop prompt loaded");
  checks.compassReadyFocus = await waitForText(page, "Next loop ready");

  await page.getByTitle("Analyze journal entries").click();
  await waitForText(page, "Assistant loop completed", 15000);
  checks.analyzeTrace = await visible(page, "Journal evidence checked");

  await page.locator('input[type="datetime-local"]').fill(tomorrowLocalInputValue());
  await page.getByTitle("Schedule active protocol").click();
  checks.scheduleGuidance = await waitForText(page, "Session scheduled");

  await page.getByTitle("Toggle today's habit check-in").click();
  checks.habitSignal = await waitForEither(page, ["Habit checked in", "Habit check-in removed"]);

  const downloadPromise = page.waitForEvent("download");
  await page.getByTitle("Export session").click();
  const download = await downloadPromise;
  checks.exportGuidance = await waitForText(page, "Session exported");

  const desktopOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  const mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );

  await browser.close();

  const result = {
    target,
    ...checks,
    exportName: download.suggestedFilename(),
    desktopOverflow,
    mobileOverflow,
    consoleErrors,
  };
  const failed = checkResult(result);

  console.log(JSON.stringify(result, null, 2));

  if (failed.length) {
    console.error(`FAILED_CHECKS ${JSON.stringify(failed, null, 2)}`);
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
