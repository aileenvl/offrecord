import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',timeout:45000,workers:1,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:420,height:1000},screenshot:'only-on-failure'},webServer:{command:'npm run dev',url:'http://127.0.0.1:4173',reuseExistingServer:true}});
