# -*- coding: utf-8 -*-
"""
rag_processor.py
RAG + DeepSeek API 实现版（增强关键词检索）
"""

import json
import os
import logging
import requests
import jieba

# 从配置文件读取 API 密钥
from config import Config

# ========== DeepSeek API 配置 ==========
# 优先使用环境变量，如果没有则使用配置文件中的值
DEEPSEEK_API_KEY = Config.DEEPSEEK_API_KEY or os.environ.get('DEEPSEEK_API_KEY')
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

# ========== 停用词表（过滤无意义词） ==========
STOPWORDS = {"什么", "是", "的", "如何", "怎么", "请问", "有哪些", "介绍", "一下"}

# ==========================================================
#                 知识库加载与检索
# ==========================================================

def resolve_knowledge_base_path(filepath):
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

def read_json_with_fallback(file_path):
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

def load_knowledge_base(filepath='../frontend/public/rag/knowledge_base.json'):
    """从JSON文件中加载知识库。"""
    try:
        full_path, candidates = resolve_knowledge_base_path(filepath)
        logging.info(f"知识库路径解析结果: {full_path}")
        logging.info(f"知识库路径候选: {candidates}")
        
        if not os.path.exists(full_path):
            logging.error(f"找不到知识库文件: {full_path}")
            return []
        if not os.path.isfile(full_path):
            logging.error(f"知识库路径不是文件: {full_path}")
            return []
        if not os.access(full_path, os.R_OK):
            logging.error(f"知识库文件不可读: {full_path}")
            return []
        if os.path.getsize(full_path) == 0:
            logging.warning(f"知识库文件为空: {full_path}")
            return []
        
        kb, encoding_used = read_json_with_fallback(full_path)
        if not isinstance(kb, list):
            logging.error(f"知识库格式错误，期望列表: {full_path}")
            return []
        print(f"成功加载知识库，共 {len(kb)} 条内容，编码 {encoding_used}。")
        return kb
    except FileNotFoundError:
        print(f"错误：找不到知识库文件 '{full_path}'")
        return []
    except json.JSONDecodeError:
        print(f"错误：解析JSON文件 '{full_path}' 失败")
        return []

def retrieve_relevant_chunks(query, knowledge_base, top_k=3):
    """
    使用 jieba 分词提取关键词，从知识库中检索最相关文本块。
    """
    print("正在进行关键词提取与匹配...")

    # 使用 jieba 分词
    words = jieba.lcut(query)
    keywords = [w for w in words if len(w.strip()) > 1 and w not in STOPWORDS]

    if not keywords:
        keywords = [query]  # 回退策略：没有关键词就使用原查询

    relevant_chunks = []

    for chunk in knowledge_base:
        if 'content' in chunk and isinstance(chunk['content'], str):
            # 计算匹配得分：关键词出现的次数
            match_score = sum(chunk['content'].count(k) for k in keywords)
            if match_score > 0:
                chunk['score'] = match_score
                relevant_chunks.append(chunk)

    # 排序取前 top_k
    relevant_chunks.sort(key=lambda x: x.get('score', 0), reverse=True)
    unique_chunks_dict = {chunk['content']: chunk for chunk in relevant_chunks}

    print(f"检索到 {len(unique_chunks_dict)} 条相关内容。")
    return list(unique_chunks_dict.values())[:top_k]

# ==========================================================
#                    构建 RAG 提示词
# ==========================================================

def generate_rag_prompt(query, relevant_chunks):
    """根据检索结果构建 RAG 提示词。"""
    if not relevant_chunks:
        # 知识库没有相关内容，让模型用自己的知识回答
        print("未在知识库中找到相关上下文，将让模型用自身知识回答。")
        prompt = f"""
知识库中暂未找到与该问题相关的藏历天文内容。

请运用你自身的知识储备来回答以下问题。如果问题涉及藏历、天文等领域，请给出尽可能准确和有帮助的回答。

问题: {query}
"""
        return prompt

    # 知识库有相关内容，结合知识库回答
    context = "\\n\\n---\\n\\n".join([chunk['content'] for chunk in relevant_chunks])
    prompt = f"""
以下是从知识库中检索到的相关藏历天文内容，请参考这些内容来回答问题。

知识库内容:
{context}

问题: {query}

请基于上述知识库内容回答，如果内容不足以完全回答，可以补充你自己的知识。
"""
    return prompt

# ==========================================================
#                    DeepSeek API 调用
# ==========================================================

def get_deepseek_answer(prompt):
    """调用 DeepSeek API 返回模型回答。"""
    if not DEEPSEEK_API_KEY:
        return "错误：DeepSeek API 密钥未配置。"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
    }

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "你是一个知识渊博的AI天文藏历助手，请根据用户提供的内容回答问题。"},
            {"role": "user", "content": prompt}
        ],
        "stream": False
    }

    try:
        # 禁用代理，避免代理相关错误
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=60, proxies={"http": None, "https": None})
        response.raise_for_status()
        result = response.json()
        return result['choices'][0]['message']['content']
    except requests.exceptions.RequestException as e:
        return f"调用API时出错: {e}"
    except (KeyError, IndexError) as e:
        return f"解析API响应时出错: {e} - 响应内容: {response.text}"

# ==========================================================
#                完整 RAG + API 工作流程
# ==========================================================

def process_query_with_rag_and_api(query, knowledge_base_path='../frontend/public/rag/knowledge_base.json'):
    """RAG 检索 + DeepSeek 调用全流程"""
    knowledge_base = load_knowledge_base(knowledge_base_path)
    if not knowledge_base:
        fallback_prompt = f"""
请直接回答用户问题。如果信息不足，给出一般性说明并标注“以下为一般性说明”，不要回答“无法回答”。

问题: {query}
"""
        return get_deepseek_answer(fallback_prompt)

    # 只使用后半部分的中文内容（前5000条是英文乱码）
    # 跳过前面的乱码内容，从第5000条开始检索
    chinese_knowledge_base = knowledge_base[5000:]

    relevant_chunks = retrieve_relevant_chunks(query, chinese_knowledge_base)
    rag_prompt = generate_rag_prompt(query, relevant_chunks)

    # print("\\n--- 生成的RAG提示 ---")
    # print(rag_prompt)
    # print("-" * 50)

    # print("\\n--- 正在调用 DeepSeek API... ---")
    final_answer = get_deepseek_answer(rag_prompt)
    return final_answer
