Based on your shared architecture, active ports, and the exact multi-port GitHub Codespaces setup you are using, here is your updated, fully tailored guide.

This guide eliminates localhost confusion, handles the multi-domain CORS mappings, and gives you a single source of truth to follow every time you start up.

Save this file as **`RUN_GUIDE.md`** in your project root directory.

---

```markdown
# GITHUB CODESPACES SANDBOX CONFIGURATION & STARTUP GUIDE

This document serves as the master guide for booting, configuring, and port-forwarding the microservice-based browser IDE platform inside GitHub Codespaces.

---

## 1. Core Architecture & Ports

Because our frontend IDE, sandbox previews, agent backend, and AI engines run across different containers and domains, you **must** ensure the following specific ports are forwarded and marked as **Public** in your GitHub Codespaces Ports panel:

| Service Name | Local Port | Public Codespaces URL Environment |
| :--- | :--- | :--- |
| **Sandbox Orchestrator / Router** | `3000` | `https://supreme-potato-pj4v4xgpxwpvc6p4-3000.app.github.dev` |
| **AI Service Backend** | `3001` | `https://supreme-potato-pj4v4xgpxwpvc6p4-3001.app.github.dev` |
| **Dynamic Sandbox Preview UI** | `5173` | `https://supreme-potato-pj4v4xgpxwpvc6p4-5173.app.github.dev` |
| **Dynamic Agent API / WebSockets** | `4000` | `https://supreme-potato-pj4v4xgpxwpvc6p4-4000.app.github.dev` |
| **Main IDE Frontend Client** | `5174` | `https://supreme-potato-pj4v4xgpxwpvc6p4-5174.app.github.dev` |

> ⚠️ **CRITICAL SECURITY NOTE:** Go to your **Ports** tab in Codespaces, right-click on ports `3000`, `3001`, `4000`, `5173`, and `5174`, and select **Port Visibility -> Public**. If left as private, the browser will drop the Cross-Origin (CORS) fetch and WebSocket requests.

---

## 2. Step-by-Step Startup Sequence

### Step 1: Start Docker & Create the Cluster
Inside your main Codespace terminal, run:
```bash
sudo service docker start
# Verify docker is running
docker ps

# Create Kind Cluster (Skip if already built)
kind create cluster --name sandbox

```

### Step 2: Build & Load Microservices Images

Whenever you update service codes, rebuild and inject the layers directly into Kind's memory plane:

```bash
docker build -t sandbox:latest ./sandbox/server && \
docker build -t router:latest ./sandbox/router && \
docker build -t template:latest ./sandbox/template && \
docker build -t agent:latest ./sandbox/agent && \
docker build -t ai-server:latest ./ai

kind load docker-image sandbox:latest --name sandbox && \
kind load docker-image router:latest --name sandbox && \
kind load docker-image template:latest --name sandbox && \
kind load docker-image agent:latest --name sandbox && \
kind load docker-image ai-server:latest --name sandbox

```

### Step 3: Apply Kubernetes Engine

Deploy your manifests into your cluster namespace:

```bash
kubectl apply -f k8s/
# Wait until core system deployments read 'Running'
kubectl get pods -w

```

---

## 3. The 4 Mandatory Terminal Port-Forwards

Open **4 separate split-terminal windows** inside your VS Code interface to maintain active tunnels for your components:

### 🖥️ Terminal 1: Core Router (Port 3000)

Monitors global orchestrator `/api/sandbox/start` actions.

```bash
kubectl port-forward svc/router-service 3000:80 --address 0.0.0.0

```

### 🧠 Terminal 2: AI Engine Server (Port 3001)

Streams token chunks and code generator pipelines.

```bash
kubectl port-forward svc/ai-service 3001:80 --address 0.0.0.0

```

### 📂 Terminal 3: Sandbox Instance Agent (Port 4000)

*Run this immediately after spawning a sandbox instance.* Replace the service hash with your active response ID:

```bash
# Check your active services to find your target service name:
kubectl get svc

# Forward target instance agent to port 4000
kubectl port-forward svc/agent-service-019e5a87-4293-7424-bfb9-edf85e6ad888 4000:3000 --address 0.0.0.0

```

### 🌐 Terminal 4: App Preview Interface (Port 5173)

Renders live Vite app previews within your IDE iframe structure.

```bash
# Forward target sandbox UI port to 5173
kubectl port-forward svc/sandbox-service-019e5a7e-c6a8-742f-8fef-dfa5ff0575c6 5173:80 --address 0.0.0.0

```

---

## 4. Frontend Environment Setup

To keep runtime configs modular without breaking across individual session changes, make sure your frontend client repository folder has an active `.env` file containing these explicit endpoints:

```env
VITE_ROUTER_API=[https://supreme-potato-pj4v4xgpxwpvc6p4-3000.app.github.dev](https://supreme-potato-pj4v4xgpxwpvc6p4-3000.app.github.dev)
VITE_AI_API=[https://supreme-potato-pj4v4xgpxwpvc6p4-3001.app.github.dev](https://supreme-potato-pj4v4xgpxwpvc6p4-3001.app.github.dev)
VITE_AGENT_API=[https://supreme-potato-pj4v4xgpxwpvc6p4-4000.app.github.dev](https://supreme-potato-pj4v4xgpxwpvc6p4-4000.app.github.dev)
VITE_PREVIEW_BASE=[https://supreme-potato-pj4v4xgpxwpvc6p4-5173.app.github.dev](https://supreme-potato-pj4v4xgpxwpvc6p4-5173.app.github.dev)

```

---

## 5. Daily Cleanup Routine

Before turning off or closing down your workspace session, wipe out ephemeral runtime resources safely to prevent resource leaks while maintaining underlying build layers:

```bash
# Clean active development instances cleanly
kubectl delete pod,svc -l app=sandbox-instance --ignore-not-found

```

```

---

### Summary of What This Fixes For You:
* **Resolves Port Chaos:** It clearly defines why port `5174` (your main app) needs to talk to `4000` (Filesystem/Term) and `5173` (Iframe preview).
* **Fixes the CORS Blindspot:** Reminds you to make all ports **Public** inside your Codespaces dashboard, which is the primary reason why `net::ERR_FAILED` occurs even when the backend returns a `200 OK`.

```