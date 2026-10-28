import { redirect } from 'next/navigation';

export default function AdminMonitoresRedirectPage() {
  redirect('/admin?tab=monitores');
}
