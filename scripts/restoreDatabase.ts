import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Carrega variáveis de ambiente de .env.local se existir
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const matchUrl = line.match(/^VITE_SUPABASE_URL=(.+)$/);
    const matchKey = line.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/);
    if (matchUrl) supabaseUrl = matchUrl[1].trim();
    if (matchKey) supabaseAnonKey = matchKey[1].trim();
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function restoreTable(tableName: string, fileName: string) {
  const filePath = path.resolve(process.cwd(), `Json do banco de dados/${fileName}`);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Arquivo de backup não encontrado: ${filePath}`);
    return;
  }

  const rawData = fs.readFileSync(filePath, 'utf-8');
  let rows: any[];
  try {
    rows = JSON.parse(rawData);
  } catch (err) {
    console.error(`❌ Erro ao ler JSON de ${fileName}:`, err);
    return;
  }

  console.log(`⏳ Restaurando ${rows.length} registros na tabela '${tableName}'...`);

  // Faz upsert em lote para restaurar/atualizar todos os registros mantendo os IDs originais
  const { error } = await supabase.from(tableName).upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error(`❌ Erro ao restaurar tabela '${tableName}':`, error.message);
  } else {
    console.log(`✅ Tabela '${tableName}' restaurada com sucesso! (${rows.length} itens)`);
  }
}

async function runRestore() {
  console.log('🚀 Iniciando restauração do banco de dados Supabase...\n');

  await restoreTable('brawlers', 'Json da tabela brawlers.txt');
  await restoreTable('maps', 'Json da tabela maps.txt');
  await restoreTable('players', 'Json da tabela players.txt');

  console.log('\n🎉 Processo de restauração concluído com sucesso!');
}

runRestore();
