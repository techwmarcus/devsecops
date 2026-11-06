set -a; source ../mortgage-app/.env.example; set +a
envsubst < secrets.yaml | kubectl apply -f -