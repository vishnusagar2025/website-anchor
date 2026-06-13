import axios from 'axios'

const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || '/api'
})

export const analyzePipeline = (data) => api.post('/pipeline/analyze', data).then(r => r.data)
export const predictPush = (data) => api.post('/predictor/predict', data).then(r => r.data)
export const analyzeLogs = (data) => api.post('/logs/analyze', data).then(r => r.data)
