import { NextRequest, NextResponse } from "next/server";
import { getBackendApiBase } from "@/lib/backendApi";

export async function GET(request: NextRequest) {
  try {
    const backendResponse = await fetch(
      `${getBackendApiBase()}/calendar/year-eclipses?${request.nextUrl.searchParams.toString()}`,
      { cache: "no-store" },
    );
    return new NextResponse(await backendResponse.text(), {
      status: backendResponse.status,
      headers: { "Content-Type": backendResponse.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "天文计算服务暂不可用，请稍后重试。" } },
      { status: 503 },
    );
  }
}
