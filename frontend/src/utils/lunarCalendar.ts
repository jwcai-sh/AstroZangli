/**
 * 根据选中日期找到最近的下一个公历节日
 * 通过 API 路由在服务端处理，避免客户端模块解析问题
 * @param year 公历年
 * @param month 公历月 (1-12)
 * @param day 公历日 (1-31)
 * @returns 返回最近的下一个公历节日信息，如果找不到则返回 null
 */
export async function findNextSolarFestival(
  year: number,
  month: number,
  day: number
): Promise<{ name: string; date: string; daysLeft: number } | null> {
  try {
    const response = await fetch("/api/lunar-festival", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ year, month, day }),
    });

    if (!response.ok) {
      console.error("获取公历节日失败:", response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("获取公历节日失败:", error);
    return null;
  }
}

/**
 * 根据选中日期找到最近的下一个农历节日
 * 通过 API 路由在服务端处理，避免客户端模块解析问题
 * @param year 公历年
 * @param month 公历月 (1-12)
 * @param day 公历日 (1-31)
 * @returns 返回最近的下一个农历节日信息，如果找不到则返回 null
 */
export async function findNextLunarFestival(
  year: number,
  month: number,
  day: number
): Promise<{ name: string; date: string; daysLeft: number } | null> {
  try {
    const response = await fetch("/api/lunar-holiday", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ year, month, day }),
    });

    if (!response.ok) {
      console.error("获取农历节日失败:", response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("获取农历节日失败:", error);
    return null;
  }
}

