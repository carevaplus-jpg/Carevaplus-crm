import React, { useState } from "react";

export default function CarevaPlusRoyalAI(){

  const [patients,setPatients] = useState([]);
  const [name,setName] = useState("");
  const [phone,setPhone] = useState("");

  // 🔥 AUTO IDs
  const patientID = () => "PT-"+Math.floor(10000+Math.random()*90000);
  const employeeID = () => "EMP-"+Math.floor(1000+Math.random()*9000);

  const addPatient = ()=>{
    if(!name || !phone) return;

    setPatients([
      ...patients,
      {
        pid: patientID(),
        eid: employeeID(),
        name,
        phone,
        status:"New"
      }
    ]);

    setName("");
    setPhone("");
  };

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"Segoe UI"}}>

      {/* 👑 LEFT SIDEBAR (ZOHO STYLE) */}
      <div style={{
        width:"230px",
        background:"#111827",
        color:"white",
        padding:"20px"
      }}>
        <h2>👑 CAREVA+</h2>
        <p>📊 Dashboard</p>
        <p>🧑 Patients</p>
        <p>👨‍⚕️ Employees</p>
        <p>📞 Enquiries</p>
        <p>🤖 AI Automation</p>
        <p>💰 Billing</p>
      </div>

      {/* 🚀 MAIN CONTENT */}
      <div style={{flex:1,background:"#f1f5f9",padding:"20px"}}>

        {/* HEADER BAR */}
        <div style={{
          background:"white",
          padding:"15px",
          borderRadius:"10px",
          marginBottom:"20px",
          display:"flex",
          justifyContent:"space-between"
        }}>
          <h2>🚀 Careva+ Zoho Style CRM</h2>
          <div>🔔 Admin</div>
        </div>

        {/* DASHBOARD */}
        <div style={{display:"flex",gap:"15px"}}>
          <Card title="Patients" value={patients.length}/>
          <Card title="Employees" value="5"/>
          <Card title="Leads" value="3"/>
          <Card title="Revenue" value="₹0"/>
        </div>

        {/* NEW PATIENT PANEL */}
        <div style={{
          background:"white",
          marginTop:"20px",
          padding:"20px",
          borderRadius:"10px"
        }}>
          <h3>🆕 New Patient</h3>

          <input
            placeholder="Patient Name"
            value={name}
            onChange={(e)=>setName(e.target.value)}
            style={{padding:"8px",margin:"5px"}}
          />

          <input
            placeholder="Phone"
            value={phone}
            onChange={(e)=>setPhone(e.target.value)}
            style={{padding:"8px",margin:"5px"}}
          />

          <button
            onClick={addPatient}
            style={{
              padding:"8px 15px",
              background:"#2563eb",
              color:"white",
              border:"none",
              borderRadius:"6px"
            }}>
            Add
          </button>
        </div>

        {/* PATIENT TABLE */}
        <div style={{
          background:"white",
          marginTop:"20px",
          padding:"20px",
          borderRadius:"10px"
        }}>
          <h3>📋 Patient Records</h3>

          <table width="100%">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {patients.map((p,i)=>(
                <tr key={i}>
                  <td>{p.pid}</td>
                  <td>{p.eid}</td>
                  <td>{p.name}</td>
                  <td>{p.phone}</td>
                  <td style={{color:"green"}}>{p.status}</td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>
    </div>
  );
}

// 👑 CARD UI
function Card({title,value}){
  return(
    <div style={{
      background:"white",
      padding:"20px",
      borderRadius:"10px",
      width:"150px"
    }}>
      <h4>{title}</h4>
      <h2>{value}</h2>
    </div>
  );
}
