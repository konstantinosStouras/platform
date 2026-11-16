import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {getAuth, connectAuthEmulator, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail, signOut} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {getFirestore, connectFirestoreEmulator, doc, collection, getDoc, setDoc, updateDoc, query, where, onSnapshot, runTransaction, writeBatch, serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
import {validateSession, newCode, normalizeCode} from './domain.mjs';
const response = await fetch(new URL('../firebase-config.json', import.meta.url));
if(!response.ok) throw new Error('The service configuration could not be loaded. Please refresh.');
const config=await response.json();
const emulate=['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('emulator')==='1';
if(emulate){config.projectId='demo-marketplace';config.apiKey='demo-key';}
const app = initializeApp(config);
export const auth = getAuth(app), db = getFirestore(app);
if(emulate){connectAuthEmulator(auth,'http://127.0.0.1:9098',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8086);}
export const ownerEmail = 'kstouras@gmail.com';
export const watchAuth = callback => onAuthStateChanged(auth, callback);
export const googleLogin = () => {const p=new GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});return signInWithPopup(auth,p);};
export const emailLogin = (email,password) => signInWithEmailAndPassword(auth,email,password);
export async function register(name,email,password) {
  const {user}=await createUserWithEmailAndPassword(auth,email,password);
  await updateProfile(user,{displayName:name.trim().slice(0,80)});
  await sendEmailVerification(user);
}
export const verifyEmail = () => sendEmailVerification(auth.currentUser);
export async function refreshVerification(){await auth.currentUser.reload();await auth.currentUser.getIdToken(true);}
export const resetPassword = email => sendPasswordResetEmail(auth,email);
export const logout = () => signOut(auth);
export async function isInstructor(user) {
  if(!user?.emailVerified) return false;
  if(user.email===ownerEmail) return true;
  return (await getDoc(doc(db,'instructors',user.email))).data()?.enabled===true;
}
export async function grantInstructor(email) {
  const ref=doc(db,'instructors',email.trim().toLowerCase());
  await runTransaction(db,async tx=>{const existing=await tx.get(ref);tx.set(ref,{enabled:true,createdAt:existing.data()?.createdAt||serverTimestamp()});});
}
export async function createSession(input) {
  const data=validateSession(input), code=newCode();
  const ref=doc(db,'sessions',code);
  await runTransaction(db,async tx=>{
    if((await tx.get(ref)).exists()) throw new Error('Please retry creating the session.');
    tx.set(ref,{...data,ownerId:auth.currentUser.uid,status:'lobby',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  });
  return code;
}
export function watchSessions(instructor,callback,onError) {
  if(instructor) return onSnapshot(query(collection(db,'sessions'),where('ownerId','==',auth.currentUser.uid)), snap=>callback(snap.docs.map(d=>({id:d.id,...d.data()}))),onError);
  return onSnapshot(collection(db,'users',auth.currentUser.uid,'sessions'),async snap=>{
    try {const sessions=await Promise.all(snap.docs.map(d=>getDoc(doc(db,'sessions',d.id))));callback(sessions.filter(d=>d.exists()).map(d=>({id:d.id,...d.data()})));} catch(e){onError(e);}
  },onError);
}
export const readSession = async code => {const d=await getDoc(doc(db,'sessions',normalizeCode(code)));if(!d.exists())throw new Error('Session not found. Check your code.');return {id:d.id,...d.data()};};
export const watchSession = (id,callback,onError) => onSnapshot(doc(db,'sessions',id),d=>callback(d.exists()?{id:d.id,...d.data()}:null),onError);
export function watchMembers(id,owner,callback,onError){
  const ref=owner?collection(db,'sessions',id,'members'):doc(db,'sessions',id,'members',auth.currentUser.uid);
  return onSnapshot(ref,snap=>callback(owner?snap.docs.map(d=>({id:d.id,...d.data()})):snap.exists()?[{id:snap.id,...snap.data()}]:[]),onError);
}
export async function joinSession(code,side) {
  const id=normalizeCode(code), uid=auth.currentUser.uid, ref=doc(db,'sessions',id), member=doc(db,'sessions',id,'members',uid);
  await runTransaction(db,async tx=>{
    const [session,existing]=await Promise.all([tx.get(ref),tx.get(member)]);
    if(!session.exists())throw new Error('Session not found.');
    if(existing.exists())return;
    const s=session.data();
    if(s.mode!=='class'||s.status!=='lobby')throw new Error('This session is not accepting students.');
    if(!s.sides.includes(side))throw new Error('Select a marketplace side.');
    tx.set(member,{alias:'Participant '+crypto.randomUUID().slice(0,8).toUpperCase(),side,kind:'student',joinedAt:serverTimestamp()});
    tx.set(doc(db,'users',uid,'sessions',id),{joinedAt:serverTimestamp()});
  });return id;
}
export const changeStatus = (id,status) => updateDoc(doc(db,'sessions',id),{status,updatedAt:serverTimestamp()});
export async function addTestParticipants(session){
  const batch=writeBatch(db);
  session.sides.forEach((side,i)=>batch.set(doc(db,'sessions',session.id,'members','test-'+i),{alias:'Test participant '+(i+1),side,kind:'test',joinedAt:serverTimestamp()}));
  await batch.commit();
}
export const assignSide = (session,id,side) => updateDoc(doc(db,'sessions',session,'members',id),{side});
