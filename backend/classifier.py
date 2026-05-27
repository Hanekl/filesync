"""
분류 파이프라인 + 추천 기능
CLAUDE.md: 요청한 것만, 단계별 필요한 처리만
"""

import re
import json
from collections import Counter
from typing import Optional
from pathlib import Path

# ── 설정 ─────────────────────────────────────────────────────────────────────

RULE_THRESHOLD     = 0.5   # 룰 점수 이상 → 바로 확정
EMBED_THRESHOLD    = 0.2   # 룰 점수 이 미만 → 임베딩 비중 80%
COMBINED_THRESHOLD = 0.58  # 합산 점수 이상 → 확정 (LLM 불필요)

FOLDER_NAMES = {
    "01":"보고서","03":"계약서/견적/정산","04":"기획서/계획서",
    "06":"발표자료","07":"공고/안내/지침","08":"조사/참고자료",
    "09":"인증서/증명서","10":"동의서","99":"기타",
}

FOLDER_DESCRIPTIONS = {
    "01": "업무 담당자가 작성하여 상급자에게 제출하는 결과 보고 문서. 월간보고서, 주간보고서, 중간보고서, 최종보고서, 완료보고서, 결과보고서, 현황보고, 성과보고 포함. 정부기관 발급 문서 아님.",
    "03": "세금계산서, 전자세금계산서, 견적서, 발주서, 거래명세서, 정산서, 영수증. 계약서, 협약서, MOU, 용역계약서. 갑과 을 당사자 간 금전·용역 거래 문서. 공급가액, 부가세, VAT 포함.",
    "04": "미래 사업이나 프로젝트의 목표와 실행 전략을 수립한 계획 문서. 수행계획서, 사업계획서, 기획서, 기획안, 추진계획서, 실행계획서, 연구개발계획서. 목표, 일정, 예산 포함.",
    "06": "청중이나 관계자 앞에서 발표하기 위해 PPT 슬라이드로 제작된 자료. 발표자료, 프레젠테이션, IR자료, 투자제안서, 사업소개, 회사소개서, 수상작.",
    "07": "사업참여, 입찰, 채용, 공모를 위해 공개적으로 게시하는 공고 안내 문서. 공고문, 모집공고, 입찰공고, 채용공고, 제안요청서(RFP), 과업지시서, 지침서. 접수기간, 지원자격 포함.",
    "08": "법령 별표, 고시 전문, 시행규칙, 기술기준 등 참고용 법규 자료. 시장조사, 기술동향, 벤치마킹, 연구자료, 사례연구, 통계자료, 논문. 협업툴 비교, 플랫폼 동향 포함.",
    "09": "정부기관, 공공기관, 공인된 인증기관이 발급한 공식 증명 문서. 사업자등록증, 법인등기부등본, 납세증명서, 벤처기업확인서, 이노비즈인증서, 특허증. 발급기관 직인, 발급일 포함.",
    "10": "개인정보 수집 및 이용 동의서. 참여 동의서, 기업정보 수집 동의서, 서명 동의서. 개인정보 제3자 제공 동의, 정보활용 동의 포함.",
    "99": "위 어떤 폴더에도 해당하지 않는 문서.",
}

FOLDER_RULES = {
    "01": {
        "strong": ["최종보고서","중간보고서","결과보고서","현황보고","완료보고","성과보고","과업지시서"],
        "weak":   ["보고서","보고","결과","성과","현황","분석결과","실적","월간","주간","분기","모니터링","달성률"],
    },
    "03": {
        "strong": ["계약서","협약서","견적서","세금계산서","MOU","정산서","발주서","전자세금계산서","거래명세서"],
        "weak":   ["갑","을","계약","협약","견적","정산","발주","단가","금액","지급","납품","용역","날인","서명","VAT","부가세","원정"],
    },
    "04": {
        "strong": ["수행계획서","사업계획서","기획서","기획안","실행계획서","추진계획서","연구개발계획서"],
        "weak":   ["계획","기획","추진","전략","목표","로드맵","일정","과제","수행","마일스톤","WBS","연구목표","개발목표"],
    },
    "06": {
        "strong": ["발표자료","발표 자료","프레젠테이션","IR자료","소개자료"],
        "weak":   ["발표","PT","슬라이드","소개","브리핑","투자","IR","데모","피칭"],
    },
    "07": {
        "strong": ["공고문","모집공고","입찰공고","채용공고","지침서","안내문","제안요청서","과업지시"],
        "weak":   ["공고","안내","공지","모집","접수","지원","신청","접수기간","제출서류","입찰","낙찰","RFP","바우처"],
    },
    "08": {
        "strong": ["시장조사","벤치마킹","참고자료","연구자료","조사보고서","동향분석","별표","고시","시행규칙"],
        "weak":   ["조사","연구","동향","트렌드","분석","자료","참고","사례","논문","통계","리서치","전기용품","매뉴얼"],
    },
    "09": {
        "strong": ["사업자등록증","법인등기","납세증명","지방세완납","중소기업확인서","벤처기업확인서","이노비즈","등록증"],
        "weak":   ["사업자","등기","납세","등록","허가","면허","특허","대표자","소재지","발급기관","유효기간"],
    },
    "10": {
        "strong": ["동의서","개인정보수집이용동의서","참여동의서","기업정보수집동의서","수집동의"],
        "weak":   ["동의","개인정보","수집","이용","제공"],
    },
    "99": {
        "strong": [],
        "weak":   [],
    },
}

PATTERNS = {
    "money":      ["금액","계좌","VAT","부가세","원정","공급가액","세액","합계금액"],
    "plan":       ["연구목표","추진전략","수행방법","추진일정","연구내용","수행계획"],
    "submission": ["제출서류","접수기간","신청기간","모집기간","문의처"],
    "report":     ["추진경과","성과지표","달성률","추진실적","문제점","개선방안"],
    "cert":       ["인증번호","발급일","유효기간","발급기관"],
}


# ── 1단계: 룰 기반 ───────────────────────────────────────────────────────────

def classify_rule(text: str, filename: str, nouns: list = None) -> dict:
    """모든 폴더 룰 점수 반환. raw 텍스트만 사용, 추가 처리 없음."""
    combined = filename + " " + (text or "")
    if nouns:
        combined += " " + " ".join(nouns)
    scores   = {}
    for code, rules in FOLDER_RULES.items():
        s, w = rules["strong"], rules["weak"]
        if not s and not w:
            scores[code] = 0.0
            continue
        s_hit     = sum(1 for kw in s if kw in combined)
        w_hit     = sum(1 for kw in w if kw in combined)
        weighted  = s_hit * 2.0 + w_hit * 1.0
        max_score = len(s) * 2.0 + len(w) * 1.0
        score     = weighted / max_score if max_score > 0 else 0.0
        bonus     = sum(0.2 for kw in s if kw in filename)
        scores[code] = min(score + bonus, 1.0)
    return scores


# ── 2단계: 임베딩 ────────────────────────────────────────────────────────────

def classify_embed(
    text: str,
    filename: str,
    embedder,
    folder_vecs,
    folder_codes: list,
) -> dict:
    """모든 폴더 임베딩 유사도 반환 (0~1 정규화). 모델은 외부 주입."""
    from sentence_transformers import util
    query = f"query: {filename} {(text or '')[:500]}"
    q_vec = embedder.encode(query, convert_to_tensor=True, normalize_embeddings=True)
    sims  = util.cos_sim(q_vec, folder_vecs)[0].tolist()
    norm  = [(s + 1) / 2 for s in sims]
    return {folder_codes[i]: norm[i] for i in range(len(folder_codes))}


# ── 추천 생성 ─────────────────────────────────────────────────────────────────

def get_recommendations(
    combined_scores: dict,
    top_n: int = 3,
) -> list:
    """
    이미 계산된 합산 점수로 추천 생성.
    추가 API 호출 없음 → 비용 0원.

    Returns:
        [
          {"rank": 1, "folder_code": "03", "folder_name": "계약서", "confidence": 0.87},
          {"rank": 2, "folder_code": "04", "folder_name": "기획서", "confidence": 0.61},
          {"rank": 3, "folder_code": "07", "folder_name": "공고",   "confidence": 0.42},
        ]
    """
    ranked = sorted(
        combined_scores.items(),
        key=lambda x: x[1],
        reverse=True,
    )
    return [
        {
            "rank":        i + 1,
            "folder_code": code,
            "folder_name": FOLDER_NAMES.get(code, "?"),
            "confidence":  round(score, 3),
            "pct":         f"{score * 100:.0f}%",
        }
        for i, (code, score) in enumerate(ranked[:top_n])
        if score > 0.0
    ]


# ── 3단계: LLM 증거 패키지 ───────────────────────────────────────────────────

def build_evidence(text: str, filename: str) -> str:
    """
    마크다운 증거 패키지.
    LLM 호출 시에만 생성 (비용 절감).
    """
    lines    = [l.strip() for l in (text or "").splitlines() if l.strip()]
    title    = lines[0] if lines else filename
    toc      = [
        l for l in lines
        if re.match(r"^(\d+[\.\)]\s|[Ⅰ-Ⅹ]\.?\s)", l)
        or (10 <= len(l) <= 40 and not any(c in l for c in ".,。"))
    ][:6]
    words    = re.findall(r"[가-힣]{2,}", text or "")
    freq     = [w for w, _ in Counter(words).most_common(15)]
    domain   = [kw for rules in FOLDER_RULES.values()
                 for kw in rules["strong"] if kw in (text or "")]
    keywords = list(dict.fromkeys(freq + domain))[:10]
    flags    = [k for k, kws in PATTERNS.items()
                if any(kw in (text or "") for kw in kws)]

    parts = [f"## 파일명\n{filename}", f"## 제목\n{title}"]
    if toc:
        parts.append("## 목차\n" + "\n".join(f"- {t}" for t in toc))
    if keywords:
        parts.append("## 핵심 키워드\n" + ", ".join(keywords))
    if flags:
        parts.append("## 패턴\n" + ", ".join(flags))
    if lines:
        parts.append("## 본문 일부\n" + " ".join(lines[:8])[:400])
    return "\n\n".join(parts)


def classify_llm(text: str, filename: str, client) -> tuple:
    """증거 패키지 → LLM → 폴더 코드 + 신뢰도."""
    evidence    = build_evidence(text, filename)
    folder_list = "\n".join(
        f"- {code}: {FOLDER_DESCRIPTIONS[code]}"
        for code in sorted(FOLDER_DESCRIPTIONS)
    )
    prompt = f"""{evidence}

## 분류 카테고리
{folder_list}

JSON으로만 응답 (다른 텍스트 금지):
{{"folder_code": "2자리코드", "confidence": 0.0~1.0}}"""

    try:
        resp  = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=100,
            messages=[{"role": "user", "content": prompt}],
        )
        raw   = resp.content[0].text.strip()
        print(f"  [LLM 응답] {raw[:80]}")
        match = re.search(r"\{.*?\}", raw, re.DOTALL)
        if match:
            r    = json.loads(match.group())
            code = str(r.get("folder_code", "99")).zfill(2)
            conf = float(r.get("confidence", 0.5))
            if code in FOLDER_DESCRIPTIONS:
                return code, conf
            print(f"  [LLM 경고] 알 수 없는 코드: {code}")
        else:
            print(f"  [LLM 경고] JSON 파싱 실패: {raw[:50]}")
    except Exception as e:
        print(f"  [LLM 오류] {e}")
    # 실패 시 None 반환 → 호출부에서 합산 1순위로 fallback
    return None, 0.0


# ── 통합 분류 함수 ────────────────────────────────────────────────────────────

def classify(
    text:         Optional[str],
    filename:     str,
    nouns:        list = None,
    embedder=None,
    folder_vecs=None,
    folder_codes=None,
    llm_client=None,
    use_llm:      bool = True,
    top_n:        int  = 3,
) -> dict:
    """
    단계별 필요한 처리만 수행.

    반환값:
        folder_code   : 최종 분류 코드
        folder_name   : 폴더 이름
        method        : rule / rule+embed / llm / embed-fallback
        confidence    : 신뢰도 (0~1)
        recommendations: 추천 3개 (합산 점수 순위)
        needs_review  : 사용자 확인 필요 여부
        combined_scores: 폴더별 합산 점수 (디버깅용)
    """
    # ── 1단계: 룰 기반 ───────────────────────────────────────────────────────
    rule_scores = classify_rule(text, filename, nouns)
    best_rule   = max(
        (c for c in rule_scores if c != "99"),
        key=lambda c: rule_scores[c], default="99"
    )
    best_rule_score = rule_scores.get(best_rule, 0.0)
    if best_rule_score < 0.01:
        best_rule = "08"  # 미분류 → 08 조사/참고자료

    # 룰만으로 합산 점수 계산 (임베딩 없을 때 추천용)
    combined_scores = dict(rule_scores)

    # 룰 점수 충분 → 확정
    if best_rule_score >= RULE_THRESHOLD:
        recs = get_recommendations(combined_scores, top_n)
        return {
            "folder_code":    best_rule,
            "folder_name":    FOLDER_NAMES.get(best_rule, "?"),
            "method":         "rule",
            "confidence":     round(best_rule_score, 3),
            "recommendations": recs,
            "needs_review":   False,   # 확신 높음
            "combined_scores": combined_scores,
        }

    # ── 2단계: 임베딩 ────────────────────────────────────────────────────────
    if embedder is not None:
        embed_scores = classify_embed(text, filename, embedder, folder_vecs, folder_codes)

        # 폴더별 합산 점수 계산
        # 룰 점수 >= EMBED_THRESHOLD → 50/50, 미만 → 임베딩 80%
        w_rule  = 0.5 if best_rule_score >= EMBED_THRESHOLD else 0.2
        w_embed = 1.0 - w_rule

        combined_scores = {
            code: rule_scores.get(code, 0.0) * w_rule
                  + embed_scores.get(code, 0.0) * w_embed
            for code in FOLDER_DESCRIPTIONS
        }

        best_combined       = max(combined_scores, key=combined_scores.get)
        best_combined_score = combined_scores[best_combined]

        # 추천은 항상 합산 점수 기준
        recs = get_recommendations(combined_scores, top_n)

        # 합산 점수 충분 → 확정
        if best_combined_score >= COMBINED_THRESHOLD:
            # 99(기타)로 배정되면 08로 변경 + 사용자 확인
            needs_review = False
            if best_combined == "99":
                best_combined = "08"
                needs_review  = True
            return {
                "folder_code":     best_combined,
                "folder_name":     FOLDER_NAMES.get(best_combined, "?"),
                "method":          "rule+embed",
                "confidence":      round(best_combined_score, 3),
                "recommendations": recs,
                "needs_review":    needs_review,
                "combined_scores": combined_scores,
            }

        # ── 3단계: LLM ───────────────────────────────────────────────────────
        if use_llm and llm_client is not None:
            llm_code, llm_conf = classify_llm(text, filename, llm_client)
            # LLM 파싱 실패(None) → 합산 점수 1순위로 fallback
            if llm_code is None:
                llm_code = best_combined
                llm_conf = best_combined_score
                method   = "llm-fallback"
            else:
                method = "llm"
            return {
                "folder_code":     llm_code,
                "folder_name":     FOLDER_NAMES.get(llm_code, "?"),
                "method":          method,
                "confidence":      round(llm_conf, 3),
                "recommendations": recs,
                "needs_review":    llm_conf < 0.7,
                "combined_scores": combined_scores,
            }

        # LLM 없이 → 합산 최고 폴더, 사용자 확인 필요
        return {
            "folder_code":     best_combined,
            "folder_name":     FOLDER_NAMES.get(best_combined, "?"),
            "method":          "embed-fallback",
            "confidence":      round(best_combined_score, 3),
            "recommendations": recs,
            "needs_review":    True,   # 확신 낮음 → 사용자 확인 필요
            "combined_scores": combined_scores,
        }

    # 임베딩 없이 룰만
    recs = get_recommendations(combined_scores, top_n)
    return {
        "folder_code":     best_rule,
        "folder_name":     FOLDER_NAMES.get(best_rule, "?"),
        "method":          "rule-only",
        "confidence":      round(best_rule_score, 3),
        "recommendations": recs,
        "needs_review":    best_rule_score < RULE_THRESHOLD,
        "combined_scores": combined_scores,
    }