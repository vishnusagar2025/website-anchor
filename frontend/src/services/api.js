import axios from 'axios'

// VITE_API_URL should be your backend URL (e.g. https://your-backend.railway.app)
// No trailing slash. Falls back to localhost for local dev.
const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
})

export const analyzePipeline = (data) => api.post('/api/pipeline/analyze', data).then(r => r.data)
export const predictPush = (data) => api.post('/api/predictor/predict', data).then(r => r.data)
export const analyzeLogs = (data) => api.post('/api/logs/analyze', data).then(r => r.data)
