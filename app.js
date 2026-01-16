const URL_EMPLEADOS = "PON_AQUI_TU_RAW_DE_GITHUB.json"; // empleados/config si lo separaste

let empleados = [];

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("titulo").innerText = "Checador";
  await cargarEmpleados();
  vistaEspera();
});

async function cargarEmpleados(){
  try{
    const r = await fetch(URL_EMPLEADOS, {cache:"no-store"});
    const data = await r.json();
    empleados = data.empleados || data; // por si tu json es arreglo
  }catch(e){
    console.log("Error cargando empleados", e);
    empleados = [];
  }
}

function vistaEspera(){
  document.getElementById("app").innerHTML = `
    <button id="btnIniciar" style="font-size:22px;padding:14px 18px;">INICIAR</button>
  `;
  document.getElementById("btnIniciar").onclick = () => {
    alert("Siguiente: escaneo QR con cámara FRONTAL");
  };
}
