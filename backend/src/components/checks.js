const axios = require('axios');
const config = require('config');
const log = require('npmlog');

const utils = require('./utils');

const checks = {
  getWebAdeOauth2Status: async (webadeEnv = 'INT') => {
    const result = {
      authenticated: false,
      authorized: false,
      endpoint: config.get(`serviceClient.getok${utils.toPascalCase(webadeEnv)}.endpoint`),
      healthCheck: false,
      name: `WebADE API (${webadeEnv})`
    };

    try {
      const username = config.get(`serviceClient.getok${utils.toPascalCase(webadeEnv)}.username`);
      const password = config.get(`serviceClient.getok${utils.toPascalCase(webadeEnv)}.password`);
      const webAdeResponse = await utils.getWebAdeToken(username, password, 'WEBADE-REST', webadeEnv);

      result.healthCheck = !!webAdeResponse;
      result.authenticated = 'access_token' in webAdeResponse;
      result.authorized = 'scope' in webAdeResponse && webAdeResponse.scope.includes('WEBADE-REST.UPDATEAPPLICATIONS');
    } catch (error) {
      log.error('getWebAdeOauth2Status', error.message);
    }

    return result;
  },

  getMsscStatus: async () => {
    const username = config.get('serviceClient.mssc.username');
    const password = config.get('serviceClient.mssc.password');

    const result = {
      authenticated: false,
      authorized: false,
      endpoint: config.get('serviceClient.mssc.endpoint'),
      healthCheck: false,
      name: 'Common Messaging API'
    };

    try {
      const webAdeResponse = await utils.getWebAdeToken(username, password, 'CMSG');

      result.authorized = 'scope' in webAdeResponse &&
        webAdeResponse.scope.includes('CMSG.CREATEMESSAGE');

      if ('access_token' in webAdeResponse) {
        result.authenticated = true;

        await axios.get(result.endpoint, {
          headers: {
            'Authorization': `Bearer ${webAdeResponse.access_token}`
          }
        });

        result.healthCheck = true;
      }
    } catch (error) {
      log.error('getMsscStatus', error.message);
    }

    return result;
  },

  getStatus: () => Promise.all([
    checks.getWebAdeOauth2Status('INT'),
    checks.getWebAdeOauth2Status('TEST'),
    checks.getWebAdeOauth2Status('PROD'),
    checks.getMsscStatus()
  ])
};

module.exports = checks;
