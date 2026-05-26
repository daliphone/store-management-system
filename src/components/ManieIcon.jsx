import React from 'react';

/**
 * manie 智慧助手圖示元件 (使用切好的 PNG 吉祥物)
 * 
 * 姿勢 (pose) 與 PNG 對照：
 * - welcome: 雙手比讚 (登入指引、首頁叫醒) -> 1.png
 * - idle: 精神抖擻叉腰 (首頁頂部歡迎區) -> 2.png
 * - sleep: 趴桌睡覺流口水 (首頁叫醒互動前) -> 5.png
 * - thinking: 托腮思考問號 (設定頁面思考) -> 10.png
 * - shocked: 嚇呆石化黑白 (任務扣分警示或錯誤) -> 11.png
 */
export default function ManieIcon({ pose = 'welcome', className = '', style = {} }) {
  const images = {
    welcome: '/manie/1.png',
    idle: '/manie/2.png',
    sleep: '/manie/5.png',
    thinking: '/manie/10.png',
    shocked: '/manie/11.png',
  };

  const imgSrc = images[pose] || images.welcome;

  return (
    <img
      src={imgSrc}
      alt={`manie ${pose}`}
      className={`inline-block select-none pointer-events-none transition-all duration-300 ${className}`}
      style={{
        aspectRatio: '1 / 1', // PNG 圖為正方形比例
        objectFit: 'contain',
        mixBlendMode: 'multiply', // 自動濾除白底，達成透明去背效果
        ...style
      }}
    />
  );
}
