const API =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "https://distributed-manufacturing-api.herokuapp.com";

module.exports = API;