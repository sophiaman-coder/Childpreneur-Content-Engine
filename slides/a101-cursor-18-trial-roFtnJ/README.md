# A101 18 頁試作（本地生成）

## 成品

- `A101_Cursor_18頁試作.pptx` — 正好 18 頁、16:9、可編輯文字／原生形狀（含機械人組合）

## 重做

```bash
cd /workspace/slides/a101-cursor-18-trial-roFtnJ
python3 -m pip install python-pptx
python3 generate_a101.py
python3 validate_a101.py
```

若指定成品已存在，產生器會保留舊檔並另存時間戳版本，不會靜默覆寫。

## 依賴

- Python 3 + `python-pptx`
- 開啟時建議有繁中字型（例如 Microsoft JhengHei／微軟正黑體）；本機若無，PowerPoint 可能替換字型

## 檢查

`validate_a101.py` 會重新開啟 PPTX，核對：頁數、16:9、18 頁 speaker notes 逐字、第 12 頁錯題規則、第 14 頁備註保留 15、封面無日期、第 18 頁無待確認課程名、無可編輯圖片頁。報告寫入 `CHECK_REPORT.md`。
