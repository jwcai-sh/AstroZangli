import { NextRequest, NextResponse } from "next/server";
import { getBackendApiBase } from "@/lib/backendApi";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${getBackendApiBase()}/astronomy/sky-view?${request.nextUrl.searchParams.toString()}`,
      { cache: "no-store", signal: AbortSignal.timeout(30000) },
    );
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ success: false, error: { message: "星历服务暂不可用，请稍后重试。" } }, { status: 503 });
  }
}
