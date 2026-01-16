// ======================================================
// CONFIG
// ======================================================
const URL_EMPLEADOS = "https://raw.githubusercontent.com/charly-40/CHECADOR/refs/heads/main/BASE_EMPLEADOS.json";

// Cierre diario
const HORA_CIERRE = "18:00";

// Antiduplicado (min)
const ANTI_DUP_MIN = 2;

// Hora entrada default si no existe por empleado
const HORA_ENTRADA_DEFAULT = "07:00";

// LocalStorage keys
const LS_EMPLEADOS = "checador_empleados";
const LS_REGISTROS = "checador_registros";

let empleados = [];
let modo = "checadas";
let stream = null;

// ======================================================
// INIT
// ======================================================
document.addEventListener("DOMContentLoaded", async () => {
  setEstado("Cargando empleados...");
  await cargarEmpleadosCache();
  await actualizarEmpleadosDesdeGitHub();
  iniciarRelojModo();
  vistaEspera();
});

// ======================================================
// UTIL
// ======================================================
function setEstado(txt) {
  const el = document.getElementById("estado");
  if (el) el.innerText = txt;
}

function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function hoyYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fechaHoraISO() {
  return new Date().toISOString();
}

function limpiarTexto(s) {
  return String(s || "").trim();
}

function buildNombre(emp) {
  const nom = limpiarTexto(emp["NOMBRE(S)"]);
  const ap = limpiarTexto(emp["AP_PAT"]);
  const am = limpiarTexto(emp["AP_MAT"]);
  return `${nom} ${ap} ${am}`.replace(/\s+/g, " ").trim();
}

function isActivo(emp) {
  // Si mañana agregas ACTIVO, se puede usar aquí.
  const nom = limpiarTexto(emp["NOMBRE(S)"]).toUpperCase();
  const ap = limpiarTexto(emp["AP_PAT"]).toUpperCase();
  if (nom === "VACANTE" || ap === "VACANTE") return false;
  return true;
}

function getHoraEntrada(emp) {
  // Si tu JSON tiene HORA_ENTRADA, la usa. Si no, 07:00
  return limpiarTexto(emp.HORA_ENTRADA) || HORA_ENTRADA_DEFAULT;
}

// ======================================================
// EMPLEADOS
// ======================================================
async function cargarEmpleadosCache() {
  try {
    const e = localStorage.getItem(LS_EMPLEADOS);
    if (e) empleados = JSON.parse(e);
  } catch (err) {
    empleados = [];
  }
}

async function actualizarEmpleadosDesdeGitHub() {
  try {
    const r = await fetch(URL_EMPLEADOS, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);

    const data = await r.json();
    if (!Array.isArray(data)) throw new Error("JSON no es arreglo");

    empleados = data;
    localStorage.setItem(LS_EMPLEADOS, JSON.stringify(empleados));

    setEstado(`Empleados: ${empleados.length} | ${hoyYYYYMMDD()} ${nowHHMM()}`);
  } catch (err) {
    setEstado(`OFFLINE | Empleados cache: ${empleados.length}`);
  }
}

// ======================================================
// MODO POR HORA
// ======================================================
function iniciarRelojModo() {
  setInterval(() => {
    const hora = nowHHMM();
    if (hora >= HORA_CIERRE) {
      if (modo !== "cierre") {
        modo = "cierre";
        vistaCierre();
      }
    } else {
      if (modo !== "checadas") {
        modo = "checadas";
        vistaEspera();
      }
    }
  }, 4000);
}

// ======================================================
// UI
// ======================================================
function vistaEspera() {
  setEstado(`Modo checadas | ${hoyYYYYMMDD()} ${nowHHMM()}`);

  document.getElementById("app").innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:14px;">
      <div style="font-size:18px;font-weight:bold;">Listo para checar</div>
      <div style="margin-top:6px;color:#666;">Escanea tu gafete (QR frontal)</div>

      <div style="margin-top:14px;">
        <button id="btnIniciar"
          style="width:100%;font-size:22px;padding:16px;border:none;border-radius:12px;background:#0b6;color:#fff;font-weight:bold;">
          INICIAR
        </button>
      </div>

      <div style="margin-top:10px;">
        <button id="btnVerReg"
          style="width:100%;font-size:16px;padding:12px;border:none;border-radius:12px;background:#222;color:#fff;">
          VER REGISTROS (HOY)
        </button>
      </div>
    </div>
  `;

  document.getElementById("btnIniciar").onclick = () => {
    if (modo !== "checadas") return;
    abrirEscanerQR();
  };

  document.getElementById("btnVerReg").onclick = () => {
    verRegistrosHoy();
  };
}

function vistaCierre() {
  setEstado(`Modo cierre | ${hoyYYYYMMDD()} ${nowHHMM()}`);

  document.getElementById("app").innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:14px;">
      <div style="font-size:18px;font-weight:bold;">Checadas cerradas</div>
      <div style="margin-top:6px;color:#666;">A partir de ${HORA_CIERRE}</div>

      <div style="margin-top:14px;">
        <button id="btnEnviar"
          style="width:100%;font-size:20px;padding:16px;border:none;border-radius:12px;background:#0a84ff;color:#fff;font-weight:bold;">
          ENVIAR REPORTE (CSV)
        </button>
      </div>

      <div style="margin-top:10px;">
        <button id="btnVerReg"
          style="width:100%;font-size:16px;padding:12px;border:none;border-radius:12px;background:#222;color:#fff;">
          VER REGISTROS (HOY)
        </button>
      </div>

      <div style="margin-top:10px;">
        <button id="btnVolver"
          style="width:100%;font-size:16px;padding:12px;border:none;border-radius:12px;background:#999;color:#fff;">
          VOLVER A INICIO
        </button>
      </div>
    </div>
  `;

  document.getElementById("btnEnviar").onclick = () => {
    enviarReporteCSV();
  };

  document.getElementById("btnVerReg").onclick = () => {
    verRegistrosHoy();
  };

  document.getElementById("btnVolver").onclick = () => {
    vistaEspera();
  };
}

// ======================================================
// QR SCAN (FRONTAL)
// ======================================================
async function abrirEscanerQR() {
  document.getElementById("app").innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:14px;">
      <div style="font-size:18px;font-weight:bold;">Escaneo QR (frontal)</div>
      <div style="margin-top:6px;color:#666;">Ejemplo QR: 11140WWKV</div>

      <div style="margin-top:12px;">
        <video id="video" autoplay playsinline
          style="width:100%;max-width:520px;border-radius:14px;border:2px solid #000;"></video>
      </div>

      <div id="msg" style="margin-top:10px;color:#444;">Buscando QR...</div>

      <div style="margin-top:12px;">
        <button id="btnCancelar"
          style="width:100%;font-size:18px;padding:12px;border:none;border-radius:12px;background:#c00;color:#fff;">
          CANCELAR
        </button>
      </div>
    </div>
  `;

  document.getElementById("btnCancelar").onclick = async () => {
    await detenerCamara();
    vistaEspera();
  };

  if (!("BarcodeDetector" in window)) {
    document.getElementById("msg").innerText =
      "Este dispositivo no soporta BarcodeDetector en WebView.";
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    const video = document.getElementById("video");
    video.srcObject = stream;

    const detector = new BarcodeDetector({ formats: ["qr_code"] });

    const loop = async () => {
      if (!stream) return;

      try {
        const codes = await detector.detect(video);
        if (codes && codes.length > 0) {
          const qr = (codes[0].rawValue || "").trim();
          await detenerCamara();
          procesarQR(qr);
          return;
        }
      } catch (e) {}

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  } catch (err) {
    document.getElementById("msg").innerText =
      "No se pudo abrir cámara frontal. Revisa permisos.";
  }
}

async function detenerCamara() {
  try {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  } catch (e) {}
}

// ======================================================
// PROCESAR QR
// Formato esperado: 11140WWKV  (ID + TOKEN)
// ======================================================
function procesarQR(qr) {
  if (!qr) return vistaEspera();

  qr = String(qr).trim().toUpperCase();

  const m = qr.match(/^(\d+)([A-Z0-9]{4})$/);
  if (!m) {
    return mensajeError("QR inválido. Usa formato: ID + 4 caracteres (ej: 11140WWKV).");
  }

  const id = Number(m[1]);
  const tokenLeido = m[2];

  const emp = empleados.find(e => Number(e.ID) === id);
  if (!emp) return mensajeError("Empleado no encontrado.");

  // OJO: Excel -> columna "TOKEN"
  const tokenEmp = String(emp["TOKEN"] || "").trim().toUpperCase();

  alert(
    "QR leido: " + qr +
    "\nID: " + id +
    "\nTOKEN QR: [" + tokenLeido + "]" +
    "\nTOKEN JSON: [" + tokenEmp + "]"
  );

  if (tokenEmp !== tokenLeido) return mensajeError("TOKEN incorrecto.");

  if (yaChecoReciente(id)) return mensajeError("Ya está registrado hace poco. Espera 2 minutos.");

  vistaConfirmacion(emp);
}

function mensajeError(txt) {
  document.getElementById("app").innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:14px;">
      <div style="font-size:18px;font-weight:bold;color:#c00;">ERROR</div>
      <div style="margin-top:8px;">${txt}</div>

      <div style="margin-top:14px;">
        <button id="btnOk"
          style="width:100%;font-size:18px;padding:12px;border:none;border-radius:12px;background:#222;color:#fff;">
          OK
        </button>
      </div>
    </div>
  `;
  document.getElementById("btnOk").onclick = () => vistaEspera();
}

// ======================================================
// CONFIRMACION + FOTO EVIDENCIA
// ======================================================
function vistaConfirmacion(emp) {
  const nombre = buildNombre(emp);
  const depto = limpiarTexto(emp.DEPARTAMENTO);
  const puesto = limpiarTexto(emp.PUESTO);
  const ruta = limpiarTexto(emp.RUTA);
  const horaEntrada = getHoraEntrada(emp);

  document.getElementById("app").innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:14px;">
      <div style="font-size:18px;font-weight:bold;">Confirma tu entrada</div>
      <div style="margin-top:6px;color:#666;">Mantén presionado para confirmar</div>

      <div style="margin-top:12px;padding:10px;border-radius:12px;background:#f1f1f1;">
        <div style="font-weight:bold;">${nombre}</div>
        <div style="font-size:13px;color:#444;">${depto} | ${puesto}</div>
        <div style="font-size:13px;color:#444;">Ruta: ${ruta}</div>
        <div style="font-size:13px;color:#444;">Hora entrada: ${horaEntrada}</div>
        <div style="font-size:13px;color:#444;">ID: ${emp.ID}</div>
      </div>

      <div style="margin-top:14px;display:flex;justify-content:center;">
        <div id="circulo"
          style="width:160px;height:160px;border-radius:50%;
                 border:12px solid #ddd;display:flex;align-items:center;justify-content:center;
                 font-size:14px;color:#333;font-weight:bold;user-select:none;">
          PRESIONA
        </div>
      </div>

      <div id="progresoTxt" style="margin-top:12px;text-align:center;color:#555;">0%</div>

      <div style="margin-top:14px;">
        <button id="btnCancelar"
          style="width:100%;font-size:18px;padding:12px;border:none;border-radius:12px;background:#c00;color:#fff;">
          CANCELAR
        </button>
      </div>
    </div>
  `;

  document.getElementById("btnCancelar").onclick = () => vistaEspera();

  const circulo = document.getElementById("circulo");
  const txt = document.getElementById("progresoTxt");

  let timer = null;
  let prog = 0;
  const msTotal = 1200;
  const step = 50;

  const start = () => {
    prog = 0;
    txt.innerText = "0%";
    circulo.style.borderColor = "#ddd";
    circulo.innerText = "CONFIRMANDO...";

    timer = setInterval(async () => {
      prog += (step / msTotal) * 100;

      if (prog >= 100) {
        prog = 100;
        clearInterval(timer);
        timer = null;

        txt.innerText = "100%";
        circulo.style.borderColor = "#0b6";
        circulo.innerText = "LISTO ✅";

        vibrar();
        beep();

        await registrarEntrada(emp);
        return;
      }

      txt.innerText = `${Math.floor(prog)}%`;
    }, step);
  };

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
    circulo.innerText = "PRESIONA";
    txt.innerText = "0%";
  };

  circulo.addEventListener("touchstart", (e) => { e.preventDefault(); start(); }, { passive:false });
  circulo.addEventListener("touchend", (e) => { e.preventDefault(); stop(); }, { passive:false });

  circulo.addEventListener("mousedown", start);
  circulo.addEventListener("mouseup", stop);
  circulo.addEventListener("mouseleave", stop);
}

function vibrar() {
  try {
    if (navigator.vibrate) navigator.vibrate(120);
  } catch (e) {}
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 700;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 120);
  } catch (e) {}
}

// ======================================================
// REGISTRO
// ======================================================
async function registrarEntrada(emp) {
  const id = Number(emp.ID);
  const nombre = buildNombre(emp);
  const horaEntrada = getHoraEntrada(emp);

  const { estatus, minutosTarde } = calcularTardanza(horaEntrada);

  const evidencia = await tomarFotoEvidenciaFrontal();

  const registro = {
    fecha: hoyYYYYMMDD(),
    fechaHoraISO: fechaHoraISO(),
    hora: nowHHMM(),
    id,
    nombre,
    departamento: limpiarTexto(emp.DEPARTAMENTO),
    puesto: limpiarTexto(emp.PUESTO),
    ruta: limpiarTexto(emp.RUTA),
    horaEntradaEsperada: horaEntrada,
    estatus,
    tardanzaMin: minutosTarde,
    evidenciaOK: evidencia.ok,
    evidenciaBase64: evidencia.base64
  };

  guardarRegistro(registro);

  document.getElementById("app").innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:14px;">
      <div style="font-size:18px;font-weight:bold;color:#0b6;">Entrada registrada ✅</div>
      <div style="margin-top:8px;"><b>${nombre}</b></div>
      <div style="margin-top:6px;color:#444;">Hora: ${registro.hora}</div>
      <div style="margin-top:6px;color:#444;">${registro.estatus} (tarde: ${registro.tardanzaMin} min)</div>
      <div style="margin-top:6px;color:#444;">Evidencia: ${registro.evidenciaOK ? "OK" : "SIN"}</div>

      <div style="margin-top:14px;">
        <button id="btnFin"
          style="width:100%;font-size:18px;padding:12px;border:none;border-radius:12px;background:#222;color:#fff;">
          TERMINAR
        </button>
      </div>
    </div>
  `;

  document.getElementById("btnFin").onclick = () => vistaEspera();
}

function calcularTardanza(horaEntradaStr) {
  const parts = String(horaEntradaStr).split(":");
  const hh = Number(parts[0] || 7);
  const mm = Number(parts[1] || 0);

  const now = new Date();
  const entrada = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);

  const diffMin = Math.floor((now.getTime() - entrada.getTime()) / 60000);

  if (diffMin <= 0) return { estatus: "A TIEMPO", minutosTarde: 0 };
  return { estatus: "TARDE", minutosTarde: diffMin };
}

async function tomarFotoEvidenciaFrontal() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = s;

    await new Promise(res => video.onloadedmetadata = res);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    s.getTracks().forEach(t => t.stop());

    const base64 = canvas.toDataURL("image/jpeg", 0.65);
    return { ok: true, base64 };
  } catch (e) {
    return { ok: false, base64: "" };
  }
}

function guardarRegistro(reg) {
  const arr = leerRegistros();
  arr.push(reg);
  localStorage.setItem(LS_REGISTROS, JSON.stringify(arr));
}

function leerRegistros() {
  try {
    const r = localStorage.getItem(LS_REGISTROS);
    return r ? JSON.parse(r) : [];
  } catch (e) {
    return [];
  }
}

function yaChecoReciente(id) {
  const arr = leerRegistros();
  const hoy = hoyYYYYMMDD();
  const ahora = Date.now();

  const ult = [...arr].reverse().find(x => x.fecha === hoy && x.id === id);
  if (!ult) return false;

  const t = Date.parse(ult.fechaHoraISO);
  if (!Number.isFinite(t)) return false;

  const diffMin = (ahora - t) / 60000;
  return diffMin < ANTI_DUP_MIN;
}

// ======================================================
// REPORTE CSV (correo en texto)
// ======================================================
function enviarReporteCSV() {
  const csv = generarCSVHoy();
  if (!csv) {
    mensajeError("No hay registros hoy.");
    return;
  }

  const asunto = encodeURIComponent(`REPORTE CHECADOR ${hoyYYYYMMDD()}`);
  const cuerpo = encodeURIComponent(csv);

  const correo = "encargado@empresa.com";
  window.location.href = `mailto:${correo}?subject=${asunto}&body=${cuerpo}`;
}

function generarCSVHoy() {
  const arr = leerRegistros().filter(x => x.fecha === hoyYYYYMMDD());
  if (arr.length === 0) return "";

  const headers = [
    "fecha",
    "hora",
    "id",
    "nombre",
    "departamento",
    "puesto",
    "ruta",
    "horaEntradaEsperada",
    "estatus",
    "tardanzaMin",
    "evidenciaOK"
  ];

  const lines = [];
  lines.push(headers.join(","));

  for (const r of arr) {
    const row = [
      r.fecha,
      r.hora,
      r.id,
      csvSafe(r.nombre),
      csvSafe(r.departamento),
      csvSafe(r.puesto),
      csvSafe(r.ruta),
      r.horaEntradaEsperada,
      r.estatus,
      r.tardanzaMin,
      r.evidenciaOK ? "SI" : "NO"
    ];
    lines.push(row.join(","));
  }

  return lines.join("\n");
}

function csvSafe(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ======================================================
// VER REGISTROS HOY
// ======================================================
function verRegistrosHoy() {
  const arr = leerRegistros().filter(x => x.fecha === hoyYYYYMMDD());

  let html = `
    <div style="background:#fff;border-radius:14px;padding:14px;">
      <div style="font-size:18px;font-weight:bold;">Registros de hoy</div>
      <div style="margin-top:6px;color:#666;">Total: ${arr.length}</div>
      <div style="margin-top:12px;max-height:340px;overflow:auto;">
  `;

  if (arr.length === 0) {
    html += `<div style="color:#444;">Sin registros.</div>`;
  } else {
    for (const r of arr.slice().reverse()) {
      html += `
        <div style="padding:10px;border-radius:12px;background:#f1f1f1;margin-bottom:8px;">
          <div style="font-weight:bold;">${r.nombre}</div>
          <div style="font-size:13px;color:#444;">${r.hora} | ${r.estatus} | tarde: ${r.tardanzaMin} min</div>
          <div style="font-size:12px;color:#666;">ID: ${r.id} | Evidencia: ${r.evidenciaOK ? "OK" : "NO"}</div>
        </div>
      `;
    }
  }

  html += `
      </div>
      <div style="margin-top:10px;">
        <button id="btnBack"
          style="width:100%;font-size:18px;padding:12px;border:none;border-radius:12px;background:#222;color:#fff;">
          VOLVER
        </button>
      </div>
    </div>
  `;

  document.getElementById("app").innerHTML = html;
  document.getElementById("btnBack").onclick = () => {
    if (modo === "cierre") vistaCierre();
    else vistaEspera();
  };
}
