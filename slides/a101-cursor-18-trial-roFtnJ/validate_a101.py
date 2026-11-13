#!/usr/bin/env python3
"""Validate A101 18-page PPTX against prompt rules."""

from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path

from pptx import Presentation
from pptx.util import Emu, Inches

OUT_DIR = Path(__file__).resolve().parent
PPTX = OUT_DIR / "A101_Cursor_18頁試作.pptx"
REPORT = OUT_DIR / "CHECK_REPORT.md"

# Verbatim notes from prompt (same as generator)
NOTES = {
    1: """開場：歡迎家長同教育工作者。今日係 A101 基礎人工智能應用於兒童教育工作坊；工具用 Gemini。
日期：2026年12月5日（六）下午03:00；主辦：知涵兒童財商學院。
帶領提示：先講今日目標，再進入概念同示範；所有示範活動係建議做法，未經測試，唔保證成效。""",
    2: """今日三個目標：① 認識 AI 係咩、點運作；② 陪學唔代做（用 Gemini 陪學）；③ 帶走即用 prompt 同私隱安全守則。
帶領提示：之後每段都會對返呢三個目標；示範同練習都係建議，唔保證 AI 一定照做。""",
    3: """定義（教學用簡化）：AI（人工智能）係從大量資料學規律嘅電腦程式，再用規律去估答案。
四個生活例子：手機人面解鎖、地圖導航、影片推介、聊天助手 Gemini——都係「學規律 → 估答案」。
帶領提示：呢頁唔講生成式細節；下一頁先講文字生成模型點估下一個字。唔用真實小朋友面孔或姓名做例子。""",
    4: """重點：文字生成模型係根據指令同對話內容，逐段預測最可能接落去嘅文字，再一段段生成回應。講得流暢，唔代表講得啱，所以要自己查證。
補充：模型處理文字嘅單位叫「文字片段」（token）。token 可以係一個字、一個詞嘅一部分（subword）或者一個字元／標點；唔一定等於一個中文字。
呢五步係簡化嘅教學講法，只講文字生成，唔代表所有 AI 都係咁運作。
來源（Google 官方）：
https://developers.google.com/machine-learning/crash-course/llm
https://developers.google.com/machine-learning/glossary/language
https://android-developers.googleblog.com/2024/09/introduction-to-large-language-models-for-android-developers.html""",
    5: """本院兒童 AI 課程原則：對象 7–15 歲，7 歲起開始；大人陪同操作。呢個係本院教學原則，唔係 Gemini 帳戶年齡規定，亦唔係 Google 嘅醫療／年齡指引。
重點：大人陪同、孩子先講自己諗法、唔輸入個人資料；未滿 7 歲暫時唔引導佢用 AI。
帶領提示：如果家長問「Google 規定幾歲？」——請佢哋跟從 Google 最新官方帳戶／年齡／家長監護要求；本院只講課程陪用原則。""",
    6: """對比：代做＝直接寫閱讀答案／照抄 AI 句子；陪學＝逐條問、等孩子答／答錯只俾提示。
Takeaway：小朋友負責思考，AI 幫手提問。
帶領提示：之後所有示範都跟「陪學」路線；如果 AI 開始代做，即刻停低，改寫指令。""",
    7: """重點：教育局《小學資訊與創新科技課程框架》「人工智能初探」範疇（試行版）列明學生要「認識人是主角」（人工智能是人類的工具和助手）及「先思而後用」（做功課或解難時，先思考和嘗試，有需要時參考人工智能生成的內容）。
畫面上「自己先諗 → AI 幫手 → 自己判斷」係本院按呢啲原則整理嘅教學步驟，唔係教育局原文。
來源：教育局「人工智能初探」範疇（試行版）：https://www.edb.gov.hk/attachment/tc/curriculum-development/kla/technology-edu/curriculum-doc/IIT_Summary%20on%20AI_TC.pdf
教育局通函第113/2026號：https://www.edb.gov.hk/attachment/tc/curriculum-development/renewal/CM/EDBCM26113C.pdf""",
    8: """今日係成人工作坊示範：由家長／老師用自己嘅帳戶操作 Gemini，小朋友喺旁邊一齊睇、一齊諗。唔好叫小朋友自己開帳戶，亦唔好借用大人嘅帳戶密碼俾小朋友自己用。
本院「7 歲起、大人陪用」係本院課程原則，唔係 Google 嘅使用資格或年齡規定。實際使用請跟從 Google 最新嘅帳戶、年齡同家長監護要求。
練習只用自編短文，唔輸入任何真實姓名、學校、相片或其他個人資料。介面會更新，示範以當日畫面為準；唔保證某項功能一定提供。""",
    9: """四元素（角色、任務、規則、例子）係本院教學用嘅 prompt 寫法示例，幫大人講清楚想 AI 點樣幫手；唔代表經科學驗證，亦唔保證 AI 答案一定正確。
示例 prompt：「你係閱讀提問老師。根據以下短文問 3 條問題，逐條問，等我答完先問下一條，唔好提供答案。例如：主角點解咁做？」""",
    10: """示範用原創短文（非真實小朋友故事）：「小兔帶兩枝鉛筆返學，見同桌冇筆，借咗一枝俾佢。放學前，同桌還返枝筆，仲多謝小兔。」
完整 prompt：「請做閱讀提問老師。根據以下短文，逐條問我三類問題：講咗咩、點解、如果係你。每次只問一條，等我答完先繼續；答錯只俾提示，唔好講答案。」
預設提問腳本（本院教學設計，唔係 AI 生成結果）：1. 小兔做咗乜？ 2. 點解小兔借鉛筆？ 3. 如果係你，你會點做？
帶領提示：大人要留意 AI 每一個回覆；如果 AI 直接講答案或者一次問晒，即刻停低，改寫指令再試。prompt 唔保證 AI 一定照做。""",
    11: """原創示範情境（非真實小朋友作品）：落雨天返學嘅路上。
五條提問次序：1. 人物：主角係邊個？ 2. 地點：喺邊度發生？ 3. 事件：發生咗咩事？ 4. 感受：當時覺得點？ 5. 結尾：最後點收尾？每條等孩子答完先問下一條。
完整 prompt：「你做我嘅寫作提問教練。題目係『落雨天返學』。請逐條問我人物、地點、事件、感受、結尾，每次只問一條，等我答完先問下一條。唔好寫範文，亦唔好幫我寫句子。」
帶領提示：句子由孩子自己寫，AI 只係提問。大人要睇住 AI 回覆；如果佢開始寫範文或者代寫句子，即刻停低，改寫指令。prompt 唔保證 AI 一定照做。""",
    12: """原創示範錯題（非真實學生作業）：孩子寫咗 8 + 7 = 14。
先請孩子講自己點計，再按次序一次俾一個提示：提示 1（指方向）：「試下拆開一個數。」 提示 2（縮細範圍）：「8 要加幾多先變成 10？」 提示 3（俾起步）：「將 7 拆成 2 同 5，先計 8 + 2，再由你完成。」
最後答案由孩子自己完成；大人自己要核實正確計算，唔好單靠 AI。
帶領提示：留意 AI 每個回覆；如果 AI 直接講答案或者一次俾晒提示，即刻停低，改寫指令。prompt 唔保證 AI 一定照做；三層提示係支援程度遞增，唔保證學習成效。""",
    13: """完整 prompt：「你做我嘅溫習時間表顧問。請一次只問我一條問題：先問我要溫咩科目，再問我最弱係邊一課，再問我每日有幾多時間。問完之後，同我一齊排一個星期嘅溫習計劃，可以建議每節大約 20–30 分鐘，中間有休息；但先後次序由我決定，你只係提議。」
20–30 分鐘只係起步建議，唔係適用於所有小朋友嘅科學標準；要按孩子專注力、功課量同家庭作息調整。
流程：先問情況 → 孩子揀先後 → 一齊排短節 → 試完再調整。一個星期後同孩子回顧：邊節做到？邊節要改？
帶領提示：大人睇住 AI 回覆；如果 AI 一次問晒、或者直接代孩子決定次序，即刻停低，改寫指令。prompt 唔保證 AI 一定照做。畫面無示範時間表，避免當成真實小朋友嘅計劃。""",
    14: """「8＋7＝14」係本院自編、故意寫錯嘅判斷練習，唔係 Gemini 或任何 AI 嘅真實回覆。
正確答案係 15。示範核實方法：拆數湊十：8＋7＝8＋2＋5＝10＋5＝15；或者用實物／數粒計一次。
三種查證方法：1. 睇原文：返去題目、課本或短文原句對一對。2. 自己計：數學題自己重新計一次。3. 搵可靠來源：事實類資料睇官方或可信網站（例如政府、教育局、課本出版社）。
注意：AI 提供嘅來源連結都要親自打開、讀過內容先算數；有引用唔代表講法正確，連結可能唔存在或者內容唔符。小朋友唔肯定時，請大人一齊查。""",
    15: """以上係本院課堂建議（Sophia／知涵兒童財商學院），唔係法律意見；刪走資料可以減低風險，但唔保證絕對安全。
大人先檢查要用嘅材料同使用許可：有冇真名、學校、班別、電話、地址、相片或者其他人嘅資料？有冇權用呢份材料？
建議優先用自編文字；唔好上載小朋友相片或可以認出身份嘅內容。唔肯定，就唔上載。
本頁冇講 Gemini 嘅私隱設定或資料保留方式；如需了解，請睇 Google 最新官方私隱說明。""",
    16: """練習方法：參加者揀一個日常情境（閱讀短文／收書包／溫習），用 3–4 分鐘寫低角色、任務、規則、例子四個元素。
完整示例（閱讀短文）：「你係閱讀提問老師（角色）。根據我俾你嘅短文問 3 條問題（任務）。一次只問一條，等我答完先問下一條；答錯只俾提示，唔好講答案（規則）。例如：主角點解咁做？（例子）」
兩人一組互相檢查：1. 有冇叫 AI 代做功課或者直接俾答案？2. 有冇放真名、學校、相片或其他個人資料？3. 四個元素齊唔齊？
帶領提示：唔使預先準備參加者答案；請自願者分享，大人一齊改寫。四元素只係本院教學寫法，唔保證 AI 一定照做。""",
    17: """呢個係本院建議嘅親子活動，未經測試，唔保證任何學習成效。
材料：同第 10 頁一樣嘅原創短文：「小兔帶兩枝鉛筆返學，見同桌冇筆，借咗一枝俾佢。放學前，同桌還返枝筆，仲多謝小兔。」
流程（共 5 分鐘）：1 分鐘：大人讀短文，孩子先講自己諗法。3 分鐘：大人操作 Gemini，用閱讀提問老師 prompt，一問一答；孩子用口講答案，大人幫手輸入。1 分鐘：孩子講返今次學到乜。
大人由自己合資格嘅帳戶操作；如果冇 Gemini 可用，大人可以直接口頭問同樣三條問題（小兔做咗乜？點解借鉛筆？如果係你會點做？）。唔需要影孩子相片或截圖。
家長觀察重點：孩子係咪用自己嘅說話解釋，而唔係照讀 AI 嘅句子。""",
    18: """總結：人係主角，AI 係助手。四個習慣：先諗、提問、查證、護私隱。開放 Q&A。
下一步（課程名稱由 Sophia 確認）：家長最強 AI 後盾群組——持續練習同交流；L0 入門工作坊——先體驗；L1 AI思維與溝通——系統學習。
報名方法、日期、收費、地點等最新資料由講者即場口頭提供；投影片冇列連結、QR code、收費或時間表。""",
}


def slide_all_text(slide) -> str:
    parts = []
    for shape in slide.shapes:
        if shape.has_text_frame:
            parts.append(shape.text_frame.text)
    return "\n".join(parts)


def notes_text(slide) -> str:
    if not slide.has_notes_slide:
        return ""
    return slide.notes_slide.notes_text_frame.text


def normalize(s: str) -> str:
    # Normalize newlines only for comparison; keep characters
    return s.replace("\r\n", "\n").replace("\r", "\n").strip()


def main(path: Path | None = None) -> int:
    pptx_path = path or PPTX
    lines: list[str] = []
    ok = True

    lines.append("# A101 18-page PPTX Check Report")
    lines.append("")
    lines.append(f"- Target: `{pptx_path}`")
    lines.append(f"- Size bytes: {pptx_path.stat().st_size if pptx_path.exists() else 0}")

    if not pptx_path.exists() or pptx_path.stat().st_size == 0:
        lines.append("- FAIL: file missing or zero size")
        REPORT.write_text("\n".join(lines), encoding="utf-8")
        print("FAIL")
        return 1

    # OOXML zip + content types
    try:
        with zipfile.ZipFile(pptx_path, "r") as zf:
            names = zf.namelist()
            has_ct = "[Content_Types].xml" in names
            has_slides = any(n.startswith("ppt/slides/slide") for n in names)
            has_png = any(n.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".emf", ".wmf")) for n in names)
            lines.append(f"- OOXML zip: OK ({len(names)} entries)")
            lines.append(f"- Content_Types present: {has_ct}")
            lines.append(f"- Has slide parts: {has_slides}")
            lines.append(f"- Embedded raster/media files: {has_png}")
            if not has_ct or not has_slides:
                ok = False
                lines.append("- FAIL: not a valid PPTX OOXML package")
    except zipfile.BadZipFile:
        lines.append("- FAIL: not a zip/OOXML file")
        REPORT.write_text("\n".join(lines), encoding="utf-8")
        return 1

    prs = Presentation(str(pptx_path))
    n = len(prs.slides)
    lines.append(f"- Slide count (reopened): {n}")
    if n != 18:
        ok = False
        lines.append("- FAIL: expected exactly 18 slides")

    # 16:9 ratio
    w, h = prs.slide_width, prs.slide_height
    ratio = w / h if h else 0
    lines.append(f"- Slide size EMU: {w} x {h} (ratio {ratio:.4f})")
    if abs(ratio - 16 / 9) > 0.01:
        ok = False
        lines.append("- FAIL: not 16:9")
    else:
        lines.append("- Aspect 16:9: PASS")

    # Notes compare
    lines.append("")
    lines.append("## Speaker notes verbatim check")
    for i, slide in enumerate(prs.slides, start=1):
        actual = normalize(notes_text(slide))
        expected = normalize(NOTES[i])
        if actual == expected:
            lines.append(f"- Slide {i:02d}: PASS")
        else:
            ok = False
            lines.append(f"- Slide {i:02d}: FAIL (mismatch)")
            # show short diff hint
            if len(actual) != len(expected):
                lines.append(f"  - len actual={len(actual)} expected={len(expected)}")
            for a, b in zip(actual.split("\n"), expected.split("\n")):
                if a != b:
                    lines.append(f"  - first differing line actual={a[:80]!r}")
                    lines.append(f"  - expected={b[:80]!r}")
                    break

    # Page 12 rules
    lines.append("")
    lines.append("## Page 12 intentional wrong-answer rules")
    s12 = prs.slides[11]
    t12 = slide_all_text(s12)
    n12 = notes_text(s12)
    need = ["教學示範錯題（故意計錯）", "8 + 7 = 14", "你點計㗎？講俾我聽。"]
    for item in need:
        hit = item in t12
        lines.append(f"- On-slide contains `{item}`: {'PASS' if hit else 'FAIL'}")
        if not hit:
            ok = False
    # Must not leak correct sum 15 on page 12 (slide or notes)
    # Avoid false positives: look for standalone 15 / = 15 / 係 15
    leak_pat = re.compile(r"(?<![0-9])15(?![0-9])|＝\s*15|=\s*15|係\s*15")
    leak_slide = bool(leak_pat.search(t12))
    leak_notes = bool(leak_pat.search(n12))
    lines.append(f"- Page 12 slide leaks 15: {'FAIL' if leak_slide else 'PASS (none)'}")
    lines.append(f"- Page 12 notes leak 15: {'FAIL' if leak_notes else 'PASS (none)'}")
    if leak_slide or leak_notes:
        ok = False

    # Page 14 notes must retain 15
    n14 = notes_text(prs.slides[13])
    if "正確答案係 15" in n14 and "10＋5＝15" in n14:
        lines.append("- Page 14 notes retain 15: PASS")
    else:
        ok = False
        lines.append("- Page 14 notes retain 15: FAIL")

    # Cover must not show unconfirmed date/time
    t1 = slide_all_text(prs.slides[0])
    if "2026年12月5日" in t1 or "下午03:00" in t1:
        ok = False
        lines.append("- Cover date/time on slide: FAIL (must stay in notes only)")
    else:
        lines.append("- Cover date/time on slide: PASS (absent)")

    # Page 18 must not list unconfirmed course names on slide
    t18 = slide_all_text(prs.slides[17])
    bad18 = []
    for term in ["L0", "L1", "家長最強 AI 後盾", "AI思維與溝通"]:
        if term in t18:
            bad18.append(term)
    if bad18:
        ok = False
        lines.append(f"- Page 18 unconfirmed course names on slide: FAIL ({bad18})")
    else:
        lines.append("- Page 18 unconfirmed course names on slide: PASS (absent)")

    # Editability: shapes + text frames present; not a single picture per slide
    lines.append("")
    lines.append("## Editability structure")
    for i, slide in enumerate(prs.slides, start=1):
        shapes = list(slide.shapes)
        text_shapes = sum(1 for s in shapes if s.has_text_frame and s.text_frame.text.strip())
        pics = sum(1 for s in shapes if s.shape_type is not None and str(s.shape_type).endswith("PICTURE) ") or getattr(s, "shape_type", None) == 13)
        # shape_type 13 = PICTURE
        pic_count = 0
        for s in shapes:
            try:
                if int(s.shape_type) == 13:
                    pic_count += 1
            except Exception:
                pass
        lines.append(f"- Slide {i:02d}: shapes={len(shapes)}, textboxes/text={text_shapes}, pictures={pic_count}")
        if text_shapes < 2:
            ok = False
            lines.append("  - FAIL: too few editable text objects")
        if pic_count:
            ok = False
            lines.append("  - FAIL: unexpected picture objects")

    lines.append("")
    lines.append("## Layout visual check")
    lines.append("- Method: structural OOXML + python-pptx text/geometry inspection only.")
    lines.append("- Limitation: No GUI PowerPoint / LibreOffice visual render of all 18 pages in this environment.")
    lines.append("- Therefore pixel-perfect overflow/font substitution was NOT visually signed off.")

    lines.append("")
    lines.append(f"## Overall: {'PASS' if ok else 'FAIL'}")
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    print(f"REPORT={REPORT}")
    return 0 if ok else 1


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    raise SystemExit(main(target))
