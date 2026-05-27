# -*- coding: utf-8 -*-
# 병렬 처리 파이프라인
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

from extractor import extract_text, SUPPORTED
from classifier import classify, FOLDER_NAMES, FOLDER_DESCRIPTIONS


# ── 결과 구조 ─────────────────────────────────────────────────────────────────

@dataclass
class FileResult:
    filename:    str
    folder_code: str
    method:      str
    confidence:  float
    extract_ms:  int
    classify_ms: int
    error:       Optional[str] = None

    @property
    def total_ms(self):
        return self.extract_ms + self.classify_ms


# ── 임베딩 모델 로딩 (메인에서 1번만) ────────────────────────────────────────

def load_embedder():
    """
    메인 프로세스에서 1번만 호출.
    반환값을 process_all에 넘겨서 스레드 간 공유.
    """
    from sentence_transformers import SentenceTransformer
    print("[임베딩] 모델 로딩 중...")
    embedder    = SentenceTransformer("intfloat/multilingual-e5-large")
    folder_codes = sorted(FOLDER_DESCRIPTIONS.keys())
    descs        = ["passage: " + FOLDER_DESCRIPTIONS[c] for c in folder_codes]
    folder_vecs  = embedder.encode(
        descs, convert_to_tensor=True, normalize_embeddings=True
    )
    print("[임베딩] 로딩 완료\n")
    return embedder, folder_vecs, folder_codes


# ── 단일 파일 처리 ────────────────────────────────────────────────────────────

def process_one(
    filepath:     Path,
    embedder,
    folder_vecs,
    folder_codes: list,
    llm_client,
    use_llm:      bool,
) -> FileResult:
    """파일 1개: 추출 → 분류."""
    try:
        t0     = time.monotonic()
        text   = extract_text(filepath)
        ext_ms = int((time.monotonic() - t0) * 1000)

        t1     = time.monotonic()
        result = classify(
            text         = text,
            filename     = filepath.name,
            embedder     = embedder,
            folder_vecs  = folder_vecs,
            folder_codes = folder_codes,
            llm_client   = llm_client,
            use_llm      = use_llm,
        )
        cls_ms = int((time.monotonic() - t1) * 1000)

        return FileResult(
            filename    = filepath.name,
            folder_code = result["folder_code"],
            method      = result["method"],
            confidence  = result["confidence"],
            extract_ms  = ext_ms,
            classify_ms = cls_ms,
        )
    except Exception as e:
        return FileResult(
            filename    = filepath.name,
            folder_code = "99",
            method      = "error",
            confidence  = 0.0,
            extract_ms  = 0,
            classify_ms = 0,
            error       = str(e),
        )


# ── 청크 병렬 처리 ────────────────────────────────────────────────────────────

async def process_chunk(
    files:        list,
    executor:     ThreadPoolExecutor,
    embedder,
    folder_vecs,
    folder_codes: list,
    llm_client,
    use_llm:      bool,
) -> list:
    """청크 내 파일들을 스레드풀에서 병렬 처리."""
    loop  = asyncio.get_event_loop()
    tasks = [
        loop.run_in_executor(
            executor, process_one,
            fp, embedder, folder_vecs, folder_codes, llm_client, use_llm
        )
        for fp in files
    ]
    return await asyncio.gather(*tasks)


async def process_all(
    files:        list,
    embedder=None,
    folder_vecs=None,
    folder_codes=None,
    llm_client=None,
    chunk_size:   int  = 10,
    max_workers:  int  = 4,
    use_llm:      bool = False,
) -> list:
    """
    전체 파일을 청크로 나눠서 병렬 처리.
    chunk_size: LLM rate limit 고려해서 조절
    """
    chunks  = [files[i:i+chunk_size] for i in range(0, len(files), chunk_size)]
    results = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        for idx, chunk in enumerate(chunks):
            print(f"  청크 {idx+1}/{len(chunks)} ({len(chunk)}개)...")
            chunk_results = await process_chunk(
                chunk, executor,
                embedder, folder_vecs, folder_codes,
                llm_client, use_llm,
            )
            results.extend(chunk_results)

    return results


# ── 직렬 처리 (비교용) ────────────────────────────────────────────────────────

def process_all_serial(
    files:        list,
    embedder=None,
    folder_vecs=None,
    folder_codes=None,
    llm_client=None,
    use_llm:      bool = False,
) -> list:
    return [
        process_one(fp, embedder, folder_vecs, folder_codes, llm_client, use_llm)
        for fp in files
    ]


# ── 결과 출력 헬퍼 ────────────────────────────────────────────────────────────

def print_results(results: list):
    print(f"\n{'파일명':<48} {'폴더':>2} {'방법':<14} {'신뢰도':>6} {'추출':>5} {'분류':>5}")
    print("-" * 88)
    for r in results:
        if r.error:
            print(f"{r.filename[:47]:<48} [오류] {r.error[:30]}")
            continue
        name = FOLDER_NAMES.get(r.folder_code, "?")
        print(
            f"{r.filename[:47]:<48} "
            f"{r.folder_code}({name[:6]}) "
            f"{r.method:<14} "
            f"{r.confidence:>6.3f} "
            f"{r.extract_ms:>4}ms "
            f"{r.classify_ms:>4}ms"
        )

    # 방법별 통계
    methods = {}
    for r in results:
        methods[r.method] = methods.get(r.method, 0) + 1

    total    = len(results)
    errors   = sum(1 for r in results if r.error)
    avg_ms   = sum(r.total_ms for r in results if not r.error) / max(total - errors, 1)

    print(f"\n방법별 분류:")
    for m, cnt in sorted(methods.items()):
        print(f"  {m:<16}: {cnt}개 ({cnt/total*100:.0f}%)")
    print(f"\n평균 처리시간: {avg_ms:.0f}ms/파일  |  오류: {errors}개")

