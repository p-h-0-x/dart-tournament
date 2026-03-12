// set-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

admin.auth().getUserByEmail('merieaub@gmail.com')
  .then(user => admin.auth().setCustomUserClaims(user.uid, { admin: true }))
  .then(() => console.log('Done! User must sign out and back in.'))
  .catch(console.error);