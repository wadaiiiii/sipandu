#!/bin/bash

echo "=============================================="
echo " SIPANDU BIND RELEASE TO PRODUCTION"
echo " SAFE MODE"
echo "=============================================="


cd /home/matematikaunsulb/apps/sipandu/current || exit 1


echo ""
echo "[1] FETCH"

git fetch origin production


echo ""
echo "[2] CREATE LOCAL PRODUCTION BRANCH"

git checkout -B production origin/production


echo ""
echo "[3] CHECK"

git status

echo ""
echo "=============================================="
echo " SELESAI"
echo "=============================================="
