// React Native API Configuration untuk APK
// Copy kode ini ke React Native project Anda

const API_CONFIG = {
  // Development (Expo Dev)
  DEVELOPMENT_URL: "http://192.168.8.194:4000/api",

  // Production APK (Real Device)
  PRODUCTION_URL: "http://192.168.8.194:4000/api",

  // Fallback untuk testing
  LOCALHOST_URL: "http://localhost:4000/api",
};

// Auto-detect environment
const getApiUrl = () => {
  // Untuk APK build, gunakan IP address
  if (__DEV__ === false) {
    return API_CONFIG.PRODUCTION_URL;
  }

  // Untuk development
  return API_CONFIG.DEVELOPMENT_URL;
};

// Export configuration
export const BASE_URL = getApiUrl();

console.log("🌐 API Base URL:", BASE_URL);

// Usage example dalam React Native:
/*
// services/api.js
import { BASE_URL } from '../config/api';

class ApiService {
  constructor() {
    this.baseURL = BASE_URL;
  }

  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async getProfile(token) {
    try {
      const response = await fetch(`${this.baseURL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
}

export default new ApiService();
*/
