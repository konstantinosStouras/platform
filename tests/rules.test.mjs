import {readFile} from 'node:fs/promises';
import {before,after,test} from 'node:test';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,updateDoc,deleteDoc,writeBatch,serverTimestamp,query,where} from 'firebase/firestore';
let env, teacher, otherTeacher, student, outsider, anonymous, unverified;
const code='ABCDE23456';
const base=()=>({title:'Class',description:'',sides:['Hosts','Guests'],mode:'class',ownerId:'teacher',status:'lobby',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
const member=()=>({alias:'Participant test',side:'Hosts',kind:'student',joinedAt:serverTimestamp()});
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-platform',firestore:{host:'127.0.0.1',port:8086,rules:await readFile('firestore.rules','utf8')}});
 await env.clearFirestore();
 teacher=env.authenticatedContext('teacher',{email:'kstouras@gmail.com',email_verified:true}).firestore();
 otherTeacher=env.authenticatedContext('other-teacher',{email:'other@example.com',email_verified:true}).firestore();
 student=env.authenticatedContext('student',{email:'student@example.com',email_verified:true}).firestore();
 outsider=env.authenticatedContext('outsider',{email:'outsider@example.com',email_verified:true}).firestore();
 unverified=env.authenticatedContext('unverified',{email:'kstouras@gmail.com',email_verified:false}).firestore();
 anonymous=env.unauthenticatedContext().firestore();
 await setDoc(doc(teacher,'instructors','other@example.com'),{enabled:true,createdAt:serverTimestamp()});
 await setDoc(doc(teacher,'sessions',code),base());
});
after(async()=>env?.cleanup());
test('blocks anonymous access and unverified instructor impersonation',async()=>{
 await assertFails(getDoc(doc(anonymous,'sessions',code)));await assertFails(getDocs(collection(anonymous,'sessions')));
 await assertFails(setDoc(doc(unverified,'sessions','UNVER23456'),base()));
});
test('only instructors create sessions; ownership is immutable',async()=>{
 await assertFails(setDoc(doc(student,'sessions','STUDN23456'),{...base(),ownerId:'student'}));
 await assertFails(setDoc(doc(teacher,'sessions','WRONG23456'),{...base(),ownerId:'student'}));
 await assertFails(updateDoc(doc(teacher,'sessions',code),{ownerId:'student',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(student,'sessions',code),{status:'active',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(otherTeacher,'sessions',code),{status:'active',updatedAt:serverTimestamp()}));
});
test('invite lookup is allowed; session collection cannot be enumerated',async()=>{
 await assertSucceeds(getDoc(doc(student,'sessions',code)));
 await assertFails(getDocs(collection(student,'sessions')));
 await assertSucceeds(getDocs(query(collection(teacher,'sessions'),where('ownerId','==','teacher'))));
});
test('schema validates all sides and rejects oversized or polluted data',async()=>{
 for(const change of [{sides:['Hosts']},{sides:['Hosts','Guests',900]},{sides:['Hosts','Hosts']},{title:'x'.repeat(101)},{description:'x'.repeat(1001)},{extra:true},{createdAt:'yesterday'}]){
  await assertFails(setDoc(doc(teacher,'sessions','BADXX23456'),{...base(),...change}));
 }
 await assertSucceeds(setDoc(doc(teacher,'sessions','MULTX23456'),{...base(),sides:['Hosts','Guests','Cleaners','Advertisers']}));
 await assertFails(updateDoc(doc(teacher,'sessions',code),{title:'x'.repeat(101),updatedAt:serverTimestamp()}));
});
test('membership and personal index are atomic, scoped and private',async()=>{
 await assertFails(setDoc(doc(student,'sessions',code,'members','student'),member()));
 const batch=writeBatch(student);batch.set(doc(student,'sessions',code,'members','student'),member());batch.set(doc(student,'users','student','sessions',code),{joinedAt:serverTimestamp()});await assertSucceeds(batch.commit());
 await assertSucceeds(getDoc(doc(student,'sessions',code,'members','student')));
 await assertSucceeds(getDocs(collection(teacher,'sessions',code,'members')));
 await assertFails(getDocs(collection(student,'sessions',code,'members')));
 await assertFails(getDoc(doc(outsider,'sessions',code,'members','student')));
 await assertFails(getDocs(collection(outsider,'users','student','sessions')));
 await assertFails(updateDoc(doc(student,'sessions',code,'members','student'),{kind:'test'}));
 await assertSucceeds(updateDoc(doc(teacher,'sessions',code,'members','student'),{side:'Guests'}));
 await assertFails(updateDoc(doc(teacher,'sessions',code,'members','student'),{side:'Invalid'}));
 await assertFails(updateDoc(doc(teacher,'sessions',code,'members','student'),{alias:'x'.repeat(1000)}));
});
test('private tests exclude students and other instructors',async()=>{
 const id='TESTX23456';await assertSucceeds(setDoc(doc(teacher,'sessions',id),{...base(),mode:'test'}));
 await assertFails(getDoc(doc(student,'sessions',id)));await assertFails(getDoc(doc(otherTeacher,'sessions',id)));
 await assertSucceeds(setDoc(doc(teacher,'sessions',id,'members','test-0'),{...member(),kind:'test'}));
 await assertFails(setDoc(doc(teacher,'sessions',code,'members','test-0'),{...member(),kind:'test'}));
});
test('no self-elevation or instructor allowlist enumeration',async()=>{
 await assertFails(setDoc(doc(student,'instructors','student@example.com'),{enabled:true,createdAt:serverTimestamp()}));
 await assertFails(getDocs(collection(student,'instructors')));await assertFails(setDoc(doc(student,'users','student'),{role:'admin'}));
});
test('enforces lifecycle and closes registration when started',async()=>{
 await assertFails(updateDoc(doc(teacher,'sessions',code),{status:'paused',updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(doc(teacher,'sessions',code),{status:'active',updatedAt:serverTimestamp()}));
 const batch=writeBatch(outsider);batch.set(doc(outsider,'sessions',code,'members','outsider'),member());batch.set(doc(outsider,'users','outsider','sessions',code),{joinedAt:serverTimestamp()});await assertFails(batch.commit());
 await assertFails(updateDoc(doc(teacher,'sessions',code,'members','student'),{side:'Hosts'}));
 await assertSucceeds(updateDoc(doc(teacher,'sessions',code),{status:'paused',updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(doc(teacher,'sessions',code),{status:'active',updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(doc(teacher,'sessions',code),{status:'closed',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(teacher,'sessions',code),{status:'active',updatedAt:serverTimestamp()}));
 await assertFails(deleteDoc(doc(teacher,'sessions',code)));
});

