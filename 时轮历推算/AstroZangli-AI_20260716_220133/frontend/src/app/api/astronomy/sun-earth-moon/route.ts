import { NextRequest, NextResponse } from "next/server";
import { getBackendApiBase } from "@/lib/backendApi";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${getBackendApiBase()}/astronomy/sun-earth-moon?${request.nextUrl.searchParams.toString()}`,
      { cache: "no-store" },
    );
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "日地月运动服务暂不可用，请稍后重试。" } },
      { status: 503 },
    );
  }
}
