# Before Closing GitHub Codespaces

## 1. Stop Port Forward

If running:

```bash
kubectl port-forward service/sandbox-service 3000:80
```

Press:

```bash
CTRL + C
```

---

## 2. Check Pods

```bash
kubectl get pods
```

Optional check before shutdown.

---

## 3. Delete Kubernetes Cluster

IMPORTANT:

```bash
kind delete cluster --name sandbox
```

This stops:
- Kubernetes
- Pods
- Services
- Ingress
- Containers

and saves Codespaces resources.

Expected:

```bash
Deleting cluster "kind" ...
Deleted nodes: ["kind-control-plane"]
```

---

## 4. Optional Docker Cleanup

Check images:

```bash
docker images
```

Remove unused images:

```bash
docker system prune -a
```

WARNING:
This deletes unused Docker data.

---

# Next Time Start Again

## Create Cluster

```bash
kind create cluster
```

---

## Install Ingress

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
```

---

## Build Docker Image

```bash
cd sandbox

docker build -t sandbox:latest -f dockerfile .
```

---

## Load Image Into kind

```bash
kind load docker-image sandbox:latest
```

---

## Apply Kubernetes Files

```bash
kubectl apply -f k8s/
```

---

## Start Port Forward

```bash
kubectl port-forward service/sandbox-service 3000:80
```

---