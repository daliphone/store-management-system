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
    id: 'user_admin',
    name: '總管理處',
    username: 'admin',
    password: '8888',
    role: 'AUDITOR',
    roleLabel: '總管理處稽核員',
    store: '全分店',
    avatar: '🕵️‍♂️',
    permissions: ['view_all_stores', 'complete_tasks', 'manage_accounts']
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
    status: '已下訂',
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
    status: '已交單',
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
    status: '訂貨需求',
    createdAt: '2026-05-17',
    promiseDate: '2026-05-21',
    overdueDays: 5,
    signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="30"><path d="M5 15 q20 10 40 -10 t35 15" fill="none" stroke="black" stroke-width="2"/></svg>',
    notes: '金色缺貨，等調貨到店通知'
  }
];

// 5 大核心日常工作職責模板
export const DEFAULT_TASKS_TEMPLATE = [
  { text: '開店-儀容自檢', score: 10, isPersonal: true },
  { text: '開店-環境清掃', score: 10, isPersonal: false },
  { text: '營業-零用金確認', score: 15, isPersonal: false },
  { text: '營業-隨機盤點庫存', score: 15, isPersonal: false },
  { text: '閉店-庫存表上傳', score: 20, isPersonal: false }
];

// 為 9 家分店動態生成日常工作職責任務 (INITIAL_TASKS)
export const INITIAL_TASKS = STORES.flatMap((store, sIdx) => {
  // 取得屬於該分店的人員，用來動態生成「開店-儀容自檢 (姓名)」
  const storeUsers = USERS.filter(u => u.store === store && u.role !== 'SUPER_ADMIN' && u.role !== 'AUDITOR');
  
  const tasks = [];
  
  // 1. 生成個人儀容自檢任務
  storeUsers.forEach((u, uIdx) => {
    // 東門店的揭怡庭預設完成
    const isEastStoreDemo = store === '東門店' && u.name === '揭怡庭';
    tasks.push({
      id: `tsk_${sIdx}_personal_${uIdx}`,
      store: store,
      text: `開店-儀容自檢 (${u.name})`,
      score: 10,
      completed: isEastStoreDemo,
      completedAt: isEastStoreDemo ? '2026-05-26 09:15:00' : null,
      completedBy: isEastStoreDemo ? '揭怡庭' : null,
      photo: null,
      notes: null
    });
  });

  // 2. 生成分店共用任務 (環境清掃、零用金確認、隨機盤點庫存、庫存表上傳)
  DEFAULT_TASKS_TEMPLATE.filter(t => !t.isPersonal).forEach((t, tIdx) => {
    // 東門店的環境清掃預設完成
    const isEastStoreDemo = store === '東門店' && t.text === '開店-環境清掃';
    tasks.push({
      id: `tsk_${sIdx}_common_${tIdx}`,
      store: store,
      text: t.text,
      score: t.score,
      completed: isEastStoreDemo,
      completedAt: isEastStoreDemo ? '2026-05-26 09:15:00' : null,
      completedBy: isEastStoreDemo ? '何易俞' : null,
      photo: null,
      notes: null
    });
  });

  return tasks;
});
