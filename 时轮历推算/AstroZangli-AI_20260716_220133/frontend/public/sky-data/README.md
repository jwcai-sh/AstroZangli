# 观测星空数据与范围

本数据用于 AstroZangli 的七星轨迹与周年视运动观测视图，下载整理于 2026-10-12。

## 恒星

- 来源：David Nash / Astronomy Nexus，HYG 4.1（GitHub 存档快照）。
- 原文件：https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv
- 许可：Creative Commons Attribution-ShareAlike 4.0 International，全文见 HYG-LICENSE.txt。
- 本次派生数据 bright-sky.json 的恒星部分按 CC BY-SA 4.0 提供。
- 选择：视星等 ≤ 6.5，并补齐所有星座连线涉及的 HIP 成员；排除太阳记录。共 8,920 颗，所有连线成员均已匹配。
- 字段顺序：HYG id、HIP id、赤经（度）、赤纬（度）、视星等、B−V 色指数、名称、赤经自行、赤纬自行（mas/yr）。原始 RA 小时已乘 15 转为度。
- 原星表历元/分点为 J2000.0。客户端按自行与 Skyfield 返回的 ICRS→当日真赤道旋转矩阵、格林尼治视恒星时变换到观测地平坐标。恒星未计周年光行差、视差和大气折射，属于教学用近似星空。

## 星座连线

- 来源：Stellarium 团队的 stellarium-skycultures / western/index.json。
- 原文件：https://github.com/Stellarium/stellarium-skycultures/blob/master/western/index.json
- 88 组西方星座连线以 HIP 编号关联恒星。数据来源声明的许可是 CC BY-SA，原始版本说明未指定版本号；完整署名与许可声明见 STELLARIUM-WESTERN-SOURCE.md。
- 本项目只提取名称、IAU 缩写和连线路径，未复制插画或 Stellarium 程序代码。中文星座名与少量亮星中文名为显示映射，未宣称为中国传统星官数据。
- 各下载文件的 URL 和 SHA-256 见 provenance.json。

## 七曜与地点

- 七曜：项目自带 DE421，Skyfield 计算观测点的视地平方位和高度；木星、土星使用系统质心。
- 日模式：北京时间每 10 分钟一帧；周年模式：一年中每日同一北京时间，虚线为太阳全年采样轨迹。日期范围 1900—2050。
- 地点：拉萨 29.6470N / 91.1175E，上海 31.2304N / 121.4737E，北京 39.9042N / 116.4074E，复用项目原有城市坐标。
- 类乌齐：县城桑多镇附近 31.21N / 96.60E，约略城市观测点，海拔取县政府公布的县城 3840m。不是类乌齐镇或类乌齐寺定位。
- 县城坐标区域参考西藏生态环境厅《类乌齐县特色产业园区污水处理设施配套项目环境影响报告书》：https://ee.xizang.gov.cn/xwzx/gsgg/202208/P020220801634666704079.pdf
- 县城海拔：https://leiwuqi.changdu.gov.cn/lwqxrmzf/c105856/202007/0672fff83c6847aebbb59d8118494934.shtml

未模拟天气、光污染、真实地形和大气折射；天体圆盘大小及月面亮度为示意。白昼显星是教学显示模式，非肉眼观测效果。手机指向需安全上下文和用户授予传感器权限，是近似罗盘视角，不含相机叠加。现代天文显示不改变时轮历核心算法或术语证据层级。
