// mockApi.js

export const mockAuth = {
  login(email, password) {
    if (email === "test@example.com" && password === "password123") {
      localStorage.setItem('token', 'mock_token');
      return { success: true, token: 'mock_token' };
    }
    return { success: false };
  },
  logout() {
    localStorage.removeItem('token');
  },
  isLoggedIn() {
    return !!localStorage.getItem('token');
  }
};

export const mockReservation = {
  save(reservation) {
    const key = `${reservation.date}__${reservation.time}__${reservation.menu}`;
    const count = Number(localStorage.getItem(key) || 0);
    localStorage.setItem(key, count + 1);
    localStorage.setItem('reservation', JSON.stringify(reservation));
  },
  cancel(reservation) {
    const key = `${reservation.date}__${reservation.time}__${reservation.menu}`;
    const count = Number(localStorage.getItem(key) || 0);
    if (count > 0) localStorage.setItem(key, count - 1);
    localStorage.removeItem('reservation');
  },
  get() {
    return JSON.parse(localStorage.getItem('reservation'));
  }
};

export const mockMenu = {
  getTodayStock(date, slot) {
    const defaultStock = 20;
    const menus = ['제육볶음', '된장찌개', '김치찌개'];
    return menus.map(menu => {
      const key = `${date}__${slot}__${menu}`;
      const used = Number(localStorage.getItem(key)) || 0;
      return { menu, left: defaultStock - used };
    });
  }
};
