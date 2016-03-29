'use strict';

const Nightmare = require('nightmare');
const clui = require('clui');
const coinquirer = require('coinquirer');
const pkg = require('../../package.json');

const Google = {
  /**
   * Name of the provider
   */
  name: 'Google',

  /**
   * Login method used to generate a valid SAML assertion
   * @param idpEntryUrl URL to start the login process
   * @param username Username at the SSO provider
   * @param password Password for the SSO provider
   * @returns Base64 encoded SAML assertion from the SSO provider
   */
  login: function *(idpEntryUrl, username, password) {
    // ... authenticate
    let spinner = new clui.Spinner('Logging in...');

    // Username
    let ci = new coinquirer();
    username = username ? username : yield ci.prompt({
      type: 'input',
      message: 'Google username (ex. user@domain.com):'
    });

    spinner.start();
    let nightmare = Nightmare();

    let hasError = yield nightmare
      .useragent(pkg.description + ' v.' + pkg.version)
      .goto(idpEntryUrl)
      .type('input[name="Email"]', username)
      .click('input[name="signIn"]')
      .wait('body')
      .exists('#error-msg');
    spinner.stop();

    if (hasError) {
      yield logBody(nightmare);
      let errMsg = yield nightmare.evaluate(function() {
        return document.querySelector('#error-msg').innerText;
      });
      throw new Error(errMsg);
    }

    // Password
    password = password ? password : yield ci.prompt({
      type: 'password',
      message: 'Google password:'
    });

    hasError = yield nightmare
      .type('input[name="Passwd"]', password)
      .click('input[name="signIn"]')
      .wait('body')
      .exists('#error-msg');
    spinner.stop();

    if (hasError) {
      yield logBody(nightmare);
      let errMsg = yield nightmare.evaluate(function() {
        return document.querySelector('#error-msg').innerText;
      });
      throw new Error(errMsg);
    }

    // TOTP from Google Authenticator MFA
    // ToDo: need to modify this for users that aren't using MFA
    let totp = yield ci.prompt({
      type: 'password',
      message: 'Verification code from Google Authenticator app:'
    });

    hasError = yield nightmare
      .type('input[name="Pin"]', totp)
      .click('input[id="submit"]')
      .wait('body')
      .exists('#error-msg');
    spinner.stop();

    if (hasError) {
      yield logBody(nightmare);
      let errMsg = yield nightmare.evaluate(function() {
        return document.querySelector('#error-msg').innerText;
      });
      throw new Error(errMsg);
    }

    let samlAssertion = yield nightmare
      .wait('input[name="SAMLResponse"]')
      .evaluate(function () {
        return document.querySelector('input[name="SAMLResponse"]').value;
      });

    yield nightmare.end();
    spinner.stop();

    return samlAssertion;
  }
};

module.exports = Google;
