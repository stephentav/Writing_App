import {handleCoach,identity} from './coach.mjs';
import assets from './assets.generated.mjs';
export default {async fetch(request,env){
 const url=new URL(request.url),user=identity(request);
 if(url.pathname==='/api/coach')return handleCoach(request,env);
 if(url.pathname==='/api/session')return new Response(JSON.stringify(user?{signedIn:true,email:user.email,coachReady:!!env.OPENAI_API_KEY}:{signedIn:false}),{status:user?200:401,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(!user)return new Response('Sign in to Writing Room.',{status:302,headers:{Location:'/signin-with-chatgpt?return_to=%2F','Cache-Control':'no-store'}});
 const asset=assets[url.pathname==='/'?'/index.html':url.pathname];
 if(!asset||!['GET','HEAD'].includes(request.method))return new Response('Not found',{status:404});
 return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});
}};
