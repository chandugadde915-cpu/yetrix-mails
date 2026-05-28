import { backendRequest } from "@/lib/server-api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await backendRequest<{
      token: string;
      expiresAt: number;
      user: { username: string; role: string };
    }>("/auth/login", undefined, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = NextResponse.json({ success: true, data: data.user });
    response.cookies.set("yetrix_token", data.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(data.expiresAt * 1000),
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      },
      { status: 401 },
    );
  }
}
