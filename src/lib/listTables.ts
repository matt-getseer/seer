import { supabase } from './supabase'

async function listTables() {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .not('table_name', 'like', 'pg_%')
    .not('table_name', 'like', '_prisma_%')

  if (error) {
    console.error('Error fetching tables:', error)
    return
  }

  console.log('Available tables:', data?.map(t => t.table_name))
}

listTables() 