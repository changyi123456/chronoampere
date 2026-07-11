import type { ChallengeId } from './script'

export type ActId = 1 | 2 | 3
export type EndingId = 'stabilize' | 'liberate' | 'rewrite'

export interface ActDefinition {
  id: ActId
  title: string
  subtitle: string
  question: string
  directive: string
  unlockAt: number
  transmission: string[]
}

export interface EpisodeNarrative {
  id: ChallengeId
  act: ActId
  moduleName: string
  moduleFunction: string
  arrival: string[]
  mentorLog: { title: string; lines: string[] }
  prediction: { question: string; options: string[]; correct: number; explain: string }
  observation: { title: string; body: string }
  evidence: { id: string; title: string; body: string; tags: string[] }
  noteAction: { prompt: string; inscription: string; consequence: string }
}

export interface HypothesisDefinition {
  id: string
  title: string
  statement: string
  unlockAt: number
  evidenceIds: ChallengeId[]
  verdict: 'rejected' | 'partial' | 'supported'
  result: string
}

export interface EndingDefinition {
  id: EndingId
  title: string
  principle: string
  choice: string
  color: string
  epilogue: string[]
}

export const ACTS: ActDefinition[] = [
  {
    id: 1,
    title: '第一幕・被竄改的歷史',
    subtitle: '修復失落的電路',
    question: '究竟是誰在歷史完成之前，就知道了答案？',
    directive: '重建電路學的兩個基礎模組，追查不屬於十九世紀的技術記號。',
    unlockAt: 0,
    transmission: [
      '導師紀錄 01：別急著抓「犯人」。先確認異常是否真的改變了實驗結果。',
      '如果兩個年代出現同一種干預，它就不是偶然。',
    ],
  },
  {
    id: 2,
    title: '第二幕・穿越者的影子',
    subtitle: '測量看不見的旅人',
    question: '如果歷史從未被破壞，我們究竟在修復什麼？',
    directive: '用電子束留下可量測的軌跡，驗證紙條作者是否來自時間之外。',
    unlockAt: 2,
    transmission: [
      '導師紀錄 02：我刪除了 AMP 的一段記憶。不是為了欺騙你，是怕它太早說出答案。',
      '歷史檔案沒有被修改的痕跡。那些紙條……一直就在原始檔案裡。',
    ],
  },
  {
    id: 3,
    title: '第三幕・迴圈的作者',
    subtitle: '讓時間機器自行供電',
    question: '知道自己是原因之後，你還願意讓結果發生嗎？',
    directive: '完成感應與變壓模組，決定時光電弧儀應該閉合、斷開，還是被改寫。',
    unlockAt: 4,
    transmission: [
      '導師紀錄 03：我沒有失蹤。我只是離開了你正在經歷的那條時間線。',
      '我能替你留下答案，卻不能替你承擔答案造成的世界。最後一步必須由你選。',
    ],
  },
]

export const EPISODES: Record<ChallengeId, EpisodeNarrative> = {
  lamp: {
    id: 'lamp', act: 1,
    moduleName: '歐姆調節器', moduleFunction: '穩定時光電弧儀的輸入電流，避免核心在冷啟動時燒毀。',
    arrival: ['1827 年，科隆。房間裡有燭火、金屬線的焦味，還有一盞不肯穩定發亮的燈。', 'AMP 偵測到桌上有一張不屬於這個年代的紙，但導師要求你先完成實驗。'],
    mentorLog: { title: '導師紀錄・冷啟動', lines: ['別把公式當成咒語。', '電阻不是刻在物體上的常數；當燈絲升溫，數字也會改變。先觀察，再下結論。'] },
    prediction: { question: '剛接通電源、燈絲仍冷時，電流最可能如何變化？', options: ['先出現較大的湧浪，再隨升溫下降', '從零等速增加到穩態', '全程保持完全固定', '只要電壓固定就不會發熱'], correct: 0, explain: '冷燈絲電阻較低，接通瞬間電流較大；升溫後電阻增加，電流回落到穩態。' },
    observation: { title: '觀察成立：公式有條件', body: 'V = IR 描述的是同一狀態下的關係。燈絲溫度改變時，R 也在改變。' },
    evidence: { id: 'ev-omega', title: '尚未命名的符號', body: '紙角畫著 Ω，但這個電阻單位符號要到數十年後才會被正式採用。作者知道未來的科學語言。', tags: ['未來知識', '年代矛盾'] },
    noteAction: { prompt: '歐姆需要一條能重現結果的提示。把你剛才觀察到的關係寫在桌上的紙條上。', inscription: 'V = IR；量測前，先等燈絲溫度穩定。', consequence: '墨水離開筆尖時，你短暫看見紙張已經泛黃。彷彿這句話不是第一次被寫下。' },
  },
  split: {
    id: 'split', act: 1,
    moduleName: '節點分流器', moduleFunction: '把核心能量分配到導航、顯示與生命維持支路。',
    arrival: ['1845 年，柏林。桌面被兩條銅製匯流排切成清楚的支路。', '年輕的克希何夫留下滿桌節點草圖；其中一張的線條與你的操作筆記異常相似。'],
    mentorLog: { title: '導師紀錄・守恆', lines: ['分支不會創造電流，也不會把電流藏起來。', '真正值得追問的是：那張紙條從哪一條路進入歷史？'] },
    prediction: { question: '增加一條並聯支路後，含內阻的電池端電壓會如何變化？', options: ['因總電流增加而略微下降', '必定升高到兩倍', '完全不受任何影響', '立刻變成零'], correct: 0, explain: '並聯使等效負載降低、總電流增加；電池內阻上的壓降增大，因此端電壓略降。' },
    observation: { title: '觀察成立：每條路都要結算', body: '節點電流守恆，電池內阻也會把支路負載反映回整個系統。' },
    evidence: { id: 'ev-pressure', title: '相同的書寫習慣', body: '不是「看起來像」而已：起筆壓力、等號右端上揚、數字 7 的橫線都與你的紀錄一致。', tags: ['身分', '筆跡'] },
    noteAction: { prompt: '克希何夫的推導少了最後一行。沿著他畫好的節點，把守恆式補完整。', inscription: 'ΣI_in = ΣI_out；所有支路都必須在節點結算。', consequence: 'AMP 靜默了 1.8 秒，才說：「筆跡比對……資料不足。」你知道它在說謊。' },
  },
  cyclo: {
    id: 'cyclo', act: 2,
    moduleName: '粒子導航環', moduleFunction: '以磁場彎曲帶電粒子，校準時光電弧的航向。',
    arrival: ['1897 年，卡文迪西實驗室。玻璃球管裡的淡綠光像一支會被磁場握住的筆。', '這一次，異常不是一張紙：儀器旁放著一張尚未發行的車票。'],
    mentorLog: { title: '導師紀錄・不可見之物', lines: ['看不見電子，不代表它沒有身分。', '讓它留下軌跡，測量軌跡，再問同一件事：旅人留下了什麼可測量的痕跡？'] },
    prediction: { question: '固定加速電壓並增強磁場，電子束圓半徑會如何變化？', options: ['縮小', '放大', '保持不變', '先縮小再無限放大'], correct: 0, explain: '速度近似固定時 r = mv/(eB)，磁場 B 增強會使半徑縮小。' },
    observation: { title: '觀察成立：軌跡能揭露身分', body: '多組量測得到一致的 e/m。不可見的粒子，仍能靠可重複的軌跡被辨認。' },
    evidence: { id: 'ev-ticket', title: '未來車票', body: '票面日期是 2225 年，壓印纖維與你進入時光電弧儀前使用的車票完全相同。', tags: ['未來物件', '穿越'] },
    noteAction: { prompt: '湯姆森需要三組讀值來排除偶然。把平均 e/m 與量測方法寫在紙背。', inscription: '改變 V 與 I 重複量測；由 2V/(B²r²) 求得 e/m。', consequence: '你翻過紙條，看到車票壓痕正好包住自己剛寫下的字。' },
  },
  maglock: {
    id: 'maglock', act: 2,
    moduleName: '陰極座標屏', moduleFunction: '把不可見的時間偏差轉成可讀取的光點座標。',
    arrival: ['1897 年，斯特拉斯堡。陰極射線在螢光幕上留下綠色光點。', '布勞恩的舊筆記說，這張提示從他祖父整理的器材箱裡就存在。'],
    mentorLog: { title: '導師紀錄・互相抵消的力', lines: ['兩個錯誤方向的力，有時能形成一個正確讀值。', '我的第一份任務說「修復歷史」；第二份紀錄卻說歷史從未損壞。哪一份才是錯的？'] },
    prediction: { question: '電場與磁場造成的偏轉方向相反時，電子束可能出現什麼結果？', options: ['兩種作用恰好抵消而回到零位', '必定停止運動', '速度一定變成零', '螢幕會失去電荷'], correct: 0, explain: '當電力與磁力大小相等、方向相反時，垂直偏轉可互相抵消，形成速度選擇條件。' },
    observation: { title: '觀察成立：矛盾也能成為量尺', body: '電場與磁場的相反偏轉可互相抵消，並由平衡條件反推出粒子速度。' },
    evidence: { id: 'ev-archive', title: '沒有被修改的歷史', body: 'AMP 比對最早的原始掃描：紙張纖維、氧化與裝訂壓痕都連續一致。紙條不是後來塞進去的。', tags: ['原始歷史', '閉合因果'] },
    noteAction: { prompt: '光點停在目標環內。把讓兩種偏轉互相制衡的條件留給下一位操作者。', inscription: '先量電場偏轉，再以磁場反向校正；平衡時 E = vB。', consequence: '你寫下最後一筆時，AMP 的時間戳跳回「檔案建立之前」。歷史沒有被改寫——你正在完成它。' },
  },
  dynamo: {
    id: 'dynamo', act: 3,
    moduleName: '法拉第感應核心', moduleFunction: '把旋轉與磁通變化轉成時光電弧所需的交變能量。',
    arrival: ['1831 年，皇家研究院地下室。鐵、漆包線與潮濕磚牆構成一台還沒有名字的發電機。', '法拉第的日記提到一位安靜訪客：對方留下公式，卻沒有要求任何回報。'],
    mentorLog: { title: '導師紀錄・原因與結果', lines: ['感應電動勢不是來自磁通本身，而是來自磁通的改變。', '同樣地，困住你的不是紙條，而是你即將做出的那個動作。'] },
    prediction: { question: '線圈磁通量剛好穿越零點時，感應電動勢大小最可能如何？', options: ['達到最大值', '也必定為零', '永遠保持正值', '與轉速無關'], correct: 0, explain: '磁通為 cos，相應電動勢與其變化率成正比、為 sin；磁通過零時變化最快。' },
    observation: { title: '觀察成立：變化才會產生力量', body: '磁通與電動勢相差四分之一週期。歷史看似穩定，真正驅動它的卻是一次次選擇。' },
    evidence: { id: 'ev-visitor', title: '安靜訪客的輪廓', body: '日記描述訪客左手握筆、袖口有電弧灼痕。你的防護服左袖正有同樣的新灼痕。', tags: ['玩家身分', '現場目擊'] },
    noteAction: { prompt: '法拉第還缺一個能把波形與轉動連起來的式子。你知道必須寫下它，時光機才能取得能量。', inscription: 'ε = −dΦ/dt；當磁通穿越零點，感應電動勢最大。', consequence: '你終於記起這段動作——不是因為做過，而是因為它一直存在於你的未來。' },
  },
  xfmr: {
    id: 'xfmr', act: 3,
    moduleName: '跨年代耦合器', moduleFunction: '把感應核心的高壓轉換成各年代儀器可承受的電壓。',
    arrival: ['1885 年，交流電的黎明。鐵芯嗡鳴像某種巨大心跳。', '六個模組在你的介面上連成完整回路；時光電弧儀第一次顯示「可自我供電」。'],
    mentorLog: { title: '導師紀錄・最後授權', lines: ['我離開，是因為我無法替你選擇一個世界。', '閉合迴圈能保存我們熟悉的歷史；切斷它能讓歷史擁有來源；改寫它，則把答案還給每位科學家。'] },
    prediction: { question: '理想降壓變壓器降低次級電壓時，次級可提供的電流能力如何變化？', options: ['相對提高，以近似維持功率', '一定同倍率降低', '永遠等於零', '與匝數完全無關'], correct: 0, explain: '理想情況下輸入輸出功率近似相等；降壓時次級電流能力相對提高。' },
    observation: { title: '觀察成立：能量被轉換，不被創造', body: '匝數比改變電壓與電流的比例，功率則在理想模型中守恆。時光機也沒有創造知識，只讓知識繞了一圈。' },
    evidence: { id: 'ev-loop', title: '沒有第一份原稿', body: '六張紙的纖維來自你攜帶的同一本實驗簿；每張內容都由你在這趟旅程親手完成。', tags: ['玩家身分', 'bootstrap', '閉合因果'] },
    noteAction: { prompt: '最後一張紙還是空白。只要留下匝數比，六個年代就會形成一條沒有起點的知識迴路。', inscription: 'V₂/V₁ = N₂/N₁；能量不會憑空出現，答案也沒有。', consequence: '紙張離手。六個年代同時傳回確認訊號：你不是找到紙條的人。你是把它們留在歷史裡的人。' },
  },
}

export const HYPOTHESES: HypothesisDefinition[] = [
  { id: 'secret-society', title: '祕密學會', statement: '紙條由十九世紀某個組織在不同實驗室之間傳遞。', unlockAt: 2, evidenceIds: ['lamp', 'split'], verdict: 'rejected', result: 'Ω 記號與紙張墨水都超出當時技術；同時代組織無法解釋未來資訊。' },
  { id: 'mentor-author', title: '導師就是作者', statement: '失蹤導師比玩家更早穿越，並在六個年代留下提示。', unlockAt: 3, evidenceIds: ['split', 'cyclo'], verdict: 'rejected', result: '導師知道紙條，但筆跡、車票壓痕與現場軌跡都指向另一位旅人。' },
  { id: 'single-traveler', title: '同一名穿越者', statement: '六張紙由同一位能跨年代移動的旅人親手完成。', unlockAt: 4, evidenceIds: ['cyclo', 'maglock'], verdict: 'partial', result: '成立，但仍缺少旅人的身分，以及紙條第一次被寫下的時間。' },
  { id: 'closed-loop', title: '沒有原稿的知識', statement: '紙條不存在第一份原稿；它在未來與過去之間形成閉合因果。', unlockAt: 5, evidenceIds: ['maglock', 'dynamo'], verdict: 'supported', result: '原始檔案從未被修改，訪客的特徵也出現在當下。閉合迴圈已是最能解釋全部證據的模型。' },
  { id: 'player-author', title: '我就是那位訪客', statement: '玩家在重現六項實驗後，親手把提示留給歷史中的科學家。', unlockAt: 6, evidenceIds: ['dynamo', 'xfmr'], verdict: 'supported', result: '六張紙的纖維、字跡、灼痕與你的操作紀錄完全一致。最後的未知不再是「誰」，而是你要如何處置這個迴圈。' },
]

export const ENDINGS: Record<EndingId, EndingDefinition> = {
  stabilize: {
    id: 'stabilize', title: '閉合迴圈', principle: '責任', color: '#5eead4',
    choice: '把六張紙送回它們所在的年代，保存既有歷史，即使知識永遠沒有第一位作者。',
    epilogue: ['你啟動六個模組，紙張沿著電弧回到各自的桌面。', '世界沒有閃爍，城市的燈仍然亮著。', 'AMP 將你的名字從任務紀錄中刪除：歷史記得公式，卻不記得送來公式的人。', '你接受了這份沒有榮耀的責任。'],
  },
  liberate: {
    id: 'liberate', title: '切斷迴圈', principle: '自由', color: '#fb7185',
    choice: '銷毀最後一張紙，讓知識重新擁有真正的起點，也承擔歷史可能偏離的代價。',
    epilogue: ['最後一張紙在電弧中化成灰。', '遠方城市一盞接一盞熄滅，接著又以你不認識的顏色重新亮起。', '歷史沒有消失；它只是第一次不再保證抵達你熟悉的未來。', 'AMP 問：「這就是自由嗎？」你回答：「這是未知。」'],
  },
  rewrite: {
    id: 'rewrite', title: '改寫迴圈', principle: '信任', color: '#fbbf24',
    choice: '留下觀察與問題，但抹去最後答案，把發現的功勞與選擇還給每位科學家。',
    epilogue: ['你擦去六張紙上的結論，只留下量測方法與尚未回答的問題。', '歐姆重新推導比例，法拉第重新看見磁通改變；歷史走得更慢，卻仍向前。', '時光電弧儀開始失去自我供電，但導師從一條新時間線傳回微弱訊號。', '「很好。你沒有替他們發現；你只是相信他們能發現。」'],
  },
}

export function getAct(fragmentCount: number): ActDefinition {
  if (fragmentCount >= 4) return ACTS[2]
  if (fragmentCount >= 2) return ACTS[1]
  return ACTS[0]
}

