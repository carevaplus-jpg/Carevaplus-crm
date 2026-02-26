import React, { useState, useEffect } from "react";

export default function CarevaPlusRoyalAI(){

  const [tab,setTab]=useState("Dashboard");
  const [logged,setLogged]=useState(false);
  const [showAI,setShowAI]=useState(false);

  const [leads,setLeads]=useState([]);
  const [patients,setPatients]=useState([]);
  const [tasks,setTasks]=useState([]);

  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");

  const [messages,setMessages]=useState([
    {role:"ai",text:"Careva+ AI Automation Ready 👑"}
  ]);
  const [input,setInput]=useState("");

  /* 💾 AUTO SAVE LOCAL CRM */
  useEffect(()=>{
    const db=JSON.parse(localStorage.getItem("carevaDB"));
    if(db){
      setLeads(db.leads||[]);
      setPatients(db.patients||[]);
      setTasks(db.tasks||[]);
    }
  },[]);

  useEffect(()=>{
    localStorage.setItem("carevaDB",
      JSON.stringify({leads,patients,tasks})
    );
  },[leads,patients,tasks]);

  /* 🎤 VOICE GREETING */
  useEffect(()=>{
    if(logged){
      const msg=new SpeechSynthesisUtterance(
        "Careva Plus real automation activated"
      );
      window.speechSynthesis.speak(msg);
    }
  },[logged]);

  const glassBox={
    marginTop:"20px",
    padding:"20px",
    borderRadius:"18px",
    background:"rgba(255,255,255,0.07)",
    backdropFilter:"blur(25px)"
  };

  const sidebarItem=(name)=>({
    padding:"14px",
    marginBottom:"12px",
    borderRadius:"14px",
    cursor:"pointer",
    fontWeight:"600",
    background:tab===name
      ?"linear-gradient(90deg,#22c55e,#06b6d4)"
      :"rgba(255,255,255,0.06)",
    color:"white"
  });

  /* 🤖 SIMPLE AI LOGIC */
  const sendMessage=()=>{
    if(!input) return;

    let aiReply="AI Ready.";

    if(input.toLowerCase().includes("leads"))
      aiReply=`You have ${leads.length} enquiries.`;

    if(input.toLowerCase().includes("patients"))
      aiReply=`Total patients ${patients.length}.`;

    setMessages([...messages,
      {role:"user",text:input},
      {role:"ai",text:aiReply}
    ]);

    setInput("");
  };

  /* 🔐 LOGIN */
  if(!logged){
    return(
      <div style={{
        height:"100vh",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        background:"linear-gradient(135deg,#020617,#022c22,#064e3b)",
        color:"white"
      }}>
        <button
          onClick={()=>setLogged(true)}
          style={{
            padding:"14px 26px",
            borderRadius:"10px",
            border:"none",
            background:"linear-gradient(90deg,#22c55e,#06b6d4)",
            color:"white"
          }}>
          Enter Careva+ Automation
        </button>
      </div>
    );
  }

  /* 🏥 MAIN UI */
  return(
    <div style={{
      display:"flex",
      minHeight:"100vh",
      fontFamily:"sans-serif",
      color:"white",
      background:"linear-gradient(135deg,#020617,#022c22,#064e3b)"
    }}>

      {/* SIDEBAR */}
      <div style={{width:"230px",padding:"20px"}}>
        <h3>👑 Careva+</h3>
        {["Dashboard","Leads","Patients","Tasks"].map(n=>(
          <div key={n} style={sidebarItem(n)} onClick={()=>setTab(n)}>
            {n}
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div style={{flex:1,padding:"30px"}}>

        {tab==="Dashboard" && (
          <div style={glassBox}>
            <h3>📊 Automation Status</h3>
            <p>Leads: {leads.length}</p>
            <p>Patients: {patients.length}</p>
            <p>Tasks: {tasks.length}</p>
          </div>
        )}

        {tab==="Leads" && (
          <div style={glassBox}>
            <h3>📞 New Enquiry</h3>

            <input placeholder="Name"
              value={name}
              onChange={e=>setName(e.target.value)}
            />
            <input placeholder="Phone"
              value={phone}
              onChange={e=>setPhone(e.target.value)}
            />

            <button onClick={()=>{
              const newLead={name,phone};
              setLeads([...leads,newLead]);

              /* 🤖 AUTO TASK CREATE */
              setTasks([...tasks,{task:`Follow up ${name}`}]);

              setName("");setPhone("");
            }}>
              Save Lead
            </button>

            {leads.map((l,i)=>(
              <div key={i}>
                {l.name} - {l.phone}
                <button onClick={()=>setPatients([...patients,l])}>
                  Convert Patient
                </button>
              </div>
            ))}
          </div>
        )}

        {tab==="Patients" && (
          <div style={glassBox}>
            {patients.map((p,i)=>(<p key={i}>{p.name}</p>))}
          </div>
        )}

        {tab==="Tasks" && (
          <div style={glassBox}>
            {tasks.map((t,i)=>(<p key={i}>{t.task}</p>))}
          </div>
        )}
      </div>

      {/* 🤖 FLOATING AI */}
      <div
        onClick={()=>setShowAI(!showAI)}
        style={{
          position:"fixed",
          bottom:"30px",
          right:"30px",
          width:"70px",
          height:"70px",
          borderRadius:"50%",
          background:"linear-gradient(135deg,#22c55e,#06b6d4)",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          fontSize:"28px",
          cursor:"pointer"
        }}>
        🤖
      </div>

      {/* AI CHAT */}
      {showAI && (
        <div style={{
          position:"fixed",
          right:"0",
          top:"0",
          height:"100%",
          width:"320px",
          background:"rgba(0,0,0,0.9)",
          padding:"20px",
          display:"flex",
          flexDirection:"column"
        }}>
          <h3>AI Automation</h3>

          <div style={{flex:1,overflowY:"auto"}}>
            {messages.map((m,i)=>(
              <div key={i}>{m.text}</div>
            ))}
          </div>

          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            placeholder="Ask AI..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      )}

    </div>
  );
}
