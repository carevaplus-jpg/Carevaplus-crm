import React, { useState, useEffect } from "react";

/* 🤖👑 CAREVA+ ROYAL AI FLOATING ASSISTANT CRM
   ✔ Auto Greeting Voice AI
   ✔ Floating AI Assistant Button
   ✔ Voice Reminders
   ✔ Smart Dashboard Guidance
*/

export default function CarevaPlusRoyalAI() {

  const [tab, setTab] = useState("dashboard");
  const [leads,setLeads]=useState([]);
  const [patients,setPatients]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [revenue,setRevenue]=useState([]);
  const [showAI,setShowAI]=useState(false);

  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [reminder,setReminder]=useState("");
  const [task,setTask]=useState("");
  const [amount,setAmount]=useState("");

  // 🎤 Voice Speak
  const speak = (text) => {
    if(!window.speechSynthesis) return;
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 1;
    msg.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
  };

  // 💾 Load DB
  useEffect(()=>{
    const db = JSON.parse(localStorage.getItem("carevaCRM"));
    if(db){
      setLeads(db.leads||[]);
      setPatients(db.patients||[]);
      setTasks(db.tasks||[]);
      setRevenue(db.revenue||[]);
    }
  },[]);

  // 💾 Save DB
  useEffect(()=>{
    localStorage.setItem("carevaCRM",
      JSON.stringify({leads,patients,tasks,revenue})
    );
  },[leads,patients,tasks,revenue]);

  // 🤖 Greeting Voice
  useEffect(()=>{
    const hour = new Date().getHours();
    let greeting="Welcome to Careva Plus.";
    if(hour<12) greeting="Good morning Careva Plus.";
    else if(hour<18) greeting="Good afternoon Careva Plus.";
    else greeting="Good evening Careva Plus.";

    setTimeout(()=>{ speak(greeting); },1000);
  },[]);

  // ⏰ Reminder Voice Alert
  useEffect(()=>{
    const i=setInterval(()=>{
      const now=new Date().toISOString().slice(0,16);
      leads.forEach(l=>{
        if(l.reminder===now){
          const message=`Reminder: Follow up patient ${l.name}`;
          alert(message);
          speak(message);
        }
      });
    },60000);
    return ()=>clearInterval(i);
  },[leads]);

  // 🤖 AI Message Logic
  const totalRevenue=revenue.reduce((a,b)=>a+b,0);
  let aiMessage="Careva+ Royal AI Ready.";
  if(leads.length>0 && patients.length===0)
    aiMessage="You have enquiries waiting. Convert them into patients.";
  if(totalRevenue===0 && patients.length>0)
    aiMessage="Update revenue after service start.";

  return(
    <div style={{padding:20,fontFamily:"Arial"}}>
      <h2>🏥 Careva+ Royal AI CRM</h2>

      {/* NAV */}
      <div>
        <button onClick={()=>setTab("dashboard")}>Dashboard</button>
        <button onClick={()=>setTab("leads")}>Call Enquiry</button>
        <button onClick={()=>setTab("patients")}>Patients</button>
        <button onClick={()=>setTab("tasks")}>Tasks</button>
        <button onClick={()=>setTab("revenue")}>Revenue</button>
      </div>

      {/* DASHBOARD */}
      {tab==="dashboard"&&(
        <div>
          <p>Leads: {leads.length}</p>
          <p>Patients: {patients.length}</p>
          <p>Tasks: {tasks.length}</p>
          <p>Revenue: ₹{totalRevenue}</p>
        </div>
      )}

      {/* CALL ENQUIRY */}
      {tab==="leads"&&(
        <div>
          <h3>📞 Call Enquiry</h3>
          <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
          <input placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} />
          <input type="datetime-local" value={reminder} onChange={e=>setReminder(e.target.value)} />
          <button onClick={()=>{
            setLeads([...leads,{name,phone,reminder}]);
            setName("");setPhone("");setReminder("");
          }}>Save</button>

          {leads.map((l,i)=>(
            <div key={i}>
              {l.name} - {l.phone}
              <button onClick={()=>setPatients([...patients,l])}>Convert</button>
            </div>
          ))}
        </div>
      )}

      {/* PATIENTS */}
      {tab==="patients"&&(
        <div>
          {patients.map((p,i)=>(<p key={i}>{p.name}</p>))}
        </div>
      )}

      {/* TASKS */}
      {tab==="tasks"&&(
        <div>
          <input value={task} onChange={e=>setTask(e.target.value)} />
          <button onClick={()=>setTasks([...tasks,{task,done:false}])}>Add</button>
          {tasks.map((t,i)=>(<p key={i}>{t.task}</p>))}
        </div>
      )}

      {/* REVENUE */}
      {tab==="revenue"&&(
        <div>
          <input value={amount} onChange={e=>setAmount(e.target.value)} />
          <button onClick={()=>setRevenue([...revenue,Number(amount)])}>Add</button>
        </div>
      )}

      {/* 👑 FLOATING AI ASSISTANT */}
      <div
        onClick={()=>setShowAI(!showAI)}
        style={{
          position:"fixed",
          bottom:20,
          right:20,
          background:"#0f9d8a",
          color:"white",
          padding:"15px 18px",
          borderRadius:"50%",
          cursor:"pointer",
          fontSize:20,
          boxShadow:"0 4px 10px rgba(0,0,0,0.3)"
        }}
      >🤖</div>

      {showAI && (
        <div style={{
          position:"fixed",
          bottom:90,
          right:20,
          background:"#e6f7f3",
          padding:15,
          borderRadius:12,
          width:250,
          boxShadow:"0 4px 12px rgba(0,0,0,0.25)"
        }}>
          <strong>Royal AI Assistant</strong>
          <p>{aiMessage}</p>
          <button onClick={()=>speak(aiMessage)}>🔊 Speak</button>
        </div>
      )}
    </div>
  );
    }
