import type {NextConfig} from 'next';
import {readFileSync} from 'node:fs';
let buildId='development';try{buildId=readFileSync('BUILD_ID','utf8').trim();}catch{}
const config:NextConfig={output:'standalone',skipTrailingSlashRedirect:true,poweredByHeader:false,allowedDevOrigins:['*.local'],async rewrites(){return [{source:'/api/:path*',destination:(process.env.INTERNAL_API_URL??'http://127.0.0.1:4000')+'/api/:path*'},{source:'/socket.io/:path*',destination:(process.env.INTERNAL_API_URL??'http://127.0.0.1:4000')+'/socket.io/:path*'}];},async headers(){return [{source:'/sw.js',headers:[{key:'Cache-Control',value:'no-store'},{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'; connect-src 'self'; worker-src 'self'"}]},{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}]}];}};
config.env={NEXT_PUBLIC_BUILD_ID:buildId,NEXT_PUBLIC_COVERAGE:process.env.COVERAGE??'false'};
config.generateBuildId=async()=>buildId;
export default config;
