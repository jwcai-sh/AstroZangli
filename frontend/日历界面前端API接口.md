# API接口文档

## 接口概览

整个系统的数据流程：**用户选择日期和城市** → **后端计算天文数据** → **返回四个组件所需数据**

---

## 1. 核心接口：日历日期数据查询（统一接口）

### 接口信息
- **接口名称**: 日历日期数据查询
- **接口描述**: 根据用户选择的日期和城市，一次性返回日历界面所有组件所需的数据
- **请求方法**: `POST`
- **接口路径**: `/calendar/date-comprehensive-data`
- **当前时间获取**: 当date参数为空时，后端应调用系统当前时间函数获取当前日期

### 请求参数

| 参数名       | 类型     | 必填  | 默认值      | 说明                                                      |
| --------- | ------ | --- | -------- | ------------------------------------------------------- |
| date      | string | 否   | 当前日期     | 用户选择的日期格式: YYYY-MM-DD，不传则默认为当前日期        |
| cityName  | string | 否   | 上海市     | 城市名称 (如: 上海市、北京市、广州市等)                      |

**说明：**
- 如果只传 `cityName`，后端会自动查询该城市的经纬度和海拔
- 如果传了 `cityName` 但该城市不存在，会使用默认的上海坐标
- 经纬度和海拔不需要前端传递，由后端根据城市名称自动获取

### 响应参数

| 参数名                | 类型     | 说明              |
| ------------------ | ------ | --------------- |
| selectedDate      | string | 用户选择的日期 (YYYY-MM-DD) |
| selectedCity      | string | 用户选择的城市名称          |
| location           | object | 地理位置信息          |
| location.latitude  | float  | 纬度              |
| location.longitude | float  | 经度              |
| location.altitude  | float  | 海拔高度            |
| **dateEvents**    | object | **DateEventsCard组件数据** |
| **astrologicalTable** | object | **AstrologicalTableCard组件数据** |
| **moonPhase**     | object | **MoonPhaseCard组件数据** |
| **planetaryChart** | object | **PlanetaryChartCard组件数据** |

### 请求示例

```json
{
  "date": "2025-07-23",
  "cityName": "上海市"
}
```

### 成功响应示例

```json
{
  "success": true,
  "data": {
    "selectedDate": "2025-07-23",
    "selectedCity": "上海市",
    "location": {
      "latitude": 31.2304,
      "longitude": 121.4737,
      "altitude": 4.0
    },
    "dateEvents": {
      "lunarInfo": {
        "fullDate": "二零二五年 六月廿九"
      },
      "solarInfo": {
        "fullDate": "2025年7月23日 周三"
      },
      "tibetanInfo": {
        "fullDate": "木蛇年 五月廿九"
      },
      "events": {
        "solarHoliday": {
          "name": "国庆节",
          "date": "10月1日",
          "daysLeft": 70
        },
        "lunarHoliday": {
          "name": "立秋",
          "date": "8月7日",
          "daysLeft": 15
        },
        "tibetanHoliday": {
          "name": "雪顿节",
          "date": "8月8日",
          "daysLeft": 16
        }
      }
    },
    "astrologicalTable": {
      "tibetanDate": "木蛇年 五月廿九",
      "tableData": [
        {
          "fixedWeekday": 1,
          "solarLunar": 15,
          "fixedDay": 7,
          "conjunction": 22,
          "effect": "孺蜜"
        },
        {
          "fixedWeekday": 2,
          "solarLunar": 10,
          "fixedDay": 7,
          "conjunction": 17,
          "effect": "贵种"
        }
      ]
    },
    "moonPhase": {
      "lunarDate": "二零二五年六月廿九",
      "observationTime": "11:26",
      "illumination": 99.6,
      "culminationTime": "23:34",
      "moonriseTime": "05:19",
      "moonsetTime": "18:41",
      "phaseName": "下弦月",
      "phaseAngle": 270.5
    },
    "planetaryChart": {
      "solarDate": "2025年7月23日 周三",
      "constellation": "狮子宫",
      "riseTime": "05:14",
      "setTime": "19:27",
      "transitTime": "12:20",
      "zodiacPosition": {
        "sign": "狮子座",
        "degree": 15.5,
        "minute": 30.0
      }
    }
  }
}
```

### 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "CITY_NOT_FOUND",
    "message": "城市不存在",
    "details": "请检查城市名称是否正确，支持的城市：上海市、北京市、广州市等"
  }
}
```

### 错误码说明

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| `CITY_NOT_FOUND` | 城市不存在 | 检查城市名称是否正确 |
| `INVALID_DATE_FORMAT` | 日期格式错误 | 使用YYYY-MM-DD格式 |
| `DATE_OUT_OF_RANGE` | 日期超出范围 | 使用1900-2100年范围内的日期 |
| `SERVER_ERROR` | 服务器内部错误 | 联系技术支持 |

---

## 2. 四个组件的详细数据结构

### 2.1 DateEventsCard组件数据 (dateEvents)

| 参数名                | 类型     | 说明              |
| ------------------ | ------ | --------------- |
| lunarInfo         | object | 农历信息          |
| lunarInfo.fullDate | string | 完整农历日期 (如: 二零二五年 六月廿九) |
| solarInfo         | object | 公历信息          |
| solarInfo.fullDate | string | 完整公历日期 (如: 2025年7月23日 周三) |
| tibetanInfo       | object | 藏历信息          |
| tibetanInfo.fullDate | string | 完整藏历日期 (如: 木蛇年 五月廿九) |
| events             | object | 节日事件信息        |
| events.solarHoliday | object | 公历节日 (第1行)    |
| events.solarHoliday.name | string | 节日名称 (如: 国庆节) |
| events.solarHoliday.date | string | 节日日期 (如: 10月1日) |
| events.solarHoliday.daysLeft | int | 距离天数 |
| events.lunarHoliday | object | 农历节日 (第2行)    |
| events.lunarHoliday.name | string | 节日名称 (如: 立秋) |
| events.lunarHoliday.date | string | 节日日期 (如: 8月7日) |
| events.lunarHoliday.daysLeft | int | 距离天数 |
| events.tibetanHoliday | object | 藏历节日 (第3行)    |
| events.tibetanHoliday.name | string | 节日名称 (如: 雪顿节) |
| events.tibetanHoliday.date | string | 节日日期 (如: 8月8日) |
| events.tibetanHoliday.daysLeft | int | 距离天数 |

### 2.2 AstrologicalTableCard组件数据 (astrologicalTable)

| 参数名                | 类型     | 说明              |
| ------------------ | ------ | --------------- |
| tibetanDate      | string | 藏历日期 (如: 木蛇年 五月廿九) |
| tableData        | array  | 占星表格数据        |
| tableData[].fixedWeekday | int | 定曜            |
| tableData[].solarLunar   | int | 太阳日月宿        |
| tableData[].fixedDay     | int | 定日            |
| tableData[].conjunction   | int | 会合            |
| tableData[].effect       | string | 作用            |

### 2.3 MoonPhaseCard组件数据 (moonPhase)

| 参数名                | 类型     | 说明              |
| ------------------ | ------ | --------------- |
| lunarDate         | string | 农历日期 (如: 二零二五年六月廿九) |
| observationTime   | string | 观测时间 默认当前时间，可通过前端输入选择的 |
| illumination       | float  | 照明度百分比 (如: 99.6) |
| culminationTime   | string | 中天时间 (如: 23:34) |
| moonriseTime      | string | 月出时间 (如: 05:19) |
| moonsetTime       | string | 月落时间 (如: 18:41) |
| phaseName         | string | 月相名称          |
| phaseAngle        | float  | 月相角度          |

### 2.4 PlanetaryChartCard组件数据 (planetaryChart)

| 参数名                | 类型     | 说明              |
| ------------------ | ------ | --------------- |
| solarDate         | string | 公历日期 (如: 2025年7月23日 周三) |
| constellation      | string | 星座名称 (如: 狮子宫) |
| riseTime          | string | 升起时间 (如: 05:14) |
| setTime           | string | 落下时间 (如: 19:27) |
| transitTime       | string | 中天时间          |
| zodiacPosition    | object | 黄道位置信息        |
| zodiacPosition.sign | string | 黄道十二宫        |
| zodiacPosition.degree | float | 度数            |
| zodiacPosition.minute | float | 分数            |

---

## 3. Mock数据说明

### 3.1 开发阶段Mock数据

为了便于前端开发，建议后端工程师在开发阶段先返回固定的Mock数据：

```json
{
  "success": true,
  "data": {
    "selectedDate": "2025-07-23",
    "selectedCity": "上海市",
    "location": {
      "latitude": 31.2304,
      "longitude": 121.4737,
      "altitude": 4.0
    },
    "dateEvents": {
      "lunarInfo": {
        "fullDate": "二零二五年 六月廿九"
      },
      "solarInfo": {
        "fullDate": "2025年7月23日 周三"
      },
      "tibetanInfo": {
        "fullDate": "木蛇年 五月廿九"
      },
      "events": {
        "solarHoliday": {
          "name": "国庆节",
          "date": "10月1日",
          "daysLeft": 70
        },
        "lunarHoliday": {
          "name": "立秋",
          "date": "8月7日",
          "daysLeft": 15
        },
        "tibetanHoliday": {
          "name": "雪顿节",
          "date": "8月8日",
          "daysLeft": 16
        }
      }
    },
    "astrologicalTable": {
      "tibetanDate": "木蛇年 五月廿九",
      "tableData": [
        {
          "fixedWeekday": 1,
          "solarLunar": 15,
          "fixedDay": 7,
          "conjunction": 22,
          "effect": "孺蜜"
        },
        {
          "fixedWeekday": 2,
          "solarLunar": 10,
          "fixedDay": 7,
          "conjunction": 17,
          "effect": "贵种"
        },
        {
          "fixedWeekday": 22,
          "solarLunar": 45,
          "fixedDay": 8,
          "conjunction": 54,
          "effect": ""
        },
        {
          "fixedWeekday": 3,
          "solarLunar": 5,
          "fixedDay": 3,
          "conjunction": 2,
          "effect": ""
        },
        {
          "fixedWeekday": 61,
          "solarLunar": 8,
          "fixedDay": 3,
          "conjunction": 11,
          "effect": ""
        },
        {
          "fixedWeekday": 248,
          "solarLunar": 459,
          "fixedDay": 459,
          "conjunction": "",
          "effect": ""
        }
      ]
    },
    "moonPhase": {
      "lunarDate": "二零二五年六月廿九",
      "observationTime": "11:26",
      "illumination": 99.6,
      "culminationTime": "23:34",
      "moonriseTime": "05:19",
      "moonsetTime": "18:41",
      "phaseName": "下弦月",
      "phaseAngle": 270.5
    },
    "planetaryChart": {
      "solarDate": "2025年7月23日 周三",
      "constellation": "狮子宫",
      "riseTime": "05:14",
      "setTime": "19:27",
      "transitTime": "12:20",
      "zodiacPosition": {
        "sign": "狮子座",
        "degree": 15.5,
        "minute": 30.0
      }
    }
  }
}
```

### 3.2 测试用例

建议后端工程师提供以下测试用例：

1. **正常请求**：`{"date": "2025-07-23", "cityName": "上海市"}`
2. **只传城市**：`{"cityName": "北京市"}`
3. **只传日期**：`{"date": "2025-07-23"}`
4. **空请求**：`{}`
5. **错误城市**：`{"cityName": "不存在的城市"}`
6. **错误日期格式**：`{"date": "2025/07/23"}`

---

## 4. 前端开发指南

### 4.1 接口调用示例

```typescript
// API调用函数
async function fetchCalendarData(date?: string, cityName?: string) {
  try {
    const response = await fetch('/calendar/date-comprehensive-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: date || new Date().toISOString().split('T')[0],
        cityName: cityName || '上海市'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.data;
  } catch (error) {
    console.error('API调用失败:', error);
    throw error;
  }
}
```

### 4.2 组件数据绑定示例

```typescript
// 在CalendarPage组件中使用
const [calendarData, setCalendarData] = useState(null);
const [loading, setLoading] = useState(false);

// 获取数据的函数
const loadCalendarData = async (selectedDate?: string, selectedCity?: string) => {
  setLoading(true);
  try {
    const data = await fetchCalendarData(selectedDate, selectedCity);
    setCalendarData(data);
  } catch (error) {
    console.error('加载数据失败:', error);
    // 可以显示错误提示
  } finally {
    setLoading(false);
  }
};

// 城市选择回调
const handleCityChange = (selectedCity: string) => {
  setCity(selectedCity);
  loadCalendarData(selectedDate, selectedCity);
};

// 日期选择回调
const handleDateSelect = (day: number) => {
  const newDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  setSelectedDate(newDate);
  loadCalendarData(newDate, city);
};
```

### 4.3 组件Props传递示例

```typescript
// 更新组件调用
const items = [
  <DateEventsCard 
    key="date" 
    currentPage={currentPage} 
    onPageChange={setCurrentPage} 
    totalPages={4}
    // 传递API数据
    header={{
      title: calendarData?.dateEvents?.lunarInfo?.fullDate || '',
      subtitle: calendarData?.dateEvents?.solarInfo?.fullDate || ''
    }}
    counters={[
      { label: "农", value: calendarData?.dateEvents?.lunarInfo?.fullDate || '', colorClass: "bg-blue-400" },
      { label: "公", value: calendarData?.dateEvents?.solarInfo?.fullDate || '', colorClass: "bg-purple-500" },
      { label: "藏", value: calendarData?.dateEvents?.tibetanInfo?.fullDate || '', colorClass: "bg-pink-400" }
    ]}
    events={[
      { 
        label: `${calendarData?.dateEvents?.events?.solarHoliday?.name || ''} ${calendarData?.dateEvents?.events?.solarHoliday?.date || ''}`, 
        colorClass: "bg-gray-500", 
        daysLeftText: `还剩${calendarData?.dateEvents?.events?.solarHoliday?.daysLeft || 0}天` 
      },
      { 
        label: `${calendarData?.dateEvents?.events?.lunarHoliday?.name || ''} ${calendarData?.dateEvents?.events?.lunarHoliday?.date || ''}`, 
        colorClass: "bg-gray-500", 
        daysLeftText: `还剩${calendarData?.dateEvents?.events?.lunarHoliday?.daysLeft || 0}天` 
      },
      { 
        label: `${calendarData?.dateEvents?.events?.tibetanHoliday?.name || ''} ${calendarData?.dateEvents?.events?.tibetanHoliday?.date || ''}`, 
        colorClass: "bg-gray-500", 
        daysLeftText: `还剩${calendarData?.dateEvents?.events?.tibetanHoliday?.daysLeft || 0}天` 
      }
    ]}
  />,
  <AstrologicalTableCard 
    key="astro" 
    currentPage={currentPage} 
    onPageChange={setCurrentPage} 
    totalPages={4}
    header={{
      title: calendarData?.astrologicalTable?.tibetanDate || '',
      subtitle: "Astrological Data"
    }}
    rows={calendarData?.astrologicalTable?.tableData || []}
  />,
  <MoonPhaseCard 
    key="moon" 
    currentPage={currentPage} 
    onPageChange={setCurrentPage} 
    totalPages={4}
    header={{
      title: calendarData?.moonPhase?.lunarDate || '',
      subtitle: "Moon Phase"
    }}
    timeLabel={calendarData?.moonPhase?.observationTime || ''}
    culminationText={`中天 ${calendarData?.moonPhase?.culminationTime || ''}`}
    moonRise={calendarData?.moonPhase?.moonriseTime || ''}
    moonSet={calendarData?.moonPhase?.moonsetTime || ''}
  />,
  <PlanetaryChartCard 
    key="planet" 
    currentPage={currentPage} 
    onPageChange={setCurrentPage} 
    totalPages={4}
    label={calendarData?.planetaryChart?.constellation || ''}
    leftTime={calendarData?.planetaryChart?.riseTime || ''}
    rightTime={calendarData?.planetaryChart?.setTime || ''}
  />
];
```

### 4.4 开发注意事项

1. **错误处理**：始终处理API调用可能的错误情况
2. **加载状态**：在数据加载时显示加载指示器
3. **默认值**：为所有API数据提供合理的默认值
4. **类型安全**：使用TypeScript定义API响应类型
5. **缓存策略**：考虑对相同参数的数据进行缓存

### 4.5 TypeScript类型定义

```typescript
// API响应类型定义
interface CalendarApiResponse {
  success: boolean;
  data?: {
    selectedDate: string;
    selectedCity: string;
    location: {
      latitude: number;
      longitude: number;
      altitude: number;
    };
    dateEvents: {
      lunarInfo: { fullDate: string };
      solarInfo: { fullDate: string };
      tibetanInfo: { fullDate: string };
      events: {
        solarHoliday: { name: string; date: string; daysLeft: number };
        lunarHoliday: { name: string; date: string; daysLeft: number };
        tibetanHoliday: { name: string; date: string; daysLeft: number };
      };
    };
    astrologicalTable: {
      tibetanDate: string;
      tableData: Array<{
        fixedWeekday: number;
        solarLunar: number;
        fixedDay: number;
        conjunction: number;
        effect: string;
      }>;
    };
    moonPhase: {
      lunarDate: string;
      observationTime: string;
      illumination: number;
      culminationTime: string;
      moonriseTime: string;
      moonsetTime: string;
      phaseName: string;
      phaseAngle: number;
    };
    planetaryChart: {
      solarDate: string;
      constellation: string;
      riseTime: string;
      setTime: string;
      transitTime: string;
      zodiacPosition: {
        sign: string;
        degree: number;
        minute: number;
      };
    };
  };
  error?: {
    code: string;
    message: string;
    details: string;
  };
}

