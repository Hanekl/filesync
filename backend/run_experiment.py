# -*- coding: utf-8 -*-
# 전체 실험 코드 - 본인 PC에서 실행
# 임베딩 + LLM 연결해서 정확도 측정
#
# 설치:
# pip install sentence-transformers pymupdf python-pptx openpyxl pandas scikit-learn anthropic olefile
#
# 실행:
# python run_experiment.py              <- 임베딩 + LLM 전부
# python run_experiment.py --no-llm    <- 임베딩만 (빠름)
# python run_experiment.py --rule-only <- 룰만 (가장 빠름)

import argparse
import time
import csv
import sys
from pathlib import Path

# ── 경로 설정 ──────────────────────────────────────────────────────────────────
# 본인 데이터 폴더 경로로 수정하세요
DATA_DIR = Path(r"C:\Users\82106\OneDrive\바탕 화면\파일 분류 데이터 1차 0316")

FOLDER_MAP = {
    "1. 공고_지침_양식":            "07",
    "2. 사업계획서 수행계획서":      "04",
    "3. 조사_참고자료":             "08",
    "4. 중간_최종 결과물 및 보고서": "01",
    "5. 발표자료":                  "06",
    "6. 견적_계약_정산":            "03",
    "7. 기업 인증서":               "09",
    "8. 기타":                     "99",
}

FOLDER_NAMES = {
    "01": "보고서",
    "03": "계약서/견적/정산",
    "04": "기획서/계획서",
    "06": "발표자료",
    "07": "공고/안내/지침",
    "08": "조사/참고자료",
    "09": "인증서/증명서",
    "10": "동의서",
    "99": "기타",
}

SUPPORTED = {".pdf", ".pptx", ".docx", ".xlsx", ".hwp", ".hwpx"}


# ── 임베딩 로딩 ────────────────────────────────────────────────────────────────

def load_embedder(folder_descriptions):
    from sentence_transformers import SentenceTransformer
    print("임베딩 모델 로딩 중 (multilingual-e5-large)...")
    print("처음 실행 시 다운로드 포함 1~2분 소요")
    t0     = time.monotonic()
    emb    = SentenceTransformer("intfloat/multilingual-e5-large")
    codes  = sorted(folder_descriptions.keys())
    descs  = ["passage: " + folder_descriptions[c] for c in codes]
    vecs   = emb.encode(descs, convert_to_tensor=True, normalize_embeddings=True)
    ms     = int((time.monotonic() - t0) * 1000)
    print(f"로딩 완료 ({ms}ms)\n")
    return emb, vecs, codes


# ── LLM 클라이언트 ────────────────────────────────────────────────────────────

def load_llm():
    import anthropic
    # 환경변수 ANTHROPIC_API_KEY 또는 아래에 직접 입력
    # client = anthropic.Anthropic(api_key="sk-ant-여기에입력")
    client = anthropic.Anthropic()
    print("LLM 클라이언트 준비 완료\n")
    return client


# ── 파일 수집 ─────────────────────────────────────────────────────────────────

def collect_files():
    records = []
    for folder_name, true_code in FOLDER_MAP.items():
        fp = DATA_DIR / folder_name
        if not fp.exists():
            print(f"[경고] 폴더 없음: {folder_name}")
            continue
        for f in fp.iterdir():
            if f.suffix.lower() in SUPPORTED:
                records.append({
                    "filepath":  f,
                    "filename":  f.name,
                    "true_code": true_code,
                    "is_hwp":    f.suffix.lower() in {".hwp", ".hwpx"},
                })
    return records


# ── 메인 실험 ─────────────────────────────────────────────────────────────────

def run(use_embed=True, use_llm=True):
    try:
        from extractor  import extract_text
        from classifier import classify, FOLDER_DESCRIPTIONS
        from morpheme   import extract_nouns
    except ImportError as e:
        print("오류: extractor.py, classifier.py 가 같은 폴더에 있어야 합니다")
        print(e)
        sys.exit(1)

    # 임베딩 로딩
    embedder = folder_vecs = folder_codes = None
    if use_embed:
        try:
            embedder, folder_vecs, folder_codes = load_embedder(FOLDER_DESCRIPTIONS)
        except Exception as e:
            print(f"[임베딩 로딩 실패] {e}")
            print("룰 기반만 사용합니다\n")

    # LLM 클라이언트
    llm_client = None
    if use_llm:
        try:
            llm_client = load_llm()
        except Exception as e:
            print(f"[LLM 로딩 실패] {e}")
            print("LLM 없이 진행합니다\n")

    # 파일 수집
    records = collect_files()
    n       = len(records)
    if n == 0:
        print("파일을 찾을 수 없습니다. DATA_DIR 경로를 확인하세요.")
        print(f"현재 경로: {DATA_DIR}")
        sys.exit(1)

    print(f"총 {n}개 파일\n")

    # 병렬 처리
    from concurrent.futures import ThreadPoolExecutor
    import asyncio

    def process_one(rec):
        t0     = time.monotonic()
        text   = extract_text(rec["filepath"])
        ext_ms = int((time.monotonic() - t0) * 1000)
        nouns  = extract_nouns(text or "", rec["filename"])
        t1     = time.monotonic()
        result = classify(
            text         = text,
            filename     = rec["filename"],
            nouns        = nouns,
            embedder     = embedder,
            folder_vecs  = folder_vecs,
            folder_codes = folder_codes,
            llm_client   = llm_client,
            use_llm      = use_llm,
        )
        cls_ms = int((time.monotonic() - t1) * 1000)
        ok     = result["folder_code"] == rec["true_code"]
        return {
            "filename":     rec["filename"],
            "true_code":    rec["true_code"],
            "pred_code":    result["folder_code"],
            "method":       result["method"],
            "confidence":   result["confidence"],
            "needs_review": result["needs_review"],
            "correct":      ok,
            "extract_ms":   ext_ms,
            "classify_ms":  cls_ms,
            "rec1": result["recommendations"][0]["folder_code"] if len(result["recommendations"]) > 0 else "",
            "rec2": result["recommendations"][1]["folder_code"] if len(result["recommendations"]) > 1 else "",
            "rec3": result["recommendations"][2]["folder_code"] if len(result["recommendations"]) > 2 else "",
        }

    results  = []
    t_total  = time.monotonic()
    CHUNK    = 8   # 청크 크기
    WORKERS  = 4   # 스레드 수

    print(f"{'OK':^4} {'정답':^4} {'분류':^4} {'방법':<14} {'신뢰도':>6} {'확인':^4}  파일명")
    print("-" * 80)

    chunks = [records[i:i+CHUNK] for i in range(0, len(records), CHUNK)]
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        for chunk in chunks:
            chunk_results = list(executor.map(process_one, chunk))
            for r in chunk_results:
                sym = "O" if r["correct"] else "X"
                rev = "!" if r["needs_review"] else " "
                print(f"{sym:^4} {r['true_code']:^4} {r['pred_code']:^4} "
                      f"{r['method']:<14} {r['confidence']:>6.3f} {rev:^4}  "
                      f"{r['filename'][:35]}")
            results.extend(chunk_results)

    total_ms = int((time.monotonic() - t_total) * 1000)

    # 결과 요약
    correct = sum(1 for r in results if r["correct"])
    print(f"\n{'='*60}")
    print(f"전체 정확도 : {correct/n*100:.1f}%  ({correct}/{n})")
    print(f"총 처리시간 : {total_ms}ms  ({total_ms//n}ms/파일)")

    # 방법별
    methods = {}
    for r in results:
        m = r["method"]
        if m not in methods:
            methods[m] = {"cnt": 0, "ok": 0}
        methods[m]["cnt"] += 1
        methods[m]["ok"]  += int(r["correct"])

    print("\n방법별 정확도:")
    for m, d in sorted(methods.items()):
        acc = d["ok"] / d["cnt"] * 100
        print(f"  {m:<16}: {acc:>5.1f}%  ({d['ok']}/{d['cnt']})")

    # 폴더별
    print("\n폴더별 정확도:")
    for code in sorted(FOLDER_NAMES):
        sub = [r for r in results if r["true_code"] == code]
        if not sub:
            continue
        ok_cnt = sum(1 for r in sub if r["correct"])
        print(f"  {code} {FOLDER_NAMES[code]:<20}: {ok_cnt/len(sub)*100:>5.1f}%  ({ok_cnt}/{len(sub)})")

    # 오분류
    wrong = [r for r in results if not r["correct"]]
    print(f"\n오분류 {len(wrong)}건:")
    for r in wrong:
        tn  = FOLDER_NAMES.get(r["true_code"], "?")
        pn  = FOLDER_NAMES.get(r["pred_code"], "?")
        rev = " [확인필요]" if r["needs_review"] else ""
        # 추천 안에 정답 있었는지
        in_rec = r["true_code"] in [r["rec1"], r["rec2"], r["rec3"]]
        hint   = " (추천에는 있었음)" if in_rec else ""
        print(f"  [{tn} -> {pn}]{rev}{hint}  {r['filename'][:45]}")

    # 추천 품질
    in_top3 = sum(
        1 for r in results
        if r["true_code"] in [r["rec1"], r["rec2"], r["rec3"]]
    )
    print(f"\n추천 Top-3 포함률: {in_top3/n*100:.1f}%  ({in_top3}/{n})")

    # needs_review
    rv = [r for r in results if r["needs_review"]]
    if rv:
        rv_ok = sum(1 for r in rv if r["correct"])
        print(f"사용자 확인 필요: {len(rv)}개  (그 중 정답 {rv_ok}개)")

    # CSV 저장
    out = DATA_DIR.parent / "experiment_result.csv"
    fieldnames = [
        "filename", "true_code", "pred_code", "method",
        "confidence", "needs_review", "correct",
        "extract_ms", "classify_ms", "rec1", "rec2", "rec3",
    ]
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in results:
            writer.writerow(r)
    print(f"\nCSV 저장: {out}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-llm",    action="store_true")
    parser.add_argument("--rule-only", action="store_true")
    args = parser.parse_args()

    if args.rule_only:
        run(use_embed=False, use_llm=False)
    elif args.no_llm:
        run(use_embed=True,  use_llm=False)
    else:
        run(use_embed=True,  use_llm=True)