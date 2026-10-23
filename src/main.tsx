import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Elemento #root não encontrado.');

const root = createRoot(container);

function StartupError({ missingConfig = false }: { missingConfig?: boolean }) {
  return (
    <main className="min-h-screen bg-[#0A0A0F] text-zinc-100 flex items-center justify-center p-6">
      <section role="alert" className="w-full max-w-xl rounded-2xl border border-indigo-500/30 bg-[#141420] p-6 shadow-2xl">
        <div className="text-sm font-semibold text-cyan-300 mb-2">Sistema de Draft</div>
        <h1 className="text-2xl font-bold mb-3">
          {missingConfig ? 'Configuração do Supabase necessária' : 'Não foi possível iniciar o sistema'}
        </h1>
        <p className="text-zinc-300 mb-4">
          {missingConfig
            ? 'O aplicativo não encontrou as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY com valores válidos.'
            : 'Ocorreu um erro ao carregar o aplicativo. Abra o console do navegador (F12) para obter os detalhes.'}
        </p>
        {missingConfig && (
          <ol className="list-decimal ml-5 space-y-2 text-zinc-300 text-sm">
            <li>Na pasta do projeto, copie <code className="text-cyan-200">.env.example</code> para <code className="text-cyan-200">.env.local</code>.</li>
            <li>Preencha as duas variáveis VITE_SUPABASE_* com o endereço e a chave pública (publishable/anon) do seu projeto Supabase.</li>
            <li>Salve o arquivo e reinicie <code className="text-cyan-200">npm run dev</code>.</li>
          </ol>
        )}
        <p className="text-zinc-500 text-xs mt-5">Nunca coloque a chave secret ou service_role no frontend.</p>
      </section>
    </main>
  );
}

const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const publishableKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
const isConfigured =
  /^https?:\/\//.test(url) &&
  !url.includes('YOUR_SUPABASE') &&
  !!publishableKey &&
  !publishableKey.includes('YOUR_SUPABASE');

if (!isConfigured) {
  root.render(<StartupError missingConfig />);
} else {
  // Importação tardia: qualquer erro na inicialização do SDK não impede a tela de diagnóstico.
  import('./App.tsx')
    .then(({ default: App }) => {
      root.render(
        <StrictMode>
          <ErrorBoundary>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </ErrorBoundary>
        </StrictMode>,
      );
    })
    .catch((error) => {
      console.error('Falha ao inicializar o Sistema de Draft:', error);
      root.render(<StartupError />);
    });
}
