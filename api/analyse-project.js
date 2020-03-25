const fetch = require("node-fetch").default;

const { allowPostMethod, wrapAsync, authorize } = require("./_utils/middlewares");
const API = require('./_utils/api');

async function handler({ token_type, access_token }, req, res) {
  const response = await fetch(`${API}laser/analyse-project`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: `${token_type} ${access_token}`
    },
    body: JSON.stringify(req.body)
  });

  const responseJson = await response.json();

  res.status(response.status).json(responseJson);
}

export default allowPostMethod(wrapAsync(authorize(handler)));
