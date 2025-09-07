# 농도 계산기 (ABV · °Bx)

## 파이썬 CLI 사용법

예시 JSON(ingredients 배열):

```json
[
  {"name": "물", "volume_ml": 100, "abv_percent": 0, "brix": 0},
  {"name": "보드카", "volume_ml": 50, "abv_percent": 40, "brix": 0},
  {"name": "시럽", "volume_ml": 20, "abv_percent": 0, "brix": 50}
]
```

명령 실행:

```bash
python -m py.cli --ingredients "<위 JSON을 한 줄로>"
# 또는 파일로
python -m py.cli --file sample.json
```

## Streamlit 앱 실행

```bash
pip install -r requirements.txt
streamlit run py/app_streamlit.py
```

브라우저가 열리면 재료를 추가·편집하면 결과가 실시간 갱신됩니다.

## 계산 가정
- 단순 부피 합산(부피 수축 무시)
- °Bx는 질량분율 근사, 밀도≈1 g/mL 가정 → 고농도 용액 오차 가능

