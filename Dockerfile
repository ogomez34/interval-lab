# Unprivileged variant: runs as uid 101 (nginx) by default and listens on
# 8080, so the container needs no root/CAP_NET_BIND_SERVICE even with a
# read-only root filesystem and all other capabilities dropped (see k8s
# securityContext in notes-maker-infra's app.tf).
FROM nginxinc/nginx-unprivileged:stable-alpine

# Pick up the latest Alpine security patches (e.g. zlib CVEs) on top of the
# base image's package set. Requires root during build; the image (and the
# k8s securityContext in notes-maker-infra) still runs as uid 101 at runtime.
USER root
RUN apk update && apk upgrade --no-cache

COPY --chown=nginx:nginx nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx . /usr/share/nginx/html
RUN rm -rf /usr/share/nginx/html/nginx /usr/share/nginx/html/.dockerignore

USER nginx

EXPOSE 8080
