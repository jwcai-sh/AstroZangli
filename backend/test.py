"""
测试 /calendar/date-comprehensive-data 接口
"""
import requests
import json
from collections import OrderedDict

API_URL = "http://localhost:5001/api/calendar/date-comprehensive-data"

# 测试数据
payload = {
    "date": "2025-11-01",
    "cityName": "上海市"
}

print(f"\n请求: {json.dumps(payload, ensure_ascii=False, indent=2)}\n")

try:
    response = requests.post(API_URL, json=payload, timeout=10)
    
    # 使用OrderedDict保持原始顺序
    result = json.loads(response.text, object_pairs_hook=OrderedDict)
    
    print("返回结果:")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
except requests.exceptions.ConnectionError:
    print("❌ 连接失败！请先运行: python run.py")
except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()
