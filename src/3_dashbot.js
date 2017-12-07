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
