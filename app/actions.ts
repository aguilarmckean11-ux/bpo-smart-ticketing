'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function submitTicket(formData: { name: string; description: string }) {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert([
        {
          customer_name: formData.name,
          issue_description: formData.description,
          status: 'open',
        },
      ])
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Server action error:', err)
    return { success: false, error: err.message || 'Failed to submit ticket' }
  }
}

// Server-side fetch to bypass browser DNS blocks
export async function getTickets() {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Server action fetch error:', err)
    return { success: false, error: err.message }
  }
}