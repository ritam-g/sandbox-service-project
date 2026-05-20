````md
# GITHUB CODESPACES SANDBOX STARTUP GUIDE

Production-style startup guide for:

- sandbox-service
- router-service
- template-service
- agent-service
- ai-service

Architecture:

Browser
↓
Router Service
↓
Sandbox Pod
├── Template Container (Vite App)
├── Agent Container (Filesystem + Terminal API)
└── Shared /workspace Volume
↓
AI Service (LangChain + Mistral)

---

# BEFORE CLOSING GITHUB CODESPACE

Cleanup all temporary sandbox pods/services:

```bash
kubectl delete pod -l app=sandbox-instance --ignore-not-found && \
kubectl delete svc -l app=sandbox-instance --ignore-not-found
````

---

# AFTER REOPENING CODESPACE (FULL START FROM SCRATCH)

---

# 1. START DOCKER

```bash
sudo service docker start
```

Check:

```bash
docker ps
```

---

# 2. CREATE KIND CLUSTER

Create cluster:

```bash
kind create cluster --name sandbox
```

If cluster already exists:

```bash
kind get clusters
```

Delete old cluster if broken:

```bash
kind delete cluster --name sandbox
```

---

# 3. BUILD ALL DOCKER IMAGES

IMPORTANT:

Because you use:

```dockerfile
CMD ["npm","run","dev"]
```

and:

```yaml
imagePullPolicy: Never
```

You MUST rebuild images after code changes.

Build all services:

```bash
docker build -t sandbox:latest ./sandbox/server && \
docker build -t router:latest ./sandbox/router && \
docker build -t template:latest ./sandbox/template && \
docker build -t agent:latest ./sandbox/agent && \
docker build -t ai-server:latest ./ai
```

---

# 4. LOAD IMAGES INTO KIND

```bash
kind load docker-image sandbox:latest --name sandbox && \
kind load docker-image router:latest --name sandbox && \
kind load docker-image template:latest --name sandbox && \
kind load docker-image agent:latest --name sandbox && \
kind load docker-image ai-server:latest --name sandbox
```

---

# 5. APPLY KUBERNETES FILES

Apply all manifests:

```bash
kubectl apply -f kubernetes/
```

OR:

```bash
kubectl apply -f k8s/
```

---

# 6. CHECK DEPLOYMENTS

```bash
kubectl get deploy
```

Expected:

```txt
sandbox-deployment
router-deployment
agent-deployment
ai-deployment
```

---

# 7. CHECK PODS

```bash
kubectl get pods -w
```

Wait until all are:

```txt
Running
```

Example:

```txt
router-deployment-xxxxx      Running
sandbox-deployment-xxxxx     Running
agent-deployment-xxxxx       Running
ai-deployment-xxxxx          Running
```

---

# 8. CHECK SERVICES

```bash
kubectl get svc
```

Expected:

```txt
sandbox-service
router-service
agent-service
ai-service
```

---

# 9. PORT FORWARD ROUTER SERVICE

IMPORTANT:

KEEP THIS TERMINAL OPEN.

```bash
kubectl port-forward svc/router-service 3000:80 --address 0.0.0.0
```

Without this:

* /start fails
* preview URLs fail
* Codespaces browser preview fails

---

# NEW TERMINAL

# 10. CREATE SANDBOX

```bash
curl -X POST http://localhost:3000/api/sandbox/start
```

Example response:

```json
{
  "sandboxId": "abc123",
  "previewUrl": "/preview/abc123/"
}
```

Copy:

* sandboxId
* previewUrl

---

# 11. OPEN PREVIEW

```txt
https://YOUR_CODESPACE-3000.app.github.dev/preview/SANDBOX_ID/
```

Example:

```txt
https://solid-space-x7g6p9rj5-3000.app.github.dev/preview/abc123/
```

---

# AGENT SERVICE

Agent service handles:

* filesystem API
* terminal websocket
* file read/write/create
* workspace operations

---

# PORT FORWARD AGENT SERVICE

```bash
kubectl port-forward svc/agent-service 4000:3000 --address 0.0.0.0
```

Open:

```txt
http://localhost:4000
```

Codespaces:

```txt
https://YOUR_CODESPACE-4000.app.github.dev
```

---

# AGENT ROUTES

---

# HEALTH ROUTE

## GET /

```bash
curl http://localhost:4000/
```

Response:

```json
{
  "message": "Hello from sandbox agent!",
  "status": "success"
}
```

---
