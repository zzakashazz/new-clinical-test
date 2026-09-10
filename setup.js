'use strict';
document.getElementById('setupForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
  const key=hex(crypto.getRandomValues(new Uint8Array(32)));
  const keyHash=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)));
  const user={id:document.getElementById('newUser').value.trim(),name:document.getElementById('newName').value.trim(),role:document.getElementById('newRole').value,keyHash,active:true};
  document.getElementById('newKey').value=key;
  document.getElementById('newConfig').value=JSON.stringify([user],null,2);
  document.getElementById('setupOutput').hidden=false;
});
