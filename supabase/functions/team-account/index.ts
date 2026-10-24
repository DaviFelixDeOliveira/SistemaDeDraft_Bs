import {createClient} from 'npm:@supabase/supabase-js@2.76.1';
const cors={
 'Access-Control-Allow-Origin':'*',
 'Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type',
 'Access-Control-Allow-Methods':'POST, OPTIONS'
};
const respond=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,
 headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const DOMAIN='teams.sistema-de-draft.invalid';
const normalize=(text:string)=>text.trim().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^a-z0-9]/g,'');
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return respond({error:'Método não permitido'},405);
 const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
 if(!token)return respond({error:'Faça login para alterar sua conta.'},401);
 const url=Deno.env.get('SUPABASE_URL');
 const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const anonKey=Deno.env.get('SUPABASE_ANON_KEY');
 if(!url||!serviceKey||!anonKey)return respond({error:'Configuração de autenticação indisponível.'},503);
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await admin.auth.getUser(token);
 if(authError||!auth.user?.email?.endsWith('@'+DOMAIN))
   return respond({error:'Sessão de equipe inválida.'},401);
 let body:{action?:string;currentPassword?:string;newPassword?:string;newName?:string};
 try{body=await req.json();}catch{return respond({error:'Dados inválidos.'},400);}
 if(typeof body.currentPassword!=='string'||!body.currentPassword||body.currentPassword.length>128)
   return respond({error:'Informe a senha atual.'},400);
 if(body.action!=='rename-team'&&body.action!=='change-password')
   return respond({error:'Ação inválida.'},400);
 const candidate=typeof body.newName==='string'?body.newName.trim().replace(/\s+/g,' '):'';
 const username=normalize(candidate);
 if(body.action==='rename-team'&&(candidate.length<3||candidate.length>60||!/^[a-z0-9]{3,32}$/.test(username)))
   return respond({error:'Informe um nome que gere identificador de 3 a 32 caracteres.'},400);
 if(body.action==='change-password'&&
   (typeof body.newPassword!=='string'||body.newPassword.length<12||body.newPassword.length>128))
   return respond({error:'A nova senha deve conter de 12 a 128 caracteres.'},400);
 if(body.action==='change-password'&&body.newPassword===body.currentPassword)
   return respond({error:'A nova senha deve ser diferente da senha atual.'},400);
 // Cliente efêmero: validar o segredo, sem usá-lo como sessão persistida nem registrá-lo.
 const verifier=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:verified,error:passwordError}=await verifier.auth.signInWithPassword({
   email:auth.user.email,password:body.currentPassword
 });
 if(passwordError||verified.user?.id!==auth.user.id)
   return respond({error:'Senha atual incorreta.'},401);
 try{
   if(body.action==='rename-team'){
     const nextEmail=username+'@'+DOMAIN;
     if(auth.user.email===nextEmail) {
       const {error}=await admin.auth.admin.updateUserById(auth.user.id,{
         user_metadata:{...auth.user.user_metadata,team_display_name:candidate}});
       if(error)throw error;
       return respond({ok:true,username,displayName:candidate});
     }
     const {error}=await admin.auth.admin.updateUserById(auth.user.id,{
       email:nextEmail,email_confirm:true,
       user_metadata:{...auth.user.user_metadata,team_display_name:candidate}
     });
     if(error)return respond({error:'Este identificador já pode estar em uso ou não foi aceito. Escolha outro nome.'},409);
     return respond({ok:true,username,displayName:candidate});
   }
   const {error}=await admin.auth.admin.updateUserById(auth.user.id,{password:body.newPassword!});
   if(error)return respond({error:'Não foi possível alterar a senha.'},422);
   return respond({ok:true});
 }catch{
   return respond({error:'Não foi possível salvar a alteração. Tente novamente.'},500);
 }
});
