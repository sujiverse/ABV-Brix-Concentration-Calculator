from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import List

import streamlit as st

from .calculator import Ingredient, mix


st.set_page_config(page_title="농도 계산기 (파이썬)", page_icon="🍸", layout="centered")
st.title("농도 계산기 (ABV · °Bx)")
st.caption("여러 재료를 섞어 최종 알코올 도수와 당도를 추정합니다. 단순화 가정 포함")

if "rows" not in st.session_state:
    st.session_state.rows = [
        Ingredient(name="물", volume_ml=500, abv_percent=0, brix=0),
        Ingredient(name="술 54%", volume_ml=1000, abv_percent=54, brix=0),
    ]


def render_rows(rows: List[Ingredient]) -> List[Ingredient]:
    new_rows: List[Ingredient] = []
    for idx, r in enumerate(rows):
        cols = st.columns([2, 1.2, 1.2, 1.2, 0.6])
        with cols[0]:
            name = st.text_input("이름", r.name, key=f"name_{idx}")
        with cols[1]:
            volume = st.number_input("부피(mL)", value=float(r.volume_ml), min_value=0.0, step=1.0, key=f"vol_{idx}")
        with cols[2]:
            abv = st.number_input("ABV%", value=float(r.abv_percent), min_value=0.0, max_value=100.0, step=0.1, key=f"abv_{idx}")
        with cols[3]:
            brix = st.number_input("°Bx", value=float(r.brix), min_value=0.0, max_value=100.0, step=0.1, key=f"bx_{idx}")
        with cols[4]:
            remove = st.button("삭제", key=f"rm_{idx}")
        if not remove:
            new_rows.append(Ingredient(name=name, volume_ml=volume, abv_percent=abv, brix=brix))
    return new_rows


st.session_state.rows = render_rows(st.session_state.rows)

with st.expander("도움 기능(건설탕, 글리세린 추가)"):
    c1, c2, c3 = st.columns(3)
    with c1:
        sugar_g = st.number_input("건설탕 질량(g)", min_value=0.0, step=10.0, value=0.0)
        if st.button("설탕 추가(부피 근사)"):
            # 설탕 벌크 밀도 ~ 1.59 g/mL → 부피 ≈ m / 1.59
            vol_ml = sugar_g / 1.59 if sugar_g > 0 else 0.0
            if vol_ml > 0:
                st.session_state.rows.append(Ingredient(name=f"설탕(건){int(sugar_g)}g", volume_ml=vol_ml, abv_percent=0, brix=100))
    with c2:
        glyc_ml = st.number_input("글리세린(mL)", min_value=0.0, step=1.0, value=0.0)
        if st.button("글리세린 추가"):
            if glyc_ml > 0:
                st.session_state.rows.append(Ingredient(name=f"글리세린", volume_ml=glyc_ml, abv_percent=0, brix=0))
    with c3:
        if st.button("보드카 40% 50mL 추가"):
            st.session_state.rows.append(Ingredient(name="보드카 40%", volume_ml=50, abv_percent=40, brix=0))


cols = st.columns([1, 1, 2])
if cols[0].button("행 추가"):
    st.session_state.rows.append(Ingredient(name="", volume_ml=0, abv_percent=0, brix=0))
if cols[1].button("초기화"):
    st.session_state.rows = []

result = mix(st.session_state.rows)

st.subheader("결과")
colr = st.columns(3)
colr[0].metric("총 부피", f"{result.total_volume_ml:.2f} mL")
colr[1].metric("최종 ABV", f"{result.final_abv_percent:.2f} %")
colr[2].metric("최종 °Bx", f"{result.final_brix:.2f} °Bx")

st.caption("가정: 단순 부피합, 밀도≈1 g/mL 가정에 의한 °Bx 근사. 고농도 시 오차 가능")


st.subheader("실험 저장")
exp_name = st.text_input("실험 이름")
exp_comment = st.text_area("코멘트")
save_col1, save_col2 = st.columns([1, 3])

def rows_to_serializable(rows: List[Ingredient]):
    return [dict(name=r.name, volume_ml=r.volume_ml, abv_percent=r.abv_percent, brix=r.brix) for r in rows]

if save_col1.button("저장"):
    rec = {
        "ts": datetime.utcnow().isoformat() + "Z",
        "name": exp_name or "",
        "comment": exp_comment or "",
        "rows": rows_to_serializable(st.session_state.rows),
        "result": result.__dict__,
    }
    path = Path("experiments.jsonl")
    with path.open("a", encoding="utf-8") as wf:
        wf.write(json.dumps(rec, ensure_ascii=False) + "\n")
    save_col2.success("저장됨: experiments.jsonl")

with st.expander("저장된 실험 보기"):
    path = Path("experiments.jsonl")
    if path.exists():
        lines = path.read_text(encoding="utf-8").splitlines()[-50:]
        data = [json.loads(x) for x in lines if x.strip()]
        for d in reversed(data):
            st.write(f"🕒 {d.get('ts')} · {d.get('name','(무제)')}")
            st.write(d.get("comment", ""))
            st.json({"rows": d.get("rows"), "result": d.get("result")})
    else:
        st.info("아직 저장된 실험이 없습니다.")


