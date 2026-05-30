import React, { useState, useEffect } from 'react';

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
export default function ManieIcon({ pose = 'welcome', className = '', style = {}, group = 'auto' }) {
  const [avatarGroup, setAvatarGroup] = useState(() => {
    if (group === 'auto' || group === 'random') {
      const cached = localStorage.getItem('manie_avatar_group') || 'random';
      if (cached === 'random') {
        return Math.random() > 0.5 ? 'classic' : 'figurine';
      }
      return cached;
    }
    return group;
  });

  useEffect(() => {
    if (group === 'auto' || group === 'random') {
      const handleGroupChanged = () => {
        const cached = localStorage.getItem('manie_avatar_group') || 'random';
        if (cached === 'random') {
          setAvatarGroup(Math.random() > 0.5 ? 'classic' : 'figurine');
        } else {
          setAvatarGroup(cached);
        }
      };
      window.addEventListener('manie_group_changed', handleGroupChanged);
      handleGroupChanged(); // 確保首次渲染與事件觸發時更新狀態
      return () => window.removeEventListener('manie_group_changed', handleGroupChanged);
    } else {
      setAvatarGroup(group);
    }
  }, [group]);

  const classicImages = {
    welcome: '/manie/1.png',
    idle: '/manie/2.png',
    sleep: '/manie/5.png',
    thinking: '/manie/10.png',
    shocked: '/manie/11.png',
    
    // 補齊特定情境別名，防止 fallback 錯亂
    gold: '/manie/3.png',
    tablet: '/manie/10.png',
    
    // 情境語意化命名
    cheer: '/manie/3.png',
    gift: '/manie/4.png',
    smile: '/manie/6.png',
    sweat: '/manie/7.png',
    fun: '/manie/8.png',
    great: '/manie/9.png',
    
    // 支援直接使用數字編號
    1: '/manie/1.png',
    2: '/manie/2.png',
    3: '/manie/3.png',
    4: '/manie/4.png',
    5: '/manie/5.png',
    6: '/manie/6.png',
    7: '/manie/7.png',
    8: '/manie/8.png',
    9: '/manie/9.png',
    10: '/manie/10.png',
    11: '/manie/11.png'
  };

  // 3D 公仔立體款 (figurine) 路徑對照
  const figurineImages = {
    welcome: '/manie/figurine/1.png',
    idle: '/manie/figurine/2.png',
    sleep: '/manie/figurine/5.png',
    thinking: '/manie/figurine/2.png', // Fallback to idle
    shocked: '/manie/figurine/5.png',  // Fallback to sleep
    
    // 補齊特定情境別名，防止 fallback 錯亂
    gold: '/manie/figurine/3.png',
    tablet: '/manie/figurine/2.png',
    
    cheer: '/manie/figurine/3.png',
    gift: '/manie/figurine/4.png',
    smile: '/manie/figurine/6.png',
    sweat: '/manie/figurine/7.png',
    fun: '/manie/figurine/8.png',
    great: '/manie/figurine/9.png',
    
    1: '/manie/figurine/1.png',
    2: '/manie/figurine/2.png',
    3: '/manie/figurine/3.png',
    4: '/manie/figurine/4.png',
    5: '/manie/figurine/5.png',
    6: '/manie/figurine/6.png',
    7: '/manie/figurine/7.png',
    8: '/manie/figurine/8.png',
    9: '/manie/figurine/9.png',
    10: '/manie/figurine/2.png',
    11: '/manie/figurine/5.png'
  };

  const selectedImages = avatarGroup === 'figurine' ? figurineImages : classicImages;
  const imgSrc = selectedImages[pose] || selectedImages.welcome;

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

