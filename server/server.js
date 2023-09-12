const express = require("express");
const app = express();
const bodyparser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

app.use(cors());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());

// get token middleware
const generateToken = async (req, res, next) => {
  const consumer_key = process.env.CONSUMER_KEY;
  const consumer_secret = process.env.CONSUMER_SECRET;
  // const auth = new Buffer.from(`${consumer_key}:${consumer_secret}`).toString(
  //   "base64"
  // );
  const auth = btoa(`${consumer_key}:${consumer_secret}`);

  await axios
    .get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          authorization: `Basic ${auth}`,
        },
      }
    )
    .then((data) => {
      //   console.log(data.data.access_token);
      token = data.data.access_token;
      next();
    })
    .catch((error) => {
      console.log(error);
    });
};
// payment
app.post("/api/stk", generateToken, async (req, res) => {
  const { amount } = req.body;
  const phone = req.body.phone.substring(1);
  const date = new Date();
  const timestamp =
    date.getFullYear() +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    ("0" + date.getDate()).slice(-2) +
    ("0" + date.getHours()).slice(-2) +
    ("0" + date.getMinutes()).slice(-2) +
    ("0" + date.getSeconds()).slice(-2);

  const shortcode = process.env.TILL_NUMBER;
  const passkey = process.env.PASS_KEY;
  const password = new Buffer.from(shortcode + passkey + timestamp).toString(
    "base64"
  );

  await axios
    .post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerBuyGoodsOnline",
        Amount: amount,
        PartyA: `254${phone}`,
        PartyB: shortcode,
        PhoneNumber: `254${phone}`,
        CallBackURL: "https://mydomain.com/path",
        AccountReference: "test",
        TransactionDesc: "test",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    .then((data) => {
      console.log(data);
      return res.status(200).json(data);
    })
    .catch((err) => {
      console.log(err);
      return res.status(400).json(err.message);
    });
});

app.listen(6000, () => {
  console.log("app listening on port 6000");
});
