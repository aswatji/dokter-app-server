# 📱 React Native APK Configuration Guide

## 🎯 **Untuk APK yang sudah di-build dengan Expo CLI**

Server sudah dikonfigurasi untuk mendukung real device dengan IP: **192.168.8.194**

### **1. Pastikan React Native menggunakan IP yang benar:**

```javascript
// config/api.js
const BASE_URL = "http://192.168.8.194:4000/api";

export default BASE_URL;
```

### **2. Example API Service untuk APK:**

```javascript
// services/ApiService.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.8.194:4000/api";

class ApiService {
  async login(email, password) {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Save token
        await AsyncStorage.setItem("auth_token", data.data.token);
        await AsyncStorage.setItem("user_data", JSON.stringify(data.data.user));
      }

      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async getProfile() {
    try {
      const token = await AsyncStorage.getItem("auth_token");

      const response = await fetch(`${BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      return await response.json();
    } catch (error) {
      console.error("Profile error:", error);
      throw error;
    }
  }

  async createConsultation(consultationData) {
    try {
      const token = await AsyncStorage.getItem("auth_token");

      const response = await fetch(`${BASE_URL}/consultations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(consultationData),
      });

      return await response.json();
    } catch (error) {
      console.error("Consultation error:", error);
      throw error;
    }
  }
}

export default new ApiService();
```

### **3. Testing di APK:**

1. **Install APK** di real device
2. **Pastikan device dan laptop di WiFi yang sama**
3. **Test login** dengan akun yang sudah ada:
   - Email: `admin@dokterapp.com`
   - Password: `password123`

### **4. Available API Endpoints:**

```
Base URL: http://192.168.8.194:4000/api

Authentication:
POST /auth/login
POST /auth/register
GET  /auth/profile
PUT  /auth/profile

Users:
GET  /users
POST /users
GET  /users/:id
PUT  /users/:id

Consultations:
GET  /consultations
POST /consultations
GET  /consultations/:id
GET  /consultations/doctors/available

Messages:
POST /messages
GET  /messages/consultation/:consultationId
GET  /messages/unread/count

Payments:
POST /payments
GET  /payments/history
GET  /payments/:id/status

File Upload:
POST /upload
```

### **5. Test Accounts:**

```javascript
// Admin
{
  "email": "admin@dokterapp.com",
  "password": "password123"
}

// Doctor
{
  "email": "dr.ahmad@dokterapp.com",
  "password": "password123"
}

// Patient
{
  "email": "pasien1@email.com",
  "password": "password123"
}
```

### **6. Troubleshooting:**

**Problem: "Network request failed"**

- Pastikan laptop dan device di WiFi yang sama
- Pastikan server running di `http://192.168.8.194:4000`
- Test browser HP: buka `http://192.168.8.194:4000/api/health`

**Problem: "CORS error"**

- Server sudah dikonfigurasi untuk allow semua origin di development
- Restart server jika perlu

**Problem: "Token expired"**

- Login ulang untuk mendapat token baru
- Token berlaku 7 hari

### **7. Production Deployment:**

Untuk production, ganti dengan domain/VPS:

```javascript
const BASE_URL = "https://your-domain.com/api";
```

## ✅ **Current Status:**

- ✅ Server running di `http://192.168.8.194:4000`
- ✅ CORS configured untuk real device
- ✅ API endpoints ready
- ✅ Database seeded dengan test accounts
- ✅ Socket.IO enabled untuk real-time chat
- ✅ File upload support
- ✅ Authentication & authorization working

**Server logs:**

```
🚀 Server berhasil running di port 4000
💻 Laptop: http://localhost:4000/api/health
📱 Real Device: http://192.168.8.194:4000/api/health
🏥 Doctor Consultation API: http://192.168.8.194:4000
⚡ Socket.IO: Enabled
🌐 Network IP: 192.168.8.194
```
