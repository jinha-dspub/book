#!/usr/bin/env python3
"""books.json 에 적힌 책들의 공개 파일만 이 레포로 복사하고 index.html(목록)을 다시 만든다.

이 레포는 공개 레포다. 원고(.md), 문제은행, 퀴즈, 정답, docx 는 절대 복사하지 않는다.
복사 대상은 books.json 의 files(html/pdf/epub)와 extras(예: slides 폴더의 pdf) 뿐이다.
"""
import html, json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BLOCK = {".md", ".docx", ".json", ".py", ".txt"}  # 실수로라도 나가면 안 되는 확장자

def copy_file(src: Path, dst: Path) -> None:
    if src.suffix.lower() in BLOCK:
        sys.exit(f"거부: {src.name} 는 공개 레포에 넣지 않는다")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    print(f"  {src.name} -> {dst.relative_to(ROOT)}")

def main() -> None:
    books = json.loads((ROOT / "books.json").read_text(encoding="utf-8"))
    for b in books:
        src = Path(b["src"]); out = ROOT / b["slug"]
        print(f"[{b['slug']}] {b['title']}")
        if not src.is_dir():
            sys.exit(f"원본 폴더가 없다: {src}")
        f = b["files"]
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
        f = b["files"]; s = b["slug"]
        links = [f'<a href="/{s}/">온라인으로 읽기</a>']
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
