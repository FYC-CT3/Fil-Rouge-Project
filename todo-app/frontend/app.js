const API = (window.API_BASE || 'http://localhost:3000');
const list = document.getElementById('list');
const form = document.getElementById('form');
const input = document.getElementById('t');

async function fetchTasks(){
  const res = await fetch(API + '/tasks');
  const tasks = await res.json();
  list.innerHTML = '';
  tasks.forEach(t => {
    const li = document.createElement('li');
    li.className = t.done ? 'done' : '';
    li.innerHTML = `<input type="checkbox" ${t.done?'checked':''} data-id="${t.id}" /> <span>${escapeHtml(t.title)}</span> <button data-del="${t.id}">Del</button>`;
    list.appendChild(li);
  });
}

function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if(!input.value.trim()) return;
  await fetch(API + '/tasks', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title: input.value})});
  input.value='';
  fetchTasks();
});

list.addEventListener('click', async (e) => {
  if(e.target.matches('[data-del]')){
    const id = e.target.getAttribute('data-del');
    await fetch(API + '/tasks/' + id, {method:'DELETE'});
    fetchTasks();
  }
});

list.addEventListener('change', async (e) => {
  if(e.target.matches('input[type=checkbox]')){
    const id = e.target.getAttribute('data-id');
    const done = e.target.checked;
    await fetch(API + '/tasks/' + id, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({done})});
    fetchTasks();
  }
});

fetchTasks();
