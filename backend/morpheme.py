# -*- coding: utf-8 -*-
# 형태소 분석 모듈
# 룰 기반 키워드 매칭 품질 향상을 위한 명사 추출

import re


def extract_nouns(text: str, filename: str = "") -> list:
    """
    텍스트에서 명사 추출.
    konlpy 설치 여부에 따라 자동 전환:
      - 설치됨 → Okt 형태소 분석기 사용
      - 미설치 → 정규식 기반 fallback
    """
    if not text and not filename:
        return []

    combined = (filename + " " + (text or "")).strip()

    try:
        return _extract_with_konlpy(combined)
    except Exception:
        return _extract_fallback(combined)


def _extract_with_konlpy(text: str) -> list:
    """Okt 형태소 분석기로 명사 추출. 실패 시 예외 발생."""
    # Java 관련 경고 억제
    import warnings
    warnings.filterwarnings("ignore")

    from konlpy.tag import Okt
    okt   = Okt()
    nouns = okt.nouns(text)
    nouns = [n for n in nouns if len(n) >= 2]
    return list(dict.fromkeys(nouns))


def _extract_fallback(text: str) -> list:
    """
    konlpy 없을 때 정규식 기반 fallback.
    한글 2글자 이상 단어 추출.
    """
    words = re.findall(r"[가-힣]{2,}", text)
    return list(dict.fromkeys(words))