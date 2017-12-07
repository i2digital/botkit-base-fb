const bodyParser = require('body-parser');
const express = require('express');
const request = require('request');

function createFBMessengerEndpoint(webserver, controller) {
  debug('Configured POST /facebook/receive url for receiving events');
  webserver.post('/facebook/receive', (req, res) => {
    res.status(200);
    res.send('ok');
    const bot = controller.spawn({});

    controller.handleWebhookPayload(req, res, bot);
  });

  debug('Configured GET /facebook/receive url for verification');
  webserver.get('/facebook/receive', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe') {
      if (req.query['hub.verify_token'] === controller.config.verify_token) {
        res.send(req.query['hub.challenge']);
      }
      else {
        res.send('OK');
      }
    }
  });
}

exports.server = (controller, routes) => {
  const webserver = express();
  webserver.use(bodyParser.json());
  webserver.use(bodyParser.urlencoded({ extended: true }));

  webserver.use(express.static('public'));

  webserver.listen(process.env.PORT || 3000, null, () => {
    debug(`Express webserver configured and listening at http://localhost: ${process.env.PORT} ` || 3000);
  });

  createFBMessengerEndpoint(webserver, controller);
  routes.forEach((route) => {
    route(webserver, controller);
  });

  controller.webserver = webserver;

  return webserver;
};

exports.subscribeEvents = (controller) => {
  debug('Subscribing to Facebook events...');

  const url = `https://graph.facebook.com/me/subscribed_apps?access_token=${controller.config.access_token}`;
  request.post(url, (err, res, body) => {
    if (err) {
      debug('Could not subscribe to page messages!');
      throw new Error(err);
    }
    else {
      debug('Successfully subscribed to Facebook events:', body);
      controller.startTicking();
    }
  });
};
