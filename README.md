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

## AI 산업안전보건 — 일과 건강의 역사

- 강의 목록: `/ai-safety/`
- 슬라이드 목차: `/ai-safety/work-health-history/`
- 발표 시작: `/ai-safety/work-health-history/s01.html`

57장의 HTML 슬라이드와 이미지·영상·글꼴을 함께 제공합니다. 공개본에서는 발표자 노트 본문, `_notes.json`, 노트 버튼과 단축키를 제거했습니다.

8번과 9번 사이의 `s08a.html`은 「사람들은 무엇을 기록했는가」 유튜브 영상을 처음부터 재생합니다. 인터넷에 연결한 뒤 재생 버튼을 누르고, 설명을 이어갈 때 화면의 9번 버튼으로 이동합니다.

25번과 26번 사이의 `s25a.html`은 채플린의 〈모던 타임즈〉 유튜브 영상을 1:48–3:50 구간으로 재생합니다. 인터넷 연결이 필요하며 재생 버튼을 눌러 시작합니다. 영상에 키보드 초점이 있으면 화면의 26번 버튼으로 넘기거나 영상 바깥을 클릭한 뒤 PgDn을 누릅니다.

기존 `s01.html` 등의 주소는 `present.html` 발표 화면으로 연결됩니다. 발표 화면이 전체화면을 유지하고 내부 프레임에서 슬라이드만 바꿉니다. F 키와 전체화면 버튼으로 전환하고 Esc로 종료할 수 있습니다.

`books.json`의 `ai-safety.src`는 노트를 제거한 공개용 빌드 폴더입니다. 갱신할 때도 원본 `lecture/.../slides`를 직접 복사하지 않고, 공개용 빌드를 먼저 갱신한 뒤 `sync.py`로 반영합니다.
