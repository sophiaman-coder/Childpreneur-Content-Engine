#!/usr/bin/env python3
"""Generate A101 18-page editable widescreen PowerPoint (Sophia AI visual system)."""

from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt
from lxml import etree

OUT_DIR = Path(__file__).resolve().parent
OUT_PPTX = OUT_DIR / "A101_Cursor_18頁試作.pptx"

# 16:9
SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

# Sophia AI palette — blue / white / silver / cool
NAVY = RGBColor(0x0B, 0x1D, 0x36)
DEEP = RGBColor(0x12, 0x2B, 0x4A)
MID = RGBColor(0x1E, 0x5A, 0x96)
BLUE = RGBColor(0x2F, 0x7F, 0xD1)
CYAN = RGBColor(0x4B, 0xC0, 0xE0)
SILVER = RGBColor(0xC5, 0xCD, 0xD8)
ICE = RGBColor(0xE8, 0xF0, 0xF8)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
SOFT = RGBColor(0xF4, 0xF8, 0xFC)
MUTED = RGBColor(0x5A, 0x6F, 0x88)
DANGER = RGBColor(0x3A, 0x6E, 0xA5)  # cool accent, not warm red
WARN_TAG = RGBColor(0x1A, 0x4A, 0x7A)

FONT = "Microsoft JhengHei"
FONT_FALLBACK = "WenQuanYi Micro Hei"


def _set_run_font(run, size_pt: float, bold: bool = False, color: RGBColor = NAVY, font_name: str = FONT):
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.color.rgb = color
    # East Asian font hint for PowerPoint
    rPr = run._r.get_or_add_rPr()
    ea = rPr.find(qn("a:ea"))
    if ea is None:
        ea = etree.SubElement(rPr, qn("a:ea"))
    ea.set("typeface", font_name)


def add_text(
    slide,
    left,
    top,
    width,
    height,
    text: str,
    *,
    size: float = 22,
    bold: bool = False,
    color: RGBColor = NAVY,
    align=PP_ALIGN.LEFT,
    anchor=MSO_ANCHOR.TOP,
    font_name: str = FONT,
):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    try:
        tf._txBody.bodyPr.set("anchor", {MSO_ANCHOR.TOP: "t", MSO_ANCHOR.MIDDLE: "ctr", MSO_ANCHOR.BOTTOM: "b"}[anchor])
    except Exception:
        pass
    lines = text.split("\n") if text else [""]
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        run = p.add_run()
        run.text = line
        _set_run_font(run, size, bold=bold, color=color, font_name=font_name)
    return box


def add_shape(slide, shape_type, left, top, width, height, fill: RGBColor | None, line: RGBColor | None = None, line_w: float = 1.0):
    sh = slide.shapes.add_shape(shape_type, left, top, width, height)
    sh.line.fill.background()
    if fill is None:
        sh.fill.background()
    else:
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
    if line is not None:
        sh.line.color.rgb = line
        sh.line.width = Pt(line_w)
    else:
        sh.line.fill.background()
    return sh


def set_notes(slide, notes_text: str):
    notes_slide = slide.notes_slide
    tf = notes_slide.notes_text_frame
    tf.clear()
    # Preserve verbatim text including newlines
    lines = notes_text.split("\n")
    for i, line in enumerate(lines):
        if i == 0:
            p = tf.paragraphs[0]
            p.text = line
        else:
            p = tf.add_paragraph()
            p.text = line


def brand_bar(slide, light: bool = True):
    """Subtle consistent brand strip — not a second headline."""
    if light:
        add_shape(slide, MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, Inches(0.08), BLUE)
        add_text(slide, Inches(0.55), Inches(0.18), Inches(6), Inches(0.35),
                 "知涵兒童財商學院  ·  A101", size=12, color=MUTED, bold=False)
    else:
        add_shape(slide, MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, Inches(0.08), CYAN)
        add_text(slide, Inches(0.55), Inches(0.18), Inches(6), Inches(0.35),
                 "知涵兒童財商學院  ·  A101", size=12, color=SILVER, bold=False)


def page_num(slide, n: int, light: bool = True):
    color = MUTED if light else SILVER
    add_text(slide, Inches(11.8), Inches(7.05), Inches(1.2), Inches(0.3),
             f"{n:02d} / 18", size=11, color=color, align=PP_ALIGN.RIGHT)


def bg_light(slide):
    add_shape(slide, MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, SLIDE_H, SOFT)
    # cool atmosphere: soft blue panels (editable shapes, not images)
    add_shape(slide, MSO_SHAPE.OVAL, Inches(-1.5), Inches(-2), Inches(5), Inches(5), ICE)
    add_shape(slide, MSO_SHAPE.OVAL, Inches(10.5), Inches(4.5), Inches(4.5), Inches(4.5), ICE)


def bg_dark(slide):
    add_shape(slide, MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, SLIDE_H, NAVY)
    add_shape(slide, MSO_SHAPE.OVAL, Inches(-2), Inches(-1.5), Inches(6), Inches(6), DEEP)
    add_shape(slide, MSO_SHAPE.OVAL, Inches(9), Inches(3.5), Inches(6), Inches(6), DEEP)
    add_shape(slide, MSO_SHAPE.RECTANGLE, 0, Inches(7.2), SLIDE_W, Inches(0.3), DEEP)


def draw_robot(slide, left, top, scale: float = 1.0, accent: RGBColor = CYAN):
    """Editable vector-ish robot from native shapes."""
    def s(v):
        return Emu(int(Inches(v * scale)))

    # body
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, left + s(0.35), top + s(0.95), s(1.1), s(1.25), WHITE, SILVER, 1.5)
    # chest panel
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, left + s(0.55), top + s(1.15), s(0.7), s(0.55), ICE, accent, 1.25)
    add_shape(slide, MSO_SHAPE.OVAL, left + s(0.82), top + s(1.3), s(0.18), s(0.18), accent)
    # head
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, left + s(0.45), top + s(0.25), s(0.9), s(0.7), WHITE, SILVER, 1.5)
    # antenna
    add_shape(slide, MSO_SHAPE.RECTANGLE, left + s(0.85), top + s(0.05), s(0.08), s(0.25), accent)
    add_shape(slide, MSO_SHAPE.OVAL, left + s(0.78), top + s(0.0), s(0.22), s(0.22), accent)
    # eyes
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, left + s(0.58), top + s(0.45), s(0.25), s(0.18), NAVY)
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, left + s(0.97), top + s(0.45), s(0.25), s(0.18), NAVY)
    add_shape(slide, MSO_SHAPE.OVAL, left + s(0.65), top + s(0.48), s(0.1), s(0.1), accent)
    add_shape(slide, MSO_SHAPE.OVAL, left + s(1.04), top + s(0.48), s(0.1), s(0.1), accent)
    # arms
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, left + s(0.05), top + s(1.1), s(0.28), s(0.85), SILVER)
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, left + s(1.47), top + s(1.1), s(0.28), s(0.85), SILVER)
    # legs
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, left + s(0.5), top + s(2.2), s(0.32), s(0.55), SILVER)
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, left + s(0.98), top + s(2.2), s(0.32), s(0.55), SILVER)


def draw_parent_child(slide, left, top, scale: float = 1.0):
    """Simple adult + child silhouettes from shapes (cool palette)."""
    def s(v):
        return Emu(int(Inches(v * scale)))
    # adult
    add_shape(slide, MSO_SHAPE.OVAL, left + s(0.35), top + s(0.1), s(0.55), s(0.55), MID)
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, left + s(0.2), top + s(0.7), s(0.85), s(1.2), BLUE)
    # child
    add_shape(slide, MSO_SHAPE.OVAL, left + s(1.35), top + s(0.55), s(0.4), s(0.4), CYAN)
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, left + s(1.25), top + s(1.0), s(0.6), s(0.85), RGBColor(0x6A, 0xB0, 0xE0))


# ---- Speaker notes (verbatim) ----
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


def slide_01(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_dark(slide)
    # decorative tech lines
    add_shape(slide, MSO_SHAPE.RECTANGLE, Inches(0.55), Inches(2.15), Inches(1.2), Inches(0.06), CYAN)
    add_shape(slide, MSO_SHAPE.RECTANGLE, Inches(0.55), Inches(5.55), Inches(0.6), Inches(0.06), BLUE)
    draw_robot(slide, Inches(9.6), Inches(2.0), scale=1.35, accent=CYAN)
    brand_bar(slide, light=False)
    add_text(slide, Inches(0.55), Inches(1.0), Inches(9), Inches(0.45),
             "知涵兒童財商學院", size=18, color=SILVER, bold=False)
    add_text(slide, Inches(0.55), Inches(1.55), Inches(2), Inches(0.4),
             "A101", size=28, color=CYAN, bold=True)
    add_text(slide, Inches(0.55), Inches(2.35), Inches(9.2), Inches(1.6),
             "基礎人工智能\n應用於兒童教育", size=40, color=WHITE, bold=True)
    add_text(slide, Inches(0.55), Inches(4.35), Inches(8), Inches(0.5),
             "家長及教育工作者工作坊", size=24, color=ICE, bold=False)
    add_text(slide, Inches(0.55), Inches(5.8), Inches(8), Inches(0.4),
             "成人友善 · 科技陪學 · 可編輯示範", size=16, color=MUTED)
    page_num(slide, 1, light=False)
    set_notes(slide, NOTES[1])


def slide_02(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.55), Inches(10), Inches(0.7),
             "今日三個目標", size=36, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(1.2), Inches(10), Inches(0.4),
             "一場成人學習旅程：認識 → 陪學 → 帶走守則", size=18, color=MUTED)

    # journey path visual
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.7), Inches(3.35), Inches(11.8), Inches(0.12), SILVER)
    goals = [
        ("01", "認識 AI", "明白 AI 係咩、點運作"),
        ("02", "陪學唔代做", "用 Gemini 陪學，唔係代做"),
        ("03", "即用守則", "帶走即用 prompt 同私隱安全守則"),
    ]
    xs = [0.9, 5.0, 9.1]
    for i, (num, title, desc) in enumerate(goals):
        x = Inches(xs[i])
        add_shape(slide, MSO_SHAPE.OVAL, x + Inches(0.85), Inches(3.1), Inches(0.55), Inches(0.55), BLUE if i < 2 else CYAN)
        add_text(slide, x + Inches(0.85), Inches(3.18), Inches(0.55), Inches(0.4),
                 num, size=14, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(4.0), Inches(3.2), Inches(2.0), WHITE, SILVER, 1)
        add_text(slide, x + Inches(0.25), Inches(4.2), Inches(2.7), Inches(0.55),
                 title, size=24, color=NAVY, bold=True)
        add_text(slide, x + Inches(0.25), Inches(4.85), Inches(2.7), Inches(0.9),
                 desc, size=16, color=MUTED)
    page_num(slide, 2)
    set_notes(slide, NOTES[2])


def slide_03(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.55), Inches(8), Inches(0.6),
             "AI 係咩？", size=36, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(1.2), Inches(7.5), Inches(1.0),
             "從大量資料學規律嘅電腦程式，\n再用規律去估答案。", size=22, color=MID, bold=False)

    # one scene: phone / map / video / chat as connected daily strip
    items = [
        ("手機人面解鎖", "認住面部特徵先解鎖"),
        ("地圖導航", "學交通規律，估最快路線"),
        ("影片推介", "睇你睇過咩，估你鍾意咩"),
        ("聊天助手 Gemini", "學語言規律，同你傾偈答問"),
    ]
    for i, (t, d) in enumerate(items):
        y = Inches(2.45 + i * 1.05)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), y, Inches(7.8), Inches(0.9), WHITE, SILVER, 1)
        add_shape(slide, MSO_SHAPE.RECTANGLE, Inches(0.55), y, Inches(0.12), Inches(0.9), BLUE if i % 2 == 0 else CYAN)
        add_text(slide, Inches(0.9), y + Inches(0.12), Inches(7), Inches(0.35), t, size=20, color=NAVY, bold=True)
        add_text(slide, Inches(0.9), y + Inches(0.48), Inches(7), Inches(0.35), d, size=16, color=MUTED)

    # right visual: pattern → predict
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.7), Inches(2.45), Inches(4.0), Inches(4.1), NAVY)
    add_text(slide, Inches(9.0), Inches(2.8), Inches(3.4), Inches(0.5), "同一個邏輯", size=18, color=CYAN, bold=True)
    add_text(slide, Inches(9.0), Inches(3.5), Inches(3.4), Inches(2.5),
             "學規律\n　　↓\n估答案", size=28, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_text(slide, Inches(9.0), Inches(5.7), Inches(3.4), Inches(0.5),
             "唔等於全部都係文字生成", size=13, color=SILVER, align=PP_ALIGN.CENTER)
    page_num(slide, 3)
    set_notes(slide, NOTES[3])


def slide_04(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.5), Inches(11), Inches(0.55),
             "生成式 AI 點生成文字？", size=34, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(1.1), Inches(12), Inches(0.4),
             "講得流暢，唔代表講得啱。文字 AI 逐段預測文字，唔等於查證事實。", size=18, color=MID, bold=True)

    steps = [
        ("01", "讀取指令", "睇清楚你問咩、要咩"),
        ("02", "參考對話內容", "連埋之前講過嘅嘢一齊睇"),
        ("03", "預測下一小段文字", "估邊段文字最可能接落去"),
        ("04", "逐段生成", "一段接一段砌成句子"),
        ("05", "輸出回應", "顯示完整答案俾你睇"),
    ]
    for i, (num, title, desc) in enumerate(steps):
        x = Inches(0.4 + i * 2.55)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(2.0), Inches(2.35), Inches(3.6), WHITE, SILVER, 1)
        add_shape(slide, MSO_SHAPE.OVAL, x + Inches(0.75), Inches(2.3), Inches(0.85), Inches(0.85), BLUE)
        add_text(slide, x + Inches(0.75), Inches(2.48), Inches(0.85), Inches(0.5),
                 num, size=18, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
        add_text(slide, x + Inches(0.15), Inches(3.4), Inches(2.05), Inches(1.0),
                 title, size=18, color=NAVY, bold=True, align=PP_ALIGN.CENTER)
        add_text(slide, x + Inches(0.15), Inches(4.5), Inches(2.05), Inches(0.9),
                 desc, size=14, color=MUTED, align=PP_ALIGN.CENTER)
        if i < 4:
            add_shape(slide, MSO_SHAPE.RIGHT_ARROW, x + Inches(2.15), Inches(3.5), Inches(0.35), Inches(0.25), CYAN)
    page_num(slide, 4)
    set_notes(slide, NOTES[4])


def slide_05(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.5), Inches(10), Inches(0.6),
             "7 歲起，大人陪用", size=36, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(1.15), Inches(10), Inches(0.4),
             "＊本院教學原則，唔係 Gemini 帳戶年齡規定", size=16, color=MID, bold=True)

    # big 7
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(1.9), Inches(3.6), Inches(4.6), NAVY)
    add_text(slide, Inches(0.7), Inches(2.3), Inches(3.3), Inches(1.5),
             "7", size=96, color=CYAN, bold=True, align=PP_ALIGN.CENTER)
    add_text(slide, Inches(0.8), Inches(4.0), Inches(3.1), Inches(1.8),
             "本院兒童 AI 課程原則\n課程對象 7–15 歲\n7 歲起開始", size=16, color=WHITE, align=PP_ALIGN.CENTER)

    points = [
        ("大人陪同操作", "家長或老師坐埋一齊用"),
        ("先講自己諗法", "孩子先答，再問 AI"),
        ("唔輸入個人資料", "唔打全名、學校、地址"),
        ("未滿 7 歲", "暫時唔引導佢用 AI"),
    ]
    for i, (t, d) in enumerate(points):
        y = Inches(1.9 + i * 1.15)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(4.5), y, Inches(8.2), Inches(1.0), WHITE, SILVER, 1)
        add_shape(slide, MSO_SHAPE.OVAL, Inches(4.75), y + Inches(0.25), Inches(0.5), Inches(0.5), BLUE)
        add_text(slide, Inches(5.5), y + Inches(0.15), Inches(6.8), Inches(0.4), t, size=22, color=NAVY, bold=True)
        add_text(slide, Inches(5.5), y + Inches(0.55), Inches(6.8), Inches(0.35), d, size=16, color=MUTED)
    page_num(slide, 5)
    set_notes(slide, NOTES[5])


def slide_06(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.5), Inches(10), Inches(0.55),
             "代做 vs 陪學", size=36, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(1.1), Inches(12), Inches(0.4),
             "小朋友負責思考，AI 幫手提問。", size=22, color=MID, bold=True)

    # left: 代做 (dim)
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(1.9), Inches(5.7), Inches(4.5), WHITE, SILVER, 1.5)
    add_shape(slide, MSO_SHAPE.RECTANGLE, Inches(0.55), Inches(1.9), Inches(5.7), Inches(0.7), MUTED)
    add_text(slide, Inches(0.75), Inches(2.05), Inches(5.2), Inches(0.45),
             "代做 ✕", size=26, color=WHITE, bold=True)
    add_text(slide, Inches(0.9), Inches(3.0), Inches(5.0), Inches(2.5),
             "直接寫閱讀答案\n\n照抄 AI 句子\n\n孩子唔使諗", size=22, color=MUTED)

    # right: 陪學
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.9), Inches(1.9), Inches(5.9), Inches(4.5), WHITE, BLUE, 2)
    add_shape(slide, MSO_SHAPE.RECTANGLE, Inches(6.9), Inches(1.9), Inches(5.9), Inches(0.7), BLUE)
    add_text(slide, Inches(7.1), Inches(2.05), Inches(5.5), Inches(0.45),
             "陪學 ✓", size=26, color=WHITE, bold=True)
    add_text(slide, Inches(7.25), Inches(3.0), Inches(5.2), Inches(2.5),
             "逐條問、等孩子答\n\n答錯只俾提示\n\nAI 幫手，唔代寫", size=22, color=NAVY)
    draw_parent_child(slide, Inches(10.2), Inches(5.2), scale=0.7)
    page_num(slide, 6)
    set_notes(slide, NOTES[6])


def slide_07(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.5), Inches(11), Inches(0.55),
             "人係主角・先思後用", size=36, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(1.15), Inches(11), Inches(0.4),
             "先有自己嘅諗法，再請 AI 幫忙。", size=20, color=MID, bold=True)

    steps = [
        ("自己先諗", "先思考、先嘗試", "人"),
        ("AI 幫手", "有需要先參考 AI", "助"),
        ("自己判斷", "查證、揀啱用嘅", "核"),
    ]
    for i, (t, d, mark) in enumerate(steps):
        x = Inches(0.7 + i * 4.1)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(2.1), Inches(3.7), Inches(3.5), WHITE, SILVER, 1)
        add_shape(slide, MSO_SHAPE.OVAL, x + Inches(1.2), Inches(2.4), Inches(1.3), Inches(1.3), NAVY if i != 1 else BLUE)
        add_text(slide, x + Inches(1.2), Inches(2.7), Inches(1.3), Inches(0.8),
                 mark, size=32, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
        add_text(slide, x + Inches(0.25), Inches(4.0), Inches(3.2), Inches(0.5),
                 t, size=24, color=NAVY, bold=True, align=PP_ALIGN.CENTER)
        add_text(slide, x + Inches(0.25), Inches(4.6), Inches(3.2), Inches(0.6),
                 d, size=16, color=MUTED, align=PP_ALIGN.CENTER)
        if i < 2:
            add_shape(slide, MSO_SHAPE.RIGHT_ARROW, x + Inches(3.55), Inches(3.5), Inches(0.45), Inches(0.3), CYAN)

    add_text(slide, Inches(0.55), Inches(6.0), Inches(12), Inches(0.7),
             "參考：教育局「人工智能初探」範疇（試行版）\n畫面上三步係本院整理，唔係教育局逐字原文。",
             size=13, color=MUTED)
    page_num(slide, 7)
    set_notes(slide, NOTES[7])


def slide_08(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.5), Inches(10), Inches(0.55),
             "Gemini 入門", size=36, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(1.1), Inches(12), Inches(0.4),
             "成人工作坊示範：由大人操作，小朋友唔使開帳戶", size=18, color=MID, bold=True)

    # concept mock — labeled
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.2), Inches(1.8), Inches(5.5), Inches(4.7), NAVY)
    add_text(slide, Inches(7.45), Inches(2.0), Inches(5.0), Inches(0.35),
             "教學示意／非真實介面", size=12, color=CYAN, bold=True)
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.55), Inches(2.5), Inches(4.8), Inches(2.8), DEEP)
    add_text(slide, Inches(7.8), Inches(2.7), Inches(4.3), Inches(1.0),
             "自編短文練習…", size=16, color=SILVER)
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.55), Inches(5.5), Inches(3.5), Inches(0.55), BLUE)
    add_text(slide, Inches(7.55), Inches(5.58), Inches(3.5), Inches(0.4),
             "輸入指令（示意）", size=14, color=WHITE, align=PP_ALIGN.CENTER)
    draw_robot(slide, Inches(10.5), Inches(4.6), scale=0.55, accent=CYAN)

    steps = [
        ("01", "家長開啟 Gemini", "用家長自己帳戶，大人操作"),
        ("02", "用自編短文練習", "唔用真名、學校或相片"),
        ("03", "輸入指令，先讀再用", "睇完答案，再判斷啱唔啱"),
    ]
    for i, (num, t, d) in enumerate(steps):
        y = Inches(1.85 + i * 1.45)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), y, Inches(6.3), Inches(1.25), WHITE, SILVER, 1)
        add_text(slide, Inches(0.8), y + Inches(0.2), Inches(1.0), Inches(0.5), num, size=26, color=BLUE, bold=True)
        add_text(slide, Inches(1.9), y + Inches(0.2), Inches(4.6), Inches(0.4), t, size=22, color=NAVY, bold=True)
        add_text(slide, Inches(1.9), y + Inches(0.65), Inches(4.6), Inches(0.4), d, size=16, color=MUTED)
    page_num(slide, 8)
    set_notes(slide, NOTES[8])


def slide_09(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.5), Inches(10), Inches(0.55),
             "好 prompt 四元素", size=36, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(1.1), Inches(12), Inches(0.4),
             "講清楚想點幫，唔係叫 AI 包辦。", size=20, color=MID, bold=True)

    # one composition: stacked formula into one prompt
    elems = [
        ("角色", "你係閱讀提問老師", BLUE),
        ("任務", "根據短文問 3 條問題", MID),
        ("規則", "逐條問，唔提供答案", NAVY),
        ("例子", "例如：主角點解咁做？", CYAN),
    ]
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(1.8), Inches(12.2), Inches(4.7), WHITE, SILVER, 1)
    for i, (label, body, col) in enumerate(elems):
        y = Inches(2.05 + i * 1.05)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.9), y, Inches(2.2), Inches(0.8), col)
        add_text(slide, Inches(0.9), y + Inches(0.2), Inches(2.2), Inches(0.45),
                 label, size=22, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
        add_text(slide, Inches(3.4), y + Inches(0.2), Inches(8.8), Inches(0.5),
                 body, size=22, color=NAVY, bold=False)
        if i < 3:
            add_shape(slide, MSO_SHAPE.DOWN_ARROW, Inches(1.7), y + Inches(0.82), Inches(0.35), Inches(0.22), SILVER)
    page_num(slide, 9)
    set_notes(slide, NOTES[9])


def slide_10(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.45), Inches(10), Inches(0.5),
             "示範：閱讀提問小老師", size=32, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(1.0), Inches(12), Inches(0.35),
             "AI 問，孩子諗。答案由孩子自己講。", size=18, color=MID, bold=True)

    # story panel
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(1.55), Inches(7.3), Inches(3.3), WHITE, SILVER, 1)
    add_text(slide, Inches(0.8), Inches(1.7), Inches(6.8), Inches(0.35),
             "自編短文示範（原創例子，非 AI 回應）", size=14, color=CYAN, bold=True)
    add_text(slide, Inches(0.8), Inches(2.2), Inches(6.8), Inches(2.3),
             "小兔帶兩枝鉛筆返學，見同桌冇筆，\n借咗一枝俾佢。\n放學前，同桌還返枝筆，仲多謝小兔。",
             size=20, color=NAVY)

    steps = [
        ("01", "先讀短文", "大人同孩子一齊讀"),
        ("02", "逐條提問", "AI 一次只問一條"),
        ("03", "自己搵線索", "返去短文搵答案"),
    ]
    for i, (num, t, d) in enumerate(steps):
        x = Inches(0.55 + i * 2.5)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(5.1), Inches(2.35), Inches(1.5), NAVY if i == 1 else WHITE, SILVER, 1)
        tc, dc = (WHITE, SILVER) if i == 1 else (NAVY, MUTED)
        add_text(slide, x + Inches(0.15), Inches(5.25), Inches(2.05), Inches(0.35), f"{num} {t}", size=16, color=tc, bold=True)
        add_text(slide, x + Inches(0.15), Inches(5.7), Inches(2.05), Inches(0.6), d, size=14, color=dc)

    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.1), Inches(1.55), Inches(4.7), Inches(5.05), NAVY)
    add_text(slide, Inches(8.4), Inches(1.85), Inches(4.1), Inches(0.4),
             "示範 prompt（自編）", size=14, color=CYAN, bold=True)
    add_text(slide, Inches(8.4), Inches(2.4), Inches(4.1), Inches(3.5),
             "「逐條問我：\n講咗咩／點解／如果係你。\n\n等我答，\n唔講答案。」",
             size=20, color=WHITE)
    page_num(slide, 10)
    set_notes(slide, NOTES[10])


def slide_11(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.45), Inches(10), Inches(0.5),
             "示範：寫作提問教練", size=32, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(1.0), Inches(12), Inches(0.35),
             "情境：落雨天返學　｜　先問清楚，自己落筆。", size=18, color=MID, bold=True)

    qs = [
        ("1", "人物", "主角係邊個？"),
        ("2", "地點", "喺邊度？"),
        ("3", "事件", "跟住發生咗咩？"),
        ("4", "感受", "當時覺得點？"),
        ("5", "結尾", "最後點收尾？"),
    ]
    for i, (num, t, d) in enumerate(qs):
        x = Inches(0.45 + i * 2.55)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(1.7), Inches(2.4), Inches(3.3), WHITE, SILVER, 1)
        add_shape(slide, MSO_SHAPE.OVAL, x + Inches(0.75), Inches(2.0), Inches(0.9), Inches(0.9), BLUE)
        add_text(slide, x + Inches(0.75), Inches(2.2), Inches(0.9), Inches(0.55),
                 num, size=26, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
        add_text(slide, x + Inches(0.15), Inches(3.15), Inches(2.1), Inches(0.45),
                 t, size=22, color=NAVY, bold=True, align=PP_ALIGN.CENTER)
        add_text(slide, x + Inches(0.15), Inches(3.7), Inches(2.1), Inches(0.9),
                 d, size=15, color=MUTED, align=PP_ALIGN.CENTER)

    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(5.3), Inches(12.2), Inches(1.35), NAVY)
    add_text(slide, Inches(0.85), Inches(5.5), Inches(11.6), Inches(1.0),
             "示範 prompt：「逐條問：人物、地點、事件、感受、結尾。唔寫範文。」\n一次一問 · 不代寫句子 · 孩子自己落筆",
             size=18, color=WHITE)
    page_num(slide, 11)
    set_notes(slide, NOTES[11])


def slide_12(prs):
    """Must show intentional wrong sum 8+7=14; NEVER show 15 on this slide."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.4), Inches(10), Inches(0.5),
             "示範：錯題只俾提示", size=32, color=NAVY, bold=True)

    # intentional wrong problem — explicit label
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(1.05), Inches(6.5), Inches(3.5), WHITE, BLUE, 2)
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.75), Inches(1.25), Inches(4.6), Inches(0.45), WARN_TAG)
    add_text(slide, Inches(0.75), Inches(1.32), Inches(4.6), Inches(0.35),
             "教學示範錯題（故意計錯）", size=14, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_text(slide, Inches(0.9), Inches(2.0), Inches(5.8), Inches(1.2),
             "8 + 7 = 14", size=48, color=NAVY, bold=True, align=PP_ALIGN.CENTER)
    add_text(slide, Inches(0.9), Inches(3.4), Inches(5.8), Inches(0.7),
             "你點計㗎？講俾我聽。", size=24, color=MID, bold=True, align=PP_ALIGN.CENTER)

    # three layered hints
    add_text(slide, Inches(7.4), Inches(1.05), Inches(5.3), Inches(0.4),
             "由上至下　逐步增加提示 ↓", size=16, color=MUTED, bold=True)
    hints = [
        ("提示 1", "指方向"),
        ("提示 2", "縮細範圍"),
        ("提示 3", "俾起步"),
    ]
    for i, (a, b) in enumerate(hints):
        y = Inches(1.55 + i * 1.15)
        w = Inches(4.8 - i * 0.15)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.4), y, w, Inches(1.0),
                  NAVY if i == 0 else (BLUE if i == 1 else CYAN))
        add_text(slide, Inches(7.6), y + Inches(0.15), Inches(4.3), Inches(0.35),
                 a, size=18, color=WHITE, bold=True)
        add_text(slide, Inches(7.6), y + Inches(0.5), Inches(4.3), Inches(0.35),
                 b, size=16, color=ICE)

    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(4.85), Inches(12.2), Inches(1.7), NAVY)
    add_text(slide, Inches(0.85), Inches(5.1), Inches(11.6), Inches(1.3),
             "示範 prompt：「一次只俾一個提示，等我試咗先繼續。唔講答案。」\n提示可以多一點，答案留俾孩子。",
             size=18, color=WHITE)
    page_num(slide, 12)
    set_notes(slide, NOTES[12])


def slide_13(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.45), Inches(11), Inches(0.5),
             "示範：溫習時間表顧問", size=32, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(1.0), Inches(12), Inches(0.35),
             "AI 提議，孩子決定，試完再改。", size=18, color=MID, bold=True)

    flow = [
        ("01", "先問情況", "科目？最弱一課？\n每日可用時間？"),
        ("02", "孩子揀先後", "邊科先溫，\n由孩子決定"),
        ("03", "一齊排短節", "每節短少少，\n中間休息"),
        ("04", "試完再調整", "做唔到就改，\n再試"),
    ]
    for i, (num, t, d) in enumerate(flow):
        x = Inches(0.5 + i * 3.2)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(1.7), Inches(2.95), Inches(3.4), WHITE, SILVER, 1)
        add_shape(slide, MSO_SHAPE.OVAL, x + Inches(0.95), Inches(2.0), Inches(1.0), Inches(1.0), BLUE)
        add_text(slide, x + Inches(0.95), Inches(2.25), Inches(1.0), Inches(0.55),
                 num, size=20, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
        add_text(slide, x + Inches(0.2), Inches(3.2), Inches(2.55), Inches(0.5),
                 t, size=20, color=NAVY, bold=True, align=PP_ALIGN.CENTER)
        add_text(slide, x + Inches(0.2), Inches(3.8), Inches(2.55), Inches(1.0),
                 d, size=15, color=MUTED, align=PP_ALIGN.CENTER)
        if i < 3:
            add_shape(slide, MSO_SHAPE.RIGHT_ARROW, x + Inches(2.85), Inches(3.1), Inches(0.3), Inches(0.25), CYAN)

    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(5.4), Inches(12.2), Inches(1.25), NAVY)
    add_text(slide, Inches(0.85), Inches(5.6), Inches(11.6), Inches(0.9),
             "示範 prompt：「先問我科目、最弱一課、每日可用時間，再同我一齊排；先後由我決定。」",
             size=17, color=WHITE)
    page_num(slide, 13)
    set_notes(slide, NOTES[13])


def slide_14(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.45), Inches(10), Inches(0.5),
             "查過先信　｜　AI 小判官", size=32, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(1.0), Inches(12), Inches(0.4),
             "自編判斷練習（故意計錯，非真實 AI 回覆）", size=16, color=MID, bold=True)

    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(1.6), Inches(6.3), Inches(2.6), WHITE, SILVER, 1)
    add_text(slide, Inches(0.85), Inches(1.85), Inches(5.7), Inches(0.9),
             "8＋7＝14，啱唔啱？\n用咩方法核實？", size=26, color=NAVY, bold=True)
    add_text(slide, Inches(0.85), Inches(3.1), Inches(5.7), Inches(0.8),
             "講得似真　｜　語氣好肯定\n唔代表一定啱", size=18, color=MUTED)

    methods = [
        ("睇原文", "返去題目／短文對一對"),
        ("自己計", "數學題自己重新計"),
        ("搵可靠來源", "官方／可信網站"),
    ]
    for i, (t, d) in enumerate(methods):
        x = Inches(7.1)
        y = Inches(1.6 + i * 1.15)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(5.6), Inches(1.0), NAVY if i == 0 else WHITE, SILVER, 1)
        tc, dc = (WHITE, SILVER) if i == 0 else (NAVY, MUTED)
        add_text(slide, x + Inches(0.3), y + Inches(0.15), Inches(5.0), Inches(0.35), t, size=20, color=tc, bold=True)
        add_text(slide, x + Inches(0.3), y + Inches(0.52), Inches(5.0), Inches(0.35), d, size=15, color=dc)

    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(4.6), Inches(12.2), Inches(2.0), BLUE)
    add_text(slide, Inches(0.9), Inches(4.9), Inches(11.5), Inches(1.4),
             "我唔照抄，我會查吓先。\n唔肯定？請大人幫手一齊查", size=24, color=WHITE, bold=True)
    page_num(slide, 14)
    set_notes(slide, NOTES[14])


def slide_15(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.45), Inches(11), Inches(0.5),
             "私隱安全：先刪資料", size=34, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(1.05), Inches(12), Inches(0.35),
             "先保護私隱，再請 AI 幫手。", size=20, color=MID, bold=True)

    rules = [
        ("唔放真名、學校、電話地址", "亦唔放班別等可識別資料"),
        ("唔放清晰面孔或他人資料", "唔用小朋友相片"),
        ("只用自編／已移除個資嘅材料", "大人先檢查材料同使用許可"),
        ("唔肯定，就唔上載", "刪資料減低風險，唔保證絕對安全"),
    ]
    for i, (t, d) in enumerate(rules):
        col = i % 2
        row = i // 2
        x = Inches(0.55 + col * 6.35)
        y = Inches(1.7 + row * 2.2)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(6.0), Inches(1.9), WHITE, SILVER, 1)
        add_shape(slide, MSO_SHAPE.OVAL, x + Inches(0.3), y + Inches(0.55), Inches(0.8), Inches(0.8), BLUE)
        add_text(slide, x + Inches(0.3), y + Inches(0.7), Inches(0.8), Inches(0.5),
                 "✕", size=24, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
        add_text(slide, x + Inches(1.4), y + Inches(0.4), Inches(4.3), Inches(0.7), t, size=20, color=NAVY, bold=True)
        add_text(slide, x + Inches(1.4), y + Inches(1.15), Inches(4.3), Inches(0.5), d, size=15, color=MUTED)
    page_num(slide, 15)
    set_notes(slide, NOTES[15])


def slide_16(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.4), Inches(11), Inches(0.5),
             "即場練習：寫一條 prompt", size=32, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(0.95), Inches(12), Inches(0.35),
             "3–4 分鐘　｜　揀一個情境，寫低四元素。", size=18, color=MID, bold=True)

    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(1.5), Inches(4.0), Inches(3.3), NAVY)
    add_text(slide, Inches(0.8), Inches(1.75), Inches(3.5), Inches(0.4), "情境", size=16, color=CYAN, bold=True)
    add_text(slide, Inches(0.8), Inches(2.3), Inches(3.5), Inches(2.0),
             "閱讀\n收書包\n溫習", size=28, color=WHITE, bold=True)

    elems = [
        ("角色", "AI 扮演邊個？"),
        ("任務", "要 AI 做咩？"),
        ("規則", "點樣幫、唔幫咩？"),
        ("例子", "俾一個例句"),
    ]
    for i, (t, d) in enumerate(elems):
        x = Inches(4.9 + (i % 2) * 4.0)
        y = Inches(1.5 + (i // 2) * 1.65)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.7), Inches(1.45), WHITE, SILVER, 1)
        add_text(slide, x + Inches(0.25), y + Inches(0.25), Inches(3.2), Inches(0.4), t, size=22, color=BLUE, bold=True)
        add_text(slide, x + Inches(0.25), y + Inches(0.75), Inches(3.2), Inches(0.45), d, size=16, color=MUTED)

    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(5.1), Inches(12.2), Inches(1.55), BLUE)
    add_text(slide, Inches(0.85), Inches(5.3), Inches(11.6), Inches(1.2),
             "寫完互查：有冇叫 AI 代做？　有冇個人資料？　四元素齊唔齊？\n我講清楚，AI 先幫得啱。",
             size=20, color=WHITE, bold=True)
    page_num(slide, 16)
    set_notes(slide, NOTES[16])


def slide_17(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_light(slide)
    brand_bar(slide)
    add_text(slide, Inches(0.55), Inches(0.4), Inches(11), Inches(0.5),
             "今晚 5 分鐘　親子活動", size=32, color=NAVY, bold=True)
    add_text(slide, Inches(0.55), Inches(0.95), Inches(12), Inches(0.35),
             "先自己諗，再用 AI 幫手。　所需：一段短文＋大人操作 Gemini", size=16, color=MID, bold=True)

    phases = [
        ("1 分鐘", "孩子先講諗法", BLUE),
        ("3 分鐘", "大人操作，一問一答", NAVY),
        ("1 分鐘", "孩子講返學到乜", CYAN),
    ]
    for i, (t, d, col) in enumerate(phases):
        x = Inches(0.55 + i * 4.2)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(1.6), Inches(3.95), Inches(3.5), WHITE, SILVER, 1)
        add_shape(slide, MSO_SHAPE.RECTANGLE, x, Inches(1.6), Inches(3.95), Inches(0.9), col)
        add_text(slide, x + Inches(0.2), Inches(1.8), Inches(3.55), Inches(0.55),
                 t, size=26, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
        add_text(slide, x + Inches(0.3), Inches(3.0), Inches(3.35), Inches(1.5),
                 d, size=24, color=NAVY, bold=True, align=PP_ALIGN.CENTER)
        # width bar reflecting time weight
        bar_w = Inches(0.9 if i != 1 else 2.7)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x + Inches(0.4), Inches(4.5), bar_w, Inches(0.25), col)

    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(5.4), Inches(12.2), Inches(1.25), NAVY)
    add_text(slide, Inches(0.85), Inches(5.6), Inches(11.6), Inches(0.9),
             "家長留意：孩子係咪用自己嘅說話講返？\n冇 Gemini 亦可：大人口頭問同樣三題。",
             size=18, color=WHITE)
    page_num(slide, 17)
    set_notes(slide, NOTES[17])


def slide_18(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg_dark(slide)
    brand_bar(slide, light=False)
    draw_robot(slide, Inches(10.2), Inches(3.8), scale=0.95, accent=CYAN)
    add_text(slide, Inches(0.55), Inches(1.3), Inches(11), Inches(1.4),
             "人係主角，\nAI 係助手。", size=44, color=WHITE, bold=True)
    add_text(slide, Inches(0.55), Inches(3.2), Inches(11), Inches(0.6),
             "先諗　·　提問　·　查證　·　護私隱", size=26, color=CYAN, bold=True)
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(4.3), Inches(3.2), Inches(1.1), BLUE)
    add_text(slide, Inches(0.55), Inches(4.55), Inches(3.2), Inches(0.6),
             "Q & A", size=32, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_text(slide, Inches(0.55), Inches(5.7), Inches(10), Inches(0.7),
             "下一步：持續練習（詳情由講者即場說明）\n待確認課程名稱見講者備註，畫面不列招生資訊。",
             size=14, color=SILVER)
    page_num(slide, 18, light=False)
    set_notes(slide, NOTES[18])


def build():
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    # ensure blank layout exists
    builders = [
        slide_01, slide_02, slide_03, slide_04, slide_05, slide_06, slide_07, slide_08, slide_09,
        slide_10, slide_11, slide_12, slide_13, slide_14, slide_15, slide_16, slide_17, slide_18,
    ]
    for fn in builders:
        fn(prs)

    if OUT_PPTX.exists():
        # never silently overwrite — write versioned file
        from datetime import datetime
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        alt = OUT_DIR / f"A101_Cursor_18頁試作_{stamp}.pptx"
        prs.save(str(alt))
        print(f"EXISTING_KEPT={OUT_PPTX}")
        print(f"SAVED_NEW={alt}")
        return alt
    prs.save(str(OUT_PPTX))
    print(f"SAVED={OUT_PPTX}")
    return OUT_PPTX


if __name__ == "__main__":
    build()
