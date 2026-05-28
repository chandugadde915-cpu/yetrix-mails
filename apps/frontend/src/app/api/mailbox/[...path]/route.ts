import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    path: string[];
  }>;
};

export async function POST(request: NextRequest, context: Params) {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { success: false, error: "API_URL is not configured" },
      { status: 500 },
    );
  }

  const { path } = await context.params;
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/public/mail/${path.join("/")}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: await request.text(),
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
