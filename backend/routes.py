from flask import Blueprint, Response, jsonify, request
from datetime import datetime, timedelta
from astronomy import (
    get_planets_data,
    get_tibetan_lunar_info,
    calculate_sun_moon,
    get_lunar_text,
    calculate_five_elements,
    get_moon_phase_info,
    get_solar_planetary_chart,
    TIBETAN_CALENDAR_START,
    TIBETAN_CALENDAR_END,
)
from rag_processor_optimized import process_query_with_rag_optimized as process_query_with_rag_and_api

# 创建API蓝图
api_bp = Blueprint('api', __name__)

# 城市到经纬度的映射（可根据需要扩展）
CITY_COORDINATES = {
    '上海市': {'latitude': 31.2304, 'longitude': 121.4737, 'altitude': 4.0},
    '北京市': {'latitude': 39.9042, 'longitude': 116.4074, 'altitude': 43.5},
    '广州市': {'latitude': 23.1291, 'longitude': 113.2644, 'altitude': 21.0},
    '深圳市': {'latitude': 22.5431, 'longitude': 114.0579, 'altitude': 6.0},
    '成都市': {'latitude': 30.5728, 'longitude': 104.0668, 'altitude': 505.0},
    '杭州市': {'latitude': 30.2741, 'longitude': 120.1551, 'altitude': 8.0},
    '南京市': {'latitude': 32.0603, 'longitude': 118.7969, 'altitude': 15.0},
    '重庆市': {'latitude': 29.5630, 'longitude': 106.5516, 'altitude': 259.0},
    '武汉市': {'latitude': 30.5928, 'longitude': 114.3055, 'altitude': 23.3},
    '西安市': {'latitude': 34.2658, 'longitude': 108.9541, 'altitude': 396.9},
    '天津市': {'latitude': 39.0842, 'longitude': 117.2009, 'altitude': 3.0},
    '苏州市': {'latitude': 31.2989, 'longitude': 120.5853, 'altitude': 5.0},
    '拉萨市': {'latitude': 29.6470, 'longitude': 91.1175, 'altitude': 3658.0},
}

# 默认城市坐标（上海）
DEFAULT_CITY = '上海市'
DEFAULT_COORDINATES = CITY_COORDINATES[DEFAULT_CITY]


@api_bp.route('/health', methods=['GET'])
def health_check():
    """Lightweight health check for local and hosted deployments."""
    return jsonify({
        "status": "ok",
        "service": "astrozangli-backend",
        "supportedCities": list(CITY_COORDINATES.keys()),
        "tibetanCalendarRange": {
            "start": TIBETAN_CALENDAR_START.strftime('%Y-%m-%d'),
            "end": TIBETAN_CALENDAR_END.strftime('%Y-%m-%d'),
        },
    })

@api_bp.route('/calculate', methods=['POST'])
def calculate_sun_moon_api():
    """获取太阳和月亮升落信息"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "请求体不能为空"}), 400

        latitude = data.get('latitude')
        longitude = data.get('longitude')
        date_str = data.get('date')
        time_str = data.get('time', '00:00')

        if latitude is None or longitude is None or not date_str:
            return jsonify({"error": "缺少必需参数: latitude, longitude, date"}), 400

        latitude = float(latitude)
        longitude = float(longitude)

        year, month, day = map(int, date_str.split('-'))
        hour, minute = map(int, time_str.split(':'))

        # 调用函数
        result = calculate_sun_moon(year, month, day, hour, minute, longitude, latitude)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"服务器内部错误: {str(e)}"}), 500


@api_bp.route('/planets', methods=['POST'])
def get_planets_api():
    """获取行星升落信息"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": {"code": "EMPTY_REQUEST", "message": "请求体不能为空"}
            }), 400
        
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        date_str = data.get('date')
        time_str = data.get('time', '00:00')

        if latitude is None or longitude is None or not date_str:
            return jsonify({
                "success": False,
                "error": {"code": "MISSING_PARAMS", "message": "缺少必需参数 latitude, longitude, date"}
            }), 400
        
        latitude = float(latitude)
        longitude = float(longitude)
        year, month, day = map(int, date_str.split('-'))
        hour, minute = map(int, time_str.split(':'))

        result = get_planets_data(year, month, day, hour, minute, longitude, latitude)

        return jsonify({
            "success": True,
            "data": result
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": {
                "code": "SERVER_ERROR",
                "message": "服务器内部错误",
                "details": str(e)
            }
        }), 500


@api_bp.route('/annual-motion-view', methods=['GET'])
def annual_motion_view():
    try:
        from annual_motion import render_annual_motion_html

        latitude = float(request.args.get('lat', '31.2304'))
        longitude = float(request.args.get('lon', '121.4737'))
        tz_name = request.args.get('tz', 'Asia/Shanghai')
        city_name = request.args.get('city', 'Shanghai')
        year = int(request.args.get('year', datetime.now().year))
        sample_hour = int(request.args.get('hour', '12'))

        html = render_annual_motion_html(
            latitude=latitude,
            longitude=longitude,
            tz_name=tz_name,
            city_label=city_name,
            year=year,
            sample_hour=sample_hour,
        )
        return Response(html, mimetype='text/html')
    except Exception as e:
        return Response(
            (
                "<html><body style='background:#000;color:#ff6b6b;font-family:sans-serif;padding:24px'>"
                "<h3>周年视运动加载失败</h3>"
                f"<pre>{str(e)}</pre></body></html>"
            ),
            mimetype='text/html',
            status=500,
        )

@api_bp.route('/chat', methods=['POST'])
def chat_with_rag():
    """
    处理聊天请求，结合RAG和API调用生成回复
    """
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({
                "success": False,
                "error": {"code": "INVALID_REQUEST", "message": "请求体必须包含'message'字段"}
            }), 400

        user_message = data['message']
        
        # 调用处理函数
        response = process_query_with_rag_and_api(user_message)
        
        return jsonify({
            "success": True,
            "data": {
                "reply": response
            }
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": {
                "code": "SERVER_ERROR",
                "message": "服务器内部错误",
                "details": str(e)
            }
        }), 500



@api_bp.route('/calendar/date-comprehensive-data', methods=['POST'])
def get_calendar_comprehensive_data():
    """
    获取日历综合数据接口
    返回指定日期和城市的所有组件数据：日期事件、占星表格、月相、行星图表
    """
    # Force redeploy comment
    try:
        data = request.get_json() or {}
        
        # 获取参数，使用默认值
        date_str = data.get('date')
        city_name = data.get('cityName', DEFAULT_CITY)
        
        # 如果没有传入日期，使用当前日期（北京时间）
        if not date_str:
            beijing_time = datetime.utcnow() + timedelta(hours=8)
            date_str = beijing_time.strftime('%Y-%m-%d')
        
        # 验证日期格式
        try:
            year, month, day = map(int, date_str.split('-'))
            selected_datetime = datetime(year, month, day)
        except (ValueError, AttributeError):
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_DATE_FORMAT",
                    "message": "日期格式错误",
                    "details": "日期格式必须为YYYY-MM-DD"
                }
            }), 400
        
        # 藏历表驱动数据具有明确的有效边界，范围外拒绝返回伪零值。
        if selected_datetime < TIBETAN_CALENDAR_START or selected_datetime > TIBETAN_CALENDAR_END:
            return jsonify({
                "success": False,
                "error": {
                    "code": "TIBETAN_DATE_OUT_OF_RANGE",
                    "message": "日期超出当前藏历数据范围",
                    "details": (
                        f"请使用{TIBETAN_CALENDAR_START:%Y-%m-%d}至"
                        f"{TIBETAN_CALENDAR_END:%Y-%m-%d}之间的日期"
                    )
                }
            }), 400
        
        # 获取城市坐标
        if city_name not in CITY_COORDINATES:
            return jsonify({
                "success": False,
                "error": {
                    "code": "UNSUPPORTED_CITY",
                    "message": f"暂不支持城市：{city_name}",
                    "details": f"可用城市：{', '.join(CITY_COORDINATES.keys())}",
                }
            }), 400

        location = CITY_COORDINATES[city_name]
        selected_city = city_name
        
        latitude = location['latitude']
        longitude = location['longitude']
        altitude = location['altitude']
        
        # 1. 获取日期事件数据 (DateEventsCard)
        # 农历信息
        try:
            lunar_text = get_lunar_text(selected_datetime)
        except Exception as e:
            import logging
            logging.warning(f"get_lunar_text failed for {date_str}: {e}")
            lunar_text = ""

        # 公历信息
        weekday_map = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        weekday = weekday_map[selected_datetime.weekday()]
        solar_text = f"{year}年{month}月{day}日 {weekday}"

        # 藏历信息
        try:
            tibetan_info = get_tibetan_lunar_info(selected_datetime)
            tibetan_text = tibetan_info.get('zangli_date', '') if isinstance(tibetan_info, dict) and tibetan_info.get('value') != 'error' else ''
        except Exception as e:
            import logging
            logging.warning(f"get_tibetan_lunar_info failed for {date_str}: {e}")
            tibetan_text = ""
        
        date_events = {
            "lunarInfo": {
                "fullDate": lunar_text
            },
            "solarInfo": {
                "fullDate": solar_text
            },
            "tibetanInfo": {
                "fullDate": tibetan_text
            }
        }
        
        # 2. 获取占星表格数据 (AstrologicalTableCard)
        # 调用五要素计算函数
        try:
            five_elements = calculate_five_elements(year, month, day)
        except Exception as e:
            import logging
            logging.error(f"calculate_five_elements failed for {date_str}: {e}")
            # 返回默认值，避免整个接口崩溃
            five_elements = {
                '定曜': [0, 0, 0, 0, 0, 0],
                '太阳日月宿': [0, 0, 0, 0, 0, 0],
                '定日': [0, 0, 0, 0, 0],
                '会合': [0, 0, 0, 0, 0, 0],
                '作用': ['', '']
            }
        
        # 提取数据并构建表格
        # 定曜 (fixedWeekday)
        ding_yao = five_elements.get('定曜', [0, 0, 0, 0, 0, 0])
        # 太阳日月宿 (solarLunar)
        taiyang_riyuexiu = five_elements.get('太阳日月宿', [0, 0, 0, 0, 0, 0])
        # 定日 (fixedDay)
        ding_sun = five_elements.get('定日', [0, 0, 0, 0, 0])
        # 会合 (conjunction)
        huihe = five_elements.get('会合', [0, 0, 0, 0, 0, 0])
        # 作用 (effect)
        zuoyong = five_elements.get('作用', ['', ''])
        
        # 构建六行数据（根据API文档示例）
        table_data = [
            {
                "fixedWeekday": ding_yao[0] if len(ding_yao) > 0 else 0,
                "solarLunar": taiyang_riyuexiu[0] if len(taiyang_riyuexiu) > 0 else 0,
                "fixedDay": ding_sun[0] if len(ding_sun) > 0 else 0,
                "conjunction": huihe[0] if len(huihe) > 0 else 0,
                "effect": zuoyong[0] if len(zuoyong) > 0 else ""
            },
            {
                "fixedWeekday": ding_yao[1] if len(ding_yao) > 1 else 0,
                "solarLunar": taiyang_riyuexiu[1] if len(taiyang_riyuexiu) > 1 else 0,
                "fixedDay": ding_sun[1] if len(ding_sun) > 1 else 0,
                "conjunction": huihe[1] if len(huihe) > 1 else 0,
                "effect": zuoyong[1] if len(zuoyong) > 1 else ""
            },
            {
                "fixedWeekday": ding_yao[2] if len(ding_yao) > 2 else 0,
                "solarLunar": taiyang_riyuexiu[2] if len(taiyang_riyuexiu) > 2 else 0,
                "fixedDay": ding_sun[2] if len(ding_sun) > 2 else 0,
                "conjunction": huihe[2] if len(huihe) > 2 else 0,
                "effect": ""
            },
            {
                "fixedWeekday": ding_yao[3] if len(ding_yao) > 3 else 0,
                "solarLunar": taiyang_riyuexiu[3] if len(taiyang_riyuexiu) > 3 else 0,
                "fixedDay": ding_sun[3] if len(ding_sun) > 3 else 0,
                "conjunction": huihe[3] if len(huihe) > 3 else 0,
                "effect": ""
            },
            {
                "fixedWeekday": ding_yao[4] if len(ding_yao) > 4 else 0,
                "solarLunar": taiyang_riyuexiu[4] if len(taiyang_riyuexiu) > 4 else 0,
                "fixedDay": ding_sun[4] if len(ding_sun) > 4 else 0,
                "conjunction": huihe[4] if len(huihe) > 4 else 0,
                "effect": ""
            },
            {
                "fixedWeekday": ding_yao[5] if len(ding_yao) > 5 else 0,
                "solarLunar": taiyang_riyuexiu[5] if len(taiyang_riyuexiu) > 5 else 0,
                "fixedDay": "",  # ding_sun只有5个元素
                "conjunction": huihe[5] if len(huihe) > 5 else 0,
                "effect": ""
            }
        ]
        
        astrological_table = {
            "tibetanDate": tibetan_text,
            "tableData": table_data
        }
        
        # 3. 获取月相数据 (MoonPhaseCard)
        try:
            moon_phase = get_moon_phase_info(date_str, latitude, longitude)
        except Exception as e:
            import logging
            logging.error(f"get_moon_phase_info failed for {date_str}: {e}")
            # 返回默认值
            moon_phase = {
                "lunarDate": "",
                "lunar_day": 0,
                "observationTime": "00:00",
                "illumination": 0,
                "culminationTime": "00:00",
                "moonriseTime": "00:00",
                "moonsetTime": "00:00",
                "phaseName": "未知",
                "phaseAngle": 0
            }

        # 4. 获取行星图表数据 (PlanetaryChartCard)
        try:
            planetary_chart = get_solar_planetary_chart(date_str, latitude, longitude)
        except Exception as e:
            import logging
            logging.error(f"get_solar_planetary_chart failed for {date_str}: {e}")
            # 返回默认值
            planetary_chart = {
                "solarDate": f"{year}年{month}月{day}日",
                "constellation": "未知",
                "riseTime": "00:00",
                "setTime": "00:00",
                "transitTime": "00:00",
                "zodiacPosition": {
                    "sign": "未知",
                    "degree": 0,
                    "minute": 0
                }
            }
        
        # 构建完整响应
        response_data = {
            "success": True,
            "data": {
                "selectedDate": date_str,
                "selectedCity": selected_city,
                "location": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "altitude": altitude
                },
                "dateEvents": date_events,
                "astrologicalTable": astrological_table,
                "moonPhase": moon_phase,
                "planetaryChart": planetary_chart
            }
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        # 服务器内部错误 - 添加详细日志
        import logging
        import traceback
        logging.error(f"API Error in /calendar/date-comprehensive-data: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            "success": False,
            "error": {
                "code": "SERVER_ERROR",
                "message": "服务器内部错误",
                "details": str(e)
            }
        }), 500
