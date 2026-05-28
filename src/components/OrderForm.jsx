import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Calendar, Trash2, Edit2, FileText, Plus, AlertCircle, RefreshCw, Calculator } from 'lucide-react';
import { STORES } from '../mockData';
import { getECommerceRates } from '../services/googleSheetsService';

// 1. 本地預設費率表 (以防雲端載入失敗時作降級防呆)
const LOCAL_RATES = [
  // 蝦商 長期免運2+5%回饋 (mall) - 31 筆
  { platform: 'mall', category: 'phone', categoryName: '📱 手機 (一般5.5% / 商城3.8%)', commissionRate: 0.038, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'tablet', categoryName: '📟 平板電腦 (一般5.5% / 商城4.0%)', commissionRate: 0.040, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'wearable', categoryName: '⌚ 穿戴裝置 (一般5.5% / 商城4.5%)', commissionRate: 0.045, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'earphone', categoryName: '🎧 耳機/耳麥/藍牙耳機 (一般5.5% / 商城6.5%)', commissionRate: 0.065, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'audio_amp', categoryName: '🎛️ 擴大機/混音器 (一般4.0% / 商城6.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'speaker_audio_player', categoryName: '🔊 音響/喇叭/麥克風/播放器 (一般6.0% / 商城7.5%)', commissionRate: 0.075, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'audio_cable_other', categoryName: '🔌 視聽線材/轉換器/其他音訊 (一般6.0% / 商城8.0%)', commissionRate: 0.080, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'camera_lens', categoryName: '🔍 相機鏡頭 (一般5.0% / 商城5.0%)', commissionRate: 0.050, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'camera', categoryName: '📷 相機 (一般6.0% / 商城6.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'drone', categoryName: '🛸 空拍機 (一般6.0% / 商城6.5%)', commissionRate: 0.065, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'camera_acc', categoryName: '🎒 相機保養/周邊配件 (一般6.0% / 商城7.5%)', commissionRate: 0.075, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'camera_security_lens_acc', categoryName: '🚨 安全監控/鏡頭與空拍周邊 (一般6.0% / 商城8.0%)', commissionRate: 0.080, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'camera_other', categoryName: '📦 其他相機周邊與分類 (一般6.0% / 商城8.5%)', commissionRate: 0.085, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'laptop', categoryName: '💻 筆記型電腦 (一般5.0% / 商城4.0%)', commissionRate: 0.040, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'desktop', categoryName: '🖥️ 桌上型電腦 (一般5.5% / 商城5.0%)', commissionRate: 0.050, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'monitor_storage', categoryName: '🖥️ 螢幕顯示器/儲存裝置 (一般5.5% / 商城5.5%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'computer_component', categoryName: '💾 電腦零組件 (一般6.0% / 商城6.5%)', commissionRate: 0.065, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'keyboard_mouse', categoryName: '⌨️ 鍵盤/滑鼠 (一般6.0% / 商城7.0%)', commissionRate: 0.070, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'computer_acc_network', categoryName: '🔌 電腦周邊/辦公設備/網路與線材 (一般6.0% / 商城7.5%)', commissionRate: 0.075, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'software_printer_scanner', categoryName: '💿 軟體/印表機/掃描機 (一般6.0% / 商城8.0%)', commissionRate: 0.080, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'pc_other', categoryName: '📁 其他電腦周邊 (一般6.0% / 商城8.7%)', commissionRate: 0.087, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'large_appliances', categoryName: '📺 大型家電 (一般5.3% / 商城5.8%)', commissionRate: 0.058, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'life_appliances', categoryName: '🍳 生活/廚房/電視家電 (一般5.5% / 商城6.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'home_parts', categoryName: '🔋 家用零件/電池/遙控器 (一般6.0% / 商城8.0%)', commissionRate: 0.080, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'projector_other_appliances', categoryName: '📹 投影機與周邊/其他家電 (一般7.5% / 商城8.5%)', commissionRate: 0.085, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'walkie_talkie', categoryName: '📟 對講機 (一般6.5% / 商城9.5%)', commissionRate: 0.095, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'phone_acc_other', categoryName: '🔌 手機周邊配件/儲值卡/其他 (一般7.5% / 商城9.5%)', commissionRate: 0.095, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'game_console', categoryName: '🎮 電玩主機 (一般5.5% / 商城3.5%)', commissionRate: 0.035, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'game_software', categoryName: '💿 主機遊戲 (一般5.5% / 商城6.5%)', commissionRate: 0.065, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'game_acc', categoryName: '🕹️ 主機周邊 (一般6.0% / 商城7.5%)', commissionRate: 0.075, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  { platform: 'mall', category: 'healthcare_beauty', categoryName: '🥗 保健食品/醫療/美妝保養 (一般6% / 商城9%)', commissionRate: 0.090, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: false, promoRate: 0.03 },
  
  // 蝦拍10倍館 (auction_10) - 31 筆
  { platform: 'auction_10', category: 'phone', categoryName: '📱 手機 (一般5.5% / 商城3.8%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'tablet', categoryName: '📟 平板電腦 (一般5.5% / 商城4.0%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'wearable', categoryName: '⌚ 穿戴裝置 (一般5.5% / 商城4.5%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'earphone', categoryName: '🎧 耳機/耳麥/藍牙耳機 (一般5.5% / 商城6.5%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'audio_amp', categoryName: '🎛️ 擴大機/混音器 (一般4.0% / 商城6.0%)', commissionRate: 0.040, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'speaker_audio_player', categoryName: '🔊 音響/喇叭/麥克風/播放器 (一般6.0% / 商城7.5%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'audio_cable_other', categoryName: '🔌 視聽線材/轉換器/其他音訊 (一般6.0% / 商城8.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'camera_lens', categoryName: '🔍 相機鏡頭 (一般5.0% / 商城5.0%)', commissionRate: 0.050, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'camera', categoryName: '📷 相機 (一般6.0% / 商城6.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'drone', categoryName: '🛸 空拍機 (一般6.0% / 商城6.5%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'camera_acc', categoryName: '🎒 相機保養/周邊配件 (一般6.0% / 商城7.5%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'camera_security_lens_acc', categoryName: '🚨 安全監控/鏡頭與空拍周邊 (一般6.0% / 商城8.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'camera_other', categoryName: '📦 其他相機周邊與分類 (一般6.0% / 商城8.5%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'laptop', categoryName: '💻 筆記型電腦 (一般5.0% / 商城4.0%)', commissionRate: 0.050, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'desktop', categoryName: '🖥️ 桌上型電腦 (一般5.5% / 商城5.0%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'monitor_storage', categoryName: '🖥️ 螢幕顯示器/儲存裝置 (一般5.5% / 商城5.5%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'computer_component', categoryName: '💾 電腦零組件 (一般6.0% / 商城6.5%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'keyboard_mouse', categoryName: '⌨️ 鍵盤/滑鼠 (一般6.0% / 商城7.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'computer_acc_network', categoryName: '🔌 電腦周邊/辦公設備/網路與線材 (一般6.0% / 商城7.5%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'software_printer_scanner', categoryName: '💿 軟體/印表機/掃描機 (一般6.0% / 商城8.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'pc_other', categoryName: '📁 其他電腦周邊 (一般6.0% / 商城8.7%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'large_appliances', categoryName: '📺 大型家電 (一般5.3% / 商城5.8%)', commissionRate: 0.053, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'life_appliances', categoryName: '🍳 生活/廚房/電視家電 (一般5.5% / 商城6.0%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'home_parts', categoryName: '🔋 家用零件/電池/遙控器 (一般6.0% / 商城8.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'projector_other_appliances', categoryName: '📹 投影機與周邊/其他家電 (一般7.5% / 商城8.5%)', commissionRate: 0.075, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'walkie_talkie', categoryName: '📟 對講機 (一般6.5% / 商城9.5%)', commissionRate: 0.065, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'phone_acc_other', categoryName: '🔌 手機周邊配件/儲值卡/其他 (一般7.5% / 商城9.5%)', commissionRate: 0.075, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'game_console', categoryName: '🎮 電玩主機 (一般5.5% / 商城3.5%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'game_software', categoryName: '💿 主機遊戲 (一般5.5% / 商城6.5%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'game_acc', categoryName: '🕹️ 主機周邊 (一般6.0% / 商城7.5%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_10', category: 'healthcare_beauty', categoryName: '🥗 保健食品/醫療/美妝保養 (一般6% / 商城9%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.025, shippingRate: 0, flatFee: 60, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  
  // 蝦拍5倍館 (auction_5) - 31 筆
  { platform: 'auction_5', category: 'phone', categoryName: '📱 手機 (一般5.5% / 商城3.8%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'tablet', categoryName: '📟 平板電腦 (一般5.5% / 商城4.0%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'wearable', categoryName: '⌚ 穿戴裝置 (一般5.5% / 商城4.5%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'earphone', categoryName: '🎧 耳機/耳麥/藍牙耳機 (一般5.5% / 商城6.5%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'audio_amp', categoryName: '🎛️ 擴大機/混音器 (一般4.0% / 商城6.0%)', commissionRate: 0.040, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'speaker_audio_player', categoryName: '🔊 音響/喇叭/麥克風/播放器 (一般6.0% / 商城7.5%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'audio_cable_other', categoryName: '🔌 視聽線材/轉換器/其他音訊 (一般6.0% / 商城8.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'camera_lens', categoryName: '🔍 相機鏡頭 (一般5.0% / 商城5.0%)', commissionRate: 0.050, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'camera', categoryName: '📷 相機 (一般6.0% / 商城6.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'drone', categoryName: '🛸 空拍機 (一般6.0% / 商城6.5%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'camera_acc', categoryName: '🎒 相機保養/周邊配件 (一般6.0% / 商城7.5%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'camera_security_lens_acc', categoryName: '🚨 安全監控/鏡頭與空拍周邊 (一般6.0% / 商城8.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'camera_other', categoryName: '📦 其他相機周邊與分類 (一般6.0% / 商城8.5%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'laptop', categoryName: '💻 筆記型電腦 (一般5.0% / 商城4.0%)', commissionRate: 0.050, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'desktop', categoryName: '🖥️ 桌上型電腦 (一般5.5% / 商城5.0%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'monitor_storage', categoryName: '🖥️ 螢幕顯示器/儲存裝置 (一般5.5% / 商城5.5%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'computer_component', categoryName: '💾 電腦零組件 (一般6.0% / 商城6.5%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'keyboard_mouse', categoryName: '⌨️ 鍵盤/滑鼠 (一般6.0% / 商城7.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'computer_acc_network', categoryName: '🔌 電腦周邊/辦公設備/網路與線材 (一般6.0% / 商城7.5%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'software_printer_scanner', categoryName: '💿 軟體/印表機/掃描機 (一般6.0% / 商城8.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'pc_other', categoryName: '📁 其他電腦周邊 (一般6.0% / 商城8.7%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'large_appliances', categoryName: '📺 大型家電 (一般5.3% / 商城5.8%)', commissionRate: 0.053, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'life_appliances', categoryName: '🍳 生活/廚房/電視家電 (一般5.5% / 商城6.0%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'home_parts', categoryName: '🔋 家用零件/電池/遙控器 (一般6.0% / 商城8.0%)', commissionRate: 0.060, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'projector_other_appliances', categoryName: '📹 投影機與周邊/其他家電 (一般7.5% / 商城8.5%)', commissionRate: 0.075, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'walkie_talkie', categoryName: '📟 對講機 (一般6.5% / 商城9.5%)', commissionRate: 0.065, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'phone_acc_other', categoryName: '🔌 手機周邊配件/儲值卡/其他 (一般7.5% / 商城9.5%)', commissionRate: 0.075, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  { platform: 'auction_5', category: 'game_console', categoryName: '🎮 電玩主機 (一般5.5% / 商城3.5%)', commissionRate: 0.055, transactionRate: 0.025, coinRate: 0.015, shippingRate: 0.06, flatFee: 0, backProfitRate: 0, hasCap: true, promoRate: 0.02 },
  // 蝦皮直送
  { platform: 'direct', category: 'phone', categoryName: '📱 直送手機 (前毛5.5% + 後毛2%)', commissionRate: 0.055, transactionRate: 0, coinRate: 0, shippingRate: 0, flatFee: 0, backProfitRate: 0.02, hasCap: false, promoRate: 0 },
  { platform: 'direct', category: 'tablet', categoryName: '📟 直送平板 / 筆電 / 穿戴 / 週邊 (前毛6.5% + 後毛2%)', commissionRate: 0.065, transactionRate: 0, coinRate: 0, shippingRate: 0, flatFee: 0, backProfitRate: 0.02, hasCap: false, promoRate: 0 },
  { platform: 'direct', category: 'earphone', categoryName: '🎧 直送耳機 - 手機品牌 (前毛10% + 後毛2%)', commissionRate: 0.10, transactionRate: 0, coinRate: 0, shippingRate: 0, flatFee: 0, backProfitRate: 0.02, hasCap: false, promoRate: 0 },
  { platform: 'direct', category: 'speaker', categoryName: '🔊 直送耳機 - 其他品牌 / 音響 (前毛12% + 後毛2%)', commissionRate: 0.12, transactionRate: 0, coinRate: 0, shippingRate: 0, flatFee: 0, backProfitRate: 0.02, hasCap: false, promoRate: 0 },
  { platform: 'direct', category: 'appliances', categoryName: '📺 直送家用電器 (前毛10% + 後毛2%)', commissionRate: 0.10, transactionRate: 0, coinRate: 0, shippingRate: 0, flatFee: 0, backProfitRate: 0.02, hasCap: false, promoRate: 0 },
  { platform: 'direct', category: 'accessories', categoryName: '🔌 直送手機配件 / 其他 (前毛12% + 後毛2%)', commissionRate: 0.12, transactionRate: 0, coinRate: 0, shippingRate: 0, flatFee: 0, backProfitRate: 0.02, hasCap: false, promoRate: 0 }
];

export default function OrderForm({ currentUser, onSave, onSaveBatch, onClose, editOrder }) {
  const [activeTab, setActiveTab] = useState('single'); // 'single' 或 'batch'
  const [formData, setFormData] = useState({
    id: '',
    platform: '門市',
    customerName: '',
    customerPhone: '',
    store: currentUser.store !== '全分店' ? currentUser.store : '東門店',
    productName: '',
    promiseDate: '',
    price: 0,
    cost: 0
  });

  // 蝦皮毛利計算器狀態
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcData, setCalcData] = useState({
    price: '',
    cost: '',
    platform: 'mall',
    category: 'phone',
    isPromoDay: false,
    isPreOrder: false,
    hasCryptoFee: true
  });

  // 雲端費率與最後計算結果暫存
  const [cloudRates, setCloudRates] = useState([]);
  const [lastCalculationResult, setLastCalculationResult] = useState(null);

  // 批次匯入狀態
  const [batchText, setBatchText] = useState('');
  const [parsedOrders, setParsedOrders] = useState([]);
  const [batchSettings, setBatchSettings] = useState({
    globalPromiseDate: '',
    globalStore: '電商部'
  });

  // 如果是編輯模式，預填資料並強制單筆 Tab
  useEffect(() => {
    if (editOrder) {
      setActiveTab('single');
      setFormData({
        id: editOrder.id || '',
        platform: editOrder.platform || '門市',
        customerName: editOrder.customerName || '',
        customerPhone: editOrder.customerPhone || '',
        store: editOrder.store || currentUser.store,
        productName: editOrder.productName || '',
        promiseDate: editOrder.promiseDate || '',
        price: editOrder.price || 0,
        cost: editOrder.cost || 0
      });
    } else {
      // 新增模式：預設承諾日期為今天
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const randomId = `ord_${Math.random().toString(36).substr(2, 9)}`;
      setFormData(prev => ({ 
        ...prev, 
        id: randomId,
        platform: '門市',
        promiseDate: todayStr 
      }));
      
      // 預設批次的統一交期為 3 天後
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 3);
      const dy = defaultDate.getFullYear();
      const dm = String(defaultDate.getMonth() + 1).padStart(2, '0');
      const dd3 = String(defaultDate.getDate()).padStart(2, '0');
      setBatchSettings({
        globalPromiseDate: `${dy}-${dm}-${dd3}`,
        globalStore: '電商部'
      });
    }
  }, [editOrder, currentUser]);

  // 元件載入時，嘗試載入雲端電商費率設定
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const rates = await getECommerceRates();
        if (rates && rates.length > 0) {
          setCloudRates(rates);
          console.log('蝦皮雲端費率載入成功，共', rates.length, '筆');
        }
      } catch (e) {
        console.warn('載入蝦皮雲端費率失敗，將使用本地硬編碼預設費率:', e);
      }
    };
    fetchRates();
  }, []);

  // 單筆新增送出
  const handleSingleSubmit = (e) => {
    e.preventDefault();
    
    const isEcommerceUser = currentUser.store === '電商部';
    
    // 如果是電商人員，客戶姓名帶入訂單平台，聯絡電話帶入訂單編號
    const nameVal = isEcommerceUser ? formData.platform : formData.customerName.trim();
    const phoneVal = isEcommerceUser ? formData.id.trim() : formData.customerPhone.trim();

    if (!isEcommerceUser) {
      if (!formData.customerName.trim()) {
        alert('請填寫客戶姓名');
        return;
      }
      if (!formData.customerPhone.trim()) {
        alert('請填寫聯絡電話');
        return;
      }
    }

    if (!formData.productName.trim()) {
      alert('請填寫訂購商品與承諾詳情');
      return;
    }
    if (!formData.promiseDate) {
      alert('請選擇預計交貨日');
      return;
    }

    // 電商平台防呆：必須填寫真實平台訂單編號，不可留空或使用系統預設的 ord_ 開頭隨機編號
    if (formData.platform !== '門市' && formData.platform !== '其他') {
      const trimmedId = formData.id.trim();
      if (!trimmedId) {
        alert('電商訂單必須填寫【真實平台訂單編號】以利後續追蹤！');
        return;
      }
      if (trimmedId.startsWith('ord_')) {
        alert('偵測到系統預設的隨機訂單編號。外部電商訂單請填寫【真實平台訂單編號】，不可使用預設隨機編號！');
        return;
      }
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (editOrder) {
      // 編輯保存模式
      const updatedOrder = {
        ...editOrder,
        platform: formData.platform,
        customerName: nameVal,
        customerPhone: phoneVal,
        store: formData.store,
        productName: formData.productName.trim(),
        promiseDate: formData.promiseDate,
        price: Number(formData.price) || 0,
        cost: Number(formData.cost) || 0
      };
      onSave(updatedOrder, lastCalculationResult);
    } else {
      // 全新新增模式
      const orderId = formData.id.trim() || `ord_${Math.random().toString(36).substr(2, 9)}`;
      const newOrder = {
        id: orderId,
        platform: formData.platform,
        customerName: nameVal,
        customerPhone: phoneVal,
        productName: formData.productName.trim(),
        type: '訂貨',
        store: formData.store,
        creator: currentUser.name,
        source: '門市',
        tags: [],
        quantity: 1,
        price: Number(formData.price) || 0,
        cost: Number(formData.cost) || 0,
        status: '訂貨需求',
        createdAt: todayStr,
        promiseDate: formData.promiseDate,
        overdueDays: 0,
        signature: '',
        notes: ''
      };
      onSave(newOrder, lastCalculationResult);
    }
  };

  // 智能文字解析器 (Text Parser - 支援標準標記與 LINE 對話紀錄)
  const parseBatchText = (text) => {
    if (!text.trim()) return [];
    
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const items = [];
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    let generalPromiseDate = batchSettings.globalPromiseDate;
    
    // 偵測是否為 LINE 對話紀錄模式 (包含時間標記 hh:mm 與發言人)
    const isLineChatLog = text.includes(':') && lines.some(line => line.match(/^\d{2}:\d{2}/));
    
    if (isLineChatLog) {
      let currentYear = today.getFullYear();
      let currentMonth = today.getMonth() + 1;
      let currentDay = today.getDate();
      
      // 1. 將對話紀錄整理成發言區塊
      const blocks = [];
      let currentBlock = null;
      
      for (let line of lines) {
        // 偵測日期行，例如: "2023.02.02 星期四"
        const dateMatch = line.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
        if (dateMatch) {
          currentYear = parseInt(dateMatch[1]);
          currentMonth = parseInt(dateMatch[2]);
          currentDay = parseInt(dateMatch[3]);
          continue;
        }
        
        // 偵測發言人行，例如: "09:16 妏（馬尼東門） 紅米 10..."
        const msgMatch = line.match(/^(\d{2}):(\d{2})\s+([^\s]+)\s*(.*)/);
        if (msgMatch) {
          const hours = msgMatch[1];
          const minutes = msgMatch[2];
          const sender = msgMatch[3];
          const firstLineContent = msgMatch[4] || '';
          
          // 解析發言人分店
          let store = '電商部';
          if (sender.includes('東門')) store = '東門店';
          else if (sender.includes('小西門')) store = '小西門店';
          else if (sender.includes('文賢')) store = '文賢店';
          else if (sender.includes('永康')) store = '永康店';
          else if (sender.includes('歸仁')) store = '歸仁店';
          else if (sender.includes('安中')) store = '安中店';
          else if (sender.includes('鹽行')) store = '鹽行店';
          else if (sender.includes('五甲')) store = '五甲店';
          else if (sender.includes('延平')) store = '遠傳延平店';
          
          currentBlock = {
            sender,
            store,
            lines: []
          };
          blocks.push(currentBlock);
          
          if (firstLineContent.trim()) {
            currentBlock.lines.push(firstLineContent.trim());
          }
        } else if (currentBlock) {
          currentBlock.lines.push(line);
        }
      }
      
      // 2. 針對每個發言區塊進行語意分析
      blocks.forEach(block => {
        const fullText = block.lines.join('\n');
        
        // --- 模式 A: 調貨清單 (包含 "調貨" 關鍵字) ---
        if (fullText.includes('調貨')) {
          let currentTargetStore = block.store;
          
          for (let i = 0; i < block.lines.length; i++) {
            let l = block.lines[i];
            if (l.includes('調貨') || l.includes('【已調未回】') || l.includes('過期') || l.includes('謝謝')) {
              continue;
            }
            
            // 檢查是否為分店名稱
            const matchedStore = STORES.find(s => l.replace('店', '').trim() && l.includes(s.replace('店', '')));
            if (matchedStore) {
              currentTargetStore = matchedStore;
              continue;
            }
            
            // 檢查是否為 "商品 *數量" 或 "商品*數量"
            const parts = l.split('*');
            if (parts.length >= 2) {
              const productName = parts[0].trim();
              const qty = parseInt(parts[1].trim()) || 1;
              const notes = `[調貨] 由 ${block.sender} 於 LINE 群發起`;
              
              items.push({
                id: `ord_line_${Math.random().toString(36).substr(2, 9)}_${new Date().getTime()}_${items.length}`,
                customerName: '網拍調貨',
                customerPhone: '0900-000-000',
                productName: productName,
                type: '調貨',
                store: currentTargetStore,
                creator: block.sender,
                source: '網拍電商',
                tags: ['電商調貨'],
                quantity: qty,
                price: 0,
                cost: 0,
                status: '訂貨需求',
                createdAt: todayStr,
                promiseDate: generalPromiseDate,
                overdueDays: 0,
                signature: '',
                notes: notes
              });
            } else if (l.trim()) {
              if (i + 1 < block.lines.length && block.lines[i + 1].startsWith('*')) {
                const qty = parseInt(block.lines[i + 1].replace('*', '').trim()) || 1;
                items.push({
                  id: `ord_line_${Math.random().toString(36).substr(2, 9)}_${new Date().getTime()}_${items.length}`,
                  customerName: '網拍調貨',
                  customerPhone: '0900-000-000',
                  productName: l.trim(),
                  type: '調貨',
                  store: currentTargetStore,
                  creator: block.sender,
                  source: '網拍電商',
                  tags: ['電商調貨'],
                  quantity: qty,
                  price: 0,
                  cost: 0,
                  status: '訂貨需求',
                  createdAt: todayStr,
                  promiseDate: generalPromiseDate,
                  overdueDays: 0,
                  signature: '',
                  notes: `[調貨] 由 ${block.sender} 於 LINE 群發起`
                });
                i++;
              }
            }
          }
          return;
        }
        
        // --- 模式 B: 欠貨需求 (包含 "欠" 關鍵字) ---
        if (fullText.includes('欠')) {
          const qtyMatch = fullText.match(/欠\s*(\d+)/);
          const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
          
          let cleanProduct = fullText
            .replace(/欠\s*\d+\s*(幫出)?/, '')
            .replace(/[，,。!！\s]/g, '')
            .replace(/幫出/g, '')
            .replace(/謝謝/g, '');
          
          if (cleanProduct.trim()) {
            items.push({
              id: `ord_line_${Math.random().toString(36).substr(2, 9)}_${new Date().getTime()}_${items.length}`,
              customerName: '電商欠貨',
              customerPhone: '0900-000-000',
              productName: cleanProduct.trim(),
              type: '訂貨',
              store: block.store,
              creator: block.sender,
              source: '網拍電商',
              tags: ['電商欠貨'],
              quantity: qty,
              price: 0,
              cost: 0,
              status: '訂貨需求',
              createdAt: todayStr,
              promiseDate: generalPromiseDate,
              overdueDays: 0,
              signature: '',
              notes: `[欠貨] 由 ${block.sender} 於 LINE 群提出: ${fullText}`
            });
          }
          return;
        }
        
        // --- 模式 C: 退貨與換貨 (包含 "退" 或 "換" 關鍵字) ---
        const hasReturn = fullText.includes('退');
        const hasExchange = fullText.includes('換');
        
        if (hasReturn || hasExchange) {
          const type = '退換貨';
          const status = hasReturn ? '退貨中' : '換貨中';
          const notes = `[退換貨] 於 LINE 群提出: ${fullText}`;
          
          let cleanProduct = fullText
            .replace(/[，,。!！\s]/g, '')
            .replace(/退貨/g, '')
            .replace(/換貨/g, '')
            .replace(/退/g, '')
            .replace(/換/g, '');
            
          items.push({
            id: `ord_line_${Math.random().toString(36).substr(2, 9)}_${new Date().getTime()}_${items.length}`,
            customerName: '退換貨客戶',
            customerPhone: '0900-000-000',
            productName: cleanProduct.trim() || fullText.substring(0, 30),
            type: type,
            store: block.store,
            creator: block.sender,
            source: '網拍電商',
            tags: [hasReturn ? '退貨' : '換貨'],
            quantity: 1,
            price: 0,
            cost: 0,
            status: status,
            createdAt: todayStr,
            promiseDate: generalPromiseDate,
            overdueDays: 0,
            signature: '',
            notes: notes
          });
          return;
        }
        
        // --- 模式 D: 客訂 (包含 "客訂" 或 "客需") ---
        if (fullText.includes('客訂') || fullText.includes('客需')) {
          let cleanProduct = fullText.replace(/客訂/g, '').replace(/客需/g, '').trim();
          items.push({
            id: `ord_line_${Math.random().toString(36).substr(2, 9)}_${new Date().getTime()}_${items.length}`,
            customerName: '客訂客戶',
            customerPhone: '0900-000-000',
            productName: cleanProduct || fullText.substring(0, 30),
            type: '訂貨',
            store: block.store,
            creator: block.sender,
            source: '網拍電商',
            tags: ['客訂'],
            quantity: 1,
            price: 0,
            cost: 0,
            status: '待處理',
            createdAt: todayStr,
            promiseDate: generalPromiseDate,
            overdueDays: 0,
            signature: '',
            notes: `[客訂] 於 LINE 群提出: ${fullText}`
          });
          return;
        }
        
        // --- 模式 E: 到貨通知 ---
        if (fullText.includes('到貨通知') || fullText.includes('到貨')) {
          let cleanProduct = fullText.replace(/到貨通知/g, '').replace(/到貨/g, '').replace(/神腦/g, '').trim();
          items.push({
            id: `ord_line_${Math.random().toString(36).substr(2, 9)}_${new Date().getTime()}_${items.length}`,
            customerName: '預計到貨',
            customerPhone: '0900-000-000',
            productName: cleanProduct || fullText.substring(0, 30),
            type: '訂貨',
            store: block.store,
            creator: block.sender,
            source: '網拍電商',
            tags: ['預計到貨'],
            quantity: 1,
            price: 0,
            cost: 0,
            status: '已下訂',
            createdAt: todayStr,
            promiseDate: generalPromiseDate,
            overdueDays: 0,
            signature: '',
            notes: `[到貨通知] 於 LINE 群提出: ${fullText}`
          });
          return;
        }
      });
      
      return items;
    } else {
      // 🔵🟠🔴 標準格式解析
      let i = 0;
      while (i < lines.length) {
        let line = lines[i];
        if (line.includes('今日網拍調貨') || line.includes('🔵可從東門調') || line.includes('✅') || line.includes('🟠分店調看看')) {
          i++;
          continue;
        }
        
        const isNewItem = line.startsWith('🔵') || line.startsWith('🟠') || line.startsWith('🔴');
        
        if (isNewItem) {
          const isBlue = line.startsWith('🔵');
          const isOrange = line.startsWith('🟠');
          const rest = line.substring(1).trim();
          
          const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
          const hasSubItems = !rest.includes('*') && nextLine && !nextLine.startsWith('🔵') && !nextLine.startsWith('🟠') && !nextLine.startsWith('🔴') && nextLine.includes('*');
          
          if (hasSubItems) {
            const mainProduct = rest;
            i++;
            
            while (i < lines.length) {
              let subLine = lines[i];
              if (subLine.startsWith('🔵') || subLine.startsWith('🟠') || subLine.startsWith('🔴')) {
                i--;
                break;
              }
              if (subLine.includes('過期')) {
                i++;
                continue;
              }
              
              const parts = subLine.split('*');
              if (parts.length >= 2) {
                const specAndAcc = parts[0].trim();
                const qty = parseInt(parts[1].trim()) || 1;
                
                let finalSpec = specAndAcc;
                let acc = '';
                if (specAndAcc.includes('+')) {
                  const spl = specAndAcc.split('+');
                  finalSpec = spl[0].trim();
                  acc = spl[1].trim();
                }
                
                let status = '訂貨需求';
                let stockNote = '無庫存';
                if (isBlue) { status = '已下訂'; stockNote = '可從東門調'; }
                if (isOrange) { status = '訂貨需求'; stockNote = '分店調看看'; }
                
                items.push({
                  id: `ord_batch_${Math.random().toString(36).substr(2, 9)}_${new Date().getTime()}_${items.length}`,
                  customerName: '網拍調貨',
                  customerPhone: '0900-000-000',
                  productName: `${mainProduct} ${finalSpec}`,
                  type: '調貨',
                  store: batchSettings.globalStore,
                  creator: currentUser.name,
                  source: '網拍電商',
                  tags: ['電商調貨'],
                  quantity: qty,
                  price: 0,
                  cost: 0,
                  status: status,
                  createdAt: todayStr,
                  promiseDate: generalPromiseDate,
                  overdueDays: 0,
                  signature: '',
                  notes: `[調貨庫存] ${stockNote}${acc ? ` | 配件: ${acc}` : ''}`
                });
              }
              i++;
            }
          } else {
            const parts = rest.split('*');
            let rawProductName = rest;
            let qty = 1;
            
            if (parts.length >= 2) {
              rawProductName = parts[0].trim();
              qty = parseInt(parts[1].trim()) || 1;
            }
            
            let finalProduct = rawProductName;
            let accNote = '';
            
            if (parts.length >= 2) {
              const secondPart = parts[1].trim();
              const accMatch = secondPart.match(/\((.+?)\)/);
              if (accMatch) {
                accNote = accMatch[1];
              }
            }
            
            let nextLine = i + 1 < lines.length ? lines[i + 1] : '';
            let stockNote = '無庫存';
            let status = '訂貨需求';
            
            if (isBlue) { status = '已下訂'; stockNote = '可從東門調'; }
            if (isOrange) { status = '訂貨需求'; stockNote = '分店調看看'; }
            
            if (nextLine && !nextLine.startsWith('🔵') && !nextLine.startsWith('🟠') && !nextLine.startsWith('🔴')) {
              const stockMatch = nextLine.match(/([^\d]+)(\d+)/);
              if (stockMatch) {
                stockNote = `${stockMatch[1].trim()}: ${stockMatch[2].trim()}`;
              } else {
                stockNote = nextLine;
              }
              i++;
            }
            
            items.push({
              id: `ord_batch_${Math.random().toString(36).substr(2, 9)}_${new Date().getTime()}_${items.length}`,
              customerName: '網拍調貨',
              customerPhone: '0900-000-000',
              productName: finalProduct,
              type: '調貨',
              store: batchSettings.globalStore,
              creator: currentUser.name,
              source: '網拍電商',
              tags: ['電商調貨'],
              quantity: qty,
              price: 0,
              cost: 0,
              status: status,
              createdAt: todayStr,
              promiseDate: generalPromiseDate,
              overdueDays: 0,
              signature: '',
              notes: `[調貨庫存] ${stockNote}${accNote ? ` | 配件: ${accNote}` : ''}`
            });
          }
        }
        i++;
      }
      return items;
    }
  };

  // 蝦皮手續費與活動費計算公式 (對齊 2026年Q1 Excel 公式與最新蝦皮公告，支援雲端動態費率)
  const calculateShopeeFees = () => {
    const price = parseFloat(calcData.price) || 0;
    const cost = parseFloat(calcData.cost) || 0;
    
    const p = calcData.platform;
    const cat = calcData.category;
    
    const isAuction = p === 'auction' || p === 'auction_10' || p === 'auction_5';
    const isMall = p === 'mall';
    const isDirect = p === 'direct';
    
    // 是否參加了蝦幣回饋專案 (用來判斷是否免收活動日加收手續費)
    const hasCoinCampaign = p === 'mall' || p === 'auction_10' || p === 'auction_5';
        // 2. 從雲端費率或本地預設費率中尋找
    const activeRates = cloudRates.length > 0 ? cloudRates : LOCAL_RATES;
    const rateSetting = activeRates.find(r => r.platform === p && r.category === cat) || 
                        LOCAL_RATES.find(r => r.platform === p && r.category === cat);
    
    // 3. 取得費率參數
    const baseCommissionRate = rateSetting ? rateSetting.commissionRate : 0.055;
    const transactionRate = rateSetting ? rateSetting.transactionRate : 0.025;
    const coinRate = rateSetting ? rateSetting.coinRate : 0;
    const shippingRate = rateSetting ? rateSetting.shippingRate : 0;
    const flatFee = rateSetting ? rateSetting.flatFee : 0;
    const backProfitRate = rateSetting ? rateSetting.backProfitRate : 0;
    const hasCap = rateSetting ? rateSetting.hasCap : false;
    const basePromoRate = rateSetting ? rateSetting.promoRate : 0;
    
    // 特殊調整 1：活動促銷日加收 (僅在「未參加蝦幣回饋」時適用)
    let promoRate = 0;
    if (calcData.isPromoDay && !hasCoinCampaign && !isDirect) {
      promoRate = basePromoRate > 0 ? basePromoRate : (isMall ? 0.03 : (isAuction ? 0.02 : 0));
    }
    
    // 特殊調整 2：預購訂單 (較長備貨) 額外 +3%
    let preOrderRate = calcData.isPreOrder ? 0.03 : 0;
    
    // 總成交手續費率 (基本 + 促銷加收 + 預購加收)
    const finalCommissionRate = baseCommissionRate + promoRate + preOrderRate;
    
    // 成交手續費 (拍賣有 35,000 元上限)
    let commBase = price;
    if (hasCap && price > 35000) {
      commBase = 35000;
    }
    const commissionFee = Math.round(commBase * finalCommissionRate);
    
    // 金流服務費 2.5%
    const transactionFee = Math.round(price * transactionRate);
    
    // 蝦幣回饋服務費
    const coinCampaignFee = Math.round(price * coinRate);
    
    // 免運服務費 (方案一比例費，或方案二固定費 60)
    const shippingCampaignFee = shippingRate > 0 ? Math.round(price * shippingRate) : flatFee;
    
    // 物流隱碼服務費 (僅限一般賣家/拍賣方案收，預設 10 元，商城與直送除外)
    const cryptoFee = (calcData.hasCryptoFee && isAuction) ? 10 : 0;
    
    // 直送後毛服務費 2%
    const backProfitFee = Math.round(price * backProfitRate);
    
    // 總手續費
    const totalFees = commissionFee + transactionFee + coinCampaignFee + shippingCampaignFee + backProfitFee + cryptoFee;
    
    // 實拿金額
    const payout = Math.max(0, price - totalFees);
    
    // 預估毛利與毛利率
    const profit = payout - cost;
    const profitMargin = price > 0 ? (profit / price) * 100 : 0;
    
    // 取得中文顯示名稱
    const platformNames = {
      mall: '蝦商 長期免運2+5%回饋',
      direct: '蝦皮直送',
      auction_10: '蝦拍10倍館(綁免運2+10%回饋)',
      auction_5: '蝦拍5倍館(綁免運1+5%回饋)'
    };
    
    return {
      platformName: platformNames[p] || p,
      categoryName: rateSetting ? rateSetting.categoryName.replace(/📱\s*|📟\s*|💻\s*|🎧\s*|🔊\s*|⌚\s*|⌨️\s*|📺\s*|🎮\s*|💿\s*|🔌\s*|🥗\s*/g, '') : cat, // 去除 icon
      commissionFee,
      commissionRate: finalCommissionRate,
      baseCommissionRate,
      promoRate,
      preOrderRate,
      transactionFee,
      coinCampaignFee,
      shippingCampaignFee,
      cryptoFee,
      backProfitFee,
      totalFees,
      payout,
      profit,
      profitMargin,
      price,
      cost
    };
  };

  // 代入計算結果
  const handleApplyCalc = () => {
    const result = calculateShopeeFees();
    
    // 計算器平台反向連動訂單平台，極致體驗！
    let platName = '門市';
    if (calcData.platform === 'mall') platName = '蝦商 長期免運';
    else if (calcData.platform === 'auction_10') platName = '蝦拍10倍館';
    else if (calcData.platform === 'auction_5') platName = '蝦拍5倍館';
    else if (calcData.platform === 'direct') platName = '蝦皮直送';
    
    setFormData(prev => ({
      ...prev,
      price: result.payout,
      cost: parseFloat(calcData.cost) || 0,
      platform: platName
    }));
    setLastCalculationResult(result); // 暫存抽成明細，等候與訂單一併送出
    setIsCalcOpen(false);
  };

  const handleOpenCalculator = () => {
    // 依據訂單平台，自動預選計算器的平台
    let calcPlatform = 'mall';
    if (formData.platform === '蝦商 長期免運') calcPlatform = 'mall';
    else if (formData.platform === '蝦拍10倍館') calcPlatform = 'auction_10';
    else if (formData.platform === '蝦拍5倍館') calcPlatform = 'auction_5';
    else if (formData.platform === '蝦皮直送') calcPlatform = 'direct';
    
    const activeRates = cloudRates.length > 0 ? cloudRates : LOCAL_RATES;
    const defaultCat = activeRates.find(r => r.platform === calcPlatform)?.category || 'phone';
    
    setCalcData({
      price: formData.price || '',
      cost: formData.cost || '',
      platform: calcPlatform,
      category: defaultCat,
      isPromoDay: false,
      isPreOrder: false,
      hasCryptoFee: calcPlatform === 'auction_10' || calcPlatform === 'auction_5'
    });
    setIsCalcOpen(true);
  };

  // 處理點選解析
  const handleParse = () => {
    if (!batchText.trim()) {
      alert('請先輸入或貼上調貨需求文字！');
      return;
    }
    const result = parseBatchText(batchText);
    if (result.length === 0) {
      alert('解析失敗！請確認文字格式是否正確 (需包含 🔵/🟠/🔴)。');
    } else {
      setParsedOrders(result);
    }
  };

  // 統一更改所有草稿之交期
  const handleGlobalDateChange = (date) => {
    setBatchSettings(prev => ({ ...prev, globalPromiseDate: date }));
    setParsedOrders(prev => prev.map(o => ({ ...o, promiseDate: date })));
  };

  // 統一更改所有草稿之分店
  const handleGlobalStoreChange = (store) => {
    setBatchSettings(prev => ({ ...prev, globalStore: store }));
    setParsedOrders(prev => prev.map(o => ({ ...o, store })));
  };

  // 個別修改草稿欄位
  const handleEditDraftItem = (id, field, value) => {
    setParsedOrders(prev => prev.map(o => {
      if (o.id === id) {
        return { ...o, [field]: value };
      }
      return o;
    }));
  };

  // 刪除草稿項目
  const handleDeleteDraftItem = (id) => {
    setParsedOrders(prev => prev.filter(o => o.id !== id));
  };

  // 批次確認送出
  const handleBatchSubmit = (e) => {
    e.preventDefault();
    if (parsedOrders.length === 0) {
      alert('無已解析的訂單可供匯入！');
      return;
    }
    
    // 檢查是否有未填項目
    const hasInvalid = parsedOrders.some(o => !o.productName.trim() || !o.promiseDate);
    if (hasInvalid) {
      alert('草稿列表中有商品名稱或預計交貨日未填，請修正後再送出！');
      return;
    }

    if (onSaveBatch) {
      onSaveBatch(parsedOrders);
    } else {
      // 降級做法：若 App.jsx 沒有傳入 onSaveBatch，逐筆呼叫 onSave (不推薦，防呆用)
      alert('開始逐筆寫入資料，請稍候...');
      parsedOrders.forEach(o => onSave(o));
    }
  };

  const hasAllStoresPerm = currentUser.permissions && currentUser.permissions.includes('view_all_stores');
  const canShowCalculator = currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.store === '電商部');

  // 取得當前使用者的縮寫
  const getUserInitials = () => {
    if (currentUser.name === '總管理處') return 'HQ';
    if (currentUser.name === '文和') return 'AD';
    return currentUser.name ? currentUser.name.substring(0, 2) : 'SP';
  };

  return (
    <div className="absolute inset-0 bg-slate-50 flex flex-col z-50 overflow-y-auto no-scrollbar animate-slide-up pb-16 font-['Outfit',_'Inter',_sans-serif]">
      {/* 頂部導覽列 */}
      <div className="sticky top-0 bg-[#E6EEFF] border-b border-blue-100 px-4 py-3 flex items-center justify-between z-10 shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 border border-dashed border-blue-300 rounded-full flex items-center justify-center text-blue-600 bg-white hover:bg-blue-50 active:scale-90 transition-all focus:outline-none shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-base font-black text-blue-900 tracking-wide">門市訂貨管理</h2>
        <div className="w-10 h-10 rounded-full bg-white text-blue-600 font-black text-xs flex items-center justify-center border border-blue-200 font-mono shadow-sm" title="登入人員代碼">
          {getUserInitials()}
        </div>
      </div>

      {/* 表單主內容區 */}
      <div className="p-4 flex-1 flex flex-col space-y-4 max-w-lg mx-auto w-full">
        {/* 標題語區 */}
        <div className="space-y-1 pl-1">
          <h1 className="text-2xl font-black text-slate-800">
            {editOrder ? '修改訂單資訊' : '新增訂貨承諾'}
          </h1>
          <p className="text-[11px] text-slate-400 font-bold">
            {editOrder ? '請在下方修改訂單資訊。' : '選擇單筆輸入，或直接貼上電商群文字進行一鍵批次解析與匯入！'}
          </p>
        </div>

        {/* Tab 切換 (非編輯模式才顯示) */}
        {!editOrder && (
          <div className="flex space-x-1 bg-slate-200/50 p-1.5 rounded-2xl w-full border border-slate-200 text-xs font-black shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'single'
                  ? 'bg-white text-blue-600 shadow-md scale-99'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>單筆手動新增</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'batch'
                  ? 'bg-white text-blue-600 shadow-md scale-99'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText size={14} strokeWidth={2.5} />
              <span>電商文字批次匯入</span>
            </button>
          </div>
        )}

        {/* Tab 1: 單筆手動新增 */}
        {activeTab === 'single' && (
          <form onSubmit={handleSingleSubmit} className="bg-white rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 space-y-4.5">
            <div className="space-y-4">
              {/* 0. 訂單平台 與 訂單編號 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-black block">訂單平台</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => {
                      const platVal = e.target.value;
                      let updatedId = formData.id;
                      
                      // 防呆邏輯：切換至外部電商平台時，若為系統預設隨機編號則清空
                      if (platVal !== '門市' && platVal !== '其他') {
                        if (formData.id.startsWith('ord_')) {
                          updatedId = '';
                        }
                      } else {
                        // 切換回門市或其他時，若編號為空，則補上系統隨機編號
                        if (!formData.id.trim()) {
                          updatedId = `ord_${Math.random().toString(36).substr(2, 9)}`;
                        }
                      }

                      setFormData({ 
                        ...formData, 
                        platform: platVal,
                        id: updatedId
                      });
                      
                      // 智慧聯動：如果選了蝦皮平台，自動設定計算器預設平台
                      let calcPlatform = 'mall';
                      if (platVal === '蝦商 長期免運') calcPlatform = 'mall';
                      else if (platVal === '蝦拍10倍館') calcPlatform = 'auction_10';
                      else if (platVal === '蝦拍5倍館') calcPlatform = 'auction_5';
                      else if (platVal === '蝦皮直送') calcPlatform = 'direct';
                      
                      if (platVal !== '門市' && platVal !== '其他') {
                        const activeRates = cloudRates.length > 0 ? cloudRates : LOCAL_RATES;
                        const defaultCat = activeRates.find(r => r.platform === calcPlatform)?.category || 'phone';
                        setCalcData(prev => ({
                          ...prev,
                          platform: calcPlatform,
                          category: defaultCat,
                          hasCryptoFee: calcPlatform === 'auction_10' || calcPlatform === 'auction_5'
                        }));
                      }
                    }}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-700 bg-slate-50/50 cursor-pointer"
                  >
                    <option value="門市">🏪 門市</option>
                    <option value="蝦商 長期免運">🛍️ 蝦商 長期免運</option>
                    <option value="蝦拍10倍館">🎟️ 蝦拍10倍館</option>
                    <option value="蝦拍5倍館">🎟️ 蝦拍5倍館</option>
                    <option value="蝦皮直送">🚚 蝦皮直送</option>
                    <option value="其他">🌐 其他</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-black block">訂單編號</label>
                  <input
                    type="text"
                    placeholder={
                      formData.platform !== '門市' && formData.platform !== '其他'
                        ? "請輸入平台真實訂單編號 (必填)"
                        : "請輸入訂單編號 (選填)"
                    }
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* 1. 客戶姓名 */}
              {currentUser.store !== '電商部' && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-black block">客戶姓名 *</label>
                  <input
                    type="text"
                    placeholder="請輸入客戶姓名 (例如: 王大同)"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-800"
                    required
                  />
                </div>
              )}

              {/* 2. 聯絡電話 */}
              {currentUser.store !== '電商部' && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-black block">聯絡電話 *</label>
                  <input
                    type="tel"
                    placeholder="請輸入手機號碼 (例如: 0912-345-678)"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-850 font-mono"
                    required
                  />
                </div>
              )}

              {/* 3. 分店門市 */}
              <div className="space-y-1">
                <label className="text-xs text-slate-700 font-black block">分店門市</label>
                <select
                  value={formData.store}
                  onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                  disabled={!hasAllStoresPerm}
                  className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-700 bg-slate-50/50 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {hasAllStoresPerm ? (
                    STORES.map(s => <option key={s} value={s}>{s}</option>)
                  ) : (
                    <option value={currentUser.store}>{currentUser.store}</option>
                  )}
                </select>
              </div>

              {/* 4. 訂購商品與承諾詳情 */}
              <div className="space-y-1">
                <label className="text-xs text-slate-700 font-black block">訂購商品與承諾詳情 *</label>
                <textarea
                  placeholder="請詳細描述訂購的商品名稱、規格、贈品或承諾內容..."
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-800 h-24 resize-none leading-relaxed"
                  required
                />
              </div>

              {/* 5. 預計交貨日 */}
              <div className="space-y-1">
                <label className="text-xs text-slate-700 font-black block">預計交貨日</label>
                <div className="relative rounded-xl shadow-sm">
                  <input
                    type="date"
                    value={formData.promiseDate}
                    onChange={(e) => setFormData({ ...formData, promiseDate: e.target.value })}
                    className="block w-full px-4 py-3 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-855 font-mono"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                    <Calendar size={14} />
                  </div>
                </div>
              </div>

              {/* 6. 商品單價 與 成本 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-slate-700 font-black block">商品單價 (實拿) *</label>
                    {canShowCalculator && (
                      <button
                        type="button"
                        onClick={handleOpenCalculator}
                        className="px-2 py-0.5 text-[10px] text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100 rounded-lg flex items-center space-x-1 shadow-sm transition-all duration-150 active:scale-95 hover:scale-105"
                        title="開啟蝦皮手續費毛利試算"
                      >
                        <Calculator size={11} />
                        <span>🧮 平台計算器</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="請輸入單價"
                    value={formData.price || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, price: parseFloat(e.target.value) || 0 });
                      setLastCalculationResult(null); // 手動修改單價，重置暫存計算明細
                    }}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-800 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-black block">商品成本 *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="請輸入成本"
                    value={formData.cost || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 });
                      setLastCalculationResult(null); // 手動修改成本，重置暫存計算明細
                    }}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-800 font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 按鈕 */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center space-x-1.5 active:scale-95 transition-all shadow-md shadow-blue-200/50 border border-blue-500 focus:outline-none"
              >
                <Check size={15} strokeWidth={3} />
                <span>{editOrder ? '確認修改並儲存' : '確認無誤，建立訂單'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: 電商文字批次匯入 */}
        {activeTab === 'batch' && (
          <div className="space-y-4">
            {/* 文字貼上輸入區卡片 */}
            <div className="bg-white rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-750 font-black flex items-center space-x-1.5">
                    <FileText size={14} className="text-blue-500" />
                    <span>貼上電商/網拍調貨文字清單</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-bold">自動依 🔵/🟠/🔴 解析狀態與庫存</span>
                </div>
                <textarea
                  placeholder="請在此貼上複製的電商群組調貨文字，例如：&#10;🔵MOTO G06 橘 *1&#10;網拍21&#10;🔴A16 256G&#10;黃色+保 *1"
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-bold text-slate-800 h-44 resize-none leading-relaxed font-mono bg-slate-50/30"
                />
              </div>

              {/* 解析按鈕 */}
              <button
                type="button"
                onClick={handleParse}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-extrabold py-3 rounded-xl text-xs active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2 border border-blue-500"
              >
                <RefreshCw size={14} className="animate-pulse-subtle" />
                <span>智能解析文字清單</span>
              </button>
            </div>

            {/* 解析預覽卡片 */}
            {parsedOrders.length > 0 && (
              <div className="bg-white rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 space-y-4 animate-fade-in pb-6">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                    <Check size={14} className="text-emerald-500" strokeWidth={3} />
                    <span>解析結果預覽 (共 {parsedOrders.length} 筆項目)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setParsedOrders([])}
                    className="text-[10px] text-red-500 font-black hover:underline"
                  >
                    重置清空
                  </button>
                </div>

                {/* 統一設定面板 (WOW 體驗！) */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block">統一預預計交貨日</label>
                    <input
                      type="date"
                      value={batchSettings.globalPromiseDate}
                      onChange={(e) => handleGlobalDateChange(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg font-mono font-bold text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block">統一所屬分店</label>
                    <select
                      value={batchSettings.globalStore}
                      onChange={(e) => handleGlobalStoreChange(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg font-bold text-slate-700 focus:outline-none"
                    >
                      {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* 預覽訂單編輯清單 */}
                <div className="space-y-3.5 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                  {parsedOrders.map((draft, idx) => {
                    let statusBadge = 'bg-slate-50 text-slate-700 border-slate-200';
                    if (draft.status === '已下訂') {
                      statusBadge = 'bg-indigo-50 text-indigo-700 border-indigo-150';
                    } else if (draft.status === '訂貨需求') {
                      statusBadge = 'bg-slate-50 text-slate-700 border-slate-200';
                    }
                    
                    return (
                      <div key={draft.id} className="p-3 bg-slate-50/60 rounded-2xl border border-slate-150 relative flex flex-col space-y-2 group shadow-sm hover:border-slate-300 transition-all duration-200">
                        {/* 頂行：品項與刪除 */}
                        <div className="flex justify-between items-start pr-6">
                          <input
                            type="text"
                            value={draft.productName}
                            onChange={(e) => handleEditDraftItem(draft.id, 'productName', e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 font-black text-xs text-slate-800 focus:outline-none w-full py-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteDraftItem(draft.id)}
                            className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-red-500 rounded bg-white border shadow-sm active:scale-90 transition-all"
                            title="刪除此筆"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* 中行：數量與狀態設定 */}
                        <div className="flex items-center space-x-2 text-[10px] font-bold">
                          <div className="flex items-center space-x-1 shrink-0 bg-white border px-1.5 py-0.5 rounded-lg">
                            <span>數量:</span>
                            <input
                              type="number"
                              min="1"
                              value={draft.quantity}
                              onChange={(e) => handleEditDraftItem(draft.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-8 text-center font-mono focus:outline-none"
                            />
                          </div>

                          {/* 狀態切換 */}
                          <select
                            value={draft.status}
                            onChange={(e) => handleEditDraftItem(draft.id, 'status', e.target.value)}
                            className="bg-white border text-slate-700 px-2 py-0.5 rounded-lg focus:outline-none"
                          >
                            <option value="訂貨需求">📋 訂貨需求</option>
                            <option value="已下訂">📦 已下訂</option>
                            <option value="已到貨">🟢 已到貨</option>
                            <option value="退貨中">🛑 退貨中</option>
                            <option value="換貨中">🔄 換貨中</option>
                            <option value="待處理">⏳ 待處理</option>
                          </select>

                          {/* 分店個別選擇 */}
                          <select
                            value={draft.store}
                            onChange={(e) => handleEditDraftItem(draft.id, 'store', e.target.value)}
                            className="bg-white border text-slate-700 px-2 py-0.5 rounded-lg focus:outline-none ml-auto"
                          >
                            {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>

                        {/* 底行：備註與交期 */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 font-bold border-t border-dashed border-slate-200 pt-2">
                          <div className="flex items-center space-x-1 font-mono">
                            <Calendar size={11} className="text-gray-400" />
                            <input
                              type="date"
                              value={draft.promiseDate}
                              onChange={(e) => handleEditDraftItem(draft.id, 'promiseDate', e.target.value)}
                              className="bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none w-full"
                            />
                          </div>
                          <div className="truncate text-slate-400 italic text-right" title={draft.notes}>
                            {draft.notes}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 批次匯入確認按鈕 */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[10px] text-slate-400 font-bold flex items-center space-x-1">
                    <AlertCircle size={12} className="text-blue-500" />
                    <span>即將一次性安全寫入並同步至 Google Sheets</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleBatchSubmit}
                    className="bg-green-600 hover:bg-green-700 text-white font-extrabold py-3 px-6 rounded-2xl flex items-center justify-center space-x-1.5 active:scale-95 transition-all shadow-md shadow-green-200/50 border border-green-600 text-xs focus:outline-none"
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>確認匯入 (共 {parsedOrders.length} 筆)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 蝦皮毛利計算器 Modal */}
        {isCalcOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 font-['Outfit',_sans-serif]">
            <div className="bg-white rounded-[28px] w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 animate-slide-up flex flex-col max-h-[90vh]">
              {/* 標題 */}
              <div className="bg-[#E6EEFF] px-5 py-4 flex items-center justify-between border-b border-blue-100 shrink-0">
                <div className="flex items-center space-x-2">
                  <Calculator size={18} className="text-blue-600" />
                  <span className="text-sm font-black text-blue-900">蝦皮手續費與毛利計算器</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCalcOpen(false)}
                  className="w-7 h-7 border rounded-full bg-white hover:bg-slate-50 flex items-center justify-center font-bold text-slate-500 active:scale-90 transition-all text-xs"
                >
                  ✕
                </button>
              </div>

              {/* 內容 */}
              <div className="p-5 flex-1 overflow-y-auto no-scrollbar space-y-4 text-xs font-bold text-slate-700">
                {/* 1. 賣價與成本 */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block">商品賣價 (賣場售價)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="輸入賣價"
                      value={calcData.price}
                      onChange={(e) => setCalcData({ ...calcData, price: e.target.value })}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block">商品成本</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="輸入成本"
                      value={calcData.cost}
                      onChange={(e) => setCalcData({ ...calcData, cost: e.target.value })}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 font-mono"
                    />
                  </div>
                </div>

                {/* 2. 平台方案 */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">平台與賣場方案</label>
                  <select
                    value={calcData.platform}
                    onChange={(e) => {
                      const nextPlatform = e.target.value;
                      const isPlatformAuction = nextPlatform === 'auction_10' || nextPlatform === 'auction_5';
                      const activeRates = cloudRates.length > 0 ? cloudRates : localRates;
                      const defaultCat = activeRates.find(r => r.platform === nextPlatform)?.category || 'phone';
                      setCalcData({
                        ...calcData,
                        platform: nextPlatform,
                        category: defaultCat,
                        hasCryptoFee: isPlatformAuction
                      });
                    }}
                    className="block w-full px-2.5 py-2 border border-slate-200 bg-white rounded-lg text-xs font-black text-slate-850"
                  >
                    <option value="mall">蝦商 長期免運2+5%回饋</option>
                    <option value="direct">蝦皮直送</option>
                    <option value="auction_10">蝦拍10倍館(綁免運2+10%回饋)</option>
                    <option value="auction_5">蝦拍5倍館(綁免運1+5%回饋)</option>
                  </select>
                </div>

                {/* 3. 商品品類 */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">商品品類 (費率不同)</label>
                  <select
                    value={calcData.category}
                    onChange={(e) => setCalcData({ ...calcData, category: e.target.value })}
                    className="block w-full px-2.5 py-2 border border-slate-200 bg-white rounded-lg text-xs font-black text-slate-850"
                  >
                    {(() => {
                      const activeRates = cloudRates.length > 0 ? cloudRates : localRates;
                      const platformCategories = activeRates.filter(r => r.platform === calcData.platform);
                      return platformCategories.map(cat => (
                        <option key={cat.category} value={cat.category}>
                          {cat.categoryName}
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                {/* 3.5. 特殊條件 (勾選控制) */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-bold block">加收與專案服務費控制</span>
                  <div className="grid grid-cols-1 gap-2 bg-slate-50/60 p-3 rounded-2xl border border-slate-150 text-[11px] font-bold text-slate-700">
                    {/* 物流隱碼 */}
                    <label className={`flex items-center space-x-2 cursor-pointer select-none ${calcData.platform !== 'auction_10' && calcData.platform !== 'auction_5' ? 'text-slate-400' : ''}`}>
                      <input
                        type="checkbox"
                        checked={calcData.hasCryptoFee}
                        disabled={calcData.platform !== 'auction_10' && calcData.platform !== 'auction_5'}
                        onChange={(e) => setCalcData({ ...calcData, hasCryptoFee: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 border-slate-300 disabled:opacity-50"
                      />
                      <span className={calcData.platform !== 'auction_10' && calcData.platform !== 'auction_5' ? 'line-through' : ''}>
                        物流隱碼服務費 (固定 NT$10)
                      </span>
                      {(calcData.platform !== 'auction_10' && calcData.platform !== 'auction_5') && (
                        <span className="text-[9px] bg-green-50 text-green-600 px-1 py-0.2 rounded border border-green-150 scale-90 origin-left">
                          免收
                        </span>
                      )}
                    </label>

                    {/* 預購訂單 */}
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={calcData.isPreOrder}
                        onChange={(e) => setCalcData({ ...calcData, isPreOrder: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 border-slate-300"
                      />
                      <span>預購訂單 / 較長備貨 (成交費 +3%)</span>
                    </label>

                    {/* 促銷檔期 */}
                    <div className="flex flex-col space-y-0.5">
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={calcData.isPromoDay}
                          disabled={calcData.platform === 'mall' || calcData.platform === 'auction_10' || calcData.platform === 'auction_5' || calcData.platform === 'direct'}
                          onChange={(e) => setCalcData({ ...calcData, isPromoDay: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 border-slate-300 disabled:opacity-50"
                        />
                        <span className={calcData.platform === 'mall' || calcData.platform === 'auction_10' || calcData.platform === 'auction_5' ? 'text-slate-400 line-through' : ''}>
                          促銷檔期日 (一般 +2% / 商城 +3%)
                        </span>
                        {(calcData.platform === 'mall' || calcData.platform === 'auction_10' || calcData.platform === 'auction_5') && (
                          <span className="text-[9px] bg-green-50 text-green-600 px-1 py-0.2 rounded border border-green-150 scale-90 origin-left">
                            免收
                          </span>
                        )}
                      </label>
                      <span className="text-[9px] text-slate-400 pl-5.5 font-sans font-normal leading-tight">
                        (如每月大促雙雙日 11/11、12/12；月中 18 號；或每週三等)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. 即時計算結果 */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2 font-mono">
                  <div className="font-extrabold text-[11px] text-slate-400 pb-1.5 border-b border-slate-200 flex justify-between items-center font-sans">
                    <span>明細試算</span>
                    <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-150 px-1.5 py-0.2 rounded font-mono">2026 Q1</span>
                  </div>
                  
                  {(() => {
                    const fees = calculateShopeeFees();
                    const otherFeesTotal = fees.cryptoFee + fees.shippingCampaignFee + fees.coinCampaignFee;
                    return (
                      <div className="space-y-1.5 text-[11px] text-slate-600">
                        <div className="flex justify-between">
                          <span>
                            成交手續費 ({ (fees.commissionRate * 100).toFixed(1) }%)：
                          </span>
                          <span className="font-extrabold text-slate-800">-${fees.commissionFee}</span>
                        </div>
                        {fees.transactionFee > 0 && (
                          <div className="flex justify-between">
                            <span>金流與系統處理費 (2.5%)：</span>
                            <span className="font-extrabold text-slate-800">-${fees.transactionFee}</span>
                          </div>
                        )}
                        {otherFeesTotal > 0 && (
                          <div className="border-t border-slate-200/50 pt-1.5 space-y-1">
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>其他服務費 (活動服務費)：</span>
                              <span className="font-extrabold text-slate-800">-${otherFeesTotal}</span>
                            </div>
                            <div className="pl-3.5 space-y-0.5 text-[10px] text-slate-500 font-sans">
                              {fees.cryptoFee > 0 && (
                                <div className="flex justify-between">
                                  <span>• 物流隱碼服務費：</span>
                                  <span>-${fees.cryptoFee}</span>
                                </div>
                              )}
                              {fees.shippingCampaignFee > 0 && (
                                <div className="flex justify-between">
                                  <span>
                                    • 免運及進階賣家專案 [
                                    {calcData.platform === 'auction_5' ? '方案一 6%' : '方案二'}
                                    ] 服務費：
                                  </span>
                                  <span>-${fees.shippingCampaignFee}</span>
                                </div>
                              )}
                              {fees.coinCampaignFee > 0 && (
                                <div className="flex justify-between">
                                  <span>
                                    • 蝦幣回饋專案服務費 (
                                    {calcData.platform === 'auction_10' 
                                      ? '2.5% 已減免0.5%' 
                                      : '1.5%'
                                    })：
                                  </span>
                                  <span>-${fees.coinCampaignFee}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {fees.backProfitFee > 0 && (
                          <div className="flex justify-between">
                            <span>直送後毛手續費 (2%)：</span>
                            <span className="font-extrabold text-slate-800">-${fees.backProfitFee}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 font-bold">
                          <span>平台抽成總計：</span>
                          <span className="font-extrabold text-red-500">-${fees.totalFees}</span>
                        </div>
                        <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-200">
                          <span className="text-slate-700">實拿金額：</span>
                          <span className="text-emerald-600">${fees.payout}</span>
                        </div>
                        <div className="flex justify-between text-xs font-black">
                          <span className="text-slate-700">預估毛利：</span>
                          <span className={`font-extrabold ${fees.profit >= 0 ? 'text-blue-600' : 'text-rose-500'}`}>
                            ${fees.profit} ({fees.profitMargin.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 底部代入按鈕 */}
              <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleApplyCalc}
                  disabled={!calcData.price}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl text-xs shadow-md active:scale-95 transition-all disabled:bg-gray-200 disabled:text-gray-400"
                >
                  代入實拿金額至單價
                </button>
                <button
                  type="button"
                  onClick={() => setIsCalcOpen(false)}
                  className="px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold py-3 rounded-xl text-xs active:scale-95 transition-all"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
