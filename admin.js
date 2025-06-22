// admin.js

// Firebase 초기화
const firebaseConfig = {
  apiKey: "AIzaSyCRC4GkhNoz4MH3Mbxb5a38puGNu2Fox4E",
  authDomain: "systemization-dc342.firebaseapp.com",
  projectId: "systemization-dc342",
  storageBucket: "systemization-dc342.firebasestorage.app",
  messagingSenderId: "8105541836",
  appId: "1:8105541836:web:230c5c7867f3bcb62cc269"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 로그아웃
function logout() {
  firebase.auth().signOut().then(() => {
    alert("로그아웃 되었습니다.");
    location.href = "index.html";
  }).catch((error) => {
    console.error("로그아웃 오류:", error);
  });
}

// 📈 예약 현황 로딩
async function loadReservations() {
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const dailyCounts = [];
  const menuCounts = {};

  for (const day of week) {
    const snapshot = await db.collection("reservations").where("date", "==", day).get();
    dailyCounts.push(snapshot.size);

    snapshot.forEach(doc => {
      const data = doc.data();
      const menu = data.menu || "기타";
      menuCounts[menu] = (menuCounts[menu] || 0) + 1;
    });
  }

  new Chart(document.getElementById('reservationChart'), {
    type: 'line',
    data: {
      labels: week,
      datasets: [{
        label: '일별 예약 수',
        data: dailyCounts,
        borderColor: 'rgba(211,47,47,1)',
        backgroundColor: 'rgba(211,47,47,0.1)',
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });

  let html = `<h6 class="fw-bold">📆 주간 예약 통계</h6>`;
  week.forEach((d, i) => {
    html += `<div>${d}: ${dailyCounts[i]}건</div>`;
  });

  html += `<hr><h6 class="fw-bold">🍱 메뉴별 예약 수</h6>`;
  for (const [menu, count] of Object.entries(menuCounts)) {
    html += `<div>${menu}: ${count}건</div>`;
  }

  document.getElementById("reservationTable").innerHTML = html;
}

// ✅ QR 시뮬레이션
async function simulateQRScan() {
  const uid = "user123";
  await db.collection("checkins").doc(uid).set({
    time: Date.now()
  });
  loadCheckins();
}

// ✅ 입장 현황 로딩
function loadCheckins() {
  db.collection("checkins").get().then(snapshot => {
    let html = `<ul class="list-group">`;
    snapshot.forEach(doc => {
      const data = doc.data();
      html += `<li class="list-group-item">${doc.id} 입장 시간: ${new Date(data.time).toLocaleTimeString()}</li>`;
    });
    html += `</ul>`;
    document.getElementById("checkinStatus").innerHTML = html;
  });
}

// ✅ 메뉴 수량 일괄 변경
async function updateMenus() {
  const input = document.getElementById('menuBulkInput').value.trim();
  if (!input) return alert("입력값이 없습니다.");

  const today = new Date().toISOString().split('T')[0];
  const timeSlots = ["11:00~11:30", "11:30~12:00", "12:00~12:30", "12:30~13:00", "13:00~13:30"];

  // 🔍 입력값 파싱 확인용 로그
  console.log("[DEBUG] 입력값 ↓");
  console.log(input);

  const updates = input.split('\n').map(line => {
    const [name, countStr] = line.split(':');
    const parsed = {
      name: name?.trim(),
      count: parseInt(countStr?.trim())
    };
    console.log("[DEBUG] 파싱된 메뉴:", parsed);
    return parsed;
  });

  try {
    for (const time of timeSlots) {
      const docRef = db.collection("menuStocks").doc(today).collection("timeslots").doc(time);
      const doc = await docRef.get();
      const currentData = doc.exists ? doc.data() : {};

      for (const { name, count } of updates) {
        if (!name || isNaN(count)) {
          console.warn(`[SKIP] 유효하지 않은 항목: name="${name}", count="${count}"`);
          continue;
        }
        currentData[name] = count;
      }

      console.log(`[DEBUG] ${time} 업데이트 데이터:`, currentData);
      await docRef.set(currentData);
    }

    alert("메뉴 수량이 성공적으로 업데이트되었습니다.");
    loadCurrentMenus();
  } catch (err) {
    console.error("업데이트 실패:", err);
    alert("업데이트 중 오류 발생");
  }
}

// 공지사항 Firestore에 저장 기능
function sendAnnouncement() {
  const message = document.getElementById('announcementText').value.trim();
  if (!message) {
    alert('공지사항 내용을 입력하세요.');
    return;
  }

  db.collection('announcements').add({
    message: message,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert('공지사항이 발송되었습니다.');
    document.getElementById('announcementText').value = '';
  }).catch((error) => {
    console.error("공지사항 저장 실패:", error);
    alert("공지사항 저장 실패");
  });
}


// ✅ 현재 메뉴 수량 목록 표시
async function loadCurrentMenus() {
  const today = new Date().toISOString().split('T')[0];
  const timeSlot = document.getElementById('timeSlotSelect')?.value;

  if (!timeSlot) {
    document.getElementById("menuList").innerHTML = "<div class='text-muted'>시간대를 선택하면 수량이 표시됩니다.</div>";
    return;
  }

  const docRef = db.collection("menuStocks").doc(today).collection("timeslots").doc(timeSlot);
  const doc = await docRef.get();
  if (!doc.exists) {
    document.getElementById("menuList").innerHTML = `<div class='text-muted'>${timeSlot}에 등록된 수량이 없습니다.</div>`;
    return;
  }

  const data = doc.data();
  let html = '<ul class="list-group">';
  for (const [name, count] of Object.entries(data)) {
    html += `<li class="list-group-item d-flex justify-content-between align-items-center">
               ${name}<span class="badge bg-danger rounded-pill">${count}</span>
             </li>`;
  }
  html += '</ul>';
  document.getElementById("menuList").innerHTML = html;
}
document.getElementById('timeSlotSelect').addEventListener('change', () => {
  loadCurrentMenus();
});

// ✅ 오늘 예약된 메뉴 집계 및 표시
async function loadTodayReservations() {
  const todayReservationsDiv = document.getElementById('todayReservations');
  todayReservationsDiv.textContent = '로딩 중...';

  // 오늘 날짜 (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];

  try {
    // reservations 컬렉션에서 오늘(date == today) 예약만 가져오기
    const snapshot = await db.collection('reservations').where('date', '==', today).get();

    if (snapshot.empty) {
      todayReservationsDiv.textContent = '오늘 예약된 메뉴가 없습니다.';
      return;
    }

    // 메뉴별 집계
    const menuCount = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const menu = data.menu || "기타";
      menuCount[menu] = (menuCount[menu] || 0) + 1;
    });

    // HTML 출력 (부트스트랩 스타일)
    let html = '<ul class="list-group">';
    Object.entries(menuCount).forEach(([menu, count]) => {
      html += `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          ${menu}
          <span class="badge bg-danger rounded-pill">${count}개</span>
        </li>
      `;
    });
    html += '</ul>';
    todayReservationsDiv.innerHTML = html;
  } catch (err) {
    todayReservationsDiv.textContent = '오류 발생: ' + err.message;
  }
}


// 이번 주 월~일 날짜 리스트 반환 함수
function getWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0:일, 1:월, ..., 6:토
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // 이번 주 월요일
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

// ✅ 이번 주 요약/매출/추가예약 안내
async function loadWeekSummary() {
  const summaryDiv = document.getElementById('weekSummaryBox');
  summaryDiv.textContent = "분석 중...";

  // 🔥 수정: 정확한 이번 주 날짜 범위 (월~일)
  const weekDates = getWeekDates();

  // Firestore 쿼리 그대로 유지
  let reservations = [];
  for (const date of weekDates) {
    const snap = await db.collection("reservations").where("date", "==", date).get();
    snap.forEach(doc => reservations.push({ ...doc.data(), id: doc.id, date }));
  }

  // 3. 일별, 메뉴별 집계
  const dailyCounts = {}, menuCounts = {};
  weekDates.forEach(date => dailyCounts[date] = 0);
  reservations.forEach(r => {
    dailyCounts[r.date]++;
    const menu = r.menu || "기타";
    menuCounts[menu] = (menuCounts[menu] || 0) + 1;
  });

  // 4. 매출 계산 (예시: 메뉴별 가격 지정)
  const menuPrices = { "제육볶음": 5000, 
    "김치찌개": 4500,
    "돈까스" : 5500,
    "육회비빔밥" : 5500,
    "돼지국밥" : 5500 }; // 필요시 확장
  let totalSales = 0;
  const salesByMenu = {};
  for (const [menu, count] of Object.entries(menuCounts)) {
    const price = menuPrices[menu] || 0;
    salesByMenu[menu] = count * price;
    totalSales += salesByMenu[menu];
  }

  // 5. 최대 예약일, 분석 메시지 생성
  let maxDay = '';
  let maxCount = 0;
  for (const [date, count] of Object.entries(dailyCounts)) {
    if (count > maxCount) { maxDay = date; maxCount = count; }
  }

  // 6. 설명문 자동 생성 (if문)
  let summaryMsg = '';
  if (reservations.length === 0) {
    summaryMsg = `이번 주에는 예약이 없습니다. 예약을 유도하는 홍보가 필요합니다.`;
  } else {
    summaryMsg += `이번 주 예약: <b>${reservations.length}건</b><br>`;
    summaryMsg += `가장 예약이 많은 날: <b>${maxDay.replace(/-/g, '.')}</b> (${maxCount}건)<br>`;
    summaryMsg += `메뉴별 매출:<br>`;
    for (const [menu, sales] of Object.entries(salesByMenu)) {
      summaryMsg += `&nbsp;• ${menu}: ${sales.toLocaleString()}원<br>`;
    }
    summaryMsg += `<b>총 매출: ${totalSales.toLocaleString()}원</b><br>`;

    // 안내 메시지
    if (maxCount >= 5) summaryMsg += `<span class="text-danger">특정 요일에 예약이 집중되어 있습니다. 해당 시간대 추가예약을 고려해보세요.</span><br>`;
    if (Object.values(menuCounts).some(v => v === 0)) summaryMsg += `<span class="text-warning">예약이 없는 메뉴는 재고를 줄이거나, 새로운 메뉴를 시도해보세요.</span><br>`;
    if (reservations.length <= 3) summaryMsg += `<span class="text-info">전체 예약 수가 적으니 홍보/프로모션을 강화해보세요.</span><br>`;
  }

  summaryDiv.innerHTML = summaryMsg;

  
  // ⬇️ AI 프롬프트 생성 및 콘솔 출력
  const aiPrompt = makeAIPrompt({weekDates, dailyCounts, menuCounts, salesByMenu, reservations, totalSales, maxDay, maxCount});
  console.log("[AI 프롬프트 예시]\n" + aiPrompt);
  document.getElementById('aiPromptArea').value = aiPrompt;

}

function makeAIPrompt({weekDates, dailyCounts, menuCounts, salesByMenu, reservations, totalSales, maxDay, maxCount}) {
  let aiPrompt = `다음은 이번 주 식당 예약 및 매출 데이터입니다.\n`;

  aiPrompt += `기간: ${weekDates[0]} ~ ${weekDates[6]}\n\n`;

  aiPrompt += `일별 예약 건수:\n`;
  weekDates.forEach(date => {
    aiPrompt += `- ${date}: ${dailyCounts[date]}건\n`;
  });

  aiPrompt += `\n메뉴별 예약 및 매출:\n`;
  Object.entries(menuCounts).forEach(([menu, count]) => {
    aiPrompt += `- ${menu}: ${count}건 (매출: ${salesByMenu[menu]?.toLocaleString() || 0}원)\n`;
  });

  aiPrompt += `\n총 예약: ${reservations.length}건\n`;
  aiPrompt += `총 매출: ${totalSales.toLocaleString()}원\n`;

  if (maxDay && maxCount > 0)
    aiPrompt += `가장 예약이 많은 날: ${maxDay} (${maxCount}건)\n`;

  // 트렌드 및 안내 (간단 if문)
  if (maxCount >= 5) aiPrompt += `특정 요일에 예약이 집중되어 있습니다. 초과예약이나 추가 좌석을 검토하세요.\n`;
  if (reservations.length <= 3) aiPrompt += `예약 수가 적으니 홍보나 프로모션을 고려해보세요.\n`;
  if (Object.values(menuCounts).some(v => v === 0)) aiPrompt += `예약이 없는 메뉴도 있습니다. 재고 관리에 주의하세요.\n`;

  return aiPrompt;
}

function copyAIPrompt() {
  const area = document.getElementById('aiPromptArea');
  navigator.clipboard.writeText(area.value)
    .then(() => alert('AI 프롬프트가 복사되었습니다!'))
    .catch(() => alert('복사에 실패했습니다.'));
}


// 예약 시간대별 종료시각(문자열 → 종료 시:분)
const timeSlotEnd = {
  "11:00~11:30": "11:30",
  "11:30~12:00": "12:00",
  "12:00~12:30": "12:30",
  "12:30~13:00": "13:00",
  "13:00~13:30": "13:30"
};

async function markNoShow() {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  const snapshot = await db.collection("reservations")
    .where("date", "==", today)
    .get();

  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.used) continue; // 이미 사용한 예약은 패스
    if (data.noShow) continue; // 이미 노쇼 처리된 것도 패스

    const endTimeStr = timeSlotEnd[data.timeSlot];
    if (!endTimeStr) continue;

    // 종료시각 객체 생성(예: today + "T12:00:00+09:00")
    const endDateTime = new Date(`${today}T${endTimeStr}:00+09:00`);
    // 30분 유예 후 시각
    const limitDateTime = new Date(endDateTime.getTime() + 30 * 60000);

    if (now > limitDateTime) {
      await db.collection("reservations").doc(doc.id).update({ noShow: true });
      count++;
    }
  }
  alert(`노쇼 처리 완료: ${count}건`);
}

// 🔄 기존 초기 로딩 부분에 loadTodayReservations 추가!
document.addEventListener("DOMContentLoaded", () => {
  loadReservations();
  loadCheckins();
  loadCurrentMenus();
  loadTodayReservations();  // <-- 추가!
  loadWeekSummary(); // ✅ 추가!
});
