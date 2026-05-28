import { backendRequest } from "@/lib/server-api";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(request: NextRequest, context: Params) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: Params) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: Params) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: Params) {
  return proxy(request, context);
}

async function proxy(request: NextRequest, context: Params) {
  const token = (await cookies()).get("yetrix_token")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { path } = await context.params;
    const body = ["POST", "PUT"].includes(request.method) ? await request.text() : undefined;
    const data = await backendRequest(`/${path.join("/")}`, token, {
      method: request.method,
      body,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "API request failed",
      },
      { status: 500 },
    );
  }
}
