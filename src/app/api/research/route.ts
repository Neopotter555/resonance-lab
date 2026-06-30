import { RESEARCH_LIBRARY } from "@/lib/resonance-content";

export const maxDuration = 10;

export async function GET() {
  return Response.json({
    generatedAt: new Date().toISOString(),
    disclaimer:
      "Educational research database only. Do not use this content as medical advice, diagnosis, treatment, or a substitute for professional care.",
    items: RESEARCH_LIBRARY,
  });
}
