import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { appText, hasTibetanCopy } from "./copy";

test("appText keeps Chinese copy in Chinese mode and translates core Tibetan navigation", () => {
  assert.equal(appText("zh", "五要素"), "五要素");
  assert.equal(appText("bo", "五要素"), "འབྱུང་བ་ལྔ།");
  assert.equal(appText("bo", "返回语言选择"), "སྐད་ཡིག་འདེམས་སར་ལོག");
});

test("calendar card labels and status copy have Tibetan translations", () => {
  const visibleCalendarCopy = [
    "农",
    "公",
    "藏",
    "今天",
    "还剩3天",
    "日期暂不可用",
    "Moon Phase",
    "Astrological Data",
    "中天",
    "现代天文",
    "藏历节日",
  ];

  for (const copy of visibleCalendarCopy) {
    assert.notEqual(appText("bo", copy), copy, `Calendar text is still untranslated: ${copy}`);
  }
});

test("date conversion and query controls translate direct-rendered labels", () => {
  const visibleControls = [
    "换算",
    "换算中…",
    "开始查询",
    "正在查询…",
    "已换算",
    "拉萨市",
    "上海市",
  ];

  for (const copy of visibleControls) {
    assert.notEqual(appText("bo", copy), copy, `Control text is still untranslated: ${copy}`);
  }
});

test("zodiac visualization labels are available in Tibetan", () => {
  const visualizationCopy = [
    "太阳系黄道十二宫",
    "选择日期：",
    "观测日期",
    "地球的黄经",
    "太阳的视黄经",
    "太阳位于",
    "春分",
    "夏至",
    "秋分",
    "冬至",
    "请选择有效的日期和时间！",
    "天秤宫",
    "白羊宫",
  ];

  for (const copy of visualizationCopy) {
    assert.doesNotMatch(appText("bo", copy), /[\u3400-\u9fff]/, `Zodiac visualization text is still untranslated: ${copy}`);
  }
});

test("embedded zodiac visualization receives localized labels from its parent route", () => {
  const route = fs.readFileSync(path.resolve("src/components/zodiac/page.tsx"), "utf8");
  const visualization = fs.readFileSync(path.resolve("public/js/十二宫图.html"), "utf8");

  assert.match(route, /labels/);
  assert.match(visualization, /URLSearchParams/);
  assert.match(visualization, /localizedLabels/);
  assert.match(visualization, /localizedLabels\.zodiac/);
  assert.match(visualization, /labelText\("observationDate"/);
});

test("seven-star trajectory and data labels have Tibetan copy", () => {
  const visualizationCopy = [
    "太阳", "月亮", "水星", "金星", "火星", "木星", "土星",
    "东", "西", "南", "北", "北天极", "南天极",
    "纬度", "经度", "日期", "时间", "查询并可视化",
    "位置", "七星数据", "行星", "升起", "中天", "落下", "赤纬角", "例如",
    "海拔", "计算中...", "开始计算", "获取数据时出错，请重试",
    "天文数据查询与可视化",
  ];

  for (const copy of visualizationCopy) {
    assert.doesNotMatch(appText("bo", copy), /[\u3400-\u9fff]|Latitude|Longitude|Altitude|Date|Time/, `Seven-star UI text is not localized: ${copy}`);
  }
});

test("embedded seven-star trajectory receives localized labels from its parent route", () => {
  const route = fs.readFileSync(path.resolve("src/components/seven-stars/page.tsx"), "utf8");
  const visualization = fs.readFileSync(path.resolve("public/js/moon.html"), "utf8");
  const dataPage = fs.readFileSync(path.resolve("src/components/seven-data/page.tsx"), "utf8");

  assert.match(route, /labels/);
  assert.match(visualization, /localizedLabels/);
  assert.match(visualization, /labelText\(key/);
  assert.match(visualization, /labelText\("northPole"/);
  assert.match(dataPage, /appText\(locale, label\)/);
  assert.match(dataPage, /\["纬度", "latitude"\]/);
  assert.match(dataPage, /appText\(locale, PLANET_DISPLAY_NAMES\[planet\] \?\? planet\)/);
  assert.match(dataPage, /latitude: "29\.647"/);
  assert.match(dataPage, /longitude: "91\.1175"/);
});

test("Tibetan location card localizes the elevation unit and uses a narrower width", () => {
  const picker = fs.readFileSync(path.resolve("src/components/earth/WorldCityPicker.tsx"), "utf8");

  assert.match(picker, /appText\(locale, "米"\)/, "Elevation unit should follow the active locale");
  assert.match(picker, /width: "min\(380px, calc\(100vw - 32px\)\)"/, "Location card should be capped at 380px while remaining responsive");
});

test("global language shortcut uses Tibetan locale on Tibetan routes", () => {
  const shortcut = fs.readFileSync(path.resolve("src/components/i18n/LanguageChooserShortcut.tsx"), "utf8");
  assert.match(shortcut, /startsWith\("\/bo\/"\)/);
});

test("Tibetan astronomy and five-element pages do not retain Chinese labels", () => {
  const visibleCopy = [
    "日月运行与历象", "天体运动", "观测星空", "原轨迹天球", "在同一时刻，看见一年的变化",
    "此地，此刻的星空", "北京时间 UTC+8", "类乌齐", "西藏 · 拉萨", "太阳年轨迹", "天体日轨迹", "月度总览", "每日查询",
    "东北", "东南", "西南", "西北", "七曜每日运动", "以统一球面总览观察不同城市的太阳、月亮与五大行星。", "球面总览", "前一时刻", "后一时刻", "每日时刻滑块", "高度角", "方位角", "当前天体",
    "交互天球：拖动转向，滚轮或双指缩放，点击天体选择", "拖动转向 · 双指缩放 · 点击选择", "恒星背景暂不可用，天体位置仍正常显示。",
    "黄道/白道", "宿环角", "全屏天球", "退出天球全屏", "沉浸视角", "黄经", "缩放",
    "地平线上", "地平线下", "数据与显示说明", "日月宿度相加 · 吉凶占卜", "太阳宿度",
    "将定日的宿弧长换算为太阳方向。定日对应太阴日结束时的太阳位置；这里呈现传统历算的黄经投影。",
    "公元2026年藏历火马年八月", "火马年 八月初三",
  ];
  for (const copy of visibleCopy) {
    assert.doesNotMatch(appText("bo", copy), /[\u3400-\u9fff]/, `Tibetan astronomy UI still contains Chinese: ${copy}`);
  }
});

test("dynamic calendar dates and countdowns do not fall back to Chinese", () => {
  const dynamicCopy = [
    "2026年10月10日 周六",
    "火马年 八月三十",
    "二零二六年 九月初一",
    "还剩3天",
  ];

  for (const copy of dynamicCopy) {
    assert.doesNotMatch(appText("bo", copy), /[\u3400-\u9fff]/, `Dynamic calendar text still contains Chinese: ${copy}`);
  }
});

test("dynamic numeric labels and holiday names translate in Tibetan", () => {
  for (const copy of ["序位 7", "数值 12", "文本结果", "世界保健日"]) {
    const translated = appText("bo", copy);
    assert.notEqual(translated, copy, `Dynamic text is still untranslated: ${copy}`);
    assert.doesNotMatch(translated, /[\u3400-\u9fff]/, `Dynamic Tibetan text retained Chinese: ${copy}`);
  }
});

test("geocentric globe, zodiac sphere, and eclipse navigation copy translate in Tibetan", () => {
  const screenshotCopy = [
    "日月食查询",
    "地心 · 七曜天球",
    "天体投影到同一天球 · 高亮轨迹为所选天体最近20日运动",
    "黄道十二宫",
    "在统一球面总览中查看黄道、十二宫分区与太阳当前位置。",
    "黄道为黄线；白道为白色虚线，倾角约 5.1°。白道轨迹用于说明倾斜关系，月交点随日期变化未在此示意图中更新。",
    "天体按视黄经、黄纬投影到同一天球，大小为示意。可切换沉浸视角与球面总览，点击天体或卡片聚焦；短弧显示所选天体最近 20 日运动。",
    "恒星背景：HYG 4.1 星表与 Stellarium 星座连线，按当日黄道坐标系显示；恒星位置为星图近似。",
    "数据来源与许可",
  ];

  for (const copy of screenshotCopy) {
    const translated = appText("bo", copy);
    assert.notEqual(translated, copy, `Screenshot text is still untranslated: ${copy}`);
    assert.doesNotMatch(translated, /[\u3400-\u9fff]/, `Tibetan screenshot text retained Chinese: ${copy}`);
  }
});

test("every static Chinese UI node routed through LocalizedText has a Tibetan translation", () => {
  const root = path.resolve("src");
  const keys = new Set<string>();
  const visitFile = (file: string): void => {
    const source = fs.readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node): void => {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sourceFile) === "LocalizedText") {
        for (const attribute of node.attributes.properties) {
          if (!ts.isJsxAttribute(attribute) || attribute.name.getText(sourceFile) !== "text" || !attribute.initializer || !ts.isJsxExpression(attribute.initializer)) continue;
          const expression = attribute.initializer.expression;
          if (expression && ts.isStringLiteral(expression)) keys.add(expression.text);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  };
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith(".tsx")) visitFile(file);
    }
  };
  walk(root);
  const missing = [...keys].filter((key) => !hasTibetanCopy(key));
  assert.deepEqual(missing, [], `Missing Tibetan UI translations:\n${missing.join("\n")}`);
});

test("literal appText calls and documentation cards have Tibetan translations", () => {
  const root = path.resolve("src");
  const keys = new Set<string>();
  const addCalls = (file: string): void => {
    const source = fs.readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === "appText" && ts.isStringLiteral(node.arguments[1])) {
        keys.add(node.arguments[1].text);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  };
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith(".tsx")) addCalls(file);
    }
  };
  walk(root);

  const docsPath = path.join(root, "app/docs/page.tsx");
  const docsSource = ts.createSourceFile(docsPath, fs.readFileSync(docsPath, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visitDocs = (node: ts.Node): void => {
    if (ts.isPropertyAssignment(node) && (node.name.getText(docsSource) === "title" || node.name.getText(docsSource) === "desc") && ts.isStringLiteral(node.initializer)) {
      keys.add(node.initializer.text);
    }
    ts.forEachChild(node, visitDocs);
  };
  visitDocs(docsSource);

  const missing = [...keys].filter((key) => !hasTibetanCopy(key));
  assert.deepEqual(missing, [], `Missing Tibetan text translations:\n${missing.join("\n")}`);
});
