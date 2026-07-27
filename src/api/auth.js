import axios from "axios";

export default axios.create({
    baseURL: "http://192.169.1.5:5000/api",
    timeout: 15000,
});