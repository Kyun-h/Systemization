import { mockMenu, mockAuth } from './mockApi.js';

document.addEventListener('DOMContentLoaded', () => {
  // 메뉴 데이터 (이름 + 이미지 + 가격)
  const menuData = [
    {
      name: "김치찌개",
      price: 4500,
      image: "imgs/kim.jpg"
    },
    {
      name: "제육볶음",
      price: 5000,
      image: "imgs/jj.jpeg"
    },
    {
      name: "돈까스",
      price: 5500,
      image: "imgs/don.jpeg"
    },
    {
      name: "육회비빔밥",
      price: 5500,
      image: "imgs/yuk.jpeg"
    },
    {
      name: "돼지국밥",
      price: 5500,
      image: "imgs/pork.jpg"
    }
  ];

  //메뉴출력
  const menuContainer = document.getElementById('menu-container');
  menuData.forEach(item => {
    const div = document.createElement('div');
    div.className = 'menu-card';
    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}" />
      <p class="name">${item.name}</p>
      <p class="price">${item.price.toLocaleString()}원</p>
    `;
    menuContainer.appendChild(div);
  });

  //시간대정의
  const timeSlots = ["11:00~11:30", "11:30~12:00", "12:00~12:30", "12:30~13:00", "13:00~13:30"];
  const today = new Date().toISOString().split('T')[0];

  const timeSlotList = document.getElementById('time-slot-list');
  timeSlotList.innerHTML = '';

  //잔여식권
  timeSlots.forEach(time => {
    const stockInfo = mockMenu.getTodayStock(today, time);
    const totalLeft = stockInfo.reduce((sum, item) => sum + item.left, 0);
    const slotDiv = document.createElement('div');
    slotDiv.className = 'slot';
    slotDiv.innerHTML = `<strong>${time}</strong><br>잔여 식권: <span>${totalLeft}</span>개`;
    timeSlotList.appendChild(slotDiv);
  });

  const reserveButton = document.getElementById('reserve-button');
  reserveButton.addEventListener('click', () => {
    if (!mockAuth.isLoggedIn()) {
      alert("로그인이 필요합니다.");
      location.href = 'login.html';
    } else {
      location.href = 'reservation.html';
    }
  });
});
