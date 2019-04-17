#!groovy

// ------------------
// Pipeline Variables
// ------------------
// Get projects/namespaces from config maps
def devProject = new File('/var/run/configs/ns/project.dev').getText('UTF-8').trim()
def testProject = new File('/var/run/configs/ns/project.test').getText('UTF-8').trim()
def prodProject = new File('/var/run/configs/ns/project.prod').getText('UTF-8').trim()
def toolsProject = new File('/var/run/configs/ns/project.tools').getText('UTF-8').trim()

// Get application config from config maps
def repoOwner = new File('/var/run/configs/jobs/repo.owner').getText('UTF-8').trim()
def appRepo = new File('/var/run/configs/jobs/repo.name').getText('UTF-8').trim()
def appName = new File('/var/run/configs/jobs/app.name').getText('UTF-8').trim()
def appDomain = new File('/var/run/configs/jobs/app.domain').getText('UTF-8').trim()

def nameSelector = "${appName}"
def label = "'app-name'=${appName}"
def rawRepoBase = "https://raw.githubusercontent.com/${repoOwner}/${appRepo}/master"
def devDomain = "${devProject}.${appDomain}-${nameSelector}"

def doEcho = true

// --------------------
// Declarative Pipeline
// --------------------
pipeline {
    agent any

    environment {
        // PR_NUM is the pull request number e.g. 'pr-4'
        PR_NUM = "${JOB_BASE_NAME}".toLowerCase()
        NAME_SUFFIX="-${DEV_SUFFIX}-${PR_NUM}"

        SOURCE_REPO_URL="https://github.com/jujaga/nr-get-token.git"
        SOURCE_REPO_REF="pull/${CHANGE_ID}/head"
    }

    stages {
        stage('Debug') {
            steps {
                git branch: 'feature/newpipe', url: 'https://github.com/jujaga/nr-get-token.git'

                echo 'Print out all environment variables in this pipeline.'
                echo sh(returnStdout: true, script: 'env')

                script {
                    openshift.logLevel(5)

                    if (doEcho) {
                        echo "Using project: ${openshift.project()}"
                        echo "----- Environment -----"
                        // echo "   Git"
                        // echo "      BRANCH_NAME = ${BRANCH_NAME}"
                        // echo "      GIT_BRANCH = ${GIT_BRANCH}"
                        // echo "      GIT_COMMIT = ${GIT_COMMIT}"

                        echo "   NS Config"
                        echo "      devProject = ${devProject}"
                        echo "      testProject = ${testProject}"
                        echo "      prodProject = ${prodProject}"
                        echo "      toolsProject = ${toolsProject}"

                        echo "   App ConfigMap"
                        echo "      repoOwner = ${repoOwner}"
                        echo "      appRepo = ${appRepo}"
                        echo "      appName = ${appName}"
                        echo "      appDomain = ${appDomain}"

                        echo "   Global Variables"
                        echo "   nameSelector = ${nameSelector}"
                        echo "   label = ${label}"
                        echo "   devDomain = ${devDomain}"
                        echo "   rawRepoBase = ${rawRepoBase}"
                    }
                }
            }
        }

        stage('Create BuildConfigs') {
            steps {
                echo 'Cancelling previous builds...'
                timeout(10) {
                    abortAllPreviousBuildInProgress(currentBuild)
                }

                script {
                    openshift.withCluster() {
                        openshift.withProject(toolsProject) {
                            echo 'Creating Frontend BuildConfig...'
                            def buildTemplateFrontend = openshift.process('-f',
                                'openshift/frontend.bc.yaml'
                            )
                            openshift.apply(buildTemplateFrontend)

                            echo 'Creating Static Frontend BuildConfig...'
                            def buildTemplateFrontendStatic = openshift.process('-f',
                                'openshift/frontend-static.bc.yaml'
                            )
                            openshift.apply(buildTemplateFrontendStatic)
                        }
                    }
                }
            }
        }

        stage('Build & Test ImageStreams') {
            steps {
                script {
                    openshift.withCluster() {
                        openshift.withProject(toolsProject) {
                            echo 'Building Frontend ImageStream...'
                            def buildFrontend = openshift.selector("buildconfig/nr-get-token-frontend")
                            println buildFrontend
                            buildFrontend.startBuild('--wait').logs('-f')

                            // echo 'Building Static Frontend ImageStream...'
                            // def backendBuild = openshift.selector('bc', "nr-get-token-frontend-static")
                            // backendBuild.startBuild('--wait').logs('-f')
                        }
                    }
                }
            }
        }
    }
}
