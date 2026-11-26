import { describe, expect, test } from "bun:test";
import { DisconnectReason } from "@whiskeysockets/baileys";
import { classifyDisconnect } from "./whatsapp";

describe("WhatsApp Baileys disconnect classification", () => {
  test("treats 515 restartRequired as immediate restart without incrementing failure attempts", () => {
    expect(classifyDisconnect(DisconnectReason.restartRequired, 0)).toEqual({
      action: "restart",
      delayMs: 500,
      nextAttempts: 0,
    });
    expect(classifyDisconnect(515, 2)).toEqual({
      action: "restart",
      delayMs: 500,
      nextAttempts: 2,
    });
  });

  test("clears session on loggedOut and badSession without reconnecting", () => {
    expect(classifyDisconnect(DisconnectReason.loggedOut, 3)).toEqual({
      action: "clear",
      delayMs: 0,
      nextAttempts: 0,
    });
    expect(classifyDisconnect(DisconnectReason.badSession, 1)).toEqual({
      action: "clear",
      delayMs: 0,
      nextAttempts: 0,
    });
  });

  test("applies exponential backoff for transient disconnects and opens circuit breaker after max attempts", () => {
    expect(classifyDisconnect(DisconnectReason.connectionLost, 0)).toEqual({
      action: "backoff",
      delayMs: 5000,
      nextAttempts: 1,
    });
    expect(classifyDisconnect(DisconnectReason.timedOut, 8).action).toBe("circuit_break");
  });
});
