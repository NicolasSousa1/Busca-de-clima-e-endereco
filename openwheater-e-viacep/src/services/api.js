import axios from 'axios'

  // https://viacep.com.br/ws/01001000/json/

const api = axios.create({
  baseURL: "https://viacep.com.br/ws/"
})

//exportando a api
export default api