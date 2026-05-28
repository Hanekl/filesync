export const getApiUrl = () => {
  const ip = localStorage.getItem('server_ip') || '127.0.0.1'
  return `http://${ip}:8000`
}

export const getWsUrl = () => {
  const ip = localStorage.getItem('server_ip') || '127.0.0.1'
  return `ws://${ip}:8000`
}