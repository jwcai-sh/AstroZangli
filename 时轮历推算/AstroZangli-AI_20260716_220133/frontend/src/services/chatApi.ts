export interface ChatApiResponse {
    success: boolean;
    data?: {
        reply: string;
    };
    error?: {
        message: string;
    };
}

// The API base is the root of our own application, not the external API
const API_BASE = "/api";

export async function fetchChatReply(message: string, locale: "zh" | "bo" = "zh"): Promise<ChatApiResponse["data"]> {
    const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, locale }),
    });

    if (!res.ok) {
        // Attempt to parse error response for a more specific message
        const errorJson = await res.json().catch(() => ({}));
        const errorMessage = errorJson.error?.message || `聊天服务状态码 ${res.status}`;
        throw new Error(errorMessage);
    }

    const json: ChatApiResponse = await res.json();

    if (!json.success) {
        throw new Error(json.error?.message || "请求失败");
    }

    return json.data;
}
