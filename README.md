# book — book.yioh.ai.kr

연세대학교 산업보건연구소 교재의 **공개 빌드 결과물**만 담는 공개 레포. GitHub Pages 로 `book.yioh.ai.kr` 에 서빙된다.
로컬 작업 폴더 `/home/dspub/book`. 자세한 절차는 `/home/dspub/lecture/BOOK_PUBLISH.md`.

- 책 하나 = 폴더 하나(`<slug>/index.html`, pdf, epub, slides/ …). 목록은 `books.json` 에서 `sync.py` 가 만든다.
- 원고·문제은행·정답·docx 는 넣지 않는다. `sync.py` 가 .md/.docx/.json 을 거부한다.
- 갱신: `./sync.py && git add -A && git commit -m "update" && git push`
