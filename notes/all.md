# GITHUB CODESPACES SANDBOX STARTUP GUIDE

## BEFORE CLOSING GITHUB CODESPACE

Run this cleanup command:

```bash id="4m9t8q"
kubectl delete pod -l app=sandbox-instance --ignore-not-found && kubectl delete svc -l app=sandbox-instance --ignore-not-found
```

---

# AFTER REOPENING CODESPACE (FULL START FROM SCRATCH)

## 1. Start Docker

```bash id="6w2x1p"
sudo service docker start
```

---

## 2. Start Kind Cluster

```bash id="7r5v9m"
kind create cluster --name sandbox
```

If already exists:

```bash id="0p8n4k"
kind get clusters
```

---

## 3. Build All Docker Images

```bash id="3q7x6z"
docker build -t sandbox:latest ./sandbox/server && docker build -t router:latest ./sandbox/router && docker build -t template:latest ./sandbox/template && docker build -t agent:latest ./sandbox/agent
```

---

## 4. Load Images Into Kind

```bash id="5m1c8v"
kind load docker-image sandbox:latest --name sandbox && kind load docker-image router:latest --name sandbox && kind load docker-image template:latest --name sandbox && kind load docker-image agent:latest --name sandbox
```

---

## 5. Apply Kubernetes Files

```bash id="2v9k4r"
kubectl apply -f kubernetes/
```

OR if separate files:

```bash id="8x6t3p"
kubectl apply -f k8s/
```

---

## 6. Check Pods

```bash id="1n5w7q"
kubectl get pods -w
```

Wait until:

* router-deployment Running
* sandbox-deployment Running

---

## 7. Forward Router Port

```bash id="9p4m2x"
kubectl port-forward svc/router-service 3000:80 --address 0.0.0.0
```

KEEP THIS TERMINAL OPEN.

---

# NEW TERMINAL

## 8. Create Sandbox

```bash id="4z8v1k"
curl -X POST http://localhost:3000/api/sandbox/start
```

Copy:

* sandboxId
* previewUrl

---

## 9. Open Preview

```txt id="7c2n5m"
https://YOUR_CODESPACE-3000.app.github.dev/preview/SANDBOX_ID/
```

---

# DEBUG COMMANDS

## Live Pod Logs

```bash id="5v7x0q"
kubectl logs -f sandbox-pod-SANDBOX_ID -c sandbox-preview
```

---

## Agent Logs

```bash id="6m3k9r"
kubectl logs -f sandbox-pod-SANDBOX_ID -c agent
```

---

## Router Logs

```bash id="0x2p8v"
kubectl logs -f deploy/router-deployment
```

---

## Check Services

```bash id="8w1m6n"
kubectl get svc
```

---

## Check Sandbox HTML From Router

```bash id="9q4v7x"
kubectl exec -it deploy/router-deployment -- wget -qO- http://sandbox-service-SANDBOX_ID
```

---

## Delete All Sandbox Pods

```bash id="2m7x9p"
kubectl delete pod -l app=sandbox-instance
```

---

## Delete All Sandbox Services

```bash id="1v4n8q"
kubectl delete svc -l app=sandbox-instance
```

---

# IMPORTANT

Router port-forward terminal MUST stay open.

Without this:

* `/start` will fail
* preview URLs will fail
* Codespaces browser preview will fail

sandbox agent port forward
kubectl port-forward svc/agent-service-019e4543-6575-7178-beb6-70bdcdf60d14 4000:3000