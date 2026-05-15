import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../prompts";

const actor = {
  tenantId: "tenant-abc",
  userId: "u1",
  timezone: "America/Los_Angeles",
  currency: "USD",
};

describe("buildSystemPrompt", () => {
  it("encodes tenant boundary rules", () => {
    const prompt = buildSystemPrompt({
      actor,
      channel: "web",
      contextBlock: "User: Alice.",
    });
    expect(prompt).toContain("tenant-abc");
    expect(prompt).toContain("Never reveal data from other tenants");
    expect(prompt).toContain("America/Los_Angeles");
  });

  it("applies SMS character guidance on the sms channel", () => {
    const web = buildSystemPrompt({ actor, channel: "web", contextBlock: "" });
    const sms = buildSystemPrompt({ actor, channel: "sms", contextBlock: "" });
    expect(sms).toContain("SMS");
    expect(sms).toContain("under 320 characters");
    expect(web).not.toContain("under 320 characters");
  });

  it("includes tenant-specific instructions when provided", () => {
    const prompt = buildSystemPrompt({
      actor,
      channel: "web",
      tenantPersona: "Coach Maya",
      tenantSystemPrompt: "Always suggest yoga first.",
      contextBlock: "",
    });
    expect(prompt).toContain("Coach Maya");
    expect(prompt).toContain("Always suggest yoga first.");
  });
});
