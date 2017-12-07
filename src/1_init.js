const Botkit = require('botkit');
const env = require('node-env-file');
const mongoStorage = require('botkit-storage-mongo');
const path = require('path');
const debug = require('debug')('botkit:webserver');

exports.init = (storageCollections, routes, skills, threadSettings) => {
  const projectRootFolder = path.join(__dirname, '..', '..');

  if (!process.env.HOSTING_ENV) {
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
