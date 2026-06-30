import { Body, Controller, Get, Post } from "@nestjs/common";
import { buildAssistantSections, researchLibrary, safetyDisclaimer } from "./evidence";

interface AssistantRequest {
  prompt?: string;
}

interface JournalRequest {
  protocolTitle?: string;
  moodBefore?: number;
  moodAfter?: number;
  notes?: string;
}

@Controller()
export class AppController {
  @Get("health")
  health() {
    return {
      ok: true,
      service: "resonance-lab-api",
      database: process.env.DATABASE_URL ? "postgres-configured" : "demo-no-database",
      disclaimer: safetyDisclaimer,
    };
  }

  @Get("research")
  research() {
    return {
      disclaimer: safetyDisclaimer,
      items: researchLibrary,
    };
  }

  @Post("assistant/experiments")
  assistant(@Body() body: AssistantRequest) {
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    return {
      provider:
        process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
          ? "provider-ready-guardrail-service"
          : "local-safety-fallback",
      answer:
        "Design the experiment with one variable, low volume, a clear duration, and before/after journaling. Keep research, hypothesis, spiritual teaching, and user experience separate.",
      sections: buildAssistantSections(prompt || "Untitled experiment"),
    };
  }

  @Post("journal")
  journal(@Body() body: JournalRequest) {
    return {
      accepted: true,
      persistence: process.env.DATABASE_URL ? "postgres-ready" : "demo-echo",
      disclaimer: safetyDisclaimer,
      entry: {
        protocolTitle: body.protocolTitle ?? "Untitled protocol",
        moodBefore: body.moodBefore ?? null,
        moodAfter: body.moodAfter ?? null,
        notes: body.notes ?? "",
      },
    };
  }
}
