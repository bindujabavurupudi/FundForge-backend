import { auth, db } from "../firebase/firebaseConfig.js";


import {

createUserWithEmailAndPassword,

signInWithEmailAndPassword

} from "firebase/auth";


import {

doc,

setDoc,

getDoc

} from "firebase/firestore";



const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;



// SIGNUP


export const signUp = async (req, res) => {


try {


const { name, email, password } = req.body ?? {};


if (!name || !email || !password) {


return res.status(400).json({

ok: false,

error: "Missing required fields."

});

}



// CREATE USER IN FIREBASE AUTH


const userCredential =

await createUserWithEmailAndPassword(

auth,

email,

password

);


const user = userCredential.user;



// SAVE USER NAME IN FIRESTORE


await setDoc(doc(db, "users", user.uid), {


id: uid(),

name,

email: email.toLowerCase(),

createdAt: new Date().toISOString()

});



return res.status(201).json({

ok: true

});


}


catch (error) {


return res.status(400).json({

ok: false,

error: error.message

});


}


};



// SIGNIN



export const signIn = async (req, res) => {


try {


const { email, password } = req.body ?? {};



const userCredential =

await signInWithEmailAndPassword(

auth,

email,

password

);


const user = userCredential.user;



// GET USER NAME FROM FIRESTORE


const userDoc =

await getDoc(doc(db, "users", user.uid));



const userData = userDoc.data();



return res.json({


ok: true,


user: {


id: user.uid,


name: userData.name,


email: userData.email


}


});


}


catch (error) {


return res.status(401).json({


ok: false,


error: "Invalid credentials."


});


}


};