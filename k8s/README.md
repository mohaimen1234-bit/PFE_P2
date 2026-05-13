# CMMS Kubernetes Deployment Guide

This folder contains all Kubernetes manifests to deploy the CMMS application on a local Minikube cluster.

## 📁 File Overview

| File | Description |
|---|---|
| `namespace.yaml` | Creates the `cmms` namespace |
| `secrets.yaml` | PostgreSQL credentials (db name, user, password) |
| `configmap.yaml` | Non-sensitive config (DB host, ports, Spring Boot settings) |
| `postgres.yaml` | PostgreSQL PVC + Deployment + Service |
| `backend.yaml` | Spring Boot backend Deployment + Service |
| `frontend.yaml` | Next.js frontend Deployment + Service (NodePort) |
| `ingress.yaml` | NGINX Ingress routing for `cmms.local` |

---

## ✅ Prerequisites

Make sure the following are installed and running before you start:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)

Verify Minikube is running:
```powershell
minikube status
kubectl get nodes
```

---

## 🚀 Step 1 — Load Your Docker Images into Minikube

> Since you built images locally with Docker Desktop, you need to load them into Minikube's image registry.

```powershell
# Load the backend image
minikube image load pfe_p2-cmms-backend:latest

# Load the frontend image
minikube image load pfe_p2-cmms-frontend:latest
```

> **Then update `backend.yaml` and `frontend.yaml`** to use these image names:
> ```yaml
> image: pfe_p2-cmms-backend:latest
> image: pfe_p2-cmms-frontend:latest
> ```

---

## 🚀 Step 2 — Enable the NGINX Ingress Addon

```powershell
minikube addons enable ingress
```

Wait until the ingress controller pod is running:
```powershell
kubectl get pods -n ingress-nginx
```

---

## 🚀 Step 3 — Deploy Everything

Apply all manifests at once from the project root:

```powershell
kubectl apply -f k8s/
```

Kubernetes will apply them in this logical order:
1. `namespace.yaml`
2. `secrets.yaml`
3. `configmap.yaml`
4. `postgres.yaml`
5. `backend.yaml`
6. `frontend.yaml`
7. `ingress.yaml`

---

## 🔍 Step 4 — Verify Deployment

Check that all pods are **Running**:
```powershell
kubectl get pods -n cmms
```

Expected output (wait ~2 minutes for pods to become Ready):
```
NAME                             READY   STATUS    RESTARTS
postgres-xxxx                    1/1     Running   0
cmms-backend-xxxx                1/1     Running   0
cmms-backend-xxxx                1/1     Running   0
cmms-frontend-xxxx               1/1     Running   0
cmms-frontend-xxxx               1/1     Running   0
```

Check services:
```powershell
kubectl get svc -n cmms
```

Check ingress:
```powershell
kubectl get ingress -n cmms
```

---

## 🌐 Step 5 — Access the App

### Option A: Via NodePort (Simplest — No hosts file needed)

```powershell
minikube service frontend-service -n cmms
```

This opens a browser tunnel directly to your frontend.

### Option B: Via Ingress (Using `cmms.local`)

**1. Get the Minikube IP:**
```powershell
minikube ip
```

**2. Add to Windows hosts file** (requires Administrator):

Open PowerShell **as Administrator** and run:
```powershell
Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "<MINIKUBE_IP> cmms.local"
```
Replace `<MINIKUBE_IP>` with the actual IP from the previous command. Example:
```
192.168.49.2 cmms.local
```

**3. Open in browser:**
- Frontend: http://cmms.local
- Backend API: http://cmms.local/api

---

## 🐛 Debugging Tips

**View logs for a specific pod:**
```powershell
# Get pod name first
kubectl get pods -n cmms

# View logs
kubectl logs <pod-name> -n cmms

# Follow logs in real-time
kubectl logs -f <pod-name> -n cmms
```

**Describe a pod (see events and errors):**
```powershell
kubectl describe pod <pod-name> -n cmms
```

**Check if postgres is ready:**
```powershell
kubectl exec -it <postgres-pod-name> -n cmms -- psql -U cmms_user -d cmms
```

**Restart a deployment:**
```powershell
kubectl rollout restart deployment/cmms-backend -n cmms
kubectl rollout restart deployment/cmms-frontend -n cmms
```

---

## 🧹 Teardown — Delete Everything

```powershell
# Delete all resources in the cmms namespace
kubectl delete -f k8s/

# Or delete the entire namespace (removes everything inside it)
kubectl delete namespace cmms
```

---

## 🔮 Next Steps (Planned)

- [ ] CI/CD pipeline with GitHub Actions
- [ ] Prometheus + Grafana monitoring
- [ ] Argo CD GitOps deployment
- [ ] Helm chart packaging
- [ ] Resource autoscaling (HPA)
