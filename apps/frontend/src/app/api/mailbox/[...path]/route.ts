import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    path: string[];
  }>;
};

export async function POST(request: NextRequest, context: Params) {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { success: false, error: "Workspace connection is not configured" },
      { status: 500 },
    );
  }

  const { path } = await context.params;
  let response: Response;
  try {
    response = await fetch(`${apiUrl.replace(/\/$/, "")}/public/mail/${path.join("/")}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: await request.text(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? `Workspace service is unreachable: ${error.message}`
            : "Workspace service is unreachable",
      },
      { status: 502 },
    );
  }

  const text = await response.text();
  if (!response.ok) {
    return NextResponse.json(
      { success: false, error: publicErrorMessage(extractError(text)) },
      { status: response.status },
    );
  }

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

function extractError(text: string) {
  try {
    const payload = JSON.parse(text) as { error?: string; message?: string };
    return payload.error ?? payload.message;
  } catch {
    return text;
  }
}

function publicErrorMessage(message?: string) {
  if (!message) {
    return "Mailbox request failed";
  }

  if (/(^|[^a-z])api([^a-z]|$)|backend|mailcow|mail_engine|mail engine|smtp|imap|cors|econn|enotfound|socket|tls|fetch|localhost|port\s+\d+/i.test(message)) {
    return "Mailbox service is temporarily unavailable.";
  }

  return message;
}
