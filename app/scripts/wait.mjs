for(const url of ['http://127.0.0.1:4000/api/v1/health','http://127.0.0.1:3000/health']){
 let ready=false;for(let attempt=0;attempt<40;attempt++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
 if(!ready)throw new Error('Server did not become healthy: '+url);
}
