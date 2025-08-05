import dotenv from 'dotenv'; dotenv.config({path: './.env'}); console.log('DEBUG - process.env.PORT:', process.env.PORT); console.log('DEBUG - Final PORT:', process.env.PORT || 3002);
