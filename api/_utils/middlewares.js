const fetch = require("node-fetch").default;
var jwtDecode = require("jwt-decode");

let authorization;

export const allowMethods = methods => handler => (req, res) => {
  const { method } = req;

  if (methods.includes(method)) {
    handler(req, res);
  } else {
    res.setHeader("Allow", methods);
    res.status(405).json(`Method ${method} Not Allowed`);
  }
};

export const allowPostMethod = allowMethods(["POST"]);

export const wrapAsync = handler => (req, res) => {
  handler(req, res).catch(error => {
    console.log(error);
    res.status(500).json({ message: "Unexpected error" });
  });
};

export const authorize = handler => async (req, res) => {
  if (authorization && jwtDecode(authorization.access_token).exp < Date.now()) {
    handler(authorization, req, res);
  } else {
    const response = await fetch("https://distributed-manufacturing.eu.auth0.com/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        audience: "https://api.distributed-manufacturing.com",
        grant_type: "client_credentials"
      })
    });

    authorization = await response.json();

    handler(authorization, req, res);
  }
};
