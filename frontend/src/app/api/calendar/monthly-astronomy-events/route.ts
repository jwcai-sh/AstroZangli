import { NextRequest, NextResponse } from "next/server";
import { getBackendApiBase } from "@/lib/backendApi";

export async function POST(request: NextRequest) {
  try {
    const backendResponse = await fetch(`${getBackendApiBase()}/calendar/monthly-astronomy-events`, {
      method: "POST",
      headers: { "Content-Type": request.headers.get("content-type") || "application/json" },
      body: await request.text(),
    });
    return new NextResponse(await backendResponse.text(), {
      status: backendResponse.status,
      headers: { "Content-Type": backendResponse.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error instanceof Error ? error.message : "Internal Server Error" } }, { status: 500 });
  }
}
