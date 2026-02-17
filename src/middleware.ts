import { type NextRequest, NextResponse } from "next/server";
import arcjet, {
  detectBot,
  tokenBucket,
  shield,
} from "@arcjet/next";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

// Initialize Arcjet only if the key is present.
// We use a ternary operator and let TypeScript infer the type.
const aj = process.env.ARCJET_KEY
  ? arcjet({
      key: process.env.ARCJET_KEY,
      rules: [
        tokenBucket({
          mode: "LIVE",
          refillRate: 30,
          interval: 60,
          capacity: 100,
        }),
        detectBot({
          mode: "LIVE",
          allow: ["CATEGORY:SEARCH_ENGINE"],
        }),
        shield({
          mode: "LIVE",
        }),
      ],
    })
  : undefined;

if (!process.env.ARCJET_KEY) {
  console.warn("ARCJET_KEY is not set. Arcjet protection is disabled.");
}

export default async function middleware(request: NextRequest) {
  // If Arcjet is not configured, bypass protection
  if (!aj) {
    return NextResponse.next();
  }

  // Bypass Arcjet for Firebase/Google health checks to allow previews to work
  const userAgent = request.headers.get("user-agent") || "";
  if (userAgent.includes("GoogleHC/")) {
    return NextResponse.next();
  }

  const decision = await aj.protect(request, { requested: 1 });

  if (decision.isDenied()) {
    let status = 403;
    let message = "Forbidden";

    switch (decision.reason.type) {
      case "RATE_LIMIT":
        status = 429;
        message = "Too Many Requests";
        break;
      case "SHIELD":
        message = "Request blocked by WAF";
        break;
    }

    return NextResponse.json(
      {
        error: message,
      },
      { status }
    );
  }

  return NextResponse.next();
}