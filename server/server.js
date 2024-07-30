const express = require("express");
const app = express();
const bodyparser = require("body-parser");
const axios = require("axios");
const mysql = require("mysql2/promise");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT;

app.use(cors());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());


// // ! database connection
// const connection = mysql.createConnection({
//   host: process.env.HOST,
//   user: process.env.USER,
//   password: process.env.PASSWORD,
//   database: process.env.DATABASE,
// });


// ! get token middleware
const generateToken = async (req, res, next) => {
  const consumer_key = process.env.CONSUMER_KEY;
  const consumer_secret = process.env.CONSUMER_SECRET;
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

// ! payment route
app.post("/api/stk", generateToken, async (req, res) => {
  const { Amount } = req.body;
  console.log(req.body);
  const phone = req.body.PhoneNumber.substring(1);
  const date = new Date();
  const timestamp =
    date.getFullYear() +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    ("0" + date.getDate()).slice(-2) +
    ("0" + date.getHours()).slice(-2) +
    ("0" + date.getMinutes()).slice(-2) +
    ("0" + date.getSeconds()).slice(-2);

  const shortcode = process.env.SHORT_CODE;
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
        TransactionType: "CustomerPayBillOnline",
        Amount: Amount,
        PartyA: `254${phone}`,
        PartyB: shortcode,
        PhoneNumber: `254${phone}`,
        CallBackURL: process.env.CALLBACK,
        AccountReference: "CICCoverMe",
        TransactionDesc: "CICCoverMe",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    .then((data) => {
      //   console.log(data);
      return res.status(200).json(data.data);
    })
    .catch((err) => {
      console.log(err);
      return res.status(400).json(err.message);
    });
});

// ! callbackk
app.post("/api/callback", (req, res) => {
  const data = req.body;
  console.log(data);

  // wrong pin error and wrong input
  if (data.Body.stkCallback.ResultCode === 2001) {
    console.log(data.Body.stkCallback.ResultDesc);
    const errorMessage = data.Body.stkCallback.ResultDesc;
    return res
      .status(400)
      .json({ message: errorMessage + " You entered the wrong pin" });
  }
  //   request cancelled by user
  if (data.Body.stkCallback.ResultCode === 1032) {
    console.log(data.Body.stkCallback.ResultDesc);
    const errorMessage = data.Body.stkCallback.ResultDesc;
    return res
      .status(400)
      .json({ message: errorMessage + " You cancelled the request" });
  }

  //
  if (!data.Body.stkCallback.CallbackMetadata) {
    console.log(data.Body);
    // todo user has insufficeint balance
  }
  //   successful payment
  console.log(data.Body.stkCallback.CallbackMetadata);
  const transactionData = data.Body.stkCallback.CallbackMetadata;
  const Amount = transactionData.Item[0].Value;
  const receipt = transactionData.Item[1].Value;
  const date = transactionData.Item[3].Value;
  const phone_number = transactionData.Item[4].Value;
  console.log(receipt, Amount, date, phone_number);
  // connection.query(
  //   "INSERT INTO Transactions (transaction_receipt, transaction_amount, transaction_date, transaction_phone_number) VALUES (?, ?, ?, ?)",
  //   [receipt, Amount, date, phone_number],
  //   (err, result, fields) => {
  //     if (err) {
  //       console.warn(err);
  //       return res.json("Failed to write to db");
  //     }
  //     console.log(result);
  //   }
  // );
});

// ! server connection
app.listen(port, () => {
  
  console.log(`Server is running on port ${port}`);
});
