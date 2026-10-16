document.addEventListener('click',async event=>{
  const button=event.target.closest('.code-bar button');
  if(!button)return;
  const status=document.querySelector('#copy-status');
  try{await navigator.clipboard.writeText(button.closest('.code-block').querySelector('code').textContent);button.textContent='Copied';status.textContent='Code copied';}
  catch{button.textContent='Select code';status.textContent='Clipboard unavailable. Select the code and copy it.';button.closest('.code-block').querySelector('pre').focus();}
});
