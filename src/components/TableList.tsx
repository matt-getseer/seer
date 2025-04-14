import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function TableList() {
  const [tables, setTables] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTables() {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .not('table_name', 'like', 'pg_%')
        .not('table_name', 'like', '_prisma_%')

      if (error) {
        setError(error.message)
        return
      }

      setTables(data?.map(t => t.table_name) || [])
    }

    fetchTables()
  }, [])

  if (error) return <div>Error loading tables: {error}</div>

  return (
    <div>
      <h2>Supabase Tables</h2>
      {tables.length === 0 ? (
        <p>No tables found</p>
      ) : (
        <ul>
          {tables.map(table => (
            <li key={table}>{table}</li>
          ))}
        </ul>
      )}
    </div>
  )
} 
