import { useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../firebase.js'
import { MOCK_MODE } from '../mock/mode.js'
import { MOCK_USER, resetMockData } from '../mock/data.js'

const googleProvider = new GoogleAuthProvider()

function useFirebaseAuth() {
  // undefined = loading, null = not logged in, object = logged in
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    return onAuthStateChanged(auth, setUser)
  }, [])

  async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider)
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  return { user, signInWithGoogle, signOut }
}

// Demo mode: always signed in as a fake user with no uid, so every data hook stays
// on its localStorage path. "Esci" restores the sample data.
function useMockAuth() {
  return {
    user: MOCK_USER,
    signInWithGoogle: async () => {},
    signOut: async () => resetMockData(),
  }
}

export const useAuth = MOCK_MODE ? useMockAuth : useFirebaseAuth
