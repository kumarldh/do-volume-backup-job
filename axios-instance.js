const axios = require('axios');

const axiosInstance = axios.create();

axiosInstance.interceptors.request.use((config) => {
  const token = process.env.DO_TOKEN;
  config.headers.Authorization = token ? `Bearer ${token}` : '';
  return config;
});

axiosInstance.interceptors.response.use((config) => {
  const token = process.env.DO_TOKEN;
  config.headers.Authorization = token ? `Bearer ${token}` : '';
  return config;
});

module.exports = axiosInstance;
