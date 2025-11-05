// client/src/lib/auth.ts
import { supabase } from './supabaseClient'
import { queryClient } from './queryClient'

// ------------------------
// User interface
// ------------------------
export interface User {
  id: string
  phone?: string
  email?: string
  role: 'admin' | 'agent' | 'farmer'
  name: string
}

// ------------------------
// Helper: format phone to E.164
// ------------------------
function formatPhone(phone: string, countryCode = '+234'): string {
  if (phone.startsWith('+')) return phone
  return countryCode + phone.replace(/^0/, '')
}

// ------------------------
// LOGIN: phone OR email + password
// ------------------------
export async function login(identifier: string, password: string): Promise<User> {
  let supaUser;

  if (/\S+@\S+\.\S+/.test(identifier)) {
    // Email login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    });
    if (error) throw new Error(error.message);
    supaUser = data.user;
  } else {
    // Phone login
    const { data, error } = await supabase.auth.signInWithPassword({
      phone: formatPhone(identifier),
      password,
    });
    if (error) throw new Error(error.message);
    supaUser = data.user;
  }

  if (!supaUser) throw new Error("No user found");

  return {
    id: supaUser.id,
    phone: supaUser.phone ?? undefined,
    email: supaUser.email ?? undefined,
    name: supaUser.user_metadata?.name ?? "",
    role: supaUser.user_metadata?.role ?? "farmer",
  };
}

// ------------------------
// REGISTER: create new user via phone
// ------------------------
export async function register(data: {
  phone: string
  password: string
  role: 'admin' | 'agent' | 'farmer'
  name: string
}): Promise<User> {
  const formattedPhone = formatPhone(data.phone)

  const { data: result, error } = await supabase.auth.signUp({
    phone: formattedPhone,
    password: data.password,
    options: {
      data: { role: data.role, name: data.name },
    },
  })

  if (error) throw new Error(error.message)

  const supaUser = result.user
  if (!supaUser) throw new Error('No user created')

  return {
    id: supaUser.id,
    phone: supaUser.phone ?? undefined,
    name: data.name,
    role: data.role,
  }
}

// ------------------------
// LOGOUT
// ------------------------
export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
  queryClient.clear()
}

// ------------------------
// GET CURRENT USER
// ------------------------
export async function getCurrentUser(): Promise<User | null> {
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session
  const supaUser = session?.user

  if (!supaUser) return null

  return {
    id: supaUser.id,
    phone: supaUser.phone ?? undefined,
    email: supaUser.email ?? undefined,
    name: supaUser.user_metadata?.name ?? '',
    role: supaUser.user_metadata?.role ?? 'farmer',
  }
}
