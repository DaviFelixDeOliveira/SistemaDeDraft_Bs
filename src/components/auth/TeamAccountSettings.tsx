import {useState,type FormEvent} from 'react';
import {KeyRound,ShieldCheck,UserRound,Loader2} from 'lucide-react';
import {teamAuthService,type TeamAccount} from '../../services/teamAuthService';

export function TeamAccountSettings({team,onChanged}:{team:TeamAccount;onChanged:(next:TeamAccount)=>void}){
  const [name,setName]=useState(team.displayName);
  const [namePassword,setNamePassword]=useState('');
  const [currentPassword,setCurrentPassword]=useState('');
  const [nextPassword,setNextPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [saving,setSaving]=useState<'name'|'password'|null>(null);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const handleRename=async(event:FormEvent)=>{
    event.preventDefault();
    setError('');setMessage('');setSaving('name');
    try{
      const changed=await teamAuthService.changeUsername(name,namePassword);
      onChanged(changed);setNamePassword('');
      setMessage('Identificador alterado. Use o novo nome no próximo login.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível alterar o login.');}
    finally{setSaving(null);}
  };
  const handleChangePassword=async(event:FormEvent)=>{
    event.preventDefault();setError('');setMessage('');
    if(nextPassword!==confirmPassword){setError('A confirmação não corresponde à senha nova.');return;}
    setSaving('password');
    try{
      await teamAuthService.changePassword(currentPassword,nextPassword);
      setCurrentPassword('');setNextPassword('');setConfirmPassword('');
      setMessage('Senha atualizada. A senha antiga não será mais aceita para um novo login.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível atualizar a senha.');}
    finally{setSaving(null);}
  };
  const input='w-full min-h-11 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-[#090909] dark:text-white';
  const button='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50';
  return <section className="mx-auto max-w-3xl space-y-5">
    <header>
      <h2 className="flex items-center gap-2 text-2xl font-extrabold"><ShieldCheck className="text-indigo-500"/> Conta e Segurança</h2>
      <p className="mt-1 text-sm text-zinc-500">Os dados e partidas pertencem à conta da equipe. Trocar o login não altera o histórico.</p>
    </header>
    {error&&<p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">{error}</p>}
    {message&&<p role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
    <form onSubmit={handleRename} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-[#151515]">
      <h3 className="flex items-center gap-2 text-lg font-bold"><UserRound size={20}/> Alterar nome de login</h3>
      <p className="text-xs text-zinc-500">Login atual: <strong>{team.username}</strong>. Espaços, acentos, hífens e maiúsculas não diferenciam equipes. O sistema verifica a exclusividade no banco.</p>
      <label className="block text-sm font-semibold" htmlFor="new-team-name">Novo nome da equipe</label>
      <input id="new-team-name" required maxLength={60} value={name} onChange={e=>setName(e.target.value)} className={input}/>
      <label className="block text-sm font-semibold" htmlFor="rename-confirm-password">Senha atual para confirmar</label>
      <input id="rename-confirm-password" type="password" autoComplete="current-password" required maxLength={128} value={namePassword} onChange={e=>setNamePassword(e.target.value)} className={input}/>
      <button disabled={!!saving||!name.trim()} className={button} type="submit">{saving==='name'&&<Loader2 size={16} className="animate-spin"/>}Salvar novo login</button>
    </form>
    <form onSubmit={handleChangePassword} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-[#151515]">
      <h3 className="flex items-center gap-2 text-lg font-bold"><KeyRound size={20}/> Alterar senha</h3>
      <p className="text-xs text-zinc-500">A senha é processada pelo Supabase Auth. Nunca é exibida no painel ou armazenada nas tabelas do Sistema de Draft.</p>
      <label className="block text-sm font-semibold" htmlFor="current-password">Senha atual</label>
      <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required maxLength={128} className={input}/>
      <label className="block text-sm font-semibold" htmlFor="new-password">Nova senha (mínimo de 12 caracteres)</label>
      <input id="new-password" type="password" autoComplete="new-password" value={nextPassword} onChange={e=>setNextPassword(e.target.value)} required minLength={12} maxLength={128} className={input}/>
      <label className="block text-sm font-semibold" htmlFor="confirm-new-password">Confirmar nova senha</label>
      <input id="confirm-new-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={12} maxLength={128} className={input}/>
      <button disabled={!!saving} type="submit" className={button}>{saving==='password'&&<Loader2 size={16} className="animate-spin"/>}Atualizar senha</button>
    </form>
  </section>;
}
