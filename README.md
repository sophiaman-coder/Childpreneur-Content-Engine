# Childpreneur-Content-Engine
AI-powered content creation system for Childpreneur Academy. Automates Reels editing, subtitles, captions, thumbnails, and educational content production.

## 小老闆大街 Little Boss Street（`game/`）

一個俾 9 – 18 歲小朋友玩嘅創業模擬遊戲，懷舊像素街景風格，全廣東話，有背景音樂同音效。

### 點樣玩
由 $100 開始，20 日內經營自己嘅小店，目標淨資產 $3000（三星 $4500）。

- **街市批發**：入貨（每日價錢唔同，30 件以上九折）
- **我的小店**：定價（即時睇「購買意欲」同「每件利潤」）、升級設備、開舖營業
- **金銀島銀行**：存款收息、借錢付息
- **廣告公司**：傳單、社交媒體、街頭廣告牌
- **創業學堂**：每日一課創業知識 + 問答獎金

每日有天氣同隨機事件（颱風、網紅打卡、檸檬失收…），收舖後有營業報告，教收入、成本、利潤、固定成本、損耗、利息等概念。

操作：方向鍵 / WASD 行路，E / 空格入店；手機或滑鼠可以直接㩒畫面。

### 執行
純 HTML5 + JavaScript，唔使安裝任何嘢：

```bash
cd game
python3 -m http.server 8000
# 打開 http://localhost:8000
```

所有美術用 Canvas 逐點繪畫，所有音效同音樂用 Web Audio 即時合成，冇外部素材。進度會自動儲存喺瀏覽器。
