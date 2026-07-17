const DB_KEY='sarwar_action_tracker_v2';
const todayISO=()=>new Date().toISOString().slice(0,10);
const addDays=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
const seed={
  projects:[
    {id:'P1',code:'MIRAN-EPF',name:'Miran EPF Project',client:'Miran Energy',manager:'Eugene Flynn'},
    {id:'P2',code:'MIRAN-ILF',name:'Miran Pipeline Engineering',client:'Miran Energy',manager:'Project Manager'}
  ],
  users:[
    {id:'U1',name:'Sarwar Khalid',username:'sarwar',email:'sarwar.khalid@miranenergy.com',password:'Sarwar@123456',company:'Miran Energy',role:'System Administrator',project:'All Projects',status:'Active'},
    {id:'U2',name:'Daniel',username:'daniel',email:'daniel@example.com',password:'Daniel@123',company:'Enerflex',role:'External Contractor',project:'Miran EPF Project',status:'Active'},
    {id:'U3',name:'Diana',username:'diana',email:'diana@example.com',password:'Diana@123',company:'ILF',role:'Action Owner',project:'Miran Pipeline Engineering',status:'Active'},
    {id:'U4',name:'Lazo',username:'lazo',email:'lazo@example.com',password:'Lazo@123',company:'Miran Energy',role:'Action Owner',project:'All Projects',status:'Active'}
  ],
  actions:[
    {id:'A-001',project:'P1',title:'Submit P6 Native Schedule',description:'Provide current native schedule for integration.',company:'Enerflex',owner:'U2',email:'daniel@example.com',discipline:'Planning',priority:'High',due:addDays(-6),status:'Open',progress:30,escalation:'project.manager@example.com'},
    {id:'A-002',project:'P2',title:'Update MDR Rev-C',description:'Update MDR dates to align with baseline schedule.',company:'ILF',owner:'U3',email:'diana@example.com',discipline:'Document Control',priority:'High',due:addDays(-2),status:'In Progress',progress:60,escalation:'project.manager@example.com'},
    {id:'A-003',project:'P1',title:'Close IFC Civil Drawings',description:'Complete outstanding IFC drawings.',company:'Enerflex',owner:'U2',email:'daniel@example.com',discipline:'Civil',priority:'Medium',due:addDays(2),status:'Open',progress:20,escalation:'project.manager@example.com'},
    {id:'A-004',project:'P1',title:'Review OSBL Procurement Update',description:'Confirm PO status in schedule.',company:'Miran Energy',owner:'U4',email:'lazo@example.com',discipline:'Procurement',priority:'Medium',due:addDays(5),status:'Open',progress:10,escalation:'project.manager@example.com'}
  ],
  emails:[],
  activities:[{text:'System initialized',date:new Date().toLocaleString()}],
  settings:{before:3,esc1:3,esc2:7,time:'08:00',escEmail:'project.manager@example.com'}
};
let db=JSON.parse(localStorage.getItem(DB_KEY)||'null')||seed;
const saveDB=()=>localStorage.setItem(DB_KEY,JSON.stringify(db));
const userById=id=>db.users.find(u=>u.id===id)||{};
const projectById=id=>db.projects.find(p=>p.id===id)||{};
const currentUser=()=>db.users.find(u=>u.id===localStorage.getItem('sarwar_current_user'))||db.users.find(u=>u.id==='U1')||{};
const isSuperUser=()=>currentUser().role==='System Administrator' || currentUser().id==='U1';
const canManageAction=a=>isSuperUser();
const canUpdateAction=a=>isSuperUser() || a.owner===currentUser().id;
const daysDiff=(due)=>Math.ceil((new Date(due+'T23:59:59')-new Date())/86400000);
const computedStatus=(a)=>a.status!=='Closed'&&daysDiff(a.due)<0?'Overdue':a.status;

function migrateUsers(){
  db.users=db.users.map((u,i)=>({
    username:u.username||((u.email||'user'+(i+1)).split('@')[0]),
    password:u.password||(i===0?'Sarwar@123456':'ChangeMe@123'),
    mustChangePassword:typeof u.mustChangePassword==='boolean'?u.mustChangePassword:(i!==0),
    recoveryEmail:u.recoveryEmail||u.email||'',
    ...u
  }));
  const admin=db.users.find(u=>u.id==='U1');
  if(admin){
    admin.email='sarwar.khalid@miranenergy.com';
    admin.username='sarwar';
    admin.password='Sarwar@123456';
    admin.mustChangePassword=false;
    admin.recoveryEmail=admin.email;
    admin.status='Active';
  }
  saveDB();
}

function login(){
  const identifier=document.getElementById('loginEmail').value.trim().toLowerCase();
  const p=document.getElementById('loginPassword').value;
  const u=db.users.find(x=>x.status!=='Inactive' &&
    ((x.email||'').toLowerCase()===identifier || (x.username||'').toLowerCase()===identifier) &&
    (x.password||'')===p);
  if(u){
    localStorage.setItem('sarwar_logged_in','1');
    localStorage.setItem('sarwar_current_user',u.id);
    loginView.classList.add('hidden');
    appView.classList.remove('hidden');
    applyPermissions();renderAll();
    toast(`Welcome ${u.name}`);
    if(u.mustChangePassword){setTimeout(()=>openChangePasswordModal(true),400);}
  }else toast('Invalid username, email, or password');
}
function logout(){localStorage.removeItem('sarwar_logged_in');location.reload();}
function applyPermissions(){
  const u=currentUser();
  const avatar=document.getElementById('userAvatar');
  if(avatar) avatar.textContent=(u.name||'U').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
  const admin=isSuperUser();
  ['navUsers','navProjects','navSettings'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.classList.toggle('hidden',!admin);
  });
  document.querySelectorAll('[data-admin-only="1"]').forEach(el=>el.classList.toggle('hidden',!admin));
}
function showSection(name){
  ['dashboard','actions','users','projects','emails','settings'].forEach(x=>document.getElementById(x+'Section').classList.toggle('hidden',x!==name));
  pageTitle.textContent=name.charAt(0).toUpperCase()+name.slice(1);
}
function optionList(values,all=true){return (all?'<option value="">All</option>':'')+values.map(v=>`<option value="${v}">${v}</option>`).join('');}
function populateSelectors(){
  fProject.innerHTML=optionList(db.projects.map(p=>p.id).map(id=>`__${id}`)).replace(/__([^"]+)/g,(m,id)=>id).replace(/>(P\d+)</g,(m,id)=>'>'+projectById(id).name+'<');
  fCompany.innerHTML=optionList([...new Set(db.actions.map(a=>a.company))]);
  fOwner.innerHTML=optionList(db.users.map(u=>u.id)).replace(/>(U\d+)</g,(m,id)=>'>'+userById(id).name+'<');
  fDiscipline.innerHTML=optionList([...new Set(db.actions.map(a=>a.discipline))]);
  aProject.innerHTML=db.projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  aOwner.innerHTML=db.users.map(u=>`<option value="${u.id}">${u.name} — ${u.email}</option>`).join('');
  uProject.innerHTML='<option>All Projects</option>'+db.projects.map(p=>`<option>${p.name}</option>`).join('');
}
function filteredActions(){
  const q=(globalSearch?.value||'').toLowerCase();
  return db.actions.filter(a=>{
    if(!isSuperUser() && a.owner!==currentUser().id) return false;
    const s=computedStatus(a);
    return (!fProject.value||a.project===fProject.value)&&(!fCompany.value||a.company===fCompany.value)&&(!fOwner.value||a.owner===fOwner.value)&&(!fStatus.value||s===fStatus.value)&&(!fPriority.value||a.priority===fPriority.value)&&(!fDiscipline.value||a.discipline===fDiscipline.value)&&(!q||[a.id,a.title,a.company,userById(a.owner).name,a.discipline].join(' ').toLowerCase().includes(q));
  });
}
function badge(text){
  const map={'Open':'b-open','In Progress':'b-progress','Overdue':'b-overdue','Closed':'b-closed','High':'b-high','Medium':'b-medium','Low':'b-low','Active':'b-closed','Invited':'b-progress'};
  return `<span class="badge ${map[text]||'b-open'}">${text}</span>`;
}
function renderKPIs(list){
  const total=list.length,open=list.filter(a=>computedStatus(a)==='Open').length,progress=list.filter(a=>computedStatus(a)==='In Progress').length,overdue=list.filter(a=>computedStatus(a)==='Overdue').length,closed=list.filter(a=>computedStatus(a)==='Closed').length,dueToday=list.filter(a=>a.due===todayISO()&&a.status!=='Closed').length;
  kpiGrid.innerHTML=[
    ['Total Actions',total,'All visible actions'],
    ['Open',open,'Awaiting progress'],
    ['In Progress',progress,'Currently active'],
    ['Due Today',dueToday,'Requires attention'],
    ['Overdue',overdue,'Reminder required'],
    ['Closed',closed,total?Math.round(closed/total*100)+'% completion':'0% completion']
  ].map(x=>`<div class="card kpi"><div class="kpi-label">${x[0]}</div><div class="kpi-value">${x[1]}</div><div class="kpi-note">${x[2]}</div></div>`).join('');
}
function renderPriority(list){
  const rows=[...list].sort((a,b)=>daysDiff(a.due)-daysDiff(b.due)).slice(0,8);
  priorityBody.innerHTML=rows.map(a=>`<tr><td>${a.id}</td><td>${a.title}</td><td>${userById(a.owner).name||'-'}</td><td>${a.due}<div class="subtle">${daysDiff(a.due)<0?Math.abs(daysDiff(a.due))+' days overdue':daysDiff(a.due)+' days left'}</div></td><td>${badge(computedStatus(a))}</td><td><button class="icon-btn" onclick="sendReminder('${a.id}')">✉</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">No actions found</td></tr>';
}
function renderCompanyBars(list){
  const counts={};list.forEach(a=>counts[a.company]=(counts[a.company]||0)+1);
  const max=Math.max(1,...Object.values(counts));
  companyBars.innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<div class="bar-row"><span>${n}</span><div class="track"><div class="fill" style="width:${v/max*100}%"></div></div><strong>${v}</strong></div>`).join('')||'<div class="empty">No company data</div>';
}
function renderActivity(){
  activityList.innerHTML=db.activities.slice(-7).reverse().map(a=>`<div class="activity-item"><div class="activity-dot"></div><div><strong>${a.text}</strong><div class="subtle">${a.date}</div></div></div>`).join('');
}
function renderReminderSummary(list){
  const due3=list.filter(a=>a.status!=='Closed'&&daysDiff(a.due)>=0&&daysDiff(a.due)<=3).length;
  const over=list.filter(a=>computedStatus(a)==='Overdue').length;
  reminderSummary.innerHTML=`<div class="kpis" style="grid-template-columns:repeat(2,1fr)"><div class="kpi card"><div class="kpi-label">Due in 3 Days</div><div class="kpi-value">${due3}</div></div><div class="kpi card"><div class="kpi-label">Overdue</div><div class="kpi-value">${over}</div></div></div><button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="sendAllOverdue()">Run Reminder Check</button>`;
}
function renderActions(list){
  allActionsBody.innerHTML=list.map(a=>{
    const controls=[];
    if(canManageAction(a)){
      controls.push(`<button class="icon-btn" onclick="editAction('${a.id}')">Edit</button>`);
      controls.push(`<button class="icon-btn" onclick="extendAction('${a.id}')">Extend</button>`);
      controls.push(`<button class="icon-btn" onclick="sendReminder('${a.id}')">Email</button>`);
      controls.push(`<button class="icon-btn" onclick="closeAction('${a.id}')">Close</button>`);
      controls.push(`<button class="icon-btn" onclick="deleteAction('${a.id}')">Delete</button>`);
    } else if(canUpdateAction(a) && computedStatus(a)!=='Closed'){
      controls.push(`<button class="icon-btn" onclick="updateAssignedAction('${a.id}')">Update</button>`);
    } else {
      controls.push(`<span class="subtle">Read only</span>`);
    }
    return `<tr>
      <td>${a.id}</td><td>${projectById(a.project).code||'-'}</td><td><strong>${a.title}</strong><div class="subtle">${a.discipline}</div></td><td>${a.company}</td><td>${userById(a.owner).name||'-'}<div class="subtle">${a.email}</div></td><td>${a.due}</td><td>${badge(a.priority)}</td><td>${badge(computedStatus(a))}</td><td>${a.progress}%</td>
      <td class="actions-cell">${controls.join('')}</td>
    </tr>`;
  }).join('')||'<tr><td colspan="10" class="empty">No actions found</td></tr>';
}
function renderUsers(){
  usersBody.innerHTML=db.users.map(u=>`<tr>
    <td><strong>${u.name}</strong></td>
    <td>${u.username||'-'}</td>
    <td>${u.email}</td>
    <td>${u.company}</td>
    <td>${u.role}</td>
    <td>${u.project}</td>
    <td>${badge(u.status)}</td>
    <td class="actions-cell">
      <button class="icon-btn" onclick="editUser('${u.id}')">Edit</button>
      <button class="icon-btn" onclick="adminResetUser('${u.id}')">Reset Password</button>
      <button class="icon-btn" onclick="toggleUser('${u.id}')">${u.status==='Active'?'Deactivate':'Activate'}</button>
      <button class="icon-btn" onclick="deleteUser('${u.id}')">Delete</button>
    </td>
  </tr>`).join('');
}
function renderProjects(){
  projectsGrid.innerHTML=db.projects.map(p=>{
    const acts=db.actions.filter(a=>a.project===p.id),over=acts.filter(a=>computedStatus(a)==='Overdue').length;
    return `<div class="card kpi"><div class="kpi-label">${p.code}</div><div class="kpi-value" style="font-size:21px">${p.name}</div><div class="kpi-note">${p.client} · PM: ${p.manager}</div><div style="margin-top:12px">${acts.length} actions · <span style="color:var(--red)">${over} overdue</span></div></div>`;
  }).join('');
}
function renderEmails(){
  emailBody.innerHTML=db.emails.slice().reverse().map(e=>`<tr><td>${e.date}</td><td>${e.type}</td><td>${e.to}</td><td>${e.subject}</td><td>${e.item}</td><td>${badge(e.status)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No emails recorded yet</td></tr>';
}
function renderAll(){
  populateSelectors();
  const list=filteredActions();
  renderKPIs(list);renderPriority(list);renderCompanyBars(list);renderActivity();renderReminderSummary(list);renderActions(list);renderUsers();renderProjects();renderEmails();
}
function resetFilters(){['fProject','fCompany','fOwner','fStatus','fPriority','fDiscipline'].forEach(id=>document.getElementById(id).value='');globalSearch.value='';renderAll();}
function updateAssignedAction(id){
  const a=db.actions.find(x=>x.id===id); if(!a)return;
  if(!canUpdateAction(a)){toast('You do not have permission to update this action');return;}
  if(computedStatus(a)==='Closed'){toast('Closed actions cannot be changed');return;}
  const progressInput=prompt('Enter progress percentage (0-100)',String(a.progress||0));
  if(progressInput===null)return;
  const progress=Math.max(0,Math.min(100,Number(progressInput)));
  const statusInput=prompt('Enter status: Open, In Progress, or Closed',a.status);
  if(statusInput===null)return;
  const allowed=['Open','In Progress','Closed'];
  const status=allowed.includes(statusInput)?statusInput:a.status;
  a.progress=status==='Closed'?100:progress;
  a.status=status;
  db.activities.push({text:`${currentUser().name} updated action ${id} to ${status} (${a.progress}%)`,date:new Date().toLocaleString()});
  saveDB();renderAll();toast('Action updated');
}
function openActionModal(){if(!isSuperUser()){toast('Administrator access required');return;}
  actionModalTitle.textContent='Add Action';['aId','aTitle','aDescription','aCompany','aEmail','aDiscipline','aEscalation'].forEach(id=>document.getElementById(id).value='');
  aPriority.value='Medium';aStatus.value='Open';aProgress.value=0;aDue.value=addDays(3);actionModal.classList.remove('hidden');
}
function editAction(id){if(!isSuperUser()){toast('Administrator access required');return;}
  const a=db.actions.find(x=>x.id===id);if(!a)return;
  actionModalTitle.textContent='Edit Action';aId.value=a.id;aProject.value=a.project;aCompany.value=a.company;aTitle.value=a.title;aDescription.value=a.description;aOwner.value=a.owner;aEmail.value=a.email;aDiscipline.value=a.discipline;aPriority.value=a.priority;aDue.value=a.due;aStatus.value=a.status;aProgress.value=a.progress;aEscalation.value=a.escalation||'';actionModal.classList.remove('hidden');
}
aOwner?.addEventListener('change',()=>{const u=userById(aOwner.value);if(u.email)aEmail.value=u.email;if(u.company)aCompany.value=u.company;});

async function sendActionAssignmentEmail(action){
  const assignee=userById(action.owner);
  const payload={
    to:action.email,
    assigneeName:assignee.name||'Colleague',
    actionId:action.id,
    title:action.title,
    description:action.description,
    project:projectById(action.project).name||'',
    company:action.company,
    dueDate:action.due,
    priority:action.priority,
    assignedBy:currentUser().name||'System Administrator'
  };
  try{
    const response=await fetch('/api/send-action-email',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    if(!response.ok)throw new Error('Email service unavailable');
    db.emails.push({date:new Date().toLocaleString(),type:'Action Assignment',to:action.email,subject:`New Action ${action.id}: ${action.title}`,item:action.id,status:'Sent'});
    saveDB();
    toast('Action saved and email sent');
  }catch(error){
    db.emails.push({date:new Date().toLocaleString(),type:'Action Assignment',to:action.email,subject:`New Action ${action.id}: ${action.title}`,item:action.id,status:'Pending Backend'});
    saveDB();
    const subject=`New Action Assigned: ${action.id} - ${action.title}`;
    const body=`Dear ${payload.assigneeName},

A new action has been assigned to you.

Action ID: ${action.id}
Project: ${payload.project}
Action: ${action.title}
Description: ${action.description||'-'}
Priority: ${action.priority}
Due Date: ${action.due}

Please log in to Sarwar Action Tracker and update the action status.

Regards,
Sarwar Action Tracker`;
    window.location.href=`mailto:${encodeURIComponent(action.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast('Action saved. Email app opened because backend is not connected yet.');
  }
}

function saveAction(){
  const id=aId.value||`A-${String(db.actions.length+1).padStart(3,'0')}`;
  const obj={id,project:aProject.value,title:aTitle.value.trim(),description:aDescription.value.trim(),company:aCompany.value.trim(),owner:aOwner.value,email:aEmail.value.trim(),discipline:aDiscipline.value.trim(),priority:aPriority.value,due:aDue.value,status:aStatus.value,progress:Number(aProgress.value||0),escalation:aEscalation.value.trim()};
  if(!obj.title||!obj.email||!obj.due){toast('Title, email, and due date are required');return;}
  const i=db.actions.findIndex(x=>x.id===id);if(i>=0)db.actions[i]=obj;else db.actions.push(obj);
  db.activities.push({text:`Action ${id} ${i>=0?'updated':'created'}`,date:new Date().toLocaleString()});saveDB();closeModal('actionModal');renderAll();if(i<0){sendActionAssignmentEmail(obj);}else{toast('Action updated');}
}
function extendAction(id){if(!isSuperUser()){toast('Administrator access required');return;}
  const a=db.actions.find(x=>x.id===id); if(!a)return;
  const newDate=prompt('Enter new due date (YYYY-MM-DD)',a.due);
  if(!newDate)return;
  const oldDate=a.due;
  a.due=newDate;
  if(a.status==='Closed')a.status='Open';
  db.activities.push({text:`Action ${id} extended from ${oldDate} to ${newDate}`,date:new Date().toLocaleString()});
  saveDB();renderAll();toast('Due date extended');
}
function closeAction(id){if(!isSuperUser()){toast('Administrator access required');return;}const a=db.actions.find(x=>x.id===id);if(a){a.status='Closed';a.progress=100;db.activities.push({text:`Action ${id} closed`,date:new Date().toLocaleString()});saveDB();renderAll();}}
function deleteAction(id){
  if(!isSuperUser()){toast('Administrator access required');return;}
  const a=db.actions.find(x=>x.id===id);
  if(!a){toast('Action not found');return;}
  if(!confirm(`Delete ${id} - ${a.title}?`))return;
  db.actions=db.actions.filter(x=>x.id!==id);
  db.activities.push({text:`Action ${id} deleted by ${currentUser().name}`,date:new Date().toLocaleString()});
  saveDB();
  renderAll();
  toast('Action deleted successfully');
}
function sendReminder(id){
  const a=db.actions.find(x=>x.id===id),u=userById(a.owner);if(!a)return;
  const days=daysDiff(a.due),subject=`${days<0?'Overdue Action':'Action Reminder'}: ${a.id} - ${a.title}`;
  const body=`Dear ${u.name||'Colleague'},\n\nThis is a reminder regarding the following action:\n\nAction ID: ${a.id}\nAction: ${a.title}\nDue Date: ${a.due}\nStatus: ${computedStatus(a)}\n${days<0?'Days Overdue: '+Math.abs(days):'Days Remaining: '+days}\n\nPlease update the action status at your earliest convenience.\n\nRegards,\nSarwar Action Tracker`;
  db.emails.push({date:new Date().toLocaleString(),type:days<0?'Overdue Reminder':'Reminder',to:a.email,subject,item:a.id,status:'Open'});
  db.activities.push({text:`Reminder prepared for ${a.id} to ${a.email}`,date:new Date().toLocaleString()});saveDB();renderAll();
  window.location.href=`mailto:${encodeURIComponent(a.email)}?cc=${encodeURIComponent(days<=-(db.settings.esc1||3)?a.escalation:'')}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function sendAllOverdue(){const list=db.actions.filter(a=>computedStatus(a)==='Overdue');if(!list.length){toast('No overdue actions');return;}list.forEach(a=>{db.emails.push({date:new Date().toLocaleString(),type:'Overdue Batch Reminder',to:a.email,subject:`Overdue Action ${a.id}`,item:a.id,status:'Open'});});db.activities.push({text:`Reminder check completed for ${list.length} overdue actions`,date:new Date().toLocaleString()});saveDB();renderAll();toast(`${list.length} overdue reminders added to email log`);}
function generateTemporaryPassword(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$!';
  let value=''; for(let i=0;i<12;i++) value+=chars[Math.floor(Math.random()*chars.length)];
  return value;
}
function openUserModal(){
  if(!isSuperUser()){toast('Administrator access required');return;}
  ['uName','uUsername','uEmail','uRecoveryEmail','uCompany'].forEach(id=>document.getElementById(id).value='');
  uPassword.value=generateTemporaryPassword();
  userModal.classList.remove('hidden');
}
async function inviteUser(){
  if(!isSuperUser()){toast('Administrator access required');return;}
  const name=uName.value.trim(), username=uUsername.value.trim(), email=uEmail.value.trim().toLowerCase(),
        password=uPassword.value, recoveryEmail=(uRecoveryEmail.value.trim()||email).toLowerCase();
  if(!name||!username||!email||!password){toast('Name, username, email, and temporary password are required');return;}
  if(password.length<8){toast('Temporary password must contain at least 8 characters');return;}
  if(db.users.some(u=>(u.username||'').toLowerCase()===username.toLowerCase())){toast('Username already exists');return;}
  if(db.users.some(u=>(u.email||'').toLowerCase()===email)){toast('Email already exists');return;}

  const newUser={id:'U'+(db.users.length+1),name,username,email,password,recoveryEmail,company:uCompany.value.trim(),role:uRole.value,project:uProject.value,status:'Active',mustChangePassword:true};
  db.users.push(newUser);
  db.activities.push({text:`User ${username} created`,date:new Date().toLocaleString()});
  saveDB(); closeModal('userModal'); renderAll();

  const payload={name,username,email,temporaryPassword:password,project:uProject.value,role:uRole.value};
  try{
    const response=await fetch('/api/invite-user',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    if(!response.ok) throw new Error('Invitation email failed');
    db.emails.push({date:new Date().toLocaleString(),type:'User Invitation',to:email,subject:'Your Sarwar Action Tracker Account',item:'User Access',status:'Sent'});
    saveDB(); renderAll(); toast('User created and invitation email sent');
  }catch(error){
    db.emails.push({date:new Date().toLocaleString(),type:'User Invitation',to:email,subject:'Your Sarwar Action Tracker Account',item:'User Access',status:'Pending Backend'});
    saveDB(); renderAll();
    const subject='Your Sarwar Action Tracker Account';
    const body=`Dear ${name},

Your Sarwar Action Tracker account has been created.

Username: ${username}
Email: ${email}
Temporary Password: ${password}
Role: ${uRole.value}
Project Access: ${uProject.value}

Please sign in and change your password immediately.

Regards,
Sarwar Action Tracker`;
    window.location.href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast('User created. Email app opened because backend is not connected yet.');
  }
}
function toggleUser(id){if(!isSuperUser()){toast('Administrator access required');return;}const u=db.users.find(x=>x.id===id);if(u){u.status=u.status==='Active'?'Inactive':'Active';saveDB();renderAll();}}
function editUser(id){if(!isSuperUser()){toast('Administrator access required');return;}
  const u=db.users.find(x=>x.id===id); if(!u)return;
  const name=prompt('Full name',u.name); if(name===null)return;
  const username=prompt('Username',u.username||''); if(username===null)return;
  const email=prompt('Email',u.email); if(email===null)return;
  const password=prompt('Password',u.password||''); if(password===null)return;
  const company=prompt('Company',u.company||''); if(company===null)return;
  u.name=name.trim()||u.name;
  u.username=username.trim()||u.username;
  u.email=email.trim()||u.email;
  u.password=password||u.password;
  u.company=company.trim();
  db.activities.push({text:`User ${u.username} updated`,date:new Date().toLocaleString()});
  saveDB();renderAll();toast('User updated');
}
async function adminResetUser(id){
  if(!isSuperUser()){toast('Administrator access required');return;}
  const u=db.users.find(x=>x.id===id); if(!u)return;
  const temp=generateTemporaryPassword();
  u.password=temp;u.mustChangePassword=true;
  saveDB();
  const payload={name:u.name,username:u.username,email:u.recoveryEmail||u.email,temporaryPassword:temp};
  try{
    const response=await fetch('/api/admin-reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!response.ok)throw new Error();
    db.emails.push({date:new Date().toLocaleString(),type:'Admin Password Reset',to:payload.email,subject:'Temporary Password',item:'User Access',status:'Sent'});
    toast('Temporary password emailed');
  }catch(error){
    db.emails.push({date:new Date().toLocaleString(),type:'Admin Password Reset',to:payload.email,subject:'Temporary Password',item:'User Access',status:'Pending Backend'});
    const subject='Your Temporary Sarwar Action Tracker Password';
    const body=`Dear ${u.name},

Your password has been reset by the administrator.

Username: ${u.username}
Temporary Password: ${temp}

You must change this password after signing in.

Regards,
Sarwar Action Tracker`;
    window.location.href=`mailto:${encodeURIComponent(payload.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast('Email app opened because backend is not connected yet');
  }
  saveDB();renderAll();
}
function deleteUser(id){if(!isSuperUser()){toast('Administrator access required');return;}
  if(id==='U1'){toast('Primary administrator cannot be deleted');return;}
  if(db.actions.some(a=>a.owner===id)){toast('Reassign this user’s actions before deleting');return;}
  if(confirm('Delete this user?')){db.users=db.users.filter(x=>x.id!==id);saveDB();renderAll();toast('User deleted');}
}
function openProjectModal(){if(!isSuperUser()){toast('Administrator access required');return;}['pCode','pName','pClient','pManager'].forEach(id=>document.getElementById(id).value='');projectModal.classList.remove('hidden');}
function saveProject(){if(!isSuperUser()){toast('Administrator access required');return;}
  if(!pCode.value.trim()||!pName.value.trim()){toast('Project code and name are required');return;}
  db.projects.push({id:'P'+(db.projects.length+1),code:pCode.value.trim(),name:pName.value.trim(),client:pClient.value.trim(),manager:pManager.value.trim()});saveDB();closeModal('projectModal');renderAll();toast('Project added');
}
function saveSettings(){if(!isSuperUser()){toast('Administrator access required');return;}db.settings={before:Number(rBefore.value),esc1:Number(rEsc1.value),esc2:Number(rEsc2.value),time:rTime.value,escEmail:rEscEmail.value};saveDB();toast('Reminder rules saved');}
function closeModal(id){document.getElementById(id).classList.add('hidden');}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2600);}
function openRecoveryModal(mode){
  recoveryMode.value=mode;
  recoveryIdentifier.value='';
  recoveryTitle.textContent=mode==='password'?'Forgot Password':'Recover Username or Email';
  recoveryLabel.textContent=mode==='password'?'Username or Registered Email':'Username, Email, or Full Name';
  recoveryModal.classList.remove('hidden');
}
async function submitRecovery(){
  const mode=recoveryMode.value;
  const identifier=recoveryIdentifier.value.trim().toLowerCase();
  if(!identifier){toast('Enter your username or registered email');return;}
  const user=db.users.find(u=>
    (u.username||'').toLowerCase()===identifier ||
    (u.email||'').toLowerCase()===identifier ||
    (u.name||'').toLowerCase()===identifier
  );
  // Do not reveal whether the account exists.
  const generic='If the account exists, a recovery email has been sent.';
  if(!user){closeModal('recoveryModal');toast(generic);return;}
  const token=Math.random().toString(36).slice(2)+Date.now().toString(36);
  user.resetToken=token;
  user.resetTokenCreatedAt=new Date().toISOString();
  saveDB();
  const payload={
    mode,
    username:user.username,
    email:user.email,
    recoveryEmail:user.recoveryEmail||user.email,
    name:user.name,
    resetToken:token
  };
  try{
    const endpoint=mode==='password'?'/api/request-password-reset':'/api/recover-account';
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!response.ok)throw new Error('Recovery email failed');
    db.emails.push({date:new Date().toLocaleString(),type:mode==='password'?'Password Reset':'Account Recovery',to:payload.recoveryEmail,subject:mode==='password'?'Reset Your Password':'Your Account Details',item:'Account Recovery',status:'Sent'});
  }catch(error){
    db.emails.push({date:new Date().toLocaleString(),type:mode==='password'?'Password Reset':'Account Recovery',to:payload.recoveryEmail,subject:mode==='password'?'Reset Your Password':'Your Account Details',item:'Account Recovery',status:'Pending Backend'});
    const subject=mode==='password'?'Reset Your Sarwar Action Tracker Password':'Your Sarwar Action Tracker Account';
    const body=mode==='password'
      ?`Dear ${user.name},

A password reset was requested for your account.

Username: ${user.username}
Reset Token: ${token}

In the production system, this email will contain a secure reset link. Please contact the administrator while the backend is not connected.

Regards,
Sarwar Action Tracker`
      :`Dear ${user.name},

Your account details are:

Username: ${user.username}
Registered Email: ${user.email}

Regards,
Sarwar Action Tracker`;
    window.location.href=`mailto:${encodeURIComponent(payload.recoveryEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  saveDB();renderAll();closeModal('recoveryModal');toast(generic);
}
function openChangePasswordModal(required=false){
  cpCurrent.value='';cpNew.value='';cpConfirm.value='';
  changePasswordClose.classList.toggle('hidden',required);
  changePasswordModal.classList.remove('hidden');
}
function changePassword(){
  const u=currentUser();
  if(!u)return;
  if(cpCurrent.value!==u.password){toast('Current password is incorrect');return;}
  if(cpNew.value.length<8){toast('New password must contain at least 8 characters');return;}
  if(cpNew.value!==cpConfirm.value){toast('New passwords do not match');return;}
  if(cpNew.value===u.password){toast('New password must be different');return;}
  u.password=cpNew.value;
  u.mustChangePassword=false;
  u.resetToken='';
  db.activities.push({text:`${u.name} changed their password`,date:new Date().toLocaleString()});
  saveDB();closeModal('changePasswordModal');toast('Password updated successfully');
}
function exportCSV(){
  const rows=[['ID','Project','Title','Company','Assigned To','Email','Discipline','Priority','Due Date','Status','Progress'],...db.actions.map(a=>[a.id,projectById(a.project).name,a.title,a.company,userById(a.owner).name,a.email,a.discipline,a.priority,a.due,computedStatus(a),a.progress])];
  const csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'}),url=URL.createObjectURL(blob),x=document.createElement('a');x.href=url;x.download='Sarwar_Action_Tracker.csv';x.click();URL.revokeObjectURL(url);
}
window.addEventListener('load',()=>{
  migrateUsers();
  if(localStorage.getItem('sarwar_logged_in')==='1'){loginView.classList.add('hidden');appView.classList.remove('hidden');}
  applyPermissions();renderAll();
});
