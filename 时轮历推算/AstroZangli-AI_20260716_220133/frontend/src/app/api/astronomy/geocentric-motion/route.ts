import { NextRequest, NextResponse } from "next/server";
import { getBackendApiBase } from "@/lib/backendApi";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${getBackendApiBase()}/astronomy/geocentric-motion?${request.nextUrl.searchParams.toString()}`,
      { cache: "no-store" },
    );
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "地心七曜服务暂不可用，请稍后重试。" } },
      { status: 503 },
    );
  }
}
