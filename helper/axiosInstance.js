import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'https://gateway-voters.eci.gov.in/api/v1'
});


export default axiosInstance;