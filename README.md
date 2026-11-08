# Todo App -- Jenkins practice

A tiny Express todo app (REST API + single-page UI) whose real purpose is to give you
something to push through a CI/CD pipeline.

```
src/        Express app (app.js) and entrypoint (server.js)
public/     Static UI
test/       Tests (node:test, no extra deps)
Dockerfile  Container image
Jenkinsfile Pipeline: test -> build image -> push
```

## Run locally

```bash
npm install
npm test
npm start            # http://localhost:3000
```

API: `GET/POST /api/todos`, `PATCH/DELETE /api/todos/:id`, `GET /healthz`, `GET /readyz`, `GET /api/info`.

## Docker

```bash
docker build -t todo-app:local .
docker run --rm -p 3000:3000 todo-app:local
```

## Jenkins

1. Run Jenkins with Docker access (e.g. the `jenkins/jenkins:lts` image with `/var/run/docker.sock` mounted, plus
   the Docker Pipeline plugin).
2. Add credential `dockerhub-creds` (username/password) -- only needed for the push stage.
3. Edit `REGISTRY` at the top of the [Jenkinsfile](Jenkinsfile).
4. Create a **Multibranch Pipeline** job pointing at this repo. The push stage only runs on `main`.

## Things to try next

- Add lint / vulnerability-scan (`trivy`) stages to the Jenkinsfile.
- Add Slack/email notifications in the `post` block.
- Break a test on purpose and watch the pipeline stop.
- Later: add Kubernetes manifests and a deploy stage.
