import axios from 'axios';

const api = axios.create({
  baseURL: 'https://waste-tracker-kiwl.onrender.com/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wt_token');
      localStorage.removeItem('wt_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
