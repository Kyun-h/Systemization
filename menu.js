// import { mockMenu, mockAuth } from './mockApi.js';  // ← 이 줄 삭제 또는 주석

document.addEventListener('DOMContentLoaded', () => {
  // 메뉴 데이터 (이름 + 이미지 + 가격)
  const menuData = [
    { name: "김치찌개", price: 4500, image: "imgs/kim.jpg" },
    { name: "제육볶음", price: 4500, image: "imgs/jj.jpeg" },
    { name: "된장찌개", price: 4000, image: "imgs/dw.webp" },
    { name: "육회비빔밥", price: 5500, image: "imgs/yuk.jpeg" },
    { name: "돼지국밥", price: 5500, image: "imgs/pork.jpg" }
  ];

  // 메뉴출력
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

  // 시간대정의
  const timeSlots = ["11:00~11:30", "11:30~12:00", "12:00~12:30", "12:30~13:00", "13:00~13:30"];
  const today = new Date().toISOString().split('T')[0];

  const timeSlotList = document.getElementById('time-slot-list');
  timeSlotList.innerHTML = '';

  // 🔥 Firebase Firestore 연동: 시간대별 잔여 식권 표시
  // Firebase SDK (compat) 방식
  const db = firebase.firestore();

  // 모든 시간대 데이터를 병렬로 읽어옴
  Promise.all(
    timeSlots.map(async time => {
      const docRef = db.collection('menuStocks').doc(today).collection('timeslots').doc(time);
      const doc = await docRef.get();
      let totalLeft = 0;
      if (doc.exists) {
        const data = doc.data();
        // 메뉴별 남은 식권 합산
        totalLeft = Object.values(data).reduce((sum, v) => sum + (parseInt(v) || 0), 0);
      }
      // DOM 생성
      const slotDiv = document.createElement('div');
      slotDiv.className = 'slot';
      slotDiv.innerHTML = `<strong>${time}</strong><br>잔여 식권: <span>${totalLeft}</span>개`;
      return slotDiv;
    })
  ).then(slotDivs => {
    slotDivs.forEach(div => timeSlotList.appendChild(div));
  });

  // 예약 버튼 처리 (mockAuth → Firebase auth 사용)
  const reserveButton = document.getElementById('reserve-button');
  reserveButton.addEventListener('click', () => {
    const user = firebase.auth().currentUser;
    if (!user) {
      alert("로그인이 필요합니다.");
      location.href = 'login.html';
    } else {
      location.href = 'reservation.html';
    }
  });
});
