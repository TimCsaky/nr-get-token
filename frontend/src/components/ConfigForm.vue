<template>
  <v-stepper v-model="appConfigStep" vertical class="elevation-0">
    <v-stepper-step :complete="appConfigStep > 1" step="1">
      Permissions
      <small>Check your acronym access permissions</small>
    </v-stepper-step>

    <v-stepper-content step="1">
      <div v-if="hasAcronyms">
        You are authorized to submit configurations for these applications:
        <ul>
          <li v-for="(acronym, index) in acronyms" :key="index">{{ acronym }}</li>
        </ul>
        <p>Click next or register a new application.</p>
      </div>
      <div v-else>
        <p>You are not authorized for any applications</p>
        <p>Please register for a new application.</p>
      </div>
      <v-btn
        class="ma-2"
        color="success"
        href="mailto:NR.CommonServiceShowcase@gov.bc.ca?subject=GETOK Registration for <acronym> - <idir>"
      >Register New App</v-btn>
      <v-btn color="primary" @click="appConfigStep = 2" :disabled="!hasAcronyms">Next</v-btn>
    </v-stepper-content>

    <v-stepper-step :complete="appConfigStep > 2" step="2">
      Select Common Service(s)
      <small>Select type of common service to onboard to</small>
    </v-stepper-step>

    <v-stepper-content step="2">
      <v-btn
        class="ma-2"
        color="primary"
        @click="setChes(); appConfigStep = 3"
        :disabled="!hasAcronyms"
      >
        <v-icon left>email</v-icon>Common Hosted Email
      </v-btn>
      <v-btn class="ma-2" color="primary" @click="appConfigStep = 3" :disabled="true">
        <v-icon left>insert_drive_file</v-icon>Common Hosted Document
      </v-btn>
      <v-btn
        class="ma-2"
        color="primary"
        @click="setWebade(); appConfigStep = 3"
        :disabled="!hasAcronyms"
      >
        <v-icon left>save</v-icon>Legacy (WebADE)
      </v-btn>
      <br />
      <br />
      <v-btn text @click="appConfigStep = 1">Back</v-btn>
    </v-stepper-content>

    <v-stepper-step :complete="appConfigStep > 3" step="3">
      Set up Application
      <small>Pick application and service client details</small>
    </v-stepper-step>

    <v-stepper-content step="3">
      <v-form v-model="step1Valid">
        <v-row>
          <v-col cols="12" md="7">
            <v-text-field
              label="Application Acronym"
              required
              :value="userAppCfg.applicationAcronym"
              v-on:keyup.stop="updateAppCfgField('applicationAcronym', $event.target.value)"
              :counter="fieldValidations.ACRONYM_MAX_LENGTH"
              :rules="applicationAcronymRules"
            >
              <template v-slot:append-outer>
                <v-tooltip bottom>
                  <template v-slot:activator="{ on }">
                    <v-icon v-on="on">help_outline</v-icon>
                  </template>
                  The Application Acronym must comply with the following format:
                  <ul>
                    <li>UPPERCASE LETTERS ONLY</li>
                    <li>Underscores may be placed between letters</li>
                    <li>Must begin and end with a letter</li>
                    <li>At least {{ fieldValidations.ACRONYM_MIN_LENGTH }} characters</li>
                    <li>
                      Examples:
                      <em>ABCD</em>,
                      <em>ABCD_WXYZ</em>
                    </li>
                  </ul>
                </v-tooltip>
              </template>
            </v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="9">
            <v-text-field
              label="Application Name"
              required
              :value="userAppCfg.applicationName"
              v-on:keyup.stop="updateAppCfgField('applicationName', $event.target.value)"
              :counter="fieldValidations.NAME_MAX_LENGTH"
              :rules="applicationNameRules"
            ></v-text-field>
          </v-col>
        </v-row>
        <v-text-field
          label="Application Description"
          required
          :value="userAppCfg.applicationDescription"
          v-on:keyup.stop="updateAppCfgField('applicationDescription', $event.target.value)"
          :counter="fieldValidations.DESCRIPTION_MAX_LENGTH"
          :rules="applicationDescriptionRules"
        ></v-text-field>
        <div v-if="usingWebadeConfig">
          <v-select
            :items="commonServices"
            label="Common Service(s) Required"
            multiple
            chips
            deletable-chips
            :value="userAppCfg.commonServices"
            v-on:change="updateAppCfgField('commonServices', $event)"
          ></v-select>
        </div>

        <v-btn text @click="usingWebade(false); appConfigStep = 2">Back</v-btn>
        <v-btn color="primary" @click="appConfigStep = 4" :disabled="!step1Valid">Next</v-btn>
      </v-form>
    </v-stepper-content>

    <v-stepper-step :complete="appConfigStep > 4" step="4">
      Deployment
      <small v-if="usingWebadeConfig">Choose method of deploying WebADE config</small>
      <small v-if="!usingWebadeConfig">Choose service client deployment details</small>
    </v-stepper-step>

    <v-stepper-content step="4">
      <v-form v-model="step2Valid">
        <v-row>
          <v-col cols="12" md="7">
            <v-select
              required
              :mandatory="true"
              :items="usingWebadeConfig ? webadeEnvironments : keycloakEnvironments"
              label="Environment to Deploy to"
              :value="userAppCfg.clientEnvironment"
              v-on:change="updateAppCfgField('clientEnvironment', $event)"
            ></v-select>
          </v-col>
        </v-row>

        <v-radio-group
          v-if="usingWebadeConfig"
          :value="userAppCfg.deploymentMethod"
          v-on:change="updateAppCfgField('deploymentMethod', $event)"
          :mandatory="usingWebadeConfig"
        >
          <v-radio
            label="Manual commit to Bitbucket (deploy with Jenkins)"
            value="deploymentManual"
          ></v-radio>
          <p v-if="userAppCfg.deploymentMethod === 'deploymentManual'" class="underRadioField">
            <a
              href="https://github.com/bcgov/nr-get-token/wiki/WebADE-Access"
              target="_blank"
            >Instructions for manual deployment</a>
          </p>
          <v-radio label="Direct Deploy" value="deploymentDirect"></v-radio>
        </v-radio-group>

        <v-btn text @click="appConfigStep = 3">Back</v-btn>

        <v-dialog
          v-model="confirmationDialog"
          persistent
          max-width="1200"
          v-if="!usingWebadeConfig || userAppCfg.deploymentMethod === 'deploymentDirect'"
        >
          <template v-slot:activator="{ on }">
            <v-btn color="success" :disabled="!step2Valid" v-on="on" @click="getWebAdeConfig">Submit</v-btn>
          </template>
          <v-card>
            <v-card-title class="headline">Are you sure?</v-card-title>
            <v-card-text v-if="usingWebadeConfig">
              <p>
                This will overwrite any existing WebADE configuration for the
                <strong>{{ userAppCfg.applicationAcronym }}</strong> application.
              </p>
              <p>The following shows the differences between the current configuration and the configuration that will be created. Are you sure you want to proceed?</p>
              <pre id="webadeDiff"></pre>
            </v-card-text>
            <v-card-text v-if="!usingWebadeConfig">
              <p>
                This will create or replace a service client in the Common Services Keycloak realm for the
                <strong>{{ userAppCfg.applicationAcronym }}</strong> application.
              </p>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn text @click="confirmationDialog = false">CANCEL</v-btn>
              <v-btn
                color="green darken-1"
                text
                @click="confirmationDialog = false; submitConfig()"
              >CONTINUE</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <v-dialog v-model="passwordDialog" persistent max-width="700">
          <v-card>
            <v-card-title class="headline success">
              <v-icon class="mr-2">check_circle</v-icon>
              <span v-if="usingWebadeConfig">Application Configuration Updated</span>
              <span v-else>Keycloak Client Updated</span>
            </v-card-title>
            <v-card-text>
              <br />
              <p v-if="usingWebadeConfig">
                Your application configuration for
                <strong>{{userAppCfg.applicationAcronym}}</strong> has been updated in the WebADE system.
              </p>
              <p v-else>
                Your service client for
                <strong>{{userAppCfg.applicationAcronym}}</strong> has been updated in the Keycloak realm.
              </p>
              <h2>1. Service Client</h2>
              <p>A password for the service client created is shown below. Keep this password secure and do not lose it as you will be unable to fetch it again.</p>

              <v-checkbox
                v-model="passwordAgree"
                label="I agree to securely store this password in an OpenShift Secret."
              ></v-checkbox>

              <v-card color="green lighten-5" class="pl-3 pt-3 mb-3">
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-text-field v-model="displayClient" readonly label="Service Client"></v-text-field>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-text-field v-model="shownPassword" readonly label="Password"></v-text-field>
                  </v-col>
                  <v-col cols="6" sm="4">
                    <v-btn
                      color="success"
                      :disabled="!passwordAgree"
                      @click="decryptPassword()"
                    >DECRYPT PASSWORD</v-btn>
                  </v-col>
                  <v-col cols="6" sm="2">
                    <v-tooltip bottom>
                      <template v-slot:activator="{ on }">
                        <v-btn
                          text
                          icon
                          color="primary"
                          v-clipboard:copy="shownPassword"
                          v-clipboard:success="clipboardSuccessHandler"
                          v-clipboard:error="clipboardErrorHandler"
                          v-on="on"
                        >
                          <v-icon>file_copy</v-icon>
                        </v-btn>
                      </template>
                      <span>Copy password to clipboard</span>
                    </v-tooltip>
                  </v-col>
                </v-row>
              </v-card>

              <div v-if="passwordDecrypted">
                <div v-if="usingWebadeConfig">
                  <h2>2. API Access Token</h2>
                  <p
                    v-if="usingWebadeConfig"
                  >You can fetch a token with this new service client to test out in the API store or through any REST client</p>
                  <p
                    v-else
                  >You can fetch a token with this new service client to test out a REST client (or use the username and password to fetch a token on-demand)</p>
                  <v-row align="center">
                    <v-col cols="12" sm="2">
                      <v-btn small color="primary" dark @click="getToken()">Get Token</v-btn>
                    </v-col>
                    <v-col cols="12" sm="8" v-if="generatedToken">{{generatedToken}}</v-col>
                    <v-col
                      class="error"
                      cols="12"
                      sm="8"
                      v-if="generatedTokenError"
                    >{{generatedTokenError}}</v-col>
                    <v-col cols="6" sm="2" v-if="generatedToken">
                      <v-tooltip bottom>
                        <template v-slot:activator="{ on }">
                          <v-btn
                            text
                            icon
                            color="primary"
                            v-clipboard:copy="generatedToken"
                            v-clipboard:success="clipboardSuccessHandler"
                            v-clipboard:error="clipboardErrorHandler"
                            v-on="on"
                          >
                            <v-icon>file_copy</v-icon>
                          </v-btn>
                        </template>
                        <span>Copy token to clipboard</span>
                      </v-tooltip>
                    </v-col>
                  </v-row>
                  <br />
                </div>

                <div v-if="userAppCfg.commonServices.length > 0">
                  <h2 v-if="usingWebadeConfig">3. API Store Swagger</h2>
                  <h2 v-else>2. API Documentation and Usage</h2>
                  <p v-if="usingWebadeConfig">
                    This token can be used to test out the common services you have specified by trying them out in the API Store.
                    <br />Fill in the token above into the Access Token field at the top of the
                    <strong>API Console</strong> tab for the common service(s) linked below:
                  </p>
                  <p v-else>
                    This service client can be used to test out using a REST client. Example collections for Postman are provided.
                    <br />Fetch a new token using the service client and password against the authorization endpoint (see postman collection) and use that token in your bearer header.
                  </p>
                  <ul>
                    <li v-for="item in apiLinks" v-bind:key="item.name">
                      {{item.name}}
                      <v-btn small color="primary" dark :href="item.apiDocLink" target="_blank">
                        Try it out
                        <v-icon right dark>open_in_new</v-icon>
                      </v-btn>
                      <br />Download Postman collection:
                      <a
                        class="buttonLink"
                        href="/files/ches.postman_collection.json"
                        download="ches.postman_collection.json"
                        target="_blank"
                      >
                        <v-btn text icon color="primary">
                          <v-icon>cloud_download</v-icon>
                        </v-btn>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                color="info darken-1"
                text
                :disabled="!passwordAgree || !passwordDecrypted"
                @click="passwordDialog = false"
              >FINISHED</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-form>
      <v-snackbar v-model="snackbar.on" right top :timeout="6000" :color="snackbar.color">
        {{snackbar.text}}
        <v-btn color="white" text @click="snackbar.on = false">
          <v-icon>close</v-icon>
        </v-btn>
      </v-snackbar>
    </v-stepper-content>
  </v-stepper>
</template>

<script>
import axios from 'axios';
import commonServiceList from '@/utils/commonServices.js';
import { FieldValidations, CommonServiceRoutes } from '@/utils/constants.js';
import cryptico from 'cryptico-js';
import Vue from 'vue';
import VueClipboard from 'vue-clipboard2';
import { mapGetters } from 'vuex';
var jsdiff = require('diff');

VueClipboard.config.autoSetContainer = true;
Vue.use(VueClipboard);

export default {
  data() {
    return {
      shownPassword: '••••••••',
      confirmationDialog: false,
      passwordDialog: false,
      passwordAgree: false,
      passwordDecrypted: false,
      fieldValidations: FieldValidations,
      appConfig: '',
      appConfigStep: 1,
      step1Valid: false,
      step2Valid: false,
      commonServices: commonServiceList
        .filter(serv => serv.type === 'webade')
        .map(serv => ({
          text: serv.name,
          value: serv.abbreviation,
          disabled: serv.disabled
        })),
      webadeEnvironments: ['INT', 'TEST', 'PROD'],
      keycloakEnvironments: ['DEV', 'TEST', 'PROD'],
      userAppCfg: this.$store.state.configForm.userAppCfg,
      applicationAcronymRules: [
        v => !!v || 'Acronym is required',
        v =>
          v.length <= FieldValidations.ACRONYM_MAX_LENGTH ||
          `Acronym must be ${FieldValidations.ACRONYM_MAX_LENGTH} characters or less`,
        v =>
          /^(?:[A-Z]{2,}[_]?)+[A-Z]{1,}$/g.test(v) ||
          'Incorrect format. Hover over ? for details.',
        v =>
          this.acronyms.includes(v) ||
          `You are only authorized to use acronym(s) ${this.acronyms}`
      ],
      applicationNameRules: [
        v => !!v || 'Name is required',
        v =>
          v.length <= FieldValidations.NAME_MAX_LENGTH ||
          `Name must be ${FieldValidations.NAME_MAX_LENGTH} characters or less`
      ],
      applicationDescriptionRules: [
        v => !!v || 'Description is required',
        v =>
          v.length <= FieldValidations.DESCRIPTION_MAX_LENGTH ||
          `Description must be ${FieldValidations.DESCRIPTION_MAX_LENGTH} characters or less`
      ],
      snackbar: {
        on: false,
        text: 'test',
        color: 'info'
      },
      generatedToken: '',
      generatedTokenError: ''
    };
  },
  computed: {
    ...mapGetters('auth', ['acronyms', 'hasAcronyms']),
    ...mapGetters('configForm', [
      'appConfigAsString',
      'configFormSubmissionResult',
      'ephemeralPasswordRSAKey',
      'configSubmissionSuccess',
      'configSubmissionError',
      'usingWebadeConfig',
      'existingWebAdeConfig'
    ]),
    displayClient: function() {
      return this.configFormSubmissionResult
        ? this.configFormSubmissionResult.generatedServiceClient
        : '';
    },
    apiLinks: function() {
      return this.userAppCfg.commonServices.map(item =>
        commonServiceList.find(service => service.abbreviation === item)
      );
    }
  },
  methods: {
    async usingWebade(val) {
      this.$store.commit('configForm/setUsingWebadeConfig', val);
    },
    async setWebade() {
      this.usingWebade(true);
    },
    async setChes() {
      this.usingWebade(false);
      this.userAppCfg.commonServices = ['CHES'];
    },
    async submitConfig() {
      this.generatedToken = '';
      window.scrollTo(0, 0);
      this.shownPassword = '••••••••';
      this.$store.commit('configForm/clearConfigSubmissionMsgs');

      await this.$store.dispatch('configForm/submitConfigForm');
      if (this.configSubmissionSuccess) {
        this.passwordDialog = true;
      }
    },
    async getToken() {
      this.generatedToken = '';
      this.generatedTokenError = '';
      try {
        let url = CommonServiceRoutes.TOKEN;
        if (this.userAppCfg.commonServices.length > 0) {
          url = url + this.userAppCfg.commonServices.map(i => i.toUpperCase());
        } else {
          url = url + 'WEBADE-REST';
        }
        const response = await axios.get(url, {
          auth: {
            username: this.displayClient,
            password: this.shownPassword
          }
        });
        const body = response.data;

        if (!body) {
          throw new Error('no body in the response');
        }
        if (body.error) {
          throw new Error(body.error);
        }

        this.generatedToken = body.access_token;
      } catch (e) {
        console.log('ERROR, caught error fetching from WebADE Token endpoint'); // eslint-disable-line no-console
        console.log(e); // eslint-disable-line no-console
        this.generatedTokenError =
          'Error fetching token. The service client can take a moment to register, you can try again in a few seconds.';
      }
    },
    async getWebAdeConfig() {
      if (!this.usingWebadeConfig) {
        return;
      }

      await this.$store.dispatch('configForm/getWebAdeConfig', {
        webAdeEnv: this.userAppCfg.clientEnvironment,
        acronym: this.userAppCfg.applicationAcronym
      });
      let diff = jsdiff.diffLines(
          this.existingWebAdeConfig,
          this.appConfigAsString
        ),
        display = document.getElementById('webadeDiff'),
        fragment = document.createDocumentFragment();

      diff.forEach(part => {
        // green for additions, red for deletions
        // grey for common parts
        let color = part.added ? 'green' : part.removed ? 'red' : 'grey';
        let span = document.createElement('span');
        span.style.color = color;
        span.appendChild(document.createTextNode(part.value));
        fragment.appendChild(span);
      });

      display.appendChild(fragment);
    },
    updateAppCfgField(field, value) {
      this.$store.commit('configForm/updateUserAppCfg', {
        [field]: value
      });
    },
    displayMessage(success, msg) {
      this.$store.commit(
        `configForm/setConfigSubmission${success ? 'Success' : 'Error'}`,
        msg
      );
    },
    decryptPassword() {
      this.passwordDecrypted = true;
      const DecryptionResult = cryptico.decrypt(
        this.configFormSubmissionResult.generatedPassword,
        this.ephemeralPasswordRSAKey
      );
      this.shownPassword = DecryptionResult.plaintext;
    },
    clipboardSuccessHandler() {
      this.snackbar.on = true;
      this.snackbar.text = ' copied to clipboard';
      this.snackbar.color = 'info';
    },
    clipboardErrorHandler() {
      this.snackbar.on = true;
      this.snackbar.text = 'attempting to copy to clipboard';
      this.snackbar.color = 'error';
    }
  }
};
</script>

<style scoped>
.commonSvcBtn {
  min-height: 100px;
}
</style>
