# -*- coding: utf-8 -*-
# 태그 시스템 - HDBSCAN 기반 자동 태그 생성
# 기능:
# 1. 초기 클러스터링 (수동 실행)
# 2. 군집 중심 벡터 저장 (.pkl)
# 3. 새 파일 태그 자동 부착
# 4. 새 태그 생성 시 재클러스터링
# 5. TF-IDF 키워드 추출

import pickle
import re
from pathlib import Path
from typing import Optional
from collections import Counter

# .pkl 저장 경로 (실행 파일과 같은 폴더)
CLUSTER_PKL = Path("cluster_data.pkl")

# 태그 부착 임계값 (유사도 0.6 이상이면 태그 부착)
TAG_THRESHOLD = 0.6


# ── 저장/로드 ─────────────────────────────────────────────────────────────────

def save_cluster_data(data: dict):
    """군집 데이터 .pkl로 저장."""
    with open(CLUSTER_PKL, 'wb') as f:
        pickle.dump(data, f)
    print(f"저장 완료: {CLUSTER_PKL}")


def load_cluster_data() -> Optional[dict]:
    """군집 데이터 .pkl에서 로드. 없으면 None."""
    if not CLUSTER_PKL.exists():
        return None
    with open(CLUSTER_PKL, 'rb') as f:
        return pickle.load(f)


# ── TF-IDF 키워드 추출 ────────────────────────────────────────────────────────

def extract_keywords(texts: list, top_n: int = 5) -> list:
    """
    TF-IDF로 핵심 키워드 추출.
    태그 이름 후보로 사용.
    """
    from sklearn.feature_extraction.text import TfidfVectorizer

    if not texts:
        return []

    # 한글 2글자 이상 단어만
    cleaned = [" ".join(re.findall(r"[가-힣]{2,}", t or "")) for t in texts]
    cleaned = [c for c in cleaned if c.strip()]

    if not cleaned:
        return []

    try:
        vectorizer = TfidfVectorizer(max_features=50)
        vectorizer.fit(cleaned)
        features = vectorizer.get_feature_names_out()
        scores   = vectorizer.transform(cleaned).sum(axis=0).A1
        top_idx  = scores.argsort()[::-1][:top_n]
        return [features[i] for i in top_idx]
    except Exception:
        # fallback: 단순 빈도 기반
        words = []
        for t in cleaned:
            words.extend(t.split())
        freq = Counter(words)
        return [w for w, _ in freq.most_common(top_n)]


# ── 초기 클러스터링 ───────────────────────────────────────────────────────────

def run_initial_clustering(
    file_data: list,
    embedder,
    min_cluster_size: int = None,
):
    """
    초기 파일들로 HDBSCAN 클러스터링.
    수동으로 실행.

    file_data: [{"filename": ..., "text": ..., "filepath": ...}, ...]
    embedder: SentenceTransformer 인스턴스
    """
    import hdbscan
    import numpy as np

    n = len(file_data)
    if n < 5:
        print(f"파일이 너무 적음 ({n}개). 최소 5개 필요.")
        return None

    # min_cluster_size 자동 설정 (파일 수의 5%, 최소 3 최대 15)
    if min_cluster_size is None:
        min_cluster_size = max(3, min(int(n * 0.05), 15))
    print(f"min_cluster_size: {min_cluster_size} (파일 {n}개 기준)")

    # 벡터 생성
    print("벡터 변환 중...")
    queries = [
        f"query: {fd['filename']} {(fd.get('text') or '')[:500]}"
        for fd in file_data
    ]
    vectors = embedder.encode(
        queries,
        convert_to_tensor=False,
        normalize_embeddings=True,
        show_progress_bar=True,
    )

    # HDBSCAN 클러스터링
    print("HDBSCAN 클러스터링 중...")
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=2,
        metric='euclidean',
        cluster_selection_method='eom',
    )
    labels = clusterer.fit_predict(vectors)

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise    = sum(1 for l in labels if l == -1)
    print(f"군집 수: {n_clusters}개 / 노이즈: {n_noise}개")

    # 군집별 중심 벡터 + 키워드 계산
    clusters = {}
    for cluster_id in set(labels):
        if cluster_id == -1:
            continue

        # 해당 군집 파일들
        indices  = [i for i, l in enumerate(labels) if l == cluster_id]
        cluster_vectors = vectors[indices]
        cluster_texts   = [file_data[i].get('text', '') for i in indices]
        cluster_files   = [file_data[i]['filename'] for i in indices]

        # 중심 벡터 (평균)
        center = cluster_vectors.mean(axis=0)
        center = center / (np.linalg.norm(center) + 1e-8)

        # 키워드 추출
        keywords = extract_keywords(cluster_texts, top_n=5)

        clusters[cluster_id] = {
            "center":   center,
            "keywords": keywords,
            "files":    cluster_files,
            "tag_name": None,  # 관리자가 나중에 설정
        }

        print(f"\n  군집 {cluster_id} ({len(indices)}개 파일)")
        print(f"    키워드: {keywords}")
        print(f"    파일: {cluster_files[:3]}{'...' if len(cluster_files) > 3 else ''}")

    # 파일별 태그 매핑
    file_tags = {}
    for i, (fd, label) in enumerate(zip(file_data, labels)):
        file_tags[fd['filename']] = label if label != -1 else None

    # 저장
    data = {
        "clusters":  clusters,
        "file_tags": file_tags,
        "vectors":   {fd['filename']: vectors[i] for i, fd in enumerate(file_data)},
    }
    save_cluster_data(data)

    print(f"\n클러스터링 완료!")
    print(f"태그 이름을 설정하려면 set_tag_name() 을 사용하세요")
    return data


# ── 관리자: 태그 이름 설정 ────────────────────────────────────────────────────

def set_tag_name(cluster_id: int, tag_name: str):
    """관리자가 군집에 태그 이름 설정."""
    data = load_cluster_data()
    if data is None:
        print("클러스터 데이터 없음. 먼저 클러스터링 실행 필요.")
        return

    if cluster_id not in data["clusters"]:
        print(f"군집 {cluster_id} 없음.")
        return

    data["clusters"][cluster_id]["tag_name"] = tag_name
    save_cluster_data(data)
    print(f"군집 {cluster_id} → 태그 '{tag_name}' 설정 완료")


# ── 새 파일 태그 부착 ─────────────────────────────────────────────────────────

def assign_tag(filename: str, text: str, embedder) -> Optional[str]:
    """
    새 파일 → 기존 군집 중심 벡터와 유사도 비교
    → 태그 자동 부착 (1개)
    → 임계값 미만이면 None (미분류)
    """
    import numpy as np
    from sentence_transformers import util

    data = load_cluster_data()
    if data is None or not data["clusters"]:
        return None

    # 태그 이름 설정된 군집만 사용
    named = {
        cid: info for cid, info in data["clusters"].items()
        if info["tag_name"] is not None
    }
    if not named:
        return None

    # 새 파일 벡터
    query = f"query: {filename} {(text or '')[:500]}"
    q_vec = embedder.encode(
        query, convert_to_tensor=True, normalize_embeddings=True
    )

    # 각 군집 중심과 유사도
    best_tag   = None
    best_score = 0.0

    for cid, info in named.items():
        import torch
        c_vec = torch.tensor(info["center"])
        score = float(util.cos_sim(q_vec, c_vec))
        if score > best_score:
            best_score = score
            best_tag   = info["tag_name"]

    if best_score >= TAG_THRESHOLD:
        print(f"  [태그] '{best_tag}' 부착 (유사도 {best_score:.3f})")
        return best_tag

    print(f"  [태그] 미분류 (최고 유사도 {best_score:.3f} < {TAG_THRESHOLD})")
    return None


# ── 새 태그 생성 시 재클러스터링 ─────────────────────────────────────────────

def add_new_tag_and_recluster(
    new_tag_name: str,
    file_data: list,
    embedder,
):
    """
    새 태그 생성 시 HDBSCAN 재실행.
    전체 파일 재군집화.
    """
    print(f"새 태그 '{new_tag_name}' 생성 → 재클러스터링 시작")
    data = run_initial_clustering(file_data, embedder)
    if data is None:
        return

    # 새 태그 이름 자동 매핑 시도
    # (키워드에 새 태그 이름이 포함된 군집 찾기)
    for cid, info in data["clusters"].items():
        if any(new_tag_name in kw or kw in new_tag_name
               for kw in info["keywords"]):
            info["tag_name"] = new_tag_name
            print(f"  군집 {cid} → '{new_tag_name}' 자동 매핑")
            break

    save_cluster_data(data)


# ── 현재 태그 현황 출력 ───────────────────────────────────────────────────────

def show_tags():
    """현재 태그 현황 출력."""
    data = load_cluster_data()
    if data is None:
        print("클러스터 데이터 없음")
        return

    print(f"\n{'='*50}")
    print(f"현재 태그 현황 ({len(data['clusters'])}개 군집)")
    print(f"{'='*50}")

    for cid, info in sorted(data["clusters"].items()):
        name     = info["tag_name"] or "(이름 미설정)"
        n_files  = len(info["files"])
        keywords = ", ".join(info["keywords"])
        print(f"\n  [{cid}] {name} ({n_files}개 파일)")
        print(f"       키워드: {keywords}")

    # 미분류
    n_untagged = sum(1 for t in data["file_tags"].values() if t is None)
    print(f"\n  미분류: {n_untagged}개")