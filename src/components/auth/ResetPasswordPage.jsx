import {useEffect,useState} from 'react';
import {Lock} from 'lucide-react';
import {Link} from '@tanstack/react-router';
import {appClient} from '@/api/appClient';
import {AuthLayout} from './AuthLayout';
import {AuthError,SubmitButton} from './parts';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useLanguage} from '@/lib/LanguageContext';
export function ResetPasswordPage(){
 const {t}=useLanguage();
 const [ready,setReady]=useState(false),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{appClient.auth.me().then(()=>setReady(true)).catch(()=>setError('This recovery session is missing or expired. Request a new password reset link.'));},[]);
 async function submit(event){event.preventDefault();setError('');if(password!==confirm){setError('Passwords do not match.');return;}setBusy(true);try{await appClient.auth.resetPassword({newPassword:password});await appClient.auth.logout('/login');}catch(error){setError(error.message);setBusy(false);}}
 return <AuthLayout icon={Lock} title={t("New password")} subtitle={t("Secure your AgriWiser account")}><AuthError>{t(error)}</AuthError>{ready&&<form onSubmit={submit} className="space-y-4">{[['reset-password','New password',password,setPassword],['reset-confirm','Confirm password',confirm,setConfirm]].map(([id,label,value,set])=><div key={id} className="space-y-2"><Label htmlFor={id}>{t(label)}</Label><Input id={id} type="password" autoComplete="new-password" minLength={12} maxLength={128} value={value} onChange={e=>set(e.target.value)} required disabled={busy}/></div>)}<SubmitButton busy={busy} busyLabel={t("Resetting…")}>{t("Reset password")}</SubmitButton></form>}<p className="mt-5 text-center text-sm"><Link to="/forgot-password">{t("Request a new recovery link")}</Link></p></AuthLayout>;
}
