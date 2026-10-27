'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Added `priority?: string` to accept priority levels from the customer form
export async function submitTicket(formData: { name: string; description: string; priority?: string }) {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert([
        {
          customer_name: formData.name,
          issue_description: formData.description,
          priority: formData.priority || 'normal', // Default to normal if empty
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

export async function updateTicketStatus(id: string, status: string) {
  try {
    const { error } = await supabase
      .from('tickets')
      .update({ status })
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err: any) {
    console.error('Error updating ticket status:', err)
    return { success: false, error: err.message }
  }
}