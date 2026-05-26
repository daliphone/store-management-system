// 門市清單
export const STORES = [
  '東門店',
  '小西門店',
  '文賢店',
  '永康店',
  '歸仁店',
  '安中店',
  '鹽行店',
  '五甲店',
  '遠傳延平店'
];

// 預設的使用者與角色資料 (包含帳密與功能權限，用於權限勾選設定)
export const USERS = [
  {
    id: 'user_1',
    name: '文和',
    username: 'wenhe',
    password: '',
    role: 'SUPER_ADMIN',
    roleLabel: '超級管理員',
    store: '全分店',
    avatar: '👨‍💼',
    permissions: ['view_all_stores', 'manage_orders', 'complete_tasks', 'cancel_tasks_directly', 'manage_accounts']
  },
  {
    id: 'user_2',
    name: '何易俞',
    username: 'yiyu',
    password: '',
    role: 'STORE_MANAGER',
    roleLabel: '分店店長',
    store: '東門店',
    avatar: '👨‍⚕️',
    permissions: ['manage_orders', 'complete_tasks', 'cancel_tasks_directly']
  },
  {
    id: 'user_3',
    name: '揭怡庭',
    username: 'yiting',
    password: '',
    role: 'STAFF',
    roleLabel: '一般店員',
    store: '東門店',
    avatar: '👩‍💼',
    permissions: ['manage_orders', 'complete_tasks']
  }
];

// 預設訂單資料
export const INITIAL_ORDERS = [
  {
    id: 'ord_1',
    customerName: '林大經',
    customerPhone: '0929-341-060',
    productName: '紅米15C 8+256 任色',
    type: '訂貨',
    store: '東門店',
    creator: '揭怡庭',
    source: '專案機',
    tags: ['專案機', '門號續約', 'L標', '平績'],
    quantity: 1,
    price: 5990,
    cost: 4500,
    status: '已到貨',
    createdAt: '2026-05-06',
    promiseDate: '2026-05-10',
    overdueDays: 16,
    signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="30"><path d="M10 15 q15 -10 30 0 t30 -10 t20 10" fill="none" stroke="black" stroke-width="2"/></svg>',
    notes: '客戶希望能附贈保護貼'
  },
  {
    id: 'ord_2',
    customerName: '陳育德',
    customerPhone: '0938-677-206',
    productName: 'Samsung A17 任色',
    type: '訂貨',
    store: '小西門店',
    creator: '何易俞',
    source: '專案機',
    tags: ['專案機', '門號續約', 'Z標', '平績'],
    quantity: 1,
    price: 8990,
    cost: 7200,
    status: '已到貨',
    createdAt: '2026-05-10',
    promiseDate: '2026-05-14',
    overdueDays: 12,
    signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="30"><path d="M10 20 q20 -15 40 5 t30 -20" fill="none" stroke="black" stroke-width="2"/></svg>',
    notes: '續約方案已送件完成'
  },
  {
    id: 'ord_3',
    customerName: '詹政良',
    customerPhone: '0915-055-209',
    productName: '紅米pad2(8+256)',
    type: '訂貨',
    store: '東門店',
    creator: '揭怡庭',
    source: '專案機',
    tags: ['專案機'],
    quantity: 1,
    price: 6990,
    cost: 5500,
    status: '已到貨',
    createdAt: '2026-05-15',
    promiseDate: '2026-05-19',
    overdueDays: 7,
    signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="30"><path d="M15 10 c10 10, 30 -5, 50 15" fill="none" stroke="black" stroke-width="2"/></svg>',
    notes: ''
  },
  {
    id: 'ord_4',
    customerName: '游小姐',
    customerPhone: '0915-556-589',
    productName: '紅米15C 4G 金色',
    type: '訂貨',
    store: '永康店',
    creator: '何易俞',
    source: '專案機',
    tags: ['專案機'],
    quantity: 1,
    price: 4990,
    cost: 3800,
    status: '已到貨',
    createdAt: '2026-05-17',
    promiseDate: '2026-05-21',
    overdueDays: 5,
    signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="30"><path d="M5 15 q20 10 40 -10 t35 15" fill="none" stroke="black" stroke-width="2"/></svg>',
    notes: '金色缺貨，等調貨到店通知'
  }
];

// 預設店務任務資料 (新增分店歸屬屬性)
export const INITIAL_TASKS = [
  // 東門店任務
  { id: 'tsk_1', store: '東門店', shift: 'morning', counter: 'M1 櫃台', text: '檢查 Mail / 公告資訊 / 回覆 MAIL', score: 5, completed: true, completedAt: '2026-05-26 09:15:00', completedBy: '揭怡庭' },
  { id: 'tsk_2', store: '東門店', shift: 'morning', counter: 'M1 櫃台', text: '掃地 (騎樓 / 賣場 / 後場)', score: 5, completed: false, completedAt: null, completedBy: null },
  { id: 'tsk_3', store: '東門店', shift: 'morning', counter: 'M1 櫃台', text: '盯手機與配件庫存', score: 10, completed: false, completedAt: null, completedBy: null },
  { id: 'tsk_4', store: '東門店', shift: 'morning', counter: 'M1 櫃台', text: '陳列灰塵清潔', score: 5, completed: false, completedAt: null, completedBy: null },
  { id: 'tsk_5', store: '東門店', shift: 'morning', counter: 'M2 櫃台', text: '擦玻璃', score: 5, completed: false, completedAt: null, completedBy: null },
  { id: 'tsk_6', store: '東門店', shift: 'morning', counter: 'M2 櫃台', text: '銀行換零錢', score: 10, completed: false, completedAt: null, completedBy: null },
  { id: 'tsk_7', store: '東門店', shift: 'morning', counter: 'M3 櫃台', text: '新進貨上架與檢查', score: 15, completed: true, completedAt: '2026-05-26 10:20:00', completedBy: '何易俞' },
  { id: 'tsk_8', store: '東門店', shift: 'noon', counter: 'M1 櫃台', text: '午間銷售結帳核對', score: 10, completed: false, completedAt: null, completedBy: null },
  { id: 'tsk_9', store: '東門店', shift: 'noon', counter: 'M2 櫃台', text: '垃圾整理分類', score: 5, completed: false, completedAt: null, completedBy: null },
  { id: 'tsk_10', store: '東門店', shift: 'noon', counter: 'M3 櫃台', text: '輪班環境交接清潔', score: 5, completed: false, completedAt: null, completedBy: null },
  { id: 'tsk_11', store: '東門店', shift: 'evening', counter: 'M1 櫃台', text: '晚間銷售日結報表', score: 15, completed: false, completedAt: null, completedBy: null },
  { id: 'tsk_12', store: '東門店', shift: 'evening', counter: 'M1 櫃台', text: '鎖櫃盤點備份', score: 10, completed: false, completedAt: null, completedBy: null },
  { id: 'tsk_13', store: '東門店', shift: 'evening', counter: 'M2 櫃台', text: '吸地拖地垃圾打包', score: 10, completed: false, completedAt: null, completedBy: null },
  { id: 'tsk_14', store: '東門店', shift: 'evening', counter: 'M3 櫃台', text: '關閉所有示範機與店面招牌燈', score: 10, completed: false, completedAt: null, completedBy: null },

  // 小西門店任務
  { id: 'tsk_x1', store: '小西門店', shift: 'morning', counter: 'M1 櫃台', text: '檢查 Mail / 公告資訊 / 回覆 MAIL', score: 5, completed: false, completedAt: null, completedBy: null },
  { id: 'tsk_x2', store: '小西門店', shift: 'morning', counter: 'M1 櫃台', text: '掃地與賣場清潔', score: 5, completed: false, completedAt: null, completedBy: null },
  { id: 'tsk_x3', store: '小西門店', shift: 'evening', counter: 'M1 櫃台', text: '晚間銷售日結報表', score: 15, completed: false, completedAt: null, completedBy: null }
];
