# Этот Dockerfile оставлен для справки.
# Для продакшен-сборки используйте корневой Dockerfile.webapp (собирается из корня монорепо):
#   docker build -f ../../Dockerfile.webapp -t spinthe-webapp ../..
FROM nginx:1.27-alpine
COPY ../../packages/webapp/nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
