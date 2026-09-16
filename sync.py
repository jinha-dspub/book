#!/usr/bin/env python3
"""books.json 에 적힌 책들의 공개 파일만 이 레포로 복사하고 index.html(목록)을 다시 만든다.

이 레포는 공개 레포다. 원고(.md), 문제은행, 퀴즈, 정답, docx 는 절대 복사하지 않는다.

책은 세 꼴이 있다.
  · 파일 하나짜리  — books.json 의 files.html 한 파일을 <slug>/index.html 로 복사한다.
  · 폴더 통째("site": true) — Quarto book 처럼 여러 쪽으로 렌더된 사이트를 그대로 복사한다.
    이때도 확장자 차단은 그대로다. 다만 Quarto 가 만드는 검색 색인 search.json 만 예외로 둔다
    (이미 공개된 본문에서 뽑은 것이라 새로 새는 정보가 없고, 없으면 사이트 검색이 죽는다).
  · 바깥 링크("external": true) — 복사할 파일이 없고 links 의 주소만 목록에 건다
    (예: 로그인 없이 열리는 Google Slides). src 도 없어야 한다.
extras(예: slides 폴더의 pdf)도 그대로 쓴다.
"""
import argparse, html, json, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BLOCK = {".md", ".docx", ".json", ".py", ".txt"}  # 실수로라도 나가면 안 되는 확장자
ALLOW_NAMES = {"search.json"}                    # 폴더형 책에서만 허용하는 예외 (Quarto 검색 색인)

def copy_file(src: Path, dst: Path, quiet: bool = False) -> None:
    if src.suffix.lower() in BLOCK and src.name not in ALLOW_NAMES:
        sys.exit(f"거부: {src.name} 는 공개 레포에 넣지 않는다")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    if not quiet:
        print(f"  {src.name} -> {dst.relative_to(ROOT)}")


def copy_site(src: Path, out: Path) -> None:
    """렌더된 사이트 폴더를 통째로 복사한다 (Quarto book).

    지운 章이 남지 않도록 대상 폴더를 먼저 비운다. 단, 이 폴더에 사람이 손으로 둔 것이
    있으면 안 되므로 books.json 의 site 책에만 쓴다.
    """
    if out.exists():
        shutil.rmtree(out)
    n = 0
    for p in sorted(src.rglob("*")):
        if p.is_file():
            copy_file(p, out / p.relative_to(src), quiet=True)
            n += 1
    print(f"  사이트 {n}개 파일 -> {out.relative_to(ROOT)}/")

def render_chapters(book: dict) -> None:
    """Google Slides 챕터 목록과 첫 챕터 미리보기를 만든다."""
    chapters = book["chapters"]
    if not chapters:
        raise ValueError("chapters에는 챕터가 하나 이상 필요합니다")
    seen = set()
    cards = []
    for chapter in chapters:
        key, presentation = chapter["id"], chapter["presentation_id"]
        if not re.fullmatch(r"[a-z0-9-]+", key) or key in seen:
            raise ValueError(f"챕터 id가 잘못되었거나 중복됩니다: {key}")
        if not re.fullmatch(r"[A-Za-z0-9_-]+", presentation):
            raise ValueError("Google Slides presentation_id를 확인하세요")
        seen.add(key)
        title = html.escape(chapter["title"])
        base = f"https://docs.google.com/presentation/d/{presentation}"
        cards.append(
            f'<li><a class="chapter" id="{key}" href="#{key}" '
            f'data-preview="{base}/preview">{title}</a>'
            f'<div class="links"><a href="{base}/preview" target="_blank" rel="noopener">'
            f'Google Slides에서 열기</a> <a href="{base}/export/pdf">PDF 내려받기</a></div></li>'
        )
    first = chapters[0]
    replacements = {
        "<!--TITLE-->": html.escape(book["title"]),
        "<!--AUTHOR-->": html.escape(book.get("author", "")),
        "<!--CHAPTERS-->": "\n".join(cards),
        "<!--FIRST_TITLE-->": html.escape(first["title"]),
        "<!--FIRST_PREVIEW-->": f'https://docs.google.com/presentation/d/{first["presentation_id"]}/preview',
    }
    page = (ROOT / "slides.template.html").read_text(encoding="utf-8")
    for marker, value in replacements.items():
        page = page.replace(marker, value)
    out = ROOT / book["slug"] / "slides"
    out.mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(page, encoding="utf-8")
    print(f"  {book['slug']}/slides/index.html 갱신")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog-only", action="store_true",
                        help="교재 파일 복사 없이 목록과 Google Slides 챕터 페이지만 갱신")
    args = parser.parse_args()
    books = json.loads((ROOT / "books.json").read_text(encoding="utf-8"))
    for b in books:
        print(f"[{b['slug']}] {b['title']}")
        if b.get("chapters") is not None:
            render_chapters(b)
        if args.catalog_only:
            continue
        if b.get("external"):
            print("  바깥 링크 — 복사할 파일 없음")
            continue
        src = Path(b["src"]); out = ROOT / b["slug"]
        if not src.is_dir():
            sys.exit(f"원본 폴더가 없다: {src}")
        f = b.get("files", {})
        if b.get("slides_only"):
            pass                         # 슬라이드만 공개 (원고는 비공개). extras 로 pdf 만 복사한다
        elif b.get("site"):
            copy_site(src, out)          # 폴더 통째 (index.html·章·site_libs·그림이 다 들어 있다)
        else:
            copy_file(src / f["html"], out / "index.html")
            for k in ("pdf", "epub"):
                if f.get(k):
                    copy_file(src / f[k], out / f[k])
        for ex in b.get("extras", []):          # {"src": "../slides", "dst": "slides", "glob": "*.pdf"}
            for p in sorted((src / ex["src"]).glob(ex.get("glob", "*"))):
                if p.is_file():
                    copy_file(p, out / ex["dst"] / p.name)

    items = []
    for b in books:
        f = b.get("files", {}); s = b["slug"]
        if b.get("chapters") is not None:
            links = [f'<a href="/{s}/slides/">강의 슬라이드</a>']
        elif b.get("external"):
            links = [f'<a href="{html.escape(l["url"])}" target="_blank" rel="noopener">'
                     f'{html.escape(l["label"])}</a>' for l in b["links"]]
        else:
            links = [] if b.get("slides_only") else [f'<a href="/{s}/">온라인으로 읽기</a>']
            if f.get("pdf"):  links.append(f'<a href="/{s}/{html.escape(f["pdf"])}">PDF</a>')
            if f.get("epub"): links.append(f'<a href="/{s}/{html.escape(f["epub"])}">EPUB</a>')
            for ex in b.get("extras", []):
                links.append(f'<a href="/{s}/{ex["dst"]}/">{html.escape(ex.get("label", ex["dst"]))}</a>')
        items.append(
            f"    <li>\n      <b>{html.escape(b['title'])}</b>\n"
            f"      <span>{html.escape(b.get('subtitle',''))} · {html.escape(b.get('author',''))}</span>\n"
            f"      <nav>{' '.join(links)}</nav>\n    </li>"
        )
    tpl = (ROOT / "index.template.html").read_text(encoding="utf-8")
    (ROOT / "index.html").write_text(tpl.replace("<!--BOOKS-->", "\n".join(items)), encoding="utf-8")
    print("index.html 갱신")

if __name__ == "__main__":
    main()
