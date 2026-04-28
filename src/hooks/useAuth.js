import { useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../firebase.js'

const googleProvider = new GoogleAuthProvider()
const appleProvider = new OAuthProvider('apple.com')

export function useAuth() {
  // undefined = loading, null = not logged in, object = logged in
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    return onAuthStateChanged(auth, setUser)
  }, [])

  async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider)
  }

  async function signInWithApple() {
    appleProvider.addScope('email')
    appleProvider.addScope('name')
    await signInWithPopup(auth, appleProvider)
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  return { user, signInWithGoogle, signInWithApple, signOut }
}
