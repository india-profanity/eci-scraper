import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'https://gateway-voters.eci.gov.in/api/v1',
    headers: {
        'Accept': 'application/json',
    },
});


export default axiosInstance;