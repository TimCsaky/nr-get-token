const log = require('npmlog');

const webAde = require('express').Router();
const utils = require('../../components/utils');
const appConfigComponent = require('../../components/appConfig');

const {
  body,
  validationResult
} = require('express-validator');

// fetches the app config json for a acronym in a specified env
webAde.get('/:webAdeEnv/:appAcronym/appConfig', [
], async (req, res) => {

  // TODO: a lot of this role checking is duplicate, but as we will be moving acronym management to the DB soon all this will need to be refactored anyways

  // Check for required permissions. Can only fetch cfgs for the acronyms you are associated with
  // If the user has "WEBADE_CFG_READ_ALL" then they can get all
  let acronyms = [];
  const roles = req.user.jwt.realm_access.roles;
  let hasReadAllRole = false;
  if (typeof roles === 'object' && roles instanceof Array) {
    acronyms = utils.filterAppAcronymRoles(roles);
    hasReadAllRole = roles.includes('WEBADE_CFG_READ_ALL');
  }

  if (!hasReadAllRole) {
    const appAcronym = req.params.appAcronym;
    if (!acronyms.includes(appAcronym)) {
      return res.status(403).json({
        message: `User lacks permission for '${appAcronym}' acronym`
      });
    }
  }

  try {
    const response = await appConfigComponent.getAppConfig(req.params.webAdeEnv, req.params.appAcronym);
    if (response) {
      return res.status(200).json(response);
    } else {
      return res.status(404).end();
    }
  } catch (error) {
    log.error(error);
    res.status(500).json({
      message: error.message
    });
    return res;
  }
});

// fetches a list of other webade apps that are dependent on a supplied acronym in a specified env
webAde.get('/:webAdeEnv/:appAcronym/dependencies', [
], async (req, res) => {

  // TODO: a lot of this role checking is duplicate, but as we will be moving acronym management to the DB soon all this will need to be refactored anyways

  // Check for required permissions. Can only fetch cfgs for the acronyms you are associated with
  // If the user has "WEBADE_CFG_READ_ALL" then they can get all
  let acronyms = [];
  const roles = req.user.jwt.realm_access.roles;
  let hasReadAllRole = false;
  if (typeof roles === 'object' && roles instanceof Array) {
    acronyms = utils.filterAppAcronymRoles(roles);
    hasReadAllRole = roles.includes('WEBADE_CFG_READ_ALL');
  }

  if (!hasReadAllRole) {
    const appAcronym = req.params.appAcronym;
    if (!acronyms.includes(appAcronym)) {
      return res.status(403).json({
        message: `User lacks permission for '${appAcronym}' acronym`
      });
    }
  }

  try {
    const response = await appConfigComponent.getAppConfigs(req.params.webAdeEnv);
    if (response) {
      return res.status(200).json(utils.filterWebAdeDependencies(response, req.params.appAcronym));
    } else {
      return res.status(404).end();
    }
  } catch (error) {
    log.error(error);
    res.status(500).json({
      message: error.message
    });
    return res;
  }
});

// fetches a list of all application Preferences from the webade config list that match a search criteria in the pref name
// and have the secure indicator set to FALSE
webAde.get('/:webAdeEnv/preferences/insecurePrefs', [
], async (req, res) => {
  var searchCriteria = req.query.searchCriteria;

  // Check for required permissions.
  // If the user has "WEBADE_CFG_READ_ALL" then they can get all
  const roles = req.user.jwt.realm_access.roles;
  let hasReadAllRole = false;
  if (typeof roles === 'object' && roles instanceof Array) {
    hasReadAllRole = roles.includes('WEBADE_CFG_READ_ALL');
  }

  if (!hasReadAllRole) {
    return res.status(403).json({
      message: 'User lacks permission to read all webade configs'
    });
  }

  try {
    const response = await appConfigComponent.getAppConfigs(req.params.webAdeEnv);
    if (response) {
      return res.status(200).json(utils.filterForInsecurePrefs(response, searchCriteria));
    } else {
      return res.status(404).end();
    }
  } catch (error) {
    log.error(error);
    res.status(500).json({
      message: error.message
    });
    return res;
  }
});

// gets the big array of all webade configs for a specified env
webAde.get('/:webAdeEnv/appConfigs', [
], async (req, res) => {
  // Only administrative users with WEBADE_CFG_READ_ALL can get this info
  const roles = req.user.jwt.realm_access.roles;
  let hasReadAllRole = false;
  if (typeof roles === 'object' && roles instanceof Array) {
    hasReadAllRole = roles.includes('WEBADE_CFG_READ_ALL');
  }

  if (!hasReadAllRole) {
    return res.status(403).json({
      message: 'User lacks permission to get all app configs'
    });
  }

  try {
    const response = await appConfigComponent.getAppConfigs(req.params.webAdeEnv);
    if (response) {
      return res.status(200).json(response);
    } else {
      return res.status(404).end();
    }
  } catch (error) {
    log.error(error);
    res.status(500).json({
      message: error.message
    });
    return res;
  }
});

// submits a webade application configuration
webAde.post('/configForm', [
  body('configForm.applicationAcronym').isString(),
  body('configForm.applicationName').isString(),
  body('configForm.applicationDescription').isString(),
  body('configForm.commonServices').isArray(),
  body('configForm.clientEnvironment').isIn(['INT', 'TEST', 'PROD']),
  body('passwordPublicKey').isString()
], async (req, res) => {
  // Validate for Bad Requests
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
      message: 'Validation failed'
    });
  }

  // Check for required permission
  let acronyms = [];
  const roles = req.user.jwt.realm_access.roles;
  if (typeof roles === 'object' && roles instanceof Array) {
    acronyms = utils.filterAppAcronymRoles(roles);
  }

  const {
    configForm,
    passwordPublicKey: publicKey
  } = req.body;

  const appAcronym = configForm.applicationAcronym;
  if (!acronyms.includes(configForm.applicationAcronym)) {
    return res.status(403).json({
      message: `User lacks permission for '${appAcronym}' acronym`
    });
  }

  try {
    const response = await appConfigComponent.postAppConfig(configForm, publicKey, req.user.jwt.sub);
    return res.status(200).json(response);
  } catch (error) {
    log.error(error);
    res.status(500).json({
      message: error.message
    });
    return res;
  }
});

module.exports = webAde;
