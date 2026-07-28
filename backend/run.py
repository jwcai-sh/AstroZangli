#!/usr/bin/env python3
"""
Flask应用启动脚本
"""
import os
from app import create_app

def main():
    """主函数"""
    # 设置环境变量
    os.environ.setdefault('FLASK_CONFIG', 'development')
    
    # 创建应用
    app = create_app()
    
    # 获取配置
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', os.environ.get('FLASK_PORT', 5001)))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"🚀 启动藏历历法API服务器 (Zeabur Deployment v2)...")
    print(f"📍 地址: http://{host}:{port}")
    print(f"🔧 调试模式: {'开启' if debug else '关闭'}")
    print(f"📚 API文档: http://{host}:{port}/api/health")
    print("=" * 50)
    
    # 启动应用
    app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    main()
