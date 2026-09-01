pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '30'))
    }

    parameters {
        booleanParam(
            name: 'FORCE_TEST_FAILURE',
            defaultValue: false,
            description: 'Fail after unit tests to prove that migration, images, deployment, and health stages are skipped.'
        )
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        CI_RUN_SUBDIR = "jenkins-${BUILD_NUMBER}"
        CI_EVIDENCE_SUBDIR = "build-${BUILD_NUMBER}"
        CI_RUN_DIR = "${WORKSPACE}/.codex-run/${CI_RUN_SUBDIR}"
        CI_EVIDENCE_DIR = "${WORKSPACE}/ci-evidence/${CI_EVIDENCE_SUBDIR}"
        CI_RUNTIME_ENV_FILE = "${CI_RUN_DIR}/runtime.env"
        NPM_CONFIG_CACHE = "${JENKINS_HOME}/npm-cache"
        NPM_CONFIG_FETCH_RETRIES = '8'
        NPM_CONFIG_FETCH_RETRY_MINTIMEOUT = '20000'
        NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT = '120000'
        NPM_CONFIG_FETCH_TIMEOUT = '300000'
        TEST_DB_NAME = 'video_player_ci_test'
        K8S_NAMESPACE = 'video-player'
        KIND_CLUSTER_NAME = "video-player-ci-${BUILD_NUMBER}"
        FORCE_TEST_FAILURE_VALUE = "${params.FORCE_TEST_FAILURE}"
        DB_MIGRATION_MODE_VALUE = 'migrate'
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()
                retry(3) {
                    checkout scm
                }
                sh './scripts/ci-bootstrap.sh'
            }
        }

        stage('Install') {
            steps {
                sh './scripts/ci-install.sh'
            }
        }

        stage('Lint') {
            steps {
                sh './scripts/ci-lint.sh'
            }
        }

        stage('Build') {
            steps {
                sh './scripts/ci-build.sh'
            }
        }

        stage('Unit Test') {
            steps {
                sh './scripts/ci-unit.sh'
            }
        }

        stage('Isolated Database Migration') {
            steps {
                sh './scripts/ci-start-isolated-db.sh'
                sh './scripts/ci-db-migrate.sh'
            }
        }

        stage('API Integration') {
            steps {
                sh './scripts/ci-api-integration.sh'
            }
        }

        stage('Seed E2E Data') {
            steps {
                sh './scripts/ci-seed-test-data.sh'
            }
        }

        stage('Playwright E2E') {
            steps {
                sh './scripts/ci-playwright-e2e.sh'
            }
        }

        stage('Build Git SHA Images') {
            steps {
                sh './scripts/ci-build-images.sh'
            }
        }

        stage('Deploy to Kind') {
            steps {
                sh './scripts/ci-k8s-deploy.sh'
            }
        }

        stage('Health Check') {
            steps {
                sh './scripts/ci-k8s-health-check.sh'
            }
        }
    }

    post {
        always {
            script {
                if (fileExists('scripts/ci-finalize-evidence.sh')) {
                    withEnv(["BUILD_RESULT=${currentBuild.currentResult}"]) {
                        sh './scripts/ci-finalize-evidence.sh || true'
                    }
                }
                if (fileExists('scripts/k8s-collect-evidence.sh')) {
                    sh './scripts/k8s-collect-evidence.sh || true'
                }
            }
            junit(
                testResults: "ci-evidence/${CI_EVIDENCE_SUBDIR}/test-results/junit/*.xml",
                allowEmptyResults: true,
                keepLongStdio: true
            )
            archiveArtifacts(
                artifacts: "ci-evidence/${CI_EVIDENCE_SUBDIR}/**",
                allowEmptyArchive: true,
                fingerprint: true
            )
        }
        cleanup {
            script {
                if (fileExists('scripts/ci-cleanup.sh')) {
                    sh './scripts/ci-cleanup.sh || true'
                }
            }
        }
    }
}
