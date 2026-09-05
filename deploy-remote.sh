#!/bin/bash

cd /home/matematikaunsulb/apps/sipandu

echo "BACKUP BUILD"

cd current

STAMP=$(date +%Y%m%d%H%M)

if [ -d public/build ]; then
    mv public/build public/build-backup-$STAMP
fi


echo "EXTRACT BUILD"

unzip -o ../sipandu-build-final.zip -d public/


echo "CLEAR CACHE"

php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache


echo "CHECK BUILD"

ls -lt public/build/assets/classroom-v2-*.js | head


echo "DEPLOY FINISH"
