export const SUPPORTED_CITIES = [
  "上海市",
  "北京市",
  "广州市",
  "深圳市",
  "杭州市",
  "南京市",
  "成都市",
  "武汉市",
  "西安市",
  "重庆市",
  "天津市",
  "苏州市",
  "拉萨市",
] as const;

export type SupportedCity = (typeof SUPPORTED_CITIES)[number];
