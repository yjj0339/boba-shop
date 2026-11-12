// 啵啵奶茶铺 · 游戏数据
export const ING = {
  pearl: { name: '珍珠', emo: '⚫', type: 'top', st: 'toppings', color: '#3a2418' },
  jelly: { name: '椰果', emo: '🥥', type: 'top', st: 'toppings', color: '#fbfbee' },
  pudding: { name: '布丁', emo: '🍮', type: 'top', st: 'toppings', color: '#ffd35c' },
  taroball: { name: '芋圆', emo: '🟣', type: 'top', st: 'toppings', color: '#b48be0' },
  redbean: { name: '红豆', emo: '🫘', type: 'top', st: 'toppings', color: '#a13d3d' },
  ice: { name: '冰块', emo: '🧊', type: 'ice', st: 'ice', color: '#e8f6ff' },
  black: { name: '红茶', emo: '🫖', type: 'tea', st: 'tea', color: '#b8622a' },
  green: { name: '绿茶', emo: '🍃', type: 'tea', st: 'tea', color: '#cfd97a' },
  oolong: { name: '乌龙', emo: '🍵', type: 'tea', st: 'tea', color: '#cf9440' },
  brownsugar: { name: '黑糖', emo: '🍯', type: 'mix', st: 'mix', color: '#8a4a22' },
  matcha: { name: '抹茶', emo: '🌿', type: 'mix', st: 'mix', color: '#8fbf5a' },
  taro: { name: '芋泥', emo: '🍠', type: 'mix', st: 'mix', color: '#b79adf' },
  mango: { name: '芒果', emo: '🥭', type: 'mix', st: 'mix', color: '#ffc23d' },
  strawberry: { name: '草莓', emo: '🍓', type: 'mix', st: 'mix', color: '#ff7d95' },
  lemon: { name: '柠檬', emo: '🍋', type: 'mix', st: 'mix', color: '#ffe66b' },
  milk: { name: '牛奶', emo: '🥛', type: 'mix', st: 'mix', color: '#fff7ea' },
  foam: { name: '奶盖', emo: '☁️', type: 'foam', st: 'mix', color: '#fff3d6' },
};
// 真实的制作顺序：小料 → 冰 → 茶底 → 果酱/奶 → 奶盖 → 封口
export const SEQ = Object.keys(ING);

export const RECIPES = [
  { id: 'classic', name: '经典奶茶', lv: 1, price: 12, items: ['black', 'milk'] },
  { id: 'pearl', name: '珍珠奶茶', lv: 1, price: 15, items: ['pearl', 'black', 'milk'] },
  { id: 'jasmine', name: '茉香奶绿', lv: 2, price: 14, items: ['green', 'milk'] },
  { id: 'jelly', name: '椰果奶绿', lv: 3, price: 17, items: ['jelly', 'green', 'milk'] },
  { id: 'mango', name: '芒果冰茶', lv: 4, price: 19, items: ['ice', 'green', 'mango'] },
  { id: 'pudding', name: '布丁奶茶', lv: 5, price: 20, items: ['pudding', 'black', 'milk'] },
  { id: 'berry', name: '草莓奶绿', lv: 6, price: 22, items: ['green', 'strawberry', 'milk'] },
  { id: 'brown', name: '黑糖珍珠鲜奶', lv: 7, price: 24, items: ['pearl', 'brownsugar', 'milk'] },
  { id: 'oolong', name: '乌龙奶盖', lv: 8, price: 25, items: ['ice', 'oolong', 'foam'] },
  { id: 'matcha', name: '抹茶拿铁', lv: 9, price: 26, items: ['ice', 'matcha', 'milk'] },
  { id: 'taro', name: '芋泥啵啵', lv: 10, price: 29, items: ['taroball', 'taro', 'milk'] },
  { id: 'lemon', name: '柠檬红茶', lv: 11, price: 21, items: ['ice', 'black', 'lemon'] },
  { id: 'cheeseberry', name: '芝士莓莓', lv: 12, price: 31, items: ['ice', 'green', 'strawberry', 'foam'] },
  { id: 'yangzhi', name: '杨枝甘露', lv: 13, price: 33, items: ['jelly', 'ice', 'mango', 'milk'] },
  { id: 'redbean', name: '红豆抹茶', lv: 14, price: 32, items: ['redbean', 'matcha', 'milk'] },
  { id: 'king', name: '满杯霸王', lv: 15, price: 42, items: ['pearl', 'pudding', 'oolong', 'milk', 'foam'] },
  { id: 'bobabrown', name: '黑糖波波奶茶', lv: 16, price: 38, items: ['pearl', 'black', 'brownsugar', 'milk'] },
  { id: 'mangococo', name: '芒果椰椰', lv: 17, price: 40, items: ['jelly', 'mango', 'milk', 'foam'] },
  { id: 'matchabean', name: '抹茶红豆奶盖', lv: 18, price: 42, items: ['redbean', 'matcha', 'milk', 'foam'] },
  { id: 'berrypud', name: '草莓布丁冰奶', lv: 19, price: 43, items: ['pudding', 'ice', 'strawberry', 'milk'] },
  { id: 'lemonoolong', name: '柠檬乌龙冰茶', lv: 20, price: 36, items: ['ice', 'oolong', 'lemon'] },
  { id: 'tarogreen', name: '芋泥珍珠奶绿', lv: 21, price: 50, items: ['pearl', 'taroball', 'green', 'taro', 'milk'] },
  { id: 'goldoolong', name: '黄金芝士乌龙', lv: 22, price: 52, items: ['pudding', 'ice', 'oolong', 'milk', 'foam'] },
  { id: 'fruitparty', name: '莓果芝士多多', lv: 23, price: 56, items: ['jelly', 'ice', 'green', 'strawberry', 'mango', 'foam'] },
  { id: 'emperor', name: '帝王全家福', lv: 24, price: 68, items: ['pearl', 'pudding', 'taroball', 'black', 'brownsugar', 'milk', 'foam'] },
];
export const MAX_LV = 24;
export const RSTAR = ['普通', '优选', '招牌', '臻选', '殿堂', '传奇'];

// 店铺规模：hw 大厅半宽，bz 后墙位置，slots 点单位，waits 等位，tables 桌子，staff 可雇店员数
const grid = (xs, zs) => zs.flatMap((z) => xs.map((x) => [x, z]));
export const SHOPS = [
  { t: 1, name: '街角小摊', emo: '🏠', cost: 0, lv: 1, hw: 3.4, bz: -6.6, slots: 2, waits: 2, tables: [[2.2, -4.9]], staff: 1 },
  { t: 2, name: '邻里小店', emo: '🏡', cost: 800, lv: 3, hw: 3.4, bz: -9, slots: 3, waits: 3, tables: grid([-2.2, 2.2], [-6]), staff: 2 },
  { t: 3, name: '人气茶铺', emo: '🏪', cost: 5000, lv: 7, hw: 3.4, bz: -11.8, slots: 3, waits: 6, tables: grid([-2.2, 2.2], [-6.8, -9.6]), staff: 3 },
  { t: 4, name: '网红旗舰店', emo: '🏬', cost: 25000, lv: 12, hw: 4.9, bz: -12.2, slots: 4, waits: 8, tables: grid([-4, -2, 2, 4], [-6.8, -9.6]), staff: 4 },
  { t: 5, name: '奶茶帝国总店', emo: '🏰', cost: 100000, lv: 18, hw: 5.7, bz: -15, slots: 4, waits: 8, tables: grid([-4.5, -2, 2, 4.5], [-6.8, -9.6, -12.4]), staff: 6 },
];

// 顾客类型：mul 付款倍率，pat 耐心倍率
export const CTYPES = [
  { id: 'normal', name: '', emo: '', w: 100, mul: 1, pat: 1 },
  { id: 'office', name: '白领', emo: '💼', w: 16, mul: 1.6, pat: 0.85, lv: 2 },
  { id: 'star', name: '探店博主', emo: '📸', w: 5, mul: 1.3, pat: 0.9, shop: 2 },
  { id: 'rich', name: '富豪', emo: '👑', w: 6, mul: 3, pat: 0.78, lv: 3 },
  { id: 'horse', name: '金马大亨', emo: '🐴', w: 1.2, mul: 8, pat: 0.72, shop: 3 },
];

export const BRANCHES = [
  { id: 'b1', name: '大学城分店', emo: '🎓', cost: 6000, inc: 260, shop: 3 },
  { id: 'b2', name: '商业街分店', emo: '🛍️', cost: 18000, inc: 700, shop: 3 },
  { id: 'b3', name: '海滨分店', emo: '🏖️', cost: 50000, inc: 1800, shop: 4 },
  { id: 'b4', name: '机场分店', emo: '✈️', cost: 130000, inc: 4200, shop: 4 },
  { id: 'b5', name: '首都旗舰分店', emo: '🏙️', cost: 320000, inc: 9500, shop: 5 },
  { id: 'b6', name: '海外一号店', emo: '🌍', cost: 800000, inc: 22000, shop: 5 },
];

export const SCENES = [
  { id: 'town', name: '街角小镇', emo: '🏘️', cost: 0, shop: 1 },
  { id: 'sakura', name: '樱花大道', emo: '🌸', cost: 2500, shop: 2 },
  { id: 'beach', name: '阳光海岸', emo: '🏝️', cost: 6000, shop: 2 },
  { id: 'snow', name: '雪国小镇', emo: '⛄', cost: 15000, shop: 3 },
  { id: 'night', name: '霓虹夜市', emo: '🏮', cost: 30000, shop: 4 },
];
export const HIRE_COST = [400, 1800, 6000, 18000, 45000, 110000];

// 进货：n = 每次买到的份数；茶叶 1 包泡一桶，生珍珠 1 袋煮一锅
export const SHOP = {
  black: { n: 1, cost: 5, unit: '包茶叶' }, green: { n: 1, cost: 5, unit: '包茶叶' }, oolong: { n: 1, cost: 8, unit: '包茶叶' },
  pearl: { n: 1, cost: 5, unit: '袋生珍珠' },
  milk: { n: 10, cost: 10, unit: '份' }, jelly: { n: 8, cost: 8, unit: '份' }, pudding: { n: 8, cost: 10, unit: '份' },
  taroball: { n: 8, cost: 12, unit: '份' }, redbean: { n: 8, cost: 10, unit: '份' }, mango: { n: 8, cost: 14, unit: '份' },
  strawberry: { n: 8, cost: 16, unit: '份' }, matcha: { n: 8, cost: 16, unit: '份' }, taro: { n: 8, cost: 16, unit: '份' },
  brownsugar: { n: 10, cost: 10, unit: '份' }, lemon: { n: 10, cost: 8, unit: '份' }, foam: { n: 8, cost: 14, unit: '份' },
};

export const UPGRADES = [
  { id: 'shoes', cat: 'up', name: '轻盈跑鞋', emo: '👟', max: 5, base: 80, g: 1.9, desc: (l) => `移动速度 +${l * 10}%` },
  { id: 'urn', cat: 'up', name: '大容量茶桶', emo: '🫖', max: 4, base: 90, g: 1.9, desc: (l) => `每桶茶可倒 ${6 + l * 2} 杯` },
  { id: 'stove', cat: 'up', name: '猛火灶', emo: '🔥', max: 4, base: 100, g: 1.9, desc: (l) => `泡茶/煮珍珠快 ${l * 18}%` },
  { id: 'sealer', cat: 'up', name: '极速封口机', emo: '⚡', max: 3, base: 120, g: 2, desc: (l) => `封口只需 ${(1.5 - l * 0.38).toFixed(1)} 秒` },
  { id: 'shelf', cat: 'up', name: '备餐台', emo: '🗄️', max: 3, base: 150, g: 2.2, desc: (l) => l ? `可提前做好暂存 ${l} 杯` : '提前做好的奶茶可以暂存' },
  { id: 'sign', cat: 'up', name: '醒目招牌', emo: '📣', max: 6, base: 120, g: 1.8, desc: (l) => `客流量 +${l * 12}%` },
  { id: 'sofa', cat: 'up', name: '舒适等位区', emo: '🛋️', max: 5, base: 100, g: 1.8, desc: (l) => `客人耐心 +${l * 12}%` },
  { id: 'quality', cat: 'up', name: '优质原料', emo: '✨', max: 8, base: 200, g: 1.75, desc: (l) => `所有饮品售价 +${l * 8}%` },
  { id: 'tipjar', cat: 'up', name: '可爱小费罐', emo: '🫙', max: 5, base: 90, g: 1.9, desc: (l) => `小费 +${l * 20}%` },
  { id: 'cat', cat: 'staff', name: '猫咪店员', emo: '🐱', max: 3, base: 600, g: 3,
    desc: (l) => ['雇一只小猫帮忙', '自动泡茶、煮珍珠', '还会自动补货', '泡煮速度再翻倍'][l] },
  { id: 'hire', cat: 'staff', name: '奶茶师', emo: '🧑‍🍳', max: 6, base: 0, g: 1,
    desc: (l) => l ? `${l} 位奶茶师在岗，自己取杯、加料、封口、出杯` : '雇一位奶茶师，全自动帮你做奶茶' },
  { id: 'train', cat: 'staff', name: '店员培训', emo: '🎓', max: 5, base: 500, g: 2.3, desc: (l) => `奶茶师手速和脚步 +${l * 15}%` },
  { id: 'waiter', cat: 'staff', name: '服务生', emo: '🐰', max: 3, base: 700, g: 2.8,
    desc: (l) => l ? `自动去大厅收桌上小费，速度 Lv.${l}` : '雇一位服务生，自动收桌上的小费' },
];

export const DECOR = [
  { id: 'plant', name: '龟背竹盆栽', emo: '🪴', cost: 120, charm: 1 },
  { id: 'rug', name: '奶油圆地毯', emo: '🧶', cost: 200, charm: 1 },
  { id: 'lights', name: '星星灯串', emo: '🎐', cost: 350, charm: 2 },
  { id: 'art', name: '奶茶挂画', emo: '🖼️', cost: 500, charm: 2 },
  { id: 'neon', name: '霓虹灯牌', emo: '💡', cost: 900, charm: 3 },
  { id: 'fish', name: '小鱼缸', emo: '🐠', cost: 1400, charm: 3 },
  { id: 'bear', name: '巨型玩偶熊', emo: '🧸', cost: 2200, charm: 4 },
  { id: 'sakura', name: '门口樱花树', emo: '🌸', cost: 3500, charm: 5 },
  { id: 'jars', name: '厨房罐子墙', emo: '🫙', cost: 700, charm: 2 },
  { id: 'claw', name: '抓娃娃机', emo: '🕹️', cost: 5000, charm: 5, shop: 3 },
  { id: 'chand', name: '水晶吊灯', emo: '💎', cost: 9000, charm: 6, shop: 3 },
  { id: 'gold', name: '黄金招财猫', emo: '🐱', cost: 16000, charm: 8 },
];

export const THEMES = [
  { id: 'cream', name: '奶油粉', cost: 0, wall: '#fff1e0', accent: '#ffb3c4', fa: '#fff9f0', fb: '#ffe2d4', cab: '#ffc4d2' },
  { id: 'mint', name: '薄荷绿', cost: 800, wall: '#f0fbf3', accent: '#86d8b2', fa: '#f8fffa', fb: '#d3f2e1', cab: '#a5e6cc' },
  { id: 'sky', name: '海盐蓝', cost: 800, wall: '#eff7ff', accent: '#86c1ff', fa: '#f8fcff', fb: '#d5e9ff', cab: '#b3d7ff' },
  { id: 'lilac', name: '香芋紫', cost: 1500, wall: '#f7f0ff', accent: '#bfa0ff', fa: '#fcf8ff', fb: '#e6d8ff', cab: '#d3beff' },
  { id: 'lemon', name: '柠檬黄', cost: 2500, wall: '#fffbe6', accent: '#ffd24d', fa: '#fffef5', fb: '#fff1b8', cab: '#ffe27a' },
  { id: 'caramel', name: '焦糖木', cost: 5000, wall: '#fbeede', accent: '#d9965b', fa: '#f6e3cb', fb: '#e8c9a3', cab: '#c98d5e' },
  { id: 'peach', name: '蜜桃橘', cost: 9000, wall: '#fff0e8', accent: '#ff9d7a', fa: '#fff8f3', fb: '#ffd9c7', cab: '#ffb89e' },
];

export const WEATHERS = [
  { id: 'sunny', name: '晴朗', emo: '☀️', w: 50, minDay: 1, arr: 1, pat: 1, tip: 1, ice: 1, desc: '舒服的一天' },
  { id: 'hot', name: '炎热', emo: '🥵', w: 20, minDay: 3, arr: 1.18, pat: 0.92, tip: 1, ice: 3, desc: '客人更多，都想喝冰的' },
  { id: 'rain', name: '小雨', emo: '🌧️', w: 20, minDay: 2, arr: 0.8, pat: 1.3, tip: 1.35, ice: 0.6, desc: '客人少一些，但更有耐心、小费更多' },
  { id: 'fest', name: '花火节', emo: '🎆', w: 10, minDay: 5, arr: 1.45, pat: 1, tip: 1.15, ice: 1, desc: '街上好热闹，客流大涨！' },
];

export const ACHS = [
  { id: 's10', name: '初出茅庐', desc: '累计卖出 10 杯', r: 50, ok: (s) => s.stats.served >= 10 },
  { id: 's100', name: '人气小店', desc: '累计卖出 100 杯', r: 300, ok: (s) => s.stats.served >= 100 },
  { id: 's500', name: '奶茶达人', desc: '累计卖出 500 杯', r: 1500, ok: (s) => s.stats.served >= 500 },
  { id: 's2000', name: '奶茶传奇', desc: '累计卖出 2000 杯', r: 6000, ok: (s) => s.stats.served >= 2000 },
  { id: 'e1k', name: '第一桶金', desc: '累计收入 1,000', r: 100, ok: (s) => s.stats.earned >= 1000 },
  { id: 'e10k', name: '小有积蓄', desc: '累计收入 10,000', r: 800, ok: (s) => s.stats.earned >= 10000 },
  { id: 'e100k', name: '奶茶大亨', desc: '累计收入 100,000', r: 5000, ok: (s) => s.stats.earned >= 100000 },
  { id: 'c10', name: '行云流水', desc: '达成 10 连击', r: 150, ok: (s) => s.stats.bestCombo >= 10 },
  { id: 'c25', name: '手速惊人', desc: '达成 25 连击', r: 600, ok: (s) => s.stats.bestCombo >= 25 },
  { id: 'c50', name: '人形奶茶机', desc: '达成 50 连击', r: 2000, ok: (s) => s.stats.bestCombo >= 50 },
  { id: 'd7', name: '营业一周', desc: '完成 7 天营业', r: 300, ok: (s) => s.day > 7 },
  { id: 'd30', name: '月度老板', desc: '完成 30 天营业', r: 3000, ok: (s) => s.day > 30 },
  { id: 'allrec', name: '全配方大师', desc: '解锁全部 25 款饮品', r: 5000, ok: (s) => s.level >= 24 },
  { id: 'vip5', name: '贵宾之选', desc: '服务 5 位贵客', r: 300, ok: (s) => s.stats.vip >= 5 },
  { id: 'vip100', name: '名流会所', desc: '服务 100 位贵客', r: 4000, ok: (s) => s.stats.vip >= 100 },
  { id: 'horse', name: '马到成功', desc: '服务一次金马大亨', r: 1000, ok: (s) => (s.stats.horse || 0) >= 1 },
  { id: 'decor', name: '软装大师', desc: '买齐所有装饰', r: 5000, ok: (s) => DECOR.every((d) => s.decor[d.id]) },
  { id: 'hire', name: '第一位员工', desc: '雇用一位奶茶师', r: 200, ok: (s) => (s.up.hire || 0) >= 1 },
  { id: 'team', name: '梦之队', desc: '拥有 6 位奶茶师', r: 8000, ok: (s) => (s.up.hire || 0) >= 6 },
  { id: 'shop2', name: '有模有样', desc: '扩建为邻里小店', r: 300, ok: (s) => s.shop >= 2 },
  { id: 'shop3', name: '门庭若市', desc: '扩建为人气茶铺', r: 1500, ok: (s) => s.shop >= 3 },
  { id: 'shop4', name: '全城打卡', desc: '扩建为网红旗舰店', r: 6000, ok: (s) => s.shop >= 4 },
  { id: 'shop5', name: '奶茶帝国', desc: '建成奶茶帝国总店', r: 30000, ok: (s) => s.shop >= 5 },
  { id: 'branch', name: '连锁起步', desc: '开出第一家分店', r: 2000, ok: (s) => Object.keys(s.branch || {}).length >= 1 },
  { id: 'branchall', name: '遍地开花', desc: '开齐 6 家分店', r: 100000, ok: (s) => Object.keys(s.branch || {}).length >= 6 },
  { id: 'star5', name: '传奇配方', desc: '把一款饮品研发到传奇', r: 3000, ok: (s) => Object.values(s.rlv || {}).some((v) => v >= 5) },
  { id: 'rep5', name: '五星口碑', desc: '口碑达到 4.9', r: 800, ok: (s) => s.rep >= 4.9 },
];

export const RANKS = [[0, '街角小摊'], [30, '邻里小店'], [120, '人气茶铺'], [400, '网红名店'], [1000, '城市地标'], [2500, '奶茶传奇']];
