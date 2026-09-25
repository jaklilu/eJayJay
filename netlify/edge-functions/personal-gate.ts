import type { Config, Context } from "@netlify/edge-functions";

function getEnvVar(name: string): { value: string; api: string } {
  const netlifyValue = Netlify.env.get(name);
  if (netlifyValue !== undefined && netlifyValue !== null) {
    return { value: netlifyValue, api: "Netlify.env" };
  }
  const denoValue = Deno.env.get(name);
  if (denoValue !== undefined && denoValue !== null) {
    return { value: denoValue, api: "Deno.env" };
  }
  return { value: "", api: "Netlify.env" };
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    let dummy = 0;
    for (let i = 0; i < a.length; i++) {
      dummy |= a.charCodeAt(i) ^ a.charCodeAt(i);
    }
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function unauthorized(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="ejayjay personal"',
      "Cache-Control": "private, no-store",
      "Content-Type": "text/plain",
    },
  });
}

export default async function handler(
  request: Request,
  context: Context
): Promise<Response> {
  const url = new URL(request.url);

  // TODO: REMOVE THIS DIAGNOSTIC ENDPOINT BEFORE MERGE
  // Temporary diagnostic to debug env var loading
  if (url.pathname === "/personal/__gate-status") {
    const authPwResult = getEnvVar("PERSONAL_AUTH_PASSWORD");
    const tokenResult = getEnvVar("PERSONAL_SERVICE_TOKEN");
    const authPwTrimmed = authPwResult.value.trim();
    const tokenTrimmed = tokenResult.value.trim();

    const status = {
      deployContext: context.deploy?.context ?? null,
      authPwSet: authPwResult.value.length > 0,
      authPwLen: authPwResult.value.length,
      tokenSet: tokenResult.value.length > 0,
      tokenLen: tokenResult.value.length,
      tokenTrimmedLen: tokenTrimmed.length,
      envApi: authPwResult.api,
    };

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  const authPwResult = getEnvVar("PERSONAL_AUTH_PASSWORD");
  const tokenResult = getEnvVar("PERSONAL_SERVICE_TOKEN");
  const authPassword = authPwResult.value.trim();
  const serviceToken = tokenResult.value.trim();

  const serviceHeader = (request.headers.get("X-Service-Token") || "").trim();
  if (serviceToken && serviceHeader && constantTimeCompare(serviceHeader, serviceToken)) {
    const response = await context.next();
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "private, no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  const authHeader = request.headers.get("Authorization") || "";
  if (authPassword && authHeader.startsWith("Basic ")) {
    try {
      const base64 = authHeader.slice(6);
      const decoded = atob(base64);
      const colonIndex = decoded.indexOf(":");
      if (colonIndex > 0) {
        const user = decoded.slice(0, colonIndex);
        const pass = decoded.slice(colonIndex + 1).trim();
        if (user === "jay" && constantTimeCompare(pass, authPassword)) {
          const response = await context.next();
          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cache-Control", "private, no-store");
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        }
      }
    } catch {
      // Invalid base64, fall through to unauthorized
    }
  }

  return unauthorized();
}

export const config: Config = {
  path: "/personal/*",
};
