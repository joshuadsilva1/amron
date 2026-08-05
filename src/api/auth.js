import axios from "axios";

export default axios.create({
    baseURL: "https://amron-api.onrender.com/api",
    timeout: 15000,
});