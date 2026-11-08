pipeline {
  agent none

  environment {
    // Change these for your setup
    REGISTRY    = 'docker.io/YOUR_DOCKERHUB_USER'
    IMAGE_NAME  = 'todo-app'
    IMAGE_TAG   = "${env.BUILD_NUMBER}"
    REGISTRY_CREDS = 'dockerhub-creds'   // Jenkins "Username with password" credential
  }

  options {
    timestamps()
    timeout(time: 15, unit: 'MINUTES')
  }

  stages {
    stage('Install & Test') {
      agent { docker { image 'node:22-alpine' } }
      steps {
        sh 'npm ci || npm install'
        sh 'npm test'
      }
    }

    stage('Build Image') {
      agent any
      steps {
        sh "docker build -t ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} -t ${REGISTRY}/${IMAGE_NAME}:latest ."
      }
    }

    stage('Push Image') {
      agent any
      when { branch 'main' }
      steps {
        withCredentials([usernamePassword(credentialsId: REGISTRY_CREDS, usernameVariable: 'U', passwordVariable: 'P')]) {
          sh 'echo "$P" | docker login -u "$U" --password-stdin'
          sh "docker push ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
          sh "docker push ${REGISTRY}/${IMAGE_NAME}:latest"
        }
      }
    }
  }

  post {
    failure { echo 'Pipeline failed -- check the stage logs above.' }
    success { echo "Built ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" }
  }
}
