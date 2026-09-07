#!/usr/bin/env bash
# 강의 원고 폴더의 빌드 결과물 중 "공개해도 되는 것"만 이 레포로 복사한다.
# 원고(md), 문제은행, 퀴즈, 정답, docx 는 절대 복사하지 않는다 (이 레포는 공개 레포다).
set -euo pipefail
cd "$(dirname "$0")"
SRC=/home/dspub/lecture/books/보건학연구방법론/build/book
DST=research-methods
mkdir -p "$DST"
cp "$SRC/보건학연구방법론.html" "$DST/index.html"
cp "$SRC/보건학연구방법론.pdf"  "$DST/보건학연구방법론.pdf"
cp "$SRC/보건학연구방법론.epub" "$DST/보건학연구방법론.epub"
echo "synced -> $DST"; du -sh "$DST"
