import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Anon Key:', supabaseAnonKey ? '[PRESENT]' : '[MISSING]')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    const { data, error } = await supabase.from('surveys').select('id').limit(1)
    if (error) throw error
    console.log('Connection successful!')
    console.log('Test query result:', data)
  } catch (error) {
    console.error('Connection failed:', error.message)
  }
}

testConnection() 