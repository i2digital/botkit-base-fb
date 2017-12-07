const Botkit = require('botkit');
const env = require('node-env-file');
const mongoStorage = require('botkit-storage-mongo');
const path = require('path');
const debug = require('debug')('botkit:webserver');

exports.init = (storageCollections, routes, skills, threadSettings) => {
  const projectRootFolder = path.join(__dirname, '..', '..');

  if (!process.env.HEROKU_ENV) {
    env(`${projectRootFolder}/.env`);
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('Error: Need MongoDB');
  }

  const controller = Botkit.facebookbot({
    debug: true,
    storage: mongoStorage({
      mongoUri: process.env.MONGODB_URI,
      tables: storageCollections,
    }),
    access_token: process.env.FB_PAGE_TOKEN,
    verify_token: process.env.FB_VERIFY_TOKEN,
    bot_type: 'facebook',
    receive_via_postback: true,
  });

  this.server(controller, routes);
  this.subscribeEvents(controller);
  this.dashbotInit(controller);

  function chooseSkill(bot, message) {
    skills.forEach((skill) => {
      if (typeof skill.condition !== 'function') {
        throw new Error('Error: There is a Skill not implementing condition() method');
      }
      if (typeof skill.run !== 'function') {
        throw new Error('Error: There is a Skill not implementing run() method');
      }
      const params = {
        controller,
        bot,
        message,
      };

      const skillCondition = skill.condition(params);

      if (
        typeof skillCondition === 'object'
        && skillCondition.constructor.name === 'Promise'
      ) {
        skillCondition.then((result) => {
          if (result === true) {
            skill.run(params);
          }
        });
      }
      else if (skillCondition === true) {
        skill.run(params);
      }
    });
  }

  controller.on(['facebook_referral'], (bot, message) => {
    chooseSkill(bot, message);
  });

  controller.on(['message_received'], (bot, message) => {
    chooseSkill(bot, message);
  });

  if (threadSettings) {
    threadSettings(controller);
  }

  return controller;
};

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

const dashbot = require('dashbot');

exports.dashbotInit = (controller) => {
  if (process.env.DASHBOT_API_KEY) {
    try {
      const dashbotInstance = dashbot(process.env.DASHBOT_API_KEY);

      controller.middleware.receive.use(dashbotInstance.facebook.receive);
      controller.middleware.send.use(dashbotInstance.facebook.send);
    }
    catch (e) {
      debug.error('Dashbot API KEY was set, but module "dashbot" is not available');
      process.exit(e.code);
    }
  }
};
