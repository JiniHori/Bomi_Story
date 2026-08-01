# BOMI 태아보험 의사결정 도우미

이 폴더를 기존 BOMI GitHub 저장소의 루트에 그대로 업로드하면 됩니다.

## 최종 구조

```text
기존 저장소/
├─ index.html
├─ manifest.json
├─ service-worker.js
├─ 2026-06-25.html
├─ bomi_ultrasound_260625.mp4
└─ insurance/
   └─ index.html
```

## GitHub 웹에서 업로드하는 방법

1. 기존 BOMI GitHub 저장소를 엽니다.
2. `Add file` → `Upload files`를 선택합니다.
3. 이 ZIP을 먼저 PC에서 압축 해제합니다.
4. 압축 해제된 `insurance` 폴더를 저장소 화면으로 끌어다 놓습니다.
5. 아래쪽 `Commit changes`를 누릅니다.
6. Cloudflare 자동 배포가 끝난 뒤 아래 주소로 접속합니다.

```text
https://bomistory.jinihori.workers.dev/insurance/
```

## 기능

- Jake / 지니 답변 분리
- 답변 자동 저장
- 부부 의견 차이 표시
- 보장 성향 및 권장 수준 산출
- 설계사 전달용 재설계 요청서 생성
- JSON 백업 및 복원
- 인쇄 / PDF 저장

## 주의

- 사이트 주소 끝에 `/insurance/`를 붙여 접속하세요.
- Cloudflare 캐시 때문에 바로 반영되지 않으면 1-2분 뒤 새로고침하세요.
- 기존 BOMI 파일은 덮어쓰지 않습니다.
