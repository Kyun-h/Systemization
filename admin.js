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

// 🔄 기존 초기 로딩 부분에 loadTodayReservations 추가!
document.addEventListener("DOMContentLoaded", () => {
  loadReservations();
  loadCheckins();
  loadCurrentMenus();
  loadTodayReservations();  // <-- 추가!
});
