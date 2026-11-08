pipeline {
  agent none

  parameters {
    choice(
      name: 'BUILD_MODE',
      choices: ['cached', 'fresh'],
      description: 'cached = reuse existing Docker layers (incl. installed node_modules) when package*.json is unchanged. fresh = force a clean rebuild: --no-cache, re-pull base image, reinstall all modules.'
    )
    booleanParam(name: 'DEPLOY', defaultValue: true, description: 'SSH to the server and (re)start the app after pushing')
  }

  environment {
    // Non-secret settings only. Everything sensitive lives in Jenkins Credentials:
    //   dockerhub-creds      Username with password  -> Docker Hub user + access token (user also defines the image namespace)
    //   deploy-server-host   Secret text             -> server IP / DNS
    //   deploy-server-login  Username with password  -> SSH user + SSH password
    IMAGE_NAME = 'todo-app'
    IMAGE_TAG  = "${env.BUILD_NUMBER}"
    HOST_PORT  = '80'      // port exposed on the server
    APP_PORT   = '3000'    // port the container listens on

    REGISTRY_CREDS     = 'dockerhub-creds'
    DEPLOY_HOST_CREDS  = 'deploy-server-host'
    DEPLOY_LOGIN_CREDS = 'deploy-server-login'
  }

  options {
    timestamps()
    timeout(time: 20, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  stages {
    stage('Install & Test') {
      agent { docker { image 'node:22-alpine' } }
      steps {
        // The container runs as the host's jenkins uid, which has no home dir, so npm's default
        // cache path (/.npm) is not writable. Keep the cache inside the workspace instead.
        sh '''
          export HOME="$PWD"
          export npm_config_cache="$PWD/.npm"
          npm ci || npm install
          npm test
        '''
      }
    }

    // Build, push and deploy share one node so the locally built image is available to push.
    stage('Build, Push & Deploy') {
      agent any
      stages {

        stage('Build Image') {
          steps {
            script {
              // fresh -> throw away cache and re-pull base; cached -> reuse existing layers/modules
              def flags = params.BUILD_MODE == 'fresh' ? '--no-cache --pull' : ''
              echo "Build mode: ${params.BUILD_MODE}"
              withCredentials([usernamePassword(credentialsId: REGISTRY_CREDS, usernameVariable: 'U', passwordVariable: 'P')]) {
                sh """
                  IMAGE="docker.io/\$U/\$IMAGE_NAME"
                  docker build ${flags} -t "\$IMAGE:\$IMAGE_TAG" -t "\$IMAGE:latest" .
                """
              }
            }
          }
        }

        stage('Push Image') {
          when {
            expression {
              def b = (env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'main').replaceFirst('^origin/', '')
              return b in ['main', 'master']
            }
          }
          steps {
            withCredentials([usernamePassword(credentialsId: REGISTRY_CREDS, usernameVariable: 'U', passwordVariable: 'P')]) {
              sh '''
                IMAGE="docker.io/$U/$IMAGE_NAME"
                echo "$P" | docker login -u "$U" --password-stdin
                docker push "$IMAGE:$IMAGE_TAG"
                docker push "$IMAGE:latest"
              '''
            }
          }
        }

        stage('Deploy to Server') {
          when {
            allOf {
              expression { params.DEPLOY }
              expression {
                def b = (env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'main').replaceFirst('^origin/', '')
                return b in ['main', 'master']
              }
            }
          }
          steps {
            withCredentials([
              usernamePassword(credentialsId: REGISTRY_CREDS,     usernameVariable: 'U',        passwordVariable: 'P'),
              string(credentialsId: DEPLOY_HOST_CREDS,            variable: 'SRV_HOST'),
              // sshpass -e reads the password from the SSHPASS env var (not visible in the process list)
              usernamePassword(credentialsId: DEPLOY_LOGIN_CREDS, usernameVariable: 'SRV_USER', passwordVariable: 'SSHPASS')
            ]) {
              sh '''
                IMAGE="docker.io/$U/$IMAGE_NAME"
                SSH="sshpass -e ssh -o StrictHostKeyChecking=accept-new -o PubkeyAuthentication=no $SRV_USER@$SRV_HOST"

                # Log the server in to Docker Hub (needed if the repo is private); token goes via stdin
                echo "$P" | $SSH "docker login -u '$U' --password-stdin"

                # Pull the exact build, replace the running container, start it
                $SSH /bin/sh -s <<EOF
set -e
docker pull $IMAGE:$IMAGE_TAG
docker rm -f $IMAGE_NAME 2>/dev/null || true
docker run -d --name $IMAGE_NAME --restart unless-stopped \
  -p $HOST_PORT:$APP_PORT $IMAGE:$IMAGE_TAG
docker image prune -f
EOF
              '''
            }
          }
        }
      }
    }
  }

  post {
    failure { echo 'Pipeline failed -- check the stage logs above.' }
    success { echo "Build #${env.BUILD_NUMBER} done (mode: ${params.BUILD_MODE}, deploy: ${params.DEPLOY})" }
  }
}
