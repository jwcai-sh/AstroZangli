# -*- coding: utf-8 -*-
"""
rag_processor_optimized.py
RAG + DeepSeek API 实现版（全面优化版本）
包含语言检测、智能分割、多级错误处理、检索优化等功能
"""

import json
import os
import re
import logging
import time
import requests
import jieba
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

# 从配置文件读取 API 密钥
from config import Config

# ========== 配置常量 ==========
DEEPSEEK_API_KEY = Config.DEEPSEEK_API_KEY or os.environ.get('DEEPSEEK_API_KEY')
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

# ========== 日志配置 ==========
log_handlers = [logging.StreamHandler()]
rag_log_file = os.environ.get("RAG_LOG_FILE")
if rag_log_file:
    log_handlers.insert(0, logging.FileHandler(rag_log_file, encoding="utf-8"))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=log_handlers,
)
logger = logging.getLogger(__name__)

# ========== 错误代码体系 ==========
class ErrorCodes:
    # 文件相关错误
    FILE_NOT_FOUND = "KB001"
    FILE_READ_PERMISSION = "KB002"
    FILE_JSON_PARSE = "KB003"
    FILE_ENCODING = "KB004"
    
    # 处理相关错误
    LANGUAGE_DETECTION = "PR001"
    SEGMENTATION = "PR002"
    RETRIEVAL = "PR003"
    
    # API相关错误
    API_KEY_MISSING = "API001"
    API_REQUEST = "API002"
    API_RESPONSE = "API003"
    API_TIMEOUT = "API004"

# ========== 停用词表（多层级） ==========
GENERAL_STOPWORDS = {"什么", "是", "的", "如何", "怎么", "请问", "有哪些", "介绍", "一下", 
                    "这个", "那个", "哪些", "什么", "为什么", "怎么样"}

DOMAIN_STOPWORDS = {"藏历", "农历", "计算", "方法", "系统", "内容", "资料", "信息", "问题"}

STOPWORDS = GENERAL_STOPWORDS | DOMAIN_STOPWORDS

# ========== 同义词词典（藏历领域专用） ==========
SYNONYM_DICT = {
    "藏历": ["藏族历法", "西藏历法", "藏历法"],
    "农历": ["阴历", "中国传统历法", "夏历"],
    "五行": ["金木水火土", "五行元素", "五行系统"],
    "生肖": ["属相", "十二生肖", "生肖属相"],
    "计算": ["推算", "演算", "运算"],
    "日期": ["日子", "时日", "日历"],
    "天干": ["十天干", "天干地支"],
    "地支": ["十二地支", "地支生肖"]
}

# ========== 语言检测配置 ==========
CHINESE_CHAR_RATIO_THRESHOLD = 0.3  # 中文字符比例阈值
MIN_TEXT_LENGTH_FOR_DETECTION = 10   # 最小检测文本长度

# ========== 分割配置 ==========
SEGMENTATION_CONFIG = {
    'min_chunk_length': 50,      # 最小分割长度
    'max_chunk_length': 500,     # 最大分割长度
    'overlap_size': 20,          # 分割重叠大小
    'language_weights': {        # 语言权重配置
        'chinese': 1.0,
        'english': 0.3,
        'other': 0.1
    }
}

# ========== 检索配置 ==========
RETRIEVAL_CONFIG = {
    'top_k': 3,                  # 返回结果数量
    'min_similarity_score': 0.3, # 最小相似度分数
    'keyword_weight': 0.6,       # 关键词权重
    'semantic_weight': 0.4,       # 语义权重
    'synonym_boost': 0.2         # 同义词提升
}

# ==========================================================
#                 语言检测与智能分割
# ==========================================================

def detect_language(text: str) -> str:
    """
    检测文本语言（简化版，避免外部依赖）
    """
    if not text or len(text) < MIN_TEXT_LENGTH_FOR_DETECTION:
        return "other"
    
    # 统计中文字符比例
    chinese_chars = sum(1 for char in text if '\u4e00' <= char <= '\u9fff')
    chinese_ratio = chinese_chars / len(text)
    
    # 检测英文内容
    english_words = len(re.findall(r'\b[a-zA-Z]{3,}\b', text))
    english_ratio = english_words / (len(text.split()) or 1)
    
    if chinese_ratio >= CHINESE_CHAR_RATIO_THRESHOLD:
        return "chinese"
    elif english_ratio >= 0.3:
        return "english"
    else:
        return "other"

def intelligent_segmentation(knowledge_base: List[Dict]) -> Dict[str, List[Dict]]:
    """
    智能知识库分割，按语言分类
    """
    segmented_kb = {
        'chinese': [],
        'english': [],
        'other': [],
        'mixed': []
    }
    
    for item in knowledge_base:
        if 'content' not in item or not isinstance(item['content'], str):
            continue
            
        content = item['content'].strip()
        if not content:
            continue
            
        language = detect_language(content)
        
        # 添加语言标签
        item_with_lang = item.copy()
        item_with_lang['language'] = language
        item_with_lang['content_length'] = len(content)
        
        segmented_kb[language].append(item_with_lang)
    
    logger.info(f"知识库分割完成: 中文{len(segmented_kb['chinese'])}条, "
               f"英文{len(segmented_kb['english'])}条, 其他{len(segmented_kb['other'])}条")
    
    return segmented_kb

# ==========================================================
#                 多级错误处理系统
# ==========================================================

def log_error(error_code: str, error_message: str, 
              details: Optional[Dict] = None, severity: str = "ERROR"):
    """
    结构化错误日志记录
    """
    error_data = {
        'timestamp': datetime.now().isoformat(),
        'error_code': error_code,
        'error_message': error_message,
        'severity': severity,
        'details': details or {},
        'module': __name__
    }
    
    if severity == "ERROR":
        logger.error(json.dumps(error_data, ensure_ascii=False))
    elif severity == "WARNING":
        logger.warning(json.dumps(error_data, ensure_ascii=False))
    else:
        logger.info(json.dumps(error_data, ensure_ascii=False))

def handle_knowledge_base_error(error_type: str, filepath: str, error: Exception) -> List[Dict]:
    """
    处理知识库加载错误
    """
    error_handlers = {
        'file_not_found': {
            'code': ErrorCodes.FILE_NOT_FOUND,
            'message': f"找不到知识库文件: {filepath}",
            'severity': 'ERROR'
        },
        'json_parse': {
            'code': ErrorCodes.FILE_JSON_PARSE,
            'message': f"解析JSON文件失败: {filepath}",
            'severity': 'ERROR'
        },
        'permission': {
            'code': ErrorCodes.FILE_READ_PERMISSION,
            'message': f"文件读取权限不足: {filepath}",
            'severity': 'ERROR'
        },
        'encoding': {
            'code': ErrorCodes.FILE_ENCODING,
            'message': f"文件编码错误: {filepath}",
            'severity': 'WARNING'
        }
    }
    
    if error_type in error_handlers:
        handler = error_handlers[error_type]
        log_error(
            handler['code'],
            handler['message'],
            {'filepath': filepath, 'error_details': str(error)},
            handler['severity']
        )
    
    return []

def resolve_knowledge_base_path(filepath: Optional[str]) -> Tuple[str, List[str]]:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = []
    env_path = os.environ.get('KNOWLEDGE_BASE_PATH')
    if env_path:
        candidates.append(env_path)
        candidates.append(os.path.join(base_dir, env_path))
    if filepath:
        candidates.append(filepath)
        candidates.append(os.path.join(base_dir, filepath))
    project_root = os.path.abspath(os.path.join(base_dir, '..'))
    candidates.append(os.path.join(project_root, 'frontend', 'public', 'rag', 'knowledge_base.json'))
    candidates.append(os.path.join(project_root, 'public', 'rag', 'knowledge_base.json'))
    candidates.append(os.path.join(base_dir, 'knowledge_base.json'))

    normalized = []
    for path in candidates:
        if not path:
            continue
        abs_path = os.path.abspath(os.path.expanduser(path))
        if abs_path not in normalized:
            normalized.append(abs_path)

    for path in normalized:
        if os.path.exists(path):
            return path, normalized

    fallback = normalized[0] if normalized else os.path.abspath(os.path.join(base_dir, filepath or ""))
    return fallback, normalized

def read_json_with_fallback(file_path: str) -> Tuple[Any, str]:
    encodings = ["utf-8", "utf-8-sig", "gb18030"]
    last_unicode_error = None
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                return json.load(f), encoding
        except UnicodeDecodeError as e:
            last_unicode_error = e
            continue
    if last_unicode_error:
        raise last_unicode_error
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f), "utf-8"

# ==========================================================
#                 知识库加载与处理
# ==========================================================

def load_knowledge_base(filepath: str = '../frontend/public/rag/knowledge_base.json') -> List[Dict]:
    """
    增强版知识库加载，包含多级错误处理
    """
    try:
        logger.info(f"开始加载知识库: filepath={filepath}")
        full_path, candidates = resolve_knowledge_base_path(filepath)
        logger.info(f"知识库路径解析结果: {full_path}")
        logger.info(f"知识库路径候选: {candidates}")
        
        # 检查文件存在性
        if not os.path.exists(full_path):
            log_error(
                ErrorCodes.FILE_NOT_FOUND,
                "找不到知识库文件",
                {'resolved_path': full_path, 'candidates': candidates}
            )
            return []

        if not os.path.isfile(full_path):
            log_error(
                "KB007",
                "知识库路径不是文件",
                {'resolved_path': full_path}
            )
            return []
        
        # 检查文件可读性
        if not os.access(full_path, os.R_OK):
            return handle_knowledge_base_error('permission', full_path, PermissionError())

        file_size = os.path.getsize(full_path)
        if file_size == 0:
            log_error("KB005", "知识库文件为空", {'filepath': full_path}, "WARNING")
            return []
        
        # 读取文件内容
        knowledge_base, encoding_used = read_json_with_fallback(full_path)
        
        if not isinstance(knowledge_base, list):
            log_error(
                "KB008",
                "知识库格式错误，期望列表",
                {'filepath': full_path, 'actual_type': type(knowledge_base).__name__}
            )
            return []

        if not knowledge_base:
            log_error("KB005", "知识库文件为空", {'filepath': full_path}, "WARNING")
            return []
        
        logger.info(f"成功加载知识库，共 {len(knowledge_base)} 条内容，编码 {encoding_used}，大小 {file_size} bytes")
        return knowledge_base
        
    except FileNotFoundError as e:
        return handle_knowledge_base_error('file_not_found', full_path, e)
    except json.JSONDecodeError as e:
        log_error(
            ErrorCodes.FILE_JSON_PARSE,
            f"解析JSON文件失败: {full_path}",
            {'filepath': full_path, 'error_details': str(e)}
        )
        return []
    except UnicodeDecodeError as e:
        return handle_knowledge_base_error('encoding', full_path, e)
    except Exception as e:
        log_error("KB006", f"未知错误加载知识库: {str(e)}", {'filepath': full_path})
        return []

def preprocess_knowledge_base(knowledge_base: List[Dict]) -> Dict[str, List[Dict]]:
    """
    知识库预处理：语言检测、智能分割、质量评估
    """
    start_time = time.time()
    
    # 智能分割
    segmented_kb = intelligent_segmentation(knowledge_base)
    
    # 质量评估
    total_items = sum(len(items) for items in segmented_kb.values())
    chinese_items = len(segmented_kb['chinese'])
    
    logger.info(f"知识库预处理完成: 总共{total_items}条, "
               f"中文内容{chinese_items}条, "
               f"耗时{time.time() - start_time:.2f}秒")
    
    return segmented_kb

# ==========================================================
#                 检索算法优化
# ==========================================================

def expand_synonyms(keywords: List[str]) -> List[str]:
    """
    同义词扩展
    """
    expanded_keywords = set(keywords)
    
    for keyword in keywords:
        if keyword in SYNONYM_DICT:
            expanded_keywords.update(SYNONYM_DICT[keyword])
    
    return list(expanded_keywords)

def calculate_semantic_similarity(text1: str, text2: str) -> float:
    """
    计算文本语义相似度（简化版）
    """
    # 使用Jaccard相似度作为基础
    words1 = set(jieba.lcut(text1))
    words2 = set(jieba.lcut(text2))
    
    if not words1 or not words2:
        return 0.0
    
    intersection = words1 & words2
    union = words1 | words2
    
    return len(intersection) / len(union) if union else 0.0

def retrieve_relevant_chunks_optimized(query: str, knowledge_base: List[Dict], top_k: int = 3) -> List[Dict]:
    """
    优化版检索：关键词 + 语义相似度混合检索
    """
    logger.info(f"开始优化检索: 查询='{query}'")
    
    # 分词和停用词过滤
    words = jieba.lcut(query)
    keywords = [w for w in words if len(w.strip()) > 1 and w not in STOPWORDS]
    
    if not keywords:
        keywords = [query]
    
    # 同义词扩展
    expanded_keywords = expand_synonyms(keywords)
    logger.info(f"关键词扩展: {keywords} -> {expanded_keywords}")
    
    relevant_chunks = []
    
    for chunk in knowledge_base:
        if 'content' not in chunk or not isinstance(chunk['content'], str):
            continue
            
        content = chunk['content']
        
        # 关键词匹配得分
        keyword_score = sum(
            content.count(keyword) * RETRIEVAL_CONFIG['keyword_weight'] 
            for keyword in expanded_keywords
        )
        
        # 语义相似度得分
        semantic_score = calculate_semantic_similarity(query, content) * RETRIEVAL_CONFIG['semantic_weight']
        
        # 总得分
        total_score = keyword_score + semantic_score
        
        if total_score >= RETRIEVAL_CONFIG['min_similarity_score']:
            chunk_with_score = chunk.copy()
            chunk_with_score['score'] = total_score
            chunk_with_score['keyword_score'] = keyword_score
            chunk_with_score['semantic_score'] = semantic_score
            relevant_chunks.append(chunk_with_score)
    
    # 按得分排序
    relevant_chunks.sort(key=lambda x: x.get('score', 0), reverse=True)
    
    # 去重并取前top_k
    unique_chunks = {}
    for chunk in relevant_chunks:
        content = chunk['content']
        if content not in unique_chunks or chunk['score'] > unique_chunks[content]['score']:
            unique_chunks[content] = chunk
    
    result = list(unique_chunks.values())[:top_k]
    
    logger.info(f"检索完成: 找到{len(result)}条相关内容")
    return result

# ==========================================================
#                 RAG提示词构建
# ==========================================================

def generate_rag_prompt_optimized(query: str, relevant_chunks: List[Dict]) -> str:
    """
    优化版RAG提示词构建
    """
    if not relevant_chunks:
        logger.warning("未找到相关上下文，将直接回答问题")
        return f"""请直接回答用户问题。如果信息不足，给出一般性说明并标注“以下为一般性说明”，不要回答“无法回答”。

问题: {query}"""
    
    # 构建上下文，包含来源信息
    context_parts = []
    for i, chunk in enumerate(relevant_chunks, 1):
        source = chunk.get('source', '未知来源')
        content = chunk['content']
        context_parts.append(f"[{i}] 来源: {source}\n{content}")
    
    context = "\n\n---\n\n".join(context_parts)
    
    prompt = f"""你将优先根据以下上下文回答问题；若上下文不足，请给出一般性说明并标注“以下为一般性说明”，不要回答“无法回答”。

上下文:
{context}

问题: {query}

请确保回答:
1. 优先基于提供的上下文内容
2. 准确、简洁、专业
3. 若上下文不足，给出一般性说明并标注"""
    
    return prompt

# ==========================================================
#                 DeepSeek API调用优化
# ==========================================================

def get_deepseek_answer_optimized(prompt: str, max_retries: int = 3) -> str:
    """
    优化版DeepSeek API调用，包含重试机制
    """
    if not DEEPSEEK_API_KEY:
        log_error(ErrorCodes.API_KEY_MISSING, "DeepSeek API密钥未配置")
        return "错误：DeepSeek API 密钥未配置，请联系管理员。"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
    }

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "你是一个知识渊博的AI天文藏历助手，请根据用户提供的内容准确回答问题。"},
            {"role": "user", "content": prompt}
        ],
        "stream": False,
        "temperature": 0.3,
        "max_tokens": 2000
    }

    for attempt in range(max_retries):
        try:
            logger.info(f"调用DeepSeek API (尝试 {attempt + 1}/{max_retries})...")
            
            response = requests.post(
                DEEPSEEK_API_URL, 
                headers=headers, 
                json=payload, 
                timeout=30,
                proxies={"http": None, "https": None}
            )
            
            response.raise_for_status()
            result = response.json()
            
            answer = result['choices'][0]['message']['content']
            logger.info("API调用成功")
            return answer
            
        except requests.exceptions.Timeout:
            log_error(ErrorCodes.API_TIMEOUT, f"API请求超时 (尝试 {attempt + 1})", severity="WARNING")
            if attempt == max_retries - 1:
                return "错误：API请求超时，请稍后重试。"
            
        except requests.exceptions.RequestException as e:
            log_error(ErrorCodes.API_REQUEST, f"API请求错误: {str(e)} (尝试 {attempt + 1})")
            if attempt == max_retries - 1:
                return "错误：API请求失败，请检查网络连接。"
            
        except (KeyError, IndexError) as e:
            log_error(ErrorCodes.API_RESPONSE, f"解析API响应错误: {str(e)}")
            if attempt == max_retries - 1:
                return "错误：处理API响应时发生错误。"
        
        # 指数退避重试
        time.sleep(2 ** attempt)
    
    return "错误：API调用失败，请稍后重试。"

# ==========================================================
#                 完整优化工作流程
# ==========================================================

# 知识库缓存
_knowledge_base_cache = None
_cache_timestamp = None
CACHE_DURATION = 3600  # 1小时缓存

def get_cached_knowledge_base(filepath: str) -> Optional[Dict[str, List[Dict]]]:
    """
    获取缓存的知识库
    """
    global _knowledge_base_cache, _cache_timestamp
    
    if (_knowledge_base_cache is not None and 
        _cache_timestamp is not None and 
        time.time() - _cache_timestamp < CACHE_DURATION):
        logger.info("使用缓存的知识库")
        return _knowledge_base_cache
    
    return None

def process_query_with_rag_optimized(query: str, 
                                   knowledge_base_path: str = '../frontend/public/rag/knowledge_base.json') -> str:
    """
    优化版RAG + API完整流程
    """
    start_time = time.time()
    
    try:
        # 检查缓存
        cached_kb = get_cached_knowledge_base(knowledge_base_path)
        
        if cached_kb is None:
            # 加载并预处理知识库
            raw_kb = load_knowledge_base(knowledge_base_path)
            if not raw_kb:
                log_error(
                    "KB005",
                    "知识库为空或加载失败，将直接走无上下文回答",
                    {'query': query, 'filepath': knowledge_base_path},
                    "WARNING"
                )
                fallback_prompt = f"""请直接回答用户问题。如果信息不足，给出一般性说明并标注“以下为一般性说明”，不要回答“无法回答”。

问题: {query}"""
                return get_deepseek_answer_optimized(fallback_prompt)
            
            # 预处理知识库
            processed_kb = preprocess_knowledge_base(raw_kb)
            
            # 更新缓存
            global _knowledge_base_cache, _cache_timestamp
            _knowledge_base_cache = processed_kb
            _cache_timestamp = time.time()
        else:
            processed_kb = cached_kb
        
        # 主要使用中文内容
        chinese_kb = processed_kb.get('chinese', [])
        if not chinese_kb:
            logger.warning("中文知识库为空，使用所有内容")
            all_content = []
            for lang_items in processed_kb.values():
                all_content.extend(lang_items)
            chinese_kb = all_content
        
        # 检索相关片段
        relevant_chunks = retrieve_relevant_chunks_optimized(query, chinese_kb, RETRIEVAL_CONFIG['top_k'])
        
        # 构建提示词
        rag_prompt = generate_rag_prompt_optimized(query, relevant_chunks)
        
        # 调用API
        final_answer = get_deepseek_answer_optimized(rag_prompt)
        
        total_time = time.time() - start_time
        logger.info(f"查询处理完成: 耗时{total_time:.2f}秒")
        
        return final_answer
        
    except Exception as e:
        log_error("PR004", f"处理查询时发生未知错误: {str(e)}", 
                 {'query': query, 'filepath': knowledge_base_path})
        try:
            fallback_prompt = f"""请直接回答用户问题。如果信息不足，给出一般性说明并标注“以下为一般性说明”，不要回答“无法回答”。

问题: {query}"""
            return get_deepseek_answer_optimized(fallback_prompt)
        except Exception as fallback_error:
            log_error("PR005", f"处理查询回退失败: {str(fallback_error)}", {'query': query})
            return "处理查询时发生错误，请稍后重试。"

# ==========================================================
#                 性能监控和工具函数
# ==========================================================

def get_performance_metrics() -> Dict[str, Any]:
    """
    获取性能指标
    """
    return {
        'cache_enabled': _knowledge_base_cache is not None,
        'cache_age': time.time() - _cache_timestamp if _cache_timestamp else None,
        'cache_size': sum(len(items) for items in _knowledge_base_cache.values()) 
                      if _knowledge_base_cache else 0,
        'timestamp': datetime.now().isoformat()
    }

def clear_cache() -> None:
    """
    清空知识库缓存
    """
    global _knowledge_base_cache, _cache_timestamp
    _knowledge_base_cache = None
    _cache_timestamp = None
    logger.info("知识库缓存已清空")

# ==========================================================
#                 测试函数
# ==========================================================

def test_optimized_system():
    """
    测试优化后的系统
    """
    test_queries = [
        "什么是藏历",
        "藏历和农历有什么区别",
        "如何计算藏历日期",
        "藏历中的五行是什么",
        "藏历的生肖系统"
    ]
    
    print("=== 优化版AI对话功能测试 ===")
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{i}. 测试查询: {query}")
        start_time = time.time()
        
        try:
            result = process_query_with_rag_optimized(query)
            end_time = time.time()
            
            print(f"   响应时间: {end_time - start_time:.2f}秒")
            print(f"   响应长度: {len(result)}字符")
            print(f"   状态: ✅ 成功")
            
            # 显示部分结果
            if len(result) > 150:
                print(f"   响应预览: {result[:150]}...")
            else:
                print(f"   响应结果: {result}")
                
        except Exception as e:
            end_time = time.time()
            print(f"   响应时间: {end_time - start_time:.2f}秒")
            print(f"   错误信息: {e}")
            print(f"   状态: ❌ 失败")
        
        time.sleep(1)  # 避免API限流

if __name__ == "__main__":
    # 运行测试
    test_optimized_system()
