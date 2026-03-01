import express from "express";
import { Cashfree, CFEnvironment } from "cashfree-pg";

const router = express.Router();

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = CFEnvironment.SANDBOX;

router.post("/create-order", async (req, res) => {

  try {

    const orderId = "order_" + Date.now();

    const request = {

      order_id: orderId,

      order_amount: 10,

      order_currency: "INR",

      customer_details: {

        customer_id: "user_" + Date.now(),

        customer_phone: "9999999999"

      }

    };

    const response = await Cashfree.PGCreateOrder(request);

    res.json(response.data);

  }

  catch (error) {

    console.log(error);

    res.status(500).json({

      error: error.message

    });

  }

});

export default router;