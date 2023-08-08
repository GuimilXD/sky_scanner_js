import axios from "axios"

export default class APIAdapter {
    constructor() {
        this.hostname = "partners.api.skyscanner.net"
        this.apiKey = "sh428739766321522266746152871799" // this is the public testing api key
        this.apiVersion = "v3"
    }

    getBaseURL() {
        return `https://${this.hostname}/apiservices/${this.apiVersion}`
    }

    getPathURL(path) {
        return `${this.getBaseURL()}/${path}`
    }

    makeRequest(method, path, payload) {
        return axios({
            url: this.getPathURL(path),
            headers: {
                "x-api-key": this.apiKey,
                "Content-Type": "application/json",
            },
            method,
            data: payload,
        })
    }
}
