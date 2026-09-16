# book — book.yioh.ai.kr

연세대학교 산업보건연구소 교재의 **공개 빌드 결과물**만 담는 공개 레포. GitHub Pages 로 `book.yioh.ai.kr` 에 서빙된다.
로컬 작업 폴더 `/home/dspub/book`. 자세한 절차는 `/home/dspub/lecture/BOOK_PUBLISH.md`.

- 책 하나 = 폴더 하나(`<slug>/index.html`, pdf, epub, slides/ …). 목록은 `books.json` 에서 `sync.py` 가 만든다.
- 원고·문제은행·정답·docx 는 넣지 않는다. `sync.py` 가 .md/.docx/.json 을 거부한다.
- 갱신: `./sync.py && git add -A && git commit -m "update" && git push`

## 기초의학 I·II 슬라이드 수정

`books.json`의 `basic-medicine-for-data` 항목만 수정합니다.

- 강의 제목·홈 설명: `title`, `subtitle`
- 챕터 제목: `chapters` 안의 `title`
- Google Slides 교체: `presentation_id` (공유 URL의 `/d/`와 다음 `/` 사이 값)
- 챕터 추가: `chapters`에 항목 추가. `id`는 중복 없는 영문 소문자·숫자·하이픈으로 지정합니다.
- 기존 챕터의 `id`는 유지합니다. `#part1`, `#part2`로 직접 공유할 수 있습니다.

```bash
cd /home/dspub/book
./sync.py --catalog-only
git add books.json index.html basic-medicine-for-data/slides/index.html
git commit -m "기초의학 슬라이드 갱신"
git push
```

`index.html`과 `basic-medicine-for-data/slides/index.html`은 자동 생성되므로 직접 수정하지 않습니다.
챕터 페이지 디자인은 `slides.template.html`에서 수정한 뒤 위 명령으로 다시 생성합니다.
Google Slides는 링크를 가진 사람이 로그인 없이 볼 수 있도록 공유 설정을 유지하세요.
