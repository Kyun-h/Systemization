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

  const updates = input.split('\n').map(line => {
    const [name, countStr] = line.split(':');
    return { name: name.trim(), count: parseInt(countStr.trim()) };
  });

  try {
    for (const time of timeSlots) {
      const docRef = db.collection("menuStocks").doc(today).collection("timeslots").doc(time);
      const doc = await docRef.get();
      const currentData = doc.exists ? doc.data() : {};

      for (const { name, count } of updates) {
        currentData[name] = count;
      }

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
  const timeSlots = ["11:00~11:30", "11:30~12:00", "12:00~12:30", "12:30~13:00", "13:00~13:30"];
  const aggregate = {};

  for (const time of timeSlots) {
    const docRef = db.collection("menuStocks").doc(today).collection("timeslots").doc(time);
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data();
      for (const [name, count] of Object.entries(data)) {
        aggregate[name] = (aggregate[name] || 0) + parseInt(count || 0);
      }
    }
  }

  let html = '<ul class="list-group">';
  for (const [name, total] of Object.entries(aggregate)) {
    html += `<li class="list-group-item d-flex justify-content-between align-items-center">
               ${name}<span class="badge bg-danger rounded-pill">${total}</span>
             </li>`;
  }
  html += '</ul>';
  document.getElementById("menuList").innerHTML = html;
}

// 🔄 초기 로딩
document.addEventListener("DOMContentLoaded", () => {
  loadReservations();
  loadCheckins();
  loadCurrentMenus();
});