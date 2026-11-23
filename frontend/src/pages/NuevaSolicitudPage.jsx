import { useNavigate } from 'react-router-dom';
import { FilePlus2 } from 'lucide-react';
import Layout from '../components/Layout/Layout.jsx';
import FormatoForm from '../components/Formato/FormatoForm.jsx';

export default function NuevaSolicitudPage() {
  const navigate = useNavigate();
  return (
    <Layout>
      <div className="flex items-center gap-2 mb-6">
        <FilePlus2 size={22} className="text-isp-navy" />
        <h1 className="text-2xl font-bold text-isp-navy">Nueva solicitud</h1>
      </div>
      <div className="max-w-2xl">
        <FormatoForm onCreada={() => setTimeout(() => navigate('/'), 1200)} />
      </div>
    </Layout>
  );
}
