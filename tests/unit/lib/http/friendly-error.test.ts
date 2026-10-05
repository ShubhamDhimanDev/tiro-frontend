import { describe, expect, it } from "vitest";
import {
  FRIENDLY_ERROR_MESSAGE,
  FRIENDLY_NETWORK_MESSAGE,
  friendlyErrorBody,
  friendlyMessage,
  isUpstreamFailure,
} from "@/lib/http/friendly-error";

const LEAKS = [
  "SQLSTATE[HY000] [2002] Connection refused (Connection: mysql, SQL: select * from `zones`)",
  "Connection refused [tcp://127.0.0.1:6379]",
  "Illuminate\Database\QueryException in /var/www/vendor/laravel/framework/src/Illuminate/Database/Connection.php:822",
  "Stack trace: #0 /app/Http/Controllers/FooController.php(12)",
];

describe("friendly error helper", () => {
  it("treats status 0 and 5xx as upstream failures, not 4xx", () => {
    expect(isUpstreamFailure(0)).toBe(true);
    expect(isUpstreamFailure(500)).toBe(true);
    expect(isUpstreamFailure(502)).toBe(true);
    expect(isUpstreamFailure(404)).toBe(false);
    expect(isUpstreamFailure(422)).toBe(false);
  });

  it("never returns upstream text for a 5xx, whatever the body says", () => {
    for (const leak of LEAKS) {
      expect(friendlyMessage(500, { message: leak })).toBe(FRIENDLY_ERROR_MESSAGE);
      expect(friendlyMessage(502, { message: leak })).toBe(FRIENDLY_ERROR_MESSAGE);
    }
  });

  it("uses the network copy for status 0", () => {
    expect(friendlyMessage(0, null)).toBe(FRIENDLY_NETWORK_MESSAGE);
  });

  it("drops technical text even on a 4xx and falls back to generic copy", () => {
    for (const leak of LEAKS) {
      const out = friendlyMessage(400, { message: leak });
      expect(out).not.toMatch(/SQLSTATE|tcp:\/\/|vendor|Stack trace|\.php/i);
      expect(out).toBe("Something went wrong. Please try again.");
    }
  });

  it("keeps a safe 4xx message and survives malformed bodies", () => {
    expect(friendlyMessage(409, { message: "That slot was just taken." })).toBe("That slot was just taken.");
    expect(friendlyMessage(404, undefined)).toBe("Something went wrong. Please try again.");
    expect(friendlyMessage(404, { message: 42 }, "custom")).toBe("custom");
  });

  it("builds a safe {message, code} body for the proxy", () => {
    expect(friendlyErrorBody(500)).toEqual({ message: FRIENDLY_ERROR_MESSAGE, code: "server_error" });
    expect(friendlyErrorBody(503).code).toBe("service_unavailable");
    expect(JSON.stringify(friendlyErrorBody(500))).not.toMatch(/SQLSTATE|tcp:|Illuminate|Stack/i);
  });
});
