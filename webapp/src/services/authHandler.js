import { supabase } from '../supabase'

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    if (error) {
        console.log("sign in error", error)
        return null;
    }

    console.log("sign in data", data)

    return data
}

export async function signUp(email, password, name, userType, schoolId) {
    const { data, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: name,
                user_type: userType,
                school_id: schoolId
            }
        }
    });

    if (authError) { 
        console.log("sign up error", authError)
        return null;
    }

    console.log("sign up data", data)
    return data;
}