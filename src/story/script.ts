// ============================================================================
// script.ts — 《電的時光旅人 CHRONOAMPERE》穿越時空的科學史探險（全繁中）
// 玩家搭乘「時光電弧儀」回到電磁學六個關鍵時刻，重現實驗、收集殘頁，
// 最後解開一道時間迴圈（bootstrap 悖論）的海龜湯。
// ============================================================================

export type ChallengeId =
  | 'lamp' | 'split' | 'cyclo' | 'maglock' | 'dynamo' | 'xfmr'

export type Scene = 'intro' | 'hub' | ChallengeId | 'finale'

export const CHALLENGE_ORDER: ChallengeId[] = ['lamp', 'split', 'cyclo', 'maglock', 'dynamo', 'xfmr']

export const PROLOGUE = {
  title: '電的時光旅人',
  subtitle: 'CHRONOAMPERE ── 穿越時空的科學史探險',
  lines: [
    '西元 2225 年，你是時空電學研究所最後一名研究生。',
    '導師失蹤前留下一台「時光電弧儀」與一句話：',
    '「電磁學的六項關鍵發現，被人動了手腳。去把它們重現回來。」',
    '',
    '於是你回到了過去，走進歐姆、克希何夫、湯姆森、布勞恩、',
    '法拉第與變壓器黎明的實驗室，一一重現他們的實驗。',
    '',
    '但每到一處，你都在科學家的筆記裡發現「同一張紙條」──',
    '字跡相同、夾在不同年代、不同國家、互不相識的六人之間，',
    '而每位科學家都說：這張紙條「一直都在」。',
    '',
    '它從哪裡來？是誰留下的？重現六項實驗，收集六張殘頁，',
    '在時間的盡頭，拼出真相。',
  ],
}

export interface Quiz {
  q: string
  options: string[]
  correct: number
  explain: string
}

export interface ChallengeMeta {
  id: ChallengeId
  chapter: string
  system: string
  title: string
  doorColor: string
  goalHint: string
  npcBefore: string
  clueTag: string
  clue: string
  quiz: Quiz
}

export const CHALLENGES: Record<ChallengeId, ChallengeMeta> = {
  lamp: {
    id: 'lamp',
    chapter: 'Ch1 電路學 ── 歐姆定律（1827・歐姆）',
    system: '1827・歐姆的書房',
    title: '第一站：歐姆的串聯電路',
    doorColor: '#fbbf24',
    goalHint:
      '歐姆的串聯電路。同時達成 ① 電源 ε = 8.0 V ② 主燈電流 I = 0.85 A（可直接用滑鼠拖曳變阻器滑塊微調）③ 燈絲不可燒毀。按 ▶啟動 觀察燈絲升溫發光。',
    npcBefore:
      '時光電弧儀降落在 1827 年。歐姆正為電阻定律苦惱──重現他的串聯電路，確認電流與電壓的正比關係。',
    clueTag: '殘頁・一',
    clue: '歐姆桌上夾著一張紙條，邊角寫著一個 1881 年才被命名的單位符號：Ω。可現在，是 1827 年。',
    quiz: {
      q: '在這個串聯電路中，把可變電阻 Rv 調大，主燈會如何變化？',
      options: ['變亮', '變暗（電流變小）', '亮度不變', '立刻燒毀'],
      correct: 1,
      explain: '串聯時總電阻增加，I = ε /R 變小，燈絲功率 I²R 下降 → 變暗。',
    },
  },
  split: {
    id: 'split',
    chapter: 'Ch1 電路學 ── 克希何夫定律（1845・克希何夫）',
    system: '1845・克希何夫的電路',
    title: '第二站：克希何夫的並聯電路',
    doorColor: '#f59e0b',
    goalHint:
      '克希何夫的並聯電路。同時達成 ① 支路2 電流 I2 = 0.60 A ② 支路1 電流 I1 落在 0.45–0.75 A ③ 總電流不超過保險絲 3 A。電池跨接上下兩條匯流排。',
    npcBefore:
      '1845 年，21 歲的克希何夫正在推導他的電路定律。重現並聯電路，驗證節點處「流入電流＝流出電流」。',
    clueTag: '殘頁・二',
    clue: '克希何夫的那張紙條，字跡竟和你的一模一樣。',
    quiz: {
      q: '兩個電阻並聯接在同一電池上，下列敘述何者正確？',
      options: [
        '兩支路電壓相同，電流依電阻成反比分配',
        '兩支路電流必定相同',
        '並聯總電阻大於任一支路電阻',
        '電流只會走電阻較小的那條',
      ],
      correct: 0,
      explain: '並聯各支路共用同一電壓 V；I = V/R，故電阻越小電流越大（反比分配）。並聯總電阻比任一支路都小。',
    },
  },
  cyclo: {
    id: 'cyclo',
    chapter: 'Ch2 電流的磁效應 ── 電子的發現（1897・湯姆森）',
    system: '1897・湯姆森的卡文迪西實驗室',
    title: '第三站：湯姆森測電子荷質比',
    doorColor: '#5eead4',
    goalHint:
      'e/m 荷質比實驗：亥姆霍茲線圈使電子束偏轉成圓。同時達成 ① 加速電壓 V = 200 V ② 調線圈電流 I 使電子束半徑 r = 5.0 cm（與目標環重合）③ 記錄 3 組數據求平均 e/m。r = m v /(e B)。放開滑桿、數值穩定後才算過關。',
    npcBefore:
      '1897 年，湯姆森即將證明「陰極射線是一種粒子」。重現他的 e/m 裝置，量出電子的荷質比。',
    clueTag: '殘頁・三',
    clue: '紙條背面，印著一張你那個時代的車票，日期在兩百年後。',
    quiz: {
      q: 'e/m 實驗中固定加速電壓、增大線圈電流（磁場變強），電子束圓半徑會？',
      options: ['變大', '不變', '變小', '先變大再變小'],
      correct: 2,
      explain: 'r = m v /(e B)。v 由加速電壓決定不變，B 變大 → r 變小。',
    },
  },
  maglock: {
    id: 'maglock',
    chapter: 'Ch2 電流的磁效應 ── 陰極射線偏轉（1897・布勞恩）',
    system: '1897・布勞恩的陰極射線管',
    title: '第四站：布勞恩的 CRT 偏轉',
    doorColor: '#34d399',
    goalHint:
      '陰極射線管偏轉（三耦合條件）：① 加速電壓 Va = 2000 V ② 調偏轉電壓 Vd，使「電場單獨偏轉」y_E = −3 cm ③ 再加磁場 B，使磁偏轉蓋過電偏轉、把螢幕總偏轉 y 反向拉到 +1 cm（橙色目標環）。三滑桿互相牽制。放開穩定後才算過關。',
    npcBefore:
      '1897 年，布勞恩做出第一支陰極射線管。重現電場與磁場對電子束的偏轉，校準螢幕上的光點。',
    clueTag: '殘頁・四',
    clue: '布勞恩說這張紙條「從我祖父那輩就在了」──但紙上的墨水，化驗結果是現代的。',
    quiz: {
      q: '陰極射線管中，只開電場偏轉板（無磁場），電子束在板間做何種運動？',
      options: ['等速直線運動', '圓周運動', '類平拋（拋物線）運動', '靜止不動'],
      correct: 2,
      explain: '板間電場給電子一個垂直的等加速度，水平等速、垂直加速 → 類平拋（拋物線）。',
    },
  },
  dynamo: {
    id: 'dynamo',
    chapter: 'Ch3 電磁感應 ── 電磁感應與發電機（1831・法拉第）',
    system: '1831・法拉第的感應線圈',
    title: '第五站：法拉第的交流發電機',
    doorColor: '#38bdf8',
    goalHint:
      '法拉第的交流發電機。同時達成 ① 峰值 ε_max = 10.5 V ② 頻率 ω 在 9–11 rad/s。ε_max = N B A ω。觀察示波器：磁通 φ 為零的瞬間，ε 恰為峰值。',
    npcBefore:
      '1831 年，法拉第發現了電磁感應。重現他的轉動線圈，讓磁通量的變化生出感應電動勢。',
    clueTag: '殘頁・五',
    clue: '法拉第在日記寫下：「那位安靜的訪客，總在我快放棄時出現，留下一行算式就離開。」',
    quiz: {
      q: '線圈在磁場中轉動，感應電動勢峰值 ε_max 與轉速 ω 的關係為何？',
      options: ['與 ω 無關', '與 ω 成正比', '與 ω 平方成正比', '與 ω 成反比'],
      correct: 1,
      explain: 'ε_max = N B A ω，與角速度 ω 成正比（轉得越快、磁通變化越快、電動勢越大）。',
    },
  },
  xfmr: {
    id: 'xfmr',
    chapter: 'Ch3 電磁感應 ── 變壓器（1885・交流電黎明）',
    system: '1885・交流電的黎明',
    title: '第六站：降壓變壓器',
    doorColor: '#818cf8',
    goalHint:
      '變壓器。同時達成 ① 初級 V1 = 120 V（市電）② 選次級匝數 N2 使輸出 V2 = 12 V。V2 = V1·N2/N1。讀數顯示電流比與功率守恆。',
    npcBefore:
      '1885 年，交流電即將點亮世界。重現變壓器，用匝數比把高壓降成設備可用的低壓。',
    clueTag: '殘頁・六',
    clue: '最後一張殘頁只有一句話：「當你讀到這裡，迴圈就要閉合了。」',
    quiz: {
      q: '理想變壓器初級 120 V、N1 = 240 匝，要輸出 12 V，次級匝數 N2 應為？',
      options: ['24 匝', '2400 匝', '120 匝', '12 匝'],
      correct: 0,
      explain: 'V2/V1 = N2/N1 → N2 = N1·V2/V1 = 240 × 12/120 = 24 匝。',
    },
  },
}

// ============================================================================
// 海龜湯提問系統：玩家主動提問，AMP 只回答「是 / 否 / 與真相無關」。
// 問題隨殘頁進度解鎖（unlockAt = 已收集殘頁數），免費提問次數有限。
// 內含紅鯡魚（導師、第七張殘頁）誘導玩家驗證錯誤假設。
// ============================================================================
export type SoupAnswer = 'yes' | 'no' | 'irrelevant'

export interface SoupQuestion {
  id: string
  text: string
  answer: SoupAnswer
  detail: string // AMP 回答後補充的一句話（不直接洩底）
  unlockAt: number // 需要的殘頁數
}

export const QUESTION_BUDGET = 10

export const SOUP_QUESTIONS: SoupQuestion[] = [
  { id: 'q-same-person', text: '六張紙條是同一個人寫的嗎？', answer: 'yes', detail: '字跡完全一致——筆壓、轉折，連墨點的習慣都相同。', unlockAt: 1 },
  { id: 'q-contemporary', text: '寫紙條的人和這些科學家生活在同一個年代嗎？', answer: 'no', detail: '至少，「同一個」年代放不下他們六位。', unlockAt: 1 },
  { id: 'q-ink', text: '紙條的墨水是那些年代當時的墨水嗎？', answer: 'no', detail: '化驗結果顯示成分屬於兩百年後的配方。', unlockAt: 2 },
  { id: 'q-scientists-met', text: '六位科學家彼此見過寫紙條的人嗎？', answer: 'yes', detail: '法拉第的日記提到「安靜的訪客」。其他人……也許也見過，只是沒寫下來。', unlockAt: 2 },
  { id: 'q-mentor', text: '紙條是失蹤的導師留下的嗎？', answer: 'no', detail: '導師的字跡與紙條不符。但導師顯然知道紙條的存在。', unlockAt: 2 },
  { id: 'q-forgery', text: '紙條是後人偽造、再塞進史料的嗎？', answer: 'no', detail: '六位科學家在「當下」就親眼見過它、用過它。', unlockAt: 3 },
  { id: 'q-seventh', text: '存在第七張殘頁嗎？', answer: 'irrelevant', detail: '就算有，它也不會改變紙條「從何而來」的答案。', unlockAt: 3 },
  { id: 'q-time-travel', text: '寫紙條的人能在不同年代之間移動嗎？', answer: 'yes', detail: '否則無法解釋同一份字跡橫跨七十年。', unlockAt: 3 },
  { id: 'q-changed-history', text: '紙條改變了歷史原本的樣子嗎？', answer: 'no', detail: '微妙的是——歷史「原本的樣子」，也許本來就含著這張紙條。', unlockAt: 4 },
  { id: 'q-handwriting', text: '我見過紙條上的字跡嗎？', answer: 'yes', detail: 'AMP 沉默了一會兒：「……你每天都見到它。」', unlockAt: 4 },
  { id: 'q-first-write', text: '紙條存在「第一次被寫下」的時刻嗎？', answer: 'no', detail: '這正是它最不可思議的地方。沒有起點。', unlockAt: 5 },
  { id: 'q-i-wrote', text: '寫下紙條的人……此刻就在時光電弧儀裡嗎？', answer: 'yes', detail: 'AMP 沒有再說話。艙內只剩你自己的呼吸聲。', unlockAt: 5 },
]

export const FINALE = {
  question:
    '六個年代、六位互不相識的科學家，筆記裡都夾著同一張字跡相同的紙條，每人都說「它一直都在」。這張紙條從何而來、是誰留下的？',
  options: [
    {
      key: 'A',
      text: '一位與六人同時代的神秘信使，奉某個祕密學會之命，在七十年間分別把紙條送到六位科學家手中。',
      correct: false,
      reason:
        '不對。紙上有 1881 年才被命名的符號、化驗出現代墨水，且字跡是「你」的──同時代的信使無法解釋這些。',
    },
    {
      key: 'B',
      text: '是穿越時空的你：每次重現實驗後，你留下了那張紙條。你來自他們的未來、卻把它放進他們的過去──它因此沒有起點，是一個自我閉合的因果迴圈。',
      correct: true,
      reason:
        '正是如此。紙條沒有「第一次」被寫下：它的存在，就是你這趟旅行本身造成的閉合迴圈（bootstrap 悖論）。',
    },
    {
      key: 'C',
      text: '是失蹤的導師：他比你更早啟動時光電弧儀回到過去，在每個年代留下紙條作為給你的路標，然後藏身於歷史之中。',
      correct: false,
      reason: '不對。導師的字跡與紙條不符——而那字跡，你每天都見到。導師知道紙條的存在，但他不是執筆者。',
    },
    {
      key: 'D',
      text: '是後世的史學家偽造：為了讓電磁學史顯得環環相扣，他們把同一張紙條的複製品悄悄塞進了六份史料檔案。',
      correct: false,
      reason: '不對。六位科學家在「當下」就親眼看見並使用了那張紙條，不是後人補上的。',
    },
  ],
  /** 連續誤判兩次以上 → 時間軸劣化的「壞結局」插敘 */
  badEnding: [
    '時光電弧儀發出刺耳的警鳴。',
    '推理偏離真相太遠，因果迴圈遲遲無法閉合——',
    '你看見窗外的歷史開始褪色：歐姆的書房暗了下去，',
    '法拉第的線圈停止轉動，電磁學像退潮一樣從世界抽離。',
    '',
    'AMP 用盡最後的電力穩住時間軸：「再想一次。線索都在證據牆上。」',
  ],
  reveal: [
    '那張紙條沒有起點。',
    '它不是先被某人寫下、再流傳給後人──',
    '而是「你」在每次重現實驗後留下，',
    '對身處過去的科學家來說，它便理所當然地「一直都在」。',
    '',
    '你以為自己回來「修復」被竄改的歷史，',
    '但真相是：這六項發現本就由你串起。',
    '你既是讀者，也是作者；',
    '是這個沒有開端、自我閉合的因果迴圈，讓電磁學如期誕生。',
    '',
    '導師失蹤前的那句「被人動了手腳」，',
    '指的就是你自己──而你，剛剛把迴圈閉合了。',
    '',
    '── CHRONOAMPERE・時間軸已穩定。',
  ],
}
