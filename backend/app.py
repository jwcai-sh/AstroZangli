import os
from flask import Flask
from flask_cors import CORS
from config import config

def create_app(config_name=None):
    """应用工厂函数"""
    app = Flask(__name__)
    
    # 加载配置
    config_name = config_name or os.environ.get('FLASK_CONFIG', 'default')
    app.config.from_object(config[config_name])
    
    # 初始化CORS
    CORS(app, origins=app.config['CORS_ORIGINS'])
    
    # 注册蓝图
    from routes import api_bp
    app.register_blueprint(api_bp, url_prefix=app.config['API_PREFIX'])

    # 添加根路由用于健康检查
    @app.route('/')
    def health_check():
        return {
            "status": "ok", 
            "message": "Backend is running", 
            "routes": [str(rule) for rule in app.url_map.iter_rules()]
        }
    
    # 注册错误处理器
    register_error_handlers(app)
    
    return app

def register_error_handlers(app):
    """注册错误处理器"""
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {'error': 'Internal server error'}, 500

if __name__ == "__main__":
    app = create_app()
    app.run(host="127.0.0.1", port=5001, debug=True)

