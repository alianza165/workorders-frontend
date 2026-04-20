#!/bin/bash
rsync -avz \
  --exclude='xmrig*' \
  --exclude='scanner_linux' \
  --exclude='*.log' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='backup-repo' \
  -e "ssh -i /home/ali/.ssh/diamond_tyres.pem" \
  ubuntu@54.225.146.37:/home/ubuntu/diamond/frontend/workorders-frontend/ \
  /home/ali/diamond/backup/
