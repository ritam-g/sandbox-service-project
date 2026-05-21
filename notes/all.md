Here is your updated `all.md` startup guide. It now outlines the exact manual step-by-step workflow you just used to get everything running perfectly—completely bypassing Skaffold for now.

It covers building/loading the images, spinning up the core services, hitting the creation API, and handling all three crucial port-forwards (Router, React UI, and the dynamic Workspace Agent).

---

```md
# GITHUB CODESPACES SANDBOX STARTUP GUIDE (MANUAL WORKFLOW)

Production-style manual startup guide for:
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
├── Template Container (Vite App/React UI)
├── Agent Container (Filesystem + Terminal API)
└── Shared /workspace Volume
↓
AI Service (LangChain + Mistral)

---

# BEFORE CLOSING GITHUB CODESPACE

Cleanup all temporary dynamic sandbox pods/services:
```bash
kubectl delete pod -l app=sandbox-instance --ignore-not-found && \
kubectl delete svc -l app=sandbox-instance --ignore-not-found

```

---

# AFTER REOPENING CODESPACE (FULL START FROM SCRATCH)

---

# 1. START DOCKER

```bash
sudo service docker start

```

Check status:

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

Because we use `imagePullPolicy: Never` for local development, you MUST rebuild these images whenever you make code updates.

```bash
docker build -t sandbox:latest ./sandbox/server && \
docker build -t router:latest ./sandbox/router && \
docker build -t template:latest ./sandbox/template && \
docker build -t agent:latest ./sandbox/agent && \
docker build -t ai-server:latest ./ai

```

---

# 4. LOAD IMAGES INTO KIND

This pushes the locally built docker layers straight into your Kind cluster's memory control plane.

```bash
kind load docker-image sandbox:latest --name sandbox && \
kind load docker-image router:latest --name sandbox && \
kind load docker-image template:latest --name sandbox && \
kind load docker-image agent:latest --name sandbox && \
kind load docker-image ai-server:latest --name sandbox

```

---

# 5. APPLY KUBERNETES FILES

Apply your static deployment manifests:

```bash
kubectl apply -f k8s/

```

---

# 6. CHECK ALL DEPLOYMENTS & PODS

```bash
kubectl get deploy

```

Stream pod status until all report `Running`:

```bash
kubectl get pods -w

```

---

# 7. PORT FORWARD ROUTER SERVICE (TERMINAL 1)

Keep this terminal open. Without it, `/start` and your main proxy mapping fail.

```bash
kubectl port-forward svc/router-service 3000:80 --address 0.0.0.0

```

---

# 8. CREATE DYNAMIC SANDBOX INSTANCE (TERMINAL 2)

Fire a request to spin up your containerized React runtime workspace:

```bash
curl -X POST http://localhost:3000/api/sandbox/start

```

**Example JSON Response:**

```json
{
    "message": "Sandbox started",
    "sandboxId": "019e4ac3-0c9a-71a8-9b5a-59ec31dcfdb0",
    "podName": "sandbox-pod-019e4ac3-0c9a-71a8-9b5a-59ec31dcfdb0",
    "previewService": "sandbox-service-019e4ac3-0c9a-71a8-9b5a-59ec31dcfdb0",
    "agentService": "agent-service-019e4ac3-0c9a-71a8-9b5a-59ec31dcfdb0",
    "previewUrl": "/preview/019e4ac3-0c9a-71a8-9b5a-59ec31dcfdb0/"
}

```

*Copy your exact `previewService` and `agentService` strings from your actual response output for the next steps.*

---

# 9. PORT FORWARD THE REACT FRONTEND PREVIEW UI (TERMINAL 3)

Forward your dynamic sandbox instance frontend (Vite app on port `5173` mapped through service port `80`):

```bash
# REPLACE with your real previewService string
kubectl port-forward svc/sandbox-service-019e4ac3-0c9a-71a8-9b5a-59ec31dcfdb0 5173:80 --address 0.0.0.0

```

Open the application inside your browser using the Codespace domain layout:

```txt
https://YOUR_CODESPACE_NAME-5173.app.github.dev/

```

---

# 10. PORT FORWARD THE WORKSPACE AGENT API (TERMINAL 4)

Forward the filesystem manager backend container for terminal websockets and file reading/writing:

```bash
# REPLACE with your real agentService string
kubectl port-forward svc/agent-service-019e4ac3-0c9a-71a8-9b5a-59ec31dcfdb0 4000:3000 --address 0.0.0.0

```

Open/Verify in Codespaces:

```txt
https://YOUR_CODESPACE_NAME-4000.app.github.dev/

```

---

# AGENT ROUTES VERIFICATION

## GET / (Health Check)

```bash
curl http://localhost:4000/

```

Expected Response:

```json
{
  "message": "Hello from sandbox agent!",
  "status": "success"
}

```

```
***

```