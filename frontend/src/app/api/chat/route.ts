import { NextRequest, NextResponse } from "next/server";
import { getBackendApiBase } from "@/lib/backendApi";

export async function POST(request: NextRequest) {
  try {
    const backendApiBase = getBackendApiBase();
    const bodyText = await request.text();

    const backendResponse = await fetch(`${backendApiBase}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") || "application/json",
      },
      body: bodyText,
    });

    const contentType = backendResponse.headers.get("content-type") || "";
    const responseText = await backendResponse.text();

    return new NextResponse(responseText, {
      status: backendResponse.status,
      headers: {
        "Content-Type": contentType.includes("application/json") ? "application/json" : contentType || "text/plain",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
}
