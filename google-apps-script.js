/**
 * 門市店務管理系統 - Google Apps Script (GAS) 同步指令碼
 * 
 * 目前版本：v1.3.2 - 修正來客數抓取 Row 8 (T8) 累計實績版 (更新日期: 2026-05-30)
 * 
 * 部署說明：
 * 1. 開啟您的 Google 試算表。
 * 2. 點擊功能表「擴充功能」 > 「Apps Script」。
 * 3. 將此檔案程式碼複製並貼上，覆蓋原本內容，然後點選「儲存」。
 * 4. 重新整理您的試算表網頁，上方選單會出現自訂的「馬尼門市系統」選單。
 * 5. 點擊「馬尼門市系統」 > 「一鍵初始化系統工作表 (自動建立與連動格式)」，GAS 就會自動建立 Orders 與 Tasks 分頁、欄位、逾期公式以及變色格式！
 * 6. 點擊右上角「部署」 > 「新增部署」。選取類型為「網頁應用程式」，並設定：
 *    - 說明：馬尼門市管理系統 API (自動格式與時效公式連動版)
 *    - 誰可以存取：任何人 (Anyone)
 * 7. 部署完成後，複製產生的「網頁應用程式 URL」並填入本系統網頁的「設定」中即可！
 */

// 工作表分頁中文化名稱常數
var SHEET_ORDERS = "訂單總表";
var SHEET_TASKS = "待辦任務";
var SHEET_ORDER_STATUS = "訂單狀態異動";
var SHEET_CONFIG = "系統設定";
var SHEET_ECOMMERCE_RATES = "電商費率參數";
var SHEET_ECOMMERCE_DETAILS = "電商扣費明細";
var SHEET_CUSTOMERS = "客戶資料";
var SHEET_SYSTEM_LOGS = "系統操作日誌";
var SHEET_SYSTEM_LOGS_BACKUP = "操作日誌封存";

// 業績資料夾 ID (母目錄或當月子目錄 ID)
var PERFORMANCE_FOLDER_ID = "1WmUILJGUrlFWEUtaADutSluVShQq8dxg";


// 欄位雙向對照表
var ORDER_MAPPING = {
  'id': '編號',
  'platform': '訂單平台',
  'customerName': '客戶姓名',
  'customerPhone': '客戶電話',
  'productName': '商品與承諾內容',
  'type': '類型',
  'store': '分店',
  'creator': '提單人員',
  'source': '客戶來源',
  'tags': '客戶標籤',
  'quantity': '數量',
  'price': '商品單價',
  'cost': '商品成本',
  'status': '到貨狀態',
  'createdAt': '建單日期',
  'promiseDate': '預計交貨日',
  'overdueDays': '逾期天數',
  'signature': '客戶簽名',
  'notes': '備註'
};

var TASK_MAPPING = {
  'id': '任務編號',
  'store': '分店',
  'text': '任務內容',
  'score': '分數',
  'completed': '是否完成',
  'completedAt': '完成時間',
  'completedBy': '完成人員',
  'photo': '現場照片',
  'notes': '備註'
};

var REVERSE_ORDER_MAPPING = getReverseMapping(ORDER_MAPPING);
var REVERSE_TASK_MAPPING = getReverseMapping(TASK_MAPPING);

var CUSTOMER_MAPPING = {
  'id': '客戶編號',
  'name': '姓名',
  'phone': '聯絡電話',
  'lineId': 'LINE ID',
  'notes': '備註說明',
  'creator': '建立者',
  'createdAt': '建立日期',
  'lastFollowUp': '最後跟進日期'
};

var REVERSE_CUSTOMER_MAPPING = getReverseMapping(CUSTOMER_MAPPING);

function getReverseMapping(mapping) {
  var rev = {};
  for (var key in mapping) {
    rev[mapping[key]] = key;
  }
  return rev;
}

// 試算表開啟時，自動新增自訂選單
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('馬尼門市系統')
    .addItem('一鍵初始化系統工作表 (自動建立與連動格式)', 'initializeSystemSheets')
    .addItem('手動整理與封存 30 天前日誌', 'archiveOldLogs')
    .addToUi();
}

// 一鍵自動建立工作表、中文欄位標題、逾期公式與條件式變色格式
function initializeSystemSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 初始化 Orders
  var orderSheet = ss.getSheetByName(SHEET_ORDERS);
  var cnOrderHeaders = ['編號', '客戶姓名', '客戶電話', '商品與承諾內容', '類型', '分店', '提單人員', '客戶來源', '客戶標籤', '數量', '商品單價', '商品成本', '到貨狀態', '建單日期', '預計交貨日', '逾期天數', '客戶簽名', '備註', '訂單平台'];
  
  if (!orderSheet) {
    orderSheet = ss.insertSheet(SHEET_ORDERS);
    orderSheet.appendRow(cnOrderHeaders);
    orderSheet.getRange(1, 1, 1, cnOrderHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    orderSheet.setFrozenRows(1);
  } else {
    if (orderSheet.getLastRow() === 0) {
      orderSheet.appendRow(cnOrderHeaders);
      orderSheet.getRange(1, 1, 1, cnOrderHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    }
  }

  // 2. 初始化 Tasks (配合無時段、無櫃台之新店務)
  var taskSheet = ss.getSheetByName(SHEET_TASKS);
  var cnTaskHeaders = ['任務編號', '分店', '任務內容', '分數', '是否完成', '完成時間', '完成人員', '現場照片', '備註'];
  
  if (!taskSheet) {
    taskSheet = ss.insertSheet(SHEET_TASKS);
    taskSheet.appendRow(cnTaskHeaders);
    taskSheet.getRange(1, 1, 1, cnTaskHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    taskSheet.setFrozenRows(1);
  } else {
    if (taskSheet.getLastRow() === 0) {
      taskSheet.appendRow(cnTaskHeaders);
      taskSheet.getRange(1, 1, 1, cnTaskHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    }
  }

  // 3. 初始化 OrderStatus (訂單狀態異動歷史紀錄)
  var statusSheet = ss.getSheetByName(SHEET_ORDER_STATUS);
  var cnStatusHeaders = ['紀錄編號', '變更時間', '訂單編號', '客戶姓名', '客戶電話', '商品名稱', '異動前狀態', '異動後狀態', '經辦同仁', '所屬分店', '備註'];
  
  if (!statusSheet) {
    statusSheet = ss.insertSheet(SHEET_ORDER_STATUS);
    statusSheet.appendRow(cnStatusHeaders);
    statusSheet.getRange(1, 1, 1, cnStatusHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    statusSheet.setFrozenRows(1);
  } else {
    if (statusSheet.getLastRow() === 0) {
      statusSheet.appendRow(cnStatusHeaders);
      statusSheet.getRange(1, 1, 1, cnStatusHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    }
  }

  // 3.5. 初始化 Config (系統設定參數表，主要存放 LINE Token 等)
  var configSheet = ss.getSheetByName(SHEET_CONFIG);
  var cnConfigHeaders = ['設定鍵', '設定值', '說明'];
  var defaultConfigRows = [
    ['LINE_ACCESS_TOKEN', '', 'LINE Channel Access Token (主動推播用)'],
    ['LINE_GROUP_ID', '', 'LINE Group ID (接收推播的群組編號)'],
    ['LINE_REMINDER_TIME', '09:00', '每日電商部進度推播時間 (HH:MM)']
  ];
  
  if (!configSheet) {
    configSheet = ss.insertSheet(SHEET_CONFIG);
    configSheet.appendRow(cnConfigHeaders);
    configSheet.getRange(1, 1, 1, cnConfigHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    defaultConfigRows.forEach(function(row) {
      configSheet.appendRow(row);
    });
    configSheet.setFrozenRows(1);
  } else {
    if (configSheet.getLastRow() === 0) {
      configSheet.appendRow(cnConfigHeaders);
      configSheet.getRange(1, 1, 1, cnConfigHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
      defaultConfigRows.forEach(function(row) {
        configSheet.appendRow(row);
      });
    } else {
      // 確保必要的設定鍵都存在
      var existingData = configSheet.getDataRange().getValues();
      var existingKeys = existingData.map(function(r) { return r[0]; });
      defaultConfigRows.forEach(function(row) {
        if (existingKeys.indexOf(row[0]) === -1) {
          configSheet.appendRow(row);
        }
      });
    }
  }
  
  try {
    configSheet.autoResizeColumns(1, 3);
    configSheet.setColumnWidth(2, 280);
    configSheet.setColumnWidth(3, 240);
  } catch(e) {}

  // 3.6. 初始化 ECommerceRates (蝦皮費率工作表)
  var ratesSheet = ss.getSheetByName(SHEET_ECOMMERCE_RATES);
  var cnRatesHeaders = ['平台代碼', '品類代碼', '品類名稱', '成交手續費率', '金流費率', '蝦幣費率', '免運費率', '免運固定費', '直送後毛率', '成交上限標記', '大促日加收率'];
  var defaultRatesRows = [
    // 蝦商 長期免運2+5%回饋 (mall) - 31 筆
    ['mall', 'phone', '📱 手機 (一般5.5% / 商城3.8%)', 0.038, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'tablet', '📟 平板電腦 (一般5.5% / 商城4.0%)', 0.040, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'wearable', '⌚ 穿戴裝置 (一般5.5% / 商城4.5%)', 0.045, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'earphone', '🎧 耳機/耳麥/藍牙耳機 (一般5.5% / 商城6.5%)', 0.065, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'audio_amp', '🎛️ 擴大機/混音器 (一般4.0% / 商城6.0%)', 0.060, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'speaker_audio_player', '🔊 音響/喇叭/麥克風/播放器 (一般6.0% / 商城7.5%)', 0.075, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'audio_cable_other', '🔌 視聽線材/轉換器/其他音訊 (一般6.0% / 商城8.0%)', 0.080, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'camera_lens', '🔍 相機鏡頭 (一般5.0% / 商城5.0%)', 0.050, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'camera', '📷 相機 (一般6.0% / 商城6.0%)', 0.060, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'drone', '🛸 空拍機 (一般6.0% / 商城6.5%)', 0.065, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'camera_acc', '🎒 相機保養/周邊配件 (一般6.0% / 商城7.5%)', 0.075, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'camera_security_lens_acc', '🚨 安全監控/鏡頭與空拍周邊 (一般6.0% / 商城8.0%)', 0.080, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'camera_other', '📦 其他相機周邊與分類 (一般6.0% / 商城8.5%)', 0.085, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'laptop', '💻 筆記型電腦 (一般5.0% / 商城4.0%)', 0.040, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'desktop', '🖥️ 桌上型電腦 (一般5.5% / 商城5.0%)', 0.050, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'monitor_storage', '🖥️ 螢幕顯示器/儲存裝置 (一般5.5% / 商城5.5%)', 0.055, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'computer_component', '💾 電腦零組件 (一般6.0% / 商城6.5%)', 0.065, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'keyboard_mouse', '⌨️ 鍵盤/滑鼠 (一般6.0% / 商城7.0%)', 0.070, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'computer_acc_network', '🔌 電腦周邊/辦公設備/網路與線材 (一般6.0% / 商城7.5%)', 0.075, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'software_printer_scanner', '💿 軟體/印表機/掃描機 (一般6.0% / 商城8.0%)', 0.080, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'pc_other', '📁 其他電腦周邊 (一般6.0% / 商城8.7%)', 0.087, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'large_appliances', '📺 大型家電 (一般5.3% / 商城5.8%)', 0.058, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'life_appliances', '🍳 生活/廚房/電視家電 (一般5.5% / 商城6.0%)', 0.060, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'home_parts', '🔋 家用零件/電池/遙控器 (一般6.0% / 商城8.0%)', 0.080, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'projector_other_appliances', '📹 投影機與周邊/其他家電 (一般7.5% / 商城8.5%)', 0.085, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'walkie_talkie', '📟 對講機 (一般6.5% / 商城9.5%)', 0.095, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'phone_acc_other', '🔌 手機周邊配件/儲值卡/其他 (一般7.5% / 商城9.5%)', 0.095, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'game_console', '🎮 電玩主機 (一般5.5% / 商城3.5%)', 0.035, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'game_software', '💿 主機遊戲 (一般5.5% / 商城6.5%)', 0.065, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'game_acc', '🕹️ 主機周邊 (一般6.0% / 商城7.5%)', 0.075, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    ['mall', 'healthcare_beauty', '🥗 保健食品/醫療/美妝保養 (一般6% / 商城9%)', 0.090, 0.025, 0.015, 0, 60, 0, '否', 0.03],
    
    // 蝦拍10倍館(綁免運2+10%回饋) (auction_10) - 31 筆
    ['auction_10', 'phone', '📱 手機 (一般5.5% / 商城3.8%)', 0.055, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'tablet', '📟 平板電腦 (一般5.5% / 商城4.0%)', 0.055, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'wearable', '⌚ 穿戴裝置 (一般5.5% / 商城4.5%)', 0.055, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'earphone', '🎧 耳機/耳麥/藍牙耳機 (一般5.5% / 商城6.5%)', 0.055, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'audio_amp', '🎛️ 擴大機/混音器 (一般4.0% / 商城6.0%)', 0.040, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'speaker_audio_player', '🔊 音響/喇叭/麥克風/播放器 (一般6.0% / 商城7.5%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'audio_cable_other', '🔌 視聽線材/轉換器/其他音訊 (一般6.0% / 商城8.0%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'camera_lens', '🔍 相機鏡頭 (一般5.0% / 商城5.0%)', 0.050, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'camera', '📷 相機 (一般6.0% / 商城6.0%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'drone', '🛸 空拍機 (一般6.0% / 商城6.5%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'camera_acc', '🎒 相機保養/周邊配件 (一般6.0% / 商城7.5%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'camera_security_lens_acc', '🚨 安全監控/鏡頭與空拍周邊 (一般6.0% / 商城8.0%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'camera_other', '📦 其他相機周邊與分類 (一般6.0% / 商城8.5%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'laptop', '💻 筆記型電腦 (一般5.0% / 商城4.0%)', 0.050, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'desktop', '🖥️ 桌上型電腦 (一般5.5% / 商城5.0%)', 0.055, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'monitor_storage', '🖥️ 螢幕顯示器/儲存裝置 (一般5.5% / 商城5.5%)', 0.055, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'computer_component', '💾 電腦零組件 (一般6.0% / 商城6.5%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'keyboard_mouse', '⌨️ 鍵盤/滑鼠 (一般6.0% / 商城7.0%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'computer_acc_network', '🔌 電腦周邊/辦公設備/網路與線材 (一般6.0% / 商城7.5%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'software_printer_scanner', '💿 軟體/印表機/掃描機 (一般6.0% / 商城8.0%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'pc_other', '📁 其他電腦周邊 (一般6.0% / 商城8.7%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'large_appliances', '📺 大型家電 (一般5.3% / 商城5.8%)', 0.053, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'life_appliances', '🍳 生活/廚房/電視家電 (一般5.5% / 商城6.0%)', 0.055, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'home_parts', '🔋 家用零件/電池/遙控器 (一般6.0% / 商城8.0%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'projector_other_appliances', '📹 投影機與周邊/其他家電 (一般7.5% / 商城8.5%)', 0.075, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'walkie_talkie', '📟 對講機 (一般6.5% / 商城9.5%)', 0.065, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'phone_acc_other', '🔌 手機周邊配件/儲值卡/其他 (一般7.5% / 商城9.5%)', 0.075, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'game_console', '🎮 電玩主機 (一般5.5% / 商城3.5%)', 0.055, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'game_software', '💿 主機遊戲 (一般5.5% / 商城6.5%)', 0.055, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'game_acc', '🕹️ 主機周邊 (一般6.0% / 商城7.5%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    ['auction_10', 'healthcare_beauty', '🥗 保健食品/醫療/美妝保養 (一般6% / 商城9%)', 0.060, 0.025, 0.025, 0, 60, 0, '是', 0.02],
    
    // 蝦拍5倍館(綁免運1+5%回饋) (auction_5) - 31 筆
    ['auction_5', 'phone', '📱 手機 (一般5.5% / 商城3.8%)', 0.055, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'tablet', '📟 平板電腦 (一般5.5% / 商城4.0%)', 0.055, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'wearable', '⌚ 穿戴裝置 (一般5.5% / 商城4.5%)', 0.055, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'earphone', '🎧 耳機/耳麥/藍牙耳機 (一般5.5% / 商城6.5%)', 0.055, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'audio_amp', '🎛️ 擴大機/混音器 (一般4.0% / 商城6.0%)', 0.040, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'speaker_audio_player', '🔊 音響/喇叭/麥克風/播放器 (一般6.0% / 商城7.5%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'audio_cable_other', '🔌 視聽線材/轉換器/其他音訊 (一般6.0% / 商城8.0%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'camera_lens', '🔍 相機鏡頭 (一般5.0% / 商城5.0%)', 0.050, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'camera', '📷 相機 (一般6.0% / 商城6.0%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'drone', '🛸 空拍機 (一般6.0% / 商城6.5%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'camera_acc', '🎒 相機保養/周邊配件 (一般6.0% / 商城7.5%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'camera_security_lens_acc', '🚨 安全監控/鏡頭與空拍周邊 (一般6.0% / 商城8.0%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'camera_other', '📦 其他相機周邊與分類 (一般6.0% / 商城8.5%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'laptop', '💻 筆記型電腦 (一般5.0% / 商城4.0%)', 0.050, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'desktop', '🖥️ 桌上型電腦 (一般5.5% / 商城5.0%)', 0.055, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'monitor_storage', '🖥️ 螢幕顯示器/儲存裝置 (一般5.5% / 商城5.5%)', 0.055, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'computer_component', '💾 電腦零組件 (一般6.0% / 商城6.5%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'keyboard_mouse', '⌨️ 鍵盤/滑鼠 (一般6.0% / 商城7.0%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'computer_acc_network', '🔌 電腦周邊/辦公設備/網路與線材 (一般6.0% / 商城7.5%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'software_printer_scanner', '💿 軟體/印表機/掃描機 (一般6.0% / 商城8.0%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'pc_other', '📁 其他電腦周邊 (一般6.0% / 商城8.7%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'large_appliances', '📺 大型家電 (一般5.3% / 商城5.8%)', 0.053, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'life_appliances', '🍳 生活/廚房/電視家電 (一般5.5% / 商城6.0%)', 0.055, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'home_parts', '🔋 家用零件/電池/遙控器 (一般6.0% / 商城8.0%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'projector_other_appliances', '📹 投影機與周邊/其他家電 (一般7.5% / 商城8.5%)', 0.075, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'walkie_talkie', '📟 對講機 (一般6.5% / 商城9.5%)', 0.065, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'phone_acc_other', '🔌 手機周邊配件/儲值卡/其他 (一般7.5% / 商城9.5%)', 0.075, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'game_console', '🎮 電玩主機 (一般5.5% / 商城3.5%)', 0.055, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'game_software', '💿 主機遊戲 (一般5.5% / 商城6.5%)', 0.055, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'game_acc', '🕹️ 主機周邊 (一般6.0% / 商城7.5%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    ['auction_5', 'healthcare_beauty', '🥗 保健食品/醫療/美妝保養 (一般6% / 商城9%)', 0.060, 0.025, 0.015, 0.06, 0, 0, '是', 0.02],
    
    // 蝦皮直送 (direct) - 6 筆
    ['direct', 'phone', '📱 直送手機 (前毛5.5% + 後毛2%)', 0.055, 0, 0, 0, 0, 0.02, '否', 0],
    ['direct', 'tablet', '📟 直送平板/筆電/穿戴/週邊 (前毛6.5% + 後毛2%)', 0.065, 0, 0, 0, 0, 0.02, '否', 0],
    ['direct', 'earphone', '🎧 直送耳機 - 手機品牌 (前毛10% + 後毛2%)', 0.10, 0, 0, 0, 0, 0.02, '否', 0],
    ['direct', 'speaker', '🔊 直送耳機 - 其他品牌/音響 (前毛12% + 後毛2%)', 0.12, 0, 0, 0, 0, 0.02, '否', 0],
    ['direct', 'appliances', '📺 直送家用電器 (前毛10% + 後毛2%)', 0.10, 0, 0, 0, 0, 0.02, '否', 0],
    ['direct', 'accessories', '🔌 直送手機配件/其他 (前毛12% + 後毛2%)', 0.12, 0, 0, 0, 0, 0.02, '否', 0]
  ];
  
  if (!ratesSheet) {
    ratesSheet = ss.insertSheet(SHEET_ECOMMERCE_RATES);
    ratesSheet.appendRow(cnRatesHeaders);
    ratesSheet.getRange(1, 1, 1, cnRatesHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    defaultRatesRows.forEach(function(row) {
      ratesSheet.appendRow(row);
    });
    ratesSheet.setFrozenRows(1);
  } else {
    if (ratesSheet.getLastRow() === 0) {
      ratesSheet.appendRow(cnRatesHeaders);
      ratesSheet.getRange(1, 1, 1, cnRatesHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
      defaultRatesRows.forEach(function(row) {
        ratesSheet.appendRow(row);
      });
    }
  }

  // 3.7. 初始化 ECommerceDetails (扣費明細工作表)
  var detailsSheet = ss.getSheetByName(SHEET_ECOMMERCE_DETAILS);
  var cnDetailsHeaders = ['訂單編號', '計算時間', '賣場方案', '商品品類', '原始賣價', '商品成本', '成交手續費', '金流服務費', '免運服務費', '蝦幣服務費', '物流隱碼費', '直送後毛費', '抽成總計', '實拿金額', '預估毛利', '預估毛利率'];
  if (!detailsSheet) {
    detailsSheet = ss.insertSheet(SHEET_ECOMMERCE_DETAILS);
    detailsSheet.appendRow(cnDetailsHeaders);
    detailsSheet.getRange(1, 1, 1, cnDetailsHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    detailsSheet.setFrozenRows(1);
  } else {
    if (detailsSheet.getLastRow() === 0) {
      detailsSheet.appendRow(cnDetailsHeaders);
      detailsSheet.getRange(1, 1, 1, cnDetailsHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    }
  }

  // 3.8. 初始化 Customers (客戶資料表)
  var customerSheet = ss.getSheetByName(SHEET_CUSTOMERS);
  var cnCustomerHeaders = ['客戶編號', '姓名', '聯絡電話', 'LINE ID', '備註說明', '建立者', '建立日期', '最後跟進日期'];
  if (!customerSheet) {
    customerSheet = ss.insertSheet(SHEET_CUSTOMERS);
    customerSheet.appendRow(cnCustomerHeaders);
    customerSheet.getRange(1, 1, 1, cnCustomerHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    customerSheet.setFrozenRows(1);
    // 寫入初始預設客戶資料
    var defaultCustomerRows = [
      ['cust_1', '林大經', '0929-341-060', 'dajing929', '台南六甲店熟客', '1074', '2026-05-06', '2026-05-06'],
      ['cust_2', '陳育德', '0938-677-206', 'yude938', '合約續約客戶', '1074', '2026-05-10', '2026-05-10'],
      ['cust_3', '詹政良', '0915-055-209', 'zhengliang915', '喜好紅米系列產品', 'admin', '2026-05-15', '2026-05-15'],
      ['cust_4', '游小姐', '0915-556-589', 'missyou', '調貨機型通知', 'admin', '2026-05-17', '2026-05-17']
    ];
    defaultCustomerRows.forEach(function(row) {
      customerSheet.appendRow(row);
    });
  } else {
    if (customerSheet.getLastRow() === 0) {
      customerSheet.appendRow(cnCustomerHeaders);
      customerSheet.getRange(1, 1, 1, cnCustomerHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    }
  }

  // 3.9. 初始化 SystemLogs (系統操作日誌表)
  var logSheet = ss.getSheetByName(SHEET_SYSTEM_LOGS);
  var cnLogHeaders = ['紀錄時間', '操作人員', '角色權限', '動作類型', '受影響模組', '詳細描述'];
  if (!logSheet) {
    logSheet = ss.insertSheet(SHEET_SYSTEM_LOGS);
    logSheet.appendRow(cnLogHeaders);
    logSheet.getRange(1, 1, 1, cnLogHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    logSheet.setFrozenRows(1);
  } else {
    if (logSheet.getLastRow() === 0) {
      logSheet.appendRow(cnLogHeaders);
      logSheet.getRange(1, 1, 1, cnLogHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    }
  }

  // 3.10. 初始化 SystemLogs_Backup (操作日誌封存表)
  var backupSheet = ss.getSheetByName(SHEET_SYSTEM_LOGS_BACKUP);
  if (!backupSheet) {
    backupSheet = ss.insertSheet(SHEET_SYSTEM_LOGS_BACKUP);
    backupSheet.appendRow(cnLogHeaders);
    backupSheet.getRange(1, 1, 1, cnLogHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    backupSheet.setFrozenRows(1);
  } else {
    if (backupSheet.getLastRow() === 0) {
      backupSheet.appendRow(cnLogHeaders);
      backupSheet.getRange(1, 1, 1, cnLogHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    }
  }

  // 4. 套用條件式格式設定 (顏色提示連動)
  try {
    applyConditionalFormatting(orderSheet);
  } catch(e) {}

  // 5. 整理版面格式與對齊 (欄寬自適應、文字靠左、標題置中)
  try {
    orderSheet.getRange(1, 1, 1000, cnOrderHeaders.length).setHorizontalAlignment("left");
    orderSheet.getRange(1, 1, 1, cnOrderHeaders.length).setHorizontalAlignment("center");
    taskSheet.getRange(1, 1, 1000, cnTaskHeaders.length).setHorizontalAlignment("left");
    taskSheet.getRange(1, 1, 1, cnTaskHeaders.length).setHorizontalAlignment("center");
    statusSheet.getRange(1, 1, 1000, cnStatusHeaders.length).setHorizontalAlignment("left");
    statusSheet.getRange(1, 1, 1, cnStatusHeaders.length).setHorizontalAlignment("center");
    
    // 執行細部排版優化 (設定固定寬度，防止 Base64 簽名與照片撐爆欄位)
    formatOrderSheet(orderSheet);
    formatTaskSheet(taskSheet);
    formatStatusSheet(statusSheet);
    formatRatesSheet(ratesSheet);
    formatDetailsSheet(detailsSheet);
    formatCustomerSheet(customerSheet);
    formatLogSheet(logSheet);
    formatLogSheet(backupSheet);
  } catch(e) {}

  // 註冊自動按月封存日誌定時器 (每月 1 號凌晨 3 點自動執行)
  try {
    setupArchiveTrigger();
  } catch(e) {}

  // 清除預設空白 Sheet1
  var sheet1 = ss.getSheetByName("工作表1") || ss.getSheetByName("Sheet1");
  if (sheet1 && ss.getSheets().length > 4 && sheet1.getLastRow() === 0) {
    try {
      ss.deleteSheet(sheet1);
    } catch(e) {}
  }

  // 彈出成功提示
  try {
    SpreadsheetApp.getUi().alert('🎉 馬尼門市系統初始化成功！\n\n1. 已自動建立「' + SHEET_ORDERS + '」、「' + SHEET_TASKS + '」、「' + SHEET_ORDER_STATUS + '」、「' + SHEET_CONFIG + '」分頁。\n2. 新增「' + SHEET_CUSTOMERS + '」（客戶表）與「' + SHEET_SYSTEM_LOGS + '」（操作日誌表）。\n3. 新增「' + SHEET_SYSTEM_LOGS_BACKUP + '」（日誌封存表）並自動設定「每月自動封存舊日誌」定時排程！\n4. 套用欄位格式優化與時效警示格式！');
  } catch(e) {}
  
  return { status: 'success', message: '工作表初始化建立成功' };
}

// 自動註冊按月封存舊日誌的定時器
function setupArchiveTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var triggerExists = false;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'archiveOldLogs') {
      triggerExists = true;
      break;
    }
  }
  if (!triggerExists) {
    // 建立每個月 1 號凌晨 3 點執行的定時器
    ScriptApp.newTrigger('archiveOldLogs')
      .timeBased()
      .onMonthDay(1)
      .atHour(3)
      .create();
  }
}

// 細部排版與寬度設定 (Customers)
function formatCustomerSheet(sheet) {
  if (!sheet) return;
  try {
    sheet.autoResizeColumns(1, 8);
    sheet.setColumnWidth(5, 180); // 備註說明固定寬度
  } catch(e) {}
}

// 細部排版與寬度設定 (SystemLogs)
function formatLogSheet(sheet) {
  if (!sheet) return;
  try {
    sheet.setColumnWidth(1, 145); // 紀錄時間
    sheet.setColumnWidth(2, 85);  // 操作人員
    sheet.setColumnWidth(3, 95);  // 角色權限
    sheet.setColumnWidth(4, 130); // 動作類型
    sheet.setColumnWidth(5, 100); // 受影響模組
    sheet.setColumnWidth(6, 280); // 詳細描述
  } catch(e) {}
}

// 細部排版與寬度設定 (OrderStatus)
function formatStatusSheet(sheet) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  var maxRows = Math.max(lastRow, 1000);
  
  try {
    sheet.autoResizeColumns(1, 11);
  } catch(e) {}
  
  var minWidths = {
    1: 130, // 紀錄編號
    2: 140, // 變更時間
    3: 110, // 訂單編號
    4: 80,  // 客戶姓名
    5: 105, // 客戶電話
    6: 220, // 商品名稱
    7: 90,  // 異動前狀態
    8: 90,  // 異動後狀態
    9: 80,  // 經辦同仁
    10: 95, // 所屬分店
    11: 160 // 備註
  };
  
  for (var col in minWidths) {
    var colNum = parseInt(col);
    try {
      if (sheet.getColumnWidth(colNum) < minWidths[col]) {
        sheet.setColumnWidth(colNum, minWidths[col]);
      }
    } catch(e) {}
  }

  sheet.getRange(2, 6, maxRows - 1, 1).setWrap(true);
  sheet.getRange(2, 11, maxRows - 1, 1).setWrap(true);
}


// 細部排版與防止簽名欄撐爆的格式設定 (Orders)
function formatOrderSheet(sheet) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  var maxRows = Math.max(lastRow, 1000);
  
  // 1. 強制設定「客戶簽名」(第 17 欄，Q 欄) 寬度為 80 像素，防止 autoResize 拉大到幾萬像素
  sheet.setColumnWidth(17, 80);
  // 設定「備註」(第 18 欄，R 欄) 寬度為固定 160 像素
  sheet.setColumnWidth(18, 160);
  // 設定「訂單平台」(第 19 欄，S 欄) 寬度為固定 110 像素
  sheet.setColumnWidth(19, 110);
  
  // 2. 對其他 1 ~ 16 欄進行自動調整欄寬 (避開簽名與備註)
  try {
    sheet.autoResizeColumns(1, 16);
    sheet.autoResizeColumns(19, 1);
  } catch(e) {}
  
  // 3. 設定合理最小寬度，以防自動調整後欄位擠在一起
  var minWidths = {
    1: 70,  // 編號
    2: 80,  // 客戶姓名
    3: 100, // 客戶電話
    4: 220, // 商品與承諾內容
    5: 60,  // 類型
    6: 90,  // 分店
    7: 80,  // 提單人員
    8: 80,  // 客戶來源
    9: 110, // 客戶標籤
    10: 50, // 數量
    11: 80, // 單價
    12: 80, // 成本
    13: 85, // 到貨狀態
    14: 95, // 建單日期
    15: 95, // 預計交貨日
    16: 80, // 逾期天數
    19: 110 // 訂單平台
  };
  
  for (var col in minWidths) {
    var colNum = parseInt(col);
    try {
      if (sheet.getColumnWidth(colNum) < minWidths[col]) {
        sheet.setColumnWidth(colNum, minWidths[col]);
      }
    } catch(e) {}
  }

  // 4. 設定換行與剪裁模式
  sheet.getRange(2, 4, maxRows - 1, 1).setWrap(true);
  sheet.getRange(2, 18, maxRows - 1, 1).setWrap(true);
  sheet.getRange(2, 17, maxRows - 1, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
}

// 細部排版與寬度設定 (Tasks)
function formatTaskSheet(sheet) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  var maxRows = Math.max(lastRow, 1000);
  
  // 現場照片在第 8 欄，寬度固定 80 像素，防止 base64 撐寬
  sheet.setColumnWidth(8, 80);
  sheet.setColumnWidth(9, 160); // 備註固定 160 像素
  
  try {
    sheet.autoResizeColumns(1, 7);
  } catch(e) {}
  
  var minWidths = {
    1: 85,  // 任務編號
    2: 85,  // 分店
    3: 250, // 任務內容
    4: 60,  // 分數
    5: 80,  // 是否完成
    6: 125, // 完成時間
    7: 80   // 完成人員
  };
  
  for (var col in minWidths) {
    var colNum = parseInt(col);
    try {
      if (sheet.getColumnWidth(colNum) < minWidths[col]) {
        sheet.setColumnWidth(colNum, minWidths[col]);
      }
    } catch(e) {}
  }
  
  // 任務內容 (C欄 - 3)、備註 (I欄 - 9) 設定為自動換行 (Wrap)
  sheet.getRange(2, 3, maxRows - 1, 1).setWrap(true);
  sheet.getRange(2, 9, maxRows - 1, 1).setWrap(true);
  // 現場照片 (H欄 - 8) 設定為剪裁
  sheet.getRange(2, 8, maxRows - 1, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
}

// 自動設置試算表的條件式格式 (時效提示連動)
function applyConditionalFormatting(sheet) {
  if (!sheet) return;
  
  sheet.clearConditionalFormatRules();
  var rules = [];
  
  var range = sheet.getRange("A2:R1000");
  
  // Rule 1: 已交機 (藍色背景 - 整列套用)
  var ruleDelivered = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$M2="已交機"')
    .setBackground("#E0F2FE") // sky-100 (淺藍)
    .setFontColor("#0369A1")   // sky-700 (深藍)
    .setRanges([range])
    .build();
  rules.push(ruleDelivered);
    
  // Rule 2: 嚴重逾期 (紅色背景，逾期 >= 7 天)
  var ruleCritical = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($M2<>"已交機", $P2>=7)')
    .setBackground("#FEE2E2") // red-100 (淺紅)
    .setFontColor("#B91C1C")   // red-700 (深紅)
    .setRanges([range])
    .build();
  rules.push(ruleCritical);
    
  // Rule 3: 一般逾期 (橘色背景，逾期 1~6 天)
  var ruleOverdue = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($M2<>"已交機", $P2>0, $P2<7)')
    .setBackground("#FFEDD5") // orange-100 (淺橘)
    .setFontColor("#C2410C")   // orange-700 (深橘)
    .setRanges([range])
    .build();
  rules.push(ruleOverdue);
    
  // Rule 4: 即將到期 (黃色背景，交貨日前 2 天內且尚未逾期)
  var ruleWarning = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($M2<>"已交機", $P2=0, ($O2-TODAY())<=2, ($O2-TODAY())>=0)')
    .setBackground("#FEF9C3") // yellow-100 (淺黃)
    .setFontColor("#A16207")   // yellow-700 (深黃)
    .setRanges([range])
    .build();
  rules.push(ruleWarning);

  // Rule 5: 已到貨且未逾期 (綠色背景)
  var ruleArrived = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($M2="已到貨", $P2=0)')
    .setBackground("#DCFCE7") // green-100 (淺綠)
    .setFontColor("#15803D")   // green-700 (深綠)
    .setRanges([range])
    .build();
  rules.push(ruleArrived);

  sheet.setConditionalFormatRules(rules);
}

// 防呆安全檢查：在每次 API 操作前，確保分頁與標題必定存在
function ensureSheetsExist() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orderSheet = ss.getSheetByName(SHEET_ORDERS);
  var taskSheet = ss.getSheetByName(SHEET_TASKS);
  var statusSheet = ss.getSheetByName(SHEET_ORDER_STATUS);
  var customerSheet = ss.getSheetByName(SHEET_CUSTOMERS);
  var logSheet = ss.getSheetByName(SHEET_SYSTEM_LOGS);
  if (!orderSheet || !taskSheet || !statusSheet || !customerSheet || !logSheet) {
    initializeSystemSheets();
  }
}

function doGet(e) {
  ensureSheetsExist();
  var action = e.parameter.action;
  
  if (action === 'readAll') {
    return handleReadAll();
  } else if (action === 'getLineConfig') {
    return handleGetLineConfig();
  } else if (action === 'getECommerceRates') {
    return handleGetECommerceRates();
  } else if (action === 'getStorePerformance') {
    var result = handleGetStorePerformance(e.parameter.storeName, e.parameter.sheetName, e.parameter.role);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: '未知的 Action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  ensureSheetsExist();
  var result = { status: 'error', message: '請求失敗' };
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    
    if (action === 'addOrder') {
      result = handleAddOrder(postData.order, postData.calcResult);
    } else if (action === 'updateTask') {
      result = handleUpdateTask(postData.taskId, postData.completed, postData.completedBy, postData.completedAt, postData.photo, postData.notes);
    } else if (action === 'syncAll') {
      result = handleSyncAll(postData.orders, postData.tasks);
    } else if (action === 'updateOrderStatus') {
      result = handleUpdateOrderStatus(postData.orderId, postData.newStatus, postData.signature, postData.operator);
    } else if (action === 'saveEditedOrder') {
      result = handleSaveEditedOrder(postData.order, postData.calcResult, postData.operator);
    } else if (action === 'addOrdersBatch') {
      result = handleAddOrdersBatch(postData.orders);
    } else if (action === 'saveLineConfig') {
      result = handleSaveLineConfig(postData.accessToken, postData.groupId, postData.reminderTime);
    } else if (action === 'testLinePush') {
      result = handleTestLinePush();
    } else if (action === 'syncCustomers') {
      result = handleSyncCustomers(postData.customers);
    } else if (action === 'writeLog') {
      result = handleWriteLog(postData.operator, postData.role, postData.actionType, postData.targetModule, postData.description);
    } else if (action === 'submitDailyPerformance') {
      result = handleSubmitDailyPerformance(postData.input);
    }
  } catch (err) {
    result = { status: 'error', message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// 取得所有訂單與任務
function handleReadAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var orderSheet = ss.getSheetByName(SHEET_ORDERS);
  var orders = [];
  if (orderSheet) {
    var orderData = orderSheet.getDataRange().getValues();
    var orderHeaders = orderData[0];
    for (var i = 1; i < orderData.length; i++) {
      var row = orderData[i];
      var order = {};
      for (var j = 0; j < orderHeaders.length; j++) {
        var cnHeader = orderHeaders[j];
        var engKey = REVERSE_ORDER_MAPPING[cnHeader] || cnHeader;
        var val = row[j];
        
        if (engKey === 'tags') {
          try {
            order[engKey] = JSON.parse(val);
          } catch(e) {
            order[engKey] = val ? val.toString().split(',') : [];
          }
        } else {
          order[engKey] = val;
        }
      }
      orders.push(order);
    }
  }
  
  var taskSheet = ss.getSheetByName(SHEET_TASKS);
  var tasks = [];
  if (taskSheet) {
    var taskData = taskSheet.getDataRange().getValues();
    var taskHeaders = taskData[0];
    for (var i = 1; i < taskData.length; i++) {
      var row = taskData[i];
      var task = {};
      for (var j = 0; j < taskHeaders.length; j++) {
        var cnHeader = taskHeaders[j];
        var engKey = REVERSE_TASK_MAPPING[cnHeader] || cnHeader;
        var val = row[j];
        
        if (engKey === 'completed') {
          task[engKey] = (val === true || val === 'true' || val === '是');
        } else if (engKey === 'score') {
          task[engKey] = Number(val);
        } else {
          task[engKey] = val;
        }
      }
      tasks.push(task);
    }
  }
  
  var customerSheet = ss.getSheetByName(SHEET_CUSTOMERS);
  var customers = [];
  if (customerSheet) {
    var customerData = customerSheet.getDataRange().getValues();
    var customerHeaders = customerData[0];
    for (var i = 1; i < customerData.length; i++) {
      var row = customerData[i];
      var customer = {};
      for (var j = 0; j < customerHeaders.length; j++) {
        var cnHeader = customerHeaders[j];
        var engKey = REVERSE_CUSTOMER_MAPPING[cnHeader] || cnHeader;
        customer[engKey] = row[j];
      }
      customers.push(customer);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', orders: orders, tasks: tasks, customers: customers }))
    .setMimeType(ContentService.MimeType.JSON);
}

// 新增訂單 (寫入試算表動態逾期公式，並記錄到 OrderStatus 與 ECommerceDetails)
function handleAddOrder(order, calcResult) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_ORDERS);
  if (!sheet) return { status: 'error', message: '找不到 Orders 工作表' };
  
  var headers = sheet.getDataRange().getValues()[0];
  var newRow = [];
  var targetRow = sheet.getLastRow() + 1;
  
  for (var i = 0; i < headers.length; i++) {
    var cnHeader = headers[i];
    var engKey = REVERSE_ORDER_MAPPING[cnHeader] || cnHeader;
    var val = order[engKey];
    
    if (engKey === 'tags') {
      newRow.push(JSON.stringify(val || []));
    } else if (engKey === 'overdueDays') {
      newRow.push('=IF(OR(M' + targetRow + '="已交機", M' + targetRow + '="已交單"), 0, MAX(0, TODAY() - O' + targetRow + '))');
    } else {
      newRow.push(val !== undefined ? val : '');
    }
  }
  
  sheet.appendRow(newRow);
  
  // 寫入計算明細到 ECommerceDetails
  if (calcResult) {
    try {
      writeECommerceDetailInternal(ss, order.id, calcResult);
    } catch(e) {}
  }
  
  try {
    logStatusChangeInternal(ss, order.id, order, "(新建)", order.status || '訂貨需求', order.creator, "新建訂單");
  } catch(e) {}
  
  try {
    formatOrderSheet(sheet);
    applyConditionalFormatting(sheet);
  } catch(e) {}
  
  return { status: 'success', message: '訂單新增成功', orderId: order.id };
}

// 內部狀態變更歷程紀錄寫入輔助函數
function logStatusChangeInternal(ss, orderId, orderData, oldStatus, newStatus, operator, notes) {
  var statusSheet = ss.getSheetByName(SHEET_ORDER_STATUS);
  if (!statusSheet) return;
  
  var logId = "log_" + Math.random().toString(36).substr(2, 9) + "_" + new Date().getTime();
  var timeStr = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm:ss");
  
  var cnStatusHeaders = ['紀錄編號', '變更時間', '訂單編號', '客戶姓名', '客戶電話', '商品名稱', '異動前狀態', '異動後狀態', '經辦同仁', '所屬分店', '備註'];
  var newRow = [];
  
  for (var i = 0; i < cnStatusHeaders.length; i++) {
    var header = cnStatusHeaders[i];
    switch(header) {
      case '紀錄編號': newRow.push(logId); break;
      case '變更時間': newRow.push(timeStr); break;
      case '訂單編號': newRow.push(orderId); break;
      case '客戶姓名': newRow.push(orderData.customerName || ''); break;
      case '客戶電話': newRow.push(orderData.customerPhone || ''); break;
      case '商品名稱': newRow.push(orderData.productName || ''); break;
      case '異動前狀態': newRow.push(oldStatus || ''); break;
      case '異動後狀態': newRow.push(newStatus || ''); break;
      case '經辦同仁': newRow.push(operator || ''); break;
      case '所屬分店': newRow.push(orderData.store || ''); break;
      case '備註': newRow.push(notes || ''); break;
      default: newRow.push('');
    }
  }
  
  statusSheet.appendRow(newRow);
  try {
    formatStatusSheet(statusSheet);
  } catch(e) {}
}

// 更新單筆訂單狀態，並在 OrderStatus 中寫入變更歷史
function handleUpdateOrderStatus(orderId, newStatus, signature, operator) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_ORDERS);
  if (!sheet) return { status: 'error', message: '找不到 Orders 工作表' };
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var idColIndex = headers.indexOf('編號');
  var statusColIndex = headers.indexOf('到貨狀態');
  var sigColIndex = headers.indexOf('客戶簽名');
  
  if (idColIndex === -1 || statusColIndex === -1) {
    return { status: 'error', message: 'Orders 工作表欄位格式不正確' };
  }
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex].toString() === orderId.toString()) {
      var rowNum = i + 1;
      var oldStatus = data[i][statusColIndex];
      
      // 更新到貨狀態
      sheet.getRange(rowNum, statusColIndex + 1).setValue(newStatus);
      
      // 如果有簽名，更新簽名
      if (signature && sigColIndex !== -1) {
        sheet.getRange(rowNum, sigColIndex + 1).setValue(signature);
      }
      
      // 讀取該列其他資料以記入變更歷史
      var orderData = {};
      for (var j = 0; j < headers.length; j++) {
        var cnHeader = headers[j];
        var engKey = REVERSE_ORDER_MAPPING[cnHeader] || cnHeader;
        orderData[engKey] = data[i][j];
      }
      
      var notes = "狀態更新";
      if (newStatus === '已交單' && signature) {
        notes = "客戶簽名交機";
      }
      
      try {
        logStatusChangeInternal(ss, orderId, orderData, oldStatus, newStatus, operator, notes);
      } catch(e) {}
      
      try {
        formatOrderSheet(sheet);
        applyConditionalFormatting(sheet);
      } catch(e) {}
      
      return { status: 'success', message: '訂單狀態更新成功', orderId: orderId };
    }
  }
  
  return { status: 'error', message: '找不到該訂單 ID' };
}

// 儲存編輯修改後的訂單，若狀態改變則寫入 OrderStatus 與 ECommerceDetails
function handleSaveEditedOrder(order, calcResult, operator) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_ORDERS);
  if (!sheet) return { status: 'error', message: '找不到 Orders 工作表' };
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idColIndex = headers.indexOf('編號');
  var statusColIndex = headers.indexOf('到貨狀態');
  
  if (idColIndex === -1) return { status: 'error', message: 'Orders 工作表格式不正確' };
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex].toString() === order.id.toString()) {
      var rowNum = i + 1;
      var oldStatus = statusColIndex !== -1 ? data[i][statusColIndex] : '';
      var newStatus = order.status;
      
      // 寫入新資料，需要對齊 Headers
      for (var colIdx = 0; colIdx < headers.length; colIdx++) {
        var cnHeader = headers[colIdx];
        var engKey = REVERSE_ORDER_MAPPING[cnHeader] || cnHeader;
        
        if (engKey === 'overdueDays') {
          // 維持逾期天數公式
          sheet.getRange(rowNum, colIdx + 1).setValue('=IF(OR(M' + rowNum + '="已交機", M' + rowNum + '="已交單"), 0, MAX(0, TODAY() - O' + rowNum + '))');
        } else if (engKey === 'tags') {
          sheet.getRange(rowNum, colIdx + 1).setValue(JSON.stringify(order.tags || []));
        } else {
          var val = order[engKey];
          sheet.getRange(rowNum, colIdx + 1).setValue(val !== undefined ? val : '');
        }
      }
      
      // 寫入或更新計算明細
      if (calcResult) {
        try {
          writeECommerceDetailInternal(ss, order.id, calcResult);
        } catch(e) {}
      }
      
      // 檢查狀態是否有變
      if (oldStatus !== newStatus) {
        try {
          logStatusChangeInternal(ss, order.id, order, oldStatus, newStatus, operator, "編輯訂單並變更狀態");
        } catch(e) {}
      }
      
      try {
        formatOrderSheet(sheet);
        applyConditionalFormatting(sheet);
      } catch(e) {}
      
      return { status: 'success', message: '訂單修改儲存成功', orderId: order.id };
    }
  }
  
  return { status: 'error', message: '找不到該訂單 ID' };
}

// 批次匯入訂單，並記錄到 OrderStatus
function handleAddOrdersBatch(orders) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_ORDERS);
  if (!sheet) return { status: 'error', message: '找不到 Orders 工作表' };
  
  var headers = sheet.getDataRange().getValues()[0];
  var lastRow = sheet.getLastRow();
  var newRows = [];
  
  for (var k = 0; k < orders.length; k++) {
    var order = orders[k];
    var newRow = [];
    var targetRow = lastRow + 1 + k;
    
    for (var i = 0; i < headers.length; i++) {
      var cnHeader = headers[i];
      var engKey = REVERSE_ORDER_MAPPING[cnHeader] || cnHeader;
      var val = order[engKey];
      
      if (engKey === 'tags') {
        newRow.push(JSON.stringify(val || []));
      } else if (engKey === 'overdueDays') {
        newRow.push('=IF(OR(M' + targetRow + '="已交機", M' + targetRow + '="已交單"), 0, MAX(0, TODAY() - O' + targetRow + '))');
      } else {
        newRow.push(val !== undefined ? val : '');
      }
    }
    newRows.push(newRow);
    
    // 寫入變更歷史
    try {
      logStatusChangeInternal(ss, order.id, order, "(新建)", order.status || '訂貨需求', order.creator, "批次匯入訂單");
    } catch(e) {}
  }
  
  // 批次寫入
  sheet.getRange(lastRow + 1, 1, newRows.length, headers.length).setValues(newRows);
  
  try {
    formatOrderSheet(sheet);
    applyConditionalFormatting(sheet);
  } catch(e) {}
  
  return { status: 'success', message: '批次訂單新增成功', count: orders.length };
}

// 更新任務狀態 (支援照片與備註回報)
function handleUpdateTask(taskId, completed, completedBy, completedAt, photo, notes) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_TASKS);
  if (!sheet) return { status: 'error', message: '找不到 Tasks 工作表' };
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var idColIndex = headers.indexOf('任務編號');
  var compColIndex = headers.indexOf('是否完成');
  var userColIndex = headers.indexOf('完成人員');
  var dateColIndex = headers.indexOf('完成時間');
  var photoColIndex = headers.indexOf('現場照片');
  var notesColIndex = headers.indexOf('備註');
  
  if (idColIndex === -1 || compColIndex === -1) {
    return { status: 'error', message: 'Tasks 工作表格式不正確' };
  }
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex].toString() === taskId.toString()) {
      sheet.getRange(i + 1, compColIndex + 1).setValue(completed ? '是' : '否');
      if (userColIndex !== -1) sheet.getRange(i + 1, userColIndex + 1).setValue(completed ? completedBy : '');
      if (dateColIndex !== -1) sheet.getRange(i + 1, dateColIndex + 1).setValue(completed ? completedAt : '');
      if (photoColIndex !== -1) sheet.getRange(i + 1, photoColIndex + 1).setValue(completed ? (photo || '') : '');
      if (notesColIndex !== -1) sheet.getRange(i + 1, notesColIndex + 1).setValue(completed ? (notes || '') : '');
      
      try {
        formatTaskSheet(sheet);
      } catch(e) {}
      
      return { status: 'success', message: '任務更新成功', taskId: taskId };
    }
  }
  
  return { status: 'error', message: '找不到該任務 ID' };
}

// 批次全量同步 (支援照片與備註)
function handleSyncAll(orders, tasks) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var orderSheet = ss.getSheetByName(SHEET_ORDERS);
  if (orderSheet) {
    orderSheet.clearContents();
    var cnOrderHeaders = ['編號', '客戶姓名', '客戶電話', '商品與承諾內容', '類型', '分店', '提單人員', '客戶來源', '客戶標籤', '數量', '商品單價', '商品成本', '到貨狀態', '建單日期', '預計交貨日', '逾期天數', '客戶簽名', '備註', '訂單平台'];
    orderSheet.appendRow(cnOrderHeaders);
    orderSheet.getRange(1, 1, 1, cnOrderHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    
    orders.forEach(function(ord, idx) {
      var targetRow = idx + 2;
      var row = cnOrderHeaders.map(function(cnHeader) {
        var engKey = REVERSE_ORDER_MAPPING[cnHeader] || cnHeader;
        var val = ord[engKey];
        if (engKey === 'tags') {
          return JSON.stringify(val || []);
        } else if (engKey === 'overdueDays') {
          return '=IF(M' + targetRow + '="已交機", 0, MAX(0, TODAY() - O' + targetRow + '))';
        }
        return val !== undefined ? val : '';
      });
      orderSheet.appendRow(row);
    });
    
    try {
      orderSheet.getRange(1, 1, 1000, cnOrderHeaders.length).setHorizontalAlignment("left");
      orderSheet.getRange(1, 1, 1, cnOrderHeaders.length).setHorizontalAlignment("center");
      formatOrderSheet(orderSheet);
      applyConditionalFormatting(orderSheet);
    } catch(e) {}
  }
  
  var taskSheet = ss.getSheetByName(SHEET_TASKS);
  if (taskSheet) {
    taskSheet.clearContents();
    var cnTaskHeaders = ['任務編號', '分店', '任務內容', '分數', '是否完成', '完成時間', '完成人員', '現場照片', '備註'];
    taskSheet.appendRow(cnTaskHeaders);
    taskSheet.getRange(1, 1, 1, cnTaskHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    
    tasks.forEach(function(tsk) {
      var row = cnTaskHeaders.map(function(cnHeader) {
        var engKey = REVERSE_TASK_MAPPING[cnHeader] || cnHeader;
        var val = tsk[engKey];
        if (engKey === 'completed') {
          return val ? '是' : '否';
        }
        return val !== undefined ? val : '';
      });
      taskSheet.appendRow(row);
    });
    
    try {
      taskSheet.getRange(1, 1, 1000, cnTaskHeaders.length).setHorizontalAlignment("left");
      taskSheet.getRange(1, 1, 1, cnTaskHeaders.length).setHorizontalAlignment("center");
      formatTaskSheet(taskSheet);
    } catch(e) {}
  }
  
  return { status: 'success', message: '全量同步成功' };
}

// 取得 LINE 設定鍵值
function handleGetLineConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CONFIG);
  var config = { accessToken: '', groupId: '', reminderTime: '09:00' };
  
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var key = data[i][0];
      var val = data[i][1];
      if (key === 'LINE_ACCESS_TOKEN') config.accessToken = val;
      else if (key === 'LINE_GROUP_ID') config.groupId = val;
      else if (key === 'LINE_REMINDER_TIME') config.reminderTime = val;
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', config: config }))
    .setMimeType(ContentService.MimeType.JSON);
}

// 儲存 LINE 設定並更新觸發器
function handleSaveLineConfig(accessToken, groupId, reminderTime) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CONFIG);
  if (!sheet) return { status: 'error', message: '找不到 Config 工作表' };
  
  var data = sheet.getDataRange().getValues();
  var oldReminderTime = '09:00';
  var tokenRow = -1, groupRow = -1, timeRow = -1;
  
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    if (key === 'LINE_ACCESS_TOKEN') tokenRow = i + 1;
    else if (key === 'LINE_GROUP_ID') groupRow = i + 1;
    else if (key === 'LINE_REMINDER_TIME') {
      timeRow = i + 1;
      oldReminderTime = data[i][1];
    }
  }
  
  if (tokenRow !== -1) sheet.getRange(tokenRow, 2).setValue(accessToken);
  if (groupRow !== -1) sheet.getRange(groupRow, 2).setValue(groupId);
  if (timeRow !== -1) sheet.getRange(timeRow, 2).setValue(reminderTime);
  
  // 若提醒時間變更，則更新 Trigger
  if (reminderTime && reminderTime !== oldReminderTime) {
    try {
      updateDailyReminderTrigger(reminderTime);
    } catch(e) {
      return { status: 'success', message: '設定儲存成功，但 Trigger 更新失敗：' + e.toString() };
    }
  }
  
  return { status: 'success', message: '設定儲存成功' };
}

// 測試發送 LINE 推播
function handleTestLinePush() {
  try {
    var res = sendECommerceDailyReminder(true);
    return res;
  } catch(e) {
    return { status: 'error', message: e.toString() };
  }
}

// 更新 GAS 每日定時提醒觸發器
function updateDailyReminderTrigger(timeStr) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendECommerceDailyReminder') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  if (!timeStr) return;
  
  var parts = timeStr.split(':');
  var hours = parseInt(parts[0]);
  var minutes = parseInt(parts[1]) || 0;
  
  ScriptApp.newTrigger('sendECommerceDailyReminder')
    .timeBased()
    .everyDays(1)
    .atHour(hours)
    .nearMinute(minutes)
    .create();
}

// 內部通用 LINE Push 發送函數
function sendLineMessageInternal(message) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CONFIG);
  if (!sheet) return false;
  
  var data = sheet.getDataRange().getValues();
  var token = '', groupId = '';
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    if (key === 'LINE_ACCESS_TOKEN') token = data[i][1];
    else if (key === 'LINE_GROUP_ID') groupId = data[i][1];
  }
  
  if (!token || !groupId) return false;
  
  var url = 'https://api.line.me/v2/bot/message/push';
  var options = {
    'method': 'post',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    'payload': JSON.stringify({
      'to': groupId,
      'messages': [{
        'type': 'text',
        'text': message
      }]
    }),
    'muteHttpExceptions': true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();
  if (code !== 200) {
    Logger.log("LINE Push failed, code: " + code + ", body: " + response.getContentText());
    throw new Error("LINE 推播失敗 (HTTP " + code + "): " + response.getContentText());
  }
  return true;
}

// 每日電商統計推播主邏輯
function sendECommerceDailyReminder(isTest) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 取得電商與調貨訂單
  var orderSheet = ss.getSheetByName(SHEET_ORDERS);
  var overdueOrders = [];
  var todayOrders = [];
  var arrivedOrders = [];
  
  var today = new Date();
  today.setHours(0,0,0,0);
  
  if (orderSheet) {
    var data = orderSheet.getDataRange().getValues();
    var headers = data[0];
    
    var storeIdx = headers.indexOf('分店');
    var typeIdx = headers.indexOf('類型');
    var statusIdx = headers.indexOf('到貨狀態');
    var promiseIdx = headers.indexOf('預計交貨日');
    var customerIdx = headers.indexOf('客戶姓名');
    var productIdx = headers.indexOf('商品與承諾內容');
    var numIdx = headers.indexOf('編號');
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var store = row[storeIdx];
      var type = row[typeIdx];
      var status = row[statusIdx];
      
      // 篩選電商部或調貨
      if (store === '電商部' || type === '調貨') {
        // 排除已交機、已交單 (完成狀態)
        if (status !== '已交機' && status !== '已交單') {
          var promiseRaw = row[promiseIdx];
          var promiseDate = null;
          if (promiseRaw) {
            promiseDate = new Date(promiseRaw);
            promiseDate.setHours(0,0,0,0);
          }
          
          var orderInfo = {
            id: row[numIdx],
            customer: row[customerIdx],
            product: row[productIdx],
            status: status,
            store: store,
            promiseStr: promiseRaw ? Utilities.formatDate(promiseDate, "GMT+8", "yyyy-MM-dd") : '無'
          };
          
          if (status === '已到貨') {
            arrivedOrders.push(orderInfo);
          } else {
            if (promiseDate) {
              if (promiseDate.getTime() < today.getTime()) {
                overdueOrders.push(orderInfo);
              } else if (promiseDate.getTime() === today.getTime()) {
                todayOrders.push(orderInfo);
              }
            }
          }
        }
      }
    }
  }
  
  // 2. 取得今日電商部待辦日常任務
  var taskSheet = ss.getSheetByName(SHEET_TASKS);
  var pendingTasks = [];
  if (taskSheet) {
    var taskData = taskSheet.getDataRange().getValues();
    var taskHeaders = taskData[0];
    
    var taskStoreIdx = taskHeaders.indexOf('分店');
    var taskTextIdx = taskHeaders.indexOf('任務內容');
    var taskCompIdx = taskHeaders.indexOf('是否完成');
    
    for (var i = 1; i < taskData.length; i++) {
      var row = taskData[i];
      if (row[taskStoreIdx] === '電商部') {
        var completedVal = row[taskCompIdx];
        var isCompleted = (completedVal === true || completedVal === 'true' || completedVal === '是');
        if (!isCompleted) {
          pendingTasks.push(row[taskTextIdx]);
        }
      }
    }
  }
  
  // 3. 組裝推播文字 (繁體中文台灣用語)
  var timeStr = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm");
  var msg = "";
  
  if (isTest) {
    msg += "🔔【馬尼門市系統 - LINE 電商群推播測試】\n";
  } else {
    msg += "📢【馬尼電商部每日調貨與店務進度提醒】\n";
  }
  msg += "統計時間：" + timeStr + "\n";
  msg += "========================\n\n";
  
  // 逾期未完成調貨
  msg += "🚨 逾期未完成調貨 (" + overdueOrders.length + " 筆)：\n";
  if (overdueOrders.length > 0) {
    overdueOrders.forEach(function(o, idx) {
      msg += (idx + 1) + ". [" + o.store + "] " + o.customer + " - " + o.product + " (預計交期: " + o.promiseStr + ")\n";
    });
  } else {
    msg += "👉 目前無逾期調貨項目，大家太棒了！\n";
  }
  msg += "\n";
  
  // 今日預計交貨
  msg += "⏰ 今日預計交貨 (" + todayOrders.length + " 筆)：\n";
  if (todayOrders.length > 0) {
    todayOrders.forEach(function(o, idx) {
      msg += (idx + 1) + ". [" + o.store + "] " + o.customer + " - " + o.product + " (今日交貨)\n";
    });
  } else {
    msg += "👉 今日無預計交貨項目。\n";
  }
  msg += "\n";
  
  // 已到貨待驗機交單
  msg += "🟢 已到貨待驗機交單 (" + arrivedOrders.length + " 筆)：\n";
  if (arrivedOrders.length > 0) {
    arrivedOrders.forEach(function(o, idx) {
      msg += (idx + 1) + ". [" + o.store + "] " + o.customer + " - " + o.product + "\n";
    });
  } else {
    msg += "👉 目前無待驗機項目。\n";
  }
  msg += "\n";
  
  // 今日待辦店務任務
  msg += "📋 今日待辦日常任務 (" + pendingTasks.length + " 項)：\n";
  if (pendingTasks.length > 0) {
    pendingTasks.forEach(function(t, idx) {
      msg += (idx + 1) + ". " + t + "\n";
    });
  } else {
    msg += "🎉 電商部今日日常任務已全部完成！辛苦了！\n";
  }
  msg += "\n========================\n";
  msg += "請點選系統連結確認細節，加油！";
  
  // 4. 發送 LINE
  var success = sendLineMessageInternal(msg);
  if (success) {
    return { status: 'success', message: '推播成功', count: overdueOrders.length + todayOrders.length + arrivedOrders.length };
  } else {
    return { status: 'error', message: '推播失敗，請檢查 Token 與 GroupID 設定' };
  }
}

// 取得蝦皮雲端費率設定表
function handleGetECommerceRates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_ECOMMERCE_RATES);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: '找不到 ECommerceRates 工作表' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rates = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      var header = headers[j];
      var key = header;
      if (header === '平台代碼') key = 'platform';
      else if (header === '品類代碼') key = 'category';
      else if (header === '品類名稱') key = 'categoryName';
      else if (header === '成交手續費率') key = 'commissionRate';
      else if (header === '金流費率') key = 'transactionRate';
      else if (header === '蝦幣費率') key = 'coinRate';
      else if (header === '免運費率') key = 'shippingRate';
      else if (header === '免運固定費') key = 'flatFee';
      else if (header === '直送後毛率') key = 'backProfitRate';
      else if (header === '成交上限標記') key = 'hasCap';
      else if (header === '大促日加收率') key = 'promoRate';
      
      var val = row[j];
      if (key === 'hasCap') {
        item[key] = (val === '是' || val === true || val === 'true');
      } else if (key === 'platform' || key === 'category' || key === 'categoryName') {
        item[key] = val;
      } else {
        item[key] = Number(val) || 0;
      }
    }
    rates.push(item);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', rates: rates }))
    .setMimeType(ContentService.MimeType.JSON);
}

// 寫入詳細扣費明細到 ECommerceDetails 工作表
function writeECommerceDetailInternal(ss, orderId, calcResult) {
  var sheet = ss.getSheetByName(SHEET_ECOMMERCE_DETAILS);
  if (!sheet) return;
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var idColIndex = headers.indexOf('訂單編號');
  if (idColIndex === -1) return;
  
  var targetRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex].toString() === orderId.toString()) {
      targetRow = i + 1;
      break;
    }
  }
  
  var timeStr = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm:ss");
  
  var newRow = [];
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];
    switch(header) {
      case '訂單編號': newRow.push(orderId); break;
      case '計算時間': newRow.push(timeStr); break;
      case '賣場方案': newRow.push(calcResult.platformName || ''); break;
      case '商品品類': newRow.push(calcResult.categoryName || ''); break;
      case '原始賣價': newRow.push(Number(calcResult.price) || 0); break;
      case '商品成本': newRow.push(Number(calcResult.cost) || 0); break;
      case '成交手續費': newRow.push(Number(calcResult.commissionFee) || 0); break;
      case '金流服務費': newRow.push(Number(calcResult.transactionFee) || 0); break;
      case '免運服務費': newRow.push(Number(calcResult.shippingCampaignFee) || 0); break;
      case '蝦幣服務費': newRow.push(Number(calcResult.coinCampaignFee) || 0); break;
      case '物流隱碼費': newRow.push(Number(calcResult.cryptoFee) || 0); break;
      case '直送後毛費': newRow.push(Number(calcResult.backProfitFee) || 0); break;
      case '抽成總計': newRow.push(Number(calcResult.totalFees) || 0); break;
      case '實拿金額': newRow.push(Number(calcResult.payout) || 0); break;
      case '預估毛利': newRow.push(Number(calcResult.profit) || 0); break;
      case '預估毛利率': newRow.push(Number(calcResult.profitMargin) / 100 || 0); break;
      default: newRow.push('');
    }
  }
  
  if (targetRow !== -1) {
    sheet.getRange(targetRow, 1, 1, headers.length).setValues([newRow]);
  } else {
    sheet.appendRow(newRow);
  }
  
  try {
    formatDetailsSheet(sheet);
  } catch(e) {}
}

// ECommerceRates 工作表排版
function formatRatesSheet(sheet) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  var maxRows = Math.max(lastRow, 1000);
  
  try {
    sheet.autoResizeColumns(1, 11);
  } catch(e) {}
  
  try {
    sheet.getRange(2, 4, maxRows - 1, 4).setNumberFormat("0.00%");
    sheet.getRange(2, 9, maxRows - 1, 1).setNumberFormat("0.00%");
    sheet.getRange(2, 11, maxRows - 1, 1).setNumberFormat("0.00%");
  } catch(e) {}
}

// ECommerceDetails 工作表排版
function formatDetailsSheet(sheet) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  var maxRows = Math.max(lastRow, 1000);
  
  try {
    sheet.autoResizeColumns(1, 16);
  } catch(e) {}
  
  var minWidths = {
    1: 130, // 訂單編號
    2: 140, // 計算時間
    3: 180, // 賣場方案
    4: 180, // 商品品類
  };
  
  for (var col in minWidths) {
    var colNum = parseInt(col);
    try {
      if (sheet.getColumnWidth(colNum) < minWidths[col]) {
        sheet.setColumnWidth(colNum, minWidths[col]);
      }
    } catch(e) {}
  }
  
  try {
    sheet.getRange(2, 16, maxRows - 1, 1).setNumberFormat("0.00%");
    sheet.getRange(2, 5, maxRows - 1, 11).setNumberFormat("$#,##0");
  } catch(e) {}
}

// 批次全量同步客戶資料
function handleSyncCustomers(customers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var customerSheet = ss.getSheetByName(SHEET_CUSTOMERS);
  if (!customerSheet) return { status: 'error', message: '找不到 Customers 工作表' };
  
  customerSheet.clearContents();
  var cnCustomerHeaders = ['客戶編號', '姓名', '聯絡電話', 'LINE ID', '備註說明', '建立者', '建立日期', '最後跟進日期'];
  customerSheet.appendRow(cnCustomerHeaders);
  customerSheet.getRange(1, 1, 1, cnCustomerHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
  
  customers.forEach(function(cust) {
    var row = cnCustomerHeaders.map(function(cnHeader) {
      var engKey = REVERSE_CUSTOMER_MAPPING[cnHeader] || cnHeader;
      var val = cust[engKey];
      return val !== undefined ? val : '';
    });
    customerSheet.appendRow(row);
  });
  
  try {
    customerSheet.getRange(1, 1, 1000, cnCustomerHeaders.length).setHorizontalAlignment("left");
    customerSheet.getRange(1, 1, 1, cnCustomerHeaders.length).setHorizontalAlignment("center");
    formatCustomerSheet(customerSheet);
  } catch(e) {}
  
  return { status: 'success', message: '客戶資料同步成功' };
}

// 寫入系統操作稽核日誌
function handleWriteLog(operator, role, actionType, targetModule, description) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEET_SYSTEM_LOGS);
  if (!logSheet) return { status: 'error', message: '找不到 SystemLogs 工作表' };
  
  var timeStr = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm:ss");
  logSheet.appendRow([timeStr, operator || '', role || '', actionType || '', targetModule || '', description || '']);
  
  try {
    formatLogSheet(logSheet);
  } catch(e) {}
  
  return { status: 'success', message: '日誌紀錄成功' };
}

// 整理並自動/手動封存 30 天前的舊日誌
function archiveOldLogs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEET_SYSTEM_LOGS);
  if (!logSheet) {
    return { status: 'error', message: '找不到 SystemLogs 工作表' };
  }

  // 1. 自動偵測與建立封存工作表 SystemLogs_Backup
  var backupSheet = ss.getSheetByName(SHEET_SYSTEM_LOGS_BACKUP);
  var cnLogHeaders = ['紀錄時間', '操作人員', '角色權限', '動作類型', '受影響模組', '詳細描述'];
  if (!backupSheet) {
    backupSheet = ss.insertSheet(SHEET_SYSTEM_LOGS_BACKUP);
    backupSheet.appendRow(cnLogHeaders);
    backupSheet.getRange(1, 1, 1, cnLogHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    backupSheet.setFrozenRows(1);
  }

  var data = logSheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { status: 'success', message: '目前尚無任何日誌可供封存。' };
  }

  // 2. 計算 30 天前的日期時間點
  var now = new Date();
  var threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 天前

  var logsToKeep = [data[0]]; // 保留標題列
  var logsToArchive = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var logTimeStr = row[0];
    var logDate = new Date(logTimeStr);
    
    // 如果日期格式無法正確解析，或是屬於 30 天內，則保留
    if (isNaN(logDate.getTime()) || logDate >= threshold) {
      logsToKeep.push(row);
    } else {
      // 超過 30 天的舊日誌，準備封存
      if (row[0] instanceof Date) {
        row[0] = Utilities.formatDate(row[0], "GMT+8", "yyyy-MM-dd HH:mm:ss");
      }
      logsToArchive.push(row);
    }
  }

  // 3. 執行封存寫入與原表清理
  if (logsToArchive.length > 0) {
    // 寫入備份工作表
    var startRow = backupSheet.getLastRow() + 1;
    backupSheet.getRange(startRow, 1, logsToArchive.length, cnLogHeaders.length).setValues(logsToArchive);
    
    // 清空並覆寫原日誌表
    logSheet.clearContents();
    logSheet.getRange(1, 1, logsToKeep.length, cnLogHeaders.length).setValues(logsToKeep);
    logSheet.getRange(1, 1, 1, cnLogHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
    
    try {
      formatLogSheet(logSheet);
      formatLogSheet(backupSheet);
    } catch(e) {}

    var msg = '🎉 成功封存 ' + logsToArchive.length + ' 筆超過 30 天的舊日誌至 SystemLogs_Backup 工作表！';
    try {
      SpreadsheetApp.getUi().alert(msg);
    } catch(e) {}
    return { status: 'success', message: msg, archivedCount: logsToArchive.length };
  } else {
    var msg = 'ℹ️ 目前無任何超過 30 天的舊日誌需要整理封存。';
    try {
      SpreadsheetApp.getUi().alert(msg);
    } catch(e) {}
    return { status: 'success', message: msg, archivedCount: 0 };
  }
}

// 取得業績子資料夾 (支援精準匹配、模糊匹配，若皆無則回傳母資料夾本身作為 Fallback)
function getPerformanceFolder(parentFolderId, yyyymm) {
  try {
    var parentFolder = DriveApp.getFolderById(parentFolderId);
    
    // 1. 嘗試精準匹配 (例如 "202605")
    var folders = parentFolder.getFoldersByName(yyyymm);
    if (folders.hasNext()) {
      return folders.next();
    }
    
    // 2. 模糊匹配 (支援 "2026-05"、"2026_05"、"2026.05"、"2026年5月" 等常見命名)
    var yyyy = yyyymm.substring(0, 4);
    var mm = yyyymm.substring(4, 6);
    var m = parseInt(mm).toString(); // 例如 "05" 轉為 "5"
    
    var allFolders = parentFolder.getFolders();
    while (allFolders.hasNext()) {
      var folder = allFolders.next();
      var name = folder.getName();
      if (name.indexOf(yyyy) !== -1) {
        if (name.indexOf(mm) !== -1 || 
            name.indexOf(m) !== -1 || 
            name.indexOf(yyyy + "-" + mm) !== -1 || 
            name.indexOf(yyyy + "年" + m + "月") !== -1) {
          return folder;
        }
      }
    }
    
    // 3. Fallback 安全網：若無匹配的月份資料夾，直接使用母資料夾本身
    return parentFolder;
  } catch (e) {
    Logger.log("取得資料夾失敗: " + e.toString());
    return null;
  }
}

// 取得分店的試算表檔案 (模糊搜尋檔名包含 storeName，並支援去除 "店" 字以進行高容錯匹配)
function getStoreSpreadsheet(folder, storeName) {
  try {
    var shortName = storeName;
    if (storeName && storeName.length > 2 && storeName.substring(storeName.length - 1) === "店") {
      shortName = storeName.substring(0, storeName.length - 1);
    }
    
    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      var name = file.getName();
      // 確保是 Google Sheets 且檔名包含店名 (如 "東門店" 或 "東門")
      if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
        if (name.indexOf(storeName) !== -1 || name.indexOf(shortName) !== -1) {
          return SpreadsheetApp.open(file);
        }
      }
    }
    return null;
  } catch (e) {
    Logger.log("取得試算表失敗: " + e.toString());
    return null;
  }
}

// 取得試算表中的分頁 (支援名稱精準匹配與多級模糊容錯搜尋，防範分頁未改名或拼寫錯誤)
function getSheetWithTolerance(spreadsheet, sheetName, storeName) {
  if (!spreadsheet) return null;
  
  // 1. 精準搜尋
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (sheet) return sheet;
  
  // 2. 準備短店名與短分頁名 (例如 "歸仁店" -> "歸仁")
  var shortStoreName = storeName;
  if (storeName && storeName.length > 2 && storeName.substring(storeName.length - 1) === "店") {
    shortStoreName = storeName.substring(0, storeName.length - 1);
  }
  
  var shortSheetName = sheetName;
  if (sheetName && sheetName.length > 2 && sheetName.substring(sheetName.length - 1) === "店") {
    shortSheetName = sheetName.substring(0, sheetName.length - 1);
  }

  var sheets = spreadsheet.getSheets();
  
  // 3. 第一階段模糊搜尋：名稱包含 sheetName 或 storeName 的短名
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name.indexOf(sheetName) !== -1 || 
        name.indexOf(shortSheetName) !== -1 || 
        (shortStoreName && name.indexOf(shortStoreName) !== -1)) {
      return sheets[i];
    }
  }
  
  // 4. 第二階段備用搜尋：若找總表卻找不到，搜尋包含 "總表"、"指標" 或是 "東門店" (原模板名) 的分頁
  if (sheetName === storeName) {
    var backupKeywords = ["總表", "主表", "業績表", "東門店", "指標"];
    for (var k = 0; k < backupKeywords.length; k++) {
      for (var i = 0; i < sheets.length; i++) {
        if (sheets[i].getName().indexOf(backupKeywords[k]) !== -1) {
          return sheets[i];
        }
      }
    }
  }
  
  // 5. 最後防線：直接回傳第一個分頁 (99% 的情況第一個分頁就是總表)
  if (sheets.length > 0) {
    return sheets[0];
  }
  
  return null;
}

// 定位第一欄符合特定內容的 row index (1-indexed)
function findRowByFirstColumn(sheet, targetText) {
  var lastRow = sheet.getLastRow();
  if (lastRow === 0) return -1;
  var data = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] !== undefined && data[i][0] !== null && data[i][0].toString().trim() === targetText.toString().trim()) {
      return i + 1;
    }
  }
  return -1;
}

// 格式化百分比輔助函數
function formatPercent(val) {
  if (val === undefined || val === null || val === '') return '0%';
  var num = Number(val);
  if (isNaN(num)) return val.toString();
  // 判斷是否為小數或已經是百分比整數
  if (num <= 2 && num >= 0) {
    return Math.round(num * 100) + '%';
  }
  return Math.round(num) + '%';
}

// 讀取分店與人員的業績數據
// 讀取分店與人員的業績數據
function handleGetStorePerformance(storeName, sheetName, role) {
  try {
    if (!storeName || !sheetName) {
      return { status: 'error', message: '缺少必要參數 storeName 或 sheetName' };
    }
    
    // 1. 動態取得當前的 YYYYMM 時間字串 (例如 "202605")
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyymm_folder = yyyy + mm;
    
    // 2. 獲取當月業績資料夾
    var folder = getPerformanceFolder(PERFORMANCE_FOLDER_ID, yyyymm_folder);
    if (!folder) {
      return { status: 'error', message: '系統偵測到本月資料夾 【' + yyyymm_folder + '】 尚未建立，請聯絡管理員先於雲端硬碟建立本月資料夾。' };
    }
    
    // 3. 獲取該分店試算表
    var spreadsheet = getStoreSpreadsheet(folder, storeName);
    if (!spreadsheet) {
      return { status: 'error', message: '系統偵測到分店 【' + storeName + '】 的業績日報表檔案尚未建立，請聯絡管理員。' };
    }
    
    // 4. 獲取對應的分頁 (採用高容錯模糊搜尋機制)
    var sheet = getSheetWithTolerance(spreadsheet, sheetName, storeName);
    if (!sheet) {
      return { status: 'error', message: '系統偵測到分頁 【' + sheetName + '】 尚未建立，請聯絡管理員先至業績表建立同仁分頁。' };
    }
    
    // 5. 讀取數據
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();
    var values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
    
    // 6. 全動態定位關鍵行 (以防試算表結構被微調)
    var headerRowIdx = -1;      // 業績項目名稱行
    var rowTarget = -1;         // 目標分配行
    var rowAccumulated = -1;    // 當月累計行
    var rowAchievement = -1;    // 預估達成行 (第11行)
    var rowCurrentAchievement = -1; // 目前達成行 (第12行)
    
    for (var i = 0; i < values.length; i++) {
      var firstCell = values[i][0] ? values[i][0].toString().trim() : '';
      if (firstCell === '業績項目') {
        headerRowIdx = i;
      } else if (firstCell === '目標分配') {
        rowTarget = i;
      } else if (firstCell === '當月累計') {
        rowAccumulated = i;
      } else if (firstCell === '預估達成') {
        rowAchievement = i;
      } else if (firstCell === '目前達成') {
        rowCurrentAchievement = i;
      }
    }
    
    // 若找不到 Header 列，預設為 index 2 (第 3 行) 作為備用防呆
    if (headerRowIdx === -1) {
      headerRowIdx = 2; 
    }
    
    // 7. 動態建立欄位映射
    var headers = values[headerRowIdx];
    var headerMap = {}; // { colIndex: "項目名稱" }
    for (var col = 1; col < headers.length; col++) {
      var colName = headers[col] ? headers[col].toString().trim() : '';
      if (colName && colName !== '--->勿動') {
        headerMap[col] = colName;
      }
    }
    
    // 8. 讀取每日數據 (1 ~ 31 號)
    var dailyData = [];
    for (var i = 0; i < values.length; i++) {
      var firstCell = values[i][0] ? values[i][0].toString().trim() : '';
      var dayNum = parseInt(firstCell);
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
        var dayObj = { day: dayNum };
        // 遍歷所有動態項目並寫入
        for (var colIdx in headerMap) {
          var key = headerMap[colIdx];
          dayObj[key] = Number(values[i][colIdx]) || 0;
        }
        dailyData.push(dayObj);
      }
    }
    
    // 9. 動態包裝 summary (目標、累計、達成率)
    var summary = {};
    for (var colIdx in headerMap) {
      var key = headerMap[colIdx];
      summary[key] = { target: 0, accumulated: 0, achievement: "0%", currentAchievement: "0%" };
      
      if (rowTarget !== -1) {
        summary[key].target = Number(values[rowTarget][colIdx]) || 0;
      }
      if (rowAccumulated !== -1) {
        var accVal = values[rowAccumulated][colIdx];
        // 針對「來客數」進行特別處理：如果它是來客數，且 rowAccumulated 這一格是字串 "日平均" 或非數字，
        // 則代表它的累計實績是寫在當日應達行 (Row 8，在 values 陣列中為 rowAccumulated - 1)
        if (key === "來客數" && (accVal === "日平均" || isNaN(Number(accVal)))) {
          summary[key].accumulated = Number(values[rowAccumulated - 1][colIdx]) || 0;
        } else {
          summary[key].accumulated = Number(accVal) || 0;
        }
      }
      if (rowAchievement !== -1) {
        summary[key].achievement = formatPercent(values[rowAchievement][colIdx]);
      }
      if (rowCurrentAchievement !== -1) {
        summary[key].currentAchievement = formatPercent(values[rowCurrentAchievement][colIdx]);
      }
    }
    
    return {
      status: 'success',
      storeName: storeName,
      sheetName: sheetName,
      summary: summary,
      daily: dailyData
    };
  } catch (error) {
    return { status: 'error', message: '讀取業績失敗: ' + error.toString() };
  }
}

// 寫入業績數據 (手動登錄業績)
function handleSubmitDailyPerformance(input) {
  try {
    var storeName = input.storeName;
    var sheetName = input.sheetName;
    var dateStr = input.date; // "YYYY-MM-DD"
    
    if (!storeName || !sheetName || !dateStr) {
      return { status: 'error', message: '缺少必要參數 storeName, sheetName 或 date' };
    }
    
    var dateParts = dateStr.split('-');
    var yyyy = dateParts[0];
    var mm = dateParts[1];
    var day = parseInt(dateParts[2]);
    
    var yyyymm_folder = yyyy + mm;
    
    // 1. 獲取當月業績資料夾
    var folder = getPerformanceFolder(PERFORMANCE_FOLDER_ID, yyyymm_folder);
    if (!folder) {
      return { status: 'error', message: '系統偵測到本月資料夾 【' + yyyymm_folder + '】 尚未建立，請聯絡管理員先於雲端硬碟建立本月資料夾。' };
    }
    
    // 2. 獲取該分店試算表
    var spreadsheet = getStoreSpreadsheet(folder, storeName);
    if (!spreadsheet) {
      return { status: 'error', message: '系統偵測到分店 【' + storeName + '】 的業績日報表檔案尚未建立，請聯絡管理員。' };
    }
    
    // 3. 獲取對應的分頁 (採用高容錯模糊搜尋機制)
    var sheet = getSheetWithTolerance(spreadsheet, sheetName, storeName);
    if (!sheet) {
      return { status: 'error', message: '系統偵測到分頁 【' + sheetName + '】 尚未建立，請聯絡管理員先至業績表建立同仁分頁。' };
    }
    
    // 4. 定位該日期 (day) 在第一欄的行數
    var targetRowIndex = findRowByFirstColumn(sheet, day);
    if (targetRowIndex === -1) {
      return { status: 'error', message: '在工作表中找不到 【' + day + '】 日對應的行，請確認分頁結構是否正確。' };
    }
    
    // 5. 讀取-修改-寫回 (Read-Modify-Write) 模式
    var lastColumn = sheet.getLastColumn();
    var rowRange = sheet.getRange(targetRowIndex, 1, 1, lastColumn);
    var rowValues = rowRange.getValues()[0];
    
    // 6. 動態讀取業績項目名稱列 (以 Row 3 為主搜尋名稱，進行對齊)
    var headerRowIndex = 3; // 預設 Row 3
    var totalRows = sheet.getLastRow();
    var searchLimit = Math.min(10, totalRows);
    var checkHeaders = sheet.getRange(1, 1, searchLimit, 1).getValues();
    for (var r = 0; r < checkHeaders.length; r++) {
      if (checkHeaders[r][0] && checkHeaders[r][0].toString().trim() === '業績項目') {
        headerRowIndex = r + 1; // 1-based index
        break;
      }
    }
    
    var headerValues = sheet.getRange(headerRowIndex, 1, 1, lastColumn).getValues()[0];
    var headerMap = {}; // { "項目名稱": colIndex }
    for (var col = 1; col < headerValues.length; col++) {
      var colName = headerValues[col] ? headerValues[col].toString().trim() : '';
      if (colName && colName !== '--->勿動') {
        headerMap[colName] = col;
      }
    }
    
    // 7. 英文屬性與中文項目名稱映射 (向下相容舊版前端傳送的參數)
    var oldKeysMap = {
      grossProfit: "毛利",
      insurance: "保險營收",
      subscription: "門號",
      accessories: "配件營收",
      customerCount: "來客數"
    };
    
    // 檢查 input 底下是否有 metrics 物件，或是直接傳入屬性
    var metrics = input.metrics || input;
    
    // 8. 遍歷項目進行動態賦值
    for (var colName in headerMap) {
      var colIdx = headerMap[colName];
      var val = metrics[colName];
      
      // 若找不到中文鍵，則嘗試舊版英文鍵
      if (val === undefined) {
        for (var oldKey in oldKeysMap) {
          if (oldKeysMap[oldKey] === colName && metrics[oldKey] !== undefined) {
            val = metrics[oldKey];
            break;
          }
        }
      }
      
      // 僅在前端有傳入該值時進行修改，避免覆蓋 Sheets 裡的無關數據
      if (val !== undefined) {
        rowValues[colIdx] = Number(val) || 0;
      }
    }
    
    // 9. 寫回
    rowRange.setValues([rowValues]);
    
    // 10. 寫入系統操作稽核日誌
    handleWriteLog(
      input.operator || 'system',
      input.operatorRole || 'STAFF',
      '登錄業績',
      '業績模組',
      '登錄分店: ' + storeName + ', 同仁: ' + sheetName + ', 日期: ' + dateStr + ', 毛利: ' + (metrics.grossProfit || metrics['毛利'] || 0) + ', 配件: ' + (metrics.accessories || metrics['配件營收'] || 0)
    );
    
    return { status: 'success', message: '業績登錄成功！' };
  } catch (error) {
    return { status: 'error', message: '業績登錄失敗: ' + error.toString() };
  }
}

// 偵錯輔助函數：供使用者於 Apps Script 編輯器中手動執行，以列出並排查資料夾與檔案名稱
function debugListFolder() {
  var parentFolderId = "1WmUILJGUrlFWEUtaADutSluVShQq8dxg";
  try {
    var parentFolder = DriveApp.getFolderById(parentFolderId);
    Logger.log("=== [1] 母資料夾名稱: " + parentFolder.getName() + " ===");
    
    Logger.log("=== [2] 母資料夾下的子資料夾列表 ===");
    var subfolders = parentFolder.getFolders();
    var hasSub = false;
    while (subfolders.hasNext()) {
      hasSub = true;
      var sub = subfolders.next();
      var subName = sub.getName();
      Logger.log("資料夾名稱: " + subName + " | ID: " + sub.getId());
      
      // 若為 202605 或 202606 子資料夾，印出其內部所有檔案
      if (subName === '202605' || subName === '202606') {
        Logger.log("  >>> [" + subName + "] 子資料夾內的檔案列表：");
        var subFiles = sub.getFiles();
        var hasSubFiles = false;
        while (subFiles.hasNext()) {
          hasSubFiles = true;
          var f = subFiles.next();
          Logger.log("    - 檔案: " + f.getName() + " | ID: " + f.getId() + " | 類型: " + f.getMimeType());
        }
        if (!hasSubFiles) {
          Logger.log("    (此子資料夾內無任何檔案)");
        }
      }
    }
    if (!hasSub) {
      Logger.log("(此母資料夾下無子資料夾)");
    }
    
    Logger.log("=== [3] 母資料夾下直接存放的檔案列表 ===");
    var files = parentFolder.getFiles();
    var hasFiles = false;
    while (files.hasNext()) {
      hasFiles = true;
      var file = files.next();
      Logger.log("檔案名稱: " + file.getName() + " | ID: " + file.getId() + " | 類型: " + file.getMimeType());
    }
    if (!hasFiles) {
      Logger.log("(此母資料夾下無直接存放的檔案)");
    }
  } catch (e) {
    Logger.log("發生錯誤: " + e.toString());
  }
}
