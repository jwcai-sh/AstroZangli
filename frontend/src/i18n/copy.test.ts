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
