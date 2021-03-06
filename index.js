"use strict";

// Imports dependencies and set up http server
const express = require("express"),
  bodyParser = require("body-parser"),
  app = express().use(bodyParser.json()); // creates express http server

const request = require("request");

const PAGE_ACCESS_TOKEN =
  "EAAgxHOWBhTMBAJ7eyq04kwze8PmySxcdwXKo6L6Yp5kmZAaT8Cz0Q760MeCk8zZCEbCotGyZCZCLakZAnzHeVYt3Ret73ZB1S7H9gZCPZBlR8HQ4XLtCKL8KAk7jkrOaftif0IuZB32EuAklhPb3C9VuzFi37HYJExMZAaud2fPrZBnm0mna4uFnf7yZAnlWCAGEJhsZD";
//http://facebook.com/Test-chatbot-435764730302442
//generate PAGE_ACCESS_TOKEN from the facebook app page

// Sets server port and logs message on success
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`webhook is listening, port:${port}`));

// Creates the endpoint for our webhook
app.post("/webhook", (req, res) => {
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === "page") {
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {
      // Gets the message. entry.messaging is an array, but
      // will only ever contain one message, so we get index 0
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);

      let sender_psid = webhook_event.sender.id;
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send("EVENT_RECEIVED");
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Adds support for GET requests to our webhook
app.get("/webhook", (req, res) => {
  console.log("GET /webhook");
  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = "test-chatbot";

  // Parse the query params
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  } else res.status(200).send("use ?hub.mode=subscribe&....");
});

app.get("/", (req, res) => res.status(200).send("goto /webhook"));

//-----------chatbot functions

// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;

  // Check if the message contains text
  if (received_message.text == "empty") {
    /*don't reply with anything */
  } else if (received_message.text == "test") {
    response = {
      text: "Here is a quick reply!",
      quick_replies: [
        {
          content_type: "text",
          title: "Search",
          payload: "<POSTBACK_PAYLOAD>",
          image_url: "https://image.flaticon.com/icons/png/128/281/281764.png"
        },
        { content_type: "location" },
        { content_type: "user_phone_number" },
        { content_type: "user_email" }
      ]
    };
  } else if (received_message.text == "seen") {
    response = {
      sender_action: "mark_seen"
    };
  } else if (received_message.text) {
    // Create the payload for a basic text message
    response = {
      text: `You sent the message: "${
        received_message.text
      }". Now send me an image!`
    };
  } else if (received_message.attachments) {
    // Get the URL of the message attachment
    let attachment_url = received_message.attachments[0].payload.url;
    response = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: "Is this the right picture?",
              subtitle: "Tap a button to answer.",
              image_url: attachment_url,
              buttons: [
                {
                  type: "postback",
                  title: "Yes!",
                  payload: "yes"
                },
                {
                  type: "postback",
                  title: "No!",
                  payload: "no"
                }
              ]
            }
          ]
        }
      }
    };
  }

  // Sends the response message
  callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  let response;

  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === "yes") {
    response = { text: "Thanks!" };
  } else if (payload === "no") {
    response = { text: "Oops, try sending another image." };
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    recipient: {
      id: sender_psid
    },
    message: response
  };

  // Send the HTTP request to the Messenger Platform
  console.log("msg: ", request_body);
  request(
    {
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: request_body
    },
    (err, res, body) => {
      if (!err) {
        console.log("message sent!");
      } else {
        console.error("Unable to send message:" + err);
      }
    }
  );
}
