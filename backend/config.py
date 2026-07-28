import os
from dotenv import load_dotenv

# 加载环境变量 - 指定 .env 文件路径
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

class Config:
    """基础配置类"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///zangli.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # CORS配置
    # 从环境变量读取，如果没有则使用默认值
    cors_origins_str = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,https://zangli.zeabur.app')
    CORS_ORIGINS = [origin.strip() for origin in cors_origins_str.split(',') if origin.strip()]
    
    # API配置
    API_PREFIX = '/api'
    
    # 藏历相关配置
    TIBETAN_CALENDAR_BASE_YEAR = 1027  # 藏历基准年
    
    # 天文计算配置
    DEFAULT_TIMEZONE = 8  # 默认时区 UTC+8
    DEFAULT_ALTITUDE = 0  # 默认海拔高度
    
    # DeepSeek API配置
    DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY')

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or 'sqlite:///zangli_dev.db'
    
    # 开发环境下，自动添加本地网络地址支持
    # 支持 localhost、127.0.0.1 和所有 192.168.x.x、10.x.x.x、172.16-31.x.x 地址
    # 从环境变量或父类获取基础 origins
    _cors_origins_str = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,https://zangli.zeabur.app')
    _base_origins = [origin.strip() for origin in _cors_origins_str.split(',') if origin.strip()]
    # 添加正则表达式匹配本地网络地址（Flask-CORS 支持正则表达式）
    CORS_ORIGINS = _base_origins + [
        r'http://localhost:\d+',
        r'http://127\.0\.0\.1:\d+',
        r'http://192\.168\.\d+\.\d+:\d+',
        r'http://10\.\d+\.\d+\.\d+:\d+',
        r'http://172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+',
    ]

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///zangli_prod.db'

class TestingConfig(Config):
    """测试环境配置"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

# 配置字典
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
