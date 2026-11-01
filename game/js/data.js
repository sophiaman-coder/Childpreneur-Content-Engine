// 遊戲數據：產品、天氣、事件、升級、廣告、創業知識問答
const GAME_DAYS = 20;
const START_CASH = 100;
// 業主會分階段加租（固定成本上升）
const RENT_SCHEDULE = [{ day: 1, rent: 30 }, { day: 8, rent: 45 }, { day: 15, rent: 60 }];
const rentFor = day => RENT_SCHEDULE.filter(r => r.day <= day).pop().rent;
// 階段目標：喺指定日收舖後檢查淨資產
const MILESTONES = [
  { day: 5, target: 350, reward: 50 },
  { day: 10, target: 900, reward: 100 },
  { day: 15, target: 1800, reward: 150 },
  { day: 20, target: 3000, reward: 0 },
];
// 每局固定嘅天氣分佈（保證有 3 日落雨，其中一日係颱風）
const WEATHER_COUNTS = { hot: 4, sunny: 5, cloudy: 5, rain: 3, cold: 3 };
const GOAL = 3000;
const STAR_LEVELS = [1500, 3000, 4500];

const PRODUCTS = {
  lemontea: {
    id: 'lemontea', name: '凍檸茶', unit: '杯', baseCost: 4, refPrice: 12, traffic: 17,
    color: '#f2c14e', weather: { hot: 1.6, sunny: 1.2, cloudy: 1.0, rain: 0.7, cold: 0.5 },
  },
  eggwaffle: {
    id: 'eggwaffle', name: '雞蛋仔', unit: '份', baseCost: 6, refPrice: 18, traffic: 14,
    color: '#e9a23b', weather: { hot: 0.8, sunny: 1.1, cloudy: 1.1, rain: 0.9, cold: 1.4 },
  },
  pineapplebun: {
    id: 'pineapplebun', name: '菠蘿油', unit: '個', baseCost: 8, refPrice: 24, traffic: 12,
    color: '#d98c3a', weather: { hot: 0.8, sunny: 1.0, cloudy: 1.1, rain: 1.2, cold: 1.3 },
  },
};

const WEATHERS = {
  hot:    { id: 'hot',    name: '酷熱', traffic: 1.0, desc: '好熱呀！大家都想飲凍嘢。' },
  sunny:  { id: 'sunny',  name: '天晴', traffic: 1.1, desc: '天朗氣清，街上好多人。' },
  cloudy: { id: 'cloudy', name: '多雲', traffic: 1.0, desc: '普通一日。' },
  rain:   { id: 'rain',   name: '落雨', traffic: 0.7, desc: '落雨少人出街，但熱食會受歡迎。' },
  cold:   { id: 'cold',   name: '寒冷', traffic: 0.85, desc: '好凍！大家想食熱辣辣嘅嘢。' },
};

// 每個事件可以影響：traffic(人流)、cost(入貨成本)、ref(客人心目中嘅價錢)、rep(聲譽)
const EVENTS = [
  { id: 'sports', title: '學校陸運會', text: '附近學校今日搞陸運會，人流大增！', traffic: 1.5 },
  { id: 'hawker', title: '街頭小販', text: '今日有小販喺附近平價賣凍檸茶，客人對凍檸茶嘅心目價暫時下跌。', ref: { lemontea: 0.8 } },
  { id: 'lemon', title: '檸檬失收', text: '今年檸檬失收，凍檸茶入貨成本大升！', cost: { lemontea: 1.5 } },
  { id: 'influencer', title: '網紅打卡', text: '有網紅喺你間舖打卡，你嘅聲譽上升！', rep: 8 },
  { id: 'typhoon', title: '颱風襲港', text: '颱風來襲，街上冇乜人。可以考慮少入啲貨。', traffic: 0.4, scheduled: true },
  { id: 'flour', title: '麵粉減價', text: '麵粉同牛油減價，雞蛋仔同菠蘿油成本下降！', cost: { eggwaffle: 0.7, pineapplebun: 0.7 } },
  { id: 'tour', title: '旅行團到訪', text: '有旅行團經過，遊客肯畀多少少錢。', traffic: 1.3, ref: { lemontea: 1.15, eggwaffle: 1.15, pineapplebun: 1.15 } },
  { id: 'festival', title: '街坊節', text: '社區搞街坊節，熱鬧非常！', traffic: 1.4 },
  { id: 'sugar', title: '糖價上升', text: '全球糖價上升，所有材料都貴咗少少。', cost: { lemontea: 1.2, eggwaffle: 1.2, pineapplebun: 1.2 } },
];

const UPGRADES = {
  eggwaffle: { id: 'eggwaffle', name: '雞蛋仔爐', price: 200, desc: '解鎖新產品「雞蛋仔」，凍天特別好賣。', unlock: 'eggwaffle' },
  pineapplebun: { id: 'pineapplebun', name: '焗爐', price: 400, desc: '解鎖新產品「菠蘿油」，落雨天特別好賣。', unlock: 'pineapplebun' },
  fridge: { id: 'fridge', name: '大雪櫃', price: 180, desc: '收舖後存貨損耗由 50% 減到 10%。' },
  decor: { id: 'decor', name: '舖面裝修', price: 300, desc: '人流 +15%，每日聲譽 +1。' },
};

const ADS = {
  flyer:  { id: 'flyer',  name: '派傳單',     price: 30,  days: 1, boost: 0.25, rep: 0, desc: '今日人流 +25%' },
  social: { id: 'social', name: '社交媒體廣告', price: 60,  days: 1, boost: 0.35, rep: 3, desc: '今日人流 +35%，聲譽 +3' },
  board:  { id: 'board',  name: '街頭廣告牌',  price: 100, days: 3, boost: 0.40, rep: 0, desc: '連續 3 日人流 +40%' },
};

// 抉擇事件：每個選擇可以有 cash、rep、mods（持續效果）、insure（保險日數）、gamble（機率結果）
// mods 類型：cost（入貨成本倍數）、traffic（人流倍數）、ref（客人心目價倍數）、repDaily（每日聲譽）、expense（每日支出）、commission（收入佣金）
const DILEMMAS = [
  { id: 'cheaplemon', title: '平價檸檬', text: '供應商話：「呢批檸檬唔係好新鮮，但平三成，你要唔要？」',
    lesson: '質素同成本之間要取捨。短期慳錢，可能會影響長期聲譽。',
    options: [
      { label: '要！平啲好', mods: [{ type: 'cost', id: 'lemontea', mult: 0.7, days: 3, label: '平價檸檬（成本 -30%）' }, { type: 'repDaily', amount: -3, days: 3, label: '品質下降（聲譽每日 -3）' }],
        result: '凍檸茶成本平咗三成，但客人覺得味道差咗，之後 3 日每日聲譽 -3。' },
      { label: '唔要，品質緊要', rep: 3, result: '你堅持品質，客人更信任你！聲譽 +3。' },
    ] },
  { id: 'charity', title: '社區義賣', text: '社區中心搞義賣幫助有需要嘅家庭，想你捐 $50。',
    lesson: '「企業社會責任」：回饋社會可以建立品牌形象，但都要量力而為。',
    options: [
      { label: '捐 $50', cash: -50, rep: 8, result: '街坊好欣賞你！聲譽 +8。' },
      { label: '今次唔捐住', result: '冇損失金錢，但錯過咗建立形象嘅機會。' },
    ] },
  { id: 'parttime', title: '請兼職', text: '有個中學生想做兼職，每日人工 $25。有佢幫手，可以招呼多兩成客人。請唔請？',
    lesson: '請人係成本。要計下多咗嘅客帶嚟嘅利潤，夠唔夠付人工。',
    options: [
      { label: '請 4 日', mods: [{ type: 'traffic', mult: 1.2, days: 4, label: '兼職幫手（人流 +20%）' }, { type: 'expense', amount: 25, days: 4, label: '兼職人工' }],
        result: '請咗兼職！之後 4 日人流 +20%，每日人工 $25。' },
      { label: '唔請', result: '慳返人工，自己搞掂！' },
    ] },
  { id: 'kol', title: '網紅合作', text: '網紅「小食少女」話收 $120，幫你拍片宣傳。',
    lesson: '宣傳要計「投資回報」：多咗嘅利潤要多過宣傳費先值得。',
    options: [
      { label: '合作（$120）', cash: -120, rep: 5, mods: [{ type: 'traffic', mult: 1.5, days: 2, label: '網紅效應（人流 +50%）' }], result: '影片爆紅！之後 2 日人流 +50%，聲譽 +5。' },
      { label: '婉拒', result: '慳返 $120。' },
    ] },
  { id: 'delivery', title: '外賣平台', text: '外賣平台邀請你上架：網上客會令人流 +25%，但每蚊收入要抽 15% 佣金。',
    lesson: '佣金會蠶食利潤。要計清楚多咗嘅生意，扣除佣金後係咪仲抵。',
    options: [
      { label: '上架', mods: [{ type: 'traffic', mult: 1.25, days: 99, label: '外賣平台（人流 +25%）' }, { type: 'commission', rate: 0.15, days: 99, label: '平台佣金 15%' }],
        result: '上架咗！以後人流多咗，但每日收入要畀 15% 佣金。' },
      { label: '唔上', result: '保持現狀，唔使畀佣金。' },
    ] },
  { id: 'newflavor', title: '新口味試驗', text: '你諗到新口味「蜜糖檸檬」，研發要 $60。可能大受歡迎，亦可能冇人鍾意。',
    lesson: '創新有風險，但成功可以帶嚟競爭優勢。',
    options: [
      { label: '試！（$60）', cash: -60, gamble: { p: 0.65,
        win: { mods: [{ type: 'ref', id: 'lemontea', mult: 1.2, days: 5, label: '新口味熱賣（凍檸茶心目價 +20%）' }], result: '新口味大受歡迎！之後 5 日客人肯為凍檸茶畀多兩成。' },
        lose: { result: '新口味反應麻麻……今次當學費，下次再試！' } } },
      { label: '唔試', result: '保持原味，穩陣。' },
    ] },
  { id: 'bulkdeal', title: '供應商大優惠', text: '供應商話：「今日一次過畀 $100 訂金，之後 5 日所有貨八五折！」',
    lesson: '預付可以攞到折扣，但要估吓之後會唔會入夠貨，先回本。',
    options: [
      { label: '畀 $100 訂金', cash: -100, mods: [{ type: 'cost', mult: 0.85, days: 5, label: '供應商優惠（全部貨 -15%）' }], result: '之後 5 日所有入貨八五折！' },
      { label: '唔使喇', result: '保留現金，靈活啲。' },
    ] },
];

const INSURANCE = { id: 'insurance', title: '颱風保險', text: '保險經紀話：「颱風季節到喇！$40 買份保險，未來 7 日如果打風，賠你 $200。」',
  lesson: '保險係用細額支出，轉移大損失嘅風險。冇出事都唔係蝕，係買咗安心。',
  options: [
    { label: '買（$40）', cash: -40, insure: 7, result: '買咗保險，打風都唔怕！' },
    { label: '唔買', result: '慳返 $40，希望唔好打風啦……' },
  ] };
const INSURANCE_PAYOUT = 200;

const RIVAL = { id: 'rival', title: '對手開業！', text: '對面開咗間連鎖店「大茶飯」，凍檸茶只賣 $9！客人對凍檸茶嘅心目價會長期下跌。你點應對？',
  lesson: '面對競爭，可以減價，亦可以做出「差異化」，令客人有理由揀你。',
  options: [
    { label: '推出會員印花卡（$80）', cash: -80, rep: 3, mods: [{ type: 'ref', id: 'lemontea', mult: 0.92, days: 99, label: '對手競爭（已應對）' }], result: '熟客儲印花繼續支持你！凍檸茶心目價只跌少少，聲譽 +3。' },
    { label: '唔使錢，同佢鬥平', mods: [{ type: 'ref', id: 'lemontea', mult: 0.8, days: 99, label: '對手競爭（凍檸茶心目價 -20%）' }], result: '凍檸茶心目價跌咗兩成，記得調整定價！' },
  ] };

const ORDER_CLIENTS = ['附近小學', '補習社', '公司開會', '教會聚會', '足球隊', '生日派對'];
const ORDER_PENALTY = 30;
const CRITIC_PAL = { key: 'critic', hair: '#1e1e2a', jacket: '#2a2a30', pants: '#2a2a30', skin: '#f2c29b', cap: '#c8a040' };

const BANK = { savingRate: 0.01, loanRate: 0.03, maxLoan: 500 };

// 每日一課：創業知識 + 問答
const LESSONS = [
  { topic: '成本', text: '「成本」係你整一件貨要用嘅錢。例如一杯凍檸茶要用檸檬、茶葉同杯，加埋就係成本。',
    q: '一杯凍檸茶材料要 $4，你賣 $12，每杯賺幾多？', options: ['$4', '$8', '$12', '$16'], answer: 1,
    explain: '售價 $12 − 成本 $4 = 每杯賺 $8，呢個叫「毛利」。' },
  { topic: '收入同利潤', text: '「收入」係客人畀你嘅錢；「利潤」係收入減晒所有支出之後，真正賺到嘅錢。',
    q: '今日收入 $200，所有支出 $150，利潤係幾多？', options: ['$350', '$200', '$50', '$150'], answer: 2,
    explain: '利潤 = 收入 − 支出 = $200 − $150 = $50。收入多唔等於賺得多！' },
  { topic: '定價', text: '定價太高，客人唔肯買；定價太低，賣得多都可能賺唔到錢。要搵到「啱啱好」嘅價錢。',
    q: '如果你賣價低過成本，賣得越多會點？', options: ['賺得越多', '蝕得越多', '冇影響', '聲譽一定上升'], answer: 1,
    explain: '每賣一件都蝕錢，賣得越多就蝕得越多。定價一定要高過成本。' },
  { topic: '固定成本同變動成本', text: '租金每日都要交，唔理你賣幾多，叫「固定成本」。材料費會跟住你賣幾多而變，叫「變動成本」。',
    q: '以下邊樣係「固定成本」？', options: ['檸檬', '紙杯', '舖租', '糖'], answer: 2,
    explain: '舖租唔會因為你賣多賣少而改變，所以係固定成本。' },
  { topic: '供求', text: '當好多人想買（需求高）而貨唔多（供應少），價錢就會上升；反之亦然。',
    q: '酷熱天氣，凍檸茶嘅需求通常會點？', options: ['上升', '下降', '唔變', '變零'], answer: 0,
    explain: '天氣熱，大家想飲凍嘢，需求自然上升。留意天氣預報入貨！' },
  { topic: '存貨管理', text: '入貨太少會「賣晒」走失客人；入貨太多，賣唔晒嘅貨會變壞，變成損耗。',
    q: '凍檸茶賣唔晒，第二日會點？', options: ['自動變多', '一半會變壞', '可以退錢', '冇事'], answer: 1,
    explain: '新鮮食物會變壞，所以要估好需求先入貨。大雪櫃可以減少損耗。' },
  { topic: '市場推廣', text: '廣告可以帶嚟更多客人，但廣告都要錢。要計下「投資回報」：廣告帶嚟嘅利潤有冇多過廣告費？',
    q: '廣告費 $30，帶多咗 5 個客，每個賺 $8，值唔值？', options: ['值，賺多咗 $10', '唔值，蝕 $10', '打和', '計唔到'], answer: 0,
    explain: '5 × $8 = $40 > $30，賺多咗 $10，呢個廣告值得做！' },
  { topic: '規模經濟', text: '一次過買多啲貨，供應商通常會畀折扣，每件成本就平啲。呢個叫「規模經濟」。',
    q: '喺批發市場一次買 30 件或以上會點？', options: ['貴一成', '平一成', '一樣價', '唔賣畀你'], answer: 1,
    explain: '大量入貨有九折，但記住唔好入太多，賣唔晒會損耗。' },
  { topic: '儲蓄同利息', text: '將錢存入銀行，銀行會畀「利息」你。錢放得越耐，利息越多，叫「複利」。',
    q: '存 $100，每日利息 1%，一日後有幾多？', options: ['$100', '$101', '$110', '$99'], answer: 1,
    explain: '$100 × 1% = $1 利息，所以有 $101。' },
  { topic: '借貸', text: '借錢可以幫你快啲擴充生意，但要還「利息」。借錢之前要諗清楚賺唔賺得返。',
    q: '借 $200，每日利息 3%，一日要付幾多利息？', options: ['$3', '$6', '$20', '$60'], answer: 1,
    explain: '$200 × 3% = $6。借錢有成本，要用嚟做賺錢嘅投資先值得。' },
  { topic: '口碑同聲譽', text: '客人滿意就會介紹朋友嚟，聲譽越高，人流越多。賣晒貨或者定價太貴都會影響聲譽。',
    q: '以下邊樣會令聲譽下跌？', options: ['價錢合理', '客人買唔到貨', '網紅打卡', '舖面裝修'], answer: 1,
    explain: '客人專登嚟但買唔到，會好失望，聲譽就會下跌。' },
  { topic: '多元化', text: '只賣一種貨，遇到壞天氣或者對手競爭就好容易受影響。賣多幾種貨可以分散風險。',
    q: '落雨天凍檸茶唔好賣，可以點？', options: ['閂舖', '賣熱食如菠蘿油', '加價', '唔理佢'], answer: 1,
    explain: '多元化產品可以喺唔同天氣都有生意做。' },
  { topic: '競爭', text: '當對手出現，你可以減價，亦可以做得更好（質素、服務、宣傳）去吸引客人。',
    q: '對手平價賣同樣產品，邊個做法最有創意？', options: ['唔理佢', '推出新產品吸引客', '即刻閂舖', '罵對手'], answer: 1,
    explain: '創新同差異化係打贏競爭嘅好方法！' },
  { topic: '機會成本', text: '用錢做一件事，就唔可以用同一筆錢做另一件事。你放棄咗嘅最好選擇，就叫「機會成本」。',
    q: '你用 $200 買雞蛋仔爐，機會成本可能係？', options: ['冇', '用嚟賣廣告嘅機會', '雞蛋仔', '租金'], answer: 1,
    explain: '同一筆錢唔可以用兩次，做決定前要比較唔同選擇。' },
  { topic: '現金流', text: '就算生意賺錢，如果手上冇現金交租或入貨，都會好麻煩。要留意「現金流」。',
    q: '點解要留返啲現金喺手？', options: ['好睇', '應付明日入貨同租金', '冇用', '銀行唔收'], answer: 1,
    explain: '有足夠現金，先可以繼續營運同把握機會。' },
  { topic: '再投資', text: '賺到錢之後，可以將部分利潤「再投資」落生意，例如買新設備，令將來賺得更多。',
    q: '以下邊樣係「再投資」？', options: ['用利潤買焗爐', '用利潤買玩具', '將錢收埋', '唔開舖'], answer: 0,
    explain: '買焗爐可以賣新產品，增加未來收入，係好嘅再投資。' },
  { topic: '目標客群', text: '了解你嘅客人係邊個、佢哋需要咩，先可以賣啱嘅產品同定啱嘅價錢。',
    q: '旅行團遊客嚟到，通常會點？', options: ['完全唔買嘢', '肯畀多少少錢', '只買平嘢', '要求免費'], answer: 1,
    explain: '唔同客群願意畀嘅價錢唔同，可以靈活調整。' },
  { topic: '風險管理', text: '做生意有風險，例如颱風、成本上升。留意新聞、預留儲備，可以減少損失。',
    q: '聽到颱風消息，入貨應該點？', options: ['入多啲', '少入啲', '入雙倍', '唔使理'], answer: 1,
    explain: '人流少，入少啲貨可以避免損耗。' },
  { topic: '創業精神', text: '創業家會發現問題、提出解決方法、勇於嘗試，失敗咗都會學習再試。',
    q: '生意蝕錢咗，創業家會點做？', options: ['即刻放棄', '分析原因再改善', '怪人', '唔再諗'], answer: 1,
    explain: '失敗係學習嘅機會！分析數據，調整策略再試。' },
  { topic: '淨資產', text: '「淨資產」= 你擁有嘅（現金 + 存款）減去你欠人嘅（貸款）。呢個數字代表你真正有幾多錢。',
    q: '現金 $500、存款 $300、貸款 $200，淨資產係？', options: ['$1000', '$800', '$600', '$300'], answer: 2,
    explain: '$500 + $300 − $200 = $600。' },
];

const TIPS_GENERAL = [
  '留意每朝嘅天氣同新聞，再決定入幾多貨。',
  '定價唔好低過成本，亦唔好高過參考價太多。',
  '一次入 30 件或以上有九折，但小心賣唔晒。',
  '每日去「創業學堂」答問題，可以賺獎金！',
  '賺到錢可以再投資：買新設備、做廣告。',
];
