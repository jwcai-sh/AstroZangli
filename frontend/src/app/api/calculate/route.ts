import { NextRequest, NextResponse } from "next/server";
import { getBackendApiBase } from "@/lib/backendApi";

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${getBackendApiBase()}/calculate`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") || "application/json",
      },
      body: await request.text(),
      cache: "no-store",
    });

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "日月计算服务暂不可用，请确认后端服务已启动。" },
      { status: 503 },
    );
  }
}
