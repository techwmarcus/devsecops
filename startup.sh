#!/bin/bash

welcome() {
  echo "Welcome to the DevSecOps Workshop"
  echo "This script will install ArgoCD and configure it for you"
  echo "Please ensure you have Helm installed and configured"
}

welcome
echo "creating prod namespace"
kubectl create namespace prod
echo "Installing ArgoCD"
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
helm install argocd argo/argo-cd --namespace argocd --create-namespace
kubectl apply -f argocd.yaml