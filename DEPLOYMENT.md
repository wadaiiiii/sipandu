\# SiPANDU Deployment Flow





\## Development Lokal



1\. Clone repository



git clone





2\. Copy environment



cp .env.example .env





3\. Isi database lokal





4\. Jalankan:



composer install



npm install



php artisan migrate



npm run dev







\## Production cPanel



.env dibuat manual di server.



Jangan mengambil .env dari GitHub.





Update:



git pull origin main





Kemudian:



composer install --no-dev



php artisan migrate



php artisan optimize:clear



npm run build



\## Setelah Update Production



php artisan storage:link



php artisan optimize:clear



php artisan config:cache



php artisan route:cache



php artisan view:cache

